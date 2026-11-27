# SOUL Browser
**By SOUL — Soumadip Orbit Universal Labs**  
Lead Architect: Soumadip Biswas

SOUL Browser is a Chromium-based desktop web browser engineered for Windows 11, powered by Electron `WebContentsView`, isolated profile & private session partitions, OS-backed credential encryption (`safeStorage`), and a customizable dark-first interface.

---

## Architecture & Stages

1. **Stage 1 — Architecture & Project Structure**: Strict process separation (`main.js` + `preload.js` + React UI shell), `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
2. **Stage 2 — Chromium Engine & Navigation**: Native `WebContentsView` per tab, HTTP/HTTPS navigation, TLS certificate verification, and browser error states.
3. **Stage 3 — Tabs & Smart Omnibox**: Horizontal/vertical/compact tab modes, tab groups, drag-and-drop, pinned/muted tabs, search engine detection, and keyboard navigation.
4. **Stage 4 — New Tab & Visual Identity**: Customizable wallpaper, shortcuts, clock, optional privacy-conscious weather, and SOUL brand palette (`#08090D`, `#101525`, `#4A8DFF`, `#885DFF`).
5. **Stage 5 — Bookmarks, History & Downloads**: SQLite persistence (`better-sqlite3`), Netscape HTML import/export, date-grouped history, and `will-download` tracking.
6. **Stage 6 — Privacy, Permissions & Private Mode**: Per-origin permission gatekeeper, third-party cookie/tracking controls, and ephemeral `temp:` session partitions.
7. **Stage 7 — Profiles, Passwords & Extensions**: Isolated `persist:` profile partitions, OS-encrypted credentials, and unpacked Chromium MV3 extension loading.
8. **Stage 8 — Productivity & Optional SOUL AI**: Split View, Reader Mode, Notes, Tasks, Calculator, and opt-in SOUL AI sidebar.
9. **Stage 9 — Testing & Optimization**: Lightweight UI tuned for Intel Core i3 8th Gen / 8 GB RAM / Intel UHD 630 / Windows 11.
10. **Stage 10 — Windows 11 Packaging**: NSIS installer via `electron-builder`.

---

## Running on Windows 11 (PowerShell)

### 1. Run the Browser Shell + Web Engine (Development)
```powershell
npm install
npm run build
npm run dev
```

### 2. Run the Native Electron + Chromium Desktop Browser
```powershell
cd electron
npm install
cd ..
npm run build
cd electron
$env:NODE_ENV="development"
npm start
```

### 3. Build Windows 11 Installer (`SOUL-Browser-Setup-1.0.0-win64.exe`)
```powershell
npm run build
cd electron
npm run build:win
```
The signed/unpacked installer is emitted to `release/SOUL-Browser-Setup-1.0.0-win64.exe`.
To uninstall on Windows 11, open **Settings > Apps > Installed Apps > SOUL Browser > Uninstall**.
