# cloakbin

Zero-knowledge pastebin CLI. Content is encrypted on your machine with AES-256-GCM; the server only ever stores ciphertext. The decryption key lives in the URL fragment (`#…`) and is never sent to the server.

## Install

```bash
npm i -g cloakbin
# or, without installing:
npx cloakbin
```

Requires Node.js 18+.

## Usage

```bash
# encrypt a file and print a shareable URL
cloakbin secret.txt

# from stdin
echo "hello" | cloakbin
cloakbin - < secret.txt

# password-protected (no key in the URL; recipient needs the password)
cloakbin notes.md --password 's3cret'

# burn after first browser view
cloakbin leak.txt --burn --expiry 1h

# syntax language hint
cloakbin main.rs --lang rust

# fetch & decrypt
cloakbin get 'https://cloakbin.com/abc123#<key>'
cloakbin get abc123 --host https://cloakbin.com   # needs #key in full URL form
cloakbin get 'https://cloakbin.com/abc123' --password 's3cret'
```

Only the final URL (or decrypted plaintext for `get`) goes to stdout. Status and errors go to stderr.

## Flags

| Flag | Description |
|------|-------------|
| `-e, --expiry <1h\|24h\|7d\|30d\|1y>` | Paste lifetime (default: `7d`) |
| `--burn` | Burn after first read in the browser |
| `-p, --password <pw>` | Password mode (PBKDF2); no `#key` in URL |
| `--lang <language>` | Language hint (`[a-zA-Z0-9_-]{1,30}`) |
| `--host <url>` | API base URL (default: `https://cloakbin.com`) |
| `-h, --help` | Show help |
| `-v, --version` | Show version |

## How the crypto works

1. Plaintext is UTF-8 encoded, gzip-compressed (level 6), then encrypted with **AES-256-GCM** (random 12-byte IV).
2. **Random-key mode** (default): a 32-byte key is generated with `crypto.getRandomValues`. The shareable URL is `https://host/<id>#<key>` where `<key>` is the raw key as base64url (no padding). The fragment is never transmitted to the server.
3. **Password mode**: the key is derived with PBKDF2-SHA-256 (600 000 iterations) over a random 16-byte salt. The salt is stored with the paste; the URL has no fragment. Recipients must supply the password.
4. Wire format (v1): magic bytes `CB` (`0x43 0x42`) + version `0x01` + IV (12) + ciphertext including the 16-byte GCM tag, then standard base64 for the API `content` field.

Decryption reverses the pipeline and also accepts a legacy format (IV ‖ ciphertext, no gzip) for older pastes.

## Self-hosting

Point the client at your own instance:

```bash
cloakbin file.txt --host https://paste.example.com
```

Trailing slashes on `--host` are stripped. The API contract is `POST /api/paste` and `GET /api/paste/:id`.

## License

MIT
