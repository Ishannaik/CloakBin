#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { encrypt, decrypt } from '../src/crypto.js';
import { detectLanguage } from '../src/lang-detect.js';
import { resolveExpiry } from '../src/duration.js';

const VERSION = '0.1.0';
const DEFAULT_HOST = 'https://cloakbin.com';
const LANG_RE = /^[a-zA-Z0-9_-]{1,30}$/;
const UA = `cloakbin-cli/${VERSION}`;

function usage() {
  return `cloakbin — zero-knowledge encrypted pastebin CLI

Usage:
  cloakbin [file] [flags]          Encrypt and upload (file, -, or stdin)
  cloakbin get <url-or-id> [flags] Fetch and decrypt a paste
  cat file | cloakbin [flags]      Encrypt from pipe

Flags:
  -e, --expiry <bucket|duration>   Expiry: 1h|24h|7d|30d|1y or e.g. 2h30m, 3d (default: 7d)
      --burn                       Burn after first browser read
  -p, --password <pw>              Password-protect (no key in URL)
      --lang <language>            Syntax language hint (auto-detected from file ext)
      --host <url>                 API host (default: https://cloakbin.com)
  -h, --help                       Show help
  -v, --version                    Show version
`;
}

function fail(msg) {
  process.stderr.write(`Error: ${msg}\n`);
  process.exit(1);
}

/** Hand-rolled flag parser: supports --flag value and --flag=value */
function parseArgs(argv) {
  const flags = {
    expiry: '7d',
    burn: false,
    password: null,
    lang: null,
    host: DEFAULT_HOST,
    help: false,
    version: false,
  };
  const positionals = [];
  let i = 0;

  while (i < argv.length) {
    const arg = argv[i];

    if (arg === '--') {
      positionals.push(...argv.slice(i + 1));
      break;
    }

    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      let name, value;
      if (eq !== -1) {
        name = arg.slice(2, eq);
        value = arg.slice(eq + 1);
      } else {
        name = arg.slice(2);
        value = undefined;
      }

      switch (name) {
        case 'help':
          flags.help = true;
          break;
        case 'version':
          flags.version = true;
          break;
        case 'burn':
          flags.burn = true;
          break;
        case 'expiry':
          value = value !== undefined ? value : argv[++i];
          if (value === undefined) fail('--expiry requires a value');
          flags.expiry = value;
          break;
        case 'password':
          value = value !== undefined ? value : argv[++i];
          if (value === undefined) fail('--password requires a value');
          flags.password = value;
          break;
        case 'lang':
          value = value !== undefined ? value : argv[++i];
          if (value === undefined) fail('--lang requires a value');
          flags.lang = value;
          break;
        case 'host':
          value = value !== undefined ? value : argv[++i];
          if (value === undefined) fail('--host requires a value');
          flags.host = value;
          break;
        default:
          fail(`unknown flag --${name}`);
      }
      i++;
      continue;
    }

    if (arg.startsWith('-') && arg.length > 1 && arg !== '-') {
      // short flags: -e, -p, -h, -v (possibly clustered not supported for valued)
      const short = arg.slice(1);
      if (short === 'h') {
        flags.help = true;
        i++;
        continue;
      }
      if (short === 'v') {
        flags.version = true;
        i++;
        continue;
      }
      if (short === 'e') {
        const value = argv[++i];
        if (value === undefined) fail('-e requires a value');
        flags.expiry = value;
        i++;
        continue;
      }
      if (short === 'p') {
        const value = argv[++i];
        if (value === undefined) fail('-p requires a value');
        flags.password = value;
        i++;
        continue;
      }
      // multi-char short like -e7d not supported; treat as unknown
      fail(`unknown flag -${short}`);
    }

    positionals.push(arg);
    i++;
  }

  // strip trailing slash from host
  flags.host = flags.host.replace(/\/+$/, '');
  return { flags, positionals };
}

function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.on('data', (c) => chunks.push(c));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    process.stdin.on('error', reject);
  });
}

/**
 * @returns {Promise<{ content: string, filename: string|null } | null>}
 * filename is set only when input came from a real file argument (not `-` / stdin).
 */
async function readInput(positionals) {
  // priority: file arg > `-` > piped stdin
  const fileArg = positionals.find((p) => p !== 'get');
  // when command is create, positionals are just the file (if any)
  // caller passes only non-get positionals

  if (fileArg && fileArg !== '-') {
    try {
      const content = readFileSync(fileArg, 'utf8');
      return { content, filename: fileArg };
    } catch (err) {
      fail(`cannot read file: ${fileArg} (${err.message})`);
    }
  }

  if (fileArg === '-' || !process.stdin.isTTY) {
    const data = await readStdin();
    return { content: data, filename: null };
  }

  return null; // no input
}

async function createPaste(plaintext, flags) {
  const resolved = resolveExpiry(flags.expiry);
  if (!resolved) {
    fail(
      `invalid expiry "${flags.expiry}" — use 1h|24h|7d|30d|1y or a duration like 2h30m, 3d, 1w2d`
    );
  }
  if (resolved.snapped || resolved.capped) {
    process.stderr.write(
      `⏳ expiry ${flags.expiry} → applied ${resolved.bucket} (free tier uses fixed buckets; exact expiry is a premium feature)\n`
    );
  }
  flags.expiry = resolved.bucket;

  if (flags.lang != null && !LANG_RE.test(flags.lang)) {
    fail(`invalid --lang "${flags.lang}" — use 1-30 chars: letters, digits, _ or -`);
  }

  const enc = await encrypt(plaintext, { password: flags.password || undefined });

  const body = {
    content: enc.contentBase64,
    expiry: flags.expiry,
  };
  if (enc.saltBase64) body.salt = enc.saltBase64;
  if (flags.burn) body.burnAfterRead = true;
  if (flags.lang) body.language = flags.lang;

  let res;
  try {
    res = await fetch(`${flags.host}/api/paste`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': UA,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    fail(`network error: ${err.message}`);
  }

  if (res.status !== 201) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j && j.error) msg = j.error;
    } catch {
      /* ignore */
    }
    fail(msg);
  }

  let data;
  try {
    data = await res.json();
  } catch {
    fail('invalid JSON in create response');
  }
  if (!data.id) fail('server response missing id');

  let url = `${flags.host}/${data.id}`;
  if (enc.keyBase64url) {
    url += `#${enc.keyBase64url}`;
  }

  process.stderr.write('🔒 Encrypted locally — server only received ciphertext\n');
  if (flags.password) {
    process.stderr.write('Password mode: recipient must supply the password to decrypt.\n');
  }
  process.stdout.write(url + '\n');
}

function parsePasteRef(ref, defaultHost) {
  // full URL or bare id
  let id;
  let keyBase64url = null;
  let host = defaultHost;

  if (ref.includes('://') || ref.startsWith('//')) {
    let u;
    try {
      u = new URL(ref);
    } catch {
      fail(`invalid URL: ${ref}`);
    }
    host = `${u.protocol}//${u.host}`;
    // pathname like /id or /id/
    id = u.pathname.replace(/^\/+|\/+$/g, '').split('/')[0];
    if (u.hash && u.hash.length > 1) {
      keyBase64url = decodeURIComponent(u.hash.slice(1));
    }
  } else if (ref.includes('#')) {
    // id#key without scheme
    const idx = ref.indexOf('#');
    id = ref.slice(0, idx);
    keyBase64url = decodeURIComponent(ref.slice(idx + 1));
  } else {
    id = ref;
  }

  if (!id) fail('missing paste id');
  return { id, keyBase64url, host };
}

async function getPaste(ref, flags) {
  const { id, keyBase64url, host } = parsePasteRef(ref, flags.host);

  let res;
  try {
    res = await fetch(`${host}/api/paste/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: { 'User-Agent': UA },
    });
  } catch (err) {
    fail(`network error: ${err.message}`);
  }

  if (res.status === 404) {
    fail('paste not found or expired');
  }
  if (res.status !== 200) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j && j.error) msg = j.error;
    } catch {
      /* ignore */
    }
    fail(msg);
  }

  let data;
  try {
    data = await res.json();
  } catch {
    fail('invalid JSON in get response');
  }

  if (data.burnAfterRead) {
    process.stderr.write(
      'Warning: this paste is burn-after-read; viewing it in a browser would destroy it. API GET does not auto-burn.\n'
    );
  }

  const hasPassword = !!data.hasPassword;
  if (hasPassword && !flags.password) {
    fail('this paste is password-protected; provide --password');
  }
  if (!hasPassword && !keyBase64url) {
    fail('missing #key in URL');
  }

  let plaintext;
  try {
    if (hasPassword) {
      plaintext = await decrypt(data.content, {
        password: flags.password,
        saltBase64: data.salt,
      });
    } else {
      plaintext = await decrypt(data.content, { keyBase64url });
    }
  } catch (err) {
    fail(err.message);
  }

  // print plaintext exactly — no extra trailing newline beyond content
  process.stdout.write(plaintext);
}

async function main() {
  const { flags, positionals } = parseArgs(process.argv.slice(2));

  if (flags.help) {
    process.stdout.write(usage());
    process.exit(0);
  }
  if (flags.version) {
    process.stdout.write(`cloakbin ${VERSION}\n`);
    process.exit(0);
  }

  if (positionals[0] === 'get') {
    const ref = positionals[1];
    if (!ref) fail('usage: cloakbin get <url-or-id>');
    await getPaste(ref, flags);
    return;
  }

  // create mode
  const input = await readInput(positionals);
  if (input === null) {
    process.stderr.write(usage());
    process.exit(1);
  }
  if (input.content === '') {
    fail('no input');
  }

  // auto-detect language from real file when --lang not given
  if (flags.lang == null && input.filename) {
    const detected = detectLanguage(input.filename);
    if (detected != null && LANG_RE.test(detected)) {
      flags.lang = detected;
      const ext = input.filename.includes('.')
        ? input.filename.slice(input.filename.lastIndexOf('.'))
        : input.filename;
      process.stderr.write(`🎨 language: ${detected} (auto-detected from ${ext})\n`);
    }
  }

  await createPaste(input.content, flags);
}

main().catch((err) => {
  fail(err.message || String(err));
});
