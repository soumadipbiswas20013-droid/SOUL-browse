import React, { useState } from 'react';
import {
  KeyRound,
  Lock,
  Unlock,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  Search,
  Download,
  MapPin,
} from 'lucide-react';
import type { AutofillAddress, EncryptedCredential } from '../browser/types';
import { decryptSecret, encryptSecret, hashVerifier } from '../browser/crypto';
import { evaluatePasswordStrength } from '../browser/engine';

interface PasswordsPageProps {
  profileId: string;
  credentials: EncryptedCredential[];
  addresses: AutofillAddress[];
  accentColor: string;
  onSaveCredential: (cred: EncryptedCredential) => void;
  onDeleteCredential: (id: string) => void;
  onAddAddress: (addr: AutofillAddress) => void;
  onDeleteAddress: (id: string) => void;
}

export const PasswordsPage: React.FC<PasswordsPageProps> = ({
  profileId,
  credentials,
  addresses,
  accentColor,
  onSaveCredential,
  onDeleteCredential,
  onAddAddress,
  onDeleteAddress,
}) => {
  const verifierStorageKey = `soul_vault_verifier_${profileId}`;
  const [hasMaster, setHasMaster] = useState(() => Boolean(localStorage.getItem(verifierStorageKey)));
  const [unlockedPasscode, setUnlockedPasscode] = useState<string | null>(null);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [vaultError, setVaultError] = useState('');

  const [origin, setOrigin] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [search, setSearch] = useState('');
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [confirmExport, setConfirmExport] = useState(false);

  const [addrName, setAddrName] = useState('');
  const [addrStreet, setAddrStreet] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrZip, setAddrZip] = useState('');

  const handleSetMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passcodeInput.length < 6) {
      setVaultError('Master passcode must be at least 6 characters.');
      return;
    }
    const verifier = await hashVerifier(passcodeInput, profileId);
    localStorage.setItem(verifierStorageKey, verifier);
    setHasMaster(true);
    setUnlockedPasscode(passcodeInput);
    setPasscodeInput('');
    setVaultError('');
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const expected = localStorage.getItem(verifierStorageKey);
    const candidate = await hashVerifier(passcodeInput, profileId);
    if (candidate !== expected) {
      setVaultError('Incorrect master passcode.');
      return;
    }
    setUnlockedPasscode(passcodeInput);
    setPasscodeInput('');
    setVaultError('');
  };

  const handleAddCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockedPasscode || !origin.trim() || !username.trim() || !password) return;
    const { iv, cipherText } = await encryptSecret(password, unlockedPasscode, profileId);
    onSaveCredential({
      id: `cred_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      origin: origin.trim(),
      username: username.trim(),
      iv,
      cipherText,
      updatedAt: Date.now(),
    });
    setOrigin('');
    setUsername('');
    setPassword('');
  };

  const toggleReveal = async (cred: EncryptedCredential) => {
    if (!unlockedPasscode) return;
    if (revealed[cred.id]) {
      setRevealed((prev) => {
        const next = { ...prev };
        delete next[cred.id];
        return next;
      });
      return;
    }
    try {
      const plain = await decryptSecret(cred.iv, cred.cipherText, unlockedPasscode, profileId);
      setRevealed((prev) => ({ ...prev, [cred.id]: plain }));
    } catch {
      setVaultError('Could not decrypt entry with active master passcode.');
    }
  };

  const handleExportConfirmed = async () => {
    if (!unlockedPasscode) return;
    const rows = ['origin,username,password'];
    for (const cred of credentials) {
      try {
        const plain = await decryptSecret(cred.iv, cred.cipherText, unlockedPasscode, profileId);
        rows.push(`"${cred.origin}","${cred.username}","${plain.replace(/"/g, '""')}"`);
      } catch {
        // Skip entries from different keys
      }
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'soul-passwords-export.csv';
    a.click();
    URL.revokeObjectURL(url);
    setConfirmExport(false);
  };

  const filteredCreds = credentials.filter(
    (c) =>
      !search.trim() ||
      c.origin.toLowerCase().includes(search.toLowerCase()) ||
      c.username.toLowerCase().includes(search.toLowerCase())
  );

  const strength = password ? evaluatePasswordStrength(password) : null;

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-[#08090D] text-slate-900 dark:text-[#F5F7FF] p-6">
      <div className="max-w-4xl mx-auto space-y-8 text-xs">
        <div className="pb-6 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Passwords & Autofill</h1>
            <p className="text-slate-500 dark:text-[#9AA3B5] mt-1">
              Encrypted locally with PBKDF2 + AES-256-GCM (or Electron OS safeStorage on desktop). Plain-text passwords are never persisted.
            </p>
          </div>
          {unlockedPasscode && (
            <button
              type="button"
              onClick={() => {
                setUnlockedPasscode(null);
                setRevealed({});
              }}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#101525] inline-flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock Vault</span>
            </button>
          )}
        </div>

        {/* Vault Gate */}
        {!unlockedPasscode ? (
          <section className="p-6 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101525] max-w-md space-y-4">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#4A8DFF]" />
              <h2 className="font-display font-semibold text-base">
                {hasMaster ? 'Unlock Password Vault' : 'Create Master Passcode'}
              </h2>
            </div>
            <p className="text-slate-500 dark:text-[#9AA3B5] leading-relaxed">
              {hasMaster
                ? 'Enter your master passcode to decrypt, view, add, or export saved credentials.'
                : 'Set a master passcode (minimum 6 characters) to derive your local AES-GCM encryption key.'}
            </p>
            <form onSubmit={hasMaster ? handleUnlock : handleSetMaster} className="space-y-3">
              <input
                type="password"
                value={passcodeInput}
                onChange={(e) => setPasscodeInput(e.target.value)}
                placeholder="Master passcode"
                aria-label="Master passcode"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#08090D]"
              />
              {vaultError && <p className="text-red-500">{vaultError}</p>}
              <button
                type="submit"
                className="w-full py-2 rounded-lg text-white font-medium inline-flex items-center justify-center gap-1.5"
                style={{ backgroundColor: accentColor }}
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>{hasMaster ? 'Unlock Vault' : 'Initialize Encrypted Vault'}</span>
              </button>
            </form>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search saved credentials..."
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#101525]"
                />
              </div>
              {credentials.length > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmExport(true)}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#101525] inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Passwords</span>
                </button>
              )}
            </div>

            {confirmExport && (
              <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 flex flex-wrap items-center justify-between gap-3">
                <span>
                  Exporting saves your decrypted passwords in a plain-text CSV file. Continue only on a trusted drive.
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmExport(false)}
                    className="px-3 py-1.5 rounded border border-slate-300 dark:border-white/20"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExportConfirmed}
                    className="px-3 py-1.5 rounded bg-amber-600 text-white font-medium"
                  >
                    Confirm Export
                  </button>
                </div>
              </div>
            )}

            <form
              onSubmit={handleAddCredential}
              className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101525] space-y-3"
            >
              <div className="font-medium">Save Credential (with your consent)</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="Website (e.g. github.com)"
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#08090D]"
                />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username or email"
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#08090D]"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#08090D]"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-[#9AA3B5]">
                  {strength ? `Password strength: ${strength.label}` : 'Stored encrypted with AES-256-GCM.'}
                </span>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-white font-medium inline-flex items-center gap-1"
                  style={{ backgroundColor: accentColor }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save Encrypted</span>
                </button>
              </div>
            </form>

            {filteredCreds.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101525] text-slate-500 dark:text-[#9AA3B5]">
                No saved credentials yet.
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101525] divide-y divide-slate-200 dark:divide-white/10">
                {filteredCreds.map((cred) => (
                  <div key={cred.id} className="p-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 dark:text-white">{cred.origin}</div>
                      <div className="text-slate-500 dark:text-[#9AA3B5] flex items-center gap-2 mt-0.5">
                        <span>{cred.username}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">
                          {revealed[cred.id] ? revealed[cred.id] : '••••••••••••'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleReveal(cred)}
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/10"
                        aria-label={revealed[cred.id] ? 'Hide password' : 'Reveal password'}
                      >
                        {revealed[cred.id] ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteCredential(cred.id)}
                        className="p-1.5 rounded hover:bg-red-500/10 text-slate-400 hover:text-red-500"
                        aria-label={`Delete password for ${cred.origin}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Address Autofill Section */}
        <section className="p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101525] space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#4A8DFF]" />
            <h2 className="font-display font-semibold text-base">Address Autofill Profiles</h2>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!addrName.trim() || !addrStreet.trim()) return;
              onAddAddress({
                id: `addr_${Date.now()}`,
                fullName: addrName.trim(),
                street: addrStreet.trim(),
                city: addrCity.trim(),
                postalCode: addrZip.trim(),
                country: 'India',
                phone: '',
              });
              setAddrName('');
              setAddrStreet('');
              setAddrCity('');
              setAddrZip('');
            }}
            className="grid grid-cols-1 sm:grid-cols-5 gap-2"
          >
            <input
              type="text"
              value={addrName}
              onChange={(e) => setAddrName(e.target.value)}
              placeholder="Full name"
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#08090D]"
            />
            <input
              type="text"
              value={addrStreet}
              onChange={(e) => setAddrStreet(e.target.value)}
              placeholder="Street address"
              className="sm:col-span-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#08090D]"
            />
            <input
              type="text"
              value={addrCity}
              onChange={(e) => setAddrCity(e.target.value)}
              placeholder="City"
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#08090D]"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg text-white font-medium"
              style={{ backgroundColor: accentColor }}
            >
              Add Address
            </button>
          </form>

          <div className="divide-y divide-slate-200 dark:divide-white/10">
            {addresses.map((a) => (
              <div key={a.id} className="py-2.5 flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{a.fullName}</div>
                  <div className="text-slate-500 dark:text-[#9AA3B5]">
                    {a.street} · {a.city} {a.postalCode}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteAddress(a.id)}
                  className="p-1.5 rounded hover:bg-red-500/10 text-slate-400 hover:text-red-500"
                  aria-label={`Delete address for ${a.fullName}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
