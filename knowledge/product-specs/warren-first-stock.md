# warren-first-stock

> A/B: after onboarding skip, control keeps the empty import/add home; treatment opens Warren on the right with a prefilled first-stock example.

## 1. Summary

New users who skip import during onboarding land on Home. While `warren_first_stock` is **draft**, everyone sees the control empty state. After a human **Launch**, 70% see Warren docked on the right (same as Home) with a composer prefilled like “Add 7 shares of Apple at {price} USD”. Warren may ask which market, then `proposeAddHolding`; on confirm the dashboard shows the holding and Warren stays open. Not financial advice — existing Warren disclaimer remains visible.

## 2. Status

- **Tier:** Free / Bifolio / Trefolio (all signed-in users when experiment is running)
- **Feature flag:** _none_ (first-party experiment `warren_first_stock`)
- **Health:** yellow (draft until Launch in `/admin/experiments`)
- **Owning skill:** [`.cursor/skills/engineer-experiments/SKILL.md`](../../.cursor/skills/engineer-experiments/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Onboarding skip | `src/app/onboarding/page.tsx` | Redirects to `/?activateFirstStock=1` |
| Home | `src/components/homepage/HomeV2Dashboard.tsx` | Resolves experiment; treatment opens right Warren |
| Drawer | `src/components/warren/WarrenDrawer.tsx` | `side`, `initialComposerValue`, try-example chip |
| Empty control | `src/components/EmptyPortfolio.tsx` | Import + add only (no `empty_activation` A/B/C) |
| Experiment seed | migration v153 | Draft 30/70 (control / treatment); `empty_activation` paused |
| Preview | `/admin/experiments/preview?key=warren_first_stock` | Session override |

## 4. Data model

- Reuses `experiments` / `experiment_assignments`.
- Key: `warren_first_stock`. Variants: `control` (30), `warren_first_stock` (70).
- `empty_activation` is paused (no new assignments).

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/experiments/warren_first_stock` | user | Free | Sticky resolve when running; control when draft |
| POST | `/api/analytics/track` | user | Free | `first_stock_activation_shown`, `first_stock_example_sent` |
| POST | `/api/warren/confirm` | user | Free | Persist proposed holding |

## 6. UI surface

- Treatment: right Warren overlay (same as Home), prefilled composer (not auto-sent), “Try this example” chip, empty greeting.
- Control: `EmptyPortfolio` import + add + compact Warren chat box.
- Agent intro splash is suppressed for the first-stock visit.

## 7. Business logic

- Skip CSV/broker/AI import paths unchanged (`/import?method=…`).
- Treatment only if empty portfolio + query flag + variant `warren_first_stock` + experiment running (or admin preview).
- Price in the example uses `quotes.AAPL` when present, else 180.
- Empty-add appendix asks for exchange/market when ambiguous.
- Agents must not Launch the experiment from code.

## 8. External dependencies

- Same as Warren (AI Gateway) + Yahoo/FMP quotes for Apple price when cached.

## 9. Currency / FX / tax implications

- Example uses USD as display currency in the prompt; user can edit. Holdings stored EUR-base as usual.

## 10. i18n

- `warrenFirstStockGreeting`, `warrenFirstStockExample` (`{price}`), `warrenFirstStockTryExample` in `en` + `es`.

## 11. Permissions / tier gating / rate limits

- Empty-add burst 10 / 15 min still applies.
- Folio compact-model banner unchanged.

## 12. Telemetry

- `first_stock_activation_shown` (treatment panel)
- `first_stock_example_sent` (example chip)
- `holding_add` / `portfolio_import` (server)
- Admin funnel: signup → onboarding import choice → first-stock shown → empty CTA → holding add / import

## 13. Edge cases & gotchas

- Draft/paused/archived resolve to control — safe in production until Launch.
- Query flag is stripped from the URL after read; returning later without the flag does not reopen the panel.
- Closing Warren after a holding is added keeps the dashboard; drawer stays on the right.
- Legal: `warrenDisclaimer` stays on the composer (“not financial advice”).

## 14. Tests

- `src/lib/warren-first-stock.test.ts`
- `src/lib/onboarding-import-phase.test.ts`
- `src/lib/ai/warren/empty-add-stock.test.ts` (exchange ask)
- E2E empty home still control: `e2e/empty-dashboard.spec.ts`, `e2e/home-v2-empty-warren.spec.ts`

## 15. Related skills and rules

- [engineer-experiments](../../.cursor/skills/engineer-experiments/SKILL.md)
- [engineer-homepage](../../.cursor/skills/engineer-homepage/SKILL.md)
- [legal-advisor](../../.cursor/skills/legal-advisor/SKILL.md) (AI + market data display)
- [experiments](experiments.md), [warren-empty-add-stock](warren-empty-add-stock.md), [unified-homepage](unified-homepage.md)

## 16. Open questions / planned work

- Promote treatment to 100% if `holding_add` / signups wins after Launch.
