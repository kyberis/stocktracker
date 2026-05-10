# Local HTTPS dev URLs (`*.trefolio-dev.com`)

**Port numbers are fixed** — see [`dev/ports.md`](ports.md) (single source of truth). Matching them to Caddy means `https://trefolio-dev.com` always proxies to the dev server you intend.

Production-shaped hostnames + valid HTTPS for the unified-accounts dev stack,
so cookie / SameSite / passkey behaviour matches production locally.

| Hostname                  | Proxies to        | App                      |
| ------------------------- | ----------------- | ------------------------ |
| `trefolio-dev.com`        | `127.0.0.1:3010`  | trefolio                 |
| `clara.trefolio-dev.com`  | `127.0.0.1:3001`  | Clara (`external/etracker`) |
| `will.trefolio-dev.com`   | `127.0.0.1:3200`  | Will (`external/notetaker`) |
| `user.trefolio-dev.com`   | `127.0.0.1:3300`  | accounts / IdP (`external/accounts`) |

## Vercel project names (dashboard only)

In **Vercel → Project → Settings → General → Project Name**, you can use short labels (for example `trefolio` for this app and `user` for the IdP) so the team dashboard matches how you talk about the products. That name is **only** cosmetic on Vercel: it does **not** rename anything on GitHub, change `git clone` URLs, or require edits to `.gitmodules`. The Git integration under **Settings → Git** keeps using the same linked repository.

## One-time setup

### 1. Add hostnames to `/etc/hosts`

```bash
sudo sh -c 'cat dev/hosts.txt >> /etc/hosts'
grep trefolio-dev /etc/hosts   # verify
```

### 2. Trust Caddy's local CA (first run only)

`caddy trust` talks to a **running** Caddy admin API (default `localhost:2019`) to
fetch the root certificate — it will **fail with connection refused** if no server
is up yet, or if you need to force IPv4 (see below).

**Recommended (matches the cert your proxy uses when `npm run dev:proxy` runs as root):**

```bash
# Terminal A — start the proxy (sudo Caddy); leave it running.
npm run dev:proxy

# Terminal B — while A is running:
sudo caddy trust --address 127.0.0.1:2019
```

If `sudo caddy trust` still dials `[::1]:2019` and fails, the `--address` flag above
pins IPv4 loopback.

**Fallback — trust the CA file yourself** (only after Caddy has created it; path
is `$HOME` of the user that generated the CA — for `sudo` proxy runs that is often
`/var/root`):

```bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain \
  "/var/root/Library/Application Support/Caddy/pki/authorities/local/root.crt"
```

If you only ever ran `caddy validate` as your normal user, the same file may be
under `~/Library/Application Support/Caddy/pki/authorities/local/root.crt`, but
trusting **that** copy does not help if `sudo caddy` issued certs from **root’s**
PKI — use the admin API method while the proxy is running, or root’s path above
after one proxy start.

## Daily workflow

In four terminals (or via a process manager of your choice):

```bash
# 1. trefolio — port 3010 (fixed in root package.json `npm run dev`)
npm run dev
# Optional faster bundler: npm run dev:turbo

# 2. Clara — port 3001 (fixed in external/etracker `package.json`)
npm run dev:clara

# 3. Will — port 3200 (fixed in external/notetaker `package.json`)
npm run dev:will

# 4. accounts / IdP — port 3300 (fixed in external/accounts `package.json`)
npm run dev:accounts
```

Optional — one terminal for all four (noisy logs):

```bash
npm run dev:unified
```

Then in another terminal:

```bash
npm run dev:proxy   # sudo + absolute caddy path (see dev/run-caddy-proxy.sh)
```

Open in the browser (with Caddy + `/etc/hosts` per above):

| App | URL |
| --- | --- |
| trefolio | `https://trefolio-dev.com` |
| Clara | `https://clara.trefolio-dev.com` |
| Will | `https://will.trefolio-dev.com` |
| accounts / IdP | `https://user.trefolio-dev.com` |

Full OIDC flow, cross-subdomain cookies, and WebAuthn should match `*.trefolio.com` in production.

**Optional — Playwright IdP redirect smoke** (from the **stocktracker** repo root): asserts `/login` reaches `/oauth2/authorize` on the IdP. The spec is excluded from the default E2E run unless you set `E2E_IDP_BROWSER=1` (see `playwright.config.ts`).

```bash
E2E_IDP_BROWSER=1 E2E_BASE_URL=https://trefolio-dev.com npx playwright test e2e/idp-browser-smoke.spec.ts
```

Use the same origin you open in the browser (`trefolio-dev.com` or your `app.*` host); for full-stack OIDC against the local IdP, trefolio needs **`IDP_CLIENT_SECRET`** (and related IdP env) set for that host so `/login` bridges into OIDC instead of showing the “IdP not configured” dev state.

### If HTTPS dev feels slow

1. **First request after `npm run dev` is always slow** — Next.js compiles each route on demand. Visiting `/` or `/landing` once “warms” the dev server; later navigations are faster.
2. **Use Turbopack** for quicker compiles and refresh (optional; may warn about custom `webpack` in `next.config` — usually fine):
   ```bash
   npm run dev:turbo
   ```
3. **Use Node 22** for this repo (`node -v`). Older Node triggers extra warnings and can behave oddly (see root `engines` and `.nvmrc`).
4. **Append IPv6 `::1` lines from `dev/hosts.txt`** if you only added `127.0.0.1` long ago — without `::1`, some browsers stall on dual-stack resolution before falling back to IPv4. One-shot helper (prompts for sudo password):

   ```bash
   bash dev/apply-ipv6-hosts.sh
   ```
5. **Skip Caddy when you do not need prod-shaped hostnames** — `http://localhost:3010` avoids TLS + proxy overhead for UI-only work.

Trefolio’s `/api/auth/oidc/start` and `/api/auth/oidc/callback` resolve the public
origin from `X-Forwarded-Host` / `X-Forwarded-Proto` when Caddy (or Vercel) sets
them, so `redirect_uri` and error redirects stay on `trefolio-dev.com` instead
of falling back to `localhost`.

## OIDC: Caddy dev (`*.trefolio-dev.com`) + loopback token calls

Relying parties (trefolio, Clara, Will) often set **`IDP_BASE_URL=http://localhost:3300`**
so Node can reach **token** and **JWKS** without trusting Caddy’s local CA. That
only works if the **browser** still opens **`https://user.trefolio-dev.com`** for
the authorize page.

### On **accounts** (`external/accounts` `.env.local`)

Set the **public issuer** (matches JWT `iss` and the host users see):

```bash
IDP_ISSUER=https://user.trefolio-dev.com
```

Optional — when metadata is fetched over **loopback** (no `X-Forwarded-Host`),
list token / userinfo / jwks on loopback so clients keep using HTTP to
`127.0.0.1:3300` while `issuer` and `authorization_endpoint` stay on
`IDP_ISSUER`:

```bash
IDP_SERVER_ORIGIN=http://127.0.0.1:3300
```

When something requests `/.well-known/openid-configuration` **through** Caddy,
forwarded headers are present and metadata uses HTTPS for every endpoint (same
origin as `IDP_ISSUER`).

### On **trefolio** (this repo `.env.local`)

Match the IdP’s issuer for authorize redirects and ID-token verification:

```bash
IDP_BASE_URL=http://localhost:3300
IDP_ISSUER=https://user.trefolio-dev.com
```

**Database:** `next dev` ignores remote Turso URLs (`libsql://…` / `https://…`) unless you set `STOCKTRACKER_USE_REMOTE_DB_IN_DEV=true` (see `.env.local.example`), so the default is local `data/trefolio.db` instead of accidentally using production credentials.

### On **Clara** and **Will**

Keep **`IDP_BASE_URL=http://localhost:3300`** (NextAuth loads discovery from
there). No extra issuer env is needed once accounts metadata exposes the correct
**`authorization_endpoint`**.

### Alternative (single HTTPS URL everywhere)

Use **`IDP_BASE_URL=https://user.trefolio-dev.com`** on every app and trust the
CA in Node, e.g.:

```bash
export NODE_EXTRA_CA_CERTS="$HOME/Library/Application Support/Caddy/pki/authorities/local/root.crt"
npm run dev
```

(Path may differ; it is the PEM for Caddy’s `tls internal` root after `caddy trust`.)

## Accounts / IdP email in development

The IdP does **not** send signup confirmation email from `/oauth2/authorize` today.
In **`NODE_ENV !== 'production'`**, any future verification mailer should stay off unless
you explicitly opt in; see `IDP_SKIP_VERIFICATION_EMAIL` and
[`external/accounts/src/lib/idp-email-policy.ts`](../external/accounts/src/lib/idp-email-policy.ts).

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
