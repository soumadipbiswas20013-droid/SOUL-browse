import React, { useState } from 'react';
import {
  Palette,
  Power,
  Search,
  Download,
  Shield,
  Gauge,
  Accessibility,
  Languages,
  RotateCcw,
} from 'lucide-react';
import type { BrowserSettings, SearchEngineId, TabLayoutMode, ThemeMode } from '../browser/types';
import { SEARCH_ENGINES } from '../browser/engine';

interface SettingsPageProps {
  settings: BrowserSettings;
  openTabsCount: number;
  onUpdateSettings: (patch: Partial<BrowserSettings>) => void;
  onResetDefaults: () => void;
  onOpenInternal: (url: string) => void;
}

type SettingsCategory =
  | 'appearance'
  | 'startup'
  | 'search'
  | 'downloads'
  | 'privacy'
  | 'performance'
  | 'accessibility'
  | 'language'
  | 'reset';

const CATEGORIES: Array<{ id: SettingsCategory; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'startup', label: 'Startup', icon: Power },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'downloads', label: 'Downloads', icon: Download },
  { id: 'privacy', label: 'Privacy', icon: Shield },
  { id: 'performance', label: 'Performance', icon: Gauge },
  { id: 'accessibility', label: 'Accessibility', icon: Accessibility },
  { id: 'language', label: 'Language', icon: Languages },
  { id: 'reset', label: 'Reset', icon: RotateCcw },
];

const ACCENT_COLORS = ['#4A8DFF', '#885DFF', '#10B981', '#F59E0B', '#EC4899'];

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  openTabsCount,
  onUpdateSettings,
  onResetDefaults,
  onOpenInternal,
}) => {
  const [category, setCategory] = useState<SettingsCategory>('appearance');
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="@container h-full overflow-y-auto bg-slate-50 dark:bg-[#08090D] text-slate-900 dark:text-[#F5F7FF] p-6">
      <div className="max-w-5xl mx-auto grid grid-cols-1 @2xl:grid-cols-4 gap-6 text-xs">
        {/* Sidebar */}
        <aside className="space-y-1">
          <h1 className="font-display text-xl font-bold px-3 pb-3">Settings</h1>
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2.5 transition-colors ${
                  active
                    ? 'text-white font-medium'
                    : 'text-slate-600 dark:text-[#9AA3B5] hover:bg-slate-200/70 dark:hover:bg-white/5'
                }`}
                style={active ? { backgroundColor: settings.accentColor } : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Content */}
        <div className="md:col-span-3 p-6 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101525] space-y-6">
          {category === 'appearance' && (
            <div className="space-y-5">
              <h2 className="font-display text-lg font-semibold">Appearance</h2>

              <div className="space-y-2">
                <div className="font-medium">Theme</div>
                <div className="flex gap-2">
                  {(['dark', 'light', 'system'] as ThemeMode[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => onUpdateSettings({ theme: t })}
                      className={`px-4 py-2 rounded-lg border capitalize ${
                        settings.theme === t
                          ? 'border-[#4A8DFF] bg-[#4A8DFF]/15 text-[#4A8DFF] font-medium'
                          : 'border-slate-200 dark:border-white/15'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-medium">Accent Color</div>
                <div className="flex items-center gap-2.5">
                  {ACCENT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => onUpdateSettings({ accentColor: c })}
                      aria-label={`Accent ${c}`}
                      className={`w-7 h-7 rounded-full border-2 ${
                        settings.accentColor === c ? 'border-white ring-2 ring-[#4A8DFF]' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-medium">Tab Layout</div>
                <div className="flex gap-2">
                  {(['horizontal', 'vertical', 'compact'] as TabLayoutMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => onUpdateSettings({ tabLayout: mode })}
                      className={`px-4 py-2 rounded-lg border capitalize ${
                        settings.tabLayout === mode
                          ? 'border-[#4A8DFF] bg-[#4A8DFF]/15 text-[#4A8DFF] font-medium'
                          : 'border-slate-200 dark:border-white/15'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-white/10">
                <label className="flex items-center justify-between cursor-pointer">
                  <span>Show bookmarks bar</span>
                  <input
                    type="checkbox"
                    checked={settings.showBookmarkBar}
                    onChange={(e) => onUpdateSettings({ showBookmarkBar: e.target.checked })}
                    className="accent-[#4A8DFF]"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span>Show home button in toolbar</span>
                  <input
                    type="checkbox"
                    checked={settings.showHomeButton}
                    onChange={(e) => onUpdateSettings({ showHomeButton: e.target.checked })}
                    className="accent-[#4A8DFF]"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span>Startup animation</span>
                  <input
                    type="checkbox"
                    checked={settings.startupAnimation}
                    onChange={(e) => onUpdateSettings({ startupAnimation: e.target.checked })}
                    className="accent-[#4A8DFF]"
                  />
                </label>
              </div>
            </div>
          )}

          {category === 'startup' && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold">On Startup</h2>
              {[
                { id: 'newtab' as const, label: 'Open the New Tab page' },
                { id: 'continue' as const, label: 'Continue where you left off (restore session tabs)' },
                { id: 'specific' as const, label: 'Open a specific set of pages' },
              ].map((opt) => (
                <label key={opt.id} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="startup"
                    checked={settings.startupBehavior === opt.id}
                    onChange={() => onUpdateSettings({ startupBehavior: opt.id })}
                    className="accent-[#4A8DFF]"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
              {settings.startupBehavior === 'specific' && (
                <div className="pt-2">
                  <label className="block mb-1 text-slate-500 dark:text-[#9AA3B5]">
                    Startup URLs (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={settings.startupUrls.join(', ')}
                    onChange={(e) =>
                      onUpdateSettings({
                        startupUrls: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#08090D]"
                  />
                </div>
              )}
            </div>
          )}

          {category === 'search' && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold">Search Engine</h2>
              <div className="p-3 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#08090D] flex items-center justify-between max-w-md">
                <div>
                  <div className="font-medium">
                    {SEARCH_ENGINES.bing.name} ({SEARCH_ENGINES.bing.shortcut})
                  </div>
                  <div className="text-slate-500 dark:text-[#9AA3B5] font-mono text-[11px] mt-0.5">
                    {SEARCH_ENGINES.bing.searchUrlTemplate}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#4A8DFF]/15 text-[#4A8DFF] font-medium">
                  Active
                </span>
              </div>

              <label className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/10 cursor-pointer">
                <div>
                  <div className="font-medium">Show remote search suggestions</div>
                  <div className="text-slate-500 dark:text-[#9AA3B5]">
                    Disabled by default. When enabled, typed queries are sent to Bing autocomplete before submission (never in Private mode).
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableSearchSuggestions}
                  onChange={(e) => onUpdateSettings({ enableSearchSuggestions: e.target.checked })}
                  className="accent-[#4A8DFF]"
                />
              </label>
            </div>
          )}

          {category === 'downloads' && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold">Downloads</h2>
              <div>
                <label className="block mb-1 text-slate-500 dark:text-[#9AA3B5]">
                  Desktop Download Location
                </label>
                <input
                  type="text"
                  value={settings.downloadDirectory}
                  onChange={(e) => onUpdateSettings({ downloadDirectory: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#08090D] font-mono"
                />
              </div>
              <label className="flex items-center justify-between cursor-pointer">
                <span>Ask where to save each file before downloading</span>
                <input
                  type="checkbox"
                  checked={settings.askBeforeDownloading}
                  onChange={(e) => onUpdateSettings({ askBeforeDownloading: e.target.checked })}
                  className="accent-[#4A8DFF]"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span>Show download completion alerts</span>
                <input
                  type="checkbox"
                  checked={settings.downloadNotifications}
                  onChange={(e) => onUpdateSettings({ downloadNotifications: e.target.checked })}
                  className="accent-[#4A8DFF]"
                />
              </label>
            </div>
          )}

          {category === 'privacy' && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold">Privacy & Security</h2>
              <p className="text-slate-500 dark:text-[#9AA3B5]">
                Configure tracking protection, cookies, Do Not Track, and per-origin permissions in the Privacy & Security Center.
              </p>
              <button
                type="button"
                onClick={() => onOpenInternal('soul://privacy')}
                className="px-4 py-2 rounded-lg text-white font-medium"
                style={{ backgroundColor: settings.accentColor }}
              >
                Open Privacy & Security Center
              </button>
            </div>
          )}

          {category === 'performance' && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold">Performance (Tuned for 8 GB RAM / Intel UHD 630)</h2>
              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#08090D] tabular-nums">
                Active open tabs in this window: <strong>{openTabsCount}</strong> · Hardware concurrency:{' '}
                <strong>{typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 'N/A' : 'N/A'}</strong> logical cores
              </div>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="font-medium">Memory Saver (Suspend inactive background tabs)</div>
                  <div className="text-slate-500 dark:text-[#9AA3B5]">
                    Frees memory from inactive tabs and reloads them when revisited.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.memorySaverEnabled}
                  onChange={(e) => onUpdateSettings({ memorySaverEnabled: e.target.checked })}
                  className="accent-[#4A8DFF]"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span>Use hardware acceleration when available (desktop restart required)</span>
                <input
                  type="checkbox"
                  checked={settings.hardwareAcceleration}
                  onChange={(e) => onUpdateSettings({ hardwareAcceleration: e.target.checked })}
                  className="accent-[#4A8DFF]"
                />
              </label>
            </div>
          )}

          {category === 'accessibility' && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold">Accessibility</h2>
              <div className="flex items-center justify-between">
                <span>Default Page Zoom</span>
                <select
                  value={settings.defaultZoom}
                  onChange={(e) => onUpdateSettings({ defaultZoom: Number(e.target.value) })}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#08090D] tabular-nums"
                >
                  {[0.8, 0.9, 1, 1.1, 1.25, 1.5].map((z) => (
                    <option key={z} value={z}>
                      {Math.round(z * 100)}%
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span>Font Size</span>
                <select
                  value={settings.fontSize}
                  onChange={(e) =>
                    onUpdateSettings({ fontSize: e.target.value as BrowserSettings['fontSize'] })
                  }
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#08090D] capitalize"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
              <label className="flex items-center justify-between cursor-pointer">
                <span>Reduced motion</span>
                <input
                  type="checkbox"
                  checked={settings.reducedMotion}
                  onChange={(e) => onUpdateSettings({ reducedMotion: e.target.checked })}
                  className="accent-[#4A8DFF]"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span>High contrast borders</span>
                <input
                  type="checkbox"
                  checked={settings.highContrast}
                  onChange={(e) => onUpdateSettings({ highContrast: e.target.checked })}
                  className="accent-[#4A8DFF]"
                />
              </label>
            </div>
          )}

          {category === 'language' && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold">Language & Spell-Check</h2>
              <div className="flex items-center justify-between">
                <span>Browser Language</span>
                <select
                  value={settings.language}
                  onChange={(e) => onUpdateSettings({ language: e.target.value })}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#08090D]"
                >
                  <option value="en-US">English (United States)</option>
                  <option value="en-GB">English (United Kingdom)</option>
                  <option value="en-IN">English (India)</option>
                </select>
              </div>
              <label className="flex items-center justify-between cursor-pointer">
                <span>Enable spell-check in editable fields</span>
                <input
                  type="checkbox"
                  checked={settings.spellCheck}
                  onChange={(e) => onUpdateSettings({ spellCheck: e.target.checked })}
                  className="accent-[#4A8DFF]"
                />
              </label>
            </div>
          )}

          {category === 'reset' && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold">Reset Settings</h2>
              <p className="text-slate-500 dark:text-[#9AA3B5] leading-relaxed">
                Restores appearance, search engine, startup, and New Tab layout settings to SOUL Browser defaults. Your bookmarks and saved passwords will remain intact.
              </p>
              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium"
                >
                  Restore Default Settings
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onResetDefaults();
                      setConfirmReset(false);
                    }}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium"
                  >
                    Confirm Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/15"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
