# Screening Tavily Company Research + cost ledger

> Status: active (implemented behind `screening_tavily_research_enabled`)
> Owner: screening / tools

## Goal

Ship P0–P7: per-report variable cost (LLM + Tavily; no FMP), Tavily Research for IR gap-fill and shortlist deep-dive, shared ticker cache, slim Search, `/analisis` reuse.

## Done

- Migration 133: `screening_runs.cost_usd` / `cost_json` + `screening_research_cache`
- Cost ledger: [`src/lib/screening/cost.ts`](../../src/lib/screening/cost.ts)
- Research client + cache-first helper
- Flag `screening_tavily_research_enabled`
- IR gap-fill, shortlist_research agent, slim analyst Search, web-enrich cache reuse
- Report API `cost` field; Privacy + product-spec + release 2.5.115
- Spike script: `scripts/spike-tavily-research.ts`

## Enable

1. Set `TAVILY_API_KEY`
2. Admin → enable `screening_tavily_research_enabled` for pilot users
3. Optional: `TAVILY_CREDIT_USD` (default 0.008)

## Verify

- Completed run returns `cost.costUsd` with llm + tavily breakdown (no FMP)
- Thin-IR tickers show `researchUsed` in step payload when flag on
- Shortlist step `shortlist_research` after compiler when flag on
- `/analisis` narrative uses cache when present (`usedResearchCache`)
