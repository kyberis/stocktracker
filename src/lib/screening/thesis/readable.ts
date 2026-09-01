import { fill, getScreeningCopy } from "@/lib/screening/copy";
import type {
  ThesisAssessment,
  ThesisDraft,
  ThesisFact,
  ThesisMetricRow,
  ThesisSoftAssessment,
} from "@/lib/screening/thesis/schemas";
import {
  adjectiveFor,
  cagrSpanYears,
  compoundedChangePct,
  mustDescribeBuyback,
  mustDescribeFcfGenerates,
} from "@/lib/screening/thesis/metrics/adjectives";
import { metricById } from "@/lib/screening/thesis/metrics/compute";
import {
  formatMetric,
  formatMetricUnreliable,
  formatMetricValue,
  metricLocaleFromTag,
} from "@/lib/screening/thesis/metrics/format";
import { publishedMetricValue } from "@/lib/screening/thesis/metrics/validate";
import type { Metric } from "@/lib/screening/thesis/metrics/types";
import { formatAttractivenessCheck } from "@/lib/screening/attractiveness-readable";

export type SnapshotTone = "ok" | "watch" | "unknown";

export interface ThesisSnapshotLine {
  text: string;
  tone: SnapshotTone;
}

export interface ReadableThesis {
  headline: string;
  business: string;
  whatHappened: string | null;
  strengths: ThesisSnapshotLine[];
  weaknesses: ThesisSnapshotLine[];
  /** One block per attractiveness check: data / meaning / interpretation. */
  checks: Array<{
    id: string;
    title: string;
    data: string;
    meaning: string;
    interpretation: string;
    status: "pass" | "fail" | "unknown" | "skipped";
  }>;
  conclusion: string;
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

function rowsToMetrics(rows: ThesisMetricRow[] | undefined): Metric[] {
  return (rows ?? []).map(({ ticker: _ticker, ...m }) => m);
}

function pub(metric: Metric | undefined): number | null {
  return metric ? publishedMetricValue(metric) : null;
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
  metrics?: ThesisMetricRow[];
}): ReadableThesis {
  const t = getScreeningCopy(opts.locale).thesisReport;
  const loc = metricLocaleFromTag(opts.locale);
  const name = opts.companyName.trim() || opts.ticker;
  const metrics = rowsToMetrics(opts.metrics);
  const a1 = gate(opts.assessment, "EQ:A1");
  const d1 = gate(opts.assessment, "EQ:D1");
  const e1 =
    gate(opts.assessment, "balance_sheet").passed != null
      ? gate(opts.assessment, "balance_sheet")
      : gate(opts.assessment, "EQ:E1");
  const d7 =
    gate(opts.assessment, "capital_allocation").passed != null
      ? gate(opts.assessment, "capital_allocation")
      : gate(opts.assessment, "EQ:D7");

  const coverageM = metricById(metrics, "interestCoverage");
  const fcfM = metricById(metrics, "fcfToNetIncome");
  const ndM = metricById(metrics, "netDebtToEbitda");
  const shareM = metricById(metrics, "shareCountCagr");
  const roicM = metricById(metrics, "roic");
  const cagrM = metricById(metrics, "revenueCagr");
  const drawM = metricById(metrics, "drawdown52w");
  const upsideM = metricById(metrics, "targetUpside");
  const peNowM = metricById(metrics, "peCurrent");
  const peHistM = metricById(metrics, "peHistoric");

  const d1n = pub(fcfM) ?? num(opts.facts, "EQ:D1");
  const e1n = pub(ndM) ?? num(opts.facts, "EQ:E1");
  const e2n = pub(coverageM) ?? num(opts.facts, "EQ:E2");
  const roic = pub(roicM) ?? num(opts.facts, "EQ:B1");
  const cagrPct =
    pub(cagrM) ??
    (num(opts.facts, "EQ:C1") != null ? num(opts.facts, "EQ:C1")! * 100 : null);
  const sharePct = pub(shareM);
  const fwdPe = num(opts.facts, "calc:fwd_pe");
  const histPe = pub(peHistM) ?? num(opts.facts, "calc:hist_pe_avg");
  const upside = pub(upsideM) ?? num(opts.facts, "calc:upside_pct");

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

  let whatHappened: string | null = null;
  if (drawM && drawM.flags.includes("major_drawdown") && drawM.status !== "error") {
    whatHappened = fill(t.whatHappenedDrawdown, {
      value: formatMetric(drawM, loc),
    });
  }

  const strengths: ThesisSnapshotLine[] = [];
  const weaknesses: ThesisSnapshotLine[] = [];

  if (a1.passed === true) {
    strengths.push({ text: t.gateBusinessOk, tone: "ok" });
  } else if (a1.passed === false) {
    weaknesses.push({ text: t.gateBusinessFail, tone: "watch" });
  }

  if (fcfM?.status === "error") {
    weaknesses.push({
      text: fill(t.gateCashFail, { value: formatMetricUnreliable(loc) }),
      tone: "unknown",
    });
  } else if (d1n != null) {
    const shown = fcfM ? formatMetric(fcfM, loc) : formatMetricValue(d1n, "x", loc);
    if (mustDescribeFcfGenerates(d1n)) {
      strengths.push({ text: fill(t.gateCashGenerates, { value: shown }), tone: "ok" });
    } else if (d1.passed === false) {
      weaknesses.push({ text: fill(t.gateCashFail, { value: shown }), tone: "watch" });
    } else {
      strengths.push({ text: fill(t.gateCashOk, { value: shown }), tone: "ok" });
    }
  }

  if (ndM?.status === "error") {
    weaknesses.push({
      text: fill(t.gateDebtFail, { value: formatMetricUnreliable(loc) }),
      tone: "unknown",
    });
  } else if (e1n != null) {
    const shown = ndM ? formatMetric(ndM, loc) : formatMetricValue(e1n, "x", loc);
    if (e1.passed === false) {
      weaknesses.push({ text: fill(t.gateDebtFail, { value: shown }), tone: "watch" });
    } else if (e1.passed === true) {
      strengths.push({ text: fill(t.gateDebtOk, { value: shown }), tone: "ok" });
    }
  }

  if (coverageM?.status === "error" || (coverageM && e2n == null)) {
    weaknesses.push({ text: t.coverageUnavailable, tone: "unknown" });
  } else if (e2n != null) {
    const adj = coverageM
      ? adjectiveFor(coverageM, loc)
      : e2n < 1.5
        ? loc === "es"
          ? "crítica"
          : "critical"
        : e2n < 3
          ? loc === "es"
            ? "ajustada"
            : "tight"
          : e2n <= 6
            ? loc === "es"
              ? "razonable"
              : "reasonable"
            : loc === "es"
              ? "holgada"
              : "comfortable";
    const shown = coverageM
      ? formatMetric(coverageM, loc)
      : formatMetricValue(e2n, "x", loc);
    const line = fill(t.coverageLine, { adj: adj ?? t.coverageUnavailable, value: shown });
    if (adj === "critical" || adj === "crítica" || adj === "tight" || adj === "ajustada") {
      weaknesses.push({ text: line, tone: "watch" });
    } else {
      strengths.push({ text: line, tone: "ok" });
    }
  }

  if (roic != null && roic >= 15) {
    const shown = roicM ? formatMetric(roicM, loc) : formatMetricValue(roic, "pct", loc);
    strengths.push({ text: fill(t.roicOk, { value: shown }), tone: "ok" });
  }

  if (mustDescribeBuyback(sharePct ?? null) && shareM && shareM.status !== "error") {
    const years = cagrSpanYears(shareM.period.label) ?? 3;
    const cumulative = Math.abs(compoundedChangePct(sharePct!, years));
    strengths.push({
      text: fill(t.shareBuyback, {
        cagr: formatMetric(shareM, loc),
        cumulative: formatMetricValue(cumulative, "pct", loc),
        years: String(years),
      }),
      tone: "ok",
    });
  } else if (d7.passed === false) {
    weaknesses.push({ text: t.gateDilutionFail, tone: "watch" });
  } else if (d7.passed === true && !mustDescribeBuyback(sharePct ?? null)) {
    strengths.push({ text: t.gateDilutionOk, tone: "ok" });
  }

  if (cagrPct != null && cagrPct < 0) {
    const shown = cagrM ? formatMetric(cagrM, loc) : formatMetricValue(cagrPct, "pct", loc);
    weaknesses.push({ text: fill(t.revenueDown, { value: shown }), tone: "watch" });
  }

  const outlookBits: string[] = [];
  if (opts.draft?.variant_perception.consensus_view) {
    outlookBits.push(opts.draft.variant_perception.consensus_view);
  } else if (upside != null || (fwdPe != null && histPe != null) || peNowM) {
    if (upside != null) {
      const shown = upsideM
        ? formatMetric(upsideM, loc)
        : formatMetricValue(upside, "pct", loc);
      outlookBits.push(fill(t.outlookUpside, { value: shown }));
    }
    if (upsideM?.flags.includes("stale_target")) {
      outlookBits.push(t.staleTarget);
    }
    if (peNowM && peNowM.status !== "error" && peNowM.value != null) {
      outlookBits.push(fill(t.outlookCurrentPe, { value: formatMetric(peNowM, loc) }));
    }
    if (fwdPe != null && histPe != null) {
      outlookBits.push(
        fill(t.outlookPe, {
          fwd: formatMetricValue(fwdPe, "x", loc),
          hist: formatMetricValue(histPe, "x", loc),
        }),
      );
    }
  }
  if (metrics.some((m) => m.flags.includes("mixed_period"))) {
    outlookBits.push(t.mixedPeriod);
  }
  if (coverageM?.flags.includes("stale_filing") || ndM?.flags.includes("stale_filing")) {
    const filed = coverageM?.source.filingDate || ndM?.source.filingDate;
    if (filed) outlookBits.push(fill(t.staleFiling, { date: filed }));
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

  const checkMeta: Record<
    string,
    { titleEn: string; titleEs: string; meaningEn: string; meaningEs: string }
  > = {
    pe_vs_history: {
      titleEn: "P/E vs history & market",
      titleEs: "PER vs historia y mercado",
      meaningEn:
        "Compares the current earnings multiple with the company’s own 5-year average and peers. A discount while quality holds can signal cheapness.",
      meaningEs:
        "Compara el múltiplo actual de beneficios con la media histórica a 5 años y con el mercado. Un descuento manteniendo calidad puede indicar baratura.",
    },
    eps_growth: {
      titleEn: "EPS growth",
      titleEs: "Crecimiento del BPA",
      meaningEn:
        "Sustained earnings-per-share growth correlates more with long-term price than revenue growth alone.",
      meaningEs:
        "El crecimiento sostenido del beneficio por acción correlaciona más con el precio a largo plazo que el de las ventas.",
    },
    margin_trend: {
      titleEn: "Margin trend",
      titleEs: "Tendencia de márgenes",
      meaningEn:
        "Stable or expanding operating/net margins suggest pricing power; recurring margin decline is a warning.",
      meaningEs:
        "Márgenes operativos/netos estables o en expansión sugieren poder de precios; la caída recurrente es una alerta.",
    },
    graham_rule: {
      titleEn: "Graham fair multiple",
      titleEs: "Múltiplo justo (Graham)",
      meaningEn:
        "Fair P/E ≈ 8.5 + 2× expected growth %. High multiples need matching growth.",
      meaningEs:
        "PER justo ≈ 8,5 + 2× crecimiento esperado %. Los múltiplos exigentes requieren ese crecimiento.",
    },
    balance_sheet: {
      titleEn: "Balance sheet",
      titleEs: "Balance",
      meaningEn:
        "Low leverage or net cash lets the firm absorb rate, cost or demand shocks.",
      meaningEs:
        "Baja deuda o caja neta permite absorber shocks de tipos, costes o demanda.",
    },
    moat: {
      titleEn: "Competitive advantage",
      titleEs: "Ventaja competitiva",
      meaningEn:
        "Moat / pricing power protects against inflation and competition.",
      meaningEs:
        "El foso / poder de precios protege frente a inflación y competencia.",
    },
    capital_allocation: {
      titleEn: "Capital allocation",
      titleEs: "Asignación de capital",
      meaningEn:
        "Buybacks when cheap and disciplined dividends raise per-share value; severe dilution does the opposite.",
      meaningEs:
        "Recompras baratas y dividendos disciplinados elevan el valor por acción; la dilución severa hace lo contrario.",
    },
    price_to_book: {
      titleEn: "Price-to-book",
      titleEs: "Precio / valor contable",
      meaningEn:
        "For financials, conglomerates and asset businesses, P/B vs a reasonable band matters.",
      meaningEs:
        "En financieras, conglomerados y negocios patrimoniales, el P/B frente a un múltiplo razonable importa.",
    },
  };

  const es = loc === "es";
  const checks = opts.assessment.gates.map((g) => {
    const meta = checkMeta[g.field_id];
    const status: "pass" | "fail" | "unknown" | "skipped" =
      g.passed === true
        ? "pass"
        : g.passed === false
          ? "fail"
          : g.note?.toLowerCase().includes("not primary") ||
              g.note?.toLowerCase().includes("p/b")
            ? "skipped"
            : "unknown";
    const formatted = formatAttractivenessCheck({
      checkId: g.field_id,
      locale: opts.locale,
      facts: opts.facts,
      status,
    });
    return {
      id: g.field_id,
      title: meta
        ? es
          ? meta.titleEs
          : meta.titleEn
        : g.field_id,
      data: formatted.data,
      meaning: formatted.meaning,
      interpretation: formatted.interpretation,
      status,
    };
  });

  const conclusion =
    opts.draft?.statement?.trim() ||
    (es
      ? `Lectura: ${t.verdicts[opts.assessment.verdict]}. Informativo, no es asesoramiento.`
      : `Reading: ${t.verdicts[opts.assessment.verdict]}. Informational, not advice.`);

  return {
    headline,
    business,
    whatHappened,
    strengths,
    weaknesses,
    checks,
    conclusion,
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
  ];
  if (article.whatHappened) {
    lines.push("", t.sectionWhatHappened, article.whatHappened);
  }
  if (article.checks.length > 0) {
    lines.push("", locale.startsWith("es") ? "Checks de atractivo" : "Attractiveness checks");
    for (const c of article.checks) {
      lines.push(
        "",
        `${c.title} [${c.status}]`,
        locale.startsWith("es") ? `Dato: ${c.data}` : `Data: ${c.data}`,
        locale.startsWith("es") ? `Significado: ${c.meaning}` : `Meaning: ${c.meaning}`,
        locale.startsWith("es")
          ? `Interpretación: ${c.interpretation}`
          : `Interpretation: ${c.interpretation}`,
      );
    }
  }
  lines.push(
    "",
    locale.startsWith("es") ? "Conclusión" : "Conclusion",
    article.conclusion,
    "",
    t.sectionStrengths,
    ...article.strengths.map((s) => `• ${s.text}`),
    "",
    t.sectionWeaknesses,
    ...article.weaknesses.map((s) => `• ${s.text}`),
    "",
    t.sectionOutlook,
    article.outlook,
  );
  if (article.invalidation) {
    lines.push("", t.sectionInvalidation, article.invalidation);
  }
  if (article.openQuestions) {
    lines.push("", t.sectionOpen, article.openQuestions);
  }
  return lines.filter((l, i, arr) => !(l === "" && arr[i - 1] === "")).join("\n");
}
