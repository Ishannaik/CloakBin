# Security Policy

CloakBin is a **zero-knowledge encrypted pastebin**: encryption happens in the browser and the decryption key lives only in the URL `#fragment`, so the server ever only stores ciphertext. Because privacy is the entire point of the project, we treat any issue that could leak plaintext, keys, or user data — or that weakens the client-side cryptography — as **high priority**.

How the zero-knowledge model is implemented (crypto, storage, burn-after-read, threat model) is documented in **[docs/SECURITY-MODEL.md](docs/SECURITY-MODEL.md)**. This file covers reporting and program scope only.

## Reporting a Vulnerability

Please report vulnerabilities **privately** — do not open a public issue for a security bug.

- **Preferred:** open a private report via GitHub Security Advisories:
  <https://github.com/Ishannaik/CloakBin/security/advisories/new>
- **Email:** `security@cloakbin.com`

Please include: a description of the issue, steps to reproduce (or a proof of concept), the affected file/endpoint if known, and the potential impact.

## Scope

In scope:
- The CloakBin application (this repository) and its API endpoints.
- The client-side cryptography and the zero-knowledge guarantee (any path where plaintext, the encryption key, or the URL fragment could reach the server or a third party).
- Authentication/authorization, injection, and data-exposure issues.

Out of scope:
- Vulnerabilities in third-party dependencies without a demonstrated impact on CloakBin (report those upstream, but feel free to flag them).
- Findings that require a compromised end-user device or browser.

## Supported Versions

Security fixes are applied to the latest `main` branch and the most recent tagged release. Please verify an issue against the latest `main` before reporting.

## Response

We aim to acknowledge a valid report within a few days and to address confirmed high-impact issues promptly. We're happy to credit reporters in the release notes unless you prefer to remain anonymous.

## How the crypto works

For a technical description of client-side AES-GCM, URL-fragment keys, ciphertext formats (v0/v1), PBKDF2 password pastes, and the threat model, see **[docs/SECURITY-MODEL.md](docs/SECURITY-MODEL.md)**.
