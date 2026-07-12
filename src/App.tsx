import { useEffect } from 'react';
import { AuthScreen } from './components/auth/AuthScreen';
import { AppShell, TitleBar } from './components/layout/AppShell';
import { Composer } from './components/chat/Composer';
import { MessageList } from './components/chat/MessageList';
import { ConnectionErrorScreen } from './components/connection/ConnectionErrorScreen';
import { EmptyModelsScreen } from './components/connection/EmptyModelsScreen';
import { useOllamaConnection } from './hooks/useOllamaConnection';
import { useAuthStore } from './store/useAuthStore';
import { useChatStore } from './store/useChatStore';

function AuthenticatedApp() {
  useOllamaConnection();
  const connectionStatus = useChatStore((s) => s.connectionStatus);
  const models = useChatStore((s) => s.models);

  return (
    <>
      <div className="mesh-bg" aria-hidden />
      <AppShell>
        <TitleBar />
        {connectionStatus === 'offline' ? (
          <ConnectionErrorScreen />
        ) : connectionStatus === 'connected' && models.length === 0 ? (
          <EmptyModelsScreen />
        ) : (
          <>
            <MessageList />
            <Composer />
          </>
        )}
      </AppShell>
    </>
  );
}

export default function App() {
  const status = useAuthStore((s) => s.status);
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  if (status === 'checking') {
    return (
      <>
        <div className="mesh-bg" aria-hidden />
        <div className="app-layer flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
          Loading Aura…
        </div>
      </>
    );
  }

  if (status !== 'authenticated') {
    return <AuthScreen />;
  }

  return <AuthenticatedApp />;
}
