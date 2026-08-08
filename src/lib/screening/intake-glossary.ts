import type { ScreeningCopy } from "./copy";
import type { ExplainEntry } from "./intake-script";

/**
 * Given the assistant's chat message, return the ExplainEntry rows that
 * clarify the financial terms mentioned in it. Terms come from the same
 * copy used by the scripted questions and brief row tips, so the definitions
 * stay consistent across the flow. Case-insensitive matches, dedup by term,
 * max 4 entries.
 */
type Trigger = {
  /** Regex(es) that trigger this glossary entry when they appear in the text. */
  patterns: RegExp[];
  pick: (copy: ScreeningCopy) => ExplainEntry | undefined;
};

function at(
  entries: ReadonlyArray<ExplainEntry> | undefined,
  index: number,
): ExplainEntry | undefined {
  return entries?.[index];
}

function fromRowHelp(
  copy: ScreeningCopy,
  key: keyof ScreeningCopy["intake"]["rowHelp"],
  term: string,
): ExplainEntry {
  const help = copy.intake.rowHelp[key];
  return {
    term,
    def: help.what,
    ...("higher" in help && help.higher ? { higher: help.higher } : {}),
    ...("lower" in help && help.lower ? { lower: help.lower } : {}),
  };
}

const TRIGGERS: Trigger[] = [
  // Sectors + preset (from questions.sectors.explain)
  {
    patterns: [/\bsector(?:s|es)?\b/i, /\bindustry\b/i, /\bindustria\b/i],
    pick: (c) => at(c.intake.questions.sectors.explain, 0),
  },
  {
    patterns: [/\bpreset\b/i, /\bmy\s+screen\b/i, /\bmi\s+cribado\b/i],
    pick: (c) => at(c.intake.questions.preset.explain, 0),
  },
  // Market cap
  {
    patterns: [
      /\bmarket\s*cap(italization)?\b/i,
      /\bcapitalización(?:\s+de\s+mercado)?\b/i,
      /\bmarketcap\b/i,
    ],
    pick: (c) => at(c.intake.questions.size.explain, 0) ?? fromRowHelp(c, "marketCap", c.intake.presets.marketCap.label),
  },
  // Valuation family
  {
    patterns: [
      /\bforward\s*p\/?e\b/i,
      /\bfwd\s*pe\b/i,
      /\bp\/?e\s*forward\b/i,
      /\bper\s+forward\b/i,
      /\bp\/e\b/i,
    ],
    pick: (c) => at(c.intake.questions.valuation.explain, 0) ?? fromRowHelp(c, "fwdPe", c.intake.presets.fwdPe.label),
  },
  {
    patterns: [
      /\bev\s*\/\s*ebitda\b/i,
      /\btev\s*\/\s*ebitda\b/i,
      /\bev\s*ebitda\b/i,
      /\btevebitda\b/i,
      /\btev\s*ebitda\b/i,
    ],
    pick: (c) => fromRowHelp(c, "tevEbitda", c.intake.presets.tevEbitda.label),
  },
  {
    patterns: [/\bp\s*\/\s*fcf\b/i, /\bpfcf\b/i, /\bprice\s*to\s*free\s*cash\s*flow\b/i],
    pick: (c) => fromRowHelp(c, "pFcf", c.intake.presets.pFcf.label),
  },
  {
    patterns: [/\btev\s*\/\s*sales\b/i, /\bev\s*\/\s*sales\b/i, /\btev\s*sales\b/i],
    pick: (c) => fromRowHelp(c, "tevSales", c.intake.presets.tevSales.label),
  },
  // Quality / balance sheet family
  {
    patterns: [/\broic\b/i, /\breturn\s+on\s+invested\s+capital\b/i],
    pick: (c) => at(c.intake.questions.quality.explain, 0) ?? fromRowHelp(c, "roic", c.intake.presets.roic.label),
  },
  {
    patterns: [/\bgross\s+margin\b/i, /\bmargen\s+bruto\b/i],
    pick: (c) => fromRowHelp(c, "grossMargin", c.intake.presets.grossMargin.label),
  },
  {
    patterns: [/\bebit\s+margin\b/i, /\bmargen\s+ebit\b/i],
    pick: (c) => fromRowHelp(c, "ebitMargin", c.intake.presets.ebitMargin.label),
  },
  {
    patterns: [
      /\bnd\s*\/?\s*ebitda\b/i,
      /\bndebitda\b/i,
      /\bnet\s*debt\s*\/?\s*ebitda\b/i,
      /\bdeuda\s+neta\s*\/?\s*ebitda\b/i,
    ],
    pick: (c) => at(c.intake.questions.quality.explain, 1) ?? fromRowHelp(c, "ndEbitda", c.intake.presets.ndEbitda.label),
  },
  {
    patterns: [
      /\bcurrent\s+ratio\b/i,
      /\bcurrentratio\b/i,
      /\brazón\s+corriente\b/i,
      /\bratio\s+corriente\b/i,
    ],
    pick: (c) => fromRowHelp(c, "currentRatio", c.intake.presets.currentRatio.label),
  },
  {
    patterns: [
      /\bdebt\s*\/?\s*equity\b/i,
      /\bdebtequity\b/i,
      /\bdeuda\s*\/?\s*patrimonio\b/i,
    ],
    pick: (c) => fromRowHelp(c, "debtEquity", c.intake.presets.debtEquity.label),
  },
  // Growth
  {
    patterns: [
      /\brevenue\s+cagr\b/i,
      /\bsales\s+cagr\b/i,
      /\bcagr\s+de\s+ingresos\b/i,
      /\bcagr\s+de\s+ventas\b/i,
      /\bcagr\b/i,
    ],
    pick: (c) => at(c.intake.questions.growth.explain, 0) ?? fromRowHelp(c, "revenueCagr", c.intake.presets.revenueCagr.label),
  },
  // Region
  {
    patterns: [/\bregion(?:s)?\b/i, /\bregión(?:es)?\b/i, /\bgeograf/i],
    pick: (c) => at(c.intake.questions.region.explain, 0),
  },
  // Candidate count
  {
    patterns: [/\bcandidat(?:e|o)s?\b/i, /\bnumber\s+of\s+candidates\b/i, /\bnº\s+de\s+candidatos\b/i],
    pick: (c) => at(c.intake.questions.count.explain, 0),
  },
];

const MAX_ENTRIES = 4;

export function pickGlossaryFor(text: string, copy: ScreeningCopy): ExplainEntry[] {
  if (!text) return [];
  const found: ExplainEntry[] = [];
  const seen = new Set<string>();
  for (const trigger of TRIGGERS) {
    if (found.length >= MAX_ENTRIES) break;
    if (!trigger.patterns.some((p) => p.test(text))) continue;
    const entry = trigger.pick(copy);
    if (!entry) continue;
    if (seen.has(entry.term)) continue;
    seen.add(entry.term);
    found.push(entry);
  }
  return found;
}
