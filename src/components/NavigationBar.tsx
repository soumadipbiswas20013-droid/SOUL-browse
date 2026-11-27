import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  X,
  Home,
  Lock,
  ShieldAlert,
  Star,
  Download,
  Puzzle,
  MoreVertical,
  Search,
  Columns2,
  BookOpen,
  Camera,
  Sparkles,
  PanelRight,
  Copy,
  Shield,
  SlidersHorizontal,
  History,
  Bookmark,
  Settings,
  KeyRound,
  Info,
  Printer,
  Code2,
  Maximize2,
  Cpu,
} from 'lucide-react';
import type {
  BookmarkItem,
  BrowserProfile,
  BrowserTab,
  HistoryEntry,
  SearchEngineId,
} from '../browser/types';
import { SEARCH_ENGINES } from '../browser/engine';

interface NavigationBarProps {
  activeTab: BrowserTab;
  isPrivate: boolean;
  isBookmarked: boolean;
  showHomeButton: boolean;
  searchEngine: SearchEngineId;
  enableSuggestions: boolean;
  bookmarks: BookmarkItem[];
  history: HistoryEntry[];
  activeDownloadsCount: number;
  splitViewEnabled: boolean;
  aiOpen: boolean;
  productivityOpen: boolean;
  profile: BrowserProfile;
  accentColor: string;
  omniboxRef: React.RefObject<HTMLInputElement | null>;
  onNavigate: (rawInput: string) => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onStop: () => void;
  onHome: () => void;
  onToggleBookmark: () => void;
  onToggleSplitView: () => void;
  onToggleReaderMode: () => void;
  onCaptureScreen: () => void;
  onToggleAi: () => void;
  onToggleProductivity: () => void;
  onNewPrivateWindow: () => void;
  onOpenInternal: (url: string) => void;
  onChangeSearchEngine: (engine: SearchEngineId) => void;
  onZoomChange: (delta: number | 'reset') => void;
  onOpenFind: () => void;
  onToggleViewSource: () => void;
  onPrintPage: () => void;
  onSavePage: () => void;
  onToggleFullscreen: () => void;
  onOmniboxContextMenu: (e: React.MouseEvent) => void;
}

interface SuggestionItem {
  label: string;
  sublabel: string;
  value: string;
  kind: 'bookmark' | 'history' | 'search';
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  activeTab,
  isPrivate,
  isBookmarked,
  showHomeButton,
  searchEngine,
  enableSuggestions,
  bookmarks,
  history,
  activeDownloadsCount,
  splitViewEnabled,
  aiOpen,
  productivityOpen,
  profile,
  accentColor,
  omniboxRef,
  onNavigate,
  onBack,
  onForward,
  onReload,
  onStop,
  onHome,
  onToggleBookmark,
  onToggleSplitView,
  onToggleReaderMode,
  onCaptureScreen,
  onToggleAi,
  onToggleProductivity,
  onNewPrivateWindow,
  onOpenInternal,
  onChangeSearchEngine,
  onZoomChange,
  onOpenFind,
  onToggleViewSource,
  onPrintPage,
  onSavePage,
  onToggleFullscreen,
  onOmniboxContextMenu,
}) => {
  const [inputValue, setInputValue] = useState(activeTab.url);
  const [focused, setFocused] = useState(false);
  const [remoteSuggestions, setRemoteSuggestions] = useState<string[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [showMenu, setShowMenu] = useState(false);
  const [showSiteInfo, setShowSiteInfo] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const siteInfoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focused) {
      setInputValue(activeTab.url === 'soul://newtab' ? '' : activeTab.url);
    }
  }, [activeTab.url, activeTab.id, focused]);

  useEffect(() => {
    const closePopovers = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
      if (siteInfoRef.current && !siteInfoRef.current.contains(e.target as Node)) setShowSiteInfo(false);
    };
    window.addEventListener('mousedown', closePopovers);
    return () => window.removeEventListener('mousedown', closePopovers);
  }, []);

  // Only fetch remote search suggestions when user has explicitly enabled them AND is not in private mode
  useEffect(() => {
    if (!focused || !enableSuggestions || isPrivate) {
      setRemoteSuggestions([]);
      return;
    }
    const q = inputValue.trim();
    if (!q || /^https?:\/\//i.test(q) || /^soul:\/\//i.test(q)) {
      setRemoteSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggestions?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { suggestions?: string[] };
        setRemoteSuggestions(data.suggestions || []);
      } catch {
        setRemoteSuggestions([]);
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [inputValue, focused, enableSuggestions, isPrivate]);

  const queryLower = inputValue.trim().toLowerCase();
  const localSuggestions: SuggestionItem[] = React.useMemo(() => {
    if (!focused) return [];
    const list: SuggestionItem[] = [];

    for (const bm of bookmarks) {
      if (!bm.isFolder && bm.url) {
        if (!queryLower || bm.title.toLowerCase().includes(queryLower) || bm.url.toLowerCase().includes(queryLower)) {
          list.push({ label: bm.title, sublabel: bm.url, value: bm.url, kind: 'bookmark' });
        }
      }
      if (list.length >= 4) break;
    }

    for (const h of history) {
      if (!queryLower || h.title.toLowerCase().includes(queryLower) || h.url.toLowerCase().includes(queryLower)) {
        if (!list.some((x) => x.value === h.url)) {
          list.push({ label: h.title, sublabel: h.url, value: h.url, kind: 'history' });
        }
      }
      if (list.length >= 7) break;
    }

    const engineName = (SEARCH_ENGINES[searchEngine] ?? SEARCH_ENGINES.bing).name;
    for (const s of remoteSuggestions) {
      list.push({ label: s, sublabel: `Search with ${engineName}`, value: s, kind: 'search' });
    }

    return list.slice(0, 8);
  }, [focused, queryLower, bookmarks, history, remoteSuggestions, searchEngine]);

  const canGoBack = activeTab.historyIndex > 0;
  const canGoForward = activeTab.historyIndex < activeTab.historyStack.length - 1;
  const isInternal = activeTab.url.startsWith('soul://');
  const isHttps = activeTab.url.startsWith('https://');

  const handleSubmit = (valueToGo: string) => {
    setFocused(false);
    setSelectedIdx(-1);
    onNavigate(valueToGo);
    omniboxRef.current?.blur();
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(activeTab.url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 1500);
    } catch {
      // Clipboard blocked in restricted context
    }
  };

  return (
    <div
      className={`h-11 px-2.5 flex items-center gap-1.5 border-b relative z-30 ${
        isPrivate
          ? 'bg-[#17112B] border-[#885DFF]/25 text-[#F5F7FF]'
          : 'bg-white dark:bg-[#101525] border-slate-200 dark:border-white/10'
      }`}
    >
      {/* Navigation Controls */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={onBack}
          disabled={!canGoBack}
          className={`w-8 h-8 inline-flex items-center justify-center rounded-lg disabled:opacity-30 transition-colors ${
            isPrivate
              ? 'text-[#E9E2FF] hover:bg-white/10'
              : 'text-slate-700 dark:text-[#F5F7FF] hover:bg-slate-100 dark:hover:bg-white/10'
          }`}
          aria-label="Back"
          title="Back (Alt+Left)"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onForward}
          disabled={!canGoForward}
          className={`w-8 h-8 inline-flex items-center justify-center rounded-lg disabled:opacity-30 transition-colors ${
            isPrivate
              ? 'text-[#E9E2FF] hover:bg-white/10'
              : 'text-slate-700 dark:text-[#F5F7FF] hover:bg-slate-100 dark:hover:bg-white/10'
          }`}
          aria-label="Forward"
          title="Forward (Alt+Right)"
        >
          <ArrowRight className="w-4 h-4" />
        </button>

        {activeTab.isLoading ? (
          <button
            type="button"
            onClick={onStop}
            className={`w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors ${
              isPrivate
                ? 'text-[#E9E2FF] hover:bg-white/10'
                : 'text-slate-700 dark:text-[#F5F7FF] hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
            aria-label="Stop loading"
            title="Stop"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onReload}
            className={`w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors ${
              isPrivate
                ? 'text-[#E9E2FF] hover:bg-white/10'
                : 'text-slate-700 dark:text-[#F5F7FF] hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
            aria-label="Reload page"
            title="Reload (Ctrl+R)"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        )}

        {showHomeButton && (
          <button
            type="button"
            onClick={onHome}
            className={`w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors ${
              isPrivate
                ? 'text-[#E9E2FF] hover:bg-white/10'
                : 'text-slate-700 dark:text-[#F5F7FF] hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
            aria-label="Home"
            title="New Tab / Home"
          >
            <Home className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Smart Omnibox */}
      <div className="flex-1 min-w-0 relative" ref={siteInfoRef}>
        <div
          onContextMenu={onOmniboxContextMenu}
          className={`flex items-center h-8 rounded-lg border px-2.5 gap-2 transition-colors ${
            isPrivate
              ? focused
                ? 'bg-[#0C0818] border-[#A855F7] ring-2 ring-[#A855F7]/25'
                : 'bg-[#0C0818]/90 border-[#885DFF]/30 hover:border-[#885DFF]/50'
              : focused
              ? 'bg-white dark:bg-[#08090D] border-[#4A8DFF] ring-2 ring-[#4A8DFF]/25'
              : 'bg-slate-100 dark:bg-[#08090D]/80 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
          }`}
        >
          <button
            type="button"
            onClick={() => setShowSiteInfo((v) => !v)}
            className="shrink-0 p-1 rounded hover:bg-slate-200/70 dark:hover:bg-white/10 text-slate-500 dark:text-[#9AA3B5]"
            aria-label="Site information and permissions"
            title="Site information"
          >
            {isInternal ? (
              <Shield className="w-3.5 h-3.5 text-[#4A8DFF]" />
            ) : isHttps ? (
              <Lock className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            )}
          </button>

          <input
            ref={omniboxRef}
            type="text"
            value={inputValue}
            onFocus={(e) => {
              setFocused(true);
              e.currentTarget.select();
            }}
            onBlur={() => setTimeout(() => setFocused(false), 160)}
            onChange={(e) => {
              setInputValue(e.target.value);
              setSelectedIdx(-1);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIdx((prev) => Math.min(prev + 1, localSuggestions.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIdx((prev) => Math.max(prev - 1, -1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                if (selectedIdx >= 0 && localSuggestions[selectedIdx]) {
                  handleSubmit(localSuggestions[selectedIdx].value);
                } else {
                  handleSubmit(inputValue);
                }
              } else if (e.key === 'Escape') {
                setFocused(false);
                setInputValue(activeTab.url === 'soul://newtab' ? '' : activeTab.url);
                omniboxRef.current?.blur();
              }
            }}
            placeholder={`Search with ${(SEARCH_ENGINES[searchEngine] ?? SEARCH_ENGINES.bing).name} or enter URL (soul://settings)`}
            aria-label="Address and search bar"
            className={`flex-1 min-w-0 bg-transparent outline-none text-xs ${
              isPrivate
                ? 'text-[#F5F7FF] placeholder:text-[#9F94C4]'
                : 'text-slate-900 dark:text-[#F5F7FF] placeholder:text-slate-400 dark:placeholder:text-[#9AA3B5]'
            }`}
          />

          {inputValue && (
            <button
              type="button"
              onClick={() => {
                setInputValue('');
                omniboxRef.current?.focus();
              }}
              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white"
              aria-label="Clear address bar"
              title="Clear"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyUrl}
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white shrink-0"
            aria-label="Copy current URL"
            title={copiedUrl ? 'Copied' : 'Copy URL'}
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {!isInternal && (
            <button
              type="button"
              onClick={onToggleBookmark}
              className={`p-1 rounded shrink-0 transition-colors ${
                isBookmarked ? 'text-amber-400' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
              }`}
              aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this page'}
              title="Bookmark page (Ctrl+D)"
            >
              <Star className="w-3.5 h-3.5" fill={isBookmarked ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>

        {/* Site Security & Quick Engine Popover */}
        {showSiteInfo && (
          <div className="absolute left-0 top-10 w-80 rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#101525] shadow-2xl p-3.5 z-50 text-xs">
            <div className="font-display font-semibold text-slate-900 dark:text-white mb-1">
              {isInternal
                ? 'SOUL Browser Internal Page'
                : isHttps
                ? 'Connection is secure (HTTPS)'
                : 'Connection is not encrypted (HTTP)'}
            </div>
            <p className="text-slate-500 dark:text-[#9AA3B5] mb-3 leading-relaxed">
              {isInternal
                ? 'This page runs inside the isolated SOUL Browser application shell.'
                : isHttps
                ? 'Data fetched for this page uses TLS encryption in transit.'
                : 'Avoid submitting passwords or sensitive details on unencrypted HTTP sites.'}
            </p>
            <div className="pt-2.5 border-t border-slate-200 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-[#9AA3B5]">Search Engine</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {SEARCH_ENGINES.bing.name} ({SEARCH_ENGINES.bing.shortcut})
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSiteInfo(false);
                  onOpenInternal('soul://privacy');
                }}
                className="w-full py-1.5 px-2.5 rounded bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-left flex items-center justify-between text-slate-800 dark:text-white"
              >
                <span>Site permissions & privacy</span>
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Omnibox Suggestions Dropdown */}
        {focused && (localSuggestions.length > 0 || inputValue.trim().length > 0) && (
          <div
            role="listbox"
            aria-label="Omnibox suggestions"
            className="absolute left-0 right-0 top-9 rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#101525] shadow-2xl py-1.5 z-50 text-xs"
          >
            {inputValue.trim() && (
              <button
                type="button"
                onMouseDown={() => handleSubmit(inputValue)}
                className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-white/10 text-left text-slate-900 dark:text-white"
              >
                <Search className="w-3.5 h-3.5 text-[#4A8DFF] shrink-0" />
                <span className="truncate font-medium">{inputValue.trim()}</span>
                <span className="ml-auto text-slate-400 dark:text-[#9AA3B5] shrink-0">
                  Press Enter
                </span>
              </button>
            )}
            {localSuggestions.map((item, idx) => (
              <button
                key={`${item.kind}-${item.value}-${idx}`}
                type="button"
                onMouseDown={() => handleSubmit(item.value)}
                className={`w-full px-3 py-2 flex items-center gap-2.5 text-left ${
                  selectedIdx === idx
                    ? 'bg-[#4A8DFF]/15 text-slate-900 dark:text-white'
                    : 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-[#D5DCF0]'
                }`}
              >
                {item.kind === 'bookmark' ? (
                  <Star className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : item.kind === 'history' ? (
                  <History className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                ) : (
                  <Search className="w-3.5 h-3.5 text-[#4A8DFF] shrink-0" />
                )}
                <span className="truncate font-medium">{item.label}</span>
                <span className="text-slate-400 dark:text-[#9AA3B5] truncate ml-auto max-w-[280px]">
                  {item.sublabel}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right Toolbar Actions */}
      <div className={`flex items-center gap-0.5 shrink-0 ${isPrivate ? 'text-[#E9E2FF]' : ''}`} ref={menuRef}>
        {!isInternal && (
          <button
            type="button"
            onClick={onToggleReaderMode}
            className={`w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors ${
              activeTab.readerMode
                ? 'text-white'
                : isPrivate
                ? 'text-[#D6CBF2] hover:bg-white/10'
                : 'text-slate-600 dark:text-[#9AA3B5] hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
            style={activeTab.readerMode ? { backgroundColor: accentColor } : undefined}
            aria-label="Toggle reader mode"
            title="Reader Mode"
          >
            <BookOpen className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={onToggleSplitView}
          className={`w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors ${
            splitViewEnabled
              ? 'text-white'
              : isPrivate
              ? 'text-[#D6CBF2] hover:bg-white/10'
              : 'text-slate-600 dark:text-[#9AA3B5] hover:bg-slate-100 dark:hover:bg-white/10'
          }`}
          style={splitViewEnabled ? { backgroundColor: accentColor } : undefined}
          aria-label="Toggle split view"
          title="Split View Browsing"
        >
          <Columns2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onCaptureScreen}
          className={`w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors ${
            isPrivate
              ? 'text-[#D6CBF2] hover:bg-white/10'
              : 'text-slate-600 dark:text-[#9AA3B5] hover:bg-slate-100 dark:hover:bg-white/10'
          }`}
          aria-label="Capture page snapshot"
          title="Capture Web Page"
        >
          <Camera className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onOpenInternal('soul://downloads')}
          className={`w-8 h-8 relative inline-flex items-center justify-center rounded-lg transition-colors ${
            isPrivate
              ? 'text-[#D6CBF2] hover:bg-white/10'
              : 'text-slate-600 dark:text-[#9AA3B5] hover:bg-slate-100 dark:hover:bg-white/10'
          }`}
          aria-label="Downloads"
          title="Downloads (Ctrl+J)"
        >
          <Download className="w-4 h-4" />
          {activeDownloadsCount > 0 && (
            <span className="absolute top-1 right-1 text-[9px] font-bold tabular-nums text-[#4A8DFF]">
              {activeDownloadsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onOpenInternal('soul://extensions')}
          className={`w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors ${
            isPrivate
              ? 'text-[#D6CBF2] hover:bg-white/10'
              : 'text-slate-600 dark:text-[#9AA3B5] hover:bg-slate-100 dark:hover:bg-white/10'
          }`}
          aria-label="Extensions"
          title="Extensions"
        >
          <Puzzle className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onToggleProductivity}
          className={`w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors ${
            productivityOpen
              ? 'text-white'
              : isPrivate
              ? 'text-[#D6CBF2] hover:bg-white/10'
              : 'text-slate-600 dark:text-[#9AA3B5] hover:bg-slate-100 dark:hover:bg-white/10'
          }`}
          style={productivityOpen ? { backgroundColor: accentColor } : undefined}
          aria-label="Productivity tools"
          title="Notes, Tasks & Calculator"
        >
          <PanelRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onToggleAi}
          className={`h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            aiOpen
              ? 'text-white'
              : isPrivate
              ? 'text-[#F5F7FF] hover:bg-white/10'
              : 'text-slate-700 dark:text-[#F5F7FF] hover:bg-slate-100 dark:hover:bg-white/10'
          }`}
          style={aiOpen ? { backgroundColor: '#885DFF' } : undefined}
          aria-label="SOUL AI sidebar"
          title="SOUL AI Assistant"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">SOUL AI</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenInternal('soul://profiles')}
          className="w-7 h-7 ml-0.5 rounded-full overflow-hidden border border-slate-300 dark:border-white/20 shrink-0"
          aria-label={`Profile: ${profile.name}`}
          title={`Profile: ${profile.name}`}
        >
          <img
            src={profile.avatar}
            alt={profile.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </button>

        <button
          type="button"
          onClick={() => setShowMenu((v) => !v)}
          className={`w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors ${
            isPrivate
              ? 'text-[#D6CBF2] hover:bg-white/10'
              : 'text-slate-600 dark:text-[#9AA3B5] hover:bg-slate-100 dark:hover:bg-white/10'
          }`}
          aria-label="Main browser menu"
          aria-expanded={showMenu}
          title="Menu"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {/* Main Browser Menu */}
        {showMenu && (
          <div
            role="menu"
            className="absolute right-2.5 top-10 w-64 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#101525] shadow-2xl py-1.5 z-50 text-xs text-slate-800 dark:text-[#F5F7FF]"
          >
            <button
              type="button"
              onClick={() => {
                setShowMenu(false);
                onOpenInternal('soul://newtab');
              }}
              className="w-full px-3.5 py-2 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-white/10"
            >
              <span>New Tab</span>
              <span className="font-mono text-[11px] text-slate-400">Ctrl+T</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowMenu(false);
                onNewPrivateWindow();
              }}
              className="w-full px-3.5 py-2 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-white/10"
            >
              <span className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-[#885DFF]" />
                New Private Window
              </span>
              <span className="font-mono text-[11px] text-slate-400">Ctrl+Shift+N</span>
            </button>

            <div className="my-1 border-t border-slate-200 dark:border-white/10" />

            <div className="px-3.5 py-1.5 flex items-center justify-between">
              <span>Zoom</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onZoomChange(-0.1)}
                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20"
                  aria-label="Zoom out"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => onZoomChange('reset')}
                  className="px-2 py-0.5 rounded tabular-nums hover:bg-slate-100 dark:hover:bg-white/10"
                  aria-label="Reset zoom"
                >
                  {Math.round(activeTab.zoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => onZoomChange(0.1)}
                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20"
                  aria-label="Zoom in"
                >
                  +
                </button>
              </div>
            </div>

            <div className="my-1 border-t border-slate-200 dark:border-white/10" />

            {[
              { label: 'Bookmarks', url: 'soul://bookmarks', icon: Bookmark, kbd: 'Ctrl+Shift+O' },
              { label: 'History', url: 'soul://history', icon: History, kbd: 'Ctrl+H' },
              { label: 'Downloads', url: 'soul://downloads', icon: Download, kbd: 'Ctrl+J' },
              { label: 'Passwords & Autofill', url: 'soul://passwords', icon: KeyRound, kbd: '' },
              { label: 'Privacy & Security', url: 'soul://privacy', icon: Shield, kbd: '' },
              { label: 'Extensions', url: 'soul://extensions', icon: Puzzle, kbd: '' },
              { label: 'Settings', url: 'soul://settings', icon: Settings, kbd: '' },
              { label: 'Desktop Architecture', url: 'soul://architecture', icon: Cpu, kbd: '' },
              { label: 'About SOUL Browser', url: 'soul://about', icon: Info, kbd: '' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.url}
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onOpenInternal(item.url);
                  }}
                  className="w-full px-3.5 py-1.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  <span className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-slate-400" />
                    {item.label}
                  </span>
                  {item.kbd && <span className="font-mono text-[11px] text-slate-400">{item.kbd}</span>}
                </button>
              );
            })}

            <div className="my-1 border-t border-slate-200 dark:border-white/10" />

            <button
              type="button"
              onClick={() => {
                setShowMenu(false);
                onOpenFind();
              }}
              className="w-full px-3.5 py-1.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-white/10"
            >
              <span>Find in page</span>
              <span className="font-mono text-[11px] text-slate-400">Ctrl+F</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowMenu(false);
                onSavePage();
              }}
              className="w-full px-3.5 py-1.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-white/10"
            >
              <span>Save page</span>
              <span className="font-mono text-[11px] text-slate-400">Ctrl+S</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowMenu(false);
                onPrintPage();
              }}
              className="w-full px-3.5 py-1.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-white/10"
            >
              <span className="flex items-center gap-2">
                <Printer className="w-3.5 h-3.5 text-slate-400" />
                Print
              </span>
              <span className="font-mono text-[11px] text-slate-400">Ctrl+P</span>
            </button>
            {!isInternal && (
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onToggleViewSource();
                }}
                className="w-full px-3.5 py-1.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <span className="flex items-center gap-2">
                  <Code2 className="w-3.5 h-3.5 text-slate-400" />
                  {activeTab.viewSource ? 'Exit page source' : 'View page source'}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setShowMenu(false);
                onToggleFullscreen();
              }}
              className="w-full px-3.5 py-1.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-white/10"
            >
              <span className="flex items-center gap-2">
                <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                Fullscreen
              </span>
              <span className="font-mono text-[11px] text-slate-400">F11</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
