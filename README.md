# CloakBin

<div align="center">

<img src="static/logo.svg" alt="CloakBin Logo" width="80">

### Zero-Knowledge Encrypted Pastebin

**Your data is encrypted before it leaves your browser. We can't read it. No one can.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-2.0-FF3E00?logo=svelte)](https://kit.svelte.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)

[Live Demo](https://cloakbin.vercel.app) • [Report Bug](https://github.com/Ishannaik/CloakBin/issues) • [Request Feature](https://github.com/Ishannaik/CloakBin/issues)

</div>

---

## Why Zero-Knowledge?

Traditional pastebins store your data in plaintext. Server admins, hackers, or anyone with database access can read everything you share.

**CloakBin is different.**

```
┌─────────────────────────────────────────────────────────────────┐
│                     ZERO-KNOWLEDGE FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   YOUR BROWSER              SERVER                DATABASE      │
│   ────────────              ──────                ────────      │
│                                                                 │
│   "secret msg"                                                  │
│        │                                                        │
│        ▼                                                        │
│   ┌─────────┐                                                   │
│   │ ENCRYPT │  AES-256-GCM                                      │
│   │ locally │  (browser)                                        │
│   └────┬────┘                                                   │
│        │                                                        │
│        ▼                                                        │
│   "a3f8b2c1..."  ───────►  "a3f8b2c1..."  ───►  "a3f8b2c1..."  │
│   (ciphertext)             (ciphertext)         (ciphertext)    │
│                                                                 │
│   KEY stays in URL fragment (#)                                 │
│   example.com/p/abc#KEY    ◄── never sent to server             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

The encryption key lives in the URL fragment (`#`), which **browsers never send to servers**. Even if our database is compromised, attackers only get meaningless ciphertext.

## Security Model

| Component | What it sees |
|-----------|-------------|
| Your Browser | ✅ Plaintext (you control it) |
| Network/ISP | 🔒 Encrypted ciphertext only |
| CloakBin Server | 🔒 Encrypted ciphertext only |
| Database | 🔒 Encrypted ciphertext only |
| URL Recipient | ✅ Plaintext (they have the key) |

**Cryptographic Details:**
- **Encryption**: AES-256-GCM (authenticated encryption)
- **Key Derivation**: PBKDF2 with 100,000 iterations (for password-protected pastes)
- **Random Generation**: Web Crypto API (`crypto.getRandomValues`)

## Features

- 🔐 **Zero-Knowledge Encryption** - AES-256-GCM, keys never leave your browser
- 🔑 **Password Protection** - Optional second layer with PBKDF2
- 🔥 **Burn After Read** - Self-destructing pastes
- ⏰ **Flexible Expiration** - 1 hour to never
- 🎨 **Syntax Highlighting** - 50+ languages auto-detected
- 🚫 **No Tracking** - No analytics, no cookies, no accounts
- 📱 **Responsive** - Works on desktop and mobile

## Quick Start

```bash
# Clone
git clone https://github.com/Ishannaik/CloakBin.git
cd CloakBin

# Install
pnpm install

# Configure
cp .env.example .env
# Edit .env with your MongoDB URI

# Run
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173)

## Environment Variables

```env
MONGODB_URI=mongodb://localhost:27017/cloakbin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | SvelteKit 2.0, Svelte 5 |
| Language | TypeScript |
| Styling | Tailwind CSS 4.0 |
| Database | MongoDB |
| Encryption | Web Crypto API |
| Editor | CodeMirror 6 |
| Hosting | Vercel |

## Project Structure

```
src/
├── lib/
│   ├── components/     # UI components
│   ├── db/             # Database adapters
│   └── crypto.ts       # Encryption (AES-256-GCM, PBKDF2)
├── routes/
│   ├── +page.svelte    # Create paste
│   ├── p/[id]/         # View paste
│   ├── api/            # REST endpoints
│   └── admin/          # Admin dashboard
└── app.html
```

## Self-Hosting

CloakBin is fully open source. Deploy your own instance:

1. Fork this repository
2. Deploy to Vercel/Netlify/your server
3. Set up MongoDB (Atlas free tier works)
4. Configure environment variables

## Contributing

PRs welcome! Please:

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Submit a PR

## Acknowledgments

- [PrivateBin](https://privatebin.info/) - Zero-knowledge inspiration
- [CodeMirror](https://codemirror.net/) - Editor component
- [Lucide](https://lucide.dev/) - Icons

## License

MIT License - see [LICENSE](LICENSE)

---

<div align="center">

**Your secrets deserve real privacy.**

Made by [Ishan Naik](https://github.com/Ishannaik)

</div>
