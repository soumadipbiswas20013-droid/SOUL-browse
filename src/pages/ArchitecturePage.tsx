import React, { useEffect, useState } from 'react';
import { Copy, Check, FileCode, Terminal } from 'lucide-react';

interface DesktopFile {
  path: string;
  content: string;
}

const STAGES = [
  'Stage 1: Architecture, process isolation (contextIsolation: true, sandbox: true), and project structure.',
  'Stage 2: Electron main process (electron/main.js) with Chromium WebContentsView tab rendering and TLS enforcement.',
  'Stage 3: Multi-tab management (horizontal, vertical, compact, groups, drag-and-drop) and Smart Omnibox.',
  'Stage 4: New Tab Page with custom wallpapers, clock, shortcuts, and SOUL visual identity.',
  'Stage 5: Bookmarks (Netscape HTML import/export), date-grouped History, and will-download Manager.',
  'Stage 6: Privacy & Security Center, per-origin permissions, and isolated Private Browsing.',
  'Stage 7: Multi-profile session partitions, PBKDF2/AES-GCM & safeStorage password vault, and MV3 extensions.',
  'Stage 8: Productivity tools (Split View, Reader Mode, Notes, Tasks, Calculator) and opt-in SOUL AI.',
  'Stage 9: Performance tuning for Intel Core i3 8th Gen / 8 GB RAM / Intel UHD 630 / Windows 11.',
  'Stage 10: Windows 11 NSIS installer packaging via electron-builder.yml.',
];

export const ArchitecturePage: React.FC = () => {
  const [files, setFiles] = useState<DesktopFile[]>([]);
  const [activePath, setActivePath] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/electron-files')
      .then((r) => r.json())
      .then((d: { files?: DesktopFile[] }) => {
        if (d.files && d.files.length > 0) {
          setFiles(d.files);
          setActivePath(d.files[0].path);
        }
      })
      .catch(() => {});
  }, []);

  const currentFile = files.find((f) => f.path === activePath);

  const handleCopy = async () => {
    if (!currentFile) return;
    await navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-[#08090D] text-slate-900 dark:text-[#F5F7FF] p-6">
      <div className="max-w-5xl mx-auto space-y-6 text-xs">
        <div className="pb-6 border-b border-slate-200 dark:border-white/10">
          <h1 className="font-display text-2xl font-bold">
            SOUL Browser — Chromium Desktop Architecture & Windows 11 Build
          </h1>
          <p className="text-slate-500 dark:text-[#9AA3B5] mt-1">
            Inspect the complete Electron + Chromium desktop source files and Windows 11 PowerShell build workflow included in this repository.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101525] space-y-2">
            <h2 className="font-display font-semibold text-sm">10-Stage Engineering Plan</h2>
            <ul className="space-y-1.5 text-slate-600 dark:text-[#D5DCF0]">
              {STAGES.map((s) => (
                <li key={s} className="leading-relaxed">
                  {s}
                </li>
              ))}
            </ul>
          </section>

          <section className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101525] space-y-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#4A8DFF]" />
              <h2 className="font-display font-semibold text-sm">Windows 11 PowerShell Commands</h2>
            </div>
            <pre className="p-3 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto leading-relaxed">
{`# 1. Build UI shell
npm install
npm run build

# 2. Install & run native Electron Chromium browser
cd electron
npm install
$env:NODE_ENV="development"
npm start

# 3. Package Windows 11 NSIS installer
npm run build:win`}
            </pre>
          </section>
        </div>

        {/* Source File Inspector */}
        <section className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101525] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {files.map((f) => (
                <button
                  key={f.path}
                  type="button"
                  onClick={() => setActivePath(f.path)}
                  className={`px-2.5 py-1 rounded-md font-mono text-[11px] flex items-center gap-1.5 ${
                    activePath === f.path
                      ? 'bg-[#4A8DFF] text-white'
                      : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-[#D5DCF0]'
                  }`}
                >
                  <FileCode className="w-3 h-3" />
                  <span>{f.path}</span>
                </button>
              ))}
            </div>
            {currentFile && (
              <button
                type="button"
                onClick={handleCopy}
                className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-white/15 inline-flex items-center gap-1"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy File'}</span>
              </button>
            )}
          </div>
          <pre className="p-4 max-h-[460px] overflow-auto font-mono text-[11px] leading-relaxed bg-[#08090D] text-[#E2E8F0]">
            {currentFile?.content || 'Loading desktop source files...'}
          </pre>
        </section>
      </div>
    </div>
  );
};
