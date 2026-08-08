"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useTrack } from "@/lib/use-track";
import { fill } from "@/lib/screening/copy";
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
import { BriefList, BriefTable } from "./BriefTable";
import { ScreeningDisclaimer } from "./ScreeningNotices";
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
  const { copy } = useScreeningCopy();
  const searchParams = useSearchParams();

  const intent: ScreeningIntent = useMemo(() => {
    const raw = searchParams.get("intent");
    return SCREENING_INTENTS.includes(raw as ScreeningIntent) ? (raw as ScreeningIntent) : "explore";
  }, [searchParams]);

  const suggestedInclude = useMemo(() => parseSectors(searchParams.get("include")), [searchParams]);
  const suggestedExclude = useMemo(() => parseSectors(searchParams.get("exclude")), [searchParams]);

  const intakeReturnHref = useMemo(
    () =>
      buildIntakeHref({
        intent,
        includeSectors: suggestedInclude,
        excludeSectors: suggestedExclude,
      }),
    [intent, suggestedInclude, suggestedExclude],
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
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const nextIdRef = useRef(0);
  const transcriptRef = useRef<Turn[]>([]);
  const briefRef = useRef<BriefState>(emptyBrief(intent));
  const pilotAbortRef = useRef(false);
  const agentPendingRef = useRef(false);

  const pushBubble = useCallback((bubble: Omit<Bubble, "id">) => {
    setBubbles((prev) => {
      const id = `${nextIdRef.current++}-${bubble.role}`;
      return [...prev, { ...bubble, id }];
    });
  }, []);

  // Seed the first scripted question (with explainers). Re-runs on language/intent change.
  useEffect(() => {
    const first = script[0];
    if (!first) return;
    pilotAbortRef.current = true;
    setPilotActive(false);
    nextIdRef.current = 0;
    const seedBrief = emptyBrief(intent);
    const seedTranscript: Turn[] = [{ role: "assistant", content: first.ask }];
    briefRef.current = seedBrief;
    transcriptRef.current = seedTranscript;
    setBubbles([{ id: `${nextIdRef.current++}-agent`, role: "agent", text: first.ask, explain: first.explain }]);
    setTranscript(seedTranscript);
    setQuestionIndex(0);
    setShowLaunchPanel(false);
    setBrief(seedBrief);
    setAgentStatus(null);
    setAgentQuestions([]);
    setAgentSuggestions(
      first.options.slice(0, 4).map((o) => ({ label: o.label, say: o.say })),
    );
    setAgentWarnings([]);
    setTurnError(null);
  }, [script, intent]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [bubbles.length, showLaunchPanel]);

  const currentQuestion = !showLaunchPanel ? script[questionIndex] : undefined;
  const rows = useMemo(() => buildBriefRows(brief, copy), [brief, copy]);
  const pendingQuestions = Math.max(
    0,
    script.length - questionIndex - (showLaunchPanel ? 0 : 1),
  );

  const suggestionChips = useMemo(() => {
    if (agentSuggestions.length > 0) return agentSuggestions;
    if (currentQuestion) {
      return currentQuestion.options.map((o) => ({ label: o.label, say: o.say }));
    }
    return [];
  }, [agentSuggestions, currentQuestion]);

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
    await sendTurn(text);
  }

  function finishEarly() {
    if (pilotActive) return;
    const { state, filledLabels } = fillFromPreset(briefRef.current, copy, {
      includeSectors: suggestedInclude,
      excludeSectors: suggestedExclude,
      candidateCount: 5,
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
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = toScreeningBrief(briefRef.current, language || "en");
      const res = await fetch("/api/screening/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
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

  const canLaunch = showLaunchPanel && agentStatus !== "rejected_infeasible" && rows.length > 0;

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-xl flex-col px-3 pb-6 pt-8 sm:px-4">
      <header className="shrink-0 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-[color:var(--foreground)] sm:text-3xl">
          {showLaunchPanel ? copy.brief.title : copy.intake.title}
        </h1>
        {!showLaunchPanel && !pilotActive ? (
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

      <section
        className="mt-6 flex min-h-0 flex-1 flex-col"
        aria-label={copy.intake.agentName}
      >
        <ul className="flex min-h-0 flex-1 list-none flex-col gap-3 overflow-y-auto px-0.5 pb-4">
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
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[12px] font-semibold text-teal-700 dark:text-teal-300">
                      {copy.intake.explainToggle}
                    </summary>
                    <dl className="mt-1.5 space-y-1.5">
                      {bubble.explain.map((entry) => (
                        <div key={entry.term}>
                          <dt className="text-[12px] font-semibold text-[color:var(--foreground)]">
                            {entry.term}
                          </dt>
                          <dd className="text-[12px] leading-relaxed text-[color:var(--muted)]">
                            {entry.def}
                          </dd>
                        </div>
                      ))}
                    </dl>
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
          <details className="mb-3 border-t border-[color:var(--border)] pt-3">
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

        {suggestionChips.length > 0 && !agentPending && !pilotActive && !showLaunchPanel && (
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

        {!showLaunchPanel ? (
          <form
            onSubmit={submitInput}
            className="sticky bottom-0 z-10 -mx-1 flex gap-2 bg-[color:var(--background)]/95 px-1 py-3 backdrop-blur"
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
      </section>

      {showLaunchPanel && (
        <section className="mt-4 text-center">
          <p className="text-sm text-[color:var(--muted)]">{copy.intake.readyToLaunch}</p>
          <div className="mt-4 text-left">
            <BriefTable rows={rows} onEditRow={editBriefRow} />
          </div>
          <p className="mt-4 text-[13px] text-[color:var(--muted)]">{copy.brief.costBody}</p>

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
              {copy.brief.runCta}
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

      <ScreeningDisclaimer className="mt-auto pt-6 text-center" />
    </main>
  );
}
