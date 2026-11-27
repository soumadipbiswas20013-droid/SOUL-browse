import React, { useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown, X } from 'lucide-react';

interface FindBarProps {
  query: string;
  matchCase: boolean;
  matchCount: number;
  activeMatch: number;
  onChangeQuery: (q: string) => void;
  onToggleMatchCase: () => void;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

export const FindBar: React.FC<FindBarProps> = ({
  query,
  matchCase,
  matchCount,
  activeMatch,
  onChangeQuery,
  onToggleMatchCase,
  onNext,
  onPrev,
  onClose,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <div
      role="region"
      aria-label="Find in page"
      className="fixed top-[122px] right-6 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#101525] shadow-lg text-xs text-slate-900 dark:text-[#F5F7FF]"
    >
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => onChangeQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) onPrev();
            else onNext();
          } else if (e.key === 'Escape') {
            onClose();
          }
        }}
        placeholder="Find in page..."
        aria-label="Find in page query"
        className="w-48 bg-transparent outline-none text-slate-900 dark:text-[#F5F7FF] placeholder:text-slate-400 dark:placeholder:text-[#9AA3B5]"
      />

      <span className="tabular-nums text-slate-500 dark:text-[#9AA3B5] px-1 whitespace-nowrap">
        {query ? `${matchCount === 0 ? 0 : activeMatch + 1}/${matchCount}` : '0/0'}
      </span>

      <button
        type="button"
        onClick={onToggleMatchCase}
        className={`px-1.5 py-0.5 rounded font-mono text-[11px] transition-colors ${
          matchCase
            ? 'bg-[#4A8DFF] text-white'
            : 'text-slate-600 dark:text-[#9AA3B5] hover:bg-slate-100 dark:hover:bg-white/10'
        }`}
        aria-pressed={matchCase}
        aria-label="Match case"
        title="Match case"
      >
        Aa
      </button>

      <button
        type="button"
        onClick={onPrev}
        disabled={matchCount === 0}
        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40"
        aria-label="Previous match"
        title="Previous (Shift+Enter)"
      >
        <ChevronUp className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={onNext}
        disabled={matchCount === 0}
        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40"
        aria-label="Next match"
        title="Next (Enter)"
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={onClose}
        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-[#9AA3B5]"
        aria-label="Close find bar"
        title="Close (Esc)"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
