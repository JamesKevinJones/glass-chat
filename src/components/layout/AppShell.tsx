import type { ReactNode } from 'react';
import { ModelSelector } from '../models/ModelSelector';
import { MobileSidebarToggle, Sidebar } from './Sidebar';

export function TitleBar() {
  return (
    <header className="drag-region flex items-center justify-between gap-3 px-1 py-1">
      <MobileSidebarToggle />
      <div className="hidden text-sm font-medium tracking-tight text-[var(--text-muted)] md:block">
        Aura
      </div>
      <ModelSelector />
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-layer flex h-full gap-3 p-3 md:p-4">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col gap-3">{children}</div>
    </div>
  );
}
