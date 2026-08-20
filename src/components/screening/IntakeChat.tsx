"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useFeatureFlag } from "@/lib/feature-flag-context";
import { useI18n } from "@/lib/i18n";
import { useTrack } from "@/lib/use-track";
import { fill } from "@/lib/screening/copy";
import {
  parseScreeningPipelineKind,
  type ScreeningPipelineKind,
} from "@/lib/screening/pipeline-kind";
import {
  applyPatch,
  buildBriefRows,
  emptyBrief,
  fillFromPreset,
  fromScreeningBrief,
  toScreeningBrief,
  type BriefRow,
  type BriefState,
} from "@/lib/screening/brief-state";
import { buildIntakeHref, SCREENING_INTAKE_RETURN_KEY } from "@/lib/screening/intake-href";
import { buildIntakePilotPlan, sleep } from "@/lib/screening/intake-pilot";
import { buildIntakeScript, type BriefPatch, type ExplainEntry } from "@/lib/screening/intake-script";
import { pickGlossaryFor } from "@/lib/screening/intake-glossary";
import {
  SCREENING_INTENTS,
  type IntakeAgentStatus,
  type ScreeningBrief,
  type ScreeningIntent,
} from "@/lib/screening/schemas";
import { AnalyzeCompanyPicker, type FocusListing } from "./AnalyzeCompanyPicker";
import { BriefList, BriefTable } from "./BriefTable";
import { ExplainHelpList } from "./MetricHelpTip";
import { ScreeningDisclaimer } from "./ScreeningNotices";
import { ScreeningPipelineToggle } from "./ScreeningPipelineToggle";
import { useScreeningCopy } from "./use-screening-copy";

type Bubble = {
  id: string;
  role: "agent" | "user";
  text: string;
  explain?: ExplainEntry[];
};

type Turn = { role: "user" | "assistant"; content: string };

type AgentSuggestion = { label: string; say: string };

function parseSectors(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5);
}

export function IntakeChat() {
  const router = useRouter();
  const track = useTrack();
  const { language } = useI18n();
  const { user } = useAuth();
  const { copy } = useScreeningCopy();
  const searchParams = useSearchParams();
  const newRunsEnabled = useFeatureFlag("screening_new_runs_enabled");
  const thesisEnabled = useFeatureFlag("screening_thesis_pipeline_enabled");

  const screeningQuota = user?.quotas?.investment_screening;
  const isAdmin = user?.role === "admin";
  const quotaLine =
    !isAdmin && screeningQuota
      ? screeningQuota.remaining <= 0
        ? copy.quota.exhausted
        : fill(copy.quota.remaining, {
            remaining: String(screeningQuota.remaining),
            limit: String(screeningQuota.limit),
          })
      : null;

  const intent: ScreeningIntent = useMemo(() => {
    const raw = searchParams.get("intent");
    return SCREENING_INTENTS.includes(raw as ScreeningIntent) ? (raw as ScreeningIntent) : "explore";
  }, [searchParams]);

  const suggestedInclude = useMemo(() => parseSectors(searchParams.get("include")), [searchParams]);
  const suggestedExclude = useMemo(() => parseSectors(searchParams.get("exclude")), [searchParams]);
  const pipelineFromUrl = useMemo(
    () => parseScreeningPipelineKind(searchParams.get("pipeline")),
    [searchParams],
  );
  const [pipelineKind, setPipelineKind] = useState<ScreeningPipelineKind>(pipelineFromUrl);

  useEffect(() => {
    setPipelineKind(thesisEnabled ? pipelineFromUrl : "checklist");
  }, [pipelineFromUrl, thesisEnabled]);

  const intakeReturnHref = useMemo(
    () =>
      buildIntakeHref({
        intent,
        includeSectors: suggestedInclude,
        excludeSectors: suggestedExclude,
        pipeline: thesisEnabled ? pipelineKind : "checklist",
      }),
    [intent, suggestedInclude, suggestedExclude, pipelineKind, thesisEnabled],
  );

  const script = useMemo(
    () => buildIntakeScript(copy, { intent, suggestedInclude, suggestedExclude }),
    [copy, intent, suggestedInclude, suggestedExclude],
  );

  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [transcript, setTranscript] = useState<Turn[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [brief, setBrief] = useState<BriefState>(() => emptyBrief(intent));
  const [showLaunchPanel, setShowLaunchPanel] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [agentPending, setAgentPending] = useState(false);
  const [agentStatus, setAgentStatus] = useState<IntakeAgentStatus | null>(null);
  const [agentQuestions, setAgentQuestions] = useState<string[]>([]);
  const [agentSuggestions, setAgentSuggestions] = useState<AgentSuggestion[]>([]);
  const [agentWarnings, setAgentWarnings] = useState<string[]>([]);
  const [turnError, setTurnError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pilotActive, setPilotActive] = useState(false);
  /** Analyze intent: company+exchange must be resolved before the risk script. */
  const [companyResolved, setCompanyResolved] = useState(intent !== "analyze");
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const chatScrollRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const nextIdRef = useRef(0);
  const transcriptRef = useRef<Turn[]>([]);
  const briefRef = useRef<BriefState>(emptyBrief(intent));
  const pilotAbortRef = useRef(false);
  const agentPendingRef = useRef(false);
  const isAnalyze = intent === "analyze";

  const pushBubble = useCallback((bubble: Omit<Bubble, "id">) => {
    setBubbles((prev) => {
      const id = `${nextIdRef.current++}-${bubble.role}`;
      return [...prev, { ...bubble, id }];
    });
  }, []);

  // Seed the first scripted question (with explainers). Re-runs on language/intent change.
  useEffect(() => {
    pilotAbortRef.current = true;
    setPilotActive(false);
    nextIdRef.current = 0;
    const seedBrief = emptyBrief(intent);
    briefRef.current = seedBrief;
    setBrief(seedBrief);
    setShowLaunchPanel(false);
    setAgentStatus(null);
    setAgentQuestions([]);
    setAgentWarnings([]);
    setTurnError(null);
    setQuestionIndex(0);

    if (intent === "analyze") {
      setCompanyResolved(false);
      const ask = copy.intake.analyze.askCompany;
      const seedTranscript: Turn[] = [{ role: "assistant", content: ask }];
      transcriptRef.current = seedTranscript;
      setTranscript(seedTranscript);
      setBubbles([{ id: `${nextIdRef.current++}-agent`, role: "agent", text: ask }]);
      setAgentSuggestions([]);
      return;
    }

    const first = script[0];
    if (!first) return;
    setCompanyResolved(true);
    const seedTranscript: Turn[] = [{ role: "assistant", content: first.ask }];
    transcriptRef.current = seedTranscript;
    setTranscript(seedTranscript);
    setBubbles([{ id: `${nextIdRef.current++}-agent`, role: "agent", text: first.ask, explain: first.explain }]);
    setAgentSuggestions(
      first.options.slice(0, 4).map((o) => ({ label: o.label, say: o.say })),
    );
  }, [script, intent, copy.intake.analyze.askCompany]);

  useEffect(() => {
    const end = transcriptEndRef.current;
    if (!end) return;
    // Keep the latest message (and the composer below it) in view as the
    // conversation grows; prefer scrolling the chat column, not the page.
    const scroller = chatScrollRef.current;
    if (scroller) {
      scroller.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
    } else {
      end.scrollIntoView({ block: "end", behavior: "smooth" });
    }
  }, [bubbles.length, showLaunchPanel, agentPending]);

  const currentQuestion =
    !showLaunchPanel && companyResolved ? script[questionIndex] : undefined;
  const rows = useMemo(() => buildBriefRows(brief, copy), [brief, copy]);
  const pendingQuestions = Math.max(
    0,
    script.length - questionIndex - (showLaunchPanel ? 0 : 1),
  );

  function confirmFocusListing(listing: FocusListing) {
    const patch: BriefPatch = {
      focusTicker: listing.ticker,
      focusExchange: listing.exchange,
      focusCompanyName: listing.companyName,
      candidateCount: 1,
      includeSectors: [],
      excludeSectors: [],
    };
    const next = applyPatch(briefRef.current, patch);
    briefRef.current = next;
    setBrief(next);
    setCompanyResolved(true);

    const confirmText = listing.exchange
      ? fill(copy.intake.analyze.confirmSelected, {
          name: listing.companyName,
          ticker: listing.ticker,
          exchange: listing.exchange,
        })
      : fill(copy.intake.analyze.confirmSelectedNoExchange, {
          name: listing.companyName,
          ticker: listing.ticker,
        });
    pushBubble({
      role: "user",
      text: `${listing.companyName} (${listing.ticker})`,
    });
    pushBubble({ role: "agent", text: confirmText });

    const riskQ = script[0];
    if (riskQ) {
      pushBubble({
        role: "agent",
        text: riskQ.ask,
        explain: riskQ.explain,
      });
      setQuestionIndex(0);
      setAgentSuggestions(
        riskQ.options.slice(0, 4).map((o) => ({ label: o.label, say: o.say })),
      );
      const withRisk: Turn[] = [
        ...transcriptRef.current,
        { role: "user", content: `${listing.companyName} (${listing.ticker})` },
        { role: "assistant", content: confirmText },
        { role: "assistant", content: riskQ.ask },
      ];
      transcriptRef.current = withRisk;
      setTranscript(withRisk);
    }
    track("screening_intake_focus_selected", {
      intent,
      ticker: listing.ticker,
      exchange: listing.exchange ?? "",
    });
  }

  /** Analyze risk chips complete locally — no LLM intake for this short path. */
  function completeAnalyzeRisk(suggestion: AgentSuggestion) {
    const matching = script[0]?.options.find(
      (o) => o.say === suggestion.say || o.label === suggestion.label,
    );
    pushBubble({ role: "user", text: suggestion.say });
    const next = applyPatch(briefRef.current, matching?.patch ?? {});
    briefRef.current = next;
    setBrief(next);
    setAgentStatus("ok");
    setAgentSuggestions([]);
    setShowLaunchPanel(true);
    setQuestionIndex(1);
    track("screening_intake_turn", { intent, status: "ok", fromChip: "1" });
  }

  const suggestionChips = useMemo(() => {
    if (agentSuggestions.length > 0) return agentSuggestions;
    if (currentQuestion) {
      return currentQuestion.options.map((o) => ({ label: o.label, say: o.say }));
    }
    return [];
  }, [agentSuggestions, currentQuestion]);

  const latestExplain = useMemo(() => {
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const bubble = bubbles[i];
      if (bubble?.role === "agent" && bubble.explain && bubble.explain.length > 0) {
        return bubble.explain;
      }
    }
    return [];
  }, [bubbles]);

  const sendTurn = useCallback(
    async (userText: string, chipPatch?: BriefPatch): Promise<{ ok: boolean; status: IntakeAgentStatus | null }> => {
      if (!userText.trim() || agentPendingRef.current) return { ok: false, status: null };

      pushBubble({ role: "user", text: userText });
      const nextTranscript: Turn[] = [...transcriptRef.current, { role: "user", content: userText }];
      transcriptRef.current = nextTranscript;
      setTranscript(nextTranscript);
      setTurnError(null);
      setAgentSuggestions([]);

      let optimisticBrief = briefRef.current;
      if (chipPatch) {
        optimisticBrief = applyPatch(briefRef.current, chipPatch);
        briefRef.current = optimisticBrief;
        setBrief(optimisticBrief);
      }

      agentPendingRef.current = true;
      setAgentPending(true);
      try {
        const payload: ScreeningBrief = toScreeningBrief(optimisticBrief, language || "en");
        const res = await fetch("/api/screening/intake/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intent,
            locale: language || "en",
            messages: nextTranscript,
            brief: payload,
            suggestedInclude,
            suggestedExclude,
          }),
        });
        if (!res.ok) {
          setTurnError(copy.intake.turnError);
          return { ok: false, status: null };
        }
        const data = (await res.json()) as {
          assistantText: string;
          agent: {
            status: IntakeAgentStatus;
            questions: string[];
            suggestions?: AgentSuggestion[];
            warnings: string[];
            inferredFields: string[];
          };
          brief: ScreeningBrief;
        };

        const nextBrief = fromScreeningBrief(data.brief);
        briefRef.current = nextBrief;
        setBrief(nextBrief);
        setAgentStatus(data.agent.status);
        setAgentQuestions(data.agent.questions ?? []);
        setAgentSuggestions(data.agent.suggestions ?? []);
        setAgentWarnings(data.agent.warnings ?? []);

        pushBubble({
          role: "agent",
          text: data.assistantText,
          explain: pickGlossaryFor(data.assistantText, copy),
        });
        const withAssistant: Turn[] = [
          ...nextTranscript,
          { role: "assistant", content: data.assistantText },
        ];
        transcriptRef.current = withAssistant;
        setTranscript(withAssistant);

        track("screening_intake_turn", {
          intent,
          status: data.agent.status,
          fromChip: chipPatch ? "1" : "0",
        });

        if (data.agent.status === "ok") {
          setQuestionIndex((prev) => Math.min(prev + 1, script.length));
          // Keep chat open so the user can still edit; show the launch panel.
          setShowLaunchPanel(true);
        } else if (data.agent.status === "rejected_infeasible") {
          track("screening_intake_rejected", { intent });
          setShowLaunchPanel(false);
        } else {
          setQuestionIndex((prev) => Math.min(prev + 1, script.length));
          setShowLaunchPanel(false);
        }
        return { ok: true, status: data.agent.status };
      } catch {
        setTurnError(copy.intake.turnError);
        return { ok: false, status: null };
      } finally {
        agentPendingRef.current = false;
        setAgentPending(false);
      }
    },
    [
      copy,
      intent,
      language,
      pushBubble,
      script.length,
      suggestedExclude,
      suggestedInclude,
      track,
    ],
  );

  async function chooseSuggestion(suggestion: AgentSuggestion) {
    if (pilotActive) return;
    if (isAnalyze && companyResolved && !showLaunchPanel) {
      completeAnalyzeRisk(suggestion);
      return;
    }
    const matching = currentQuestion?.options.find(
      (o) => o.say === suggestion.say || o.label === suggestion.label,
    );
    await sendTurn(suggestion.say, matching?.patch);
  }

  async function submitInput(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pilotActive) return;
    const text = inputValue.trim();
    if (!text) return;
    setInputValue("");
    // Analyze company phase uses the search picker, not free-text LLM turns.
    if (isAnalyze && !companyResolved) return;
    if (isAnalyze && companyResolved) {
      // Allow typing a risk answer as free text → map to closest chip or default balanced.
      const match = script[0]?.options.find(
        (o) =>
          o.say.toLowerCase().includes(text.toLowerCase()) ||
          o.label.toLowerCase() === text.toLowerCase(),
      );
      completeAnalyzeRisk(
        match
          ? { label: match.label, say: match.say }
          : { label: text, say: text },
      );
      if (!match) {
        const next = applyPatch(briefRef.current, { riskProfile: "balanced" });
        briefRef.current = next;
        setBrief(next);
      }
      return;
    }
    await sendTurn(text);
  }

  function finishEarly() {
    if (pilotActive) return;
    if (isAnalyze && !briefRef.current.focusTicker) {
      setTurnError(copy.intake.analyze.needCompany);
      return;
    }
    const { state, filledLabels } = fillFromPreset(briefRef.current, copy, {
      includeSectors: suggestedInclude,
      excludeSectors: suggestedExclude,
      candidateCount: isAnalyze ? 1 : 5,
    });
    briefRef.current = state;
    setBrief(state);
    setShowLaunchPanel(true);
    setAgentStatus("ok");
    setAgentSuggestions([]);
    pushBubble({
      role: "agent",
      text: filledLabels.length
        ? fill(copy.intake.earlyFilled, {
            n: filledLabels.length,
            list: filledLabels.slice(0, 3).join(", ") + (filledLabels.length > 3 ? "…" : ""),
          })
        : copy.intake.earlyNothingMissing,
    });
    track("screening_intake_ended_early", { intent, filled: String(filledLabels.length) });
  }

  function stopPilot() {
    pilotAbortRef.current = true;
    setPilotActive(false);
  }

  async function startPilot() {
    if (isAnalyze) return; // sample pilot is for screen briefs, not single-company
    if (pilotActive || agentPendingRef.current) return;
    pilotAbortRef.current = false;
    setPilotActive(true);
    setTurnError(null);
    setSubmitError(null);
    pushBubble({ role: "agent", text: copy.intake.pilotIntro });
    track("screening_intake_pilot_start", { intent });

    const plan = buildIntakePilotPlan(script);
    let finishedOk = false;

    for (const step of plan) {
      if (pilotAbortRef.current) break;
      await sleep(450);
      if (pilotAbortRef.current) break;
      const result = await sendTurn(step.option.say, step.option.patch);
      if (!result.ok) break;
      if (result.status === "ok" || result.status === "rejected_infeasible") {
        finishedOk = result.status === "ok";
        break;
      }
    }

    if (pilotAbortRef.current) {
      pushBubble({ role: "agent", text: copy.intake.pilotStopped });
      track("screening_intake_pilot_stop", { intent });
    } else if (finishedOk) {
      pushBubble({ role: "agent", text: copy.intake.pilotDone });
      track("screening_intake_pilot_done", { intent });
    }
    setPilotActive(false);
  }

  function resumeChat() {
    setShowLaunchPanel(false);
    setAgentStatus((prev) => (prev === "ok" ? "needs_clarification" : prev));
    inputRef.current?.focus();
  }

  function editBriefRow(row: BriefRow) {
    const prompt = fill(copy.intake.editRowPrompt, {
      label: row.label,
      condition: row.condition,
    });
    setShowLaunchPanel(false);
    setAgentStatus("needs_clarification");
    setInputValue(prompt);
    inputRef.current?.focus();
  }

  async function launchRun() {
    if (submitting || pilotActive) return;
    if (isAnalyze && !briefRef.current.focusTicker) {
      setSubmitError(copy.intake.analyze.needCompany);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        ...toScreeningBrief(briefRef.current, language || "en"),
        pipelineKind: thesisEnabled ? pipelineKind : "checklist",
      };
      const res = await fetch("/api/screening/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        if (res.status === 429) {
          setSubmitError(copy.quota.exhausted);
          return;
        }
        if (res.status === 503) {
          setSubmitError(copy.quota.providerPaused);
          return;
        }
        let detail: { error?: string } | null = null;
        try {
          detail = (await res.json()) as { error?: string };
        } catch {
          detail = null;
        }
        if (detail?.error === "thesis_pipeline_disabled") {
          setSubmitError(copy.brief.thesisDisabled);
          return;
        }
        if (detail?.error === "thesis_requires_real_pipeline") {
          setSubmitError(copy.brief.thesisNeedsReal);
          return;
        }
        setSubmitError(copy.report.loadError);
        return;
      }
      const data = (await res.json()) as { run?: { runId?: string } };
      const runId = data.run?.runId;
      if (!runId) {
        setSubmitError(copy.report.loadError);
        return;
      }
      try {
        sessionStorage.setItem(`trefolio-screening-brief-${runId}`, JSON.stringify(payload));
        sessionStorage.setItem(SCREENING_INTAKE_RETURN_KEY(runId), intakeReturnHref);
      } catch {
        // Private mode or storage full — the run page falls back to defaults.
      }
      track("screening_run_created", { intent, endedEarly: String(payload.endedEarly) });
      router.push(`/screening/runs/${encodeURIComponent(runId)}`);
    } catch {
      setSubmitError(copy.report.loadError);
    } finally {
      setSubmitting(false);
    }
  }

  const canLaunch =
    showLaunchPanel &&
    agentStatus !== "rejected_infeasible" &&
    rows.length > 0 &&
    (!isAnalyze || Boolean(brief.focusTicker));

  if (!newRunsEnabled) {
    return (
      <main className="mx-auto flex min-h-[40vh] w-full max-w-xl flex-col items-center justify-center px-3 py-10 text-center sm:px-4">
        <h1 className="text-xl font-bold text-[color:var(--foreground)]">
          {copy.quota.providerPausedTitle}
        </h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">{copy.quota.providerPaused}</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/screening"
            className="btn-primary inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold"
          >
            {copy.quota.providerPausedCta}
          </Link>
          <Link
            href="/"
            className="btn-secondary inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold"
          >
            {copy.common.backHome}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-5xl flex-col px-3 pb-6 pt-8 sm:px-4">
      <header className="shrink-0 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-[color:var(--foreground)] sm:text-3xl">
          {showLaunchPanel ? copy.brief.title : copy.intake.title}
        </h1>
        {!showLaunchPanel && !pilotActive && !isAnalyze ? (
          <button
            type="button"
            onClick={() => void startPilot()}
            disabled={agentPending}
            className="mt-3 text-[12.5px] font-medium text-[color:var(--muted)] underline-offset-2 hover:underline disabled:opacity-60"
          >
            {copy.intake.pilotCta}
          </button>
        ) : null}
        {pilotActive ? (
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="text-[12.5px] text-[color:var(--muted)]" aria-live="polite">
              {copy.intake.pilotCtaRunning}
            </span>
            <button
              type="button"
              onClick={stopPilot}
              className="text-[12.5px] font-semibold text-[color:var(--muted)] underline-offset-2 hover:underline"
            >
              {copy.intake.pilotStop}
            </button>
          </div>
        ) : null}
      </header>

      <div className="mt-6 flex min-h-0 flex-1 flex-col gap-4 lg:grid lg:grid-cols-[minmax(240px,300px)_minmax(0,1fr)] lg:items-stretch lg:gap-6">
        {!showLaunchPanel ? (
          <aside
            className="hidden min-h-0 lg:flex lg:flex-col lg:gap-3"
            aria-label={copy.intake.guideTitle}
          >
            <div className="card sticky top-4 rounded-[20px] border border-[color:var(--border)] p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-300">
                {copy.intake.guideTitle}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-[color:var(--muted)]">
                {copy.intake.guideBody}
              </p>
              {latestExplain.length > 0 ? (
                <div className="mt-3 border-t border-[color:var(--border)] pt-3">
                  <ExplainHelpList entries={latestExplain} />
                </div>
              ) : null}
              <div className="mt-3 border-t border-[color:var(--border)] pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--muted)]">
                  {copy.intake.briefTitle}
                </p>
                {rows.length > 0 ? (
                  <BriefList rows={rows} onEditRow={editBriefRow} />
                ) : (
                  <p className="text-[12px] leading-relaxed text-[color:var(--muted)]">
                    {copy.intake.guideEmpty}
                  </p>
                )}
              </div>
            </div>
          </aside>
        ) : (
          <div className="hidden lg:block" aria-hidden="true" />
        )}

      <section
        ref={chatScrollRef}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto"
        aria-label={copy.intake.agentName}
      >
        {/* Equal flex spacers center the chat+composer when short; they
            collapse when the conversation outgrows the viewport so scrolling
            starts from the top and the latest turn stays reachable. */}
        <div className="min-h-0 flex-1" aria-hidden="true" />

        <div className="mx-auto w-full max-w-xl shrink-0">
          <ul className="flex list-none flex-col gap-3 px-0.5 pb-4">
            {bubbles.map((bubble) => (
              <li
                key={bubble.id}
                className={bubble.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={
                    bubble.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-md bg-teal-500/15 px-3.5 py-2.5 text-[14px] leading-relaxed text-[color:var(--foreground)]"
                      : "max-w-[90%] text-[14px] leading-relaxed text-[color:var(--foreground)]"
                  }
                >
                  <p>
                    {bubble.role === "agent" && (
                      <span className="mr-1.5 text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-300">
                        {copy.intake.agentName}
                      </span>
                    )}
                    {bubble.text}
                  </p>
                  {bubble.explain && bubble.explain.length > 0 && (
                    <details className="mt-2 lg:hidden">
                      <summary className="cursor-pointer text-[12px] font-semibold text-teal-700 dark:text-teal-300">
                        {copy.intake.explainToggle}
                      </summary>
                      <div className="mt-1.5">
                        <ExplainHelpList entries={bubble.explain} />
                      </div>
                    </details>
                  )}
                </div>
              </li>
            ))}
            {agentPending && (
              <li className="flex justify-start" aria-live="polite">
                <p className="text-[14px] text-[color:var(--muted)]">{copy.intake.thinking}</p>
              </li>
            )}
            <div ref={transcriptEndRef} />
          </ul>

          {agentStatus === "needs_clarification" && agentQuestions.length > 0 && (
            <div
              className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-3 py-2"
              role="status"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-300">
                {copy.intake.clarificationTitle}
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-[12.5px] text-[color:var(--foreground)]">
                {agentQuestions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
          )}

          {agentStatus === "rejected_infeasible" && agentWarnings.length > 0 && (
            <div
              className="mb-3 rounded-xl border border-red-500/30 bg-red-500/[0.07] px-3 py-2"
              role="alert"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-300">
                {copy.intake.rejectedTitle}
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-[12.5px] text-[color:var(--foreground)]">
                {agentWarnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {turnError && (
            <p className="mb-3 text-[12.5px] text-red-600 dark:text-red-400" role="alert">
              {turnError}
            </p>
          )}

          {!showLaunchPanel && rows.length > 0 ? (
            <details className="mb-3 border-t border-[color:var(--border)] pt-3 lg:hidden">
              <summary className="cursor-pointer text-[12px] font-semibold text-[color:var(--muted)]">
                {copy.intake.briefToggle}
                {pendingQuestions > 0
                  ? ` · ${fill(
                      pendingQuestions === 1 ? copy.intake.pendingOne : copy.intake.pendingMany,
                      { n: pendingQuestions },
                    )}`
                  : ""}
              </summary>
              <div className="mt-2">
                <BriefList rows={rows} onEditRow={editBriefRow} />
              </div>
              <p className="mt-2 text-[11px] text-[color:var(--muted)]">
                {copy.intake.briefEarlyHint}
              </p>
            </details>
          ) : null}

          {isAnalyze && !companyResolved && !showLaunchPanel ? (
            <AnalyzeCompanyPicker onSelect={confirmFocusListing} disabled={agentPending} />
          ) : null}

          {suggestionChips.length > 0 &&
            !agentPending &&
            !pilotActive &&
            !showLaunchPanel &&
            companyResolved && (
            <div className="mb-3 flex flex-wrap justify-center gap-2">
              {suggestionChips.map((option) => (
                <button
                  key={`${option.label}-${option.say}`}
                  type="button"
                  onClick={() => void chooseSuggestion(option)}
                  disabled={agentPending || pilotActive}
                  className="btn-secondary inline-flex min-h-10 items-center justify-center rounded-full px-3.5 text-[13px] font-semibold disabled:opacity-60"
                >
                  {option.label}
                </button>
              ))}
              <button
                type="button"
                onClick={finishEarly}
                disabled={agentPending || pilotActive}
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-dashed border-[color:var(--border)] px-3.5 text-[13px] font-semibold text-[color:var(--muted)] disabled:opacity-60"
              >
                {copy.intake.finishEarly}
              </button>
            </div>
          )}

          {!showLaunchPanel && !(isAnalyze && !companyResolved) ? (
            <form
              onSubmit={submitInput}
              className="-mx-1 flex gap-2 px-1 py-3"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={copy.intake.inputPlaceholder}
                disabled={agentPending || pilotActive}
                className="min-h-12 flex-1 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 text-[14px] text-[color:var(--foreground)] placeholder:text-[color:var(--muted)] focus:border-teal-500 focus:outline-none disabled:opacity-60"
                aria-label={copy.intake.inputPlaceholder}
              />
              <button
                type="submit"
                disabled={agentPending || pilotActive || !inputValue.trim()}
                className="btn-primary inline-flex min-h-12 min-w-12 items-center justify-center rounded-full px-4 text-sm font-semibold disabled:opacity-60"
              >
                {copy.intake.sendLabel}
              </button>
            </form>
          ) : null}
        </div>

        <div className="min-h-0 flex-1" aria-hidden="true" />
      </section>
      </div>

      {showLaunchPanel && (
        <section className="mx-auto mt-4 w-full max-w-xl shrink-0 text-center">
          <p className="text-sm text-[color:var(--muted)]">{copy.intake.readyToLaunch}</p>
          {thesisEnabled ? (
            <div className="mt-4 text-left">
              <ScreeningPipelineToggle
                value={pipelineKind}
                onChange={setPipelineKind}
                disabled={submitting}
              />
            </div>
          ) : null}
          <div className="mt-4 text-left">
            <BriefTable rows={rows} onEditRow={editBriefRow} />
          </div>
          <p className="mt-4 text-[13px] text-[color:var(--muted)]">
            {isAnalyze ? copy.brief.costBodyAnalyze : copy.brief.costBody}
          </p>
          {quotaLine ? (
            <p
              className={`mt-2 text-xs ${
                screeningQuota && screeningQuota.remaining <= 0
                  ? "text-amber-700 dark:text-amber-300"
                  : "text-[color:var(--muted)]"
              }`}
              role="status"
            >
              {quotaLine}
            </p>
          ) : null}

          {submitError && (
            <p className="mt-3 text-[13px] text-red-600 dark:text-red-400" role="alert">
              {submitError}
            </p>
          )}

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => void launchRun()}
              disabled={submitting || !canLaunch || pilotActive}
              className="btn-primary inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold disabled:opacity-60"
            >
              {isAnalyze ? copy.brief.runCtaAnalyze : copy.brief.runCta}
            </button>
            <button
              type="button"
              onClick={resumeChat}
              className="btn-secondary inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold"
            >
              {copy.brief.editCta}
            </button>
            <Link
              href="/screening"
              className="btn-secondary inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold"
            >
              {copy.common.back}
            </Link>
          </div>
        </section>
      )}

      <ScreeningDisclaimer className="shrink-0 pt-6 text-center" />
    </main>
  );
}
