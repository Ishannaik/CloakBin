/**
 * Unit tests for lang-detect and duration — no network.
 * Run: node test/units.test.js
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { detectLanguage, LANGUAGE_MAP } from '../src/lang-detect.js';
import { parseDuration, resolveExpiry } from '../src/duration.js';
import { validateHost } from '../src/host.js';

const cliPath = fileURLToPath(new URL('../bin/cloakbin.js', import.meta.url));
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

const LANG_RE = /^[a-zA-Z0-9_-]{1,30}$/;

async function run() {
  console.log('cloakbin unit tests\n');

  // --- detectLanguage ---
  await test('detectLanguage .py → python', () => {
    assert.equal(detectLanguage('script.py'), 'python');
    assert.equal(detectLanguage('/path/to/foo.py'), 'python');
  });

  await test('detectLanguage .ts → typescript', () => {
    assert.equal(detectLanguage('app.ts'), 'typescript');
  });

  await test('detectLanguage .tsx → tsx', () => {
    assert.equal(detectLanguage('Component.tsx'), 'tsx');
  });

  await test('detectLanguage .yml → yaml', () => {
    assert.equal(detectLanguage('config.yml'), 'yaml');
  });

  await test('detectLanguage Dockerfile → dockerfile', () => {
    assert.equal(detectLanguage('Dockerfile'), 'dockerfile');
    assert.equal(detectLanguage('dockerfile'), 'dockerfile');
    assert.equal(detectLanguage('image.dockerfile'), 'dockerfile');
  });

  await test('detectLanguage .SH uppercase → bash', () => {
    assert.equal(detectLanguage('setup.SH'), 'bash');
  });

  await test('detectLanguage unknown ext → null', () => {
    assert.equal(detectLanguage('file.xyzzy'), null);
  });

  await test('detectLanguage no ext → null', () => {
    assert.equal(detectLanguage('README'), null);
    assert.equal(detectLanguage('Makefile'), 'makefile'); // bare name exception
  });

  await test('detectLanguage all map values match LANG_RE', () => {
    for (const [key, val] of Object.entries(LANGUAGE_MAP)) {
      assert.ok(LANG_RE.test(val), `value for ${key}="${val}" must match LANG_RE`);
    }
  });

  // --- parseDuration ---
  await test('parseDuration 45m → 2_700_000', () => {
    assert.equal(parseDuration('45m'), 2_700_000);
  });

  await test('parseDuration 1h → 3_600_000', () => {
    assert.equal(parseDuration('1h'), 3_600_000);
  });

  await test('parseDuration 2h30m → 9_000_000', () => {
    assert.equal(parseDuration('2h30m'), 9_000_000);
  });

  await test('parseDuration 1w2d → 777_600_000', () => {
    assert.equal(parseDuration('1w2d'), 777_600_000);
  });

  await test('parseDuration 90m → 5_400_000', () => {
    assert.equal(parseDuration('90m'), 5_400_000);
  });

  await test('parseDuration case-insensitive 2H30M', () => {
    assert.equal(parseDuration('2H30M'), 9_000_000);
  });

  await test('parseDuration invalid cases', () => {
    assert.equal(parseDuration(''), null);
    assert.equal(parseDuration('abc'), null);
    assert.equal(parseDuration('5'), null);
    assert.equal(parseDuration('1s'), null);
    assert.equal(parseDuration('2y'), null);
    assert.equal(parseDuration('0m'), null);
  });

  // --- resolveExpiry ---
  await test('resolveExpiry exact 24h unsnapped', () => {
    const r = resolveExpiry('24h');
    assert.ok(r);
    assert.equal(r.bucket, '24h');
    assert.equal(r.snapped, false);
    assert.equal(r.capped, false);
  });

  await test('resolveExpiry exact 1y unsnapped', () => {
    const r = resolveExpiry('1y');
    assert.ok(r);
    assert.equal(r.bucket, '1y');
    assert.equal(r.snapped, false);
    assert.equal(r.capped, false);
  });

  await test('resolveExpiry 45m → 1h snapped', () => {
    const r = resolveExpiry('45m');
    assert.ok(r);
    assert.equal(r.bucket, '1h');
    assert.equal(r.snapped, true);
    assert.equal(r.capped, false);
  });

  await test('resolveExpiry 2h30m → 24h', () => {
    const r = resolveExpiry('2h30m');
    assert.ok(r);
    assert.equal(r.bucket, '24h');
    assert.equal(r.snapped, true);
  });

  await test('resolveExpiry 1h exact', () => {
    const r = resolveExpiry('1h');
    assert.ok(r);
    assert.equal(r.bucket, '1h');
    assert.equal(r.snapped, false);
  });

  await test('resolveExpiry 60m → 1h snapped:false', () => {
    const r = resolveExpiry('60m');
    assert.ok(r);
    assert.equal(r.bucket, '1h');
    assert.equal(r.snapped, false);
    assert.equal(r.requestedMs, 3_600_000);
  });

  await test('resolveExpiry 3d → 7d', () => {
    const r = resolveExpiry('3d');
    assert.ok(r);
    assert.equal(r.bucket, '7d');
    assert.equal(r.snapped, true);
  });

  await test('resolveExpiry 8d → 30d', () => {
    const r = resolveExpiry('8d');
    assert.ok(r);
    assert.equal(r.bucket, '30d');
  });

  await test('resolveExpiry 2w → 30d', () => {
    const r = resolveExpiry('2w');
    assert.ok(r);
    assert.equal(r.bucket, '30d');
  });

  await test('resolveExpiry 40d → 1y', () => {
    const r = resolveExpiry('40d');
    assert.ok(r);
    assert.equal(r.bucket, '1y');
    assert.equal(r.capped, false);
  });

  await test('resolveExpiry 60w → 1y capped:true', () => {
    const r = resolveExpiry('60w');
    assert.ok(r);
    assert.equal(r.bucket, '1y');
    assert.equal(r.capped, true);
    assert.equal(r.snapped, true);
  });

  await test('resolveExpiry invalid foo → null', () => {
    assert.equal(resolveExpiry('foo'), null);
  });

  // --- validateHost ---
  await test('validateHost rejects host without scheme', () => {
    assert.throws(
      () => validateHost('paste.example.com'),
      (err) => /http:\/\/ or https:\/\//i.test(err.message) && /paste\.example\.com/.test(err.message),
    );
  });

  await test('validateHost rejects non-URL values', () => {
    assert.throws(
      () => validateHost('not a url'),
      (err) => /valid URL|http:\/\/ or https:\/\//i.test(err.message),
    );
  });

  await test('validateHost accepts https with trailing slash', () => {
    assert.equal(validateHost('https://example.com/'), 'https://example.com/');
  });

  await test('validateHost accepts http without trailing slash', () => {
    assert.equal(validateHost('http://localhost:5173'), 'http://localhost:5173');
  });

  await test('validateHost rejects non-http schemes', () => {
    assert.throws(
      () => validateHost('ftp://files.example.com'),
      (err) => /http:\/\/ or https:\/\//i.test(err.message),
    );
  });

  await test('empty -p password is rejected', () => {
    let err;
    try {
      execFileSync(process.execPath, [cliPath, '-p', ''], {
        input: 'secret content',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (caught) {
      err = caught;
    }
    assert.ok(err, 'expected the CLI to exit non-zero');
    assert.equal(err.status, 1);
    assert.match(String(err.stderr), /password cannot be empty/);
  });

  await test('non-empty password is not rejected by the parser', () => {
    const out = execFileSync(process.execPath, [cliPath, '-p', 'secret', '--help'], {
      encoding: 'utf8',
    });
    assert.match(out, /Usage:/);
  });

  await test('--help documents --save and --force', () => {
    const out = execFileSync(process.execPath, [cliPath, '--help'], { encoding: 'utf8' });
    assert.match(out, /--save <file>/);
    assert.match(out, /--force/);
  });

  await test('--save without a value fails in the parser', () => {
    let err;
    try {
      execFileSync(process.execPath, [cliPath, 'get', 'x', '--save'], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (caught) {
      err = caught;
    }
    assert.ok(err, 'expected the CLI to exit non-zero');
    assert.equal(err.status, 1);
    assert.match(String(err.stderr), /--save requires a value/);
  });

  await test('--save= fails instead of writing to stdout', () => {
    let err;
    try {
      execFileSync(process.execPath, [cliPath, 'get', 'x', '--save='], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (caught) {
      err = caught;
    }
    assert.ok(err, 'expected the CLI to exit non-zero');
    assert.equal(err.status, 1);
    assert.match(String(err.stderr), /--save requires a value/);
  });

  await test('--save does not consume --force as its value', () => {
    let err;
    try {
      execFileSync(process.execPath, [cliPath, 'get', 'x', '--save', '--force'], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (caught) {
      err = caught;
    }
    assert.ok(err, 'expected the CLI to exit non-zero');
    assert.equal(err.status, 1);
    assert.match(String(err.stderr), /--save requires a value/);
  });

  await test('--save path --force is accepted by the parser', () => {
    const out = execFileSync(process.execPath, [cliPath, '--save', 'out.txt', '--force', '--help'], {
      encoding: 'utf8',
    });
    assert.match(out, /Usage:/);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
