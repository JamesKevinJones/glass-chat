import { app } from 'electron';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { writeJsonAtomic } from './fs-atomic.js';

export interface PublicUser {
  id: string;
  username: string;
  createdAt: number;
}

interface StoredUser extends PublicUser {
  salt: string;
  passwordHash: string;
}

interface AccountsFile {
  users: StoredUser[];
}

interface SessionFile {
  userId: string | null;
}

export interface AuthResult {
  ok: boolean;
  user?: PublicUser;
  error?: string;
}

const MAX_PASSWORD_LENGTH = 128;
const SCRYPT_KEYLEN = 64;

function auraRoot(): string {
  return path.join(app.getPath('userData'), 'aura');
}

function accountsPath(): string {
  return path.join(auraRoot(), 'accounts.json');
}

function sessionPath(): string {
  return path.join(auraRoot(), 'session.json');
}

export function userThreadsPath(userId: string): string {
  // userId is always generated hex — still guard against path tricks.
  if (!/^[a-f0-9]{16,64}$/i.test(userId)) {
    throw new Error('Invalid user id');
  }
  return path.join(auraRoot(), 'users', userId, 'threads.json');
}

async function ensureAuraDir(): Promise<void> {
  await fs.mkdir(auraRoot(), { recursive: true });
}

async function readAccounts(): Promise<AccountsFile> {
  try {
    const raw = await fs.readFile(accountsPath(), 'utf8');
    const parsed = JSON.parse(raw) as AccountsFile;
    return { users: Array.isArray(parsed.users) ? parsed.users : [] };
  } catch {
    return { users: [] };
  }
}

async function writeAccounts(data: AccountsFile): Promise<void> {
  await ensureAuraDir();
  await writeJsonAtomic(accountsPath(), data);
}

async function readSession(): Promise<SessionFile> {
  try {
    const raw = await fs.readFile(sessionPath(), 'utf8');
    const parsed = JSON.parse(raw) as SessionFile;
    return { userId: parsed.userId ?? null };
  } catch {
    return { userId: null };
  }
}

async function writeSession(session: SessionFile): Promise<void> {
  await ensureAuraDir();
  await writeJsonAtomic(sessionPath(), session);
}

function hashPassword(password: string, salt: Buffer): string {
  return scryptSync(password, salt, SCRYPT_KEYLEN, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  }).toString('hex');
}

function toPublic(user: StoredUser): PublicUser {
  return { id: user.id, username: user.username, createdAt: user.createdAt };
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function validateCredentials(username: string, password: string): string | null {
  const clean = username.trim();
  if (clean.length < 3 || clean.length > 32) {
    return 'Username must be 3–32 characters.';
  }
  if (!/^[a-zA-Z0-9_\-.]+$/.test(clean)) {
    return 'Username can only use letters, numbers, _ - .';
  }
  if (password.length < 6) {
    return 'Password must be at least 6 characters.';
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

export async function getSessionUser(): Promise<PublicUser | null> {
  const session = await readSession();
  if (!session.userId) return null;
  const accounts = await readAccounts();
  const user = accounts.users.find((u) => u.id === session.userId);
  return user ? toPublic(user) : null;
}

export async function registerUser(username: string, password: string): Promise<AuthResult> {
  const validationError = validateCredentials(username, password);
  if (validationError) return { ok: false, error: validationError };

  const accounts = await readAccounts();
  const key = normalizeUsername(username);
  if (accounts.users.some((u) => normalizeUsername(u.username) === key)) {
    return { ok: false, error: 'That username is already taken.' };
  }

  const salt = randomBytes(16);
  const user: StoredUser = {
    id: randomBytes(16).toString('hex'),
    username: username.trim(),
    createdAt: Date.now(),
    salt: salt.toString('hex'),
    passwordHash: hashPassword(password, salt),
  };

  accounts.users.push(user);
  await writeAccounts(accounts);
  await writeSession({ userId: user.id });
  await fs.mkdir(path.dirname(userThreadsPath(user.id)), { recursive: true });

  return { ok: true, user: toPublic(user) };
}

export async function loginUser(username: string, password: string): Promise<AuthResult> {
  const validationError = validateCredentials(username, password);
  if (validationError) return { ok: false, error: validationError };

  const accounts = await readAccounts();
  const key = normalizeUsername(username);
  const user = accounts.users.find((u) => normalizeUsername(u.username) === key);
  if (!user) return { ok: false, error: 'Invalid username or password.' };

  const salt = Buffer.from(user.salt, 'hex');
  const attempt = Buffer.from(hashPassword(password, salt), 'hex');
  const expected = Buffer.from(user.passwordHash, 'hex');
  if (attempt.length !== expected.length || !timingSafeEqual(attempt, expected)) {
    return { ok: false, error: 'Invalid username or password.' };
  }

  await writeSession({ userId: user.id });
  return { ok: true, user: toPublic(user) };
}

export async function logoutUser(): Promise<void> {
  await writeSession({ userId: null });
}
