import { app, BrowserWindow, ipcMain, dialog, shell, globalShortcut } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;

const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 860,
    minHeight: 560,
    title: 'Harbor — Personal Workspace',
    backgroundColor: '#070b14',
    show: false, // Wait until ready-to-show to prevent white flash
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Remove default browser menu bar for Obsidian-like clean canvas
  mainWindow.setMenuBarVisibility(false);

  // Allow toggling DevTools with F12 or Ctrl+Shift+I
  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow?.webContents.toggleDevTools();
    }
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`Page failed to load [${errorCode}]: ${errorDescription} (${validatedURL})`);
  });

  // Smooth appearance once rendered
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Fallback show in case ready-to-show was delayed
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show();
    }
  }, 1200);

  // Open external links in default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  const distIndexPath = path.join(__dirname, '../dist/index.html');

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173').catch((err) => {
      console.warn('Could not connect to Vite dev server, falling back to dist/index.html:', err);
      if (fs.existsSync(distIndexPath)) {
        mainWindow?.loadFile(distIndexPath);
      }
    });
  } else {
    mainWindow.loadFile(distIndexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  // IPC Handlers
  ipcMain.handle('dialog:selectFolder', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Vault Folder for Harbor',
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  ipcMain.handle('fs:readFolder', async (_, folderPath: string) => {
    try {
      const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });
      return entries.map(e => ({
        name: e.name,
        isDirectory: e.isDirectory(),
      }));
    } catch (err: any) {
      console.error('Error reading directory:', err);
      throw err;
    }
  });

  ipcMain.handle('fs:readFile', async (_, filePath: string) => {
    try {
      return await fs.promises.readFile(filePath, 'utf-8');
    } catch (err: any) {
      console.error('Error reading file:', err);
      throw err;
    }
  });

  ipcMain.handle('fs:writeFile', async (_, filePath: string, content: string) => {
    try {
      const dir = path.dirname(filePath);
      await fs.promises.mkdir(dir, { recursive: true });
      await fs.promises.writeFile(filePath, content, 'utf-8');
      return true;
    } catch (err: any) {
      console.error('Error writing file:', err);
      throw err;
    }
  });

  ipcMain.handle('shell:showItemInFolder', async (_, fullPath: string) => {
    shell.showItemInFolder(fullPath);
  });

  ipcMain.handle('shell:openExternal', async (_, url: string) => {
    shell.openExternal(url);
  });

  createWindow();

  // Register Global Hotkey for Desktop Quick-Capture (Ctrl+Alt+N / Cmd+Alt+N from anywhere in OS)
  try {
    globalShortcut.register('CommandOrControl+Alt+N', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('quick-capture:open');
      }
    });
  } catch (err) {
    console.warn('Failed to register global quick-capture shortcut:', err);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
