import { FileText, Send, Square } from 'lucide-react';
import { useEffect, useRef } from 'react';

export default function InputBox({ value, onChange, onSubmit, onCancel, disabled, scopeName }) {
  const ref = useRef(null);
  useEffect(() => { const el = ref.current; if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 160)}px`; } }, [value]);
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); if (!disabled) onSubmit(); }
  };
  return (
    <div className="rounded-2xl border border-[#2a2c34] bg-[#17181c] p-3 shadow-glow">
      <textarea id="document-question" name="question" ref={ref} value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={handleKeyDown} rows={1} disabled={disabled && !onCancel} placeholder="Ask a question about your documents..." className="max-h-40 min-h-[28px] w-full resize-none bg-transparent px-2 py-1 text-sm leading-6 text-[#f2f2f5] outline-none placeholder:text-[#989aa4] disabled:opacity-60" />
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-[#989aa4]"><FileText size={14} className="text-[#e08282]" /> {scopeName || 'All documents'} <span className="hidden sm:inline">· Enter to send · Shift+Enter for newline</span></div>
        <button type="button" onClick={disabled ? onCancel : onSubmit} disabled={!disabled && !value.trim()} className="rounded-xl bg-[#e08282] p-2.5 text-[#111215] transition-colors hover:bg-[#d57373] disabled:cursor-not-allowed disabled:opacity-40" aria-label={disabled ? 'Stop generating' : 'Send question'}>{disabled ? <Square size={16} /> : <Send size={16} />}</button>
      </div>
    </div>
  );
}
