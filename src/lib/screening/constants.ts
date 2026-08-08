/**
 * Screening pipeline sizing knobs.
 *
 * Hard Data pulls a wide FMP pool, ranks a compact research universe (~20),
 * then IR / Web / Technicals fan out over that universe. The Compiler (and
 * report) shortlists at most SCREENING_MAX_CANDIDATES for the user.
 */
export const HARD_DATA_FMP_FETCH_LIMIT = 120;
/** Tickers passed to the Hard Data LLM for ranking / deep research. */
export const HARD_DATA_RANK_UNIVERSE = 20;
/** Max candidates shown in the final report. User does not choose this. */
export const SCREENING_MAX_CANDIDATES = 5;
/** Per-ticker IR / Web / Technicals fan-out after Hard Data (= research universe). */
export const IR_FANOUT_MAX = HARD_DATA_RANK_UNIVERSE;
