/** IPC channel names shared by Electron main/preload and renderer tests. */
export const IpcChannels = {
  THREADS_LOAD: 'threads:load',
  THREADS_SAVE: 'threads:save',
  AUTH_GET_SESSION: 'auth:getSession',
  AUTH_REGISTER: 'auth:register',
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
} as const;

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels];
