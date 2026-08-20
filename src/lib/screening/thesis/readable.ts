import { fill, getScreeningCopy } from "@/lib/screening/copy";
import type {
  ThesisAssessment,
  ThesisDraft,
  ThesisFact,
  ThesisSoftAssessment,
} from "@/lib/screening/thesis/schemas";

export type SnapshotTone = "ok" | "watch" | "unknown";

export interface ThesisSnapshotLine {
  text: string;
  tone: SnapshotTone;
}

export interface ReadableThesis {
  headline: string;
  business: string;
  strengths: ThesisSnapshotLine[];
  weaknesses: ThesisSnapshotLine[];
  outlook: string;
  invalidation: string | null;
  openQuestions: string | null;
  horizonMonths: number;
  conviction: number;
}

function num(facts: ThesisFact[], fieldId: string): number | null {
  const v = facts.find((f) => f.field_id === fieldId)?.value;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function fmt(n: number, digits = 2): string {
  return n.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}

function gate(
  assessment: ThesisAssessment,
  fieldId: string,
): { passed: boolean | null; value: unknown } {
  const row = assessment.gates.find((g) => g.field_id === fieldId);
  return { passed: row?.passed ?? null, value: row?.value ?? null };
}

function quoteFor(
  soft: ThesisSoftAssessment[],
  fieldId: string,
): string | null {
  const row = soft.find((s) => s.field_id === fieldId);
  const q = row?.evidence[0]?.quote?.trim();
  return q && q.length >= 10 ? q : null;
}

const OPEN_FIELDS: Record<string, "openMoat" | "openMgmt" | "openInsiders" | "openMix" | "openNews" | "openCatalysts"> =
  {
    "EQ:B7": "openMoat",
    "EQ:F10": "openMgmt",
    "EQ:F7": "openInsiders",
    "EQ:A3": "openMix",
    "EQ:I6": "openNews",
    "EQ:J2": "openCatalysts",
  };

export function buildReadableThesis(opts: {
  locale: string;
  companyName: string;
  ticker: string;
  industry?: string | null;
  businessSummary?: string | null;
  assessment: ThesisAssessment;
  facts: ThesisFact[];
  soft: ThesisSoftAssessment[];
  draft: ThesisDraft | null;
}): ReadableThesis {
  const t = getScreeningCopy(opts.locale).thesisReport;
  const name = opts.companyName.trim() || opts.ticker;
  const a1 = gate(opts.assessment, "EQ:A1");
  const d1 = gate(opts.assessment, "EQ:D1");
  const e1 = gate(opts.assessment, "EQ:E1");
  const e2 = gate(opts.assessment, "EQ:E2");
  const d7 = gate(opts.assessment, "EQ:D7");
  const d1n = num(opts.facts, "EQ:D1");
  const e1n = num(opts.facts, "EQ:E1");
  const e2n = num(opts.facts, "EQ:E2");
  const fwdPe = num(opts.facts, "calc:fwd_pe");
  const histPe = num(opts.facts, "calc:hist_pe_avg");
  const upside = num(opts.facts, "calc:upside_pct");
  const roic = num(opts.facts, "EQ:B1");
  const cagr = num(opts.facts, "EQ:C1");

  let headline = t.verdicts[opts.assessment.verdict] ?? opts.assessment.verdict;
  if (opts.assessment.verdict === "watchlist_gate_failed") {
    if (d7.passed === false) headline = t.headlineWatchlistDilution;
    else if (d1.passed === false) headline = t.headlineWatchlistCash;
    else if (e1.passed === false) headline = t.headlineWatchlistLeverage;
    else headline = t.headlineWatchlistGeneric;
  }

  const fromProfile = opts.businessSummary?.trim();
  const fromQuote = quoteFor(opts.soft, "EQ:A1");
  const industry = opts.industry?.trim();
  let business = fromProfile || fromQuote || "";
  if (!business) {
    business = industry
      ? fill(t.businessFromIndustry, { name, industry, ticker: opts.ticker })
      : fill(t.businessFallback, { name, ticker: opts.ticker });
  } else if (industry && !business.toLowerCase().includes(industry.toLowerCase())) {
    business = `${name} (${opts.ticker}) — ${industry}. ${business}`;
  } else if (!business.includes(opts.ticker)) {
    business = `${name} (${opts.ticker}). ${business}`;
  }

  const strengths: ThesisSnapshotLine[] = [];
  const weaknesses: ThesisSnapshotLine[] = [];

  if (a1.passed === true) {
    strengths.push({ text: t.gateBusinessOk, tone: "ok" });
  } else if (a1.passed === false) {
    weaknesses.push({ text: t.gateBusinessFail, tone: "watch" });
  }

  if (d1.passed === true && d1n != null) {
    strengths.push({
      text: fill(t.gateCashOk, { value: fmt(d1n) }),
      tone: "ok",
    });
  } else if (d1.passed === false) {
    weaknesses.push({
      text: fill(t.gateCashFail, { value: d1n != null ? fmt(d1n) : "—" }),
      tone: "watch",
    });
  }

  if (e1.passed === true && e1n != null) {
    strengths.push({
      text: fill(t.gateDebtOk, { value: fmt(e1n) }),
      tone: "ok",
    });
  } else if (e1.passed === false && e1n != null) {
    weaknesses.push({
      text: fill(t.gateDebtFail, { value: fmt(e1n) }),
      tone: "watch",
    });
  }

  if (e2.passed === true && e2n != null) {
    strengths.push({
      text: fill(t.gateCoverageOk, { value: fmt(e2n, 1) }),
      tone: "ok",
    });
  } else if (e2.passed === false && e2n != null) {
    weaknesses.push({
      text: fill(t.gateCoverageFail, { value: fmt(e2n, 1) }),
      tone: "watch",
    });
  }

  if (roic != null && roic >= 15) {
    strengths.push({
      text: fill(t.roicOk, { value: fmt(roic, 1) }),
      tone: "ok",
    });
  }

  if (d7.passed === false) {
    weaknesses.push({ text: t.gateDilutionFail, tone: "watch" });
  } else if (d7.passed === true) {
    strengths.push({ text: t.gateDilutionOk, tone: "ok" });
  }

  if (cagr != null && cagr < 0) {
    weaknesses.push({
      text: fill(t.revenueDown, { value: fmt(cagr * 100, 1) }),
      tone: "watch",
    });
  }

  const outlookBits: string[] = [];
  if (opts.draft?.variant_perception.consensus_view) {
    outlookBits.push(opts.draft.variant_perception.consensus_view);
  } else if (upside != null || (fwdPe != null && histPe != null)) {
    if (upside != null) outlookBits.push(fill(t.outlookUpside, { value: fmt(upside, 1) }));
    if (fwdPe != null && histPe != null) {
      outlookBits.push(fill(t.outlookPe, { fwd: fmt(fwdPe, 1), hist: fmt(histPe, 1) }));
    }
  }
  outlookBits.push(t.outlookNotGuidance);
  const outlook = outlookBits.join(" ");

  const kill = opts.draft?.kill_criteria[0];
  const invalidation =
    kill?.metric_field_id === "EQ:D1"
      ? t.invalidationCash
      : kill?.label && !/EQ:/.test(kill.label)
        ? fill(t.invalidationLabeled, { label: kill.label })
        : kill
          ? t.invalidationCash
          : null;

  const openNames = opts.soft
    .filter(
      (s) =>
        s.confidence === "insufficient_evidence" && OPEN_FIELDS[s.field_id],
    )
    .map((s) => t[OPEN_FIELDS[s.field_id]]);
  const uniqueOpen = [...new Set(openNames)];
  const openQuestions =
    uniqueOpen.length > 0
      ? fill(t.openQuestionsTemplate, {
          items: uniqueOpen.join(t.openQuestionsJoin),
        })
      : null;

  return {
    headline,
    business,
    strengths,
    weaknesses,
    outlook,
    invalidation,
    openQuestions,
    horizonMonths: opts.draft?.horizon_months ?? 36,
    conviction: opts.draft?.conviction ?? 2,
  };
}

/** Full note for LLM storage / fallback writeup. Avoids buy/sell/hold. */
export function joinReadableThesis(article: ReadableThesis, locale: string): string {
  const t = getScreeningCopy(locale).thesisReport;
  const lines = [
    article.headline,
    "",
    t.sectionBusiness,
    article.business,
    "",
    t.sectionStrengths,
    ...article.strengths.map((s) => `• ${s.text}`),
    "",
    t.sectionWeaknesses,
    ...article.weaknesses.map((s) => `• ${s.text}`),
    "",
    t.sectionOutlook,
    article.outlook,
  ];
  if (article.invalidation) {
    lines.push("", t.sectionInvalidation, article.invalidation);
  }
  if (article.openQuestions) {
    lines.push("", t.sectionOpen, article.openQuestions);
  }
  return lines.filter((l, i, arr) => !(l === "" && arr[i - 1] === "")).join("\n");
}
