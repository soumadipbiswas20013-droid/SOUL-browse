import React, { useState } from 'react';
import { Puzzle, Trash2, Info, Pin, FolderOpen } from 'lucide-react';
import type { ExtensionItem } from '../browser/types';

interface ExtensionsPageProps {
  extensions: ExtensionItem[];
  accentColor: string;
  onToggleEnabled: (id: string) => void;
  onTogglePin: (id: string) => void;
  onRemoveExtension: (id: string) => void;
  onAddUnpackedExtension: (folderPath: string) => void;
}

export const ExtensionsPage: React.FC<ExtensionsPageProps> = ({
  extensions,
  accentColor,
  onToggleEnabled,
  onTogglePin,
  onRemoveExtension,
  onAddUnpackedExtension,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState('');
  const [extError, setExtError] = useState('');

  const selected = extensions.find((e) => e.id === selectedId);

  const handleLoadUnpacked = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderPath.trim()) return;
    if (window.soulAPI?.extensions) {
      try {
        await window.soulAPI.extensions.loadUnpacked(folderPath.trim());
        onAddUnpackedExtension(folderPath.trim());
        setFolderPath('');
        setExtError('');
      } catch (err) {
        setExtError((err as Error).message || 'Failed to load unpacked extension.');
      }
    } else {
      setExtError(
        'Unpacked Chromium extensions require the Electron desktop runtime (electron/main.js). Full Chrome Web Store APIs are not bundled in web preview mode.'
      );
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-[#08090D] text-slate-900 dark:text-[#F5F7FF] p-6">
      <div className="max-w-4xl mx-auto space-y-6 text-xs">
        <div className="pb-6 border-b border-slate-200 dark:border-white/10">
          <h1 className="font-display text-2xl font-bold">Extensions Manager</h1>
          <p className="text-slate-500 dark:text-[#9AA3B5] mt-1">
            Manage built-in privacy modules and compatible Chromium Manifest V3 unpacked extensions in the Electron desktop build.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101525] space-y-3">
          <div className="font-medium flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-[#4A8DFF]" />
            <span>Load Unpacked Chromium Extension (Desktop Electron Runtime)</span>
          </div>
          <form onSubmit={handleLoadUnpacked} className="flex flex-wrap gap-2">
            <input
              type="text"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              placeholder="C:\Extensions\my-mv3-extension"
              className="flex-1 min-w-[240px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#08090D] font-mono"
            />
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg text-white font-medium"
              style={{ backgroundColor: accentColor }}
            >
              Load Unpacked
            </button>
          </form>
          {extError && <p className="text-amber-500 leading-relaxed">{extError}</p>}
        </div>

        {extensions.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101525] text-slate-500 dark:text-[#9AA3B5]">
            <Puzzle className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="font-medium text-slate-700 dark:text-white mb-1">No extensions installed</p>
            <p>Load compatible unpacked MV3 extensions when running SOUL Browser on desktop.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {extensions.map((ext) => (
              <div
                key={ext.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101525] flex flex-col justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="font-display font-semibold text-sm text-slate-900 dark:text-white">
                        {ext.name}
                      </h2>
                      <div className="text-slate-500 dark:text-[#9AA3B5] tabular-nums">
                        v{ext.version} · Manifest V{ext.mvVersion} · {ext.author}
                      </div>
                    </div>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ext.enabled}
                        onChange={() => onToggleEnabled(ext.id)}
                        className="accent-[#4A8DFF]"
                        aria-label={`Enable ${ext.name}`}
                      />
                    </label>
                  </div>
                  <p className="text-slate-600 dark:text-[#D5DCF0] leading-relaxed">
                    {ext.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedId(selectedId === ext.id ? null : ext.id)}
                      className="px-2.5 py-1 rounded border border-slate-200 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10 inline-flex items-center gap-1"
                    >
                      <Info className="w-3 h-3" />
                      <span>Details</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onTogglePin(ext.id)}
                      className={`px-2.5 py-1 rounded border inline-flex items-center gap-1 ${
                        ext.pinnedToToolbar
                          ? 'border-[#4A8DFF] text-[#4A8DFF]'
                          : 'border-slate-200 dark:border-white/15'
                      }`}
                    >
                      <Pin className="w-3 h-3" />
                      <span>{ext.pinnedToToolbar ? 'Pinned' : 'Pin'}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveExtension(ext.id)}
                    className="p-1.5 rounded hover:bg-red-500/10 text-slate-400 hover:text-red-500"
                    aria-label={`Remove ${ext.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {selected && (
          <section className="p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101525] space-y-2">
            <h3 className="font-display font-semibold text-sm">{selected.name} — Permissions & Details</h3>
            <p className="text-slate-500 dark:text-[#9AA3B5]">
              Requested Permissions: {selected.permissions.join(', ')}
            </p>
            {selected.notes && (
              <p className="text-slate-600 dark:text-[#D5DCF0]">{selected.notes}</p>
            )}
          </section>
        )}
      </div>
    </div>
  );
};
