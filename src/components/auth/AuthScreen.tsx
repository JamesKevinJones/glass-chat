import { motion } from 'framer-motion';
import { Lock, Sparkles, UserRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { GlassPanel } from '../ui/GlassPanel';

type Mode = 'login' | 'register';

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === 'login') await login(username, password);
      else await register(username, password);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="mesh-bg" aria-hidden />
      <div className="app-layer flex h-full items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          className="w-full max-w-md"
        >
          <GlassPanel strong className="p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-teal-300/30 bg-teal-400/15 text-[var(--accent)]">
                <Sparkles size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">Aura</h1>
                <p className="text-sm text-[var(--text-muted)]">Private local intelligence</p>
              </div>
            </div>

            <p className="mb-6 text-sm leading-relaxed text-[var(--text-muted)]">
              Create a local account to keep your chat history on this device. Nothing leaves your
              machine — not even your password hash goes online.
            </p>

            <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/20 p-1">
              {(['login', 'register'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setMode(value);
                    clearError();
                  }}
                  className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                    mode === value
                      ? 'bg-white/10 text-[var(--text)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {value === 'login' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>

            <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  <UserRound size={12} /> Username
                </span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  className="w-full rounded-2xl border border-white/15 bg-black/25 px-4 py-3 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-teal-300/40"
                  placeholder="you"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  <Lock size={12} /> Password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  className="w-full rounded-2xl border border-white/15 bg-black/25 px-4 py-3 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-teal-300/40"
                  placeholder="••••••••"
                />
              </label>

              {error && (
                <p className="rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2 text-xs text-[var(--danger)]">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="mt-2 inline-flex w-full items-center justify-center rounded-2xl border border-teal-300/40 bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[#042f2e] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
              </button>
            </form>
          </GlassPanel>
        </motion.div>
      </div>
    </>
  );
}
