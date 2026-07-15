/**
 * CloakBin crypto — AES-256-GCM with optional PBKDF2 password derivation.
 *
 * Combined ciphertext format (v1):
 *   [0x43, 0x42]  "CB" magic
 *   [0x01]        version
 *   IV (12 bytes)
 *   ciphertext + GCM tag (16 bytes appended by WebCrypto)
 *
 * Legacy (no magic): IV(12) || ciphertext+tag, plaintext not gzipped.
 */

import { gzipSync, gunzipSync } from 'fflate';

const MAGIC = new Uint8Array([0x43, 0x42]); // "CB"
const VERSION = 0x01;
const IV_LEN = 12;
const SALT_LEN = 16;
const KEY_LEN = 32;
const PBKDF2_ITERATIONS = 600000;

function getCrypto() {
  return globalThis.crypto;
}

/** raw bytes -> standard base64 (with padding) */
export function toBase64(bytes) {
  return Buffer.from(bytes).toString('base64');
}

/** standard base64 -> Uint8Array */
export function fromBase64(str) {
  return new Uint8Array(Buffer.from(str, 'base64'));
}

/** raw 32-byte key -> base64url (no padding, +→-, /→_) */
export function keyToBase64url(keyBytes) {
  return toBase64(keyBytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** base64url -> raw key bytes */
export function keyFromBase64url(str) {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) b64 += '=';
  return fromBase64(b64);
}

async function importAesKey(rawKeyBytes) {
  return getCrypto().subtle.importKey(
    'raw',
    rawKeyBytes,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Derive AES-GCM key from password via PBKDF2-SHA256 (600k iterations).
 * saltBytes: 16 random bytes
 */
export async function deriveKeyFromPassword(password, saltBytes) {
  const crypto = getCrypto();
  const pwKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    pwKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt plaintext string.
 * Returns { contentBase64, keyBase64url?, saltBase64? }
 * - Random-key mode: keyBase64url set, no salt
 * - Password mode: pass password string; saltBase64 set, no keyBase64url
 */
export async function encrypt(plaintext, { password } = {}) {
  const crypto = getCrypto();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));

  let key;
  let keyBytes = null;
  let saltBase64 = null;

  if (password != null && password !== '') {
    const saltBytes = crypto.getRandomValues(new Uint8Array(SALT_LEN));
    saltBase64 = toBase64(saltBytes);
    key = await deriveKeyFromPassword(password, saltBytes);
  } else {
    keyBytes = crypto.getRandomValues(new Uint8Array(KEY_LEN));
    key = await importAesKey(keyBytes);
  }

  // plaintext -> UTF-8 -> gzip level 6 -> AES-GCM
  const plainBytes = new TextEncoder().encode(plaintext);
  const compressed = gzipSync(plainBytes, { level: 6 });
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, compressed)
  );

  // combined = magic(2) + version(1) + IV(12) + ciphertext+tag
  const combined = new Uint8Array(2 + 1 + IV_LEN + ciphertext.length);
  combined[0] = MAGIC[0];
  combined[1] = MAGIC[1];
  combined[2] = VERSION;
  combined.set(iv, 3);
  combined.set(ciphertext, 3 + IV_LEN);

  const result = { contentBase64: toBase64(combined) };
  if (keyBytes) result.keyBase64url = keyToBase64url(keyBytes);
  if (saltBase64) result.saltBase64 = saltBase64;
  return result;
}

/**
 * Decrypt contentBase64 from server.
 * opts: { keyBase64url } for random-key mode, or { password, saltBase64 } for password mode.
 */
export async function decrypt(contentBase64, opts = {}) {
  const crypto = getCrypto();
  const combined = fromBase64(contentBase64);

  let iv;
  let ciphertext;
  let isNewFormat = false;

  // New format: magic "CB" + version 0x01
  if (
    combined.length >= 3 + IV_LEN &&
    combined[0] === MAGIC[0] &&
    combined[1] === MAGIC[1] &&
    combined[2] === VERSION
  ) {
    isNewFormat = true;
    iv = combined.subarray(3, 3 + IV_LEN);
    ciphertext = combined.subarray(3 + IV_LEN);
  } else {
    // Legacy: IV(12) || ciphertext+tag, no gzip
    if (combined.length < IV_LEN) {
      throw new Error('ciphertext too short');
    }
    iv = combined.subarray(0, IV_LEN);
    ciphertext = combined.subarray(IV_LEN);
  }

  let key;
  if (opts.password != null && opts.password !== '') {
    if (!opts.saltBase64) throw new Error('password mode requires salt');
    const saltBytes = fromBase64(opts.saltBase64);
    key = await deriveKeyFromPassword(opts.password, saltBytes);
  } else if (opts.keyBase64url) {
    const keyBytes = keyFromBase64url(opts.keyBase64url);
    key = await importAesKey(keyBytes);
  } else {
    throw new Error('missing decryption key or password');
  }

  let plainBytes;
  try {
    plainBytes = new Uint8Array(
      await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
    );
  } catch {
    throw new Error('decryption failed — wrong key/password or corrupted data');
  }

  if (isNewFormat) {
    plainBytes = gunzipSync(plainBytes);
  }

  return new TextDecoder().decode(plainBytes);
}
