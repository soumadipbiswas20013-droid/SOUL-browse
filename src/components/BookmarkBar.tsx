import React, { useState } from 'react';
import { Folder, Globe, Bookmark } from 'lucide-react';
import type { BookmarkItem } from '../browser/types';

interface BookmarkBarProps {
  bookmarks: BookmarkItem[];
  onNavigate: (url: string) => void;
  onOpenManager: () => void;
  onContextMenu: (e: React.MouseEvent, bookmarkId: string, url?: string) => void;
}

export const BookmarkBar: React.FC<BookmarkBarProps> = ({
  bookmarks,
  onNavigate,
  onOpenManager,
  onContextMenu,
}) => {
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const topLevel = bookmarks.filter((b) => b.parentId === null).sort((a, b) => a.order - b.order);

  return (
    <div
      className="h-8 px-3 flex items-center gap-1 border-b border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0D111E] text-xs overflow-x-auto relative select-none"
      aria-label="Bookmarks bar"
    >
      {topLevel.length === 0 ? (
        <button
          type="button"
          onClick={onOpenManager}
          className="flex items-center gap-1.5 text-slate-500 dark:text-[#9AA3B5] hover:text-slate-900 dark:hover:text-white px-2 py-1 rounded transition-colors whitespace-nowrap shrink-0"
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>No bookmarks yet — Open Bookmark Manager</span>
        </button>
      ) : (
        topLevel.map((item) => {
          if (item.isFolder) {
            const children = bookmarks
              .filter((c) => c.parentId === item.id)
              .sort((a, b) => a.order - b.order);
            const isOpen = openFolderId === item.id;
            return (
              <div key={item.id} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setOpenFolderId(isOpen ? null : item.id)}
                  onContextMenu={(e) => onContextMenu(e, item.id)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors whitespace-nowrap shrink-0 ${
                    isOpen
                      ? 'bg-slate-200 dark:bg-white/15 text-slate-900 dark:text-white'
                      : 'text-slate-700 dark:text-[#D5DCF0] hover:bg-slate-100 dark:hover:bg-white/10'
                  }`}
                >
                  <Folder className="w-3.5 h-3.5 text-[#4A8DFF]" />
                  <span>{item.title}</span>
                </button>
                {isOpen && (
                  <div
                    className="fixed mt-1 min-w-[200px] max-w-[280px] rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#101525] shadow-xl py-1 z-50"
                    onMouseLeave={() => setOpenFolderId(null)}
                  >
                    {children.length === 0 ? (
                      <div className="px-3 py-2 text-slate-400 dark:text-[#9AA3B5]">Empty folder</div>
                    ) : (
                      children.map((child) => (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => {
                            if (child.url) onNavigate(child.url);
                            setOpenFolderId(null);
                          }}
                          className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-[#F5F7FF]"
                        >
                          <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{child.title}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => item.url && onNavigate(item.url)}
              onContextMenu={(e) => onContextMenu(e, item.id, item.url)}
              title={item.url}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-slate-700 dark:text-[#D5DCF0] hover:bg-slate-100 dark:hover:bg-white/10 transition-colors max-w-[170px] whitespace-nowrap shrink-0"
            >
              <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{item.title}</span>
            </button>
          );
        })
      )}
    </div>
  );
};
