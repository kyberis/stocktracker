import { ensureInitialized } from "./client";
import { str } from "./helpers";
import type { MoatEvaluation, CriterionStatus } from "../types";

export interface MoatCacheEntry {
  symbol: string;
  companyName: string;
  sector: string;
  industry: string;
  evaluationJson: string;
  totalScore: number;
  maxScore: number;
  scorePct: number;
  verdict: string;
  passedCount: number;
  criteriaCount: number;
  peRatio: number | null;
  updatedAt: string;
}

export interface MoatCacheRow {
  symbol: string;
  companyName: string;
  sector: string;
  industry: string;
  scorePct: number;
  verdict: string;
  passedCount: number;
  criteriaCount: number;
  peRatio: number | null;
  earningsConsistencyStatus: string | null;
  grossMarginStatus: string | null;
  netMarginStatus: string | null;
  retainedEarningsStatus: string | null;
  returnOnEquityStatus: string | null;
  debtSustainabilityStatus: string | null;
  capexEfficiencyStatus: string | null;
  productDurabilityStatus: string | null;
  updatedAt: string;
}

export interface MoatScreenerFilters {
  scoreMin?: number;
  scoreMax?: number;
  verdict?: string;
  sector?: string;
  industry?: string;
  earningsConsistency?: CriterionStatus;
  grossMargin?: CriterionStatus;
  netMargin?: CriterionStatus;
  retainedEarnings?: CriterionStatus;
  returnOnEquity?: CriterionStatus;
  debtSustainability?: CriterionStatus;
  capexEfficiency?: CriterionStatus;
  productDurability?: CriterionStatus;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface MoatScreenerResponse {
  results: MoatCacheRow[];
  total: number;
  page: number;
  limit: number;
}

function criterionByKey(criteria: MoatEvaluation["criteria"], key: string) {
  return criteria.find((c) => c.key === key) ?? null;
}

export async function upsertMoatCache(evaluation: MoatEvaluation): Promise<void> {
  const client = await ensureInitialized();
  const scorePct = evaluation.maxScore > 0
    ? Math.round((evaluation.totalScore / evaluation.maxScore) * 1000) / 10
    : 0;

  const c = (key: string) => criterionByKey(evaluation.criteria, key);

  await client.execute({
    sql: `INSERT OR REPLACE INTO moat_cache (
      symbol, company_name, sector, industry, evaluation_json,
      total_score, max_score, score_pct, verdict, passed_count, criteria_count,
      earnings_consistency_score, earnings_consistency_status,
      gross_margin_score, gross_margin_status,
      net_margin_score, net_margin_status,
      retained_earnings_score, retained_earnings_status,
      return_on_equity_score, return_on_equity_status,
      debt_sustainability_score, debt_sustainability_status,
      capex_efficiency_score, capex_efficiency_status,
      product_durability_score, product_durability_status,
      pe_ratio, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    args: [
      evaluation.symbol,
      evaluation.companyName,
      evaluation.sector,
      evaluation.industry,
      JSON.stringify(evaluation),
      evaluation.totalScore,
      evaluation.maxScore,
      scorePct,
      evaluation.verdict,
      evaluation.passedCount,
      evaluation.criteriaCount,
      c("earnings_consistency")?.score ?? null,
      c("earnings_consistency")?.status ?? null,
      c("gross_margin")?.score ?? null,
      c("gross_margin")?.status ?? null,
      c("net_margin")?.score ?? null,
      c("net_margin")?.status ?? null,
      c("retained_earnings")?.score ?? null,
      c("retained_earnings")?.status ?? null,
      c("return_on_equity")?.score ?? null,
      c("return_on_equity")?.status ?? null,
      c("debt_sustainability")?.score ?? null,
      c("debt_sustainability")?.status ?? null,
      c("capex_efficiency")?.score ?? null,
      c("capex_efficiency")?.status ?? null,
      c("product_durability")?.score ?? null,
      c("product_durability")?.status ?? null,
      evaluation.valuation.peRatio,
    ],
  });
}

export async function getMoatCache(
  symbol: string,
  maxAgeDays = 7,
): Promise<MoatCacheEntry | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT symbol, company_name, sector, industry, evaluation_json,
            total_score, max_score, score_pct, verdict, passed_count, criteria_count,
            pe_ratio, updated_at
          FROM moat_cache
          WHERE symbol = ? AND updated_at >= datetime('now', ? || ' days')`,
    args: [symbol, `-${maxAgeDays}`],
  });
  const row = result.rows[0];
  if (!row) return null;
  return {
    symbol: str(row.symbol),
    companyName: str(row.company_name),
    sector: str(row.sector),
    industry: str(row.industry),
    evaluationJson: str(row.evaluation_json),
    totalScore: Number(row.total_score),
    maxScore: Number(row.max_score),
    scorePct: Number(row.score_pct),
    verdict: str(row.verdict),
    passedCount: Number(row.passed_count),
    criteriaCount: Number(row.criteria_count),
    peRatio: row.pe_ratio != null ? Number(row.pe_ratio) : null,
    updatedAt: str(row.updated_at),
  };
}

const VALID_SORT_COLUMNS: Record<string, string> = {
  score: "score_pct",
  symbol: "symbol",
  company: "company_name",
  sector: "sector",
  pe: "pe_ratio",
  passed: "passed_count",
  updated: "updated_at",
};

const VALID_STATUSES = new Set(["pass", "warning", "fail"]);

export async function queryMoatCache(
  filters: MoatScreenerFilters,
): Promise<MoatScreenerResponse> {
  const client = await ensureInitialized();
  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (filters.scoreMin != null) {
    conditions.push("score_pct >= ?");
    args.push(filters.scoreMin);
  }
  if (filters.scoreMax != null) {
    conditions.push("score_pct <= ?");
    args.push(filters.scoreMax);
  }
  if (filters.verdict) {
    conditions.push("verdict = ?");
    args.push(filters.verdict);
  }
  if (filters.sector) {
    conditions.push("sector = ?");
    args.push(filters.sector);
  }
  if (filters.industry) {
    conditions.push("industry = ?");
    args.push(filters.industry);
  }

  const criterionFilters: [string, CriterionStatus | undefined][] = [
    ["earnings_consistency_status", filters.earningsConsistency],
    ["gross_margin_status", filters.grossMargin],
    ["net_margin_status", filters.netMargin],
    ["retained_earnings_status", filters.retainedEarnings],
    ["return_on_equity_status", filters.returnOnEquity],
    ["debt_sustainability_status", filters.debtSustainability],
    ["capex_efficiency_status", filters.capexEfficiency],
    ["product_durability_status", filters.productDurability],
  ];

  for (const [col, val] of criterionFilters) {
    if (val && VALID_STATUSES.has(val)) {
      conditions.push(`${col} = ?`);
      args.push(val);
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const sortCol = VALID_SORT_COLUMNS[filters.sortBy || ""] || "score_pct";
  const sortDir = filters.sortDir === "asc" ? "ASC" : "DESC";
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 20));
  const offset = (page - 1) * limit;

  const [countResult, dataResult] = await Promise.all([
    client.execute({ sql: `SELECT COUNT(*) as cnt FROM moat_cache ${whereClause}`, args }),
    client.execute({
      sql: `SELECT symbol, company_name, sector, industry, score_pct, verdict,
              passed_count, criteria_count, pe_ratio,
              earnings_consistency_status, gross_margin_status, net_margin_status,
              retained_earnings_status, return_on_equity_status, debt_sustainability_status,
              capex_efficiency_status, product_durability_status, updated_at
            FROM moat_cache ${whereClause}
            ORDER BY ${sortCol} ${sortDir} NULLS LAST
            LIMIT ? OFFSET ?`,
      args: [...args, limit, offset],
    }),
  ]);

  return {
    results: dataResult.rows.map((row) => ({
      symbol: str(row.symbol),
      companyName: str(row.company_name),
      sector: str(row.sector),
      industry: str(row.industry),
      scorePct: Number(row.score_pct),
      verdict: str(row.verdict),
      passedCount: Number(row.passed_count),
      criteriaCount: Number(row.criteria_count),
      peRatio: row.pe_ratio != null ? Number(row.pe_ratio) : null,
      earningsConsistencyStatus: str(row.earnings_consistency_status) || null,
      grossMarginStatus: str(row.gross_margin_status) || null,
      netMarginStatus: str(row.net_margin_status) || null,
      retainedEarningsStatus: str(row.retained_earnings_status) || null,
      returnOnEquityStatus: str(row.return_on_equity_status) || null,
      debtSustainabilityStatus: str(row.debt_sustainability_status) || null,
      capexEfficiencyStatus: str(row.capex_efficiency_status) || null,
      productDurabilityStatus: str(row.product_durability_status) || null,
      updatedAt: str(row.updated_at),
    })),
    total: Number(countResult.rows[0]?.cnt) || 0,
    page,
    limit,
  };
}

export async function getMoatCacheMeta(): Promise<{
  sectors: string[];
  industries: string[];
  verdicts: string[];
  total: number;
}> {
  const client = await ensureInitialized();
  const [sectorsRes, industriesRes, verdictsRes, countRes] = await Promise.all([
    client.execute("SELECT DISTINCT sector FROM moat_cache WHERE sector != '' ORDER BY sector"),
    client.execute("SELECT DISTINCT industry FROM moat_cache WHERE industry != '' ORDER BY industry"),
    client.execute("SELECT DISTINCT verdict FROM moat_cache WHERE verdict != '' ORDER BY verdict"),
    client.execute("SELECT COUNT(*) as cnt FROM moat_cache"),
  ]);
  return {
    sectors: sectorsRes.rows.map((r) => str(r.sector)),
    industries: industriesRes.rows.map((r) => str(r.industry)),
    verdicts: verdictsRes.rows.map((r) => str(r.verdict)),
    total: Number(countRes.rows[0]?.cnt) || 0,
  };
}
