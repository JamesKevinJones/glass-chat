import { create } from 'zustand';
import type { AuthResult, PublicUser } from '../types/auth';

interface AuthState {
  user: PublicUser | null;
  status: 'checking' | 'authenticated' | 'anonymous';
  error: string | null;
  bootstrap: () => Promise<void>;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

/** In-memory auth for Vite-only / tests without Electron preload. */
let memoryUser: PublicUser | null = null;
const memoryAccounts = new Map<string, { user: PublicUser; password: string }>();

/** Clears in-memory auth fixtures between unit tests. */
export function resetMemoryAuthForTests(): void {
  memoryUser = null;
  memoryAccounts.clear();
}

async function getSession(): Promise<PublicUser | null> {
  if (window.aura?.getSession) return window.aura.getSession();
  return memoryUser;
}

async function registerRemote(username: string, password: string): Promise<AuthResult> {
  if (window.aura?.register) return window.aura.register(username, password);

  const key = username.trim().toLowerCase();
  if (memoryAccounts.has(key)) return { ok: false, error: 'That username is already taken.' };
  if (username.trim().length < 3) return { ok: false, error: 'Username must be 3–32 characters.' };
  if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };

  const user: PublicUser = {
    id: crypto.randomUUID(),
    username: username.trim(),
    createdAt: Date.now(),
  };
  memoryAccounts.set(key, { user, password });
  memoryUser = user;
  return { ok: true, user };
}

async function loginRemote(username: string, password: string): Promise<AuthResult> {
  if (window.aura?.login) return window.aura.login(username, password);

  const entry = memoryAccounts.get(username.trim().toLowerCase());
  if (!entry || entry.password !== password) {
    return { ok: false, error: 'Invalid username or password.' };
  }
  memoryUser = entry.user;
  return { ok: true, user: entry.user };
}

async function logoutRemote(): Promise<void> {
  if (window.aura?.logout) {
    await window.aura.logout();
    return;
  }
  memoryUser = null;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'checking',
  error: null,

  clearError: () => set({ error: null }),

  bootstrap: async () => {
    set({ status: 'checking', error: null });
    const user = await getSession();
    set({
      user,
      status: user ? 'authenticated' : 'anonymous',
    });
  },

  login: async (username, password) => {
    set({ error: null });
    const result = await loginRemote(username, password);
    if (!result.ok || !result.user) {
      set({ error: result.error ?? 'Login failed.', status: 'anonymous', user: null });
      return false;
    }
    set({ user: result.user, status: 'authenticated', error: null });
    return true;
  },

  register: async (username, password) => {
    set({ error: null });
    const result = await registerRemote(username, password);
    if (!result.ok || !result.user) {
      set({ error: result.error ?? 'Could not create account.', status: 'anonymous', user: null });
      return false;
    }
    set({ user: result.user, status: 'authenticated', error: null });
    return true;
  },

  logout: async () => {
    await logoutRemote();
    set({ user: null, status: 'anonymous', error: null });
  },
}));
