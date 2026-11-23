import type { VaultBlob, VaultData } from '../../../shared/domain/types.ts';

const KDF_ITERATIONS = 600000;

const bytesToB64 = (bytes: Uint8Array): string =>
  btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''));

const b64ToBytes = (s: string): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(atob(s), (ch) => ch.charCodeAt(0));

const vaultAvailable = (): boolean =>
  Boolean(globalThis.crypto?.subtle && globalThis.crypto?.getRandomValues);

async function deriveVaultKey(
  pass: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number = KDF_ITERATIONS,
): Promise<CryptoKey> {
  const raw = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pass),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    raw,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encryptVault(
  payload: VaultData,
  key: CryptoKey,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number = KDF_ITERATIONS,
): Promise<VaultBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const input = new TextEncoder().encode(JSON.stringify(payload));
  const enc = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    input,
  );
  return {
    version: 1,
    alg: 'AES-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations,
    salt: bytesToB64(salt),
    iv: bytesToB64(iv),
    cipher: bytesToB64(new Uint8Array(enc)),
  };
}

export { b64ToBytes, deriveVaultKey, encryptVault, vaultAvailable };
