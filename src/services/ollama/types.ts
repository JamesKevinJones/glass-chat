/** Raw Ollama /api/tags response model entry. */
export interface OllamaTagModel {
  name: string;
  modified_at: string;
  size: number;
  digest?: string;
  details?: Record<string, unknown>;
}

export interface OllamaTagsResponse {
  models: OllamaTagModel[];
}

/** Single NDJSON chunk from POST /api/chat with stream: true. */
export interface OllamaChatStreamChunk {
  model?: string;
  created_at?: string;
  message?: {
    role?: string;
    content?: string;
  };
  done?: boolean;
  error?: string;
}

export interface ChatMessagePayload {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatStreamOptions {
  model: string;
  messages: ChatMessagePayload[];
  signal?: AbortSignal;
  onChunk: (delta: string) => void;
}
