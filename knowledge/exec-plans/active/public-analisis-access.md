# Public (anonymous) access to `/analisis`

- **Status:** active
- **Owner:** agent
- **Started:** 2026-08-01
- **Target:** 2026-08-01

## Goal

Let anonymous visitors search for and read stock analysis from the homepage
without logging in, to drive top-of-funnel discovery, while keeping FMP's
paid/restricted sections (insider + congressional trading) behind a login
CTA, protecting the newly-public surface with rate limiting and an anti-abuse
budget, and never letting an anonymous visitor regenerate cached data.
Builds on [`stock-page-unification.md`](stock-page-unification.md)'s
4-tab `/analisis/[ticker]` shell.

## Acceptance criteria

- [x] `/analisis`, `/api/search`, `/api/company-analysis`,
      `/api/company-analysis/narrative` allow-listed public in
      `src/middleware.ts` and `src/lib/auth/client-redirect.ts`
- [x] `redactPaidSections()` strips `insiders`/`congress` (new `"locked"`
      status) from anonymous report responses; regeneration (`fresh=1`)
      401s without a session in both routes
- [x] Never-before-cached ticker requested anonymously: builds once (IP
      rate limit + global daily budget), persists to the shared ticker
      cache, redacted before the response leaves the server
- [x] New rate limiters (Upstash-first, Turso-fallback, matching existing
      convention): public search 30/min/IP, public cached reads 60/min/IP,
      public first-build 3/hour/IP + 200/day global budget
- [x] Frontend: `analisis-shell.tsx` hides Regenerate and locks
      Fundamentals/Intelligence/Valuation tabs behind a login CTA when
      `useAuth()` has no user; `InsidersFlowPanel` shows a login CTA for
      `congress.status === "locked"`
- [x] `app-layout-client.tsx`: anonymous visitors on `/analisis*` get a
      landing-styled top bar (logo + `NavAssetSearch` + login/signup) on
      `#faf9f7` instead of the full portfolio app chrome
      (`AppNav`/`MarketTickerBar`/`MobileTabBar`/etc.)
- [x] `/landing` header mounts `NavAssetSearch` (`from=landing`); Back from
      `/analisis/[ticker]?from=landing|home` returns to `/`
- [x] Docs: `SECURITY.md`, `RELIABILITY.md` updated
- [ ] PR opened, reviewed, merged (per the plan's own rollout recommendation
      — this changes the auth boundary, unlike prior direct-to-main pushes)

## Decisions log

- 2026-08-01: IP rate limit + global daily budget for the expensive
  "uncached ticker" path, no CAPTCHA/BotID for v1.
- 2026-08-01: Fundamentals/Intelligence/Valuation & Moat tabs locked with a
  login CTA (not hidden) for anonymous visitors; AI narrative free for
  everyone (not FMP-restricted, already cached).
- 2026-08-01: Feature branch (`feat/public-analisis`) + PR review, not
  direct-to-main — this is an auth-boundary and cost-exposure change.
- 2026-08-01 (caught in review, not the original plan): anonymous responses
  from `/api/company-analysis` and `/api/company-analysis/narrative` must be
  `Cache-Control: private`, not `public`, despite both routes reading from a
  cache that's genuinely shared across all users. The response *body* varies
  by session on an identical URL (redacted sections; gap-fill eligibility;
  the anonymous "no narrative yet" `{}` placeholder vs. an authenticated
  request that would actually trigger generation) — a `public` header would
  let a shared/edge cache serve a stale or redacted body to an authenticated
  request for the same ticker. The original plan's claim that `public`
  caching was "a meaningful abuse/cost mitigation on its own" was wrong; the
  ticker-keyed DB/L1 cache underneath is the real mitigation, HTTP caching
  adds nothing safe here.
- 2026-08-01: `AppLayoutClient`'s `AppShell` branches on `!user` for
  `/analisis*` to swap in a minimal top bar. Verified first (rather than
  assumed) that `AuthProvider` and `PortfolioProvider` degrade cleanly for
  anonymous sessions (401s caught, state defaults to empty, no throws) before
  choosing conditional chrome over a larger route restructuring.

## Risks

- No browser QA — verified via `tsc`, `eslint`, `npm run build`, the locale
  parity suite, and manual `curl`/sqlite spot checks against a local dev
  server (anonymous search/report/narrative flows, `fresh=1` 401, rate-limit
  429 + `Retry-After` after 30 requests/min, redacted `congress`/`insiders`
  in the response body, `Cache-Control: private` on anonymous responses).
  No real browser session was used to confirm the locked-tab CTA renders
  correctly or that a logged-in user's chrome is unaffected.
- `logUnauthorizedApi` (called once per 401'd background API call from
  `PortfolioProvider`/`AuthProvider` on an anonymous `/analisis` visit) is a
  `console.warn` only, not a DB write — confirmed not to be a cost-amplification
  vector for the anti-scraping goal, but every anonymous pageview still fans
  out into ~6-8 middleware-level 401s before reaching the component tree.
- Global daily budget (`platform_settings`, day-keyed) is untested under
  real concurrent load; race conditions on the read-then-increment could let
  the count drift slightly past the cap under high concurrency (acceptable
  for a soft cost backstop, not a hard security boundary).

## Follow-ups

- Consider BotID/CAPTCHA if the IP+budget combo proves insufficient against
  real abuse once shipped.
- `AppShell`'s optimistic-anonymous chrome means a logged-in user hitting
  `/analisis/[ticker]` via hard refresh sees the anonymous top bar flash
  before `AuthProvider` resolves the session — cosmetic, not a bug.
- Full plan detail: `/Users/mcsuarez/.claude/plans/fuzzy-hatching-fairy.md`
  (local Claude plan-mode artifact, not in-repo).
