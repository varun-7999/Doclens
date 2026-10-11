import { ExternalLink, FileText, X } from 'lucide-react';

export default function SourceDrawer({ source, number, onClose, documentFileUrl }) {
  if (!source) return null;
  return (
    <aside className="fixed inset-y-0 right-0 z-30 w-full max-w-md border-l border-[#2a2c34] bg-[#17181c] p-6 shadow-2xl shadow-black/40 transition-transform">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#f2bcc4]"><FileText size={14} /> Source {number}</div>
          <h2 className="break-all text-lg font-semibold text-[#f2f2f5]">{source.filename || 'Document source'}</h2>
        </div>
        <button onClick={onClose} className="rounded-lg p-2 text-[#989aa4] hover:bg-[#23252c] hover:text-[#f2f2f5]" aria-label="Close source drawer"><X size={20} /></button>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl border border-[#2a2c34] bg-[#1c1e23] p-3"><span className="block text-[#989aa4]">Evidence grade</span><strong className={source.evidenceGrade === 'A' ? 'text-[#e8c2c8]' : 'text-[#f2bcc4]'}>{source.evidenceGrade || '—'}</strong></div>
        <div className="rounded-xl border border-[#2a2c34] bg-[#1c1e23] p-3"><span className="block text-[#989aa4]">Confidence</span><strong className="text-[#f2f2f5]">{typeof source.confidence === 'number' ? `${Math.round(source.confidence * 100)}%` : '—'}</strong></div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl border border-[#2a2c34] bg-[#1c1e23] p-3"><span className="block text-[#989aa4]">Page</span><strong className="text-[#f2f2f5]">{source.page ?? '—'}</strong></div>
        <div className="rounded-xl border border-[#2a2c34] bg-[#1c1e23] p-3"><span className="block text-[#989aa4]">Chunk</span><strong className="text-[#f2f2f5]">{source.chunkIndex ?? '—'}</strong></div>
      </div>
      <div className="mt-3 flex items-center justify-between rounded-xl border border-[#2a2c34] bg-[#1c1e23] p-3 text-xs"><span className="text-[#989aa4]">Vector relevance</span><strong className="text-[#b4b7c4]">{typeof source.score === 'number' ? source.score.toFixed(3) : '—'}</strong></div>
      {documentFileUrl && <a href={documentFileUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#271d22] px-3 py-2 text-xs font-medium text-[#f2bcc4] transition-colors hover:bg-[#38222b]"><ExternalLink size={14} className="text-[#e08282]" /> Open PDF at page {source.page || '—'}</a>}
      <div className="mt-6 max-h-[calc(100vh-260px)] overflow-y-auto whitespace-pre-wrap rounded-xl border border-[#2b2d35] bg-[#131417] p-4 text-sm leading-7 text-[#e8c2c8]">{source.content || 'No source text available.'}</div>
    </aside>
  );
}
