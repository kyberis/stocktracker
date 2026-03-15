# Dividend Depth — Investment Roadmap

Competitive gap identified in [Competitor Value Comparison Report](./competitor-value-comparison-report.html) (March 2026).
Sharesight and Snowball Analytics users explicitly cite dividend depth as a reason to stay or switch.

---

## Delivered (v1.38)

- [x] **Yield-on-Cost (YOC)** — per-holding and portfolio-level, displayed in estimated dividend card and per-stock table
- [x] **DRIP Simulation** — interactive what-if chart in the dividend tab showing compounded reinvestment vs cash dividends over 5–30 years

---

## Phase 2 — Near-Term (1–2 quarters)

- [ ] **DRIP transaction tracking** — flag dividend transactions as "reinvested" vs "cash payout" during import; show DRIP vs non-DRIP breakdown in history
- [ ] **Historical YOC evolution** — chart showing how YOC has changed over time per holding (requires storing historical DPS snapshots)
- [ ] **Dividend streak & safety scores** — per-holding indicator showing consecutive years of dividend growth, payout ratio health, and coverage ratio
- [ ] **Dividend growth rate (CAGR)** — compute actual dividend CAGR from transaction history, use as default for projections instead of flat 10%
- [ ] **Per-holding DRIP cost basis** — when DRIP transactions are tracked, automatically adjust FIFO cost basis for reinvested shares

## Phase 3 — Strategic Horizon

- [ ] **Dividend calendar with payment dates** — show actual expected payment dates (not just ex-dates) using Alpha Vantage/Yahoo data
- [ ] **Dividend income target tracker** — goal-based view: "I want €X/month in dividend income" with progress bar and required investment
- [ ] **Dividend tax optimization** — surface withholding tax drag per holding and suggest tax-efficient alternatives (e.g., accumulating vs distributing ETFs)
- [ ] **Dividend reinvestment backtester** — "what if I had reinvested all dividends since purchase?" using historical price data
- [ ] **Broker DRIP enrollment detection** — detect from SnapTrade/CSV whether broker has auto-DRIP enabled; surface this in holdings

---

## Competitive Benchmarks

| Feature | trefolio | Sharesight | Snowball | Capitally |
|---------|----------|------------|----------|-----------|
| Current yield | ✓ | ✓ | ✓ | ✓ |
| Yield-on-cost | ✓ (v1.38) | ✓ | ✓ | ✓ |
| DRIP simulation | ✓ (v1.38) | ✗ | ✓ | ✓ |
| DRIP transaction tracking | planned | ✓ | ~ | ~ |
| Dividend streak/safety | planned | ✗ | ✓ | ✗ |
| Historical YOC | planned | ✗ | ~ | ✗ |
| Dividend CAGR | planned | ✓ | ✓ | ~ |

---

_Last updated: March 2026_
