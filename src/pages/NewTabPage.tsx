import React, { useEffect, useState } from 'react';
import {
  Search,
  Plus,
  Trash2,
  SlidersHorizontal,
  CloudSun,
  RotateCcw,
  Globe,
  Shield,
  Bookmark,
  Upload,
  X,
} from 'lucide-react';
import type {
  BookmarkItem,
  BrowserSettings,
  ClosedTabEntry,
  HistoryEntry,
  SearchEngineId,
  ShortcutItem,
} from '../browser/types';
import { SEARCH_ENGINES } from '../browser/engine';
import { SoulLogo } from '../components/SoulLogo';

interface NewTabPageProps {
  isPrivate: boolean;
  settings: BrowserSettings;
  shortcuts: ShortcutItem[];
  bookmarks: BookmarkItem[];
  history: HistoryEntry[];
  closedTabs: ClosedTabEntry[];
  onNavigate: (input: string) => void;
  onChangeSearchEngine: (engine: SearchEngineId) => void;
  onAddShortcut: (title: string, url: string) => void;
  onDeleteShortcut: (id: string) => void;
  onReopenClosed: () => void;
  onUpdateNewTabConfig: (patch: Partial<BrowserSettings['newTab']>) => void;
}

const WALLPAPER_OPTIONS = [
  {
    id: 'cosmic' as const,
    label: 'Orbital Horizon',
    src: '/src/assets/images/soul_wallpaper_cosmic_1795757912689.jpg',
  },
  {
    id: 'nordic' as const,
    label: 'Nordic Slate',
    src: '/src/assets/images/soul_wallpaper_nordic_1795757914030.jpg',
  },
  {
    id: 'obsidian' as const,
    label: 'Solid Obsidian',
    src: '',
  },
];

export const NewTabPage: React.FC<NewTabPageProps> = ({
  isPrivate,
  settings,
  shortcuts,
  bookmarks,
  history,
  closedTabs,
  onNavigate,
  onChangeSearchEngine,
  onAddShortcut,
  onDeleteShortcut,
  onReopenClosed,
  onUpdateNewTabConfig,
}) => {
  const [query, setQuery] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [editLayout, setEditLayout] = useState(false);
  const [addingShortcut, setAddingShortcut] = useState(false);
  const [scTitle, setScTitle] = useState('');
  const [scUrl, setScUrl] = useState('');
  const [weather, setWeather] = useState<{
    location: string;
    tempC: number;
    windKmh: number;
    condition: string;
  } | null>(null);
  const [weatherError, setWeatherError] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!settings.newTab.showWeather || isPrivate) {
      setWeather(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/weather?city=${encodeURIComponent(settings.newTab.weatherCity || 'Kolkata')}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Weather unavailable'))))
      .then((d) => {
        if (!cancelled) {
          setWeather(d);
          setWeatherError('');
        }
      })
      .catch(() => {
        if (!cancelled) setWeatherError('Weather service unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, [settings.newTab.showWeather, settings.newTab.weatherCity, isPrivate]);

  const hour = now.getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateString = now.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const activeWallpaper =
    settings.newTab.wallpaperId === 'custom'
      ? settings.newTab.customWallpaperDataUrl
      : WALLPAPER_OPTIONS.find((w) => w.id === settings.newTab.wallpaperId)?.src;

  const frequentSites = [...history]
    .sort((a, b) => b.visitCount - a.visitCount)
    .slice(0, 4);

  const recentBookmarks = bookmarks.filter((b) => !b.isFolder && b.url).slice(0, 4);

  const handleUploadWallpaper = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdateNewTabConfig({
          wallpaperId: 'custom',
          customWallpaperDataUrl: reader.result,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="@container relative h-full w-full overflow-y-auto bg-slate-50 dark:bg-[#08090D] text-slate-900 dark:text-[#F5F7FF]">
      {/* Background Wallpaper Layer */}
      {!isPrivate && activeWallpaper && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <img
            src={activeWallpaper}
            alt="New tab wallpaper"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-35 dark:opacity-45"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/75 to-slate-50 dark:from-[#08090D]/55 dark:via-[#08090D]/75 dark:to-[#08090D]" />
        </div>
      )}

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-8">
        {/* Top Row: Weather + Customize Layout */}
        <div className="flex items-center justify-between gap-4 mb-10">
          <div>
            {settings.newTab.showWeather && !isPrivate && (
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-[#9AA3B5]">
                <CloudSun className="w-4 h-4 text-[#4A8DFF]" />
                {weather ? (
                  <span className="tabular-nums">
                    {weather.location} · {weather.tempC}°C · {weather.condition}
                  </span>
                ) : (
                  <span>{weatherError || 'Loading weather...'}</span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('soul://settings')}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-[#101525]/80 text-xs font-medium hover:bg-white dark:hover:bg-[#171E33] transition-colors whitespace-nowrap"
            >
              Quick Settings
            </button>
            <button
              type="button"
              onClick={() => setEditLayout((v) => !v)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-[#101525]/80 text-xs font-medium flex items-center gap-1.5 hover:bg-white dark:hover:bg-[#171E33] transition-colors whitespace-nowrap"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{editLayout ? 'Done' : 'Edit Layout'}</span>
            </button>
          </div>
        </div>

        {/* Customize Layout Drawer */}
        {editLayout && (
          <section
            aria-label="Customize New Tab Layout"
            className="mb-8 p-5 rounded-xl border border-slate-200 dark:border-white/15 bg-white/95 dark:bg-[#101525]/95 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold text-sm">Customize New Tab Page</h2>
              <button
                type="button"
                onClick={() => setEditLayout(false)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/10"
                aria-label="Close layout editor"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {[
                { key: 'showClock' as const, label: 'Clock & Date' },
                { key: 'showGreeting' as const, label: 'Greeting' },
                { key: 'showShortcuts' as const, label: 'Shortcuts' },
                { key: 'showFrequentlyVisited' as const, label: 'Frequently Visited' },
                { key: 'showBookmarks' as const, label: 'Bookmarks' },
                { key: 'showRecentTabs' as const, label: 'Recently Closed' },
                { key: 'showWeather' as const, label: 'Weather (Optional)' },
              ].map((toggle) => (
                <label
                  key={toggle.key}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-white/10 cursor-pointer"
                >
                  <span>{toggle.label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(settings.newTab[toggle.key])}
                    onChange={(e) => onUpdateNewTabConfig({ [toggle.key]: e.target.checked })}
                    className="accent-[#4A8DFF]"
                  />
                </label>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200 dark:border-white/10 text-xs">
              <span className="text-slate-500 dark:text-[#9AA3B5]">Wallpaper:</span>
              {WALLPAPER_OPTIONS.map((wp) => (
                <button
                  key={wp.id}
                  type="button"
                  onClick={() => onUpdateNewTabConfig({ wallpaperId: wp.id })}
                  className={`px-3 py-1.5 rounded-lg border transition-colors ${
                    settings.newTab.wallpaperId === wp.id
                      ? 'border-[#4A8DFF] bg-[#4A8DFF]/15 text-[#4A8DFF] font-medium'
                      : 'border-slate-200 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10'
                  }`}
                >
                  {wp.label}
                </button>
              ))}
              <label className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer inline-flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadWallpaper}
                  className="sr-only"
                />
              </label>
            </div>
          </section>
        )}

        {/* Private Mode Banner */}
        {isPrivate && (
          <div className="mb-8 p-5 rounded-xl border border-[#885DFF]/35 bg-[#17112B] text-[#F5F7FF]">
            <div className="flex items-center gap-2.5 mb-2">
              <Shield className="w-5 h-5 text-[#C084FC]" />
              <h1 className="font-display font-semibold text-base">Private Browsing Session</h1>
            </div>
            <p className="text-xs text-[#C7BEDD] leading-relaxed max-w-3xl">
              SOUL Browser will not save your browsing history, cookies, site data, or form entries after you close this private window. Note: Private browsing does not make you anonymous to the websites you visit, your employer or school network, or your internet service provider.
            </p>
          </div>
        )}

        {/* Hero Identity, Clock & Search Box */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <SoulLogo size={36} accentColor={settings.accentColor} isPrivate={isPrivate} />
            <span className="font-display font-bold text-2xl tracking-tight">SOUL Browser</span>
          </div>

          {settings.newTab.showClock && (
            <div className="mb-3">
              <div className="font-display text-5xl font-semibold tracking-tight tabular-nums">
                {timeString}
              </div>
              <div className="text-sm text-slate-500 dark:text-[#9AA3B5] mt-1">{dateString}</div>
            </div>
          )}

          {settings.newTab.showGreeting && (
            <p className="text-sm text-slate-600 dark:text-[#D5DCF0] mb-6">
              {isPrivate ? 'Private browsing workspace' : `${greeting} — Ready to browse`}
            </p>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (query.trim()) onNavigate(query);
            }}
            className="flex flex-wrap @sm:flex-nowrap items-center gap-2 p-1.5 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#101525] shadow-lg focus-within:border-[#4A8DFF] focus-within:ring-2 focus-within:ring-[#4A8DFF]/25"
          >
            <span
              aria-label="Search engine: Bing"
              className="px-2.5 py-2 rounded-lg bg-slate-100 dark:bg-[#08090D] text-xs font-semibold text-slate-700 dark:text-[#D5DCF0] shrink-0"
            >
              Bing
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search with ${SEARCH_ENGINES.bing.name} or type a URL...`}
              aria-label="Search the web or enter URL"
              className="flex-1 min-w-0 bg-transparent px-2 py-2 text-sm outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#9AA3B5]"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-white text-xs font-medium flex items-center gap-1.5 shrink-0 ml-auto"
              style={{ backgroundColor: isPrivate ? '#885DFF' : settings.accentColor }}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>
          </form>
        </div>

        {/* Shortcuts Grid */}
        {settings.newTab.showShortcuts && (
          <section className="mb-10" aria-label="Pinned shortcuts">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-sm text-slate-700 dark:text-[#D5DCF0]">
                Shortcuts
              </h2>
              <button
                type="button"
                onClick={() => setAddingShortcut((v) => !v)}
                className="text-xs text-[#4A8DFF] hover:underline inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Shortcut</span>
              </button>
            </div>

            {addingShortcut && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!scTitle.trim() || !scUrl.trim()) return;
                  onAddShortcut(scTitle.trim(), scUrl.trim());
                  setScTitle('');
                  setScUrl('');
                  setAddingShortcut(false);
                }}
                className="mb-4 p-3 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#101525] flex flex-wrap gap-2 text-xs"
              >
                <input
                  type="text"
                  value={scTitle}
                  onChange={(e) => setScTitle(e.target.value)}
                  placeholder="Title (e.g. MDN Docs)"
                  className="flex-1 min-w-[160px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#08090D]"
                />
                <input
                  type="text"
                  value={scUrl}
                  onChange={(e) => setScUrl(e.target.value)}
                  placeholder="URL (e.g. https://developer.mozilla.org)"
                  className="flex-[2] min-w-[220px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#08090D]"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-white font-medium"
                  style={{ backgroundColor: settings.accentColor }}
                >
                  Save
                </button>
              </form>
            )}

            <div className="grid grid-cols-2 @md:grid-cols-3 @2xl:grid-cols-6 gap-3">
              {shortcuts.map((sc) => (
                <div
                  key={sc.id}
                  className="group relative rounded-xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-[#101525]/90 hover:border-[#4A8DFF]/60 transition-colors min-w-0"
                >
                  <button
                    type="button"
                    onClick={() => onNavigate(sc.url)}
                    className="w-full p-4 flex flex-col items-center gap-2 text-center min-w-0"
                  >
                    <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-[#171E33] flex items-center justify-center text-[#4A8DFF] shrink-0">
                      <Globe className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium truncate w-full">{sc.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteShortcut(sc.id)}
                    aria-label={`Remove shortcut ${sc.title}`}
                    className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 p-1 rounded text-slate-400 hover:text-red-500 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Secondary Sections: Frequently Visited, Bookmarks, Recently Closed */}
        <div className="grid grid-cols-1 @2xl:grid-cols-3 gap-6 text-xs">
          {settings.newTab.showFrequentlyVisited && (
            <section className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-[#101525]/90 min-w-0">
              <h3 className="font-display font-semibold text-sm mb-3">Frequently Visited</h3>
              {isPrivate || frequentSites.length === 0 ? (
                <p className="text-slate-500 dark:text-[#9AA3B5]">
                  {isPrivate ? 'Disabled in Private mode.' : 'Visited websites will appear here.'}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {frequentSites.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => onNavigate(h.url)}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-between gap-2 min-w-0"
                    >
                      <span className="truncate font-medium">{h.title}</span>
                      <span className="tabular-nums text-slate-400 shrink-0">{h.visitCount} visits</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {settings.newTab.showBookmarks && (
            <section className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-[#101525]/90 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="font-display font-semibold text-sm truncate">Bookmarks</h3>
                <button
                  type="button"
                  onClick={() => onNavigate('soul://bookmarks')}
                  className="text-[#4A8DFF] hover:underline shrink-0"
                >
                  Manage
                </button>
              </div>
              {recentBookmarks.length === 0 ? (
                <p className="text-slate-500 dark:text-[#9AA3B5]">No bookmarks saved yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {recentBookmarks.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => b.url && onNavigate(b.url)}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-2"
                    >
                      <Bookmark className="w-3.5 h-3.5 text-[#4A8DFF] shrink-0" />
                      <span className="truncate">{b.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {settings.newTab.showRecentTabs && (
            <section className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-[#101525]/90">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold text-sm">Recently Closed</h3>
                {closedTabs.length > 0 && (
                  <button
                    type="button"
                    onClick={onReopenClosed}
                    className="text-[#4A8DFF] hover:underline inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restore</span>
                  </button>
                )}
              </div>
              {closedTabs.length === 0 ? (
                <p className="text-slate-500 dark:text-[#9AA3B5]">No recently closed tabs.</p>
              ) : (
                <div className="space-y-1.5">
                  {closedTabs.slice(0, 4).map((entry, idx) => (
                    <button
                      key={`${entry.tab.id}-${idx}`}
                      type="button"
                      onClick={() => onNavigate(entry.tab.url)}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 truncate block"
                    >
                      {entry.tab.title}
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
