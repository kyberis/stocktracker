/**
 * Screening pipeline sizing knobs.
 *
 * Hard Data pulls a wide FMP pool, ranks a compact universe (~20), then
 * always shortlists at most 5 names for the rest of the pipeline.
 */
export const HARD_DATA_FMP_FETCH_LIMIT = 120;
/** Tickers passed to the Hard Data LLM for ranking. */
export const HARD_DATA_RANK_UNIVERSE = 20;
/** Max candidates researched / shown in the report. User does not choose this. */
export const SCREENING_MAX_CANDIDATES = 5;
/** Per-ticker IR / Web / Technicals fan-out after Hard Data. */
export const IR_FANOUT_MAX = 5;
