import React, { useState } from 'react';
import { Shield, Lock, RotateCcw, Trash2 } from 'lucide-react';
import type {
  BrowserSettings,
  PermissionDecision,
  PermissionType,
  SitePermissionEntry,
  TrackingProtectionLevel,
} from '../browser/types';

interface PrivacySecurityPageProps {
  settings: BrowserSettings;
  defaultPermissions: Record<PermissionType, PermissionDecision>;
  sitePermissions: SitePermissionEntry[];
  onUpdateSettings: (patch: Partial<BrowserSettings>) => void;
  onUpdateDefaultPermission: (perm: PermissionType, decision: PermissionDecision) => void;
  onUpdateSitePermission: (origin: string, perm: PermissionType, decision: PermissionDecision) => void;
  onResetPermissions: () => void;
  onClearAllSiteData: () => void;
}

const PERMISSION_LABELS: Array<{ key: PermissionType; label: string }> = [
  { key: 'camera', label: 'Camera' },
  { key: 'microphone', label: 'Microphone' },
  { key: 'location', label: 'Location' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'clipboard', label: 'Clipboard' },
  { key: 'popups', label: 'Pop-ups & Redirects' },
  { key: 'javascript', label: 'JavaScript' },
  { key: 'automaticDownloads', label: 'Automatic Downloads' },
];

export const PrivacySecurityPage: React.FC<PrivacySecurityPageProps> = ({
  settings,
  defaultPermissions,
  sitePermissions,
  onUpdateSettings,
  onUpdateDefaultPermission,
  onUpdateSitePermission,
  onResetPermissions,
  onClearAllSiteData,
}) => {
  const [newOrigin, setNewOrigin] = useState('');
  const [clearedNotice, setClearedNotice] = useState('');

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-[#08090D] text-slate-900 dark:text-[#F5F7FF] p-6">
      <div className="max-w-4xl mx-auto space-y-8 text-xs">
        <div className="pb-6 border-b border-slate-200 dark:border-white/10">
          <h1 className="font-display text-2xl font-bold">Privacy & Security Center</h1>
          <p className="text-slate-500 dark:text-[#9AA3B5] mt-1">
            Control cookies, tracking protection, HTTPS enforcement, and per-origin site permissions.
          </p>
        </div>

        {/* Tracking & Cookies */}
        <section className="p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101525] space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#4A8DFF]" />
            <h2 className="font-display font-semibold text-base">Tracking & Cookie Controls</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {(['standard', 'strict', 'custom'] as TrackingProtectionLevel[]).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => onUpdateSettings({ trackingProtection: lvl })}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  settings.trackingProtection === lvl
                    ? 'border-[#4A8DFF] bg-[#4A8DFF]/10'
                    : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                <div className="font-semibold capitalize">{lvl} Protection</div>
                <div className="text-slate-500 dark:text-[#9AA3B5] mt-0.5">
                  {lvl === 'standard'
                    ? 'Blocks known cross-site trackers.'
                    : lvl === 'strict'
                    ? 'Isolates third-party storage and blocks trackers.'
                    : 'Use manual cookie and permission rules below.'}
                </div>
              </button>
            ))}
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-white/10">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="font-medium">Block third-party cookies</div>
                <div className="text-slate-500 dark:text-[#9AA3B5]">
                  Prevents cross-site tracking cookies in Electron session partitions.
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.blockThirdPartyCookies}
                onChange={(e) => onUpdateSettings({ blockThirdPartyCookies: e.target.checked })}
                className="accent-[#4A8DFF]"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="font-medium">Send &ldquo;Do Not Track&rdquo; header</div>
                <div className="text-slate-500 dark:text-[#9AA3B5]">
                  Requests websites not to track your browsing activity.
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.sendDoNotTrack}
                onChange={(e) => onUpdateSettings({ sendDoNotTrack: e.target.checked })}
                className="accent-[#4A8DFF]"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="font-medium">HTTPS-Only Mode</div>
                <div className="text-slate-500 dark:text-[#9AA3B5]">
                  Upgrades plain HTTP domain entries to HTTPS when possible. Certificate validation is never bypassed.
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.httpsOnlyMode}
                onChange={(e) => onUpdateSettings({ httpsOnlyMode: e.target.checked })}
                className="accent-[#4A8DFF]"
              />
            </label>
          </div>
        </section>

        {/* Default Site Permissions */}
        <section className="p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101525] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#4A8DFF]" />
              <h2 className="font-display font-semibold text-base">Default Site Permissions</h2>
            </div>
            <button
              type="button"
              onClick={onResetPermissions}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10 inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Permissions</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PERMISSION_LABELS.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-white/10"
              >
                <span className="font-medium">{item.label}</span>
                <select
                  aria-label={`Default permission for ${item.label}`}
                  value={defaultPermissions[item.key]}
                  onChange={(e) =>
                    onUpdateDefaultPermission(item.key, e.target.value as PermissionDecision)
                  }
                  className="px-2 py-1 rounded border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#08090D]"
                >
                  <option value="ask">Ask</option>
                  <option value="allow">Allow</option>
                  <option value="deny">Block</option>
                </select>
              </div>
            ))}
          </div>
        </section>

        {/* Per-Site Permission Overrides */}
        <section className="p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101525] space-y-4">
          <h2 className="font-display font-semibold text-base">Per-Site Overrides</h2>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newOrigin.trim()) return;
              onUpdateSitePermission(newOrigin.trim(), 'notifications', 'deny');
              setNewOrigin('');
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={newOrigin}
              onChange={(e) => setNewOrigin(e.target.value)}
              placeholder="Add origin (e.g. https://example.com)"
              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#08090D]"
            />
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-[#4A8DFF] text-white font-medium"
            >
              Add Site Rule
            </button>
          </form>

          {sitePermissions.length === 0 ? (
            <p className="text-slate-500 dark:text-[#9AA3B5]">No per-site overrides configured.</p>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-white/10">
              {sitePermissions.map((site) => (
                <div key={site.origin} className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <span className="font-mono font-medium">{site.origin}</span>
                  <div className="flex flex-wrap gap-2">
                    {(['notifications', 'location', 'camera'] as PermissionType[]).map((perm) => (
                      <label key={perm} className="flex items-center gap-1.5">
                        <span className="capitalize text-slate-500 dark:text-[#9AA3B5]">{perm}:</span>
                        <select
                          value={site.permissions[perm] || defaultPermissions[perm]}
                          onChange={(e) =>
                            onUpdateSitePermission(
                              site.origin,
                              perm,
                              e.target.value as PermissionDecision
                            )
                          }
                          className="px-2 py-1 rounded border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#08090D]"
                        >
                          <option value="ask">Ask</option>
                          <option value="allow">Allow</option>
                          <option value="deny">Block</option>
                        </select>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Website Storage & Data Clearing */}
        <section className="p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101525] flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display font-semibold text-base">Clear Website Data & History</h2>
            <p className="text-slate-500 dark:text-[#9AA3B5] mt-0.5">
              Clears stored browsing history and cached website state for the active profile.
            </p>
            {clearedNotice && <p className="text-emerald-500 mt-1">{clearedNotice}</p>}
          </div>
          <button
            type="button"
            onClick={() => {
              onClearAllSiteData();
              setClearedNotice('Browsing history and cached site state cleared for this profile.');
            }}
            className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-500 inline-flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Data Now</span>
          </button>
        </section>
      </div>
    </div>
  );
};
