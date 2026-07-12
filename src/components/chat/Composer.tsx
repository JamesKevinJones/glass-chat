import { motion } from 'framer-motion';
import { SendHorizontal, Square } from 'lucide-react';
import { useEffect, useRef, type FormEvent } from 'react';
import { useChatStore } from '../../store/useChatStore';
import { GlassPanel } from '../ui/GlassPanel';

export function Composer() {
  const inputDraft = useChatStore((s) => s.inputDraft);
  const setInputDraft = useChatStore((s) => s.setInputDraft);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const stopGeneration = useChatStore((s) => s.stopGeneration);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const selectedModel = useChatStore((s) => s.selectedModel);
  const connectionStatus = useChatStore((s) => s.connectionStatus);
  const models = useChatStore((s) => s.models);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const inputLocked =
    connectionStatus !== 'connected' || !selectedModel || models.length === 0 || isStreaming;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [inputDraft]);

  const canSend =
    Boolean(inputDraft.trim()) &&
    Boolean(selectedModel) &&
    connectionStatus === 'connected' &&
    models.length > 0 &&
    !isStreaming;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (isStreaming) {
      stopGeneration();
      return;
    }
    void sendMessage();
  };

  return (
    <GlassPanel className="p-3">
      <form onSubmit={onSubmit} className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={inputDraft}
          onChange={(e) => setInputDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (canSend) void sendMessage();
            }
          }}
          rows={1}
          placeholder={
            isStreaming
              ? 'Generating…'
              : selectedModel
                ? 'Message Aura…'
                : 'Select a model first'
          }
          disabled={inputLocked}
          className="max-h-[180px] min-h-[48px] flex-1 resize-none rounded-2xl border border-white/15 bg-black/25 px-4 py-3 text-[0.95rem] leading-relaxed text-[var(--text)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-teal-300/40 focus:bg-black/35 disabled:cursor-not-allowed disabled:opacity-50"
        />

        <motion.button
          type="submit"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={isStreaming ? false : !canSend}
          aria-label={isStreaming ? 'Stop generation' : 'Send message'}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition disabled:cursor-not-allowed disabled:opacity-40 ${
            isStreaming
              ? 'border-rose-300/40 bg-rose-400/20 text-[var(--danger)]'
              : 'border-teal-300/40 bg-[var(--accent)] text-[#042f2e]'
          }`}
        >
          {isStreaming ? <Square size={16} fill="currentColor" /> : <SendHorizontal size={18} />}
        </motion.button>
      </form>
    </GlassPanel>
  );
}
