import React, { useState } from 'react';
import {
  Download,
  Pause,
  Play,
  X,
  RotateCw,
  FolderOpen,
  Trash2,
  FileText,
  AlertTriangle,
  Search,
} from 'lucide-react';
import type { DownloadItem } from '../browser/types';
import { formatBytes, formatEta, formatSpeed } from '../browser/engine';

interface DownloadsPageProps {
  downloads: DownloadItem[];
  downloadDirectory: string;
  accentColor: string;
  onStartDownload: (url: string, filename: string, totalBytes?: number) => void;
  onPauseToggle: (id: string) => void;
  onCancelDownload: (id: string) => void;
  onRetryDownload: (id: string) => void;
  onRemoveDownload: (id: string) => void;
  onClearCompleted: () => void;
  onOpenSettings: () => void;
}

export const DownloadsPage: React.FC<DownloadsPageProps> = ({
  downloads,
  downloadDirectory,
  accentColor,
  onStartDownload,
  onPauseToggle,
  onCancelDownload,
  onRetryDownload,
  onRemoveDownload,
  onClearCompleted,
  onOpenSettings,
}) => {
  const [search, setSearch] = useState('');

  const filtered = downloads.filter((d) =>
    !search.trim() ? true : d.filename.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenFile = (item: DownloadItem) => {
    if (window.soulAPI?.downloads) {
      window.soulAPI.downloads.openFile(item.saveLocation);
      return;
    }
    const a = document.createElement('a');
    a.href = /^https?:\/\//i.test(item.url)
      ? `/api/download-proxy?url=${encodeURIComponent(item.url)}&filename=${encodeURIComponent(item.filename)}`
      : item.url;
    a.download = item.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-[#08090D] text-slate-900 dark:text-[#F5F7FF] p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/10">
          <div>
            <h1 className="font-display text-2xl font-bold">Download Manager</h1>
            <p className="text-xs text-slate-500 dark:text-[#9AA3B5] mt-1">
              Default folder: <span className="font-mono">{downloadDirectory}</span> · Downloads are never auto-executed.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() =>
                onStartDownload('/api/sample-file?kind=guide', 'SOUL-Browser-Shortcuts.txt', 640)
              }
              className="px-3 py-2 rounded-lg text-white font-medium"
              style={{ backgroundColor: accentColor }}
            >
              Download Shortcuts Guide
            </button>
            <button
              type="button"
              onClick={() =>
                onStartDownload('/api/sample-file?kind=notes', 'soul-browser-release-notes.json', 480)
              }
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#101525] hover:bg-slate-100 dark:hover:bg-[#171E33]"
            >
              Download Release Metadata
            </button>
            <button
              type="button"
              onClick={onClearCompleted}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10"
            >
              Clear Completed
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="px-3 py-2 rounded-lg text-[#4A8DFF] hover:underline"
            >
              Location Settings
            </button>
          </div>
        </div>

        <div className="relative text-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter downloads by file name..."
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#101525]"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101525] text-xs text-slate-500 dark:text-[#9AA3B5]">
            <Download className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="font-medium text-slate-700 dark:text-white mb-1">No downloads yet</p>
            <p>Files saved from the web or exported from SOUL Browser will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => {
              const pct =
                item.totalBytes > 0
                  ? Math.min(100, Math.round((item.receivedBytes / item.totalBytes) * 100))
                  : item.state === 'completed'
                  ? 100
                  : 0;
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101525] text-xs space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-[#171E33] flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-[#4A8DFF]" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm text-slate-900 dark:text-white truncate">
                          {item.filename}
                        </div>
                        <div className="text-slate-500 dark:text-[#9AA3B5] flex flex-wrap items-center gap-2 mt-0.5 tabular-nums">
                          <span>{item.fileType || 'application/octet-stream'}</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {formatBytes(item.receivedBytes)} / {formatBytes(item.totalBytes)}
                          </span>
                          {item.state === 'progressing' && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{formatSpeed(item.speedBps)}</span>
                              <span aria-hidden="true">·</span>
                              <span>ETA {formatEta(item)}</span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          <span className="capitalize font-medium text-slate-700 dark:text-[#D5DCF0]">
                            {item.state}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {(item.state === 'progressing' || item.state === 'paused') && (
                        <>
                          <button
                            type="button"
                            onClick={() => onPauseToggle(item.id)}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/10"
                            aria-label={item.state === 'paused' ? 'Resume download' : 'Pause download'}
                          >
                            {item.state === 'paused' ? (
                              <Play className="w-3.5 h-3.5" />
                            ) : (
                              <Pause className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => onCancelDownload(item.id)}
                            className="p-1.5 rounded hover:bg-red-500/10 text-red-500"
                            aria-label="Cancel download"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      {(item.state === 'failed' || item.state === 'cancelled') && (
                        <button
                          type="button"
                          onClick={() => onRetryDownload(item.id)}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-[#4A8DFF]"
                          aria-label="Retry download"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {item.state === 'completed' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenFile(item)}
                            className="px-2.5 py-1 rounded bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 font-medium"
                          >
                            Save / Open
                          </button>
                          {window.soulAPI?.downloads && (
                            <button
                              type="button"
                              onClick={() => window.soulAPI!.downloads.showInFolder(item.saveLocation)}
                              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/10"
                              aria-label="Show in folder"
                              title="Show in folder"
                            >
                              <FolderOpen className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => onRemoveDownload(item.id)}
                        className="p-1.5 rounded hover:bg-red-500/10 text-slate-400 hover:text-red-500"
                        aria-label={`Remove ${item.filename} from list`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {item.safetyWarning && (
                    <div className="flex items-center gap-1.5 text-amber-500">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{item.safetyWarning}</span>
                    </div>
                  )}

                  {(item.state === 'progressing' || item.state === 'paused') && (
                    <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: accentColor }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
