# Contributing to CloakBin

Thanks for taking a look! PRs, bug reports, and feature ideas are all welcome.

## Setup

```bash
git clone https://github.com/Ishannaik/CloakBin.git
cd CloakBin
pnpm install
cp .env.example .env   # add your MongoDB URI
pnpm dev                # http://localhost:5173
```

## Finding something to work on

- Browse [open issues](https://github.com/Ishannaik/CloakBin/issues), especially ones labeled `good first issue`.
- Comment on an issue before starting so it's clear you're picking it up.
- Found a bug or have a feature idea with no issue yet? Open one first — for anything beyond a trivial fix, it saves you from building something that won't be merged.
- Questions before or during a PR are welcome on [Discord](https://discord.gg/KKvtRhQvRv).

**Security issues**: never open a public issue — use a [private security advisory](https://github.com/Ishannaik/CloakBin/security/advisories/new) instead.

## Before opening a PR

```bash
pnpm lint          # eslint
pnpm format:check  # prettier
pnpm check         # svelte-check + types
pnpm test          # vitest
```

Fix anything these flag (`pnpm lint:fix` and `pnpm format` autofix most style issues).

## PR process

1. Fork the repo and create a feature branch off `main`.
2. Make your change, keeping it scoped to the issue you're addressing.
3. Run the checks above.
4. Open a PR using the repo's PR template and link the issue it closes.

That's it — no CLA, no separate style guide beyond what `pnpm lint`/`pnpm format` enforce.
