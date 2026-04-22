# tech-debt-tracker.md

Known debt, not currently scheduled. Each entry should be a one-liner plus a
link to the spec or design-doc that explains the problem in depth.

Format: `- [<domain>] <short debt>. <link>.`

## Open

- [Portfolio Core] `derive-holdings` edge cases for partial sells and splits.
  [`../product-specs/derive-holdings.md`](../product-specs/derive-holdings.md).
- [Market Data] Yahoo rate-limit mitigation; document FMP fallback matrix.
  [`../product-specs/quotes-provider-abstraction.md`](../product-specs/quotes-provider-abstraction.md).
- [Crypto] CoinLore symbol mapping fragile; few tests.
  [`../product-specs/crypto-market.md`](../product-specs/crypto-market.md).
- [SnapTrade] Partial-sync failures not surfaced in UI; only logged server-side.
  [`../product-specs/snaptrade-import.md`](../product-specs/snaptrade-import.md).
- [Screener & Search] No scheduled job to expand the 600-stock universe.
  [`../product-specs/stock-screener.md`](../product-specs/stock-screener.md).
- [AI Intelligence] Prompts duplicated across routes; no eval harness.
  [`../product-specs/ai-stream.md`](../product-specs/ai-stream.md).
- [Tools] Backtest performance degrades on long histories.
  [`../product-specs/backtest-whatif.md`](../product-specs/backtest-whatif.md).
- [Social] No report / moderation UI yet.
  [`../product-specs/social-posts.md`](../product-specs/social-posts.md).
- [Private Chat] Polling-based; latency noticeable on typing indicators.
  [`../product-specs/private-chat.md`](../product-specs/private-chat.md).
- [Sharing & Widgets] Widget theme parity not covered in CI.
  [`../product-specs/widgets-developer-console.md`](../product-specs/widgets-developer-console.md).
- [Device] Pairing UX on spotty Wi-Fi; no retry UI on the Leaf.
  [`../product-specs/trefolio-leaf-device.md`](../product-specs/trefolio-leaf-device.md).
- [Mobile] iOS push entitlements setup not scripted.
  [`../product-specs/capacitor-mobile.md`](../product-specs/capacitor-mobile.md).
- [Platform] Theme parity CI gate missing.
  [`../product-specs/theming.md`](../product-specs/theming.md).

## Resolved

(Move items here with a date and commit ref when closed.)
