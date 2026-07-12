import { useCallback, useEffect, useRef, type RefObject, type UIEventHandler } from 'react';

interface StickyAutoScroll {
  containerRef: RefObject<HTMLDivElement | null>;
  endRef: RefObject<HTMLDivElement | null>;
  onScroll: UIEventHandler<HTMLDivElement>;
  pinToBottom: () => void;
}

/**
 * Auto-scrolls to the latest message while the user remains near the bottom.
 * Scrolling up pauses pinning until they return to the bottom (or pinToBottom).
 */
export function useStickyAutoScroll(
  deps: unknown[],
  options?: { nearBottomPx?: number },
): StickyAutoScroll {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const nearBottomPx = options?.nearBottomPx ?? 96;

  const pinToBottom = useCallback(() => {
    stickToBottomRef.current = true;
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

  const onScroll: UIEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      const el = event.currentTarget;
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      stickToBottomRef.current = distance <= nearBottomPx;
    },
    [nearBottomPx],
  );

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    // Intentionally re-run when caller-provided deps change.
  }, deps);

  return { containerRef, endRef, onScroll, pinToBottom };
}

/** @deprecated Prefer useStickyAutoScroll — kept for simple callers/tests. */
export function useAutoScroll(deps: unknown[]): RefObject<HTMLDivElement | null> {
  const { endRef } = useStickyAutoScroll(deps);
  return endRef;
}
