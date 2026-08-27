# Broker last as namesake identity (SnapTrade)

- **Status:** active
- **Owner:** agent
- **Started:** 2026-08-27
- **Target:** 2026-08-28

## Goal

When SnapTrade labels a European security with a US namesake ticker (no ISIN, US MIC/FIGI/name), trefolio still quotes the **listing whose Yahoo last matches the broker last**, then keeps using Yahoo for NAV. After the next sync of `tatupane@gmail.com`, BITC is valued near CoinShares (~€65), not NYSE Bitwise (~$35), and the mark-gap banner for that ticker clears.

## Acceptance criteria

- [x] Unsuffixed ticker + mark gap (≥5% and ≥€100) + a European Yahoo listing within 20% of broker last (in EUR, and much closer than the US namesake) → persist that listing’s ISIN and re-quote. Do **not** switch NAV to broker last.
- [x] If the current Yahoo last already matches the broker (within 5% EUR), do not remap (true stale Flex stays a notify-only gap).
- [x] If no candidate matches the broker, do not remap; existing mark-gap notify still runs.
- [x] Discovered non-US ISIN is **sticky** on the next sync when SnapTrade still omits ISIN (`nextIsin = pos.isin || existing.isin`).
- [x] FIGI ticker-rename in `upsertHoldingsFromPositions` must **not** overwrite a sticky non-US ISIN (or unsuffix `BITC.DE` back to `BITC`).
- [x] Unit tests for picker + sticky ISIN + FIGI non-clobber; BITC fixture: broker $65.45 vs US ~$35 vs `GB00BLD4ZL17.SG` / `BITC.SW`.
- [ ] After production deploy, SnapTrade cron or manual sync for user `7a97c282-cfd1-46c1-bffa-3439d454d28d`: BITC `isin` set, `value_in_eur` ≈ 257 × CoinShares last, mark gap for BITC gone or below threshold.
- [x] Release note `type: "fix"` on a patch (2.5.241). Landing skip (`feature:landing-reviewed`) because this is not a new top-level capability.
- [x] Specs: [broker-mark-reconciliation](../../product-specs/broker-mark-reconciliation.md) and [snaptrade-import](../../product-specs/snaptrade-import.md) document namesake remap vs stale-mark notify.

## Plan

### 1. Pure picker (no I/O)

New module e.g. `src/lib/snaptrade-namesake-remap.ts`:

- Input: `{ ticker, exchange, brokerPrice, brokerCurrency, marketPrice?, marketCurrency?, marketValueEUR, shares }` plus candidate quotes `{ symbol, price, currency }[]`.
- Convert broker and each quote to EUR with existing `convertToEUR` / `hasExchangeRate`.
- `usMatchesBroker` iff relative gap vs min(brokerEUR, marketEUR) &lt; `NAMESAKE_MATCH_REL` (0.05).
- Eligible candidate: European Yahoo suffix **or** symbol starts with a non-US ISIN (reuse `EUROPEAN_YAHOO_SUFFIX` / `isNonUsIsin` / `pickYahooSymbolForIsin` ideas from `isin-resolver.ts`).
- Pick the eligible candidate with the smallest EUR relative gap to broker, only if that gap &lt; 0.05 **and** `!usMatchesBroker`.
- Output: `{ symbol, isin? }` or `null`.

Keep `MARK_GAP_*` thresholds as the gate to even run search (do not Yahoo-search every position).

### 2. Candidate fetch (Yahoo only)

For a gated gap on an **unsuffixed** Yahoo symbol (`yahooSymbolIsUnsuffixed`):

1. `yahoo.search(baseTicker)` — keep EQUITY/ETF.
2. Try explicit suffixes: `.SW`, `.DE`, `.AS`, `.L`, `.SG`, `.PA`, `.MI` (cap ~6 getQuote calls).
3. Prefer ISIN-shaped symbols in search hits (`GB00….SG`) via `pickYahooSymbolForIsin` when the hit looks like an ISIN.
4. Deduplicate symbols; skip the current unsuffixed US symbol.
5. Bound with existing Yahoo timeouts; fail open (no remap).

Do **not** use SnapTrade FIGI / OpenFIGI as the identity source (production BITC FIGI is the US namesake).

### 3. Wire after first enrich, before notify

Today: `upsertHoldingsFromPositions` (includes `enrichValueInEUR`) → `reconcileSnapTradeMarksAndNotify` in `snaptrade-fetch.ts` and cron `snaptrade-sync`.

Insert **`remapNamesakesFromBrokerMarks(userId, positions, upserted)`** between them:

1. Run `compareBrokerMarks` (no notify).
2. For each gap whose ticker is unsuffixed, fetch candidates and pick.
3. `UPDATE holdings SET isin = ?` (primary). Optional: set ticker/exchange only if we also implement FIGI non-clobber (step 4). Prefer **sticky ISIN + keep ticker `BITC`** so `marketDataSymbolForHolding` already quotes by ISIN (`unsuffixed + non-US ISIN`).
4. Re-run `enrichValueInEUR` for remapped rows (or the full upserted list).
5. Return updated holdings to `reconcileSnapTradeMarksAndNotify` so the banner uses post-remap marks.

Same hook on manual fetch and hourly cron.

### 4. FIGI rename must not undo the remap

In `upsertHoldingsFromPositions`, FIGI match currently renames `BITC.DE` → incoming `BITC`. Guard:

- If existing row has a non-US ISIN, **do not** FIGI-rename onto an unsuffixed incoming ticker.
- Sticky ISIN path: `nextIsin = pos.isin || existing.isin` already keeps GB ISIN when SnapTrade sends `""`.

Add a unit test that replays: existing `BITC` + `GB00BLD4ZL17` + FIGI `BBG01FZQP6S8`, incoming SnapTrade `BITC` / ARCA / empty ISIN / same FIGI → isin remains GB, quotes still by ISIN.

### 5. Tests

| Case | Expect |
| --- | --- |
| BITC fixture (broker 65.45 USD, US last ~35, SG/SW ~64 EUR) | pick ISIN listing |
| US last already within 5% of broker | no remap |
| Only US quote, no European hit | no remap; gap notify |
| Sticky ISIN on second upsert | isin kept; `marketDataSymbolForHolding` → ISIN |
| FIGI rename vs sticky ISIN | no clobber |
| AAPL unsuffixed, tiny FX gap | never searches / never remaps |

Mock Yahoo search/quote; no live network in unit tests.

### 6. Specs, notes, ship

- Patch release `2.5.241`, `type: "fix"` EN+ES.
- `npm run feature:landing-reviewed -- "2.5.241: namesake remap is broker-sync mapping, not landing"` and commit `.cursor/feature-gate.json`.
- `npm run prepr`. After merge: production `GET /api/cron/snaptrade-sync`, re-query user `7a97c282-…` BITC `isin` + `value_in_eur` + `mark_reconciliation_json`.

## Decisions log

- 2026-08-26: ISIN-first quoting shipped in 2.5.240; production SnapTrade payload for this user has **no ISIN**, MIC `ARCX`, name Bitwise Trendwise, FIGI `BBG01FZQP6S8`. Broker last $65.45 vs Yahoo ~$34.85 (Δ ≈ €5.5k).
- 2026-08-27: Do not trust SnapTrade FIGI/name for namesakes. Use broker last vs Yahoo listings as identity check. Prefer sticky ISIN over renaming to `BITC.DE` to avoid FIGI reverse-remap.
- 2026-08-27: Keep Yahoo as valuation once the listing is chosen. Mark-gap notify remains for true stale marks.

## Risks

- **False remap:** illiquid US BITC with a Flex print that coincidentally matches CoinShares. Mitigation: only remap when US last does **not** match broker and a European/ISIN listing **does**.
- **FX / listing currency:** compare in EUR only when FX is present; skip candidate if FX missing (never treat USD as EUR).
- **Yahoo quota:** only search gap rows (this user: 1 ticker). Cap suffixes.
- **Name stays “Bitwise…”** if we only persist ISIN. Acceptable for v1 (NAV correctness). Follow-up: refresh name from Yahoo `shortName` of the chosen listing.

## Follow-ups

- Optional display ticker `BITC.DE` once FIGI non-clobber is proven in prod.
- Optional: show “mapped via broker last” in admin/raw for support.
- If SnapTrade later sends ISIN, prefer `pos.isin` (already `pos.isin || existing.isin`).
