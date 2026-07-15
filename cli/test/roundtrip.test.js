/**
 * Offline round-trip tests — no network.
 * Run: node test/roundtrip.test.js
 */

import assert from 'node:assert/strict';
import {
  encrypt,
  decrypt,
  keyToBase64url,
  keyFromBase64url,
  toBase64,
  fromBase64,
} from '../src/crypto.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed++;
      console.log(`  ok  ${name}`);
    })
    .catch((err) => {
      failed++;
      console.error(`  FAIL ${name}`);
      console.error(`       ${err.message}`);
      if (err.stack) console.error(err.stack.split('\n').slice(1, 3).join('\n'));
    });
}

async function run() {
  console.log('cloakbin round-trip tests\n');

  await test('key base64url encode/decode round-trip', () => {
    const raw = new Uint8Array(32);
    for (let i = 0; i < 32; i++) raw[i] = i * 7 + 3;
    const encoded = keyToBase64url(raw);
    assert.ok(!encoded.includes('+'), 'no +');
    assert.ok(!encoded.includes('/'), 'no /');
    assert.ok(!encoded.includes('='), 'no padding');
    const decoded = keyFromBase64url(encoded);
    assert.equal(decoded.length, 32);
    assert.deepEqual(decoded, raw);
  });

  await test('key base64url handles +/ characters', () => {
    // craft bytes that produce + and / in standard base64
    const raw = fromBase64('+/+/+/+/+/+/+/+/+/+/+/+/+/+/+/+/+/+/+/+/+/+/=');
    // ensure we have 32 bytes-ish — pad/slice
    const key = new Uint8Array(32);
    key.set(raw.subarray(0, Math.min(32, raw.length)));
    const encoded = keyToBase64url(key);
    assert.ok(!/[+/=]/.test(encoded));
    const back = keyFromBase64url(encoded);
    assert.deepEqual(back, key);
  });

  await test('random-key encrypt → decrypt equality', async () => {
    const plain = 'Hello, CloakBin! 🔐\nLine two.\n';
    const { contentBase64, keyBase64url, saltBase64 } = await encrypt(plain);
    assert.ok(contentBase64, 'content present');
    assert.ok(keyBase64url, 'key present');
    assert.equal(saltBase64, undefined, 'no salt in random-key mode');
    const out = await decrypt(contentBase64, { keyBase64url });
    assert.equal(out, plain);
  });

  await test('random-key empty-ish and unicode', async () => {
    const plain = 'αβγ 日本語 emoji 🎉 zero\u0000byte';
    const { contentBase64, keyBase64url } = await encrypt(plain);
    const out = await decrypt(contentBase64, { keyBase64url });
    assert.equal(out, plain);
  });

  await test('password mode encrypt → decrypt equality', async () => {
    const plain = 'secret password-protected payload';
    const password = 'correct horse battery staple';
    const { contentBase64, keyBase64url, saltBase64 } = await encrypt(plain, { password });
    assert.ok(contentBase64);
    assert.equal(keyBase64url, undefined, 'no key fragment in password mode');
    assert.ok(saltBase64, 'salt present');
    // salt is standard base64
    assert.ok(/^[A-Za-z0-9+/]+=*$/.test(saltBase64));
    const out = await decrypt(contentBase64, { password, saltBase64 });
    assert.equal(out, plain);
  });

  await test('password mode wrong password fails', async () => {
    const { contentBase64, saltBase64 } = await encrypt('x', { password: 'right' });
    await assert.rejects(
      () => decrypt(contentBase64, { password: 'wrong', saltBase64 }),
      /decrypt/i
    );
  });

  await test('combined format byte layout (magic/version/IV)', async () => {
    const plain = 'layout-check';
    const { contentBase64 } = await encrypt(plain);
    const combined = fromBase64(contentBase64);

    // magic "CB"
    assert.equal(combined[0], 0x43, 'magic[0] = C');
    assert.equal(combined[1], 0x42, 'magic[1] = B');
    // version
    assert.equal(combined[2], 0x01, 'version = 0x01');
    // IV is 12 bytes at offset 3; ciphertext+tag follows (at least 16 tag bytes)
    assert.ok(combined.length >= 3 + 12 + 16, 'min length magic+ver+iv+tag');
    // IV region should not be all zeros (extremely unlikely with CSPRNG)
    const iv = combined.subarray(3, 15);
    const allZero = iv.every((b) => b === 0);
    assert.ok(!allZero, 'IV should be random non-zero');
    // content field is STANDARD base64 (may contain +, /, =)
    assert.ok(/^[A-Za-z0-9+/]+=*$/.test(contentBase64), 'standard base64');
  });

  await test('legacy format decrypt (no magic, no gunzip)', async () => {
    // Build legacy: IV(12) || AES-GCM(plaintext)  — plaintext NOT gzipped
    const crypto = globalThis.crypto;
    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    const plain = 'legacy plaintext';
    const plainBytes = new TextEncoder().encode(plain);
    const ct = new Uint8Array(
      await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plainBytes)
    );
    const combined = new Uint8Array(12 + ct.length);
    combined.set(iv, 0);
    combined.set(ct, 12);
    const contentBase64 = toBase64(combined);
    const keyBase64url = keyToBase64url(keyBytes);

    // must NOT look like new format
    assert.ok(!(combined[0] === 0x43 && combined[1] === 0x42 && combined[2] === 0x01));

    const out = await decrypt(contentBase64, { keyBase64url });
    assert.equal(out, plain);
  });

  await test('toBase64 / fromBase64 round-trip', () => {
    const bytes = new Uint8Array([0, 1, 2, 255, 128, 64]);
    assert.deepEqual(fromBase64(toBase64(bytes)), bytes);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
