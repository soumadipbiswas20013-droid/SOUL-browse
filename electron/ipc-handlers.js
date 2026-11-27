const { BrowserWindow } = require('electron');
const path = require('path');

function assertString(val, maxLen = 2048) {
  if (typeof val !== 'string' || val.length > maxLen) {
    throw new Error('Invalid IPC string argument');
  }
  return val;
}

function assertSafeHttpUrl(rawUrl) {
  const parsed = new URL(assertString(rawUrl, 4096));
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`Disallowed URL protocol: ${parsed.protocol}`);
  }
  return parsed.toString();
}

function registerIpcHandlers({
  ipcMain,
  windows,
  storage,
  shell,
  createBrowserWindow,
  createTabView,
  layoutActiveView,
}) {
  ipcMain.handle('soul:window-minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });

  ipcMain.handle('soul:window-maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });

  ipcMain.handle('soul:window-close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });

  ipcMain.handle('soul:window-new-private', () => {
    createBrowserWindow({ isPrivate: true, profileId: 'private' });
  });

  ipcMain.handle('soul:tab-create', (event, { tabId, url }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    const safeId = assertString(tabId, 128);
    const safeUrl = url && /^https?:\/\//i.test(url) ? assertSafeHttpUrl(url) : '';
    createTabView(win.id, safeId, safeUrl);
  });

  ipcMain.handle('soul:tab-activate', (event, { tabId, visible }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const state = win ? windows.get(win.id) : null;
    if (!state) return;
    state.activeTabId = visible ? assertString(tabId, 128) : null;
    for (const [id, view] of state.views.entries()) {
      view.setVisible(visible && id === state.activeTabId);
    }
    if (visible) layoutActiveView(win.id);
  });

  ipcMain.handle('soul:tab-close', (event, { tabId }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const state = win ? windows.get(win.id) : null;
    if (!state) return;
    const view = state.views.get(assertString(tabId, 128));
    if (view) {
      state.win.contentView.removeChildView(view);
      view.webContents.close();
      state.views.delete(tabId);
    }
  });

  ipcMain.handle('soul:tab-navigate', (event, { tabId, url }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const state = win ? windows.get(win.id) : null;
    if (!state) return;
    const safeId = assertString(tabId, 128);
    const safeUrl = assertSafeHttpUrl(url);
    let view = state.views.get(safeId);
    if (!view) {
      view = createTabView(win.id, safeId, safeUrl);
    } else {
      view.webContents.loadURL(safeUrl);
    }
  });

  ipcMain.handle('soul:tab-back', (event, { tabId }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const view = windows.get(win?.id)?.views.get(assertString(tabId, 128));
    if (view?.webContents.canGoBack()) view.webContents.goBack();
  });

  ipcMain.handle('soul:tab-forward', (event, { tabId }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const view = windows.get(win?.id)?.views.get(assertString(tabId, 128));
    if (view?.webContents.canGoForward()) view.webContents.goForward();
  });

  ipcMain.handle('soul:tab-reload', (event, { tabId }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const view = windows.get(win?.id)?.views.get(assertString(tabId, 128));
    view?.webContents.reload();
  });

  ipcMain.handle('soul:tab-stop', (event, { tabId }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const view = windows.get(win?.id)?.views.get(assertString(tabId, 128));
    view?.webContents.stop();
  });

  ipcMain.handle('soul:tab-zoom', (event, { tabId, zoomFactor }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const view = windows.get(win?.id)?.views.get(assertString(tabId, 128));
    if (view && typeof zoomFactor === 'number' && zoomFactor >= 0.25 && zoomFactor <= 3) {
      view.webContents.setZoomFactor(zoomFactor);
    }
  });

  ipcMain.handle('soul:tab-find', (event, { tabId, text, options }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const view = windows.get(win?.id)?.views.get(assertString(tabId, 128));
    if (!view) return;
    if (!text) view.webContents.stopFindInPage('clearSelection');
    else view.webContents.findInPage(assertString(text, 256), options || {});
  });

  ipcMain.handle('soul:tab-mute', (event, { tabId, muted }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const view = windows.get(win?.id)?.views.get(assertString(tabId, 128));
    view?.webContents.setAudioMuted(Boolean(muted));
  });

  ipcMain.handle('soul:tab-print', (event, { tabId }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const view = windows.get(win?.id)?.views.get(assertString(tabId, 128));
    view?.webContents.print();
  });

  ipcMain.handle('soul:tab-devtools', (event, { tabId }) => {
    if (process.env.NODE_ENV !== 'development') return;
    const win = BrowserWindow.fromWebContents(event.sender);
    const view = windows.get(win?.id)?.views.get(assertString(tabId, 128));
    view?.webContents.openDevTools({ mode: 'detach' });
  });

  ipcMain.handle('soul:layout-update', (event, { chromeHeight, sidebarWidth, sidebarLeft }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const state = win ? windows.get(win.id) : null;
    if (!state) return;
    if (typeof chromeHeight === 'number') state.chromeHeight = chromeHeight;
    if (typeof sidebarWidth === 'number') state.sidebarWidth = sidebarWidth;
    if (typeof sidebarLeft === 'number') state.sidebarLeft = sidebarLeft;
    layoutActiveView(win.id);
  });

  ipcMain.handle('soul:storage-get-state', (_, { profileId }) => {
    return storage.getState(assertString(profileId || 'default', 64));
  });

  ipcMain.handle('soul:storage-save-bookmark', (_, { profileId, bookmark }) => {
    storage.saveBookmark(assertString(profileId || 'default', 64), bookmark);
  });

  ipcMain.handle('soul:storage-delete-bookmark', (_, { profileId, id }) => {
    storage.deleteBookmark(assertString(profileId || 'default', 64), assertString(id, 128));
  });

  ipcMain.handle('soul:storage-clear-history', (_, { profileId, cutoff }) => {
    storage.clearHistory(assertString(profileId || 'default', 64), Number(cutoff) || 0);
  });

  ipcMain.handle('soul:password-save', (_, { profileId, entry }) => {
    storage.saveCredential(assertString(profileId || 'default', 64), entry);
  });

  ipcMain.handle('soul:password-list', (_, { profileId }) => {
    return storage.listCredentials(assertString(profileId || 'default', 64));
  });

  ipcMain.handle('soul:password-delete', (_, { profileId, id }) => {
    storage.deleteCredential(assertString(profileId || 'default', 64), assertString(id, 128));
  });

  ipcMain.handle('soul:download-open', (_, { savePath }) => {
    const resolved = path.resolve(assertString(savePath, 1024));
    return shell.openPath(resolved);
  });

  ipcMain.handle('soul:download-show', (_, { savePath }) => {
    const resolved = path.resolve(assertString(savePath, 1024));
    shell.showItemInFolder(resolved);
  });

  ipcMain.handle('soul:extension-load', async (event, { folderPath }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const state = win ? windows.get(win.id) : null;
    if (!state) return null;
    const ext = await state.session.loadExtension(path.resolve(assertString(folderPath, 1024)), {
      allowFileAccess: false,
    });
    return { id: ext.id, name: ext.name, version: ext.version };
  });

  ipcMain.handle('soul:about-info', () => ({
    appVersion: '1.0.0',
    electron: process.versions.electron,
    chromium: process.versions.chrome,
    node: process.versions.node,
    v8: process.versions.v8,
    platform: process.platform,
    arch: process.arch,
  }));
}

module.exports = { registerIpcHandlers };
