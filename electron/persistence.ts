import { app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getSessionUser, userThreadsPath } from './auth.js';
import { writeJsonAtomic } from './fs-atomic.js';

/**
 * Shape persisted to disk. Kept loosely typed on the main side so the renderer
 * owns the authoritative TypeScript definitions in src/types/chat.ts.
 */
export interface PersistedState {
  threads: unknown[];
  activeThreadId: string | null;
  selectedModel: string | null;
  sidebarOpen: boolean;
}

const EMPTY_STATE: PersistedState = {
  threads: [],
  activeThreadId: null,
  selectedModel: null,
  sidebarOpen: true,
};

/** Legacy single-file store (pre-accounts). Migrated once, then removed. */
function legacyStorePath(): string {
  return path.join(app.getPath('userData'), 'aura', 'threads.json');
}

function normalizeState(parsed: Partial<PersistedState>): PersistedState {
  return {
    threads: Array.isArray(parsed.threads) ? parsed.threads : [],
    activeThreadId: typeof parsed.activeThreadId === 'string' ? parsed.activeThreadId : null,
    selectedModel: typeof parsed.selectedModel === 'string' ? parsed.selectedModel : null,
    sidebarOpen: typeof parsed.sidebarOpen === 'boolean' ? parsed.sidebarOpen : true,
  };
}

async function resolveStorePath(): Promise<string | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const storePath = userThreadsPath(user.id);
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  return storePath;
}

/**
 * Move legacy threads.json into the first authenticated user's store exactly once.
 * Using rename/unlink prevents every subsequent account from inheriting the same history.
 */
async function maybeMigrateLegacy(storePath: string): Promise<void> {
  try {
    await fs.access(storePath);
    return;
  } catch {
    // User store missing — continue.
  }

  const legacy = legacyStorePath();
  try {
    await fs.access(legacy);
  } catch {
    return;
  }

  try {
    await fs.rename(legacy, storePath);
  } catch {
    try {
      const raw = await fs.readFile(legacy, 'utf8');
      await fs.writeFile(storePath, raw, 'utf8');
      await fs.unlink(legacy);
    } catch {
      // Ignore unreadable legacy data.
    }
  }
}

/** Load chat state for the signed-in user. */
export async function loadPersistedState(): Promise<PersistedState> {
  try {
    const storePath = await resolveStorePath();
    if (!storePath) return { ...EMPTY_STATE };

    await maybeMigrateLegacy(storePath);
    const raw = await fs.readFile(storePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return normalizeState(parsed);
  } catch {
    return { ...EMPTY_STATE };
  }
}

/**
 * Atomically write chat state (temp file + rename) to avoid torn writes
 * if the app quits mid-save.
 */
export async function savePersistedState(state: PersistedState): Promise<void> {
  const storePath = await resolveStorePath();
  if (!storePath) {
    throw new Error('You must be signed in to save chats.');
  }

  await writeJsonAtomic(storePath, normalizeState(state));
}
