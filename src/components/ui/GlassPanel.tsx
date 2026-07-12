import clsx from 'clsx';
import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

interface GlassPanelProps extends PropsWithChildren {
  className?: string;
  strong?: boolean;
}

export function GlassPanel({ children, className, strong }: GlassPanelProps) {
  return (
    <div className={clsx(strong ? 'glass-strong' : 'glass', 'rounded-3xl', className)}>
      {children}
    </div>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

export function IconButton({ label, className, children, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={clsx(
        'no-drag inline-flex h-9 w-9 items-center justify-center rounded-2xl',
        'border border-white/15 bg-white/5 text-[var(--text)]',
        'transition-transform duration-200 hover:scale-105 hover:bg-white/10',
        'active:scale-95 disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
