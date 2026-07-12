import type {
  ChatStreamOptions,
  OllamaChatStreamChunk,
  OllamaTagModel,
  OllamaTagsResponse,
} from './types';

const DEFAULT_BASE_URL = 'http://localhost:11434';
const DEFAULT_LIST_TIMEOUT_MS = 5000;

/** Raised when an in-flight Ollama stream ends unexpectedly. */
export class OllamaConnectionLostError extends Error {
  readonly code = 'CONNECTION_LOST' as const;

  constructor(message = 'Connection to Ollama was lost') {
    super(message);
    this.name = 'OllamaConnectionLostError';
  }
}

export function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === 'AbortError') ||
    (err instanceof Error && err.name === 'AbortError')
  );
}

/**
 * Parse an NDJSON buffer fragment into complete JSON objects.
 * Returns leftover incomplete line text for the next read.
 */
export function parseNdjsonLines(
  buffer: string,
  onObject: (obj: OllamaChatStreamChunk) => void,
): string {
  const parts = buffer.split('\n');
  const incomplete = parts.pop() ?? '';

  for (const line of parts) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      onObject(JSON.parse(trimmed) as OllamaChatStreamChunk);
    } catch {
      // Skip malformed lines rather than aborting the whole stream.
    }
  }

  return incomplete;
}

function mergeAbortSignals(signals: Array<AbortSignal | undefined>): AbortSignal {
  const list = signals.filter((signal): signal is AbortSignal => Boolean(signal));
  if (list.length === 0) return new AbortController().signal;
  if (list.length === 1) return list[0];

  const anyFactory = (AbortSignal as typeof AbortSignal & {
    any?: (signals: AbortSignal[]) => AbortSignal;
  }).any;
  if (typeof anyFactory === 'function') {
    return anyFactory(list);
  }

  const controller = new AbortController();
  const onAbort = () => controller.abort();
  for (const signal of list) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener('abort', onAbort, { once: true });
  }
  return controller.signal;
}

export class OllamaClient {
  constructor(private readonly baseUrl: string = DEFAULT_BASE_URL) {}

  /** Fetch installed models from GET /api/tags with a hard timeout. */
  async listModels(
    signal?: AbortSignal,
    timeoutMs: number = DEFAULT_LIST_TIMEOUT_MS,
  ): Promise<OllamaTagModel[]> {
    const timeoutController = new AbortController();
    const timer = setTimeout(() => timeoutController.abort(), timeoutMs);
    const merged = mergeAbortSignals([signal, timeoutController.signal]);

    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: merged });
      if (!res.ok) {
        throw new Error(`Failed to list models (${res.status})`);
      }
      const data = (await res.json()) as OllamaTagsResponse;
      return data.models ?? [];
    } catch (err) {
      if (isAbortError(err)) {
        if (signal?.aborted) throw err;
        throw new Error(`Ollama connection timed out after ${timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Stream a chat completion from POST /api/chat.
   * Invokes onChunk with each content delta until done or aborted.
   */
  async chatStream(options: ChatStreamOptions): Promise<void> {
    const { model, messages, signal, onChunk } = options;

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, stream: true }),
        signal,
      });
    } catch (err) {
      if (isAbortError(err)) throw err;
      throw new OllamaConnectionLostError(
        err instanceof Error ? err.message : 'Failed to reach Ollama',
      );
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(body || `Chat request failed (${res.status})`);
    }

    if (!res.body) {
      throw new Error('Ollama returned an empty response body');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        buffer = parseNdjsonLines(buffer, (chunk) => {
          if (chunk.error) {
            throw new Error(chunk.error);
          }
          const delta = chunk.message?.content;
          if (delta) onChunk(delta);
        });
      }

      if (buffer.trim()) {
        parseNdjsonLines(`${buffer}\n`, (chunk) => {
          if (chunk.error) throw new Error(chunk.error);
          const delta = chunk.message?.content;
          if (delta) onChunk(delta);
        });
      }
    } catch (err) {
      if (isAbortError(err)) throw err;
      if (err instanceof OllamaConnectionLostError) throw err;
      throw new OllamaConnectionLostError(
        err instanceof Error ? err.message : 'Ollama stream interrupted',
      );
    } finally {
      try {
        reader.releaseLock();
      } catch {
        // Reader may already be released after abort.
      }
    }
  }
}

export const ollamaClient = new OllamaClient();
