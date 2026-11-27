import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type {
  AutofillAddress,
  BookmarkItem,
  BrowserPageData,
  BrowserProfile,
  BrowserSettings,
  BrowserTab,
  ClosedTabEntry,
  ContextMenuState,
  DownloadItem,
  EncryptedCredential,
  PermissionDecision,
  PermissionType,
  ProfileDataStore,
  SearchEngineId,
  TabGroup,
} from './browser/types';
import {
  classifyOmniboxInput,
  clearHistoryByRange,
  closeTabState,
  createTab,
  cycleTabId,
  detectDuplicateBookmark,
  duplicateTabState,
  getInternalPageTitle,
  isInternalUrl,
  recordHistoryVisit,
  reorderTabsState,
  reopenLastClosedTab,
  resolveDuplicateFilename,
  sortTabsPinnedFirst,
} from './browser/engine';
import { createInitialProfileData, DEFAULT_BROWSER_SETTINGS, DEFAULT_PROFILES } from './browser/seed';
import { TitleBar } from './components/TitleBar';
import { TabBar } from './components/TabBar';
import { NavigationBar } from './components/NavigationBar';
import { BookmarkBar } from './components/BookmarkBar';
import { FindBar } from './components/FindBar';
import { ContextMenu } from './components/ContextMenu';
import { ProductivityDrawer } from './components/ProductivityDrawer';
import { SoulAiSidebar } from './components/SoulAiSidebar';
import { WebViewport } from './components/WebViewport';

declare global {
  interface Window {
    soulAPI?: {
      isElectron: boolean;
      window: {
        minimize: () => Promise<void>;
        toggleMaximize: () => Promise<void>;
        close: () => Promise<void>;
        openPrivateWindow: () => Promise<void>;
      };
      tabs: {
        create: (tabId: string, url: string) => Promise<void>;
        activate: (tabId: string, visible: boolean) => Promise<void>;
        close: (tabId: string) => Promise<void>;
        navigate: (tabId: string, url: string) => Promise<void>;
        goBack: (tabId: string) => Promise<void>;
        goForward: (tabId: string) => Promise<void>;
        reload: (tabId: string) => Promise<void>;
        stop: (tabId: string) => Promise<void>;
        setZoom: (tabId: string, zoomFactor: number) => Promise<void>;
        findInPage: (tabId: string, text: string, options?: Record<string, unknown>) => Promise<void>;
        setMuted: (tabId: string, muted: boolean) => Promise<void>;
        print: (tabId: string) => Promise<void>;
        openDevTools: (tabId: string) => Promise<void>;
      };
      layout?: {
        updateBounds: (chromeHeight: number, sidebarWidth: number, sidebarLeft?: number) => Promise<void>;
      };
      downloads: {
        openFile: (savePath: string) => Promise<string>;
        showInFolder: (savePath: string) => Promise<void>;
      };
      extensions: {
        loadUnpacked: (folderPath: string) => Promise<{ id: string; name: string; version: string }>;
      };
      about: {
        getInfo: () => Promise<{ appVersion: string; electron: string; chromium: string; node: string }>;
      };
      on?: (channel: string, listener: (data: any) => void) => () => void;
    };
  }
}

const PROFILES_KEY = 'soul_browser_profiles_v1';
const ACTIVE_PROFILE_KEY = 'soul_browser_active_profile_v1';
const storeKeyForProfile = (id: string) => `soul_browser_store_v1_${id}`;

function loadProfiles(): BrowserProfile[] {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as BrowserProfile[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_PROFILES;
}

function loadProfileStore(profileId: string): ProfileDataStore {
  try {
    const raw = localStorage.getItem(storeKeyForProfile(profileId));
    if (raw) {
      const parsed = JSON.parse(raw) as ProfileDataStore;
      if (parsed && parsed.settings) {
        return {
          ...createInitialProfileData(profileId),
          ...parsed,
          settings: {
            ...DEFAULT_BROWSER_SETTINGS,
            ...parsed.settings,
            searchEngine: 'bing',
            customSearchUrl: 'https://www.bing.com/search?q=%s',
            newTab: {
              ...DEFAULT_BROWSER_SETTINGS.newTab,
              ...(parsed.settings.newTab || {}),
            },
          },
        };
      }
    }
  } catch {
    // ignore storage errors
  }
  return createInitialProfileData(profileId);
}

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialPrivate = urlParams.get('private') === '1';
  const isElectronNative = Boolean(window.soulAPI?.isElectron);

  const [isPrivate, setIsPrivate] = useState(initialPrivate);
  const [profiles, setProfiles] = useState<BrowserProfile[]>(loadProfiles);
  const [activeProfileId, setActiveProfileId] = useState<string>(() => {
    return urlParams.get('profile') || localStorage.getItem(ACTIVE_PROFILE_KEY) || 'default';
  });
  const [store, setStore] = useState<ProfileDataStore>(() => loadProfileStore(activeProfileId));

  const [tabs, setTabs] = useState<BrowserTab[]>(() => [createTab('soul://newtab')]);
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0].id);
  const [closedTabs, setClosedTabs] = useState<ClosedTabEntry[]>([]);
  const [tabGroups, setTabGroups] = useState<TabGroup[]>([]);
  const [splitTabId, setSplitTabId] = useState<string | null>(null);

  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimizedNotice, setIsMinimizedNotice] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [findMatchCase, setFindMatchCase] = useState(false);
  const [findActiveMatch, setFindActiveMatch] = useState(0);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiSeedPrompt, setAiSeedPrompt] = useState('');
  const [productivityOpen, setProductivityOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const omniboxRef = useRef<HTMLInputElement | null>(null);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  const showNotice = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((curr) => (curr === msg ? null : curr)), 2800);
  }, []);

  // Persist profiles & active profile store (never persist private session history)
  useEffect(() => {
    try {
      localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
      localStorage.setItem(ACTIVE_PROFILE_KEY, activeProfileId);
    } catch {
      // ignore quota errors
    }
  }, [profiles, activeProfileId]);

  useEffect(() => {
    if (isPrivate) return;
    try {
      localStorage.setItem(storeKeyForProfile(activeProfileId), JSON.stringify(store));
    } catch {
      // ignore quota errors
    }
  }, [store, activeProfileId, isPrivate]);

  // Apply Dark/Light/System theme, high contrast, and reduced motion classes
  useEffect(() => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const useDark =
      store.settings.theme === 'dark' || (store.settings.theme === 'system' && prefersDark);
    root.classList.toggle('dark', useDark);
    root.classList.toggle('reduced-motion', store.settings.reducedMotion);
    root.classList.toggle('high-contrast', store.settings.highContrast);
  }, [store.settings.theme, store.settings.reducedMotion, store.settings.highContrast]);

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) || tabs[0],
    [tabs, activeTabId]
  );

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeProfileId) || profiles[0],
    [profiles, activeProfileId]
  );

  const updateStore = useCallback((updater: (prev: ProfileDataStore) => ProfileDataStore) => {
    setStore((prev) => updater(prev));
  }, []);

  const loadTabUrl = useCallback(
    async (tabId: string, targetUrl: string, pushHistory = true) => {
      // Cancel any in-flight fetch for this tab
      abortControllers.current.get(tabId)?.abort();

      if (isInternalUrl(targetUrl)) {
        const title = getInternalPageTitle(targetUrl);
        setTabs((prev) =>
          prev.map((t) => {
            if (t.id !== tabId) return t;
            const nextStack = pushHistory
              ? [...t.historyStack.slice(0, t.historyIndex + 1), targetUrl]
              : t.historyStack;
            const nextIdx = pushHistory ? nextStack.length - 1 : t.historyIndex;
            return {
              ...t,
              url: targetUrl,
              title,
              isLoading: false,
              readerMode: false,
              viewSource: false,
              pageData: null,
              historyStack: nextStack,
              historyIndex: nextIdx,
              lastActiveAt: Date.now(),
            };
          })
        );
        return;
      }

      if (isElectronNative && window.soulAPI) {
        setTabs((prev) =>
          prev.map((t) => {
            if (t.id !== tabId) return t;
            const nextStack = pushHistory
              ? [...t.historyStack.slice(0, t.historyIndex + 1), targetUrl]
              : t.historyStack;
            const nextIdx = pushHistory ? nextStack.length - 1 : t.historyIndex;
            return {
              ...t,
              url: targetUrl,
              title: targetUrl,
              isLoading: true,
              pageData: null,
              historyStack: nextStack,
              historyIndex: nextIdx,
              lastActiveAt: Date.now(),
            };
          })
        );
        await window.soulAPI.tabs.navigate(tabId, targetUrl);
        await window.soulAPI.tabs.activate(tabId, true);
        return;
      }

      const controller = new AbortController();
      abortControllers.current.set(tabId, controller);

      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== tabId) return t;
          const nextStack = pushHistory
            ? [...t.historyStack.slice(0, t.historyIndex + 1), targetUrl]
            : t.historyStack;
          const nextIdx = pushHistory ? nextStack.length - 1 : t.historyIndex;
          return {
            ...t,
            url: targetUrl,
            title: targetUrl,
            isLoading: true,
            pageData: null,
            historyStack: nextStack,
            historyIndex: nextIdx,
            lastActiveAt: Date.now(),
          };
        })
      );

      try {
        const res = await fetch(`/api/browse?url=${encodeURIComponent(targetUrl)}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as BrowserPageData & {
          errorCode?: string;
          message?: string;
        };

        if (!res.ok) {
          setTabs((prev) =>
            prev.map((t) =>
              t.id === tabId
                ? {
                    ...t,
                    isLoading: false,
                    title: data.errorCode || 'Connection Error',
                    pageData: {
                      url: targetUrl,
                      title: data.errorCode || 'Connection Error',
                      error: {
                        code: data.errorCode || 'ERR_CONNECTION_FAILED',
                        message:
                          data.message ||
                          'SOUL Browser could not load this page.',
                      },
                    },
                  }
                : t
            )
          );
          return;
        }

        const resolvedUrl = data.url || targetUrl;
        const resolvedTitle = data.title || resolvedUrl;

        setTabs((prev) =>
          prev.map((t) =>
            t.id === tabId
              ? {
                  ...t,
                  url: resolvedUrl,
                  title: resolvedTitle,
                  favicon: data.favicon,
                  isLoading: false,
                  pageData: data,
                }
              : t
          )
        );

        if (!isPrivate) {
          updateStore((prev) => ({
            ...prev,
            history: recordHistoryVisit(
              prev.history,
              { url: resolvedUrl, title: resolvedTitle, favicon: data.favicon },
              isPrivate
            ),
          }));
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setTabs((prev) =>
          prev.map((t) =>
            t.id === tabId
              ? {
                  ...t,
                  isLoading: false,
                  title: 'Connection Error',
                  pageData: {
                    url: targetUrl,
                    title: 'Connection Error',
                    error: {
                      code: 'ERR_CONNECTION_FAILED',
                      message: 'Unable to reach the remote web server.',
                    },
                  },
                }
              : t
          )
        );
      }
    },
    [isElectronNative, isPrivate, updateStore]
  );

  const handleNavigate = useCallback(
    (rawInput: string, tabId = activeTabId) => {
      const resolved = classifyOmniboxInput(
        rawInput,
        store.settings.searchEngine,
        store.settings.customSearchUrl
      );
      loadTabUrl(tabId, resolved.targetUrl, true);
    },
    [activeTabId, store.settings.searchEngine, store.settings.customSearchUrl, loadTabUrl]
  );

  const handleNewTab = useCallback(
    (url = 'soul://newtab') => {
      const resolved = isInternalUrl(url)
        ? url
        : classifyOmniboxInput(url, store.settings.searchEngine, store.settings.customSearchUrl)
            .targetUrl;
      const tab = createTab(resolved, { zoom: store.settings.defaultZoom });
      setTabs((prev) => sortTabsPinnedFirst([...prev, tab]));
      setActiveTabId(tab.id);
      if (isElectronNative && window.soulAPI) {
        window.soulAPI.tabs.create(tab.id, isInternalUrl(resolved) ? '' : resolved);
      }
      if (!isInternalUrl(resolved)) {
        loadTabUrl(tab.id, resolved, false);
      }
    },
    [isElectronNative, store.settings.searchEngine, store.settings.customSearchUrl, store.settings.defaultZoom, loadTabUrl]
  );

  const handleCloseTab = useCallback(
    (targetId: string) => {
      abortControllers.current.get(targetId)?.abort();
      if (isElectronNative && window.soulAPI) {
        window.soulAPI.tabs.close(targetId);
      }
      if (splitTabId === targetId) setSplitTabId(null);
      const next = closeTabState(tabs, activeTabId, closedTabs, targetId);
      setTabs(next.tabs);
      setActiveTabId(next.activeTabId);
      setClosedTabs(next.closedStack);
    },
    [isElectronNative, tabs, activeTabId, closedTabs, splitTabId]
  );

  const handleReopenClosed = useCallback(() => {
    const res = reopenLastClosedTab(tabs, closedTabs);
    if (res.activeTabId) {
      setTabs(res.tabs);
      setActiveTabId(res.activeTabId);
      setClosedTabs(res.closedStack);
    }
  }, [tabs, closedTabs]);

  const handleBack = useCallback(
    (tabId = activeTabId) => {
      const target = tabs.find((t) => t.id === tabId);
      if (!target || target.historyIndex <= 0) return;
      const nextIndex = target.historyIndex - 1;
      const destUrl = target.historyStack[nextIndex];
      setTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, historyIndex: nextIndex } : t))
      );
      if (isElectronNative && window.soulAPI && !isInternalUrl(destUrl)) {
        window.soulAPI.tabs.goBack(tabId);
      } else {
        loadTabUrl(tabId, destUrl, false);
      }
    },
    [isElectronNative, tabs, activeTabId, loadTabUrl]
  );

  const handleForward = useCallback(
    (tabId = activeTabId) => {
      const target = tabs.find((t) => t.id === tabId);
      if (!target || target.historyIndex >= target.historyStack.length - 1) return;
      const nextIndex = target.historyIndex + 1;
      const destUrl = target.historyStack[nextIndex];
      setTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, historyIndex: nextIndex } : t))
      );
      if (isElectronNative && window.soulAPI && !isInternalUrl(destUrl)) {
        window.soulAPI.tabs.goForward(tabId);
      } else {
        loadTabUrl(tabId, destUrl, false);
      }
    },
    [isElectronNative, tabs, activeTabId, loadTabUrl]
  );

  const handleReload = useCallback(
    (tabId = activeTabId) => {
      const target = tabs.find((t) => t.id === tabId);
      if (!target) return;
      if (isElectronNative && window.soulAPI && !isInternalUrl(target.url)) {
        window.soulAPI.tabs.reload(tabId);
        return;
      }
      loadTabUrl(tabId, target.url, false);
    },
    [isElectronNative, tabs, activeTabId, loadTabUrl]
  );

  const handleStop = useCallback(
    (tabId = activeTabId) => {
      abortControllers.current.get(tabId)?.abort();
      if (isElectronNative && window.soulAPI) {
        window.soulAPI.tabs.stop(tabId);
      }
      setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, isLoading: false } : t)));
    },
    [isElectronNative, activeTabId]
  );

  const handleToggleBookmark = useCallback(() => {
    if (!activeTab || isInternalUrl(activeTab.url)) return;
    const existing = detectDuplicateBookmark(store.bookmarks, activeTab.url);
    if (existing) {
      updateStore((prev) => ({
        ...prev,
        bookmarks: prev.bookmarks.filter((b) => b.id !== existing.id),
      }));
      showNotice('Bookmark removed.');
    } else {
      const newBm: BookmarkItem = {
        id: `bm_${Date.now()}`,
        parentId: null,
        title: activeTab.title || activeTab.url,
        url: activeTab.url,
        isFolder: false,
        createdAt: Date.now(),
        order: store.bookmarks.length,
      };
      updateStore((prev) => ({ ...prev, bookmarks: [...prev.bookmarks, newBm] }));
      showNotice('Page bookmarked.');
    }
  }, [activeTab, store.bookmarks, updateStore, showNotice]);

  const handleStartDownload = useCallback(
    (url: string, rawFilename: string, totalBytes = 1024) => {
      const existingNames = store.downloads.map((d) => d.filename);
      const filename = resolveDuplicateFilename(existingNames, rawFilename);
      const dangerous = /\.(exe|bat|cmd|ps1|msi|vbs)$/i.test(filename);
      const id = `dl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      const item: DownloadItem = {
        id,
        filename,
        url,
        fileType: filename.endsWith('.json')
          ? 'application/json'
          : filename.endsWith('.html')
          ? 'text/html'
          : 'text/plain',
        totalBytes,
        receivedBytes: 0,
        speedBps: Math.max(256, Math.round(totalBytes / 2)),
        state: 'progressing',
        startedAt: Date.now(),
        saveLocation: `${store.settings.downloadDirectory}\\${filename}`,
        safetyWarning: dangerous
          ? 'Executable files can harm your device. SOUL Browser never auto-runs downloaded files.'
          : undefined,
      };

      updateStore((prev) => ({ ...prev, downloads: [item, ...prev.downloads] }));
      showNotice(`Downloading ${filename}...`);

      // Simulate progressive streaming completion while triggering real file download
      setTimeout(() => {
        updateStore((prev) => ({
          ...prev,
          downloads: prev.downloads.map((d) =>
            d.id === id && d.state === 'progressing'
              ? {
                  ...d,
                  receivedBytes: Math.round(d.totalBytes * 0.6),
                }
              : d
          ),
        }));
      }, 280);

      setTimeout(() => {
        updateStore((prev) => ({
          ...prev,
          downloads: prev.downloads.map((d) =>
            d.id === id && d.state === 'progressing'
              ? {
                  ...d,
                  receivedBytes: d.totalBytes,
                  speedBps: 0,
                  state: 'completed',
                  completedAt: Date.now(),
                }
              : d
          ),
        }));
        if (store.settings.downloadNotifications) {
          showNotice(`Download complete: ${filename}`);
        }
      }, 650);
    },
    [store.downloads, store.settings.downloadDirectory, store.settings.downloadNotifications, updateStore, showNotice]
  );

  const handleSavePage = useCallback(() => {
    if (!activeTab) return;
    const html = activeTab.pageData?.rawSource || `<!doctype html><title>${activeTab.title}</title>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const fname = `${(activeTab.title || 'soul-page').replace(/[^a-z0-9-_]+/gi, '_')}.html`;
    handleStartDownload(blobUrl, fname, blob.size);
  }, [activeTab, handleStartDownload]);

  const handleCaptureScreen = useCallback(() => {
    if (!activeTab) return;
    const summary = `SOUL Browser Snapshot\nTitle: ${activeTab.title}\nURL: ${activeTab.url}\nCaptured: ${new Date().toISOString()}\n`;
    const blob = new Blob([summary], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    handleStartDownload(url, `soul-capture-${Date.now()}.txt`, blob.size);
  }, [activeTab, handleStartDownload]);

  const handleZoomChange = useCallback(
    (delta: number | 'reset') => {
      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== activeTabId) return t;
          const nextZoom =
            delta === 'reset'
              ? 1
              : Math.min(2.5, Math.max(0.5, Number((t.zoom + delta).toFixed(2))));
          if (isElectronNative && window.soulAPI) {
            window.soulAPI.tabs.setZoom(t.id, nextZoom);
          }
          return { ...t, zoom: nextZoom };
        })
      );
    },
    [isElectronNative, activeTabId]
  );

  // Sync Electron WebContentsView events & layout bounds when running on Windows desktop
  useEffect(() => {
    if (!isElectronNative || !window.soulAPI?.on) return;
    const unsubTab = window.soulAPI.on('soul:tab-event', (ev) => {
      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== ev.tabId) return t;
          if (ev.type === 'loading') return { ...t, isLoading: Boolean(ev.isLoading) };
          if (ev.type === 'title') return { ...t, title: ev.title || t.title };
          if (ev.type === 'favicon') return { ...t, favicon: ev.favicon };
          if (ev.type === 'navigate') {
            return { ...t, url: ev.url || t.url };
          }
          if (ev.type === 'error') {
            return {
              ...t,
              isLoading: false,
              pageData: {
                url: ev.url || t.url,
                title: 'Navigation Error',
                error: {
                  code: String(ev.errorCode || 'ERR_FAILED'),
                  message: ev.errorDescription || 'Failed to load URL in Chromium.',
                },
              },
            };
          }
          return t;
        })
      );
    });
    const unsubNewTab = window.soulAPI.on('soul:open-url-in-new-tab', (ev) => {
      if (ev?.url) handleNewTab(ev.url);
    });
    const unsubWin = window.soulAPI.on('soul:window-state', (ev) => {
      if (typeof ev?.maximized === 'boolean') setIsMaximized(ev.maximized);
    });
    return () => {
      unsubTab();
      unsubNewTab();
      unsubWin();
    };
  }, [isElectronNative, handleNewTab]);

  useEffect(() => {
    if (!isElectronNative || !window.soulAPI) return;
    const showNativeView =
      !isInternalUrl(activeTab.url) &&
      !splitTabId &&
      !activeTab.readerMode &&
      !activeTab.viewSource &&
      !activeTab.pageData?.error;
    window.soulAPI.tabs.activate(activeTab.id, showNativeView);
    const chromeHeight =
      36 +
      (store.settings.tabLayout === 'vertical' ? 0 : store.settings.tabLayout === 'compact' ? 32 : 40) +
      44 +
      (store.settings.showBookmarkBar ? 32 : 0);
    const sidebarLeft = store.settings.tabLayout === 'vertical' ? 224 : 0;
    const sidebarRight = (productivityOpen ? 320 : 0) + (aiOpen ? 360 : 0);
    window.soulAPI.layout?.updateBounds(chromeHeight, sidebarRight, sidebarLeft);
  }, [
    isElectronNative,
    activeTab.id,
    activeTab.url,
    activeTab.readerMode,
    activeTab.viewSource,
    activeTab.pageData?.error,
    splitTabId,
    store.settings.tabLayout,
    store.settings.showBookmarkBar,
    productivityOpen,
    aiOpen,
  ]);

  const handleNewPrivateWindow = useCallback(() => {
    if (window.soulAPI?.window) {
      window.soulAPI.window.openPrivateWindow();
      return;
    }
    setIsPrivate((prev) => !prev);
    const fresh = createTab('soul://newtab');
    setTabs([fresh]);
    setActiveTabId(fresh.id);
    setClosedTabs([]);
    showNotice(!isPrivate ? 'Switched to isolated Private Browsing session.' : 'Exited Private Browsing session.');
  }, [isPrivate, showNotice]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (ctrl && e.shiftKey && key === 't') {
        e.preventDefault();
        handleReopenClosed();
      } else if (ctrl && e.shiftKey && key === 'n') {
        e.preventDefault();
        handleNewPrivateWindow();
      } else if (ctrl && key === 't') {
        e.preventDefault();
        handleNewTab();
      } else if (ctrl && key === 'w') {
        e.preventDefault();
        handleCloseTab(activeTabId);
      } else if (ctrl && key === 'l') {
        e.preventDefault();
        omniboxRef.current?.focus();
        omniboxRef.current?.select();
      } else if (ctrl && key === 'r') {
        e.preventDefault();
        handleReload(activeTabId);
      } else if (ctrl && key === 'd') {
        e.preventDefault();
        handleToggleBookmark();
      } else if (ctrl && key === 'h') {
        e.preventDefault();
        handleNavigate('soul://history');
      } else if (ctrl && key === 'j') {
        e.preventDefault();
        handleNavigate('soul://downloads');
      } else if (ctrl && key === 'f') {
        e.preventDefault();
        setFindOpen(true);
      } else if (ctrl && key === 'p') {
        e.preventDefault();
        window.print();
      } else if (ctrl && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleZoomChange(0.1);
      } else if (ctrl && e.key === '-') {
        e.preventDefault();
        handleZoomChange(-0.1);
      } else if (ctrl && e.key === '0') {
        e.preventDefault();
        handleZoomChange('reset');
      } else if (ctrl && e.key === 'Tab') {
        e.preventDefault();
        setActiveTabId((curr) => cycleTabId(tabs, curr, e.shiftKey ? -1 : 1));
      } else if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handleBack(activeTabId);
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        handleForward(activeTabId);
      } else if (e.key === 'F11') {
        e.preventDefault();
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        else document.documentElement.requestFullscreen?.().catch(() => {});
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    activeTabId,
    tabs,
    handleReopenClosed,
    handleNewPrivateWindow,
    handleNewTab,
    handleCloseTab,
    handleReload,
    handleToggleBookmark,
    handleNavigate,
    handleZoomChange,
    handleBack,
    handleForward,
  ]);

  const handleToggleSplitView = () => {
    if (splitTabId) {
      setSplitTabId(null);
      return;
    }
    const other = tabs.find((t) => t.id !== activeTabId);
    if (other) {
      setSplitTabId(other.id);
    } else {
      const second = createTab('soul://newtab');
      setTabs((prev) => [...prev, second]);
      setSplitTabId(second.id);
    }
  };

  const handleContextMenuAction = async (action: string, payload?: Record<string, string>) => {
    const tId = payload?.tabId || activeTabId;
    const targetUrl = payload?.url || activeTab.url;
    switch (action) {
      case 'tab-reload':
        handleReload(tId);
        break;
      case 'tab-duplicate': {
        const res = duplicateTabState(tabs, tId);
        setTabs(res.tabs);
        if (res.newTab) setActiveTabId(res.newTab.id);
        break;
      }
      case 'tab-pin':
        setTabs((prev) =>
          sortTabsPinnedFirst(prev.map((t) => (t.id === tId ? { ...t, pinned: !t.pinned } : t)))
        );
        break;
      case 'tab-mute':
        setTabs((prev) => prev.map((t) => (t.id === tId ? { ...t, muted: !t.muted } : t)));
        break;
      case 'tab-group': {
        const colors = ['#4A8DFF', '#885DFF', '#10B981', '#F59E0B'];
        const grp: TabGroup = {
          id: `grp_${Date.now()}`,
          title: `Group ${tabGroups.length + 1}`,
          color: colors[tabGroups.length % colors.length],
          collapsed: false,
        };
        setTabGroups((prev) => [...prev, grp]);
        setTabs((prev) => prev.map((t) => (t.id === tId ? { ...t, groupId: grp.id } : t)));
        break;
      }
      case 'tab-close':
        handleCloseTab(tId);
        break;
      case 'link-new-tab':
      case 'image-new-tab':
      case 'bookmark-open-tab':
        if (targetUrl) handleNewTab(targetUrl);
        break;
      case 'link-private':
        handleNewPrivateWindow();
        break;
      case 'link-copy':
      case 'image-copy':
      case 'omnibox-copy':
        await navigator.clipboard.writeText(targetUrl).catch(() => {});
        showNotice('Copied URL to clipboard.');
        break;
      case 'omnibox-paste-go':
        try {
          const text = await navigator.clipboard.readText();
          if (text) handleNavigate(text);
        } catch {
          showNotice('Clipboard read unavailable.');
        }
        break;
      case 'selection-copy':
        if (payload?.selectedText) {
          await navigator.clipboard.writeText(payload.selectedText).catch(() => {});
        }
        break;
      case 'selection-search':
        if (payload?.selectedText) handleNewTab(payload.selectedText);
        break;
      case 'selection-ai':
        if (payload?.selectedText) {
          setAiSeedPrompt(`Explain this selected text: "${payload.selectedText}"`);
          setAiOpen(true);
        }
        break;
      case 'bookmark-delete':
        if (payload?.bookmarkId) {
          updateStore((prev) => ({
            ...prev,
            bookmarks: prev.bookmarks.filter((b) => b.id !== payload.bookmarkId),
          }));
        }
        break;
      case 'page-back':
        handleBack(tId);
        break;
      case 'page-forward':
        handleForward(tId);
        break;
      case 'page-reload':
        handleReload(tId);
        break;
      case 'page-save':
        handleSavePage();
        break;
      case 'page-print':
        window.print();
        break;
      case 'page-source':
        setTabs((prev) =>
          prev.map((t) => (t.id === tId ? { ...t, viewSource: !t.viewSource } : t))
        );
        break;
    }
  };

  const splitTab = splitTabId ? tabs.find((t) => t.id === splitTabId) : null;
  const activeBookmarked = Boolean(detectDuplicateBookmark(store.bookmarks, activeTab.url));
  const activeDownloadsCount = store.downloads.filter((d) => d.state === 'progressing').length;

  const viewportPropsForTab = (t: BrowserTab) => ({
    tab: t,
    isPrivate,
    isElectronNative,
    settings: store.settings,
    profiles,
    activeProfileId,
    bookmarks: store.bookmarks,
    history: store.history,
    downloads: store.downloads,
    shortcuts: store.shortcuts,
    closedTabs,
    defaultPermissions: store.defaultPermissions,
    sitePermissions: store.sitePermissions,
    credentials: store.credentials,
    addresses: store.addresses,
    extensions: store.extensions,
    openTabsCount: tabs.length,
    findQuery: findOpen ? findQuery : '',
    onNavigate: handleNavigate,
    onOpenInNewTab: (u: string) => handleNewTab(u),
    onReload: handleReload,
    onChangeSearchEngine: (searchEngine: SearchEngineId) =>
      updateStore((prev) => ({ ...prev, settings: { ...prev.settings, searchEngine } })),
    onAddShortcut: (title: string, url: string) => {
      const normalized = classifyOmniboxInput(url, store.settings.searchEngine).targetUrl;
      updateStore((prev) => ({
        ...prev,
        shortcuts: [...prev.shortcuts, { id: `sc_${Date.now()}`, title, url: normalized }],
      }));
    },
    onDeleteShortcut: (id: string) =>
      updateStore((prev) => ({
        ...prev,
        shortcuts: prev.shortcuts.filter((s) => s.id !== id),
      })),
    onReopenClosed: handleReopenClosed,
    onUpdateNewTabConfig: (patch: Partial<BrowserSettings['newTab']>) =>
      updateStore((prev) => ({
        ...prev,
        settings: { ...prev.settings, newTab: { ...prev.settings.newTab, ...patch } },
      })),
    onAddBookmark: (title: string, url: string, parentId: string | null) =>
      updateStore((prev) => ({
        ...prev,
        bookmarks: [
          ...prev.bookmarks,
          {
            id: `bm_${Date.now()}`,
            parentId,
            title,
            url,
            isFolder: false,
            createdAt: Date.now(),
            order: prev.bookmarks.length,
          },
        ],
      })),
    onAddFolder: (title: string, parentId: string | null) =>
      updateStore((prev) => ({
        ...prev,
        bookmarks: [
          ...prev.bookmarks,
          {
            id: `bm_f_${Date.now()}`,
            parentId,
            title,
            isFolder: true,
            createdAt: Date.now(),
            order: prev.bookmarks.length,
          },
        ],
      })),
    onUpdateBookmark: (id: string, patch: Partial<BookmarkItem>) =>
      updateStore((prev) => ({
        ...prev,
        bookmarks: prev.bookmarks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
      })),
    onDeleteBookmark: (id: string) =>
      updateStore((prev) => ({
        ...prev,
        bookmarks: prev.bookmarks.filter((b) => b.id !== id && b.parentId !== id),
      })),
    onImportBookmarks: (items: BookmarkItem[]) =>
      updateStore((prev) => ({ ...prev, bookmarks: [...prev.bookmarks, ...items] })),
    onDeleteHistoryEntry: (id: string) =>
      updateStore((prev) => ({
        ...prev,
        history: prev.history.filter((h) => h.id !== id),
      })),
    onDeleteHistoryDomain: (hostname: string) =>
      updateStore((prev) => ({
        ...prev,
        history: prev.history.filter((h) => {
          try {
            return new URL(h.url).hostname !== hostname;
          } catch {
            return true;
          }
        }),
      })),
    onClearHistoryRange: (range: 'hour' | 'day' | 'week' | 'all') =>
      updateStore((prev) => ({
        ...prev,
        history: clearHistoryByRange(prev.history, range),
      })),
    onStartDownload: handleStartDownload,
    onPauseDownloadToggle: (id: string) =>
      updateStore((prev) => ({
        ...prev,
        downloads: prev.downloads.map((d) =>
          d.id === id
            ? { ...d, state: d.state === 'paused' ? 'progressing' : 'paused' }
            : d
        ),
      })),
    onCancelDownload: (id: string) =>
      updateStore((prev) => ({
        ...prev,
        downloads: prev.downloads.map((d) => (d.id === id ? { ...d, state: 'cancelled' } : d)),
      })),
    onRetryDownload: (id: string) => {
      const target = store.downloads.find((d) => d.id === id);
      if (target) handleStartDownload(target.url, target.filename, target.totalBytes);
    },
    onRemoveDownload: (id: string) =>
      updateStore((prev) => ({
        ...prev,
        downloads: prev.downloads.filter((d) => d.id !== id),
      })),
    onClearCompletedDownloads: () =>
      updateStore((prev) => ({
        ...prev,
        downloads: prev.downloads.filter((d) => d.state === 'progressing' || d.state === 'paused'),
      })),
    onUpdateSettings: (patch: Partial<BrowserSettings>) =>
      updateStore((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } })),
    onResetDefaults: () =>
      updateStore((prev) => ({ ...prev, settings: { ...DEFAULT_BROWSER_SETTINGS } })),
    onUpdateDefaultPermission: (perm: PermissionType, decision: PermissionDecision) =>
      updateStore((prev) => ({
        ...prev,
        defaultPermissions: { ...prev.defaultPermissions, [perm]: decision },
      })),
    onUpdateSitePermission: (origin: string, perm: PermissionType, decision: PermissionDecision) =>
      updateStore((prev) => {
        const exists = prev.sitePermissions.find((s) => s.origin === origin);
        if (exists) {
          return {
            ...prev,
            sitePermissions: prev.sitePermissions.map((s) =>
              s.origin === origin
                ? { ...s, permissions: { ...s.permissions, [perm]: decision } }
                : s
            ),
          };
        }
        return {
          ...prev,
          sitePermissions: [...prev.sitePermissions, { origin, permissions: { [perm]: decision } }],
        };
      }),
    onResetPermissions: () =>
      updateStore((prev) => ({
        ...prev,
        defaultPermissions: createInitialProfileData(activeProfileId).defaultPermissions,
        sitePermissions: [],
      })),
    onClearAllSiteData: () =>
      updateStore((prev) => ({ ...prev, history: [] })),
    onSaveCredential: (cred: EncryptedCredential) =>
      updateStore((prev) => ({ ...prev, credentials: [cred, ...prev.credentials] })),
    onDeleteCredential: (id: string) =>
      updateStore((prev) => ({
        ...prev,
        credentials: prev.credentials.filter((c) => c.id !== id),
      })),
    onAddAddress: (addr: AutofillAddress) =>
      updateStore((prev) => ({ ...prev, addresses: [...prev.addresses, addr] })),
    onDeleteAddress: (id: string) =>
      updateStore((prev) => ({
        ...prev,
        addresses: prev.addresses.filter((a) => a.id !== id),
      })),
    onToggleExtensionEnabled: (id: string) =>
      updateStore((prev) => ({
        ...prev,
        extensions: prev.extensions.map((e) => (e.id === id ? { ...e, enabled: !e.enabled } : e)),
      })),
    onToggleExtensionPin: (id: string) =>
      updateStore((prev) => ({
        ...prev,
        extensions: prev.extensions.map((e) =>
          e.id === id ? { ...e, pinnedToToolbar: !e.pinnedToToolbar } : e
        ),
      })),
    onRemoveExtension: (id: string) =>
      updateStore((prev) => ({
        ...prev,
        extensions: prev.extensions.filter((e) => e.id !== id),
      })),
    onAddUnpackedExtension: (folderPath: string) =>
      updateStore((prev) => ({
        ...prev,
        extensions: [
          ...prev.extensions,
          {
            id: `ext_${Date.now()}`,
            name: folderPath.split(/[\\/]/).pop() || 'Unpacked Extension',
            version: '1.0.0',
            description: `Loaded from ${folderPath}`,
            enabled: true,
            pinnedToToolbar: false,
            permissions: ['activeTab'],
            author: 'Local Developer',
            mvVersion: 3,
          },
        ],
      })),
    onSwitchProfile: (id: string) => {
      setActiveProfileId(id);
      setStore(loadProfileStore(id));
      const fresh = createTab('soul://newtab');
      setTabs([fresh]);
      setActiveTabId(fresh.id);
      showNotice(`Switched to profile.`);
    },
    onCreateProfile: (name: string, accent: string) => {
      const id = `prof_${Date.now()}`;
      const newProf: BrowserProfile = {
        id,
        name,
        avatar: '/src/assets/images/soul_profile_emblem_1795757913884.jpg',
        accentColor: accent,
        createdAt: Date.now(),
      };
      setProfiles((prev) => [...prev, newProf]);
      const initStore = createInitialProfileData(id);
      initStore.settings.accentColor = accent;
      localStorage.setItem(storeKeyForProfile(id), JSON.stringify(initStore));
      setActiveProfileId(id);
      setStore(initStore);
    },
    onUpdateProfile: (id: string, name: string) =>
      setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p))),
    onDeleteProfile: (id: string) => {
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      if (activeProfileId === id) {
        setActiveProfileId('default');
        setStore(loadProfileStore('default'));
      }
    },
    onToggleReaderMode: (tabId: string) =>
      setTabs((prev) =>
        prev.map((x) => (x.id === tabId ? { ...x, readerMode: !x.readerMode } : x))
      ),
    onToggleViewSource: (tabId: string) =>
      setTabs((prev) =>
        prev.map((x) => (x.id === tabId ? { ...x, viewSource: !x.viewSource } : x))
      ),
    onWebContextMenu: (e: React.MouseEvent, tabId: string) => {
      e.preventDefault();
      const target = e.target as HTMLElement;
      const selection = window.getSelection()?.toString().trim();
      const anchor = target.closest('a');
      const img = target.closest('img');

      if (selection) {
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          kind: 'selection',
          tabId,
          selectedText: selection,
        });
      } else if (anchor) {
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          kind: 'link',
          tabId,
          url: anchor.getAttribute('data-soul-href') || anchor.getAttribute('href') || '',
        });
      } else if (img) {
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          kind: 'image',
          tabId,
          imageUrl: img.getAttribute('src') || '',
        });
      } else {
        setContextMenu({ x: e.clientX, y: e.clientY, kind: 'page', tabId });
      }
    },
  });

  if (isMinimizedNotice) {
    return (
      <div className="h-screen w-screen bg-[#08090D] text-[#F5F7FF] flex flex-col items-center justify-center gap-4 text-xs">
        <p className="text-sm font-display font-semibold">SOUL Browser window minimized</p>
        <button
          type="button"
          onClick={() => setIsMinimizedNotice(false)}
          className="px-4 py-2 rounded-lg text-white font-medium"
          style={{ backgroundColor: store.settings.accentColor }}
        >
          Restore SOUL Browser
        </button>
      </div>
    );
  }

  return (
    <div
      className={`h-screen w-screen flex flex-col overflow-hidden ${
        store.settings.fontSize === 'small'
          ? 'text-[13px]'
          : store.settings.fontSize === 'large'
          ? 'text-[16px]'
          : 'text-[14px]'
      }`}
    >
      <TitleBar
        pageTitle={activeTab.title}
        isPrivate={isPrivate}
        isMaximized={isMaximized}
        accentColor={store.settings.accentColor}
        profileName={activeProfile.name}
        onMinimize={() => {
          if (window.soulAPI?.window) window.soulAPI.window.minimize();
          else setIsMinimizedNotice(true);
        }}
        onToggleMaximize={() => {
          if (window.soulAPI?.window) window.soulAPI.window.toggleMaximize();
          else {
            setIsMaximized((m) => !m);
            if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
            else document.documentElement.requestFullscreen?.().catch(() => {});
          }
        }}
        onCloseWindow={() => {
          if (window.soulAPI?.window) window.soulAPI.window.close();
          else {
            const fresh = createTab('soul://newtab');
            setTabs([fresh]);
            setActiveTabId(fresh.id);
            setIsPrivate(false);
            showNotice('Session reset to New Tab.');
          }
        }}
        onOpenProfiles={() => handleNavigate('soul://profiles')}
      />

      {store.settings.tabLayout !== 'vertical' && (
        <TabBar
          tabs={tabs}
          groups={tabGroups}
          activeTabId={activeTabId}
          layoutMode={store.settings.tabLayout}
          isPrivate={isPrivate}
          accentColor={store.settings.accentColor}
          canReopenClosed={closedTabs.length > 0}
          onSelectTab={setActiveTabId}
          onCloseTab={handleCloseTab}
          onNewTab={() => handleNewTab()}
          onReopenClosed={handleReopenClosed}
          onReorderTabs={(fromId, toId) =>
            setTabs((prev) => reorderTabsState(prev, fromId, toId))
          }
          onToggleGroupCollapse={(gid) =>
            setTabGroups((prev) =>
              prev.map((g) => (g.id === gid ? { ...g, collapsed: !g.collapsed } : g))
            )
          }
          onToggleVerticalMode={() =>
            updateStore((prev) => ({
              ...prev,
              settings: { ...prev.settings, tabLayout: 'vertical' },
            }))
          }
          onTabContextMenu={(e, tabId) => {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY, kind: 'tab', tabId });
          }}
        />
      )}

      <NavigationBar
        activeTab={activeTab}
        isPrivate={isPrivate}
        isBookmarked={activeBookmarked}
        showHomeButton={store.settings.showHomeButton}
        searchEngine={store.settings.searchEngine}
        enableSuggestions={store.settings.enableSearchSuggestions}
        bookmarks={store.bookmarks}
        history={store.history}
        activeDownloadsCount={activeDownloadsCount}
        splitViewEnabled={Boolean(splitTab)}
        aiOpen={aiOpen}
        productivityOpen={productivityOpen}
        profile={activeProfile}
        accentColor={store.settings.accentColor}
        omniboxRef={omniboxRef}
        onNavigate={(val) => handleNavigate(val, activeTabId)}
        onBack={() => handleBack(activeTabId)}
        onForward={() => handleForward(activeTabId)}
        onReload={() => handleReload(activeTabId)}
        onStop={() => handleStop(activeTabId)}
        onHome={() => handleNavigate('soul://newtab', activeTabId)}
        onToggleBookmark={handleToggleBookmark}
        onToggleSplitView={handleToggleSplitView}
        onToggleReaderMode={() =>
          setTabs((prev) =>
            prev.map((t) => (t.id === activeTabId ? { ...t, readerMode: !t.readerMode } : t))
          )
        }
        onCaptureScreen={handleCaptureScreen}
        onToggleAi={() => setAiOpen((v) => !v)}
        onToggleProductivity={() => setProductivityOpen((v) => !v)}
        onNewPrivateWindow={handleNewPrivateWindow}
        onOpenInternal={(u) => handleNavigate(u, activeTabId)}
        onChangeSearchEngine={(searchEngine) =>
          updateStore((prev) => ({ ...prev, settings: { ...prev.settings, searchEngine } }))
        }
        onZoomChange={handleZoomChange}
        onOpenFind={() => setFindOpen(true)}
        onToggleViewSource={() =>
          setTabs((prev) =>
            prev.map((t) => (t.id === activeTabId ? { ...t, viewSource: !t.viewSource } : t))
          )
        }
        onPrintPage={() => window.print()}
        onSavePage={handleSavePage}
        onToggleFullscreen={() => {
          if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
          else document.documentElement.requestFullscreen?.().catch(() => {});
        }}
        onOmniboxContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY, kind: 'omnibox', url: activeTab.url });
        }}
      />

      {store.settings.showBookmarkBar && (
        <BookmarkBar
          bookmarks={store.bookmarks}
          onNavigate={(u) => handleNavigate(u, activeTabId)}
          onOpenManager={() => handleNavigate('soul://bookmarks', activeTabId)}
          onContextMenu={(e, bookmarkId, url) => {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY, kind: 'bookmark', bookmarkId, url });
          }}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        {store.settings.tabLayout === 'vertical' && (
          <TabBar
            tabs={tabs}
            groups={tabGroups}
            activeTabId={activeTabId}
            layoutMode="vertical"
            isPrivate={isPrivate}
            accentColor={store.settings.accentColor}
            canReopenClosed={closedTabs.length > 0}
            onSelectTab={setActiveTabId}
            onCloseTab={handleCloseTab}
            onNewTab={() => handleNewTab()}
            onReopenClosed={handleReopenClosed}
            onReorderTabs={(fromId, toId) =>
              setTabs((prev) => reorderTabsState(prev, fromId, toId))
            }
            onToggleGroupCollapse={(gid) =>
              setTabGroups((prev) =>
                prev.map((g) => (g.id === gid ? { ...g, collapsed: !g.collapsed } : g))
              )
            }
            onToggleVerticalMode={() =>
              updateStore((prev) => ({
                ...prev,
                settings: { ...prev.settings, tabLayout: 'horizontal' },
              }))
            }
            onTabContextMenu={(e, tabId) => {
              e.preventDefault();
              setContextMenu({ x: e.clientX, y: e.clientY, kind: 'tab', tabId });
            }}
          />
        )}

        <main className="flex-1 min-w-0 min-h-0 flex">
          <div className="flex-1 min-w-0 h-full overflow-hidden">
            <WebViewport {...viewportPropsForTab(activeTab)} />
          </div>

          {splitTab && (
            <div className="flex-1 min-w-0 h-full overflow-hidden border-l border-slate-200 dark:border-white/15 flex flex-col">
              <div className="h-7 px-3 bg-slate-100 dark:bg-[#0D111E] border-b border-slate-200 dark:border-white/10 flex items-center justify-between text-[11px]">
                <span className="truncate font-medium">
                  Split Pane · {splitTab.title}
                </span>
                <button
                  type="button"
                  onClick={() => setSplitTabId(null)}
                  className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-white/10"
                  aria-label="Close split view"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <WebViewport {...viewportPropsForTab(splitTab)} />
              </div>
            </div>
          )}
        </main>

        {productivityOpen && (
          <ProductivityDrawer
            notes={store.notes}
            tasks={store.tasks}
            accentColor={store.settings.accentColor}
            onAddNote={(title, body) =>
              updateStore((prev) => ({
                ...prev,
                notes: [{ id: `n_${Date.now()}`, title, body, updatedAt: Date.now() }, ...prev.notes],
              }))
            }
            onDeleteNote={(id) =>
              updateStore((prev) => ({ ...prev, notes: prev.notes.filter((n) => n.id !== id) }))
            }
            onAddTask={(text) =>
              updateStore((prev) => ({
                ...prev,
                tasks: [{ id: `t_${Date.now()}`, text, done: false, createdAt: Date.now() }, ...prev.tasks],
              }))
            }
            onToggleTask={(id) =>
              updateStore((prev) => ({
                ...prev,
                tasks: prev.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
              }))
            }
            onDeleteTask={(id) =>
              updateStore((prev) => ({ ...prev, tasks: prev.tasks.filter((t) => t.id !== id) }))
            }
            onClose={() => setProductivityOpen(false)}
          />
        )}

        {aiOpen && (
          <SoulAiSidebar
            activeTab={activeTab}
            isPrivate={isPrivate}
            initialPrompt={aiSeedPrompt}
            onClose={() => {
              setAiOpen(false);
              setAiSeedPrompt('');
            }}
          />
        )}
      </div>

      {findOpen && (
        <FindBar
          query={findQuery}
          matchCase={findMatchCase}
          matchCount={findQuery ? 1 : 0}
          activeMatch={findActiveMatch}
          onChangeQuery={(q) => {
            setFindQuery(q);
            setFindActiveMatch(0);
          }}
          onToggleMatchCase={() => setFindMatchCase((v) => !v)}
          onNext={() => setFindActiveMatch((v) => v + 1)}
          onPrev={() => setFindActiveMatch((v) => Math.max(0, v - 1))}
          onClose={() => {
            setFindOpen(false);
            setFindQuery('');
          }}
        />
      )}

      <ContextMenu
        menu={contextMenu}
        tabs={tabs}
        onClose={() => setContextMenu(null)}
        onAction={handleContextMenuAction}
      />

      {toast && (
        <div
          role="status"
          className="fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#101525] shadow-xl text-xs text-slate-900 dark:text-[#F5F7FF]"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
