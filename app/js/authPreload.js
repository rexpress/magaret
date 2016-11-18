const {ipcRenderer} = require('electron');
ipcRenderer.send('heartbeat', 'test');
document.addEventListener('DOMContentLoaded', () => {
  try {
    var obj = JSON.parse(document.body.innerText);
    if (obj.error || obj.access_token)
      ipcRenderer.send('auth-result', JSON.stringify(JSON.parse(document.body.innerText)));
      window.close();
  } catch (e) { }
});