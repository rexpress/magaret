const request = require('request');
const async = require('async');
const child_process = require('child_process');

function getRepoManifest(image, tag, cb) {
  if (!image) {
    console.error('image is required.');
    return false;
  }
  if (!tag) {
    console.error('tag is required.');
    return false;
  }
  async.waterfall([
    function(callback) {
      request.get(`https://auth.docker.io/token?service=registry.docker.io&scope=repository:${image}:pull`, (err, res, body) => {
        if (!err) {
          let obj = JSON.parse(body);
          if (obj.token) {
            callback(null, obj.token);
            return;
          }
          console.error('getTokenFailed');
          cb(null, { 'error': 'getTokenFailed' });
        }
      });
    },
    function(token, callback) {
      request.get(`https://index.docker.io/v2/${image}/manifests/${tag}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        },
        (err, res, body) => {
          if (!err) {
            let obj = JSON.parse(body);
            if (obj.history) {
              //console.info('getRepoManifest> ' + JSON.parse(obj.history[0].v1Compatibility).config.Image);
              cb(null, JSON.parse(obj.history[0].v1Compatibility).config.Image);
            } else {
              var error = `${obj.errors[0].code} - ${obj.errors[0].message}`
              console.error(error);
              cb(null, { 'error': error });
            }
            return;
          }
          // error
          console.error('getRepoManifestFailed');
          cb(null, { 'error': 'getRepoManifestFailed' })
      });
    }
  ])
}

function getImageInspect(image, tag, cb) {
  const spawn = require('child_process').spawn;
  let proc = spawn('docker', ['inspect', `${image}:${tag}`], {
    detached: true,
    windowsVerbatimArguments: true
  }).on('error', function( err ){ throw err });;
  var buffer = '';
  var success_flag = true;
  var callback = (r) => {
    if (r.type == 'log') {
      success_flag = false;
      console.error(r.data);
      cb(null, { 'error': r.data });
      return false;
    }
    if (!success_flag) return false;
    
    try {
      var obj = JSON.parse(r.data);
      //console.info('getImageInspect> ' + obj[0].ContainerConfig.Image);
      cb(null, obj[0].ContainerConfig.Image);
    } catch(e) { }
  }

  proc.stdout.on('data', data => {
    buffer += data.toString();
  });

  proc.stderr.on('data', data => {
    return callback({ type: 'log', data: `${data}` });
  });

  proc.on('close', data => {
    return callback({ type: 'end', data: `${buffer}` });
  });
}

function testImage(image, tag, cb) {
  if (!cb) {
    if (typeof tag === 'function') {
      cb = tag;
      tag = null;
    }
  }
  if (!tag) {
    if (!image.search(':')) {
      console.error('image and tag required');
      return false;
    }
    let s = image.split(':');
    image = s[0];
    tag = s[1];
  }
  async.parallel([
    function (callback) {
      getRepoManifest(image, tag, callback);
    },
    function (callback) {
      getImageInspect(image, tag, callback);
    }
  ],
  function (err, results) {
    var res = [results[0], results[1]];

    if (results[0].error)
      res[0] = null;
    if (results[1].error)
      res[1] = null;
    
    cb(res);
  });
}

//getRepoManifest('regexpress/java', '1.8');
/*getImageInspect('aregexpress/java', '1.8', (e, d) => {
  console.log(d);
});*/
//testImage('regexpress/java','1.8');
//testImage('regexpress/python:3');