import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { useEffect, useRef } from 'react';
import type { Message } from '../../types/chat';
import { useStickyAutoScroll } from '../../hooks/useAutoScroll';
import { selectActiveThread, useChatStore } from '../../store/useChatStore';
import { GlassPanel } from '../ui/GlassPanel';

function MessageBubble({ message, streaming }: { message: Message; streaming?: boolean }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] rounded-3xl border px-4 py-3 shadow-lg ${
          isUser
            ? 'border-teal-300/25 bg-teal-400/15 text-[var(--text)]'
            : 'border-white/15 bg-white/8 text-[var(--text)]'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed">{message.content}</p>
        ) : (
          <div className="prose-aura">
            {message.content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                {message.content}
              </ReactMarkdown>
            ) : streaming ? (
              <span className="inline-flex gap-1 py-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)] [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)] [animation-delay:240ms]" />
              </span>
            ) : null}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function MessageList() {
  const thread = useChatStore(selectActiveThread);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const messages = thread?.messages ?? [];
  const { containerRef, endRef, onScroll, pinToBottom } = useStickyAutoScroll([
    messages,
    messages.at(-1)?.content,
    isStreaming,
  ]);
  const prevCountRef = useRef(messages.length);

  useEffect(() => {
    // New messages (e.g. user just sent) should re-pin to the bottom.
    if (messages.length > prevCountRef.current) {
      pinToBottom();
    }
    prevCountRef.current = messages.length;
  }, [messages.length, pinToBottom]);

  return (
    <GlassPanel className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        ref={containerRef}
        onScroll={onScroll}
        className="aura-scroll flex-1 space-y-4 overflow-y-auto px-5 py-5"
        role="log"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
            <p className="text-2xl font-semibold tracking-tight text-[var(--text)]">
              What&apos;s on your mind?
            </p>
            <p className="mt-2 max-w-sm text-sm text-[var(--text-muted)]">
              Ask Aura anything. Responses stream from your local Ollama models.
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              streaming={
                isStreaming && index === messages.length - 1 && message.role === 'assistant'
              }
            />
          ))
        )}
        <div ref={endRef} />
      </div>
    </GlassPanel>
  );
}
