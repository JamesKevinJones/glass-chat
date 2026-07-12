import { motion } from 'framer-motion';
import { RefreshCw, Terminal, WifiOff } from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';
import { GlassPanel } from '../ui/GlassPanel';

export function ConnectionErrorScreen() {
  const refreshModels = useChatStore((s) => s.refreshModels);
  const error = useChatStore((s) => s.error);

  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        className="w-full max-w-md"
      >
        <GlassPanel strong className="p-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-3xl border border-white/15 bg-white/5 text-[var(--danger)]">
            <WifiOff size={26} />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
            Connection Error
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
            Aura can&apos;t reach Ollama on <code className="text-[var(--accent)]">localhost:11434</code>.
            Start your local server, then try again.
          </p>
          {error && (
            <p className="mt-3 rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2 text-xs text-[var(--danger)]">
              {error}
            </p>
          )}

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-left">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
              <Terminal size={14} />
              Terminal
            </div>
            <code className="text-sm text-[var(--accent)]">ollama serve</code>
          </div>

          <button
            type="button"
            onClick={() => void refreshModels()}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-[var(--accent-soft)] px-5 py-2.5 text-sm font-semibold text-[var(--accent)] transition hover:scale-[1.02] hover:bg-teal-400/25 active:scale-95"
          >
            <RefreshCw size={16} />
            Retry connection
          </button>
        </GlassPanel>
      </motion.div>
    </div>
  );
}
