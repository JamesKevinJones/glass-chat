import { app, BrowserWindow, ipcMain, session } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getSessionUser,
  loginUser,
  logoutUser,
  registerUser,
} from './auth.js';
import { IpcChannels } from './ipc-channels.js';
import { loadPersistedState, savePersistedState, type PersistedState } from './persistence.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

function buildCsp(): string {
  const connect = ["'self'", 'http://127.0.0.1:11434', 'http://localhost:11434'];

  if (isDev) {
    connect.push('http://127.0.0.1:5173', 'ws://127.0.0.1:5173', 'ws://localhost:5173');
  }

  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    `connect-src ${connect.join(' ')}`,
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
  ].join('; ');
}

function installGlobalErrorHandlers(): void {
  process.on('uncaughtException', (error) => {
    console.error('[Aura] uncaughtException:', error);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('[Aura] unhandledRejection:', reason);
  });
}

function registerIpcHandlers(): void {
  ipcMain.removeHandler(IpcChannels.THREADS_LOAD);
  ipcMain.removeHandler(IpcChannels.THREADS_SAVE);
  ipcMain.removeHandler(IpcChannels.AUTH_GET_SESSION);
  ipcMain.removeHandler(IpcChannels.AUTH_REGISTER);
  ipcMain.removeHandler(IpcChannels.AUTH_LOGIN);
  ipcMain.removeHandler(IpcChannels.AUTH_LOGOUT);

  ipcMain.handle(IpcChannels.THREADS_LOAD, async () => loadPersistedState());
  ipcMain.handle(IpcChannels.THREADS_SAVE, async (_event, payload: PersistedState) => {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid persistence payload');
    }
    await savePersistedState(payload);
  });

  ipcMain.handle(IpcChannels.AUTH_GET_SESSION, async () => getSessionUser());
  ipcMain.handle(
    IpcChannels.AUTH_REGISTER,
    async (_event, payload: { username?: string; password?: string }) =>
      registerUser(payload?.username ?? '', payload?.password ?? ''),
  );
  ipcMain.handle(
    IpcChannels.AUTH_LOGIN,
    async (_event, payload: { username?: string; password?: string }) =>
      loginUser(payload?.username ?? '', payload?.password ?? ''),
  );
  ipcMain.handle(IpcChannels.AUTH_LOGOUT, async () => {
    await logoutUser();
  });
}

function applyStrictCsp(): void {
  // Vite + @vitejs/plugin-react injects an inline preamble in dev.
  if (isDev) return;

  const csp = buildCsp();
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders };
    headers['Content-Security-Policy'] = [csp];
    callback({ responseHeaders: headers });
  });
}

async function createWindow(): Promise<void> {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: '#070b14',
    title: 'Aura',
    titleBarStyle: 'hiddenInset',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  win.once('ready-to-show', () => win.show());

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    await win.loadURL(devServerUrl);
    if (process.env.AURA_OPEN_DEVTOOLS === '1') {
      win.webContents.openDevTools({ mode: 'detach' });
    }
    return;
  }

  await win.loadFile(path.join(__dirname, '../dist/index.html'));
}

app.whenReady().then(async () => {
  installGlobalErrorHandlers();
  applyStrictCsp();
  registerIpcHandlers();
  await createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});
