import { describe, expect, it } from 'vitest';
import { IpcChannels } from '../../shared/ipc-channels';

describe('IPC channel contract', () => {
  it('exports the canonical Electron channel names', () => {
    expect(IpcChannels.THREADS_LOAD).toBe('threads:load');
    expect(IpcChannels.THREADS_SAVE).toBe('threads:save');
    expect(IpcChannels.AUTH_GET_SESSION).toBe('auth:getSession');
    expect(IpcChannels.AUTH_REGISTER).toBe('auth:register');
    expect(IpcChannels.AUTH_LOGIN).toBe('auth:login');
    expect(IpcChannels.AUTH_LOGOUT).toBe('auth:logout');
  });
});
