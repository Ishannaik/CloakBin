# Changelog

All notable changes to CloakBin are documented here. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-07-11

### Security
- Constant-time admin credential comparison, replacing a plaintext `!==` check that
  leaked a login timing side-channel (#11).
- Extracted the admin session sign/verify logic into a dedicated, unit-tested module
  and added 13 vitest tests proving forged, tampered, expired, wrong-secret and
  wrong-user session tokens are all rejected (#18).

### Performance
- Lazy-load the CodeMirror editor (skeleton-first render) on the paste view and home
  routes, and dynamic-import highlight.js so it no longer ships in the home (LCP)
  bundle (#15).
- Parallelized admin dashboard queries and cached dashboard stats; added viewport
  preload on admin navigation and cached daily paste counts.
- `.lean()` on paste reads plus a connection guard and sort index; gzip-compress
  content before AES-256-GCM encryption; sample only the first 5 KB for language
  detection instead of the full paste.

### Maintenance
- Greened the repository: fixed all `svelte-check` type errors and added the missing
  dev dependencies (`@types/node`, ESLint flat-config packages) so `pnpm check` and
  `pnpm lint` run clean (#13).
- Removed 7 unused dependencies and a dead admin chart feature (which was also running
  an unnecessary database query on every admin page load) (#16).

### Docs
- Added `SECURITY.md` (responsible-disclosure policy), `/.well-known/security.txt`
  (RFC 9116), and a "Verify the Zero-Knowledge Claim Yourself" guide to the README (#17).
- Corrected the license notice — the project is AGPL-3.0 (the README previously claimed MIT).
- Aligned the README and `.env.example` environment-variable names with the code
  (`MONGODB_URI`, `ADMIN_USER`, `ADMIN_PASS`).

### Fixes
- Burn-after-read handling with password-protected pastes, expiry display, and URL
  hash-key changes.
- Added `Cache-Control` headers to paste API responses.
- Expiry field, directory drag-and-drop filtering, and an autosave interval race.

## [1.0.0]

- Initial public release: zero-knowledge encrypted pastebin — client-side AES-256-GCM
  encryption with the key held only in the URL fragment, so the server stores only
  ciphertext.
