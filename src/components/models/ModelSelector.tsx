import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../../store/useChatStore';

export function ModelSelector() {
  const models = useChatStore((s) => s.models);
  const selectedModel = useChatStore((s) => s.selectedModel);
  const setModel = useChatStore((s) => s.setModel);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <div ref={rootRef} className="no-drag relative">
      <button
        type="button"
        disabled={isStreaming || models.length === 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-3.5 py-2 text-sm font-medium text-[var(--text)] shadow-[0_0_0_1px_rgba(251,191,36,0.15)] transition hover:bg-white/15 disabled:opacity-50"
      >
        <span className="max-w-[180px] truncate">{selectedModel ?? 'No models'}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}>
          <ChevronDown size={16} className="text-[var(--text-muted)]" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className="absolute right-0 z-40 mt-2 min-w-[220px] overflow-hidden rounded-2xl border border-white/20 bg-[#0f1520]/95 p-1.5 shadow-2xl backdrop-blur-xl"
            role="listbox"
          >
            {models.map((model) => {
              const selected = model.name === selectedModel;
              return (
                <li key={model.name}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-[var(--text)] transition hover:bg-white/10"
                    onClick={() => {
                      setModel(model.name);
                      setOpen(false);
                    }}
                  >
                    <span className="truncate">{model.name}</span>
                    {selected && <Check size={16} className="shrink-0 text-[var(--accent)]" />}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
