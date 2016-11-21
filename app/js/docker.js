(function(w) {  
  const docker = 
  {
    st: '##START_RESULT##',
    ed: '##END_RESULT##',
    exec: (image, property, testset, callback) => {
      var property = JSON.stringify(property);
      var testset = JSON.stringify(testset);
      console.info(`execute >> ${image} ${property} ${testset}`);

      property = new Buffer(property).toString("base64");
      testset = new Buffer(testset).toString("base64");
      console.info(`encoded >> ${image} ${property} ${testset}`);

      const dockerode = require('dockerode');
      var dd = new dockerode();
      var buff = '';
      dd.run(image, [property, testset], process.stdout, {
        Tty: false
      }, function (err, data, container) {}).on('stream', function (stream) {
        stream.on('data', function (chunk) {
          var chunk_str = chunk.toString();
          buff += chunk_str;
          if (docker.dataCheck(buff)) {
            let str = docker.dataExtract(buff);
            buff = '';
            return callback(str);
          }
        });
        stream.on('error', function () {
          return callback({ type: 'log', data: `${data}` });
        });
        stream.on('end', function () {
          return callback({ type: 'end' });
        });
      });
    },
    dataCheck: data => {
      return (typeof data === 'undefined' ? false :
      (data.search(docker.st) == -1 ||
      data.search(docker.ed) == -1) ?
        false : true);
    },
    dataExtract: data => {
      let a = data.substr(data.search(docker.st)+docker.st.length);
      a = a.substr(0, a.search(docker.ed)).trim();
      try {
        data = JSON.parse(a)
      }
      catch(e) { 
        console.warn(`dataExtract: ${e.message}`);
        return;
      }
      return { type: 'result', data: data };
    },
    pull: (image, callback) => {
      const dockerode = require('dockerode');
      console.info(`pull >> ${image}`);
      var docker = new dockerode();

      docker.pull(`${image}`, function (err, stream) {
        stream.on('data', function (chunk) {
          var chunk_str = chunk.toString();
          for (let item of chunk_str.split('\n')) {
          console.log(`${item.trim().length} <${item}>`);
            if (item.trim().length)
              callback({ type: 'log', data: JSON.parse(item).status });
          }
        });
        stream.on('end', function () {
          callback({ type: 'end', data: '0' });
        })
      });
    },
  }
  w.mg_docker = docker;
})(window);