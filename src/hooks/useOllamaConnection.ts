import { useEffect } from 'react';
import { useChatStore } from '../store/useChatStore';

/** Kick off hydration + optional reconnect polling while offline. */
export function useOllamaConnection(): void {
  const hydrate = useChatStore((s) => s.hydrate);
  const refreshModels = useChatStore((s) => s.refreshModels);
  const connectionStatus = useChatStore((s) => s.connectionStatus);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (connectionStatus !== 'offline') return;
    const id = window.setInterval(() => {
      void refreshModels();
    }, 5000);
    return () => window.clearInterval(id);
  }, [connectionStatus, refreshModels]);
}
