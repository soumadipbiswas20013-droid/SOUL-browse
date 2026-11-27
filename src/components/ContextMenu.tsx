import React, { useEffect, useRef } from 'react';
import type { BrowserTab, ContextMenuState } from '../browser/types';

interface ContextMenuProps {
  menu: ContextMenuState | null;
  tabs: BrowserTab[];
  onClose: () => void;
  onAction: (action: string, payload?: Record<string, string>) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ menu, tabs, onClose, onAction }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const handleDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', handleDown);
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('mousedown', handleDown);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  const targetTab = menu.tabId ? tabs.find((t) => t.id === menu.tabId) : undefined;
  const safeLeft = Math.min(menu.x, window.innerWidth - 230);
  const safeTop = Math.min(menu.y, window.innerHeight - 280);

  const items: Array<{ label: string; action: string; danger?: boolean; divider?: boolean }> = [];

  if (menu.kind === 'tab' && targetTab) {
    items.push(
      { label: 'Reload tab', action: 'tab-reload' },
      { label: 'Duplicate tab', action: 'tab-duplicate' },
      { label: targetTab.pinned ? 'Unpin tab' : 'Pin tab', action: 'tab-pin' },
      { label: targetTab.muted ? 'Unmute tab' : 'Mute tab', action: 'tab-mute' },
      { label: 'Add to new group', action: 'tab-group', divider: true },
      { label: 'Close tab', action: 'tab-close', danger: true }
    );
  } else if (menu.kind === 'link' && menu.url) {
    items.push(
      { label: 'Open link in new tab', action: 'link-new-tab' },
      { label: 'Open link in private window', action: 'link-private' },
      { label: 'Copy link address', action: 'link-copy' }
    );
  } else if (menu.kind === 'image' && menu.imageUrl) {
    items.push(
      { label: 'Open image in new tab', action: 'image-new-tab' },
      { label: 'Copy image address', action: 'image-copy' }
    );
  } else if (menu.kind === 'selection' && menu.selectedText) {
    items.push(
      { label: 'Copy selected text', action: 'selection-copy' },
      { label: 'Search web for selection', action: 'selection-search' },
      { label: 'Explain with SOUL AI', action: 'selection-ai' }
    );
  } else if (menu.kind === 'bookmark') {
    items.push(
      { label: 'Open in new tab', action: 'bookmark-open-tab' },
      { label: 'Delete bookmark', action: 'bookmark-delete', danger: true }
    );
  } else if (menu.kind === 'omnibox') {
    items.push(
      { label: 'Copy current URL', action: 'omnibox-copy' },
      { label: 'Paste and go', action: 'omnibox-paste-go' }
    );
  } else {
    items.push(
      { label: 'Back', action: 'page-back' },
      { label: 'Forward', action: 'page-forward' },
      { label: 'Reload', action: 'page-reload', divider: true },
      { label: 'Save page as...', action: 'page-save' },
      { label: 'Print page', action: 'page-print' },
      { label: 'View page source', action: 'page-source' }
    );
  }

  return (
    <div
      ref={ref}
      role="menu"
      style={{ left: safeLeft, top: safeTop }}
      className="fixed z-50 min-w-[210px] py-1.5 rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#101525] shadow-2xl text-xs text-slate-800 dark:text-[#F5F7FF]"
    >
      {items.map((item) => (
        <React.Fragment key={item.action}>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onAction(item.action, {
                tabId: menu.tabId || '',
                url: menu.url || '',
                imageUrl: menu.imageUrl || '',
                selectedText: menu.selectedText || '',
                bookmarkId: menu.bookmarkId || '',
              });
              onClose();
            }}
            className={`w-full text-left px-3.5 py-1.5 transition-colors flex items-center justify-between ${
              item.danger
                ? 'text-red-500 hover:bg-red-500/10'
                : 'hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
          >
            <span>{item.label}</span>
          </button>
          {item.divider && <div className="my-1 border-t border-slate-200 dark:border-white/10" />}
        </React.Fragment>
      ))}
    </div>
  );
};
