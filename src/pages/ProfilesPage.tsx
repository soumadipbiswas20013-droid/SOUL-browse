import React, { useState } from 'react';
import { UserPlus, Check, Trash2, Edit3 } from 'lucide-react';
import type { BrowserProfile } from '../browser/types';

interface ProfilesPageProps {
  profiles: BrowserProfile[];
  activeProfileId: string;
  onSwitchProfile: (id: string) => void;
  onCreateProfile: (name: string, accentColor: string) => void;
  onUpdateProfile: (id: string, name: string) => void;
  onDeleteProfile: (id: string) => void;
}

const ACCENTS = ['#4A8DFF', '#885DFF', '#10B981', '#F59E0B', '#EC4899'];

export const ProfilesPage: React.FC<ProfilesPageProps> = ({
  profiles,
  activeProfileId,
  onSwitchProfile,
  onCreateProfile,
  onUpdateProfile,
  onDeleteProfile,
}) => {
  const [name, setName] = useState('');
  const [accent, setAccent] = useState('#4A8DFF');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-[#08090D] text-slate-900 dark:text-[#F5F7FF] p-6">
      <div className="max-w-4xl mx-auto space-y-6 text-xs">
        <div className="pb-6 border-b border-slate-200 dark:border-white/10">
          <h1 className="font-display text-2xl font-bold">Browser Profiles</h1>
          <p className="text-slate-500 dark:text-[#9AA3B5] mt-1">
            Each profile maintains isolated bookmarks, history, settings, passwords, and Electron session partitions.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            onCreateProfile(name.trim(), accent);
            setName('');
          }}
          className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101525] flex flex-wrap items-center gap-3"
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New profile name (e.g. Research)"
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#08090D]"
          />
          <div className="flex items-center gap-1.5">
            {ACCENTS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setAccent(c)}
                aria-label={`Select accent color ${c}`}
                className={`w-6 h-6 rounded-full border-2 ${
                  accent === c ? 'border-white ring-2 ring-[#4A8DFF]' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-white font-medium inline-flex items-center gap-1.5"
            style={{ backgroundColor: accent }}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Profile</span>
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {profiles.map((prof) => {
            const isActive = prof.id === activeProfileId;
            return (
              <div
                key={prof.id}
                className={`p-4 rounded-xl border bg-white dark:bg-[#101525] flex items-center justify-between gap-4 ${
                  isActive
                    ? 'border-[#4A8DFF]'
                    : 'border-slate-200 dark:border-white/10'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={prof.avatar}
                    alt={prof.name}
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-white/15 shrink-0"
                  />
                  <div className="min-w-0">
                    {editingId === prof.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="px-2 py-1 rounded border border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-[#08090D]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (editName.trim()) onUpdateProfile(prof.id, editName.trim());
                            setEditingId(null);
                          }}
                          className="px-2 py-1 rounded bg-[#4A8DFF] text-white"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="font-display font-semibold text-sm truncate">
                          {prof.name}
                        </div>
                        <div className="text-slate-500 dark:text-[#9AA3B5] font-mono text-[11px]">
                          persist:soul_profile_{prof.id}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onSwitchProfile(prof.id)}
                    className={`px-3 py-1.5 rounded-lg font-medium inline-flex items-center gap-1 ${
                      isActive
                        ? 'bg-[#4A8DFF]/15 text-[#4A8DFF]'
                        : 'bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15'
                    }`}
                  >
                    {isActive && <Check className="w-3.5 h-3.5" />}
                    <span>{isActive ? 'Active' : 'Switch'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(prof.id);
                      setEditName(prof.name);
                    }}
                    className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500"
                    aria-label={`Edit profile ${prof.name}`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  {profiles.length > 1 && prof.id !== 'default' && (
                    <button
                      type="button"
                      onClick={() => onDeleteProfile(prof.id)}
                      className="p-1.5 rounded hover:bg-red-500/10 text-slate-400 hover:text-red-500"
                      aria-label={`Delete profile ${prof.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
