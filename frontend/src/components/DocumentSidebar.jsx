import { FileText, MoreVertical, Plus, UploadCloud, X } from 'lucide-react';
import { useRef, useState } from 'react';

export default function DocumentSidebar({ documents, activeDocumentId, onSelect, onUpload, onDelete, uploadProgress }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const receiveFile = (file) => { if (file?.type !== 'application/pdf') return; onUpload(file); };
  return (
    <aside className="flex w-full flex-col border-b border-[#2a2c34] bg-[#17181c] p-4 md:w-72 md:border-b-0 md:border-r">
      <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b4b7c4]">Workspace</p><h1 className="mt-1 text-lg font-bold text-[#f2f2f5]">DocuLens <span className="text-[#f2bcc4]">AI</span></h1></div><div className="rounded-lg bg-[#e08282]/10 px-2 py-1 text-[10px] font-semibold text-[#b4b7c4]">ONLINE</div></div>
      <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); receiveFile(e.dataTransfer.files[0]); }} className={`rounded-2xl border border-dashed p-4 text-center transition ${dragging ? 'border-[#e08282] bg-[#241e22]' : 'border-[#2a2c34] bg-[#1c1e23]'}`}>
        <UploadCloud className="mx-auto mb-2 text-[#e08282]" size={24} /><p className="text-xs text-[#989aa4]">Drop a PDF here</p><button type="button" onClick={() => inputRef.current?.click()} className="mt-3 inline-flex items-center gap-1 rounded-lg bg-[#e08282] px-3 py-2 text-xs font-semibold text-[#111215] transition-colors hover:bg-[#d57373]"><Plus size={14} /> Choose file</button><input ref={inputRef} type="file" accept="application/pdf" hidden onChange={(e) => receiveFile(e.target.files[0])} />
        {uploadProgress !== null && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#2a2c34]"><div className="h-full bg-[#e08282] transition-all" style={{ width: `${uploadProgress}%` }} /></div>}
      </div>
      <div className="mt-6 flex items-center justify-between"><h2 className="text-xs font-semibold uppercase tracking-widest text-[#989aa4]">Documents</h2><span className="rounded-full bg-[#23252c] px-2 py-0.5 text-[11px] text-[#b4b7c4]">{documents.length}</span></div>
      <button type="button" onClick={() => onSelect(null)} className={`mt-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${!activeDocumentId ? 'border-l-2 border-[#e08282] bg-[#241e22] text-[#f2bcc4]' : 'text-[#989aa4] hover:bg-[#23252c]'}`}><FileText size={16} /> All documents</button>
      <div className="mt-2 space-y-1 overflow-y-auto">{documents.map((doc) => <div key={doc.documentId || doc._id} className={`group flex items-center gap-2 rounded-xl px-3 py-2.5 ${activeDocumentId === (doc.documentId || doc._id) ? 'border-l-2 border-[#e08282] bg-[#241e22]' : 'hover:bg-[#23252c]'}`}><button type="button" onClick={() => onSelect(doc.documentId || doc._id)} className="min-w-0 flex-1 text-left"><p className="truncate text-sm text-[#f2f2f5]">{doc.filename}</p><p className="text-[11px] text-[#989aa4]">{doc.chunkCount || 0} chunks</p></button><button type="button" onClick={() => onDelete(doc)} className="invisible rounded p-1 text-[#989aa4] hover:text-[#f2bcc4] group-hover:visible" aria-label={`Delete ${doc.filename}`}><X size={14} /></button></div>)}</div>
      <div className="mt-auto hidden rounded-xl border border-[#2a2c34] bg-[#1c1e23] p-3 text-xs text-[#989aa4] md:block"><div className="mb-2 flex items-center justify-between"><span>Vector telemetry</span><MoreVertical size={14} /></div><div className="flex justify-between"><span>Embedding index</span><span className="text-[#b4b7c4]">Ready</span></div><div className="mt-1 flex justify-between"><span>Dimensions</span><span className="text-[#b4b7c4]">768</span></div></div>
    </aside>
  );
}
