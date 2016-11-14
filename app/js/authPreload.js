const {ipcRenderer} = require('electron');
document.addEventListener('DOMContentLoaded', () => {
  try {
    var obj = JSON.parse(document.body.innerText);
    if (obj.error || obj.access_token)
      ipcRenderer.send('auth-result', document.body.innerText);
      window.close(); 
  } catch (e) { }
});