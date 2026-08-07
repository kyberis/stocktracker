import type { ScreeningCopy } from "./copy";
import { fill } from "./copy";
import type {
  BriefCriterion,
  ScreeningIntent,
  ScreeningRiskProfile,
} from "./schemas";

/**
 * Scripted intake. No model runs here: the agent's questions, the options and
 * what each option writes into the brief are all deterministic, so stage E2 can
 * swap in a real Intake agent behind the same brief shape.
 */

export type ExplainEntry = { term: string; def: string };

export type BriefPatch = {
  criteria?: BriefCriterion[];
  includeSectors?: string[];
  excludeSectors?: string[];
  regions?: string[];
  candidateCount?: number;
  riskProfile?: ScreeningRiskProfile;
};

export type IntakeOption = {
  id: string;
  label: string;
  /** What we echo as the user's reply, so the transcript reads like a conversation. */
  say: string;
  patch: BriefPatch;
};

export type IntakeQuestion = {
  id: string;
  ask: string;
  explain: ExplainEntry[];
  options: IntakeOption[];
};

/** Order used to render the brief so it always reads the same way. */
export const BRIEF_CRITERION_ORDER = [
  "marketCap",
  "ndEbitda",
  "currentRatio",
  "roic",
  "grossMargin",
  "ebitMargin",
  "fwdPe",
  "tevEbitda",
  "pFcf",
  "tevSales",
  "debtEquity",
  "revenueCagr",
  "region",
] as const;

export type PresetKey = (typeof BRIEF_CRITERION_ORDER)[number];

export const REGION_CODES = {
  allThree: ["us_canada", "europe", "asia_pacific"],
  europe: ["europe"],
  usEurope: ["us_canada", "europe"],
} as const;

function preset(copy: ScreeningCopy, key: PresetKey, source: BriefCriterion["source"]): BriefCriterion {
  return { key, condition: copy.intake.presets[key].condition, source };
}

function presetAll(copy: ScreeningCopy, source: BriefCriterion["source"]): BriefCriterion[] {
  return BRIEF_CRITERION_ORDER.map((key) => preset(copy, key, source));
}

/** Full preset used both by the "apply my screen" option and by the early exit. */
export function presetBrief(copy: ScreeningCopy): BriefPatch {
  return {
    criteria: presetAll(copy, "preset"),
    regions: [...REGION_CODES.allThree],
  };
}

/** Label shown in the brief table for a criterion or structural field. */
export function briefRowLabel(copy: ScreeningCopy, key: string): string {
  if (key in copy.intake.presets) {
    return copy.intake.presets[key as PresetKey].label;
  }
  if (key in copy.intake.fields) {
    return copy.intake.fields[key as keyof ScreeningCopy["intake"]["fields"]];
  }
  return key;
}

export type IntakeContext = {
  intent: ScreeningIntent;
  /** Sector labels suggested by the rebalance entry point, already localized. */
  suggestedInclude: string[];
  suggestedExclude: string[];
};

export function buildIntakeScript(copy: ScreeningCopy, ctx: IntakeContext): IntakeQuestion[] {
  const q = copy.intake.questions;
  const v = copy.intake.values;
  const include = ctx.suggestedInclude.join(", ");
  const exclude = ctx.suggestedExclude.join(", ");

  const sectorsQuestion: IntakeQuestion =
    ctx.intent === "rebalance"
      ? {
          id: "sectors",
          ask: fill(
            ctx.suggestedExclude.length ? q.sectors.askRebalance : q.sectors.askRebalanceNoExclude,
            { include, exclude },
          ),
          explain: q.sectors.explain,
          options: [
            {
              id: "keep",
              label: q.sectors.options.keep.label,
              say: q.sectors.options.keep.say,
              patch: {
                includeSectors: ctx.suggestedInclude,
                excludeSectors: ctx.suggestedExclude,
              },
            },
            {
              id: "dropExclusion",
              label: q.sectors.options.dropExclusion.label,
              say: q.sectors.options.dropExclusion.say,
              patch: { includeSectors: ctx.suggestedInclude, excludeSectors: [] },
            },
            {
              id: "wholeUniverse",
              label: q.sectors.options.wholeUniverse.label,
              say: q.sectors.options.wholeUniverse.say,
              patch: { includeSectors: [], excludeSectors: [] },
            },
          ],
        }
      : {
          id: "sectors",
          ask: q.sectors.askExplore,
          explain: q.sectors.explain,
          options: [
            {
              id: "wholeUniverse",
              label: q.sectors.options.wholeUniverse.label,
              say: q.sectors.options.wholeUniverse.say,
              patch: { includeSectors: [], excludeSectors: [] },
            },
            {
              id: "avoidTech",
              label: q.sectors.options.avoidTech.label,
              say: q.sectors.options.avoidTech.say,
              patch: { includeSectors: [], excludeSectors: ["Technology"] },
            },
            ...(ctx.suggestedInclude.length
              ? [
                  {
                    id: "onlySuggested",
                    label: fill("{sector}", { sector: ctx.suggestedInclude[0] }),
                    say: fill("{sector}.", { sector: ctx.suggestedInclude[0] }),
                    patch: {
                      includeSectors: [ctx.suggestedInclude[0]],
                      excludeSectors: [],
                    },
                  },
                ]
              : []),
          ],
        };

  return [
    sectorsQuestion,
    {
      id: "preset",
      ask: q.preset.ask,
      explain: q.preset.explain,
      options: [
        {
          id: "applyAll",
          label: q.preset.options.applyAll.label,
          say: q.preset.options.applyAll.say,
          patch: presetBrief(copy),
        },
        {
          id: "oneByOne",
          label: q.preset.options.oneByOne.label,
          say: q.preset.options.oneByOne.say,
          patch: {},
        },
      ],
    },
    {
      id: "size",
      ask: q.size.ask,
      explain: q.size.explain,
      options: [
        {
          id: "keepPreset",
          label: q.size.options.keepPreset.label,
          say: q.size.options.keepPreset.say,
          patch: { criteria: [preset(copy, "marketCap", "confirmed")] },
        },
        {
          id: "onlyLarge",
          label: q.size.options.onlyLarge.label,
          say: q.size.options.onlyLarge.say,
          patch: {
            criteria: [{ key: "marketCap", condition: v.marketCapLarge, source: "chat" }],
          },
        },
        {
          id: "noLimit",
          label: q.size.options.noLimit.label,
          say: q.size.options.noLimit.say,
          patch: {
            criteria: [{ key: "marketCap", condition: v.marketCapAny, source: "chat" }],
          },
        },
      ],
    },
    {
      id: "valuation",
      ask: q.valuation.ask,
      explain: q.valuation.explain,
      options: [
        {
          id: "keepAll",
          label: q.valuation.options.keepAll.label,
          say: q.valuation.options.keepAll.say,
          patch: {
            criteria: [
              preset(copy, "fwdPe", "confirmed"),
              preset(copy, "tevEbitda", "confirmed"),
              preset(copy, "pFcf", "confirmed"),
              preset(copy, "tevSales", "confirmed"),
            ],
          },
        },
        {
          id: "stricter",
          label: q.valuation.options.stricter.label,
          say: q.valuation.options.stricter.say,
          patch: {
            criteria: [
              { key: "fwdPe", condition: v.fwdPeStrict, source: "chat" },
              preset(copy, "tevEbitda", "confirmed"),
              preset(copy, "pFcf", "confirmed"),
              preset(copy, "tevSales", "confirmed"),
            ],
          },
        },
        {
          id: "onlyTwo",
          label: q.valuation.options.onlyTwo.label,
          say: q.valuation.options.onlyTwo.say,
          patch: {
            criteria: [
              preset(copy, "fwdPe", "confirmed"),
              preset(copy, "pFcf", "confirmed"),
              { key: "tevEbitda", condition: v.none, source: "chat" },
              { key: "tevSales", condition: v.none, source: "chat" },
            ],
          },
        },
      ],
    },
    {
      id: "quality",
      ask: q.quality.ask,
      explain: q.quality.explain,
      options: [
        {
          id: "keepAll",
          label: q.quality.options.keepAll.label,
          say: q.quality.options.keepAll.say,
          patch: {
            criteria: [
              preset(copy, "roic", "confirmed"),
              preset(copy, "grossMargin", "confirmed"),
              preset(copy, "ebitMargin", "confirmed"),
              preset(copy, "ndEbitda", "confirmed"),
              preset(copy, "currentRatio", "confirmed"),
              preset(copy, "debtEquity", "confirmed"),
            ],
          },
        },
        {
          id: "netCash",
          label: q.quality.options.netCash.label,
          say: q.quality.options.netCash.say,
          patch: {
            criteria: [
              preset(copy, "roic", "confirmed"),
              preset(copy, "grossMargin", "confirmed"),
              preset(copy, "ebitMargin", "confirmed"),
              { key: "ndEbitda", condition: v.netCashOnly, source: "chat" },
              preset(copy, "currentRatio", "confirmed"),
              preset(copy, "debtEquity", "confirmed"),
            ],
          },
        },
        {
          id: "highRoic",
          label: q.quality.options.highRoic.label,
          say: q.quality.options.highRoic.say,
          patch: {
            criteria: [
              { key: "roic", condition: v.roicHigh, source: "chat" },
              preset(copy, "grossMargin", "confirmed"),
              preset(copy, "ebitMargin", "confirmed"),
              preset(copy, "ndEbitda", "confirmed"),
              preset(copy, "currentRatio", "confirmed"),
              preset(copy, "debtEquity", "confirmed"),
            ],
          },
        },
      ],
    },
    {
      id: "growth",
      ask: q.growth.ask,
      explain: q.growth.explain,
      options: [
        {
          id: "keepPreset",
          label: q.growth.options.keepPreset.label,
          say: q.growth.options.keepPreset.say,
          patch: { criteria: [preset(copy, "revenueCagr", "confirmed")] },
        },
        {
          id: "higher",
          label: q.growth.options.higher.label,
          say: q.growth.options.higher.say,
          patch: {
            criteria: [{ key: "revenueCagr", condition: v.revenueCagrHigh, source: "chat" }],
          },
        },
      ],
    },
    {
      id: "region",
      ask: q.region.ask,
      explain: q.region.explain,
      options: [
        {
          id: "allThree",
          label: q.region.options.allThree.label,
          say: q.region.options.allThree.say,
          patch: {
            criteria: [preset(copy, "region", "confirmed")],
            regions: [...REGION_CODES.allThree],
          },
        },
        {
          id: "europe",
          label: q.region.options.europe.label,
          say: q.region.options.europe.say,
          patch: {
            criteria: [{ key: "region", condition: v.regionEurope, source: "chat" }],
            regions: [...REGION_CODES.europe],
          },
        },
        {
          id: "usEurope",
          label: q.region.options.usEurope.label,
          say: q.region.options.usEurope.say,
          patch: {
            criteria: [{ key: "region", condition: v.regionUsEurope, source: "chat" }],
            regions: [...REGION_CODES.usEurope],
          },
        },
      ],
    },
    {
      id: "count",
      ask: q.count.ask,
      explain: q.count.explain,
      options: [
        {
          id: "five",
          label: q.count.options.five.label,
          say: q.count.options.five.say,
          patch: { candidateCount: 5 },
        },
        {
          id: "three",
          label: q.count.options.three.label,
          say: q.count.options.three.say,
          patch: { candidateCount: 3 },
        },
      ],
    },
    {
      id: "riskProfile",
      ask: q.riskProfile.ask,
      explain: q.riskProfile.explain,
      options: [
        {
          id: "conservative",
          label: q.riskProfile.options.conservative.label,
          say: q.riskProfile.options.conservative.say,
          patch: { riskProfile: "conservative" },
        },
        {
          id: "balanced",
          label: q.riskProfile.options.balanced.label,
          say: q.riskProfile.options.balanced.say,
          patch: { riskProfile: "balanced" },
        },
        {
          id: "aggressive",
          label: q.riskProfile.options.aggressive.label,
          say: q.riskProfile.options.aggressive.say,
          patch: { riskProfile: "aggressive" },
        },
      ],
    },
  ];
}
