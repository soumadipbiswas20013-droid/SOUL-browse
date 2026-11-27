export type ThemeMode = 'dark' | 'light' | 'system';
export type TabLayoutMode = 'horizontal' | 'vertical' | 'compact';
export type SearchEngineId = 'bing';
export type TrackingProtectionLevel = 'standard' | 'strict' | 'custom';
export type InterfaceDensity = 'comfortable' | 'compact';

export interface SearchEngineConfig {
  id: SearchEngineId;
  name: string;
  shortcut: string;
  searchUrlTemplate: string;
}

export interface TabGroup {
  id: string;
  title: string;
  color: string;
  collapsed: boolean;
}

export interface BrowserPageData {
  url: string;
  title: string;
  description?: string;
  favicon?: string;
  isHttps?: boolean;
  contentType?: string;
  sanitizedHtml?: string;
  rawSource?: string;
  reader?: {
    heading: string;
    paragraphs: string[];
    wordCount: number;
  };
  headers?: {
    server?: string;
    cacheControl?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface BrowserTab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  pinned: boolean;
  muted: boolean;
  groupId?: string | null;
  color?: string | null;
  isLoading: boolean;
  isSuspended: boolean;
  zoom: number;
  readerMode: boolean;
  viewSource: boolean;
  historyStack: string[];
  historyIndex: number;
  pageData?: BrowserPageData | null;
  lastActiveAt: number;
}

export interface ClosedTabEntry {
  tab: BrowserTab;
  closedAt: number;
}

export interface BookmarkItem {
  id: string;
  parentId: string | null;
  title: string;
  url?: string;
  isFolder: boolean;
  favicon?: string;
  createdAt: number;
  order: number;
}

export interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  visitedAt: number;
  visitCount: number;
}

export interface DownloadItem {
  id: string;
  filename: string;
  url: string;
  fileType: string;
  totalBytes: number;
  receivedBytes: number;
  speedBps: number;
  state: 'progressing' | 'paused' | 'completed' | 'cancelled' | 'failed';
  startedAt: number;
  completedAt?: number;
  saveLocation: string;
  safetyWarning?: string;
}

export type PermissionType =
  | 'camera'
  | 'microphone'
  | 'location'
  | 'notifications'
  | 'clipboard'
  | 'popups'
  | 'javascript'
  | 'automaticDownloads';

export type PermissionDecision = 'ask' | 'allow' | 'deny';

export interface SitePermissionEntry {
  origin: string;
  permissions: Partial<Record<PermissionType, PermissionDecision>>;
}

export interface EncryptedCredential {
  id: string;
  origin: string;
  username: string;
  iv: string;
  cipherText: string;
  updatedAt: number;
}

export interface AutofillAddress {
  id: string;
  fullName: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
}

export interface ExtensionItem {
  id: string;
  name: string;
  version: string;
  description: string;
  enabled: boolean;
  pinnedToToolbar: boolean;
  permissions: string[];
  author: string;
  mvVersion: 3;
  notes?: string;
}

export interface BrowserProfile {
  id: string;
  name: string;
  avatar: string;
  accentColor: string;
  createdAt: number;
}

export interface ShortcutItem {
  id: string;
  title: string;
  url: string;
}

export interface NoteItem {
  id: string;
  title: string;
  body: string;
  updatedAt: number;
}

export interface TaskItem {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
}

export interface NewTabConfig {
  wallpaperId: 'cosmic' | 'nordic' | 'obsidian' | 'custom';
  customWallpaperDataUrl?: string;
  showClock: boolean;
  showGreeting: boolean;
  showShortcuts: boolean;
  showFrequentlyVisited: boolean;
  showBookmarks: boolean;
  showRecentTabs: boolean;
  showWeather: boolean;
  weatherCity: string;
}

export interface BrowserSettings {
  theme: ThemeMode;
  accentColor: string;
  tabLayout: TabLayoutMode;
  interfaceDensity: InterfaceDensity;
  fontSize: 'small' | 'medium' | 'large';
  showBookmarkBar: boolean;
  showHomeButton: boolean;
  startupAnimation: boolean;
  startupBehavior: 'newtab' | 'continue' | 'specific';
  startupUrls: string[];
  searchEngine: SearchEngineId;
  customSearchUrl: string;
  enableSearchSuggestions: boolean;
  downloadDirectory: string;
  askBeforeDownloading: boolean;
  downloadNotifications: boolean;
  trackingProtection: TrackingProtectionLevel;
  blockThirdPartyCookies: boolean;
  sendDoNotTrack: boolean;
  httpsOnlyMode: boolean;
  memorySaverEnabled: boolean;
  hardwareAcceleration: boolean;
  defaultZoom: number;
  reducedMotion: boolean;
  highContrast: boolean;
  language: string;
  spellCheck: boolean;
  translationProvider: 'none' | 'libretranslate';
  newTab: NewTabConfig;
}

export interface ProfileDataStore {
  bookmarks: BookmarkItem[];
  history: HistoryEntry[];
  downloads: DownloadItem[];
  shortcuts: ShortcutItem[];
  sitePermissions: SitePermissionEntry[];
  defaultPermissions: Record<PermissionType, PermissionDecision>;
  credentials: EncryptedCredential[];
  addresses: AutofillAddress[];
  extensions: ExtensionItem[];
  notes: NoteItem[];
  tasks: TaskItem[];
  settings: BrowserSettings;
}

export interface ContextMenuState {
  x: number;
  y: number;
  kind: 'tab' | 'link' | 'image' | 'selection' | 'page' | 'bookmark' | 'download' | 'omnibox';
  tabId?: string;
  url?: string;
  imageUrl?: string;
  selectedText?: string;
  bookmarkId?: string;
  downloadId?: string;
}
