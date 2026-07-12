import { create } from 'zustand';
import { isAbortError, OllamaConnectionLostError, ollamaClient } from '../services/ollama/client';
import type {
  ConnectionStatus,
  Message,
  OllamaModel,
  PersistedState,
  Thread,
} from '../types/chat';

function createId(): string {
  return crypto.randomUUID();
}

function createEmptyThread(): Thread {
  const now = Date.now();
  return {
    id: createId(),
    title: 'New chat',
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

function titleFromPrompt(prompt: string): string {
  const cleaned = prompt.replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'New chat';
  return cleaned.length > 42 ? `${cleaned.slice(0, 42)}…` : cleaned;
}

/** In-memory fallback when window.aura is unavailable (Vite-only / tests). */
let memoryPersist: PersistedState = {
  threads: [],
  activeThreadId: null,
  selectedModel: null,
  sidebarOpen: true,
};

async function loadPersisted(): Promise<PersistedState> {
  if (window.aura?.loadThreads) {
    return window.aura.loadThreads();
  }
  return { ...memoryPersist, threads: [...memoryPersist.threads] };
}

async function savePersisted(state: PersistedState): Promise<void> {
  if (window.aura?.saveThreads) {
    await window.aura.saveThreads(state);
    return;
  }
  memoryPersist = {
    ...state,
    threads: state.threads.map((t) => ({ ...t, messages: [...t.messages] })),
  };
}

interface ChatState {
  threads: Thread[];
  activeThreadId: string | null;
  selectedModel: string | null;
  models: OllamaModel[];
  connectionStatus: ConnectionStatus;
  isStreaming: boolean;
  sidebarOpen: boolean;
  error: string | null;
  inputDraft: string;

  hydrate: () => Promise<void>;
  resetSession: () => void;
  refreshModels: () => Promise<void>;
  createThread: () => void;
  selectThread: (id: string) => void;
  deleteThread: (id: string) => void;
  setModel: (model: string) => void;
  setSidebarOpen: (open: boolean) => void;
  setInputDraft: (value: string) => void;
  sendMessage: (content?: string) => Promise<void>;
  stopGeneration: () => void;
  clearError: () => void;
}

let abortController: AbortController | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist(get: () => ChatState): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    const s = get();
    void savePersisted({
      threads: s.threads,
      activeThreadId: s.activeThreadId,
      selectedModel: s.selectedModel,
      sidebarOpen: s.sidebarOpen,
    });
  }, 300);
}

export const useChatStore = create<ChatState>((set, get) => ({
  threads: [],
  activeThreadId: null,
  selectedModel: null,
  models: [],
  connectionStatus: 'checking',
  isStreaming: false,
  sidebarOpen: true,
  error: null,
  inputDraft: '',

  resetSession: () => {
    abortController?.abort();
    abortController = null;
    if (persistTimer) clearTimeout(persistTimer);
    set({
      threads: [],
      activeThreadId: null,
      selectedModel: null,
      models: [],
      connectionStatus: 'checking',
      isStreaming: false,
      sidebarOpen: true,
      error: null,
      inputDraft: '',
    });
  },

  hydrate: async () => {
    set({ connectionStatus: 'checking', error: null });

    const persisted = await loadPersisted();
    let threads = Array.isArray(persisted.threads) ? (persisted.threads as Thread[]) : [];
    let activeThreadId = persisted.activeThreadId;

    if (threads.length === 0) {
      const thread = createEmptyThread();
      threads = [thread];
      activeThreadId = thread.id;
    } else if (!activeThreadId || !threads.some((t) => t.id === activeThreadId)) {
      activeThreadId = threads[0]?.id ?? null;
    }

    set({
      threads,
      activeThreadId,
      selectedModel: persisted.selectedModel,
      sidebarOpen: persisted.sidebarOpen ?? true,
    });

    await get().refreshModels();
  },

  refreshModels: async () => {
    try {
      const models = await ollamaClient.listModels();
      const mapped: OllamaModel[] = models.map((m) => ({
        name: m.name,
        modified_at: m.modified_at,
        size: m.size,
      }));

      const current = get().selectedModel;
      const nextModel =
        current && mapped.some((m) => m.name === current)
          ? current
          : (mapped[0]?.name ?? null);

      set({
        models: mapped,
        selectedModel: nextModel,
        connectionStatus: 'connected',
        error: null,
      });
      schedulePersist(get);
    } catch (err) {
      const message =
        err instanceof Error && err.message.includes('timed out')
          ? err.message
          : 'Ollama is not reachable on localhost:11434';
      set({
        models: [],
        connectionStatus: 'offline',
        error: message,
      });
    }
  },

  createThread: () => {
    const thread = createEmptyThread();
    set((state) => ({
      threads: [thread, ...state.threads],
      activeThreadId: thread.id,
      inputDraft: '',
      error: null,
    }));
    schedulePersist(get);
  },

  selectThread: (id) => {
    if (get().isStreaming) get().stopGeneration();
    set({ activeThreadId: id, inputDraft: '', error: null });
    schedulePersist(get);
  },

  deleteThread: (id) => {
    if (get().isStreaming && get().activeThreadId === id) {
      get().stopGeneration();
    }

    set((state) => {
      const remaining = state.threads.filter((t) => t.id !== id);
      const threads = remaining.length > 0 ? remaining : [createEmptyThread()];
      const activeThreadId =
        state.activeThreadId === id ? threads[0].id : state.activeThreadId;
      return { threads, activeThreadId };
    });
    schedulePersist(get);
  },

  setModel: (model) => {
    set({ selectedModel: model });
    schedulePersist(get);
  },

  setSidebarOpen: (open) => {
    set({ sidebarOpen: open });
    schedulePersist(get);
  },

  setInputDraft: (value) => set({ inputDraft: value }),

  clearError: () => set({ error: null }),

  stopGeneration: () => {
    abortController?.abort();
    abortController = null;
    set({ isStreaming: false });
  },

  sendMessage: async (content) => {
    const prompt = (content ?? get().inputDraft).trim();
    const { selectedModel, activeThreadId, isStreaming, connectionStatus } = get();

    if (!prompt || !selectedModel || !activeThreadId || isStreaming) return;
    if (connectionStatus !== 'connected') {
      set({ error: 'Connect to Ollama before sending a message.' });
      return;
    }

    const userMessage: Message = {
      id: createId(),
      role: 'user',
      content: prompt,
      createdAt: Date.now(),
    };

    const assistantMessage: Message = {
      id: createId(),
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
    };

    set((state) => ({
      inputDraft: '',
      error: null,
      isStreaming: true,
      threads: state.threads.map((thread) => {
        if (thread.id !== activeThreadId) return thread;
        const isFirst = thread.messages.length === 0;
        return {
          ...thread,
          title: isFirst ? titleFromPrompt(prompt) : thread.title,
          messages: [...thread.messages, userMessage, assistantMessage],
          updatedAt: Date.now(),
        };
      }),
    }));

    abortController = new AbortController();
    const history =
      get()
        .threads.find((t) => t.id === activeThreadId)
        ?.messages.filter((m) => m.id !== assistantMessage.id)
        .map((m) => ({ role: m.role, content: m.content })) ?? [];

    try {
      await ollamaClient.chatStream({
        model: selectedModel,
        messages: history,
        signal: abortController.signal,
        onChunk: (delta) => {
          set((state) => ({
            threads: state.threads.map((thread) => {
              if (thread.id !== activeThreadId) return thread;
              return {
                ...thread,
                updatedAt: Date.now(),
                messages: thread.messages.map((msg) =>
                  msg.id === assistantMessage.id
                    ? { ...msg, content: msg.content + delta }
                    : msg,
                ),
              };
            }),
          }));
        },
      });
    } catch (err) {
      if (isAbortError(err)) {
        // User stopped generation — keep partial assistant text.
      } else {
        const message = err instanceof Error ? err.message : 'Failed to stream response';
        const isConnectionLost =
          err instanceof OllamaConnectionLostError || /fetch|network|connection/i.test(message);
        const marker = '[Connection Lost]';
        set((state) => ({
          error: message,
          connectionStatus: isConnectionLost ? 'offline' : state.connectionStatus,
          threads: state.threads.map((thread) => {
            if (thread.id !== activeThreadId) return thread;
            return {
              ...thread,
              messages: thread.messages.map((msg) => {
                if (msg.id !== assistantMessage.id) return msg;
                if (msg.content.includes(marker)) return msg;
                if (!msg.content) {
                  return { ...msg, content: isConnectionLost ? marker : `⚠️ ${message}` };
                }
                if (isConnectionLost) {
                  return { ...msg, content: `${msg.content}\n\n${marker}` };
                }
                return msg;
              }),
            };
          }),
        }));
      }
    } finally {
      abortController = null;
      set({ isStreaming: false });
      schedulePersist(get);
    }
  },
}));

/** Selector helper for the active thread. */
export function selectActiveThread(state: ChatState): Thread | null {
  return state.threads.find((t) => t.id === state.activeThreadId) ?? null;
}
