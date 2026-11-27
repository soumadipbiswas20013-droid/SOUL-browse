import React, { useEffect, useState } from 'react';
import { SoulLogo } from '../components/SoulLogo';

interface AboutPageProps {
  accentColor: string;
  onOpenArchitecture: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ accentColor, onOpenArchitecture }) => {
  const [desktopVersions, setDesktopVersions] = useState<{
    appVersion?: string;
    electron?: string;
    chromium?: string;
    node?: string;
  } | null>(null);

  useEffect(() => {
    if (window.soulAPI?.about) {
      window.soulAPI.about.getInfo().then(setDesktopVersions).catch(() => {});
    }
  }, []);

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-[#08090D] text-slate-900 dark:text-[#F5F7FF] p-6">
      <div className="max-w-3xl mx-auto space-y-6 text-xs">
        <div className="p-6 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101525] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <SoulLogo size={48} accentColor={accentColor} />
            <div>
              <h1 className="font-display text-2xl font-bold">SOUL Browser</h1>
              <p className="text-slate-500 dark:text-[#9AA3B5] mt-0.5">
                By SOUL — Soumadip Orbit Universal Labs · Created by Soumadip Biswas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenArchitecture}
            className="px-4 py-2 rounded-lg text-white font-medium"
            style={{ backgroundColor: accentColor }}
          >
            Inspect Electron & Windows 11 Build
          </button>
        </div>

        <section className="p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101525] space-y-3">
          <h2 className="font-display font-semibold text-base">Version & Engine Runtime</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 tabular-nums">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#08090D] border border-slate-200 dark:border-white/10">
              <div className="text-slate-500 dark:text-[#9AA3B5]">Application Version</div>
              <div className="font-mono font-medium mt-0.5">
                {desktopVersions?.appVersion || '1.0.0'}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#08090D] border border-slate-200 dark:border-white/10">
              <div className="text-slate-500 dark:text-[#9AA3B5]">Chromium / Electron Target</div>
              <div className="font-mono font-medium mt-0.5">
                {desktopVersions
                  ? `Electron ${desktopVersions.electron} · Chromium ${desktopVersions.chromium}`
                  : 'Electron 35.1.2 · Chromium (Desktop Build)'}
              </div>
            </div>
          </div>
          <p className="text-slate-500 dark:text-[#9AA3B5]">
            Update status: Automatic remote updates are not configured in this local build. New releases are packaged via electron-builder for Windows 11.
          </p>
        </section>

        <section className="p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101525] space-y-2">
          <h2 className="font-display font-semibold text-base">Privacy Commitment</h2>
          <p className="text-slate-600 dark:text-[#D5DCF0] leading-relaxed">
            SOUL Browser stores bookmarks, history, notes, tasks, and encrypted credentials locally on your device. Typed search queries are never transmitted before submission unless you explicitly enable Search Suggestions. Optional SOUL AI features transmit current page context only when you opt in and never automatically in Private Browsing mode.
          </p>
        </section>

        <section className="p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101525] space-y-2">
          <h2 className="font-display font-semibold text-base">Open-Source Acknowledgements & License</h2>
          <p className="text-slate-600 dark:text-[#D5DCF0] leading-relaxed">
            Licensed under Apache-2.0. Built on open-source technologies including Chromium, Electron, Node.js, React, Tailwind CSS, Lucide Icons, and SQLite (better-sqlite3).
          </p>
        </section>
      </div>
    </div>
  );
};
