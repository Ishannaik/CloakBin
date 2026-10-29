/**
 * A burn deletes the paste, so `get --burn` must refuse before burning, never after.
 * Runs the real CLI against a local stub server. Run: node test/burn-safety.test.js
 */

import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const cli = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'cloakbin.js');
let burns = 0;

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url.endsWith('/burn')) burns++;
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ burnAfterRead: true, hasPassword: false, content: null }));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const host = `http://127.0.0.1:${server.address().port}`;

function get(args) {
  // Async spawn: a blocking spawn would also block the stub server above.
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cli, 'get', ...args]);
    let stderr = '';
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (status) => resolve({ status, stderr }));
  });
}

let failed = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL ${name}\n       ${err.message}`);
  }
}

console.log('cloakbin burn safety tests\n');
const existing = join(mkdtempSync(join(tmpdir(), 'cloakbin-')), 'out.txt');
writeFileSync(existing, 'keep me');

await test('an existing --save target is refused before the paste is burned', async () => {
  burns = 0;
  const r = await get([`${host}/abc#${'A'.repeat(43)}`, '--burn', '--save', existing]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /refusing to overwrite/);
  assert.equal(burns, 0);
});

await test('a missing #key is refused before the paste is burned', async () => {
  burns = 0;
  const r = await get([`${host}/abc`, '--burn']);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /missing #key/);
  assert.equal(burns, 0);
});

server.close();
if (failed) process.exit(1);
