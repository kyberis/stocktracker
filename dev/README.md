# Local HTTPS dev URLs (`*.trefolio-dev.com`)

Production-shaped hostnames + valid HTTPS for the unified-accounts dev stack,
so cookie / SameSite / passkey behaviour matches production locally.

| Hostname                  | Proxies to        | App                      |
| ------------------------- | ----------------- | ------------------------ |
| `trefolio-dev.com`        | `127.0.0.1:3010`  | trefolio                 |
| `clara.trefolio-dev.com`  | `127.0.0.1:3001`  | Clara (`external/etracker`) |
| `will.trefolio-dev.com`   | `127.0.0.1:3200`  | Will (`external/notetaker`) |
| `user.trefolio-dev.com`   | `127.0.0.1:3300`  | accounts / IdP (`external/accounts`) |

## One-time setup

### 1. Add hostnames to `/etc/hosts`

```bash
sudo sh -c 'cat dev/hosts.txt >> /etc/hosts'
grep trefolio-dev /etc/hosts   # verify
```

### 2. Trust Caddy's local CA (first run only)

The first time `caddy` runs it generates a local CA and asks for sudo to
install the root cert into the macOS system trust store. After that, every
`*.trefolio-dev.com` URL gets a browser-trusted certificate.

You can also pre-install it without starting the proxy:

```bash
sudo caddy trust
```

## Daily workflow

In four terminals (or via a process manager of your choice):

```bash
# 1. trefolio (port 3010)
PORT=3010 npm run dev

# 2. Clara (port 3001 — set in external/etracker/.env.local last-wins NEXTAUTH_URL)
npm --prefix external/etracker run dev -- -p 3001

# 3. Will (port 3200)
npm --prefix external/notetaker run dev -- -p 3200

# 4. accounts / IdP (port 3300) — Node 22+ (repo .nvmrc); same Node for `npm install` / `npm rebuild` / dev so better-sqlite3 matches (see external/accounts/README.md § Node.js and better-sqlite3)
npm --prefix external/accounts run dev
```

Then in a fifth terminal:

```bash
npm run dev:proxy   # = sudo caddy run --config dev/Caddyfile
```

Open https://trefolio-dev.com — full OIDC flow, cross-subdomain cookies, and
WebAuthn all behave the way they do on `*.trefolio.com`.

Trefolio’s `/api/auth/oidc/start` and `/api/auth/oidc/callback` resolve the public
origin from `X-Forwarded-Host` / `X-Forwarded-Proto` when Caddy (or Vercel) sets
them, so `redirect_uri` and error redirects stay on `trefolio-dev.com` instead
of falling back to `localhost`.

## Reverting

- Stop Caddy with `Ctrl-C` in its terminal.
- Comment out the `>>> trefolio-dev.com Caddy proxy >>>` blocks in each
  `.env.local` to fall back to raw `localhost:PORT` URLs.
- Optional: remove the hosts entries:

  ```bash
  sudo sed -i '' '/# >>> trefolio-dev >>>/,/# <<< trefolio-dev <<</d' /etc/hosts
  ```

## How it works under the hood

- DNS: `/etc/hosts` maps each hostname to `127.0.0.1`.
- TLS: `tls internal` in `Caddyfile` tells Caddy to issue certs from its
  built-in local CA (no ACME / no internet).
- Reverse proxy: Caddy listens on `:443`, forwards to each app's plain HTTP
  port. The app is unaware it's behind a proxy except for the
  `X-Forwarded-Host` / `X-Forwarded-Proto` headers Caddy injects.
- OIDC clients (`external/accounts/src/lib/oidc.ts`) accept both the
  `localhost:PORT` and `https://*.trefolio-dev.com` redirect URIs, so you can
  flip between modes without touching the IdP code.
