(function(w) {  
  const docker = 
  {
    st: '##START_RESULT##',
    ed: '##END_RESULT##',
    buff: '',
    exec: (image, property, testset, callback) => {
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
      });

      ls.stdout.on('data', data => {
        docker.buff += data.toString();
        if (docker.dataCheck(docker.buff)) {
          let str = docker.dataExtract(docker.buff);
          docker.buff = '';
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
    clearBuffer: () => {
      docker.buff = '';
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
  }
  w.mg_docker = docker;
})(window);