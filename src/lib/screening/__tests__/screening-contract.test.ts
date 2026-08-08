import { describe, expect, it } from "vitest";
import { SCREENING_CRITERIA, SCREENING_MAX_SCORE } from "../criteria";
import { getScreeningCopy } from "../copy";
import {
  buildMockRun,
  createMockRunId,
  getMockScreeningReport,
  MOCK_RUN_TOTAL_SECONDS,
} from "../mock-pipeline";
import { screeningBriefSchema } from "../schemas";
import {
  applyPatch,
  buildBriefRows,
  emptyBrief,
  fillFromPreset,
  toScreeningBrief,
} from "../brief-state";
import { BRIEF_CRITERION_ORDER, buildIntakeScript, presetBrief } from "../intake-script";

const RUN_ID = "mock-abc-test";
const CREATED_AT = Date.now();
const runId = createMockRunId(CREATED_AT);

describe("mock report fixture", () => {
  it("satisfies the ScreeningReport contract the agents will produce", () => {
    // getMockScreeningReport parses with the shared schema and throws on drift.
    const report = getMockScreeningReport(RUN_ID);
    expect(report.jobId).toBe(RUN_ID);
    expect(report.cards.length).toBeGreaterThan(0);
    expect(report.disclaimer.length).toBeGreaterThan(0);
  });

  it("only references criterion ids that exist in the registry", () => {
    const knownIds = new Set(SCREENING_CRITERIA.map((c) => c.id));
    for (const card of getMockScreeningReport(RUN_ID).cards) {
      for (const id of [...card.stepsPassed, ...card.stepsFailed]) {
        expect(knownIds, `card ${card.ticker} references criterion ${id}`).toContain(id);
      }
      expect(card.stepsPassed.filter((id) => card.stepsFailed.includes(id))).toEqual([]);
    }
  });

  it("keeps scores within the scored-criteria ceiling", () => {
    for (const card of getMockScreeningReport(RUN_ID).cards) {
      if (card.score == null) continue;
      expect(card.score).toBeLessThanOrEqual(SCREENING_MAX_SCORE);
      expect(card.score).toBeGreaterThanOrEqual(0);
    }
  });

  it("keeps every card in the comparison table and priority order", () => {
    const report = getMockScreeningReport(RUN_ID);
    const tickers = report.cards.map((c) => c.ticker).sort();
    expect(report.comparisonRows.map((r) => r.ticker).sort()).toEqual(tickers);
    expect(report.priorityOrder.slice().sort()).toEqual(tickers);
  });

  it("trims to the candidate count without leaving orphan rows", () => {
    const report = getMockScreeningReport(RUN_ID, 3);
    expect(report.cards).toHaveLength(3);
    const tickers = new Set(report.cards.map((c) => c.ticker));
    expect(report.comparisonRows.every((r) => tickers.has(r.ticker))).toBe(true);
    expect(report.priorityOrder.every((t) => tickers.has(t))).toBe(true);
  });
});

describe("mock run progress", () => {
  it("starts with every step pending and no report", () => {
    const run = buildMockRun(runId, CREATED_AT);
    expect(run).not.toBeNull();
    expect(run!.status).toBe("running");
    expect(run!.progressPct).toBe(0);
    expect(run!.reportReady).toBe(false);
    expect(run!.steps.every((s) => s.status === "pending")).toBe(true);
  });

  it("completes once the mock duration elapsed", () => {
    const run = buildMockRun(runId, CREATED_AT + MOCK_RUN_TOTAL_SECONDS * 1000);
    expect(run!.status).toBe("completed");
    expect(run!.progressPct).toBe(100);
    expect(run!.reportReady).toBe(true);
  });

  it("advances step by step", () => {
    const run = buildMockRun(runId, CREATED_AT + 1500);
    const statuses = run!.steps.map((s) => s.status);
    expect(statuses[0]).toBe("done");
    expect(statuses[1]).toBe("running");
    expect(statuses.at(-1)).toBe("pending");
  });

  it("rejects ids it did not mint", () => {
    expect(buildMockRun("not-a-run")).toBeNull();
    expect(buildMockRun("mock-zzz")).toBeNull();
  });
});

describe("brief state", () => {
  const copy = getScreeningCopy("es");

  it("produces a payload the API accepts", () => {
    let state = emptyBrief("rebalance");
    state = applyPatch(state, {
      includeSectors: ["Healthcare"],
      excludeSectors: ["Technology"],
    });
    state = applyPatch(state, presetBrief(copy));
    state = applyPatch(state, { candidateCount: 3 });

    const parsed = screeningBriefSchema.safeParse(toScreeningBrief(state, "es"));
    expect(parsed.success).toBe(true);
    // Core preset is intentionally coarse (5 criteria), not the full 13-key wall.
    expect(parsed.success && parsed.data.criteria).toHaveLength(5);
    expect(parsed.success && parsed.data.candidateCount).toBe(5);
  });

  it("reports exactly what the preset assumed on an early exit", () => {
    const { state, filledLabels } = fillFromPreset(emptyBrief("explore"), copy, {
      includeSectors: [],
      excludeSectors: [],
      candidateCount: 5,
    });
    expect(state.endedEarly).toBe(true);
    // 5 core criteria + include + exclude + risk profile (candidate count is fixed, not labelled).
    expect(filledLabels).toHaveLength(5 + 3);
    expect(state.candidateCount).toBe(5);
    expect(state.riskProfile).toBe("balanced");
  });

  it("does not overwrite answers the user already gave", () => {
    let state = emptyBrief("explore");
    state = applyPatch(state, {
      criteria: [{ key: "roic", condition: "> 15%", source: "chat" }],
      candidateCount: 3,
    });
    const { state: filled, filledLabels } = fillFromPreset(state, copy, {
      includeSectors: [],
      excludeSectors: [],
      candidateCount: 5,
    });
    expect(filled.criteria.roic.condition).toBe("> 15%");
    expect(filled.criteria.roic.source).toBe("chat");
    expect(filled.candidateCount).toBe(3);
    expect(filledLabels).not.toContain(copy.intake.fields.candidateCount);
    expect(toScreeningBrief(filled, "en").candidateCount).toBe(5);
  });

  it("orders brief rows the same way regardless of answer order", () => {
    let state = emptyBrief("explore");
    state = applyPatch(state, { candidateCount: 5, riskProfile: "balanced" });
    state = applyPatch(state, { includeSectors: [], excludeSectors: [] });
    state = applyPatch(state, presetBrief(copy));

    const rows = buildBriefRows(state, copy).map((r) => r.key);
    expect(rows[0]).toBe("includeSectors");
    expect(rows.at(-1)).toBe("riskProfile");
    expect(rows).not.toContain("candidateCount");
    expect(rows.filter((k) => (BRIEF_CRITERION_ORDER as readonly string[]).includes(k))).toEqual([
      "marketCap",
      "ndEbitda",
      "roic",
      "fwdPe",
      "region",
    ]);
  });
});

describe("intake script", () => {
  const copy = getScreeningCopy("es");

  it("pre-loads the rebalance sectors in the first question", () => {
    const script = buildIntakeScript(copy, {
      intent: "rebalance",
      suggestedInclude: ["Healthcare", "Utilities"],
      suggestedExclude: ["Technology"],
    });
    expect(script[0].ask).toContain("Healthcare");
    expect(script[0].ask).toContain("Technology");
    const keep = script[0].options.find((o) => o.id === "keep");
    expect(keep?.patch.includeSectors).toEqual(["Healthcare", "Utilities"]);
  });

  it("asks without a sector bias when exploring", () => {
    const script = buildIntakeScript(copy, {
      intent: "explore",
      suggestedInclude: [],
      suggestedExclude: [],
    });
    expect(script[0].ask).toBe(copy.intake.questions.sectors.askExplore);
    expect(script[0].options.map((o) => o.id)).toEqual(["wholeUniverse", "avoidTech"]);
  });

  it("leaves no placeholder unresolved and explains every question", () => {
    for (const language of ["es", "en"]) {
      const localized = getScreeningCopy(language);
      const script = buildIntakeScript(localized, {
        intent: "rebalance",
        suggestedInclude: ["Healthcare"],
        suggestedExclude: ["Technology"],
      });
      for (const question of script) {
        expect(question.ask, `${language}/${question.id}`).not.toMatch(/\{\w+\}/);
        expect(question.explain.length, `${language}/${question.id}`).toBeGreaterThan(0);
        expect(question.options.length, `${language}/${question.id}`).toBeGreaterThan(1);
      }
    }
  });
});

describe("screening copy", () => {
  it("falls back to English for languages without a translation", () => {
    expect(getScreeningCopy("de")).toBe(getScreeningCopy("en"));
    expect(getScreeningCopy("es-419")).toBe(getScreeningCopy("es"));
  });

  it("names every criterion in the registry", () => {
    for (const language of ["es", "en"]) {
      const labels = getScreeningCopy(language).criteria.labels;
      for (const criterion of SCREENING_CRITERIA) {
        const label = labels[criterion.key as keyof typeof labels];
        expect(label?.name, `${language}/${criterion.key}`).toBeTruthy();
        expect(label?.hint, `${language}/${criterion.key}`).toBeTruthy();
      }
    }
  });

  it("explains every brief row key with higher/lower guidance where numeric", () => {
    const numericKeys = new Set([
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
      "riskProfile",
    ]);
    for (const language of ["es", "en"]) {
      const help = getScreeningCopy(language).intake.rowHelp;
      for (const key of [...BRIEF_CRITERION_ORDER, "includeSectors", "excludeSectors", "riskProfile"] as const) {
        const entry = help[key as keyof typeof help];
        expect(entry?.what, `${language}/${key}`).toBeTruthy();
        if (numericKeys.has(key)) {
          expect(entry && "higher" in entry && entry.higher, `${language}/${key}.higher`).toBeTruthy();
          expect(entry && "lower" in entry && entry.lower, `${language}/${key}.lower`).toBeTruthy();
        }
      }
    }
  });
});
