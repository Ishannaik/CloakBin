# CloakBin

<div align="center">

<img src="static/logo.svg" alt="CloakBin Logo" width="80">

### Zero-Knowledge Encrypted Pastebin

**Your data is encrypted before it leaves your browser. We can't read it. No one can.**

[![GitHub stars](https://img.shields.io/github/stars/Ishannaik/CloakBin?style=social)](https://github.com/Ishannaik/CloakBin/stargazers)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-2.0-FF3E00?logo=svelte)](https://kit.svelte.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)

<img src="static/demo.gif" alt="CloakBin demo — a secret is typed, encrypted in the browser, shared via a #key link, then burned" width="85%">

[Live Demo](https://oss.cloakbin.com) • [Report Bug](https://github.com/Ishannaik/CloakBin/issues) • [Request Feature](https://github.com/Ishannaik/CloakBin/issues)

**Share a secret from your terminal — encrypted locally, before it ever leaves your machine:**

```sh
echo "my-api-key" | npx cloakbin
```

⭐ **If CloakBin is useful to you, [star the repo](https://github.com/Ishannaik/CloakBin) — it genuinely helps the project reach more people.**

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

## Verify the Zero-Knowledge Claim Yourself

Don't take our word for it — the guarantee is verifiable in your browser:

1. Open your browser's **DevTools** (F12) and switch to the **Network** tab.
2. Type some text and **create a paste**.
3. Inspect the outgoing `POST` request that saves the paste and look at its **request body**. You'll see only **ciphertext** and a **salt** — never your plaintext, and never the encryption key.
4. Look at the resulting paste URL: the decryption key is the part after the `#` (the **URL fragment**). By web standard, browsers **never send the fragment to the server** — it stays client-side.
5. Open the paste and watch the Network tab again: the server returns the stored **ciphertext**, and decryption happens **in your browser** using the key from the `#fragment`.

Because the key only ever exists in the fragment and in your recipient's browser, the server (and its database, and anyone on the network) only ever sees encrypted blobs. There is no server-side code path that can read your content — even under subpoena, only ciphertext exists to hand over.

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
ADMIN_USER=admin
ADMIN_PASS=your-secure-password
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

## Contributors

[![Contributors](https://readme-contribs.as93.net/contributors/Ishannaik/CloakBin?shape=circle)](https://github.com/Ishannaik/CloakBin/graphs/contributors)

## Star Gazers

[![Star Gazers](https://readme-contribs.as93.net/stargazers/Ishannaik/CloakBin?shape=circle)](https://github.com/Ishannaik/CloakBin/stargazers)

## License

GNU Affero General Public License v3.0 (AGPL-3.0) - see [LICENSE](LICENSE)

If you run a modified version of CloakBin as a network service, AGPL §13 requires you to offer the modified source to your users.

---

<div align="center">

**Your secrets deserve real privacy.**

Made by [Ishan Naik](https://github.com/Ishannaik)

</div>
