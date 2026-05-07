# Canonical local dev ports (`*.trefolio-dev.com`)

**Rule:** do not pick ports ad hoc. `dev/Caddyfile`, npm scripts, and this table must stay aligned so `https://trefolio-dev.com` always hits the Next dev server you just started.

| App | Port | Behind Caddy (HTTPS) | From monorepo root |
| --- | ---- | -------------------- | ------------------ |
| **trefolio** (this repo) | **3010** | `https://trefolio-dev.com` | `npm run dev` |
| **Clara** (`external/etracker`) | **3001** | `https://clara.trefolio-dev.com` | `npm run dev:clara` |
| **Will** (`external/notetaker`) | **3200** | `https://will.trefolio-dev.com` | `npm run dev:will` |
| **accounts / IdP** (`external/accounts`) | **3300** | `https://user.trefolio-dev.com` | `npm run dev:accounts` |

## Production-shaped local / E2E

- `npm run build && npm start` for **trefolio** keeps Next’s default port (**3000**), which Playwright (`playwright.config.ts`) and many `localhost:3000` examples assume.
- To run **start** behind the same hostname as dev, you can use `PORT=3010 npm start` and adjust Caddy only if you need that (unusual).

## Changing a port

Update together: `dev/ports.md`, `dev/Caddyfile`, `dev/README.md`, the affected package `dev`/`start` scripts, and any `CLARA_BASE_URL` / `.env.local.example` mentions.
