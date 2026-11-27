import type { BrowserProfile, BrowserSettings, ProfileDataStore } from './types';

export const DEFAULT_BROWSER_SETTINGS: BrowserSettings = {
  theme: 'dark',
  accentColor: '#4A8DFF',
  tabLayout: 'horizontal',
  interfaceDensity: 'comfortable',
  fontSize: 'medium',
  showBookmarkBar: true,
  showHomeButton: true,
  startupAnimation: true,
  startupBehavior: 'newtab',
  startupUrls: ['https://example.com'],
  searchEngine: 'bing',
  customSearchUrl: 'https://www.bing.com/search?q=%s',
  enableSearchSuggestions: false,
  downloadDirectory: 'C:\\Users\\Soumadip\\Downloads',
  askBeforeDownloading: false,
  downloadNotifications: true,
  trackingProtection: 'strict',
  blockThirdPartyCookies: true,
  sendDoNotTrack: true,
  httpsOnlyMode: true,
  memorySaverEnabled: true,
  hardwareAcceleration: true,
  defaultZoom: 1,
  reducedMotion: false,
  highContrast: false,
  language: 'en-US',
  spellCheck: true,
  translationProvider: 'none',
  newTab: {
    wallpaperId: 'cosmic',
    showClock: true,
    showGreeting: true,
    showShortcuts: true,
    showFrequentlyVisited: true,
    showBookmarks: true,
    showRecentTabs: true,
    showWeather: false,
    weatherCity: 'Kolkata',
  },
};

export const DEFAULT_PROFILES: BrowserProfile[] = [
  {
    id: 'default',
    name: 'Soumadip',
    avatar: '/src/assets/images/soul_profile_emblem_1795757913884.jpg',
    accentColor: '#4A8DFF',
    createdAt: 1735689600000,
  },
  {
    id: 'work',
    name: 'Orbit Engineering',
    avatar: '/src/assets/images/soul_profile_emblem_1795757913884.jpg',
    accentColor: '#885DFF',
    createdAt: 1735776000000,
  },
];

export function createInitialProfileData(profileId: string): ProfileDataStore {
  const now = Date.now();
  const isWork = profileId === 'work';

  return {
    bookmarks: isWork
      ? [
          {
            id: 'bm_w_1',
            parentId: null,
            title: 'MDN Web Docs',
            url: 'https://developer.mozilla.org',
            isFolder: false,
            createdAt: now - 86400000,
            order: 0,
          },
          {
            id: 'bm_w_2',
            parentId: null,
            title: 'Electron Documentation',
            url: 'https://www.electronjs.org',
            isFolder: false,
            createdAt: now - 72000000,
            order: 1,
          },
        ]
      : [
          {
            id: 'bm_folder_dev',
            parentId: null,
            title: 'Engineering',
            isFolder: true,
            createdAt: now - 200000,
            order: 0,
          },
          {
            id: 'bm_1',
            parentId: null,
            title: 'Example Domain',
            url: 'https://example.com',
            isFolder: false,
            createdAt: now - 180000,
            order: 1,
          },
          {
            id: 'bm_2',
            parentId: null,
            title: 'Wikipedia',
            url: 'https://en.wikipedia.org/wiki/Web_browser',
            isFolder: false,
            createdAt: now - 160000,
            order: 2,
          },
          {
            id: 'bm_3',
            parentId: 'bm_folder_dev',
            title: 'MDN Web Docs',
            url: 'https://developer.mozilla.org',
            isFolder: false,
            createdAt: now - 140000,
            order: 3,
          },
          {
            id: 'bm_4',
            parentId: 'bm_folder_dev',
            title: 'Hacker News',
            url: 'https://news.ycombinator.com',
            isFolder: false,
            createdAt: now - 120000,
            order: 4,
          },
        ],
    history: isWork
      ? []
      : [
          {
            id: 'hist_seed_1',
            url: 'https://example.com',
            title: 'Example Domain',
            visitedAt: now - 1_800_000,
            visitCount: 3,
          },
          {
            id: 'hist_seed_2',
            url: 'https://developer.mozilla.org',
            title: 'MDN Web Docs',
            visitedAt: now - 90_000_000,
            visitCount: 5,
          },
        ],
    downloads: [
      {
        id: 'dl_seed_1',
        filename: 'SOUL-Browser-Shortcuts.txt',
        url: '/api/sample-file?kind=guide',
        fileType: 'text/plain',
        totalBytes: 512,
        receivedBytes: 512,
        speedBps: 0,
        state: 'completed',
        startedAt: now - 3_600_000,
        completedAt: now - 3_599_000,
        saveLocation: 'C:\\Users\\Soumadip\\Downloads\\SOUL-Browser-Shortcuts.txt',
      },
    ],
    shortcuts: [
      { id: 'sc_1', title: 'Example', url: 'https://example.com' },
      { id: 'sc_2', title: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Web_browser' },
      { id: 'sc_3', title: 'MDN Docs', url: 'https://developer.mozilla.org' },
      { id: 'sc_4', title: 'Hacker News', url: 'https://news.ycombinator.com' },
      { id: 'sc_5', title: 'Electron', url: 'https://www.electronjs.org' },
      { id: 'sc_6', title: 'Desktop Source', url: 'soul://architecture' },
    ],
    sitePermissions: [
      {
        origin: 'https://example.com',
        permissions: {
          notifications: 'deny',
          location: 'deny',
          javascript: 'allow',
        },
      },
    ],
    defaultPermissions: {
      camera: 'ask',
      microphone: 'ask',
      location: 'ask',
      notifications: 'ask',
      clipboard: 'ask',
      popups: 'deny',
      javascript: 'allow',
      automaticDownloads: 'ask',
    },
    credentials: [],
    addresses: [
      {
        id: 'addr_1',
        fullName: 'Soumadip Biswas',
        street: 'Orbit Innovation Park',
        city: 'Kolkata',
        postalCode: '700091',
        country: 'India',
        phone: '+91 00000 00000',
      },
    ],
    extensions: [
      {
        id: 'ext_soul_shield',
        name: 'SOUL Tracker Shield (Built-in)',
        version: '1.0.0',
        description: 'Enforces session-level tracking protection and third-party cookie isolation.',
        enabled: true,
        pinnedToToolbar: true,
        permissions: ['declarativeNetRequest', 'privacy'],
        author: 'SOUL — Soumadip Orbit Universal Labs',
        mvVersion: 3,
        notes: 'Built into SOUL Browser core session rules.',
      },
      {
        id: 'ext_unpacked_note',
        name: 'Unpacked Chromium Extension Loader',
        version: '1.0.0',
        description: 'Electron session.loadExtension() compatibility bridge for Manifest V3 local extensions.',
        enabled: true,
        pinnedToToolbar: false,
        permissions: ['activeTab', 'storage'],
        author: 'SOUL Desktop Runtime',
        mvVersion: 3,
        notes: 'Full Chrome Web Store runtime APIs are not bundled; load compatible unpacked MV3 extensions on Windows desktop.',
      },
    ],
    notes: [
      {
        id: 'note_1',
        title: 'SOUL Browser v1.0 Checklist',
        body: 'Verify Tab Groups, Split View, Reader Mode, and Windows 11 NSIS installer configuration.',
        updatedAt: now - 7_200_000,
      },
    ],
    tasks: [
      { id: 'task_1', text: 'Test Ctrl+Shift+N private window isolation', done: true, createdAt: now - 10_000_000 },
      { id: 'task_2', text: 'Export bookmarks as Netscape HTML', done: false, createdAt: now - 5_000_000 },
    ],
    settings: {
      ...DEFAULT_BROWSER_SETTINGS,
      accentColor: isWork ? '#885DFF' : '#4A8DFF',
      newTab: { ...DEFAULT_BROWSER_SETTINGS.newTab },
    },
  };
}
