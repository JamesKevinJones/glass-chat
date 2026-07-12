import { AnimatePresence, motion } from 'framer-motion';
import {
  LogOut,
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { selectActiveThread, useChatStore } from '../../store/useChatStore';
import { GlassPanel, IconButton } from '../ui/GlassPanel';

function ConnectionPill() {
  const status = useChatStore((s) => s.connectionStatus);
  const label =
    status === 'connected' ? 'Ollama online' : status === 'checking' ? 'Checking…' : 'Offline';
  const color =
    status === 'connected'
      ? 'bg-teal-400'
      : status === 'checking'
        ? 'bg-amber-300'
        : 'bg-rose-400';

  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-[var(--text-muted)]">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      {label}
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const threads = useChatStore((s) => s.threads);
  const activeThreadId = useChatStore((s) => s.activeThreadId);
  const createThread = useChatStore((s) => s.createThread);
  const selectThread = useChatStore((s) => s.selectThread);
  const deleteThread = useChatStore((s) => s.deleteThread);
  const setSidebarOpen = useChatStore((s) => s.setSidebarOpen);
  const resetSession = useChatStore((s) => s.resetSession);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const onLogout = async () => {
    if (useChatStore.getState().isStreaming) {
      useChatStore.getState().stopGeneration();
    }
    await logout();
    resetSession();
  };

  return (
    <GlassPanel className="flex h-full flex-col p-4">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-teal-300/30 bg-teal-400/15 text-[var(--accent)]">
            <Sparkles size={18} />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-[var(--text)]">Aura</h1>
            <p className="text-[11px] text-[var(--text-muted)]">Local intelligence</p>
          </div>
        </div>
        <IconButton
          label="Collapse sidebar"
          onClick={() => setSidebarOpen(false)}
          className="hidden md:inline-flex"
        >
          <PanelLeftClose size={16} />
        </IconButton>
      </div>

      <button
        type="button"
        onClick={() => {
          createThread();
          onNavigate?.();
        }}
        className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm font-medium text-[var(--text)] transition hover:scale-[1.01] hover:bg-white/15 active:scale-[0.99]"
      >
        <MessageSquarePlus size={16} />
        New chat
      </button>

      <div className="aura-scroll min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {threads.map((thread) => {
          const active = thread.id === activeThreadId;
          return (
            <div
              key={thread.id}
              className={`group flex items-center gap-1 rounded-2xl border px-1 py-1 transition ${
                active
                  ? 'border-teal-300/30 bg-teal-400/10'
                  : 'border-transparent hover:border-white/10 hover:bg-white/5'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  selectThread(thread.id);
                  onNavigate?.();
                }}
                className="min-w-0 flex-1 truncate px-2.5 py-2 text-left text-sm text-[var(--text)]"
              >
                {thread.title}
              </button>
              <button
                type="button"
                aria-label={`Delete ${thread.title}`}
                onClick={() => deleteThread(thread.id)}
                className="mr-1 rounded-xl p-1.5 text-[var(--text-muted)] opacity-0 transition group-hover:opacity-100 hover:bg-rose-400/15 hover:text-[var(--danger)]"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 space-y-3 border-t border-white/10 pt-3">
        <ConnectionPill />
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--text)]">{user?.username}</p>
            <p className="text-[11px] text-[var(--text-muted)]">Local account</p>
          </div>
          <IconButton label="Sign out" onClick={() => void onLogout()}>
            <LogOut size={14} />
          </IconButton>
        </div>
      </div>
    </GlassPanel>
  );
}

export function Sidebar() {
  const sidebarOpen = useChatStore((s) => s.sidebarOpen);
  const setSidebarOpen = useChatStore((s) => s.setSidebarOpen);

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen, setSidebarOpen]);

  return (
    <>
      <AnimatePresence initial={false}>
        {sidebarOpen ? (
          <motion.aside
            key="sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="relative hidden h-full shrink-0 overflow-hidden md:block"
          >
            <SidebarContent />
          </motion.aside>
        ) : (
          <motion.div
            key="sidebar-collapsed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="hidden shrink-0 md:block"
          >
            <IconButton label="Open sidebar" onClick={() => setSidebarOpen(true)} className="mt-1">
              <PanelLeftOpen size={16} />
            </IconButton>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="mobile-sidebar"
            className="fixed inset-0 z-50 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Close sidebar"
              className="absolute inset-0 bg-black/50"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -24, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              className="absolute bottom-3 left-3 top-3 w-[min(280px,85vw)]"
            >
              <SidebarContent onNavigate={() => setSidebarOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function MobileSidebarToggle() {
  const sidebarOpen = useChatStore((s) => s.sidebarOpen);
  const setSidebarOpen = useChatStore((s) => s.setSidebarOpen);
  const active = useChatStore(selectActiveThread);

  return (
    <div className="flex items-center gap-2 md:hidden">
      <IconButton
        label={sidebarOpen ? 'Hide chats' : 'Show chats'}
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
      </IconButton>
      <span className="max-w-[140px] truncate text-sm text-[var(--text-muted)]">
        {active?.title ?? 'Aura'}
      </span>
    </div>
  );
}
