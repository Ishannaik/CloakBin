# CloakBin

<div align="center">

![CloakBin Logo](static/logo.svg)

**Zero-Knowledge Encrypted Pastebin**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-2.0-FF3E00?logo=svelte)](https://kit.svelte.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC?logo=tailwindcss)](https://tailwindcss.com/)

[Live Demo](https://cloakbin.vercel.app) • [Report Bug](https://github.com/Ishannaik/CloakBin/issues) • [Request Feature](https://github.com/Ishannaik/CloakBin/issues)

</div>

---

## About

CloakBin is a privacy-first pastebin where your data is encrypted **before** it leaves your browser. The server never sees your plaintext content - only encrypted ciphertext.

### Key Features

- **Zero-Knowledge Encryption** - AES-256-GCM encryption happens entirely in your browser
- **Password Protection** - Optional password with PBKDF2 key derivation
- **Burn After Read** - Self-destructing pastes after first view
- **Syntax Highlighting** - Auto-detected language with 50+ supported languages
- **Expiration Options** - 1 hour, 24 hours, 7 days, 30 days, 1 year, or never
- **No Tracking** - No analytics, no cookies, no user accounts
- **Admin Dashboard** - Manage pastes with filtering, sorting, and bulk operations

## Tech Stack

- **Frontend**: SvelteKit 2.0, Svelte 5, TypeScript
- **Styling**: Tailwind CSS 4.0
- **Database**: MongoDB with Mongoose
- **Encryption**: Web Crypto API (AES-256-GCM, PBKDF2)
- **Editor**: CodeMirror 6
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- MongoDB instance

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/Ishannaik/CloakBin.git
   cd CloakBin
   git checkout v2
   ```

2. Install dependencies
   ```bash
   pnpm install
   ```

3. Set up environment variables
   ```bash
   cp .env.example .env
   ```

   Configure your `.env`:
   ```env
   MONGODB_URI=mongodb://localhost:27017/cloakbin
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=your-secure-password
   ```

4. Start development server
   ```bash
   pnpm dev
   ```

5. Open [http://localhost:5173](http://localhost:5173)

### Building for Production

```bash
pnpm build
pnpm preview
```

## How It Works

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │     │   Server    │     │  Database   │
│             │     │             │     │             │
│  Plaintext  │     │             │     │             │
│      │      │     │             │     │             │
│      ▼      │     │             │     │             │
│  Encrypt    │     │             │     │             │
│  (AES-256)  │     │             │     │             │
│      │      │     │             │     │             │
│      ▼      │     │             │     │             │
│ Ciphertext ─┼────►│ Ciphertext ─┼────►│ Ciphertext  │
│             │     │             │     │             │
│ Key in URL# │     │  (no key)   │     │  (no key)   │
└─────────────┘     └─────────────┘     └─────────────┘
```

1. **Create**: Content is encrypted in browser with a random key
2. **Store**: Only ciphertext is sent to server (key stays in URL fragment)
3. **Share**: URL contains the decryption key after `#` (never sent to server)
4. **View**: Recipient's browser decrypts using the key from URL

## Project Structure

```
src/
├── lib/
│   ├── components/     # Reusable UI components
│   ├── db/             # Database adapters (MongoDB)
│   └── crypto.ts       # Encryption utilities
├── routes/
│   ├── +page.svelte    # Home page (create paste)
│   ├── p/[id]/         # View paste
│   ├── api/            # API endpoints
│   └── admin/          # Admin dashboard
└── app.html            # HTML template
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Acknowledgments

- [PrivateBin](https://privatebin.info/) - Inspiration for zero-knowledge architecture
- [CodeMirror](https://codemirror.net/) - Code editor component
- [Lucide](https://lucide.dev/) - Beautiful icons

---

<div align="center">
Made with ❤️ by <a href="https://github.com/Ishannaik">Ishan Naik</a>
</div>
