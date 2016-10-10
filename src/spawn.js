const spawn = require('child_process').spawn;
const ls = spawn('docker', ['run', '--rm', '-i', 'ubuntu:16.04', 'echo','"{"resultType":"GROUP","testResult":{"resultList":[["Hello","Test","String"],null]}}"']);

ls.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
});

ls.stderr.on('data', (data) => {
    console.log(`stderr: ${data}`);
});

ls.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
});