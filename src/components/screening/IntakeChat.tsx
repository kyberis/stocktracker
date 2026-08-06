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
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const nextIdRef = useRef(0);

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
    nextIdRef.current = 0;
    setBubbles([{ id: `${nextIdRef.current++}-agent`, role: "agent", text: first.ask, explain: first.explain }]);
    setTranscript([{ role: "assistant", content: first.ask }]);
    setQuestionIndex(0);
    setShowLaunchPanel(false);
    setBrief(emptyBrief(intent));
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
    async (userText: string, chipPatch?: BriefPatch): Promise<boolean> => {
      if (!userText.trim() || agentPending) return false;

      pushBubble({ role: "user", text: userText });
      const nextTranscript: Turn[] = [...transcript, { role: "user", content: userText }];
      setTranscript(nextTranscript);
      setTurnError(null);
      setAgentSuggestions([]);

      let optimisticBrief = brief;
      if (chipPatch) {
        optimisticBrief = applyPatch(brief, chipPatch);
        setBrief(optimisticBrief);
      }

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
          return false;
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

        setBrief(fromScreeningBrief(data.brief));
        setAgentStatus(data.agent.status);
        setAgentQuestions(data.agent.questions ?? []);
        setAgentSuggestions(data.agent.suggestions ?? []);
        setAgentWarnings(data.agent.warnings ?? []);

        pushBubble({
          role: "agent",
          text: data.assistantText,
          explain: pickGlossaryFor(data.assistantText, copy),
        });
        setTranscript((prev) => [...prev, { role: "assistant", content: data.assistantText }]);

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
        return true;
      } catch {
        setTurnError(copy.intake.turnError);
        return false;
      } finally {
        setAgentPending(false);
      }
    },
    [
      agentPending,
      brief,
      copy,
      intent,
      language,
      pushBubble,
      script.length,
      suggestedExclude,
      suggestedInclude,
      track,
      transcript,
    ],
  );

  async function chooseSuggestion(suggestion: AgentSuggestion) {
    const matching = currentQuestion?.options.find(
      (o) => o.say === suggestion.say || o.label === suggestion.label,
    );
    await sendTurn(suggestion.say, matching?.patch);
  }

  async function submitInput(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text) return;
    setInputValue("");
    await sendTurn(text);
  }

  function finishEarly() {
    const { state, filledLabels } = fillFromPreset(brief, copy, {
      includeSectors: suggestedInclude,
      excludeSectors: suggestedExclude,
      candidateCount: 5,
    });
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
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = toScreeningBrief(brief, language || "en");
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
    <main className="mx-auto w-full max-w-3xl px-3 py-6 sm:px-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-300">
        {showLaunchPanel ? copy.brief.eyebrow : copy.intake.eyebrow}
      </p>
      <h1 className="mt-1 text-xl font-bold text-[color:var(--foreground)] sm:text-2xl">
        {showLaunchPanel ? copy.brief.title : copy.intake.title}
      </h1>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
        <section
          className="card rounded-[20px] border border-[color:var(--border)] p-3 sm:p-4"
          aria-label={copy.intake.agentName}
        >
          <ul className="flex max-h-[420px] list-none flex-col gap-2.5 overflow-y-auto p-0">
            {bubbles.map((bubble) => (
              <li
                key={bubble.id}
                className={bubble.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={
                    bubble.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-sm bg-teal-500/15 px-3 py-2 text-[13.5px] text-[color:var(--foreground)]"
                      : "max-w-[88%] rounded-2xl rounded-bl-sm border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2 text-[13.5px] text-[color:var(--foreground)]"
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
                <div className="max-w-[70%] rounded-2xl rounded-bl-sm border border-dashed border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2 text-[13.5px] text-[color:var(--muted)]">
                  {copy.intake.thinking}
                </div>
              </li>
            )}
            <div ref={transcriptEndRef} />
          </ul>

          {agentStatus === "needs_clarification" && agentQuestions.length > 0 && (
            <div
              className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-3 py-2"
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
              className="mt-3 rounded-xl border border-red-500/30 bg-red-500/[0.07] px-3 py-2"
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
            <p className="mt-3 text-[12.5px] text-red-600 dark:text-red-400" role="alert">
              {turnError}
            </p>
          )}

          {suggestionChips.length > 0 && !agentPending && (
            <div className="mt-3 border-t border-[color:var(--border)] pt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--muted)]">
                {copy.intake.suggestionsLabel}
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestionChips.map((option) => (
                  <button
                    key={`${option.label}-${option.say}`}
                    type="button"
                    onClick={() => void chooseSuggestion(option)}
                    disabled={agentPending}
                    className="btn-secondary inline-flex min-h-11 items-center justify-center rounded-full px-3.5 text-[13px] font-semibold disabled:opacity-60"
                  >
                    {option.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={finishEarly}
                  disabled={agentPending}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-dashed border-[color:var(--border)] px-3.5 text-[13px] font-semibold text-[color:var(--muted)] disabled:opacity-60"
                >
                  {copy.intake.finishEarly}
                </button>
              </div>
            </div>
          )}

          <form
            onSubmit={submitInput}
            className="mt-3 flex gap-2 border-t border-[color:var(--border)] pt-3"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={copy.intake.inputPlaceholder}
              disabled={agentPending}
              className="min-h-11 flex-1 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 text-[13.5px] text-[color:var(--foreground)] placeholder:text-[color:var(--muted)] focus:border-teal-500 focus:outline-none disabled:opacity-60"
              aria-label={copy.intake.inputPlaceholder}
            />
            <button
              type="submit"
              disabled={agentPending || !inputValue.trim()}
              className="btn-primary inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold disabled:opacity-60"
            >
              {copy.intake.sendLabel}
            </button>
          </form>
        </section>

        <aside className="card h-fit rounded-[20px] border border-[color:var(--border)] p-3 sm:p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--muted)]">
            {showLaunchPanel ? copy.intake.doneTitle : copy.intake.briefTitle}
          </h2>
          <div className="mt-2.5">
            <BriefList rows={rows} onEditRow={editBriefRow} />
          </div>
          <p className="mt-2.5 text-[11px] text-[color:var(--muted)]">
            {showLaunchPanel
              ? copy.intake.readyToLaunch
              : pendingQuestions > 0
                ? fill(
                    pendingQuestions === 1 ? copy.intake.pendingOne : copy.intake.pendingMany,
                    { n: pendingQuestions },
                  )
                : copy.intake.briefEarlyHint}
          </p>
        </aside>
      </div>

      {showLaunchPanel && (
        <section className="card mt-4 rounded-[20px] border border-[color:var(--border)] p-4 sm:p-5">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-300">
            {copy.brief.filtersTitle}
          </h2>
          <div className="mt-2.5">
            <BriefTable rows={rows} onEditRow={editBriefRow} />
          </div>

          <h3 className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--muted)]">
            {copy.brief.costTitle}
          </h3>
          <p className="mt-1.5 text-[13px] text-[color:var(--muted)]">{copy.brief.costBody}</p>

          {submitError && (
            <p className="mt-3 text-[13px] text-red-600 dark:text-red-400" role="alert">
              {submitError}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void launchRun()}
              disabled={submitting || !canLaunch}
              className="btn-primary inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold disabled:opacity-60"
            >
              {copy.brief.runCta}
            </button>
            <button
              type="button"
              onClick={resumeChat}
              className="btn-secondary inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold"
            >
              {copy.brief.editCta}
            </button>
            <Link
              href="/screening"
              className="btn-secondary inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold"
            >
              {copy.common.back}
            </Link>
          </div>
        </section>
      )}

      <ScreeningDisclaimer className="mt-4" />
    </main>
  );
}
