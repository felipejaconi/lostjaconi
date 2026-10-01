const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('path');

function createWindow () {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    fullscreen: true,      // Abre em tela cheia
    kiosk: true,           // Modo Kiosk (bloqueia saídas fáceis, ideal para POS)
    autoHideMenuBar: true, // Esconde a barra de menus do topo
    icon: path.join(__dirname, 'icon.png'), // Ícone do aplicativo
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Remove o menu padrão do Electron
  win.setMenu(null);

  // Carrega o site da logística
  win.loadURL('https://logistica.lostwind.pt/');

  // Atalho de emergência para fechar o aplicativo (Ctrl + Shift + Q)
  // Como o modo kiosk bloqueia o fechamento normal, isso é útil para os administradores
  globalShortcut.register('CommandOrControl+Shift+Q', () => {
    app.quit();
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  // Cancela o registro de todos os atalhos ao fechar
  globalShortcut.unregisterAll();
});
