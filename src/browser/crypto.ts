// Real Web Crypto API PBKDF2 + AES-GCM local encryption for Password Manager
// Never stores passwords in plain text in localStorage.

const SALT_PREFIX = 'soul-browser-vault-v1';

async function deriveKey(masterPasscode: string, profileId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(masterPasscode),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(`${SALT_PREFIX}:${profileId}`),
      iterations: 120_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

export async function hashVerifier(masterPasscode: string, profileId: string): Promise<string> {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest(
    'SHA-256',
    enc.encode(`${SALT_PREFIX}:verifier:${profileId}:${masterPasscode}`)
  );
  return toBase64(new Uint8Array(digest));
}

export async function encryptSecret(
  plaintext: string,
  masterPasscode: string,
  profileId: string
): Promise<{ iv: string; cipherText: string }> {
  const key = await deriveKey(masterPasscode, profileId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return {
    iv: toBase64(iv),
    cipherText: toBase64(new Uint8Array(cipherBuffer)),
  };
}

export async function decryptSecret(
  ivB64: string,
  cipherB64: string,
  masterPasscode: string,
  profileId: string
): Promise<string> {
  const key = await deriveKey(masterPasscode, profileId);
  const iv = fromBase64(ivB64);
  const cipherBytes = fromBase64(cipherB64);
  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    key,
    new Uint8Array(cipherBytes)
  );
  return new TextDecoder().decode(plainBuffer);
}
