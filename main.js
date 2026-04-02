// ============================================================
// MAIN.JS — Electron window setup
// ============================================================
const { app, BrowserWindow, ipcMain, screen, globalShortcut } = require('electron');

let win;
let peeWin = null;

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu-compositing');

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  win = new BrowserWindow({
    width: 290,
    height: 340,
    x: width  - 305,
    y: height - 355,
    transparent: true,
    frame: false,
    thickFrame: false,
    roundedCorners: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.setBackgroundColor('rgba(0,0,0,0)');

  win.loadFile('index.html');
  win.webContents.on('did-finish-load', () => {
    win.setBackgroundColor('#00000000');
  });
  // win.webContents.openDevTools({ mode: 'detach' });
}

ipcMain.on('move-window', (_, x, y) => {
  if (win) win.setPosition(Math.round(x), Math.round(y));
});
ipcMain.handle('get-window-pos', () => win ? win.getPosition() : [0, 0]);
ipcMain.handle('get-screen-size', () => {
  if (!win) {
    const wa = screen.getPrimaryDisplay().workArea;
    return { x: wa.x, y: wa.y, width: wa.width, height: wa.height };
  }
  const b = win.getBounds();
  const center = { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) };
  const wa = screen.getDisplayNearestPoint(center).workArea;
  return { x: wa.x, y: wa.y, width: wa.width, height: wa.height };
});

// Full-screen pee overlay
ipcMain.on('show-pee', (_, payload = {}) => {
  if (peeWin) return;
  const primary = screen.getPrimaryDisplay();
  const display = screen.getDisplayNearestPoint({
    x: Number.isFinite(payload.x) ? Math.round(payload.x) : primary.bounds.x,
    y: Number.isFinite(payload.y) ? Math.round(payload.y) : primary.bounds.y,
  });
  const bounds = display.bounds;
  const { width, height } = bounds;
  const srcX = Number.isFinite(payload.x) ? Math.round(payload.x) : Math.round(width * 0.75);
  const srcY = Number.isFinite(payload.y) ? Math.round(payload.y) : Math.round(height * 0.72);
  const localX = srcX - bounds.x;
  const localY = srcY - bounds.y;
  peeWin = new BrowserWindow({
    width, height, x: bounds.x, y: bounds.y,
    transparent: true, frame: false,
    thickFrame: false,
    roundedCorners: false,
    alwaysOnTop: true, focusable: false,
    skipTaskbar: true, hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  peeWin.setBackgroundColor('#00000000');
  peeWin.setIgnoreMouseEvents(true);
  peeWin.loadFile('pee-overlay.html', { query: { x: String(localX), y: String(localY) } });
  setTimeout(() => { if (peeWin) { peeWin.close(); peeWin = null; } }, 4400);
});

function sendHotkeyAction(channel) {
  if (win && !win.isDestroyed()) win.webContents.send(channel);
}

ipcMain.on('close-window', () => {
  if (peeWin) { peeWin.close(); peeWin = null; }
  if (win) win.close();
});

app.whenReady().then(() => {
  createWindow();

  globalShortcut.register('CommandOrControl+Alt+K', () => {
    if (peeWin) { peeWin.close(); peeWin = null; }
    app.quit();
  });

  globalShortcut.register('CommandOrControl+Alt+P', () => {
    sendHotkeyAction('hotkey-pee');
  });

  globalShortcut.register('CommandOrControl+Alt+R', () => {
    sendHotkeyAction('hotkey-frenzy');
  });

  globalShortcut.register('CommandOrControl+Alt+1', () => sendHotkeyAction('hotkey-feed'));
  globalShortcut.register('CommandOrControl+Alt+2', () => sendHotkeyAction('hotkey-sleep'));
  globalShortcut.register('CommandOrControl+Alt+3', () => sendHotkeyAction('hotkey-pet'));
  globalShortcut.register('CommandOrControl+Alt+4', () => sendHotkeyAction('hotkey-walk'));
  globalShortcut.register('CommandOrControl+Alt+5', () => sendHotkeyAction('hotkey-look'));
  globalShortcut.register('CommandOrControl+Alt+6', () => sendHotkeyAction('hotkey-lick'));
  globalShortcut.register('CommandOrControl+Alt+7', () => sendHotkeyAction('hotkey-scratch'));
  globalShortcut.register('CommandOrControl+Alt+8', () => sendHotkeyAction('hotkey-burp'));
  globalShortcut.register('CommandOrControl+Alt+9', () => sendHotkeyAction('hotkey-annoyed'));
  globalShortcut.register('CommandOrControl+Alt+0', () => sendHotkeyAction('hotkey-chat'));
  globalShortcut.register('CommandOrControl+Alt+A', () => sendHotkeyAction('hotkey-all-actions'));
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => app.quit());
