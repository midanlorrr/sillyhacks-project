const { app, BrowserWindow, screen } = require('electron');

let win;

app.whenReady().then(() => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const windowWidth = 1000;
  const windowHeight = 820;

  win = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: Math.max(0, Math.floor((width - windowWidth) / 2)),
    y: Math.max(0, Math.floor((height - windowHeight) / 2)),
    frame: true,
    transparent: false,
    backgroundColor: '#111111',
    alwaysOnTop: false,
    resizable: true,
    autoHideMenuBar: true,
  });

  win.loadFile('index.html');
});