const { app, BrowserWindow, screen } = require('electron');

let win;

app.whenReady().then(() => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const contentWidth = 270;
  const contentHeight = 270;

  win = new BrowserWindow({
    width: contentWidth,
    height: contentHeight,
    useContentSize: true,
    x: Math.max(0, width - contentWidth - 16),
    y: Math.max(0, height - contentHeight - 16),
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    autoHideMenuBar: true,
  });

  win.loadFile('index.html');
});