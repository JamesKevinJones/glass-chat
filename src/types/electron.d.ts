import type { PersistedState } from './chat';
import type { AuthResult, PublicUser } from './auth';

/** API surface exposed by electron/preload.ts via contextBridge. */
export interface AuraApi {
  loadThreads: () => Promise<PersistedState>;
  saveThreads: (payload: PersistedState) => Promise<void>;
  getSession: () => Promise<PublicUser | null>;
  register: (username: string, password: string) => Promise<AuthResult>;
  login: (username: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
}

declare global {
  interface Window {
    /** Present when running inside Electron with the Aura preload script. */
    aura?: AuraApi;
  }
}

export {};
