const KDF_ITERATIONS = 600000;

const bytesToB64 = (bytes) => btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''));

const b64ToBytes = (s) => Uint8Array.from(atob(s), (ch) => ch.charCodeAt(0));

const vaultAvailable = () =>
  Boolean(globalThis.crypto?.subtle && globalThis.crypto?.getRandomValues);

async function deriveVaultKey(pass, salt, iterations = KDF_ITERATIONS) {
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

async function encryptVault(payload, key, salt, iterations = KDF_ITERATIONS) {
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
