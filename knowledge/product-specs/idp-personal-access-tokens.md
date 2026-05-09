# idp-personal-access-tokens

> Unified **personal access tokens** (`tfp_pat_…`) on **user.trefolio.com** for MCP across trefolio, Clara, and Will.

## 1. Summary

Users mint and revoke PATs only on the IdP (**trefolio-accounts**). Each product app validates bearer tokens with `POST /api/v1/pat/introspect` using a shared **`TREFOLIO_PAT_INTROSPECTION_SECRET`**, then maps the returned `sub` to a local user. Plaintext tokens are shown once at creation; only hashes are stored on the IdP.

## 2. Status

- **Tier:** IdP-only; applies when IdP is deployed with PAT tables and env secret set.
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`.cursor/skills/integration-trefolio-accounts/SKILL.md`](../../.cursor/skills/integration-trefolio-accounts/SKILL.md); MCP wiring also touches [`.cursor/skills/engineer-integrations/SKILL.md`](../../.cursor/skills/engineer-integrations/SKILL.md).

## 3. Entry points

| Type | Path (in `external/accounts/`) | Notes |
|------|----------------------------------|-------|
| UI | `src/app/account/developer/page.tsx` + `pat-manager.tsx` | Create / list / revoke PAT |
| API | `src/app/api/v1/personal-access-tokens/route.ts` | Session cookie; create rate-limited |
| API | `src/app/api/v1/personal-access-tokens/[id]/route.ts` | Revoke |
| API | `src/app/api/v1/pat/introspect/route.ts` | S2S bearer secret; body `{ "token": "tfp_pat_…" }` |
| Lib | `src/lib/personal-access-token-crypto.ts`, `src/lib/pat-introspection-auth.ts`, `src/lib/db.ts` | Hash, auth, persistence |

## 4. Data model

Table **`personal_access_tokens`** (Postgres + SQLite bootstrap in IdP `db.ts`): `id`, `sub`, `token_hash`, `prefix`, `name`, timestamps, `expires_at`, `revoked_at`.

## 5. API surface

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/v1/personal-access-tokens` | IdP session | List tokens (prefix only) |
| POST | `/api/v1/personal-access-tokens` | IdP session | Create (returns plaintext once); 3/hour per `sub` |
| DELETE | `/api/v1/personal-access-tokens/:id` | IdP session | Revoke |
| POST | `/api/v1/pat/introspect` | `Bearer TREFOLIO_PAT_INTROSPECTION_SECRET` | Return `{ active, sub?, token_id?, scope? }` |

## 6. UI surface

`/account/developer` on the IdP host.

## 7. Business logic

- Token format `tfp_pat_` + 64 hex; `hashPat` = SHA-256 hex for lookup.
- Introspection updates `last_used_at` best-effort (non-blocking).

## 8. External dependencies

- None beyond DB; consumer apps (trefolio, Clara, Will) call introspection over HTTPS.

## 9. Currency / FX / tax implications

None on the IdP; portfolio semantics live in each app.

## 10. i18n

Developer UI is English-first; IdP locale switch may apply elsewhere.

## 11. Permissions / tier gating / rate limits

- PAT creation: aggressive per-`sub` hourly cap on the IdP.
- Introspection: only callers with the shared secret.

## 12. Telemetry

Server logs only; no dedicated product analytics for PAT.

## 13. Testing

Vitest in `external/accounts`: `src/lib/pat-introspection-auth.test.ts`, `src/lib/personal-access-token-crypto.test.ts`, `src/app/api/v1/pat/introspect/route.test.ts`. Run with **Node.js 22** (`npm test` from `external/accounts`).

## 14. Rollout / migration

Set `TREFOLIO_PAT_INTROSPECTION_SECRET` identically on Accounts and each app. User-facing guide: [`external/accounts/docs/mcp-ecosystem.md`](../../external/accounts/docs/mcp-ecosystem.md).

## 15. Open questions

- Optional: Redis-backed introspection cache on the IdP for very high QPS (apps already cache briefly).
