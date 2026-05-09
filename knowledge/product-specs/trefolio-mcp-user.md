# trefolio-mcp-user

> HTTP MCP endpoint for read-only portfolio access using the unified IdP personal access token (`tfp_pat_…`).

## 1. Summary

Authenticated MCP clients (Cursor, Claude, etc.) call `/api/mcp/user` with `Authorization: Bearer tfp_pat_…`. The token is validated server-to-server against **trefolio-accounts** (`/api/v1/pat/introspect`); the IdP `sub` is mapped to a local user via `users.idp_sub`. Tools expose portfolios, holdings, and cash from Turso only (no live quote fetch).

## 2. Status

- **Tier:** available when IdP + `TREFOLIO_PAT_INTROSPECTION_SECRET` are configured; otherwise introspection fails and MCP auth returns 401.
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`.cursor/skills/engineer-integrations/SKILL.md`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| API | `src/app/api/mcp/user/[transport]/route.ts` | GET/POST/DELETE; `mcp-handler` + `withMcpAuth` |
| Discovery | `src/app/.well-known/mcp.json/route.ts` | Static JSON; links to IdP developer page for token |
| Lib | `src/lib/accounts-pat-introspect.ts`, `src/lib/mcp/trefolio-pat-auth.ts`, `src/lib/mcp/user-server.ts` | Introspection cache, bearer verify, tool registration |

## 4. Data model

Uses existing `users` (`idp_sub`), `portfolios`, `holdings`, `cash_entries` — no new tables.

Implementation files: `src/app/api/mcp/user/[transport]/route.ts`, `src/app/.well-known/mcp.json/route.ts`.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET/POST/DELETE | `/api/mcp/user` | Bearer `tfp_pat_` | Pro/Free (same as app user) | MCP stream/session |
| GET | `/.well-known/mcp.json` | none | — | MCP discovery document |

## 6. UI surface

None — token management lives on **user.trefolio.com → Developer**.

## 7. Business logic

- `introspectTfpPat` → `{ sub, token_id }` with short in-memory cache (hash key).
- `findUserIdByIdpSub(sub)` → local `userId`.
- Tools: `listPortfolios`, `listHoldings`, `listCash` — DB reads only.

## 8. External dependencies

- **IdP:** `POST {IDP_ISSUER or IDP_BASE_URL}/api/v1/pat/introspect` with `Authorization: Bearer TREFOLIO_PAT_INTROSPECTION_SECRET`.
- **Env:** `TREFOLIO_PAT_INTROSPECTION_SECRET`, `IDP_BASE_URL` / `IDP_ISSUER` (see `.env.local.example`).
- **Rate limits:** `mcpUserRateLimiter`, `mcpUserUnauthRateLimiter` in `src/lib/upstash.ts` (Upstash Redis when configured).

## 9. Currency / FX / tax implications

Holdings expose `valueInEUR` and `displayCurrency` as stored in the database; MCP does not refresh FX or quotes.

## 10. i18n

Discovery and errors are English-only; product UI is unaffected.

## 11. Permissions / tier gating / rate limits

- Middleware allows `/api/mcp/user` without session cookie; authorization is bearer-only inside the route.
- Per-user and per-IP limits when Redis is configured.

## 12. Telemetry

None dedicated; rely on Vercel logs.

## 13. Testing

- Unit tests recommended for `extractBearer` / auth wiring (`src/lib/mcp/trefolio-pat-auth.test.ts`).

## 14. Rollout / migration

Deploy IdP PAT + secret first; set matching `TREFOLIO_PAT_INTROSPECTION_SECRET` on trefolio. Canonical client config: [`external/accounts/docs/mcp-ecosystem.md`](../../external/accounts/docs/mcp-ecosystem.md).

## 15. Open questions

- Optional: expand tools (quotes) behind stricter caps or Pro-only flags.
