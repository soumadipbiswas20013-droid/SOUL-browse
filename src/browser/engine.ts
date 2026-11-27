import type {
  BookmarkItem,
  BrowserTab,
  ClosedTabEntry,
  DownloadItem,
  HistoryEntry,
  SearchEngineConfig,
  SearchEngineId,
} from './types';

export const SEARCH_ENGINES: Record<SearchEngineId, SearchEngineConfig> = {
  bing: {
    id: 'bing',
    name: 'Bing',
    shortcut: '@b',
    searchUrlTemplate: 'https://www.bing.com/search?q=%s',
  },
};

export interface OmniboxResolution {
  kind: 'internal' | 'url' | 'search';
  targetUrl: string;
  engineUsed?: SearchEngineId;
  query?: string;
}

export function classifyOmniboxInput(
  rawInput: string,
  _defaultEngine: SearchEngineId = 'bing',
  _customSearchUrl = 'https://www.bing.com/search?q=%s'
): OmniboxResolution {
  const input = rawInput.trim();
  if (!input) {
    return { kind: 'internal', targetUrl: 'soul://newtab' };
  }

  // Internal soul:// pages
  if (/^soul:\/\/[a-z0-9\-_/]*$/i.test(input)) {
    return { kind: 'internal', targetUrl: input.toLowerCase() };
  }

  // Bing search shortcut prefix (@b query)
  const bing = SEARCH_ENGINES.bing;
  if (input.toLowerCase().startsWith(`${bing.shortcut} `)) {
    const q = input.slice(bing.shortcut.length + 1).trim();
    return {
      kind: 'search',
      targetUrl: bing.searchUrlTemplate.replace('%s', encodeURIComponent(q)),
      engineUsed: 'bing',
      query: q,
    };
  }

  // Explicit http/https URL
  if (/^https?:\/\//i.test(input)) {
    return { kind: 'url', targetUrl: input };
  }

  // Domain-like input without spaces (e.g. example.com, docs.python.org/3, localhost:3000)
  const hasSpaces = /\s/.test(input);
  const looksLikeDomain =
    !hasSpaces &&
    (/^localhost(:\d+)?(\/.*)?$/i.test(input) ||
      /^[a-z0-9-]+(\.[a-z0-9-]+)+([:/?#].*)?$/i.test(input));

  if (looksLikeDomain) {
    const scheme = /^localhost/i.test(input) ? 'http://' : 'https://';
    return { kind: 'url', targetUrl: `${scheme}${input}` };
  }

  return {
    kind: 'search',
    targetUrl: bing.searchUrlTemplate.replace('%s', encodeURIComponent(input)),
    engineUsed: 'bing',
    query: input,
  };
}

export function isInternalUrl(url: string): boolean {
  return url.startsWith('soul://');
}

export function getInternalPageTitle(url: string): string {
  const clean = url.replace(/^soul:\/\//, '').split('?')[0].toLowerCase();
  const map: Record<string, string> = {
    newtab: 'New Tab',
    bookmarks: 'Bookmarks',
    history: 'History',
    downloads: 'Downloads',
    privacy: 'Privacy & Security',
    passwords: 'Passwords & Autofill',
    extensions: 'Extensions',
    profiles: 'Profiles',
    settings: 'Settings',
    about: 'About SOUL Browser',
    architecture: 'Architecture & Desktop Build',
  };
  return map[clean] || 'SOUL Page';
}

export function createTab(url = 'soul://newtab', opts: Partial<BrowserTab> = {}): BrowserTab {
  const id = opts.id || `tab_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const title = opts.title || (isInternalUrl(url) ? getInternalPageTitle(url) : url);
  return {
    id,
    title,
    url,
    favicon: opts.favicon,
    pinned: Boolean(opts.pinned),
    muted: Boolean(opts.muted),
    groupId: opts.groupId ?? null,
    color: opts.color ?? null,
    isLoading: Boolean(opts.isLoading),
    isSuspended: false,
    zoom: opts.zoom ?? 1,
    readerMode: false,
    viewSource: false,
    historyStack: opts.historyStack || [url],
    historyIndex: opts.historyIndex ?? 0,
    pageData: opts.pageData ?? null,
    lastActiveAt: Date.now(),
  };
}

export function sortTabsPinnedFirst(tabs: BrowserTab[]): BrowserTab[] {
  const pinned = tabs.filter((t) => t.pinned);
  const regular = tabs.filter((t) => !t.pinned);
  return [...pinned, ...regular];
}

export function closeTabState(
  tabs: BrowserTab[],
  activeTabId: string,
  closedStack: ClosedTabEntry[],
  targetTabId: string
): { tabs: BrowserTab[]; activeTabId: string; closedStack: ClosedTabEntry[] } {
  const idx = tabs.findIndex((t) => t.id === targetTabId);
  if (idx === -1) return { tabs, activeTabId, closedStack };

  const target = tabs[idx];
  const nextClosed = [{ tab: target, closedAt: Date.now() }, ...closedStack].slice(0, 25);
  const remaining = tabs.filter((t) => t.id !== targetTabId);

  if (remaining.length === 0) {
    const fresh = createTab('soul://newtab');
    return { tabs: [fresh], activeTabId: fresh.id, closedStack: nextClosed };
  }

  let nextActive = activeTabId;
  if (activeTabId === targetTabId) {
    const neighborIdx = Math.min(idx, remaining.length - 1);
    nextActive = remaining[neighborIdx].id;
  }

  return { tabs: remaining, activeTabId: nextActive, closedStack: nextClosed };
}

export function reopenLastClosedTab(
  tabs: BrowserTab[],
  closedStack: ClosedTabEntry[]
): { tabs: BrowserTab[]; activeTabId: string | null; closedStack: ClosedTabEntry[] } {
  if (closedStack.length === 0) {
    return { tabs, activeTabId: null, closedStack };
  }
  const [latest, ...rest] = closedStack;
  const restored = createTab(latest.tab.url, {
    ...latest.tab,
    id: `tab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    isLoading: false,
    lastActiveAt: Date.now(),
  });
  const nextTabs = sortTabsPinnedFirst([...tabs, restored]);
  return { tabs: nextTabs, activeTabId: restored.id, closedStack: rest };
}

export function duplicateTabState(tabs: BrowserTab[], targetTabId: string): { tabs: BrowserTab[]; newTab: BrowserTab | null } {
  const idx = tabs.findIndex((t) => t.id === targetTabId);
  if (idx === -1) return { tabs, newTab: null };
  const source = tabs[idx];
  const copy = createTab(source.url, {
    title: source.title,
    favicon: source.favicon,
    pinned: source.pinned,
    groupId: source.groupId,
    historyStack: [...source.historyStack],
    historyIndex: source.historyIndex,
    pageData: source.pageData,
  });
  const nextTabs = [...tabs.slice(0, idx + 1), copy, ...tabs.slice(idx + 1)];
  return { tabs: nextTabs, newTab: copy };
}

export function reorderTabsState(tabs: BrowserTab[], fromId: string, toId: string): BrowserTab[] {
  if (fromId === toId) return tabs;
  const fromIdx = tabs.findIndex((t) => t.id === fromId);
  const toIdx = tabs.findIndex((t) => t.id === toId);
  if (fromIdx === -1 || toIdx === -1) return tabs;

  const copy = [...tabs];
  const [moved] = copy.splice(fromIdx, 1);
  copy.splice(toIdx, 0, moved);
  return sortTabsPinnedFirst(copy);
}

export function cycleTabId(tabs: BrowserTab[], activeTabId: string, direction: 1 | -1): string {
  if (tabs.length === 0) return activeTabId;
  const idx = tabs.findIndex((t) => t.id === activeTabId);
  if (idx === -1) return tabs[0].id;
  const nextIdx = (idx + direction + tabs.length) % tabs.length;
  return tabs[nextIdx].id;
}

export function detectDuplicateBookmark(bookmarks: BookmarkItem[], url: string): BookmarkItem | undefined {
  const normalized = url.trim().replace(/\/+$/, '').toLowerCase();
  return bookmarks.find(
    (b) => !b.isFolder && b.url && b.url.trim().replace(/\/+$/, '').toLowerCase() === normalized
  );
}

export function exportBookmarksNetscapeHtml(bookmarks: BookmarkItem[]): string {
  const lines = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>SOUL Browser Bookmarks</TITLE>',
    '<H1>Bookmarks</H1>',
    '<DL><p>',
  ];

  const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const renderNode = (parentId: string | null, indent: string) => {
    const children = bookmarks
      .filter((b) => b.parentId === parentId)
      .sort((a, b) => a.order - b.order);

    for (const item of children) {
      if (item.isFolder) {
        lines.push(`${indent}<DT><H3 ADD_DATE="${Math.floor(item.createdAt / 1000)}">${escapeHtml(item.title)}</H3>`);
        lines.push(`${indent}<DL><p>`);
        renderNode(item.id, `${indent}  `);
        lines.push(`${indent}</DL><p>`);
      } else if (item.url) {
        lines.push(
          `${indent}<DT><A HREF="${escapeHtml(item.url)}" ADD_DATE="${Math.floor(item.createdAt / 1000)}">${escapeHtml(item.title)}</A>`
        );
      }
    }
  };

  renderNode(null, '  ');
  lines.push('</DL><p>');
  return lines.join('\n');
}

export function importBookmarksNetscapeHtml(html: string): BookmarkItem[] {
  const imported: BookmarkItem[] = [];
  const anchorRegex = /<A\s+[^>]*HREF="([^"]+)"[^>]*>([\s\S]*?)<\/A>/gi;
  let match: RegExpExecArray | null;
  let order = 0;

  while ((match = anchorRegex.exec(html)) !== null) {
    const url = match[1].trim();
    const title = match[2].replace(/<[^>]+>/g, '').trim() || url;
    if (/^https?:\/\//i.test(url)) {
      imported.push({
        id: `bm_imp_${Date.now()}_${order}`,
        parentId: null,
        title,
        url,
        isFolder: false,
        createdAt: Date.now(),
        order: order++,
      });
    }
  }
  return imported;
}

export function recordHistoryVisit(
  history: HistoryEntry[],
  visit: { url: string; title: string; favicon?: string },
  isPrivate: boolean
): HistoryEntry[] {
  if (isPrivate || isInternalUrl(visit.url)) {
    return history;
  }
  const existing = history.find((h) => h.url === visit.url);
  const now = Date.now();
  const nextEntry: HistoryEntry = {
    id: existing?.id || `hist_${now}_${Math.random().toString(36).slice(2, 6)}`,
    url: visit.url,
    title: visit.title || visit.url,
    favicon: visit.favicon || existing?.favicon,
    visitedAt: now,
    visitCount: (existing?.visitCount || 0) + 1,
  };
  return [nextEntry, ...history.filter((h) => h.url !== visit.url)].slice(0, 1000);
}

export interface HistoryGroup {
  label: string;
  entries: HistoryEntry[];
}

export function groupHistoryByDate(history: HistoryEntry[], nowMs = Date.now()): HistoryGroup[] {
  const startOfToday = new Date(nowMs);
  startOfToday.setHours(0, 0, 0, 0);
  const todayMs = startOfToday.getTime();
  const yesterdayMs = todayMs - 86_400_000;
  const weekMs = todayMs - 7 * 86_400_000;

  const buckets: Record<string, HistoryEntry[]> = {
    Today: [],
    Yesterday: [],
    'Last 7 Days': [],
    Older: [],
  };

  for (const item of history) {
    if (item.visitedAt >= todayMs) buckets.Today.push(item);
    else if (item.visitedAt >= yesterdayMs) buckets.Yesterday.push(item);
    else if (item.visitedAt >= weekMs) buckets['Last 7 Days'].push(item);
    else buckets.Older.push(item);
  }

  return Object.entries(buckets)
    .filter(([, entries]) => entries.length > 0)
    .map(([label, entries]) => ({ label, entries }));
}

export function clearHistoryByRange(
  history: HistoryEntry[],
  range: 'hour' | 'day' | 'week' | 'all',
  nowMs = Date.now()
): HistoryEntry[] {
  if (range === 'all') return [];
  const cutoffMap = {
    hour: nowMs - 3_600_000,
    day: nowMs - 86_400_000,
    week: nowMs - 7 * 86_400_000,
  };
  const cutoff = cutoffMap[range];
  return history.filter((entry) => entry.visitedAt < cutoff);
}

export function resolveDuplicateFilename(existingNames: string[], candidate: string): string {
  if (!existingNames.includes(candidate)) return candidate;
  const dotIdx = candidate.lastIndexOf('.');
  const stem = dotIdx > 0 ? candidate.slice(0, dotIdx) : candidate;
  const ext = dotIdx > 0 ? candidate.slice(dotIdx) : '';
  let counter = 1;
  while (existingNames.includes(`${stem} (${counter})${ext}`)) {
    counter += 1;
  }
  return `${stem} (${counter})${ext}`;
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / 1024 ** idx;
  return `${val >= 100 || idx === 0 ? Math.round(val) : val.toFixed(1)} ${units[idx]}`;
}

export function formatSpeed(bps: number): string {
  if (!bps || bps <= 0) return '—';
  return `${formatBytes(bps)}/s`;
}

export function formatEta(download: DownloadItem): string {
  if (download.state !== 'progressing' || download.speedBps <= 0 || download.totalBytes <= 0) {
    return '—';
  }
  const remaining = Math.max(0, download.totalBytes - download.receivedBytes);
  const seconds = Math.ceil(remaining / download.speedBps);
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const remSec = seconds % 60;
  return `${mins}m ${remSec}s`;
}

export function evaluatePasswordStrength(password: string): {
  score: 1 | 2 | 3 | 4;
  label: 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
} {
  let points = 0;
  if (password.length >= 8) points++;
  if (password.length >= 12) points++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) points++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) points++;

  if (points <= 1) return { score: 1, label: 'Weak' };
  if (points === 2) return { score: 2, label: 'Fair' };
  if (points === 3) return { score: 3, label: 'Strong' };
  return { score: 4, label: 'Very Strong' };
}

export function evaluateCalculatorExpression(expr: string): string {
  const sanitized = expr.replace(/[^0-9+\-*/().%\s]/g, '').trim();
  if (!sanitized) return '0';
  try {
    // Pure arithmetic evaluation without arbitrary globals
    const fn = new Function(`"use strict"; return (${sanitized});`);
    const result = fn();
    if (typeof result !== 'number' || !Number.isFinite(result)) {
      return 'Error';
    }
    return String(Number(result.toPrecision(12)));
  } catch {
    return 'Error';
  }
}
