import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyOmniboxInput,
  createTab,
  closeTabState,
  reopenLastClosedTab,
  duplicateTabState,
  reorderTabsState,
  cycleTabId,
  detectDuplicateBookmark,
  exportBookmarksNetscapeHtml,
  importBookmarksNetscapeHtml,
  recordHistoryVisit,
  groupHistoryByDate,
  clearHistoryByRange,
  resolveDuplicateFilename,
  formatBytes,
  evaluatePasswordStrength,
  evaluateCalculatorExpression,
} from './engine';
import {
  buildSearchResultsHtml,
  extractSearchQueryFromUrl,
  parseBingHtmlResults,
  sanitizeAndRewriteHtml,
  unwrapBingLink,
} from './webHelpers';
import type { BookmarkItem, HistoryEntry } from './types';

test('classifyOmniboxInput detects internal, URL, domain, shortcut, and Bing search queries', () => {
  assert.deepEqual(classifyOmniboxInput('soul://settings'), {
    kind: 'internal',
    targetUrl: 'soul://settings',
  });

  assert.equal(classifyOmniboxInput('https://example.com/test').kind, 'url');
  assert.equal(classifyOmniboxInput('example.com').targetUrl, 'https://example.com');
  assert.equal(classifyOmniboxInput('localhost:3000').targetUrl, 'http://localhost:3000');

  const bing = classifyOmniboxInput('electron webcontentsview', 'bing');
  assert.equal(bing.kind, 'search');
  assert.equal(bing.targetUrl, 'https://www.bing.com/search?q=electron%20webcontentsview');

  const shortcut = classifyOmniboxInput('@b windows 11 desktop', 'bing');
  assert.equal(shortcut.engineUsed, 'bing');
  assert.equal(shortcut.targetUrl, 'https://www.bing.com/search?q=windows%2011%20desktop');
});

test('tab lifecycle: close, reopen, duplicate, reorder, and cycle', () => {
  const t1 = createTab('https://example.com', { id: 't1', pinned: true });
  const t2 = createTab('https://wikipedia.org', { id: 't2' });
  const t3 = createTab('soul://settings', { id: 't3' });

  const closed = closeTabState([t1, t2, t3], 't2', [], 't2');
  assert.equal(closed.tabs.length, 2);
  assert.equal(closed.activeTabId, 't3');
  assert.equal(closed.closedStack.length, 1);

  const reopened = reopenLastClosedTab(closed.tabs, closed.closedStack);
  assert.equal(reopened.tabs.length, 3);
  assert.equal(reopened.closedStack.length, 0);

  const dup = duplicateTabState([t1, t2], 't1');
  assert.equal(dup.tabs.length, 3);
  assert.equal(dup.newTab?.url, 'https://example.com');

  // Pinned tabs stay grouped at the start even after reordering
  const reordered = reorderTabsState([t1, t2, t3], 't3', 't1');
  assert.equal(reordered[0].id, 't1');

  assert.equal(cycleTabId([t1, t2, t3], 't1', 1), 't2');
  assert.equal(cycleTabId([t1, t2, t3], 't1', -1), 't3');
});

test('bookmarks: duplicate detection and Netscape HTML export/import round-trip', () => {
  const list: BookmarkItem[] = [
    { id: 'f1', parentId: null, title: 'Tech', isFolder: true, createdAt: 1000, order: 0 },
    { id: 'b1', parentId: 'f1', title: 'Example', url: 'https://example.com/', isFolder: false, createdAt: 2000, order: 1 },
  ];

  assert.ok(detectDuplicateBookmark(list, 'https://example.com'));
  assert.equal(detectDuplicateBookmark(list, 'https://mozilla.org'), undefined);

  const html = exportBookmarksNetscapeHtml(list);
  assert.match(html, /NETSCAPE-Bookmark-file-1/);
  const imported = importBookmarksNetscapeHtml(html);
  assert.equal(imported.length, 1);
  assert.equal(imported[0].url, 'https://example.com/');
  assert.equal(imported[0].title, 'Example');
});

test('history respects private mode, groups by date, and clears by range', () => {
  const base: HistoryEntry[] = [];
  const afterPrivate = recordHistoryVisit(base, { url: 'https://secret.example', title: 'Secret' }, true);
  assert.equal(afterPrivate.length, 0);

  const afterNormal = recordHistoryVisit(base, { url: 'https://example.com', title: 'Example' }, false);
  assert.equal(afterNormal.length, 1);

  const now = new Date('2026-11-26T15:00:00Z').getTime();
  const entries: HistoryEntry[] = [
    { id: '1', url: 'https://a.com', title: 'A', visitedAt: now - 600_000, visitCount: 1 },
    { id: '2', url: 'https://b.com', title: 'B', visitedAt: now - 30 * 3_600_000, visitCount: 1 },
  ];
  const groups = groupHistoryByDate(entries, now);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].label, 'Today');

  const clearedHour = clearHistoryByRange(entries, 'hour', now);
  assert.equal(clearedHour.length, 1);
  assert.equal(clearedHour[0].id, '2');
});

test('download filename deduplication, byte formatting, password strength, and calculator', () => {
  assert.equal(resolveDuplicateFilename(['report.pdf', 'report (1).pdf'], 'report.pdf'), 'report (2).pdf');
  assert.equal(formatBytes(1536), '1.5 KB');
  assert.equal(evaluatePasswordStrength('abc').label, 'Weak');
  assert.equal(evaluatePasswordStrength('S0ul!Browser#2026').label, 'Very Strong');
  assert.equal(evaluateCalculatorExpression('(12 + 8) * 3'), '60');
});

test('webHelpers detects Bing search URLs, unwraps Bing ck/a links, parses b_algo results, and sanitizes truncated HTML', () => {
  const bing = extractSearchQueryFromUrl('https://www.bing.com/search?q=typescript+docs');
  assert.deepEqual(bing, {
    engineName: 'Bing',
    query: 'typescript docs',
    actionBase: 'https://www.bing.com/search',
  });

  assert.equal(extractSearchQueryFromUrl('https://duckduckgo.com/?q=typescript'), null);
  assert.equal(extractSearchQueryFromUrl('https://www.google.com/search?q=electron'), null);
  assert.equal(extractSearchQueryFromUrl('https://en.wikipedia.org/wiki/Web_browser'), null);

  assert.equal(
    unwrapBingLink('https://www.bing.com/ck/a?!&&u=a1aHR0cHM6Ly93d3cudHlwZXNjcmlwdGxhbmcub3JnLw&ntb=1'),
    'https://www.typescriptlang.org/'
  );

  const sampleBingHtml = `
    <ol id="b_results">
      <li class="b_algo">
        <cite>https://www.typescriptlang.org</cite>
        <h2><a href="https://www.bing.com/ck/a?!&&u=a1aHR0cHM6Ly93d3cudHlwZXNjcmlwdGxhbmcub3JnLw&ntb=1">TypeScript: JavaScript With Syntax For Types.</a></h2>
        <div class="b_caption"><p>TypeScript extends JavaScript by adding types.</p></div>
      </li>
    </ol>
  `;
  const parsed = parseBingHtmlResults(sampleBingHtml);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].url, 'https://www.typescriptlang.org/');
  assert.equal(parsed[0].title, 'TypeScript: JavaScript With Syntax For Types.');

  const rendered = buildSearchResultsHtml('typescript', 'Bing', 'https://www.bing.com/search', parsed);
  assert.match(rendered, /data-soul-href="https:\/\/www\.typescriptlang\.org\/"/);
  assert.match(rendered, /form action="https:\/\/www\.bing\.com\/search"/);

  // Truncated HTML without closing </body> still extracts body cleanly without <head>
  const truncatedHtml = '<!doctype html><html><head><title>Test</title><style>body{color:red}</style></head><body><main><h1>Hello</h1><form action="/search"><a href="/wiki/Test">Link</a></form>';
  const sanitized = sanitizeAndRewriteHtml(truncatedHtml, 'https://en.wikipedia.org/wiki/Main');
  assert.doesNotMatch(sanitized, /<head>/i);
  assert.doesNotMatch(sanitized, /<!doctype/i);
  assert.match(sanitized, /data-soul-href="https:\/\/en\.wikipedia\.org\/wiki\/Test"/);
  assert.match(sanitized, /data-soul-action="https:\/\/en\.wikipedia\.org\/search"/);
});
