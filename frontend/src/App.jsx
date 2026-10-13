import { Menu, PanelRightClose, Search, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { deleteDocument, deleteSession, getSession, listDocuments, listSessions, streamQuery, uploadDocument } from './api/client.js';
import ChatArea from './components/ChatArea.jsx';
import DocumentSidebar from './components/DocumentSidebar.jsx';
import HistorySidebar from './components/HistorySidebar.jsx';
import InputBox from './components/InputBox.jsx';
import SourceDrawer from './components/SourceDrawer.jsx';

const readLocal = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function App() {
  const [documents, setDocuments] = useState(() => readLocal('doculens-documents', []));
  const [sessions, setSessions] = useState(() => readLocal('doculens-sessions', []));
  const [messages, setMessages] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [activeDocumentId, setActiveDocumentId] = useState(null);
  const [question, setQuestion] = useState('');
  const [sources, setSources] = useState([]);
  const [selectedSource, setSelectedSource] = useState(null);
  const [selectedSourceNumber, setSelectedSourceNumber] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const [abortController, setAbortController] = useState(null);
  const [documentsOpen, setDocumentsOpen] = useState(false);

  useEffect(() => { listDocuments().then(setDocuments).catch(() => {}); listSessions().then(setSessions).catch(() => {}); }, []);
  useEffect(() => { localStorage.setItem('doculens-documents', JSON.stringify(documents)); }, [documents]);
  useEffect(() => { localStorage.setItem('doculens-sessions', JSON.stringify(sessions)); }, [sessions]);
  const activeDocument = useMemo(() => documents.find((doc) => (doc.documentId || doc._id) === activeDocumentId), [documents, activeDocumentId]);

  const handleUpload = async (file) => { setError(''); setUploadProgress(0); try { const document = await uploadDocument(file, setUploadProgress); setDocuments((items) => [document, ...items]); setActiveDocumentId(document.documentId); setDocumentsOpen(false); } catch (err) { setError(err.message); } finally { setTimeout(() => setUploadProgress(null), 700); } };
  const handleDeleteDocument = async (doc) => { const id = doc.documentId || doc._id; try { await deleteDocument(id); } catch { /* backend delete route is optional in the current phase */ } setDocuments((items) => items.filter((item) => (item.documentId || item._id) !== id)); if (activeDocumentId === id) setActiveDocumentId(null); };
  const newChat = () => { setMessages([]); setSources([]); setActiveSessionId(null); setError(''); };
  const selectSession = async (id) => { try { const session = await getSession(id); setActiveSessionId(id); setMessages(session.messages || []); } catch { const session = sessions.find((item) => (item.id || item._id) === id); if (session) { setActiveSessionId(id); setMessages(session.messages || []); } } };
  const removeSession = async (session) => { const id = session.id || session._id; try { await deleteSession(id); } catch { /* local history remains usable without the optional API */ } setSessions((items) => items.filter((item) => (item.id || item._id) !== id)); if (activeSessionId === id) newChat(); };
  const ask = async () => {
    if (!question.trim() || isStreaming) return;
    const prompt = question.trim(); setQuestion(''); setError(''); setIsStreaming(true); setSources([]);
    const controller = new AbortController(); setAbortController(controller);
    const userMessage = { id: newId(), role: 'user', content: prompt };
    const assistantId = newId();
    setMessages((items) => [...items, userMessage, { id: assistantId, role: 'assistant', content: '', sources: [], streaming: true }]);
    let currentSources = [];
    try {
      await streamQuery({ question: prompt, documentId: activeDocumentId, signal: controller.signal, onEvent: (event) => {
        if (event.type === 'sources') { currentSources = event.sources || []; setSources(currentSources); setMessages((items) => items.map((item) => item.id === assistantId ? { ...item, sources: currentSources } : item)); }
        if (event.type === 'token') setMessages((items) => items.map((item) => item.id === assistantId ? { ...item, content: item.content + event.content } : item));
        if (event.type === 'error') throw new Error(event.message);
        if (event.type === 'done') setMessages((items) => items.map((item) => item.id === assistantId ? { ...item, streaming: false } : item));
      }});
      setMessages((items) => items.map((item) => item.id === assistantId ? { ...item, streaming: false } : item));
      const session = { id: activeSessionId || newId(), title: prompt.slice(0, 48), updatedAt: new Date().toISOString(), messages: [] };
      setMessages((items) => { session.messages = items; return items; }); setActiveSessionId(session.id); setSessions((items) => [session, ...items.filter((item) => (item.id || item._id) !== session.id)]);
    } catch (err) { if (err.name !== 'AbortError') { setError(err.message); setMessages((items) => items.map((item) => item.id === assistantId ? { ...item, content: item.content || 'Unable to complete this request.', streaming: false } : item)); } } finally { setIsStreaming(false); setAbortController(null); }
  };
  const sourceDocumentId = selectedSource?.documentId?.toString();
  const documentFileUrl = sourceDocumentId ? `/api/documents/${encodeURIComponent(sourceDocumentId)}/file#page=${selectedSource.page || 1}` : null;
  return <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#111215] text-[#f2f2f5] md:flex-row"><DocumentSidebar documents={documents} activeDocumentId={activeDocumentId} onSelect={(id) => { setActiveDocumentId(id); setDocumentsOpen(false); }} onUpload={handleUpload} onDelete={handleDeleteDocument} uploadProgress={uploadProgress} mobileOpen={documentsOpen} onClose={() => setDocumentsOpen(false)} /><div className="flex min-h-0 min-w-0 flex-1 flex-col"><header className="flex shrink-0 items-center justify-between border-b border-[#2a2c34] bg-[#17181c] px-4 py-3 sm:px-8"><div className="flex items-center gap-3"><button type="button" onClick={() => setDocumentsOpen(true)} className="rounded-lg p-1 text-[#989aa4] hover:bg-[#23252c] md:hidden" aria-label="Open documents"><Menu size={18} /></button><div><p className="text-sm font-semibold text-[#f2f2f5]">Knowledge console</p><p className="text-xs text-[#989aa4]">Grounded document intelligence</p></div></div><div className="hidden items-center gap-2 text-xs text-[#989aa4] sm:flex"><Sparkles size={14} className="text-[#e08282]" /> Gemini streaming enabled</div></header>{error && <div className="mx-3 mt-3 flex max-h-24 shrink-0 items-start justify-between gap-3 overflow-auto rounded-xl border border-[#542f38] bg-[#271d22] px-4 py-3 text-sm text-[#f2bcc4] sm:mx-auto sm:mt-4 sm:w-[calc(100%-2rem)] sm:max-w-4xl"><span>{error}</span><button onClick={() => setError('')}><PanelRightClose size={16} /></button></div>}<ChatArea messages={messages} sources={sources} onCitation={(source) => { setSelectedSource(source); setSelectedSourceNumber(sources.indexOf(source) + 1); }} isStreaming={isStreaming} /><div className="mx-auto w-full max-w-4xl shrink-0 px-3 pb-3 sm:px-8 sm:pb-4"><InputBox value={question} onChange={setQuestion} onSubmit={ask} onCancel={() => abortController?.abort()} disabled={isStreaming} scopeName={activeDocument?.filename} /></div></div><HistorySidebar sessions={sessions} activeSessionId={activeSessionId} onNew={newChat} onSelect={selectSession} onDelete={removeSession} /><SourceDrawer source={selectedSource} number={selectedSourceNumber} documentFileUrl={documentFileUrl} onClose={() => setSelectedSource(null)} /></div>;
}
