import React from 'react';
import { Minus, Square, Copy, X, Shield } from 'lucide-react';
import { SoulLogo } from './SoulLogo';

interface TitleBarProps {
  pageTitle: string;
  isPrivate: boolean;
  isMaximized: boolean;
  accentColor: string;
  profileName: string;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onCloseWindow: () => void;
  onOpenProfiles: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  pageTitle,
  isPrivate,
  isMaximized,
  accentColor,
  profileName,
  onMinimize,
  onToggleMaximize,
  onCloseWindow,
  onOpenProfiles,
}) => {
  return (
    <header
      className={`h-9 flex items-center justify-between px-3 select-none border-b text-xs transition-colors ${
        isPrivate
          ? 'bg-[#120D24] border-[#885DFF]/30 text-[#F5F7FF]'
          : 'bg-slate-100 dark:bg-[#08090D] border-slate-200 dark:border-white/10 text-slate-800 dark:text-[#F5F7FF]'
      }`}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <SoulLogo size={18} accentColor={accentColor} isPrivate={isPrivate} />
        <span className="font-display font-semibold tracking-tight whitespace-nowrap shrink-0">
          SOUL Browser
        </span>
        <span className="text-slate-400 dark:text-[#9AA3B5]" aria-hidden="true">
          ·
        </span>
        <span className="truncate max-w-[340px] text-slate-600 dark:text-[#9AA3B5]">
          {pageTitle || 'New Tab'}
        </span>
        {isPrivate && (
          <span className="inline-flex items-center gap-1 text-[#C084FC] font-medium whitespace-nowrap shrink-0">
            <Shield className="w-3.5 h-3.5" aria-hidden="true" />
            Private Session
          </span>
        )}
      </div>

      <div
        className="flex items-center gap-1 shrink-0"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          type="button"
          onClick={onOpenProfiles}
          className="px-2 py-1 rounded text-xs text-slate-600 dark:text-[#9AA3B5] hover:bg-slate-200/70 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
          title="Active profile"
          aria-label={`Active profile: ${profileName}`}
        >
          {isPrivate ? 'Private' : profileName}
        </button>

        <button
          type="button"
          onClick={onMinimize}
          className="w-8 h-7 inline-flex items-center justify-center rounded hover:bg-slate-200/80 dark:hover:bg-white/10 text-slate-600 dark:text-[#9AA3B5] hover:text-slate-900 dark:hover:text-white transition-colors"
          aria-label="Minimize window"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onToggleMaximize}
          className="w-8 h-7 inline-flex items-center justify-center rounded hover:bg-slate-200/80 dark:hover:bg-white/10 text-slate-600 dark:text-[#9AA3B5] hover:text-slate-900 dark:hover:text-white transition-colors"
          aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? <Copy className="w-3 h-3" /> : <Square className="w-3 h-3" />}
        </button>

        <button
          type="button"
          onClick={onCloseWindow}
          className="w-8 h-7 inline-flex items-center justify-center rounded hover:bg-red-600 hover:text-white text-slate-600 dark:text-[#9AA3B5] transition-colors"
          aria-label="Close window"
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
