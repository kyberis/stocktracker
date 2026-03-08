## Summary

<!-- Briefly describe what this PR does and why -->

## Import Guide Sync

If this PR touches import code, were the corresponding guides updated?

- [ ] Not applicable — no import changes
- [ ] Yes — guide updated in `src/lib/import-guides.ts`

**File pairs** (changing one should update the other):

| Code file | Guide entry |
|-----------|-------------|
| `src/lib/broker-parsers/degiro.ts` | `degiro` in `import-guides.ts` |
| `src/lib/broker-parsers/interactive-brokers.ts` | `interactive_brokers_csv` in `import-guides.ts` |
| `src/lib/broker-parsers/trading212.ts` | `trading_212` in `import-guides.ts` |
| `src/lib/broker-parsers/revolut.ts` | `revolut` in `import-guides.ts` |
| `src/lib/broker-parsers/simple-csv.ts` | `simple_csv` in `import-guides.ts` |
| `src/app/api/ibkr-flex/route.ts` | `interactive_brokers_api` in `import-guides.ts` |
| `src/app/api/import-portfolio/route.ts` | `ai_import` in `import-guides.ts` |

## Test Plan

- [ ] Tested locally
- [ ] No regressions
