# CloakBin Security Model

This document describes **how** CloakBin’s zero-knowledge guarantee works in the current codebase. It is for self-hosters and security-minded contributors who want to verify the claim against the implementation.

For **how to report vulnerabilities**, see [SECURITY.md](../SECURITY.md).

Primary sources:

- Client crypto: [`src/lib/crypto.ts`](../src/lib/crypto.ts)
- Create paste API: [`src/routes/api/paste/+server.ts`](../src/routes/api/paste/+server.ts)
- Burn-after-read API: [`src/routes/api/paste/[id]/burn/+server.ts`](../src/routes/api/paste/[id]/burn/+server.ts)
- Storage adapters (example): [`src/lib/db/adapters/mongodb.ts`](../src/lib/db/adapters/mongodb.ts)

---

## 1. Key generation (browser only)

Random pastes use the Web Crypto API:

```ts
crypto.subtle.generateKey(
  { name: 'AES-GCM', length: 256 },
  true, // extractable so the raw key can be put in the URL fragment
  ['encrypt', 'decrypt']
);
```

- Algorithm: **AES-256-GCM** (authenticated encryption).
- The key is created in the browser; it is **not** generated on the server.
- Raw key material is exported with `keyToBase64()` as **base64url** (URL-safe) for the fragment.

Password-protected pastes do **not** use a random key. They derive one with PBKDF2 (see §4).

---

## 2. Why the key lives in the URL fragment

**Random (non-password) pastes** share links like:

```text
https://example.com/p/<paste-id>#<base64url-key>
```

Browsers **do not send the `#fragment` to the server** on normal navigations and API requests. The fragment is available only to client-side JavaScript on the view page (`base64ToKey`).

**Password-protected pastes do not put a key in `#`.** The share URL is only `…/p/<paste-id>` (no fragment). Recipients type the password in the browser; the client re-derives the AES key with PBKDF2 from that password plus the server-stored salt (see §4). The create UI already states this; do not assume every paste URL carries `#key`.

Implications:

- The CloakBin server can store and return ciphertext for `paste-id` without ever receiving the decryption key (or the password).
- Anyone who receives a full random-paste URL (including the fragment) can decrypt — treat that link like a secret.
- Referrer leakage, screenshots, browser history, and shoulder-surfing are out of the crypto boundary (see threat model).

---

## 3. Ciphertext formats (v0 vs v1)

All ciphertext is stored as a **base64** string of binary frames.

### v1 (current encrypt path)

Produced by `encrypt()`:

| Bytes | Field |
|------:|-------|
| 2 | Magic `CB` (`0x43 0x42`) |
| 1 | Version `0x01` (gzip-compressed payload) |
| 12 | AES-GCM IV (`crypto.getRandomValues`) |
| rest | AES-GCM ciphertext over **gzip** of UTF-8 plaintext (`fflate` gzip level 6) |

On decrypt, if the magic header is present and version is `0x01`, the code slices IV + ciphertext, decrypts, then `gunzipSync`.

### v0 (legacy)

No magic header:

| Bytes | Field |
|------:|-------|
| 12 | IV |
| rest | AES-GCM ciphertext over **uncompressed** UTF-8 plaintext |

`decrypt()` still accepts v0 so old pastes remain readable. New pastes use v1.

Unknown magic versions throw (`Unknown encryption format version`).

---

## 4. Password-protected pastes

Optional password mode:

1. Client generates a random **16-byte salt** (`generateSalt()` → standard base64).
2. Client derives an AES-256-GCM key with **PBKDF2**:
   - hash: SHA-256  
   - iterations: **100_000**  
   - salt: the bytes above  
3. Client encrypts as usual (v1 frame).
4. Client POSTs to the server:
   - `content`: ciphertext only  
   - `salt`: the salt (needed to re-derive the key)  
   - `hasPassword` is implied by presence of salt on create  

The server stores salt **next to** ciphertext so recipients can re-derive the key after entering the password. The password itself never leaves the browser.

---

## 5. What the server stores — and what it never sees

On `POST /api/paste`, the API accepts encrypted `content` plus metadata (`expiry`, optional `salt`, `burnAfterRead`, `language`). It does **not** receive:

- plaintext paste body  
- AES key material  
- password  

Typical stored fields (adapters may name columns differently):

| Field | Meaning |
|-------|---------|
| `content` | Ciphertext blob (base64 of v0/v1 frame) |
| `createdAt` | Creation timestamp |
| `expiresAt` | TTL |
| `hasPassword` / `salt` | Password mode metadata (salt is not secret by itself) |
| `burnAfterRead` | One-shot burn flag |
| `language` | Highlighting id (metadata only; not secret) |

The server can observe metadata (size, timing, IP at the HTTP layer, language tag). Zero-knowledge here means **content confidentiality**, not anonymity or traffic analysis resistance.

---

## 6. Burn-after-read atomicity

Burn is **not** performed on a plain `GET` of the paste. Adapters document that `getPaste` must **not** delete burn-after-read pastes, so the UI can warn the user first.

After the user confirms, the client calls the burn endpoint, which uses `db.burnPaste(id)`.

MongoDB implementation (production path):

```ts
Model.findOneAndDelete({
  _id: id,
  burnAfterRead: true,
  expiresAt: { $gt: new Date() }
});
```

That is a single atomic find-and-delete conditioned on the burn flag and non-expiry. Concurrent burners race on one document; at most one succeeds with the ciphertext payload.

Note: not every storage adapter has a finished `burnPaste` implementation (some still throw `TODO`). Self-hosters should confirm the adapter they deploy implements atomic burn as above.

---

## 7. Threat model

### What CloakBin is designed to protect against

- Server operators or DB dumps reading **plaintext** of pastes.  
- Passive network observers seeing only ciphertext on the wire (plus TLS if deployed).  
- Casual forgery of ciphertext without the key (AES-GCM authentication tag fails decrypt).  

### What CloakBin does **not** protect against

- Anyone who has the **full share URL** (id + fragment key), or the password + salt + ciphertext.  
- Malicious or compromised **client** (XSS, malicious extension, malware).  
- Endpoint compromise of the **recipient’s** browser or device.  
- **Metadata** leakage (paste size, timestamps, language, access patterns).  
- URL leakage via Referer (if a page navigates to a third party with fragment mishandled — prefer careful client routing), chat logs, support tickets, or screenshots.  
- Weak user passwords in password mode (PBKDF2 helps but does not fix `password123`).  
- Compromised Web Crypto / browser implementation.  

### Operational recommendations

- Prefer short expiry and burn-after-read for high-sensitivity secrets.  
- Share the link over a channel you trust; treat `#key` as the secret.  
- Self-host: keep TLS on, keep dependencies updated, and use an adapter with a real atomic `burnPaste`.  
- Report crypto or ZK-boundary bugs **privately** via [SECURITY.md](../SECURITY.md).

---

## 8. Quick verification checklist for reviewers

1. `generateKey` / `encrypt` / `decrypt` / PBKDF2 live only in `src/lib/crypto.ts` (browser).  
2. Create API stores `content` as supplied ciphertext; no server-side encrypt of user plaintext.  
3. View page reads key from `location.hash` / fragment helpers, not from server JSON.  
4. Burn uses conditional delete, not “read then later delete” on the hot path.  
5. Password path sends salt, never the password.

If any of the above regresses, treat it as a high-priority security issue under the project’s disclosure policy.
