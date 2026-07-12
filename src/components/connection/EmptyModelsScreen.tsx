import { motion } from 'framer-motion';
import { PackageOpen, Terminal } from 'lucide-react';
import { GlassPanel } from '../ui/GlassPanel';

/** Shown when Ollama is reachable but no local models are installed. */
export function EmptyModelsScreen() {
  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        className="w-full max-w-md"
      >
        <GlassPanel strong className="p-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-3xl border border-white/15 bg-white/5 text-[var(--accent)]">
            <PackageOpen size={26} />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">No models found</h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
            Ollama is running, but Aura doesn&apos;t see any downloaded models yet. Open your
            terminal and run:
          </p>
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-left">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
              <Terminal size={14} />
              Terminal
            </div>
            <code className="text-sm text-[var(--accent)]">ollama run qwen2.5:3b</code>
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  );
}
