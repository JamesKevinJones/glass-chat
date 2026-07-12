import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatStore } from './useChatStore';
import type { Message } from '../types/chat';

const listModels = vi.fn();
const chatStream = vi.fn();

vi.mock('../services/ollama/client', () => ({
  ollamaClient: {
    listModels: (...args: unknown[]) => listModels(...args),
    chatStream: (...args: unknown[]) => chatStream(...args),
  },
  isAbortError: (err: unknown) =>
    (err instanceof DOMException && err.name === 'AbortError') ||
    (err instanceof Error && err.name === 'AbortError'),
  OllamaConnectionLostError: class OllamaConnectionLostError extends Error {
    readonly code = 'CONNECTION_LOST' as const;
    constructor(message?: string) {
      super(message);
      this.name = 'OllamaConnectionLostError';
    }
  },
}));

describe('useChatStore', () => {
  beforeEach(() => {
    listModels.mockReset();
    chatStream.mockReset();
    useChatStore.setState({
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
  });

  it('hydrates with a default thread and connected models', async () => {
    listModels.mockResolvedValue([{ name: 'qwen2.5:3b', modified_at: '', size: 1 }]);

    const { result } = renderHook(() => useChatStore());

    await act(async () => {
      await result.current.hydrate();
    });

    await waitFor(() => {
      expect(result.current.connectionStatus).toBe('connected');
    });

    expect(result.current.threads.length).toBe(1);
    expect(result.current.selectedModel).toBe('qwen2.5:3b');
  });

  it('marks connection offline when Ollama is unreachable', async () => {
    listModels.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useChatStore());

    await act(async () => {
      await result.current.hydrate();
    });

    expect(result.current.connectionStatus).toBe('offline');
  });

  it('streams assistant tokens and supports stop', async () => {
    listModels.mockResolvedValue([{ name: 'qwen2.5:3b', modified_at: '', size: 1 }]);

    chatStream.mockImplementation(
      async ({
        onChunk,
        signal,
      }: {
        onChunk: (d: string) => void;
        signal?: AbortSignal;
      }) => {
        onChunk('Hello');
        await new Promise<void>((resolve, reject) => {
          const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
          if (signal?.aborted) {
            onAbort();
            return;
          }
          signal?.addEventListener('abort', onAbort);
          setTimeout(() => {
            onChunk(' world');
            resolve();
          }, 50);
        });
      },
    );

    const { result } = renderHook(() => useChatStore());

    await act(async () => {
      await result.current.hydrate();
    });

    act(() => {
      result.current.setInputDraft('Hi');
    });

    let sendPromise!: Promise<void>;
    act(() => {
      sendPromise = result.current.sendMessage();
    });

    await waitFor(() => {
      const content = result.current.threads[0]?.messages.find(
        (m: Message) => m.role === 'assistant',
      )?.content;
      expect(content).toContain('Hello');
    });

    act(() => {
      result.current.stopGeneration();
    });

    await act(async () => {
      await sendPromise;
    });

    expect(result.current.isStreaming).toBe(false);
  });
});
