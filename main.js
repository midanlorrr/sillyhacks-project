const { app, BrowserWindow, screen } = require('electron');

let win;

app.whenReady().then(() => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const windowWidth = 300;
  const windowHeight = 300;

  win = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: width - windowWidth - 20,   // right corner
    y: height - windowHeight - 20, // bottom corner
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false
  });

  win.loadFile('index.html');
});