import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannels } from './ipc-channels.js';

/**
 * Strict, minimal bridge exposed to the renderer.
 * No Node APIs leak — only typed auth + persistence invoke helpers.
 */
const auraApi = {
  loadThreads: (): Promise<unknown> => ipcRenderer.invoke(IpcChannels.THREADS_LOAD),
  saveThreads: (payload: unknown): Promise<void> =>
    ipcRenderer.invoke(IpcChannels.THREADS_SAVE, payload),
  getSession: (): Promise<unknown> => ipcRenderer.invoke(IpcChannels.AUTH_GET_SESSION),
  register: (username: string, password: string): Promise<unknown> =>
    ipcRenderer.invoke(IpcChannels.AUTH_REGISTER, { username, password }),
  login: (username: string, password: string): Promise<unknown> =>
    ipcRenderer.invoke(IpcChannels.AUTH_LOGIN, { username, password }),
  logout: (): Promise<void> => ipcRenderer.invoke(IpcChannels.AUTH_LOGOUT),
};

contextBridge.exposeInMainWorld('aura', auraApi);

export type AuraApi = typeof auraApi;
