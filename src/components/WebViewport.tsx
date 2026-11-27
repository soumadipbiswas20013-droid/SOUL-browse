import React from 'react';
import {
  WifiOff,
  ShieldAlert,
  RotateCw,
  BookOpen,
  Code2,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import type {
  AutofillAddress,
  BookmarkItem,
  BrowserProfile,
  BrowserSettings,
  BrowserTab,
  ClosedTabEntry,
  DownloadItem,
  EncryptedCredential,
  ExtensionItem,
  HistoryEntry,
  PermissionDecision,
  PermissionType,
  SearchEngineId,
  ShortcutItem,
  SitePermissionEntry,
} from '../browser/types';
import { NewTabPage } from '../pages/NewTabPage';
import { BookmarksPage } from '../pages/BookmarksPage';
import { HistoryPage } from '../pages/HistoryPage';
import { DownloadsPage } from '../pages/DownloadsPage';
import { PrivacySecurityPage } from '../pages/PrivacySecurityPage';
import { PasswordsPage } from '../pages/PasswordsPage';
import { ExtensionsPage } from '../pages/ExtensionsPage';
import { ProfilesPage } from '../pages/ProfilesPage';
import { SettingsPage } from '../pages/SettingsPage';
import { AboutPage } from '../pages/AboutPage';
import { ArchitecturePage } from '../pages/ArchitecturePage';

interface WebViewportProps {
  tab: BrowserTab;
  isPrivate: boolean;
  isElectronNative: boolean;
  settings: BrowserSettings;
  profiles: BrowserProfile[];
  activeProfileId: string;
  bookmarks: BookmarkItem[];
  history: HistoryEntry[];
  downloads: DownloadItem[];
  shortcuts: ShortcutItem[];
  closedTabs: ClosedTabEntry[];
  defaultPermissions: Record<PermissionType, PermissionDecision>;
  sitePermissions: SitePermissionEntry[];
  credentials: EncryptedCredential[];
  addresses: AutofillAddress[];
  extensions: ExtensionItem[];
  openTabsCount: number;
  findQuery: string;
  onNavigate: (input: string, tabId?: string) => void;
  onOpenInNewTab: (url: string) => void;
  onReload: (tabId: string) => void;
  onChangeSearchEngine: (engine: SearchEngineId) => void;
  onAddShortcut: (title: string, url: string) => void;
  onDeleteShortcut: (id: string) => void;
  onReopenClosed: () => void;
  onUpdateNewTabConfig: (patch: Partial<BrowserSettings['newTab']>) => void;
  onAddBookmark: (title: string, url: string, parentId: string | null) => void;
  onAddFolder: (title: string, parentId: string | null) => void;
  onUpdateBookmark: (id: string, patch: Partial<BookmarkItem>) => void;
  onDeleteBookmark: (id: string) => void;
  onImportBookmarks: (items: BookmarkItem[]) => void;
  onDeleteHistoryEntry: (id: string) => void;
  onDeleteHistoryDomain: (hostname: string) => void;
  onClearHistoryRange: (range: 'hour' | 'day' | 'week' | 'all') => void;
  onStartDownload: (url: string, filename: string, totalBytes?: number) => void;
  onPauseDownloadToggle: (id: string) => void;
  onCancelDownload: (id: string) => void;
  onRetryDownload: (id: string) => void;
  onRemoveDownload: (id: string) => void;
  onClearCompletedDownloads: () => void;
  onUpdateSettings: (patch: Partial<BrowserSettings>) => void;
  onResetDefaults: () => void;
  onUpdateDefaultPermission: (perm: PermissionType, decision: PermissionDecision) => void;
  onUpdateSitePermission: (origin: string, perm: PermissionType, decision: PermissionDecision) => void;
  onResetPermissions: () => void;
  onClearAllSiteData: () => void;
  onSaveCredential: (cred: EncryptedCredential) => void;
  onDeleteCredential: (id: string) => void;
  onAddAddress: (addr: AutofillAddress) => void;
  onDeleteAddress: (id: string) => void;
  onToggleExtensionEnabled: (id: string) => void;
  onToggleExtensionPin: (id: string) => void;
  onRemoveExtension: (id: string) => void;
  onAddUnpackedExtension: (folderPath: string) => void;
  onSwitchProfile: (id: string) => void;
  onCreateProfile: (name: string, accent: string) => void;
  onUpdateProfile: (id: string, name: string) => void;
  onDeleteProfile: (id: string) => void;
  onToggleReaderMode: (tabId: string) => void;
  onToggleViewSource: (tabId: string) => void;
  onWebContextMenu: (e: React.MouseEvent, tabId: string) => void;
}

export const WebViewport: React.FC<WebViewportProps> = (props) => {
  const { tab, isPrivate, isElectronNative, settings, findQuery } = props;
  const route = tab.url.replace(/^soul:\/\//, '').split('?')[0].toLowerCase();

  if (tab.url.startsWith('soul://')) {
    switch (route) {
      case 'bookmarks':
        return (
          <BookmarksPage
            bookmarks={props.bookmarks}
            accentColor={settings.accentColor}
            onAddBookmark={props.onAddBookmark}
            onAddFolder={props.onAddFolder}
            onUpdateBookmark={props.onUpdateBookmark}
            onDeleteBookmark={props.onDeleteBookmark}
            onImportBookmarks={props.onImportBookmarks}
            onOpenInNewTab={props.onOpenInNewTab}
          />
        );
      case 'history':
        return (
          <HistoryPage
            history={props.history}
            isPrivate={isPrivate}
            onOpenInNewTab={props.onOpenInNewTab}
            onDeleteEntry={props.onDeleteHistoryEntry}
            onDeleteDomain={props.onDeleteHistoryDomain}
            onClearByRange={props.onClearHistoryRange}
          />
        );
      case 'downloads':
        return (
          <DownloadsPage
            downloads={props.downloads}
            downloadDirectory={settings.downloadDirectory}
            accentColor={settings.accentColor}
            onStartDownload={props.onStartDownload}
            onPauseToggle={props.onPauseDownloadToggle}
            onCancelDownload={props.onCancelDownload}
            onRetryDownload={props.onRetryDownload}
            onRemoveDownload={props.onRemoveDownload}
            onClearCompleted={props.onClearCompletedDownloads}
            onOpenSettings={() => props.onNavigate('soul://settings', tab.id)}
          />
        );
      case 'privacy':
        return (
          <PrivacySecurityPage
            settings={settings}
            defaultPermissions={props.defaultPermissions}
            sitePermissions={props.sitePermissions}
            onUpdateSettings={props.onUpdateSettings}
            onUpdateDefaultPermission={props.onUpdateDefaultPermission}
            onUpdateSitePermission={props.onUpdateSitePermission}
            onResetPermissions={props.onResetPermissions}
            onClearAllSiteData={props.onClearAllSiteData}
          />
        );
      case 'passwords':
        return (
          <PasswordsPage
            profileId={props.activeProfileId}
            credentials={props.credentials}
            addresses={props.addresses}
            accentColor={settings.accentColor}
            onSaveCredential={props.onSaveCredential}
            onDeleteCredential={props.onDeleteCredential}
            onAddAddress={props.onAddAddress}
            onDeleteAddress={props.onDeleteAddress}
          />
        );
      case 'extensions':
        return (
          <ExtensionsPage
            extensions={props.extensions}
            accentColor={settings.accentColor}
            onToggleEnabled={props.onToggleExtensionEnabled}
            onTogglePin={props.onToggleExtensionPin}
            onRemoveExtension={props.onRemoveExtension}
            onAddUnpackedExtension={props.onAddUnpackedExtension}
          />
        );
      case 'profiles':
        return (
          <ProfilesPage
            profiles={props.profiles}
            activeProfileId={props.activeProfileId}
            onSwitchProfile={props.onSwitchProfile}
            onCreateProfile={props.onCreateProfile}
            onUpdateProfile={props.onUpdateProfile}
            onDeleteProfile={props.onDeleteProfile}
          />
        );
      case 'settings':
        return (
          <SettingsPage
            settings={settings}
            openTabsCount={props.openTabsCount}
            onUpdateSettings={props.onUpdateSettings}
            onResetDefaults={props.onResetDefaults}
            onOpenInternal={(u) => props.onNavigate(u, tab.id)}
          />
        );
      case 'about':
        return (
          <AboutPage
            accentColor={settings.accentColor}
            onOpenArchitecture={() => props.onNavigate('soul://architecture', tab.id)}
          />
        );
      case 'architecture':
        return <ArchitecturePage />;
      case 'newtab':
      default:
        return (
          <NewTabPage
            isPrivate={isPrivate}
            settings={settings}
            shortcuts={props.shortcuts}
            bookmarks={props.bookmarks}
            history={props.history}
            closedTabs={props.closedTabs}
            onNavigate={(input) => props.onNavigate(input, tab.id)}
            onChangeSearchEngine={props.onChangeSearchEngine}
            onAddShortcut={props.onAddShortcut}
            onDeleteShortcut={props.onDeleteShortcut}
            onReopenClosed={props.onReopenClosed}
            onUpdateNewTabConfig={props.onUpdateNewTabConfig}
          />
        );
    }
  }

  // Native Electron WebContentsView sits over this area when running on Windows Desktop
  if (isElectronNative) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#08090D] text-[#9AA3B5] text-xs">
        Chromium WebContentsView active for {tab.url}
      </div>
    );
  }

  // Loading state
  if (tab.isLoading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-white dark:bg-[#08090D] text-slate-600 dark:text-[#9AA3B5] text-xs gap-3">
        <div
          className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: `${settings.accentColor} transparent ${settings.accentColor} ${settings.accentColor}` }}
        />
        <span>Loading {tab.url}...</span>
      </div>
    );
  }

  // Browser Error States
  if (tab.pageData?.error) {
    const err = tab.pageData.error;
    const isCert = err.code === 'ERR_CERT_AUTHORITY_INVALID';
    return (
      <div className="h-full overflow-y-auto bg-slate-50 dark:bg-[#08090D] text-slate-900 dark:text-[#F5F7FF] p-8 flex items-center justify-center">
        <div className="max-w-lg w-full p-6 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#101525] space-y-4">
          <div className="w-11 h-11 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center">
            {isCert ? <ShieldAlert className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
          </div>
          <div>
            <h1 className="font-display text-xl font-bold">
              {isCert ? 'Your connection is not private' : 'This site can’t be reached'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-[#9AA3B5] mt-1.5 leading-relaxed">
              {err.message}
            </p>
            <div className="mt-3 font-mono text-[11px] text-slate-400">{err.code}</div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2 text-xs">
            <button
              type="button"
              onClick={() => props.onReload(tab.id)}
              className="px-4 py-2 rounded-lg text-white font-medium inline-flex items-center gap-1.5"
              style={{ backgroundColor: settings.accentColor }}
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Reload Page</span>
            </button>
            <button
              type="button"
              onClick={() => props.onNavigate('soul://newtab', tab.id)}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10"
            >
              Back to New Tab
            </button>
          </div>
        </div>
      </div>
    );
  }

  // View Page Source
  if (tab.viewSource && tab.pageData?.rawSource !== undefined) {
    return (
      <div className="h-full flex flex-col bg-[#08090D] text-[#E2E8F0]">
        <div className="px-4 py-2 border-b border-white/10 bg-[#101525] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-mono">
            <Code2 className="w-4 h-4 text-[#4A8DFF]" />
            <span>view-source:{tab.url}</span>
          </div>
          <button
            type="button"
            onClick={() => props.onToggleViewSource(tab.id)}
            className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/15"
          >
            Exit Source View
          </button>
        </div>
        <pre className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
          {tab.pageData.rawSource || 'No HTML source available.'}
        </pre>
      </div>
    );
  }

  // Reader Mode
  if (tab.readerMode && tab.pageData?.reader) {
    const reader = tab.pageData.reader;
    return (
      <div className="h-full overflow-y-auto bg-[#F9F6EE] dark:bg-[#0D101B] text-slate-900 dark:text-[#EDEFF5] p-8">
        <article
          className="max-w-2xl mx-auto space-y-5"
          style={{ fontSize: `${Math.round(16 * tab.zoom)}px`, lineHeight: 1.75 }}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#9AA3B5] pb-4 border-b border-slate-200 dark:border-white/10">
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#4A8DFF]" />
              Reader Mode · {reader.wordCount} words
            </span>
            <button
              type="button"
              onClick={() => props.onToggleReaderMode(tab.id)}
              className="text-[#4A8DFF] hover:underline"
            >
              Exit Reader Mode
            </button>
          </div>
          <h1 className="font-display text-3xl font-bold text-balance">{reader.heading}</h1>
          {reader.paragraphs.length === 0 ? (
            <p className="text-sm text-slate-500">
              This page did not contain long-form article paragraphs for Reader Mode.
            </p>
          ) : (
            reader.paragraphs.map((p, idx) => <p key={idx}>{p}</p>)
          )}
        </article>
      </div>
    );
  }

  // Rendered fetched webpage (sanitized HTML with clickable links routed through SOUL Browser)
  const sanitized = tab.pageData?.sanitizedHtml || '';
  const matchCount =
    findQuery && tab.pageData?.reader
      ? tab.pageData.reader.paragraphs.join(' ').toLowerCase().split(findQuery.toLowerCase()).length - 1
      : 0;

  return (
    <div
      className="h-full overflow-y-auto bg-white text-slate-900 relative"
      onContextMenu={(e) => props.onWebContextMenu(e, tab.id)}
      onSubmit={(e) => {
        const form = (e.target as HTMLElement).closest('form');
        if (!form) return;
        e.preventDefault();
        const rawAction =
          form.getAttribute('data-soul-action') ||
          form.getAttribute('action') ||
          tab.pageData?.url ||
          tab.url;
        try {
          const target = new URL(rawAction, tab.pageData?.url || tab.url);
          const formData = new FormData(form);
          for (const [k, v] of formData.entries()) {
            if (typeof v === 'string') {
              target.searchParams.set(k, v);
            }
          }
          props.onNavigate(target.toString(), tab.id);
        } catch {
          // ignore malformed form actions
        }
      }}
      onClick={(e) => {
        const anchor = (e.target as HTMLElement).closest('a');
        if (anchor) {
          const href = anchor.getAttribute('data-soul-href') || anchor.getAttribute('href');
          if (href && /^https?:\/\//i.test(href)) {
            e.preventDefault();
            if (e.ctrlKey || e.metaKey) {
              props.onOpenInNewTab(href);
            } else {
              props.onNavigate(href, tab.id);
            }
          }
        }
      }}
    >
      {/* Subtle Live Fetch Info Banner */}
      <div className="px-4 py-1.5 bg-slate-100 border-b border-slate-200 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
        <span className="truncate">
          Viewing <strong className="font-medium text-slate-800">{tab.pageData?.url || tab.url}</strong>
          {findQuery ? ` · Find matches in text: ${Math.max(0, matchCount)}` : ''}
        </span>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => props.onStartDownload(tab.url, `${tab.title || 'page'}.html`, 4096)}
            className="text-slate-600 hover:text-slate-900 underline"
          >
            Save to Downloads
          </button>
          <a
            href={tab.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[#2563EB] hover:underline"
          >
            <span>Open directly</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {sanitized ? (
        <div
          className="p-6 max-w-4xl mx-auto soul-web-doc [&_img]:max-w-full [&_img]:h-auto [&_a]:text-blue-600 [&_a]:underline [&_table]:border-collapse [&_td]:p-2 [&_th]:p-2"
          style={{ zoom: tab.zoom }}
          dangerouslySetInnerHTML={{ __html: sanitized }}
        />
      ) : (
        <div className="p-10 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
          <AlertCircle className="w-6 h-6 text-slate-400" />
          <span>No document body returned for this address.</span>
        </div>
      )}
    </div>
  );
};
