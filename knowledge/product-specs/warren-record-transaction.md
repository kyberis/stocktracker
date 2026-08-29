# Warren record transaction

> Confirm-gated ledger writes so Warren can register buys, sells, dividends, and fees the user already made — without misrouting sales to destructive `removeHolding`.

## 1. Summary

Users ask Warren (web drawer or Telegram) to **record** a trade they already executed ("registra la venta", "record this sale"). Previously Warren only had `proposeAddHolding` and destructive `proposeRemoveHolding`, so sale requests often became "Yes, delete" cards that failed with **Holding not found**. `proposeRecordTransaction` + `dispatchProposal("recordTransaction")` write a normal ledger row via `addTransaction`, then holdings sync as usual.

## 2. Status

- **Tier:** Free / Pro (same `ai_consult` quota as other Warren writes)
- **Feature flag:** _none_ (follows existing Warren / `telegram_bot_enabled`)
- **Health:** green
- **Owning skill:** [`.cursor/skills/engineer-integrations/SKILL.md`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Tool | [`src/lib/ai/warren/tools.ts`](../../src/lib/ai/warren/tools.ts) | `proposeRecordTransaction` |
| Dispatch | [`src/lib/ai/warren/dispatch.ts`](../../src/lib/ai/warren/dispatch.ts) | `runRecordTransaction` |
| API | [`src/app/api/warren/confirm/route.ts`](../../src/app/api/warren/confirm/route.ts) | Web Confirm |
| Telegram | [`src/lib/telegram/handler.ts`](../../src/lib/telegram/handler.ts) | Same `dispatchProposal` |
| UI | [`src/components/warren/ActionCard.tsx`](../../src/components/warren/ActionCard.tsx) | Non-destructive Confirm/Cancel |

## 4. Data model

No new tables. Reuses `transactions` + holdings sync in [`src/lib/db/transactions.ts`](../../src/lib/db/transactions.ts).

Proposal kind `recordTransaction` with data:

- `type`: `buy` \| `sell` \| `dividend` \| `fee`
- `ticker`, `shares`, `pricePerShare`, `currency`, optional `fees` / `taxes` / `date` / `holdingId` / `name` / `portfolioId`

Types: [`src/lib/ai/warren/types.ts`](../../src/lib/ai/warren/types.ts).

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|------|------|------|-------------|
| POST | `/api/warren/confirm` | session | Free+ | Accepts `kind: "recordTransaction"` |

Telegram confirm uses stored `telegram_proposals` + `dispatchProposal` (no new route).

## 6. UI surface

- Web: Warren `ActionCard` — label "Record transaction", Confirm (not "Yes, delete").
- Telegram: Confirmar / Cancelar (proposal is **not** `destructive`).

## 7. Business logic

- **Sell:** resolve holding via id, ticker, or name (`resolveTickerAgainstHoldings` / `matchHoldingsToQuery`); reject if missing or shares exceed position; then `addTransaction(type: "sell")`.
- **Buy:** same holdings-limit check as `addHolding`.
- **Remove holding:** still available, but must resolve a real holding before emitting; on confirm deletes position transactions then the holding row. Must not be used for "record a sale".
- System prompt: distinguish advice (`renderTradeGuidanceCard`) vs record (`proposeRecordTransaction`) vs delete (`proposeRemoveHolding`).

## 8. External dependencies

None beyond existing Warren OpenAI path and ledger/DB.

## 9. Currency / FX / tax implications

Same as manual transaction entry: amounts stored with display currency; EUR base via existing FX pipelines. Fees/taxes optional on the proposal.

## 10. i18n

Proposal card rows are English labels from the tool (same pattern as other Warren proposals). Bot scaffolding Confirm/Cancel already localized EN/ES. AI prose follows user language.

## 11. Permissions / tier gating / rate limits

- Demo mode blocks write tools.
- Holdings plan limit on buy-type records.
- Confirm required before any write.

## 12. Telemetry

- `trackEvent(userId, "warren_action", { action: "recordTransaction", type, ticker })`
- AI log `source: "warren_action"` with kind `recordTransaction`

## 13. Edge cases & gotchas

- Stale / hallucinated `holdingId` on remove used to yield **Holding not found** after the user tapped "Yes, delete" — remove now re-resolves by ticker when possible, and never emits a proposal if the holding is missing.
- Sell of a ticker not in the portfolio fails with a clear error (do not invent the position).
- Partial sell reduces shares; full sell removes the holding via `syncHoldingForTransaction` (same as web ledger).
- Do not confuse with import (`importTransactions`) or trade *advice* cards.

## 14. Tests

- [`src/lib/ai/warren/dispatch.record-transaction.test.ts`](../../src/lib/ai/warren/dispatch.record-transaction.test.ts)
- [`src/lib/ai/warren/system-prompt.test.ts`](../../src/lib/ai/warren/system-prompt.test.ts)
- [`src/lib/ai/warren/conversation-progress-intent.test.ts`](../../src/lib/ai/warren/conversation-progress-intent.test.ts)

## 15. Related docs

- [warren-telegram-bot](warren-telegram-bot.md)
- [transactions](transactions.md)
- [holdings-crud](holdings-crud.md)
