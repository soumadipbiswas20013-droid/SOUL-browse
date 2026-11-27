import React, { useState } from 'react';
import { History, Search, Trash2, ExternalLink, Shield } from 'lucide-react';
import type { HistoryEntry } from '../browser/types';
import { groupHistoryByDate } from '../browser/engine';

interface HistoryPageProps {
  history: HistoryEntry[];
  isPrivate: boolean;
  onOpenInNewTab: (url: string) => void;
  onDeleteEntry: (id: string) => void;
  onDeleteDomain: (hostname: string) => void;
  onClearByRange: (range: 'hour' | 'day' | 'week' | 'all') => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  history,
  isPrivate,
  onOpenInNewTab,
  onDeleteEntry,
  onDeleteDomain,
  onClearByRange,
}) => {
  const [search, setSearch] = useState('');
  const [range, setRange] = useState<'hour' | 'day' | 'week' | 'all'>('all');

  const filtered = history.filter((h) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return h.title.toLowerCase().includes(q) || h.url.toLowerCase().includes(q);
  });

  const groups = groupHistoryByDate(filtered);

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-[#08090D] text-slate-900 dark:text-[#F5F7FF] p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/10">
          <div>
            <h1 className="font-display text-2xl font-bold">Browsing History</h1>
            <p className="text-xs text-slate-500 dark:text-[#9AA3B5] mt-1">
              Review visited pages grouped by date. Private browsing sessions are never recorded here.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <select
              aria-label="Clear history time range"
              value={range}
              onChange={(e) => setRange(e.target.value as 'hour' | 'day' | 'week' | 'all')}
              className="px-2.5 py-2 rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#101525]"
            >
              <option value="hour">Last hour</option>
              <option value="day">Last 24 hours</option>
              <option value="week">Last 7 days</option>
              <option value="all">All time</option>
            </select>
            <button
              type="button"
              onClick={() => onClearByRange(range)}
              className="px-3.5 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-500 transition-colors"
            >
              Clear Browsing Data
            </button>
          </div>
        </div>

        {isPrivate && (
          <div className="p-4 rounded-xl border border-[#885DFF]/35 bg-[#17112B] text-xs text-[#E5DBFF] flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-[#C084FC] shrink-0" />
            <span>
              You are in Private Browsing mode. New pages you visit in this window will not be added to history.
            </span>
          </div>
        )}

        <div className="relative text-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search history by title or URL..."
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#101525]"
          />
        </div>

        {groups.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101525] text-xs text-slate-500 dark:text-[#9AA3B5]">
            <History className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="font-medium text-slate-700 dark:text-white mb-1">No history entries found</p>
            <p>Websites you visit outside private windows will appear here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((grp) => (
              <section key={grp.label} className="space-y-2">
                <h2 className="font-display font-semibold text-sm text-slate-700 dark:text-[#D5DCF0]">
                  {grp.label}
                </h2>
                <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101525] divide-y divide-slate-200 dark:divide-white/10">
                  {grp.entries.map((entry) => {
                    const domain = getDomain(entry.url);
                    return (
                      <div
                        key={entry.id}
                        className="p-3.5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => onOpenInNewTab(entry.url)}
                            className="font-medium text-slate-900 dark:text-white hover:underline truncate block text-left"
                          >
                            {entry.title}
                          </button>
                          <div className="text-slate-500 dark:text-[#9AA3B5] flex items-center gap-2 mt-0.5">
                            <span className="truncate max-w-[360px]">{entry.url}</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums shrink-0">
                              {new Date(entry.visitedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {domain && (
                            <button
                              type="button"
                              onClick={() => onDeleteDomain(domain)}
                              className="px-2 py-1 rounded text-[11px] text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
                              title={`Remove all entries from ${domain}`}
                            >
                              Remove site
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenInNewTab(entry.url)}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500"
                            aria-label={`Open ${entry.title} in new tab`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteEntry(entry.id)}
                            className="p-1.5 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-500"
                            aria-label={`Delete history entry ${entry.title}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
