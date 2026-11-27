import React, { useState } from 'react';
import {
  Bookmark,
  Folder,
  FolderPlus,
  Plus,
  Search,
  Trash2,
  Edit3,
  Download,
  Upload,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import type { BookmarkItem } from '../browser/types';
import {
  detectDuplicateBookmark,
  exportBookmarksNetscapeHtml,
  importBookmarksNetscapeHtml,
} from '../browser/engine';

interface BookmarksPageProps {
  bookmarks: BookmarkItem[];
  accentColor: string;
  onAddBookmark: (title: string, url: string, parentId: string | null) => void;
  onAddFolder: (title: string, parentId: string | null) => void;
  onUpdateBookmark: (id: string, patch: Partial<BookmarkItem>) => void;
  onDeleteBookmark: (id: string) => void;
  onImportBookmarks: (items: BookmarkItem[]) => void;
  onOpenInNewTab: (url: string) => void;
}

export const BookmarksPage: React.FC<BookmarksPageProps> = ({
  bookmarks,
  accentColor,
  onAddBookmark,
  onAddFolder,
  onUpdateBookmark,
  onDeleteBookmark,
  onImportBookmarks,
  onOpenInNewTab,
}) => {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [folderName, setFolderName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const folders = bookmarks.filter((b) => b.isFolder).sort((a, b) => a.order - b.order);
  const duplicateMatch = newUrl.trim() ? detectDuplicateBookmark(bookmarks, newUrl) : undefined;

  const visibleItems = bookmarks
    .filter((b) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          b.title.toLowerCase().includes(q) ||
          (b.url && b.url.toLowerCase().includes(q))
        );
      }
      return b.parentId === selectedFolder;
    })
    .sort((a, b) => a.order - b.order);

  const handleExport = () => {
    const html = exportBookmarksNetscapeHtml(bookmarks);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'soul-bookmarks.html';
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage('Exported bookmarks to soul-bookmarks.html');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const parsed = importBookmarksNetscapeHtml(reader.result);
        onImportBookmarks(parsed);
        setStatusMessage(`Imported ${parsed.length} bookmarks.`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-[#08090D] text-slate-900 dark:text-[#F5F7FF] p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/10">
          <div>
            <h1 className="font-display text-2xl font-bold">Bookmark Manager</h1>
            <p className="text-xs text-slate-500 dark:text-[#9AA3B5] mt-1">
              Organize folders, detect duplicates, and import or export Netscape HTML bookmarks.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <label className="px-3 py-2 rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#101525] hover:bg-slate-100 dark:hover:bg-[#171E33] cursor-pointer inline-flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" />
              <span>Import HTML</span>
              <input type="file" accept=".html,.htm" onChange={handleImport} className="sr-only" />
            </label>
            <button
              type="button"
              onClick={handleExport}
              className="px-3 py-2 rounded-lg text-white font-medium inline-flex items-center gap-1.5"
              style={{ backgroundColor: accentColor }}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export HTML</span>
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="mt-4 px-4 py-2.5 rounded-lg border border-[#4A8DFF]/30 bg-[#4A8DFF]/10 text-xs text-[#4A8DFF]">
            {statusMessage}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Folder Tree */}
          <aside className="space-y-3">
            <div className="text-xs font-semibold text-slate-500 dark:text-[#9AA3B5]">Folders</div>
            <div className="space-y-1 text-xs">
              <button
                type="button"
                onClick={() => setSelectedFolder(null)}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${
                  selectedFolder === null
                    ? 'bg-[#4A8DFF]/15 text-[#4A8DFF] font-medium'
                    : 'hover:bg-slate-200/70 dark:hover:bg-white/5'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>All Root Bookmarks</span>
              </button>
              {folders.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFolder(f.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${
                    selectedFolder === f.id
                      ? 'bg-[#4A8DFF]/15 text-[#4A8DFF] font-medium'
                      : 'hover:bg-slate-200/70 dark:hover:bg-white/5'
                  }`}
                >
                  <Folder className="w-3.5 h-3.5 text-[#4A8DFF]" />
                  <span className="truncate">{f.title}</span>
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!folderName.trim()) return;
                onAddFolder(folderName.trim(), selectedFolder);
                setFolderName('');
              }}
              className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-2 text-xs"
            >
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="New folder name"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#101525]"
              />
              <button
                type="submit"
                className="w-full py-1.5 rounded-lg border border-slate-200 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10 inline-flex items-center justify-center gap-1.5"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Create Folder</span>
              </button>
            </form>
          </aside>

          {/* Main Bookmarks Area */}
          <div className="md:col-span-3 space-y-4">
            <div className="flex flex-wrap gap-2 text-xs">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search bookmarks by title or URL..."
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#101525]"
                />
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newTitle.trim() || !newUrl.trim()) return;
                onAddBookmark(newTitle.trim(), newUrl.trim(), selectedFolder);
                setNewTitle('');
                setNewUrl('');
              }}
              className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101525] space-y-2 text-xs"
            >
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Bookmark title"
                  className="flex-1 min-w-[150px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#08090D]"
                />
                <input
                  type="text"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="flex-[2] min-w-[220px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#08090D]"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-white font-medium inline-flex items-center gap-1"
                  style={{ backgroundColor: accentColor }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Bookmark</span>
                </button>
              </div>
              {duplicateMatch && (
                <div className="flex items-center gap-1.5 text-amber-500">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Already bookmarked as &ldquo;{duplicateMatch.title}&rdquo;.</span>
                </div>
              )}
            </form>

            {visibleItems.length === 0 ? (
              <div className="p-10 text-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101525] text-xs text-slate-500 dark:text-[#9AA3B5]">
                No bookmarks in this view. Add one above or import an HTML file.
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101525] divide-y divide-slate-200 dark:divide-white/10">
                {visibleItems.map((item) => (
                  <div key={item.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                    {editingId === item.id ? (
                      <div className="flex-1 flex flex-wrap gap-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="flex-1 px-2.5 py-1 rounded border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#08090D]"
                        />
                        {!item.isFolder && (
                          <input
                            type="text"
                            value={editUrl}
                            onChange={(e) => setEditUrl(e.target.value)}
                            className="flex-[2] px-2.5 py-1 rounded border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#08090D]"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateBookmark(item.id, { title: editTitle, url: editUrl });
                            setEditingId(null);
                          }}
                          className="px-3 py-1 rounded text-white font-medium"
                          style={{ backgroundColor: accentColor }}
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="min-w-0 flex items-center gap-3">
                          {item.isFolder ? (
                            <Folder className="w-4 h-4 text-[#4A8DFF] shrink-0" />
                          ) : (
                            <Bookmark className="w-4 h-4 text-amber-400 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => {
                                if (item.isFolder) setSelectedFolder(item.id);
                                else if (item.url) onOpenInNewTab(item.url);
                              }}
                              className="font-medium text-slate-900 dark:text-white hover:underline block truncate text-left"
                            >
                              {item.title}
                            </button>
                            {item.url && (
                              <span className="text-slate-500 dark:text-[#9AA3B5] truncate block">
                                {item.url}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {!item.isFolder && item.url && (
                            <button
                              type="button"
                              onClick={() => onOpenInNewTab(item.url!)}
                              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500"
                              aria-label={`Open ${item.title} in new tab`}
                              title="Open in new tab"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(item.id);
                              setEditTitle(item.title);
                              setEditUrl(item.url || '');
                            }}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500"
                            aria-label={`Edit ${item.title}`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteBookmark(item.id)}
                            className="p-1.5 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-500"
                            aria-label={`Delete ${item.title}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
