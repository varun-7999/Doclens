import { Bot, User } from 'lucide-react';
import CitationBadge from './CitationBadge.jsx';

function renderContent(text, sources, onCitation) {
  return text.split(/(\[Source\s+\d+\])/g).map((part, i) => { const match = part.match(/^\[Source\s+(\d+)\]$/); return match ? <CitationBadge key={i} number={match[1]} source={sources[Number(match[1]) - 1]} onClick={onCitation} /> : <span key={i}>{part}</span>; });
}
function Bubble({ message, sources, onCitation }) {
  const assistant = message.role === 'assistant';
  return <div className={`flex gap-3 ${assistant ? '' : 'flex-row-reverse'}`}><div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${assistant ? 'bg-[#241e22] text-[#f2bcc4]' : 'bg-[#23252c] text-[#b4b7c4]'}`}>{assistant ? <Bot size={16} /> : <User size={16} />}</div><div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-7 ${assistant ? 'border border-[#2a2c34] bg-[#17181c] text-[#f2f2f5]' : 'bg-[#e08282] text-[#111215]'}`}><div className="whitespace-pre-wrap">{renderContent(message.content, sources, onCitation)}</div>{message.streaming && <span className="pulse-dot ml-1 inline-block h-2 w-2 rounded-full bg-[#e08282]" />}</div></div>;
}
export default function ChatArea({ messages, sources, onCitation, isStreaming }) {
  return <main className="flex min-h-0 flex-1 flex-col overflow-y-auto"><div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 sm:px-8">{messages.length === 0 && <div className="m-auto max-w-lg text-center"><div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#241e22] text-[#f2bcc4] shadow-glow"><Bot size={30} /></div><h2 className="text-2xl font-semibold text-[#f2f2f5]">Ask your documents anything</h2><p className="mt-3 text-sm leading-6 text-[#989aa4]">Upload a PDF, choose its scope, and get grounded answers with inspectable source citations.</p></div>}{messages.map((message, index) => <Bubble key={message.id || index} message={message} sources={message.sources || sources} onCitation={onCitation} />)}{isStreaming && messages[messages.length - 1]?.content === '' && <div className="text-xs text-[#989aa4]">Searching your documents<span className="pulse-dot">...</span></div>}</div></main>;
}
