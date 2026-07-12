import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { GlassPanel } from './ui/GlassPanel';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * Catches render/lifecycle failures and shows a recoverable glass fallback
 * instead of a blank white screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || 'An unexpected render error occurred.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[Aura] ErrorBoundary:', error, info);
  }

  private reload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <>
        <div className="mesh-bg" aria-hidden />
        <div className="app-layer flex h-full items-center justify-center p-6">
          <GlassPanel strong className="w-full max-w-md p-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-3xl border border-rose-300/30 bg-rose-400/15 text-[var(--danger)]">
              <AlertTriangle size={26} />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
              Something went wrong
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
              Aura hit an unexpected UI error. Your chats are saved locally — reload to continue.
            </p>
            {this.state.message && (
              <p className="mt-3 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-[var(--text-muted)]">
                {this.state.message}
              </p>
            )}
            <button
              type="button"
              onClick={this.reload}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-[var(--accent-soft)] px-5 py-2.5 text-sm font-semibold text-[var(--accent)] transition hover:scale-[1.02] hover:bg-teal-400/25 active:scale-95"
            >
              <RotateCcw size={16} />
              Reload App
            </button>
          </GlassPanel>
        </div>
      </>
    );
  }
}
