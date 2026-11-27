import React, { useState } from 'react';
import { Plus, X, Pin, VolumeX, RotateCcw, Layers, PanelLeft } from 'lucide-react';
import type { BrowserTab, TabGroup, TabLayoutMode } from '../browser/types';

interface TabBarProps {
  tabs: BrowserTab[];
  groups: TabGroup[];
  activeTabId: string;
  layoutMode: TabLayoutMode;
  isPrivate: boolean;
  accentColor: string;
  canReopenClosed: boolean;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: () => void;
  onReopenClosed: () => void;
  onReorderTabs: (fromId: string, toId: string) => void;
  onToggleGroupCollapse: (groupId: string) => void;
  onToggleVerticalMode: () => void;
  onTabContextMenu: (e: React.MouseEvent, tabId: string) => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  groups,
  activeTabId,
  layoutMode,
  isPrivate,
  accentColor,
  canReopenClosed,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onReopenClosed,
  onReorderTabs,
  onToggleGroupCollapse,
  onToggleVerticalMode,
  onTabContextMenu,
}) => {
  const [dragTabId, setDragTabId] = useState<string | null>(null);
  const isVertical = layoutMode === 'vertical';
  const isCompact = layoutMode === 'compact';

  const getGroup = (groupId?: string | null) =>
    groupId ? groups.find((g) => g.id === groupId) : undefined;

  if (isVertical) {
    return (
      <aside
        aria-label="Vertical tab strip"
        className={`w-60 shrink-0 flex flex-col border-r select-none ${
          isPrivate
            ? 'bg-[#120D24] border-[#885DFF]/25'
            : 'bg-slate-100 dark:bg-[#0B0E17] border-slate-200 dark:border-white/10'
        }`}
      >
        <div className="p-2 flex items-center justify-between border-b border-slate-200 dark:border-white/10">
          <button
            type="button"
            onClick={onNewTab}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90 whitespace-nowrap"
            style={{ backgroundColor: isPrivate ? '#885DFF' : accentColor }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Tab</span>
          </button>
          <button
            type="button"
            onClick={onToggleVerticalMode}
            className={`ml-1.5 p-1.5 rounded-lg ${
              isPrivate
                ? 'text-[#D6CBF2] hover:bg-white/10'
                : 'text-slate-500 dark:text-[#9AA3B5] hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
            title="Switch to horizontal tabs"
            aria-label="Switch to horizontal tabs"
          >
            <PanelLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
          {tabs.map((tab) => {
            const active = tab.id === activeTabId;
            const grp = getGroup(tab.groupId);
            return (
              <div
                key={tab.id}
                draggable
                onDragStart={() => setDragTabId(tab.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragTabId) onReorderTabs(dragTabId, tab.id);
                  setDragTabId(null);
                }}
                onContextMenu={(e) => onTabContextMenu(e, tab.id)}
                className={`group flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors ${
                  active
                    ? isPrivate
                      ? 'bg-[#21193B] text-white shadow-sm'
                      : 'bg-white dark:bg-[#171E33] text-slate-900 dark:text-white shadow-sm'
                    : isPrivate
                    ? 'text-[#C7BEDD] hover:bg-white/10'
                    : 'text-slate-600 dark:text-[#9AA3B5] hover:bg-slate-200/70 dark:hover:bg-white/5'
                }`}
                style={
                  grp
                    ? { boxShadow: `inset 2px 0 0 ${grp.color}` }
                    : tab.color
                    ? { boxShadow: `inset 2px 0 0 ${tab.color}` }
                    : undefined
                }
              >
                <button
                  type="button"
                  onClick={() => onSelectTab(tab.id)}
                  className="flex-1 min-w-0 flex items-center gap-2 text-left"
                >
                  {tab.pinned && <Pin className="w-3 h-3 shrink-0 text-[#4A8DFF]" aria-label="Pinned" />}
                  {tab.muted && <VolumeX className="w-3 h-3 shrink-0 text-amber-400" aria-label="Muted" />}
                  <span className="truncate">{tab.title || 'New Tab'}</span>
                </button>
                {!tab.pinned && (
                  <button
                    type="button"
                    onClick={() => onCloseTab(tab.id)}
                    aria-label={`Close tab ${tab.title}`}
                    className="opacity-60 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-white/15 shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {canReopenClosed && (
          <div className="p-2 border-t border-slate-200 dark:border-white/10">
            <button
              type="button"
              onClick={onReopenClosed}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-slate-600 dark:text-[#9AA3B5] hover:bg-slate-200 dark:hover:bg-white/10"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reopen Closed Tab</span>
            </button>
          </div>
        )}
      </aside>
    );
  }

  return (
    <div
      role="tablist"
      aria-label="Browser tabs"
      className={`flex items-center gap-1 px-2 border-b select-none overflow-x-auto ${
        isCompact ? 'h-8' : 'h-10'
      } ${
        isPrivate
          ? 'bg-[#120D24] border-[#885DFF]/25'
          : 'bg-slate-100 dark:bg-[#0B0E17] border-slate-200 dark:border-white/10'
      }`}
    >
      {groups.map((group) => {
        const groupTabs = tabs.filter((t) => t.groupId === group.id);
        if (groupTabs.length === 0) return null;
        return (
          <button
            key={group.id}
            type="button"
            onClick={() => onToggleGroupCollapse(group.id)}
            className="px-2 py-1 rounded text-[11px] font-medium text-white shrink-0 whitespace-nowrap flex items-center gap-1"
            style={{ backgroundColor: group.color }}
            title={`${group.title} (${groupTabs.length} tabs)`}
          >
            <Layers className="w-3 h-3" />
            <span>{group.title}</span>
          </button>
        );
      })}

      {tabs.map((tab) => {
        const grp = getGroup(tab.groupId);
        if (grp?.collapsed && tab.id !== activeTabId) return null;
        const active = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            draggable
            onDragStart={() => setDragTabId(tab.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragTabId) onReorderTabs(dragTabId, tab.id);
              setDragTabId(null);
            }}
            onContextMenu={(e) => onTabContextMenu(e, tab.id)}
            className={`group flex items-center gap-1.5 rounded-t-lg border-x border-t text-xs transition-colors shrink-0 ${
              isCompact ? 'h-7 px-2' : 'h-8 px-2.5'
            } ${tab.pinned ? 'max-w-[110px]' : 'min-w-[130px] max-w-[210px]'} ${
              active
                ? 'bg-white dark:bg-[#101525] border-slate-200 dark:border-white/15 text-slate-900 dark:text-[#F5F7FF]'
                : 'bg-transparent border-transparent text-slate-600 dark:text-[#9AA3B5] hover:bg-slate-200/70 dark:hover:bg-white/5'
            }`}
            style={
              grp
                ? { borderTopColor: grp.color, borderTopWidth: '2px' }
                : active
                ? { borderTopColor: isPrivate ? '#A855F7' : accentColor, borderTopWidth: '2px' }
                : undefined
            }
          >
            <button
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelectTab(tab.id)}
              className="flex-1 min-w-0 flex items-center gap-1.5 text-left"
              title={tab.title}
            >
              {tab.isLoading ? (
                <span
                  className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin shrink-0"
                  style={{ borderColor: `${accentColor} transparent ${accentColor} ${accentColor}` }}
                  aria-label="Loading"
                />
              ) : tab.pinned ? (
                <Pin className="w-3 h-3 shrink-0 text-[#4A8DFF]" aria-label="Pinned" />
              ) : null}
              {tab.muted && <VolumeX className="w-3 h-3 shrink-0 text-amber-400" aria-label="Muted" />}
              <span className="truncate">{tab.title || 'New Tab'}</span>
            </button>

            {!tab.pinned && (
              <button
                type="button"
                onClick={() => onCloseTab(tab.id)}
                aria-label={`Close tab ${tab.title}`}
                className="opacity-50 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-white/15 shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={onNewTab}
        className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-slate-600 dark:text-[#9AA3B5] hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white shrink-0"
        aria-label="New tab"
        title="New Tab (Ctrl+T)"
      >
        <Plus className="w-4 h-4" />
      </button>

      <div className="ml-auto flex items-center gap-1 shrink-0">
        {canReopenClosed && (
          <button
            type="button"
            onClick={onReopenClosed}
            className="p-1.5 rounded-lg text-slate-500 dark:text-[#9AA3B5] hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
            aria-label="Reopen closed tab"
            title="Reopen Closed Tab (Ctrl+Shift+T)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={onToggleVerticalMode}
          className="p-1.5 rounded-lg text-slate-500 dark:text-[#9AA3B5] hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
          aria-label="Switch to vertical tabs"
          title="Vertical Tabs"
        >
          <PanelLeft className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
