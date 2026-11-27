const { contextBridge, ipcRenderer } = require('electron');

const VALID_INVOKE_CHANNELS = new Set([
  'soul:window-minimize',
  'soul:window-maximize',
  'soul:window-close',
  'soul:window-new-private',
  'soul:tab-create',
  'soul:tab-activate',
  'soul:tab-close',
  'soul:tab-navigate',
  'soul:tab-back',
  'soul:tab-forward',
  'soul:tab-reload',
  'soul:tab-stop',
  'soul:tab-zoom',
  'soul:tab-find',
  'soul:tab-mute',
  'soul:tab-print',
  'soul:tab-devtools',
  'soul:layout-update',
  'soul:storage-get-state',
  'soul:storage-save-bookmark',
  'soul:storage-delete-bookmark',
  'soul:storage-clear-history',
  'soul:password-save',
  'soul:password-list',
  'soul:password-delete',
  'soul:download-open',
  'soul:download-show',
  'soul:extension-load',
  'soul:about-info',
]);

function safeInvoke(channel, payload) {
  if (!VALID_INVOKE_CHANNELS.has(channel)) {
    return Promise.reject(new Error(`Blocked unauthorized IPC channel: ${channel}`));
  }
  return ipcRenderer.invoke(channel, payload);
}

function safeOn(channel, listener) {
  const allowedEvents = new Set([
    'soul:tab-event',
    'soul:download-updated',
    'soul:permission-prompt',
    'soul:window-state',
    'soul:open-url-in-new-tab',
  ]);
  if (!allowedEvents.has(channel)) {
    throw new Error(`Blocked unauthorized IPC event listener: ${channel}`);
  }
  const wrapped = (_, data) => listener(data);
  ipcRenderer.on(channel, wrapped);
  return () => ipcRenderer.removeListener(channel, wrapped);
}

contextBridge.exposeInMainWorld('soulAPI', {
  isElectron: true,
  window: {
    minimize: () => safeInvoke('soul:window-minimize'),
    toggleMaximize: () => safeInvoke('soul:window-maximize'),
    close: () => safeInvoke('soul:window-close'),
    openPrivateWindow: () => safeInvoke('soul:window-new-private'),
  },
  tabs: {
    create: (tabId, url) => safeInvoke('soul:tab-create', { tabId, url }),
    activate: (tabId, visible) => safeInvoke('soul:tab-activate', { tabId, visible }),
    close: (tabId) => safeInvoke('soul:tab-close', { tabId }),
    navigate: (tabId, url) => safeInvoke('soul:tab-navigate', { tabId, url }),
    goBack: (tabId) => safeInvoke('soul:tab-back', { tabId }),
    goForward: (tabId) => safeInvoke('soul:tab-forward', { tabId }),
    reload: (tabId) => safeInvoke('soul:tab-reload', { tabId }),
    stop: (tabId) => safeInvoke('soul:tab-stop', { tabId }),
    setZoom: (tabId, zoomFactor) => safeInvoke('soul:tab-zoom', { tabId, zoomFactor }),
    findInPage: (tabId, text, options) => safeInvoke('soul:tab-find', { tabId, text, options }),
    setMuted: (tabId, muted) => safeInvoke('soul:tab-mute', { tabId, muted }),
    print: (tabId) => safeInvoke('soul:tab-print', { tabId }),
    openDevTools: (tabId) => safeInvoke('soul:tab-devtools', { tabId }),
  },
  layout: {
    updateBounds: (chromeHeight, sidebarWidth, sidebarLeft = 0) =>
      safeInvoke('soul:layout-update', { chromeHeight, sidebarWidth, sidebarLeft }),
  },
  storage: {
    getState: (profileId) => safeInvoke('soul:storage-get-state', { profileId }),
    saveBookmark: (profileId, bookmark) => safeInvoke('soul:storage-save-bookmark', { profileId, bookmark }),
    deleteBookmark: (profileId, id) => safeInvoke('soul:storage-delete-bookmark', { profileId, id }),
    clearHistory: (profileId, range) => safeInvoke('soul:storage-clear-history', { profileId, range }),
  },
  passwords: {
    save: (profileId, entry) => safeInvoke('soul:password-save', { profileId, entry }),
    list: (profileId) => safeInvoke('soul:password-list', { profileId }),
    delete: (profileId, id) => safeInvoke('soul:password-delete', { profileId, id }),
  },
  downloads: {
    openFile: (savePath) => safeInvoke('soul:download-open', { savePath }),
    showInFolder: (savePath) => safeInvoke('soul:download-show', { savePath }),
  },
  extensions: {
    loadUnpacked: (folderPath) => safeInvoke('soul:extension-load', { folderPath }),
  },
  about: {
    getInfo: () => safeInvoke('soul:about-info'),
  },
  on: safeOn,
});
