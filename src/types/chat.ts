/** A single chat message in a thread. */
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
}

/** A persisted conversation thread. */
export interface Thread {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

/** Subset of Ollama /api/tags model entries we care about. */
export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

export type ConnectionStatus = 'checking' | 'connected' | 'offline';

/** Payload written to disk via Electron IPC. */
export interface PersistedState {
  threads: Thread[];
  activeThreadId: string | null;
  selectedModel: string | null;
  sidebarOpen: boolean;
}
