const {app} = require('electron');
const {BrowserWindow} = require('electron')

app.on('ready', () => {
  let win = new BrowserWindow({width: 1000, height: 700})
  win.on('closed', () => {
    win = null;
  });

  // Or load a local HTML file
  win.loadURL(`file://${__dirname}/test.html`)
});