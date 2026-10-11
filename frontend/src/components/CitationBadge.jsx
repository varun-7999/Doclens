import { ExternalLink } from 'lucide-react';

export default function CitationBadge({ number, source, onClick }) {
  return (
    <button type="button" onClick={() => onClick(source)} className="mx-1 inline-flex items-center gap-1 rounded-md border border-[#542f38] bg-[#271d22] px-1.5 py-0.5 align-baseline text-xs font-semibold text-[#f4a7b3] transition-colors hover:bg-[#38222b]">
      [{number}] <ExternalLink size={11} className="text-[#e08282]" />
    </button>
  );
}
