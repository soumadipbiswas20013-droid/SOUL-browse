const { app, BrowserWindow, WebContentsView, session, ipcMain, Menu, safeStorage, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { createStorage } = require('./storage');
const { registerIpcHandlers } = require('./ipc-handlers');

const isDev = process.env.NODE_ENV === 'development';
const CHROME_TOP_OFFSET = 114; // Title bar (36px) + Tab bar (40px) + Nav bar (38px)

let storage = null;
const windows = new Map(); // windowId -> { win, isPrivate, profileId, views: Map<tabId, WebContentsView>, activeTabId }

function getPartition(profileId, isPrivate) {
  if (isPrivate) {
    return `temp:soul_private_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
  return `persist:soul_profile_${profileId || 'default'}`;
}

function configureSessionSecurity(ses, isPrivate, store) {
  // Enforce strict permission checks rather than silent grants
  ses.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const origin = details.requestingUrl ? new URL(details.requestingUrl).origin : '';
    const saved = store.getSitePermission(origin, permission);
    if (saved === 'allow') return callback(true);
    if (saved === 'deny') return callback(false);
    // Notify renderer shell to prompt user explicitly; default deny until user decides
    const ownerWin = BrowserWindow.fromWebContents(webContents);
    if (ownerWin) {
      ownerWin.webContents.send('soul:permission-prompt', { origin, permission });
    }
    callback(false);
  });

  // Never allow insecure certificate bypasses
  ses.setCertificateVerifyProc((request, callback) => {
    callback(-3); // Defer to Chromium's strict native certificate verification
  });

  // Download Manager integration (never auto-executes downloaded files)
  ses.on('will-download', (event, item, webContents) => {
    const downloadId = `dl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const settings = store.getSettings();
    const downloadsDir = settings.downloadPath || app.getPath('downloads');
    const safeName = path.basename(item.getFilename() || 'download.bin');
    let targetPath = path.join(downloadsDir, safeName);

    // Duplicate filename resolution
    let counter = 1;
    const ext = path.extname(safeName);
    const stem = path.basename(safeName, ext);
    while (fs.existsSync(targetPath)) {
      targetPath = path.join(downloadsDir, `${stem} (${counter})${ext}`);
      counter += 1;
    }

    if (!settings.askBeforeDownloading) {
      item.setSavePath(targetPath);
    }

    const record = {
      id: downloadId,
      filename: path.basename(targetPath),
      url: item.getURL(),
      mimeType: item.getMimeType(),
      totalBytes: item.getTotalBytes(),
      receivedBytes: 0,
      state: 'progressing',
      savePath: targetPath,
      startedAt: Date.now(),
      isPrivate,
    };

    if (!isPrivate) {
      store.upsertDownload(record);
    }

    BrowserWindow.getAllWindows().forEach((bw) => {
      bw.webContents.send('soul:download-updated', record);
    });

    item.on('updated', (_, state) => {
      record.receivedBytes = item.getReceivedBytes();
      record.totalBytes = item.getTotalBytes();
      record.state = state === 'interrupted' ? 'interrupted' : (item.isPaused() ? 'paused' : 'progressing');
      if (!isPrivate) store.upsertDownload(record);
      BrowserWindow.getAllWindows().forEach((bw) => {
        bw.webContents.send('soul:download-updated', record);
      });
    });

    item.once('done', (_, state) => {
      record.receivedBytes = item.getReceivedBytes();
      record.state = state === 'completed' ? 'completed' : state === 'cancelled' ? 'cancelled' : 'failed';
      record.completedAt = Date.now();
      if (!isPrivate) store.upsertDownload(record);
      BrowserWindow.getAllWindows().forEach((bw) => {
        bw.webContents.send('soul:download-updated', record);
      });
    });
  });
}

function createBrowserWindow({ isPrivate = false, profileId = 'default' } = {}) {
  const win = new BrowserWindow({
    width: 1400,
    height: 880,
    minWidth: 960,
    minHeight: 620,
    frame: false,
    backgroundColor: '#08090D',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  const partition = getPartition(profileId, isPrivate);
  const ses = session.fromPartition(partition);
  configureSessionSecurity(ses, isPrivate, storage);

  const winState = {
    win,
    isPrivate,
    profileId,
    partition,
    session: ses,
    views: new Map(),
    activeTabId: null,
    chromeHeight: CHROME_TOP_OFFSET,
    sidebarLeft: 0,
    sidebarWidth: 0,
  };
  windows.set(win.id, winState);

  const distIndexPath = path.join(__dirname, '../dist/index.html');
  const useDevUrl = isDev || !fs.existsSync(distIndexPath);

  // Strict CSP on Browser Shell UI (allows Vite inline module preamble in dev mode)
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const scriptSrc = useDevUrl ? "script-src 'self' 'unsafe-inline'" : "script-src 'self'";
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          `default-src 'self'; ${scriptSrc}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' http://localhost:3000 https:;`,
        ],
      },
    });
  });

  if (useDevUrl) {
    win.loadURL(`http://localhost:3000/?electron=1&private=${isPrivate ? '1' : '0'}&profile=${encodeURIComponent(profileId)}`);
    win.webContents.once('did-fail-load', () => {
      const fallbackHtml = encodeURIComponent(
        '<!doctype html><html><body style="font-family:system-ui;background:#08090D;color:#F5F7FF;padding:40px"><h2>SOUL Browser Desktop Shell</h2><p>Start the Vite server (<code>npm run dev</code> in the project root) or build the UI bundle (<code>npm run build</code>) before launching Electron.</p></body></html>'
      );
      win.loadURL(`data:text/html;charset=utf-8,${fallbackHtml}`);
    });
  } else {
    win.loadFile(distIndexPath, {
      query: { electron: '1', private: isPrivate ? '1' : '0', profile: profileId },
    });
  }

  win.on('resize', () => layoutActiveView(win.id));
  win.on('maximize', () => win.webContents.send('soul:window-state', { maximized: true }));
  win.on('unmaximize', () => win.webContents.send('soul:window-state', { maximized: false }));

  win.on('closed', () => {
    if (isPrivate) {
      ses.clearStorageData().catch(() => {});
    }
    windows.delete(win.id);
  });

  return win;
}

function layoutActiveView(windowId) {
  const state = windows.get(windowId);
  if (!state || !state.activeTabId) return;
  const view = state.views.get(state.activeTabId);
  if (!view) return;
  const [width, height] = state.win.getContentSize();
  const left = Math.max(0, state.sidebarLeft || 0);
  const right = Math.max(0, state.sidebarWidth || 0);
  view.setBounds({
    x: left,
    y: state.chromeHeight,
    width: Math.max(320, width - left - right),
    height: Math.max(200, height - state.chromeHeight),
  });
}

function createTabView(windowId, tabId, url) {
  const state = windows.get(windowId);
  if (!state) return null;

  const view = new WebContentsView({
    webPreferences: {
      partition: state.partition,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  state.views.set(tabId, view);
  state.win.contentView.addChildView(view);

  const wc = view.webContents;

  wc.on('did-start-loading', () => {
    state.win.webContents.send('soul:tab-event', { tabId, type: 'loading', isLoading: true });
  });

  wc.on('did-stop-loading', () => {
    state.win.webContents.send('soul:tab-event', {
      tabId,
      type: 'loading',
      isLoading: false,
      canGoBack: wc.canGoBack(),
      canGoForward: wc.canGoForward(),
    });
  });

  wc.on('page-title-updated', (_, title) => {
    state.win.webContents.send('soul:tab-event', { tabId, type: 'title', title });
  });

  wc.on('did-navigate', (_, navUrl) => {
    if (!state.isPrivate && /^https?:\/\//i.test(navUrl)) {
      storage.addHistoryEntry(state.profileId, { url: navUrl, title: wc.getTitle() || navUrl });
    }
    state.win.webContents.send('soul:tab-event', {
      tabId,
      type: 'navigate',
      url: navUrl,
      canGoBack: wc.canGoBack(),
      canGoForward: wc.canGoForward(),
    });
  });

  wc.on('page-favicon-updated', (_, favicons) => {
    if (favicons && favicons[0]) {
      state.win.webContents.send('soul:tab-event', { tabId, type: 'favicon', favicon: favicons[0] });
    }
  });

  wc.on('did-fail-load', (_, errorCode, errorDescription, validatedURL) => {
    if (errorCode === -3) return; // Aborted navigation
    state.win.webContents.send('soul:tab-event', {
      tabId,
      type: 'error',
      errorCode,
      errorDescription,
      url: validatedURL,
    });
  });

  wc.setWindowOpenHandler(({ url: targetUrl }) => {
    state.win.webContents.send('soul:open-url-in-new-tab', { url: targetUrl });
    return { action: 'deny' };
  });

  if (url && /^https?:\/\//i.test(url)) {
    wc.loadURL(url);
  }

  return view;
}

app.whenReady().then(() => {
  const userDataDir = app.getPath('userData');
  storage = createStorage(path.join(userDataDir, 'soul-browser.db'), safeStorage);

  registerIpcHandlers({
    ipcMain,
    app,
    windows,
    storage,
    shell,
    createBrowserWindow,
    createTabView,
    layoutActiveView,
  });

  createBrowserWindow({ isPrivate: false, profileId: 'default' });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createBrowserWindow({ isPrivate: false, profileId: 'default' });
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
