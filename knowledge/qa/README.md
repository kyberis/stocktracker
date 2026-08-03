# QA — agent-executable catalogs

Manual / browser QA instructions for agents. These are **not** Playwright specs;
they are step-by-step processes another agent runs against a live environment.

## Catalogs

| File | Environment | Scope |
| --- | --- | --- |
| [`production-user-test-catalog.md`](production-user-test-catalog.md) | `https://trefolio.com` | Full non-admin product (61 use cases) |
| [`trefolio-production-qa-test-cases.pdf`](trefolio-production-qa-test-cases.pdf) | same | **Agent handoff PDF** — one card per UC with QUÉ HACER / QUÉ VERIFICAR |

Regenerate the PDF after catalog edits:

```bash
node scripts/build-qa-catalog-pdf.mjs
```

## How an executing agent should run the production catalog

1. **Read** [`production-user-test-catalog.md`](production-user-test-catalog.md) end-to-end (preface + index) before starting.
2. **Obtain credentials** from the human (or secure secret store). Never read or write passwords into the repo. Substitute `{{TEST_EMAIL}}` / `{{TEST_PASSWORD}}`.
3. **Use a real browser** (Cursor browser MCP or equivalent) against production. Prefer desktop `1280×800` unless a UC specifies mobile.
4. **Execute UCs in index order** unless the human asks for a subset. Record Pass / Fail / Skip per ID.
5. **Follow production safety rules** in the catalog preface (no account deletion, no subscription cancel, no real broker OAuth unless instructed, minimize AI quota burn).
6. **Dismiss overlays** once per session (cookies, What's New, theme tour) before asserting UI.
7. **Deliver a QA Report** at the end using the template below.

## QA Report template

```md
## QA Report
- Scope: production-user-test-catalog (list UC IDs run)
- Environment: https://trefolio.com
- Account: {{TEST_EMAIL}} (tier if known)
- Results:
  - PASS: UC-…
  - FAIL: UC-… — short reason + evidence
  - SKIP: UC-… — reason (flag/tier/missing data)
- Findings: […]
- Risk level: Low | Medium | High
```

## Related

- Product specs: [`../product-specs/index.md`](../product-specs/index.md)
- QA skill: [`.cursor/skills/qa-tester/SKILL.md`](../../.cursor/skills/qa-tester/SKILL.md)
- E2E automation (local): `e2e/*.spec.ts` — separate from this catalog
