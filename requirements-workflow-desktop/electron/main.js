import { app, BrowserWindow, Menu } from 'electron';
import path from 'path';
import { pathToFileURL } from 'url';
import { fileURLToPath } from 'url';
import net from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');
const appIconPath = process.platform === 'win32'
  ? path.join(appRoot, 'build', 'icon.ico')
  : path.join(appRoot, 'build', 'icon.png');

let port = 3500;

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

function isPortFree(candidatePort) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.unref();
    server.on('error', () => resolve(false));
    server.listen({ port: candidatePort }, () => {
      server.close(() => resolve(true));
    });
  });
}

async function resolvePort(preferredPort = 3500, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i += 1) {
    const candidate = preferredPort + i;
    // eslint-disable-next-line no-await-in-loop
    if (await isPortFree(candidate)) return candidate;
  }
  throw new Error('No available local port found for embedded server');
}

function createMainWindow() {
  Menu.setApplicationMenu(null);

  const win = new BrowserWindow({
    icon: appIconPath,
    width: 1480,
    height: 920,
    minWidth: 1120,
    minHeight: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.setMenuBarVisibility(false);

  win.loadURL(`http://127.0.0.1:${port}`);
}

function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = async () => {
      try {
        const response = await fetch(url, { method: 'GET' });
        if (response.ok) return resolve();
      } catch {}

      if (Date.now() - start > timeoutMs) {
        return reject(new Error('Server startup timeout'));
      }
      setTimeout(attempt, 250);
    };
    attempt();
  });
}

function startServer() {
  const userDataDir = app.getPath('userData');
  const dbFile = path.join(userDataDir, 'workspaces.db');
  const serverEntry = path.join(appRoot, 'server.js');

  process.env.HOST = '127.0.0.1';
  process.env.PORT = String(port);
  process.env.WORKSPACES_DB_FILE = dbFile;

  return import(pathToFileURL(serverEntry).href);
}

app.whenReady().then(async () => {
  try {
    port = await resolvePort(3500);
    await startServer();
    await waitForServer(`http://127.0.0.1:${port}`);
    createMainWindow();
  } catch (error) {
    console.error('Unable to start desktop app:', error);
    app.quit();
    return;
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  // Server runs in-process and exits with app.
});
