(function(w) {  
  const docker = 
  {
    st: '##START_RESULT##',
    ed: '##END_RESULT##',
    exec: (image, property, testset, callback) => {
      var buff = '';
      const spawn = require('child_process').spawn;
      var property = JSON.stringify(property);
      var testset = JSON.stringify(testset);
      console.info(`execute >> ${image} ${property} ${testset}`);

      property = new Buffer(property).toString("base64");
      testset = new Buffer(testset).toString("base64");
      console.info(`encoded >> ${image} ${property} ${testset}`);

      let ls = spawn('docker', ['run', '--rm', '-i', `${image}`, `${property}`, `${testset}`], {
        detached: true,
        windowsVerbatimArguments: true
      }).on('error', function( err ){ throw err });

      ls.stdout.on('data', data => {
        buff += data.toString();
        if (docker.dataCheck(buff)) {
          let str = docker.dataExtract(buff);
          buff = '';
          return callback(str);
        }
      });
      ls.stderr.on('data', data => {
        return callback({ type: 'log', data: `${data}` });
      });
      ls.on('close', data => {
        return callback({ type: 'end', data: `${data}` });
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
      const spawn = require('child_process').spawn;
      console.info(`pull >> ${image}`);

      let ls = spawn('docker', ['pull', `${image}`], {
        detached: true,
        windowsVerbatimArguments: true
      }).on('error', function( err ){ throw err });;

      ls.stdout.on('data', data => {
        return callback({ type: 'log', data: `${data}` });
      });
      ls.stderr.on('data', data => {
        return callback({ type: 'log', data: `${data}` });
      });
      ls.on('close', data => {
        return callback({ type: 'end', data: `${data}` });
      });
    },
  }
  w.mg_docker = docker;
})(window);