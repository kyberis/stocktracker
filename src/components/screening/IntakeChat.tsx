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
  toScreeningBrief,
  type BriefState,
} from "@/lib/screening/brief-state";
import { buildIntakeScript, type ExplainEntry, type IntakeOption } from "@/lib/screening/intake-script";
import { SCREENING_INTENTS, type ScreeningIntent } from "@/lib/screening/schemas";
import { BriefList, BriefTable } from "./BriefTable";
import { MockNotice, ScreeningDisclaimer } from "./ScreeningNotices";
import { useScreeningCopy } from "./use-screening-copy";

type Bubble = {
  id: string;
  role: "agent" | "user";
  text: string;
  explain?: ExplainEntry[];
};

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

  const script = useMemo(
    () => buildIntakeScript(copy, { intent, suggestedInclude, suggestedExclude }),
    [copy, intent, suggestedInclude, suggestedExclude],
  );

  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [brief, setBrief] = useState<BriefState>(() => emptyBrief(intent));
  const [phase, setPhase] = useState<"chat" | "confirm">("chat");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  const pushBubble = useCallback((bubble: Omit<Bubble, "id">) => {
    setBubbles((prev) => [...prev, { ...bubble, id: `${prev.length}-${bubble.role}` }]);
  }, []);

  // First question. Re-runs only if the script identity changes (language switch).
  useEffect(() => {
    const first = script[0];
    if (!first) return;
    setBubbles([{ id: "0-agent", role: "agent", text: first.ask, explain: first.explain }]);
    setQuestionIndex(0);
    setPhase("chat");
    setBrief(emptyBrief(intent));
  }, [script, intent]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [bubbles.length, phase]);

  const currentQuestion = phase === "chat" ? script[questionIndex] : undefined;
  const rows = useMemo(() => buildBriefRows(brief, copy), [brief, copy]);
  const pendingQuestions = Math.max(0, script.length - questionIndex - (phase === "chat" ? 1 : 0));

  function chooseOption(option: IntakeOption) {
    pushBubble({ role: "user", text: option.say });
    setBrief((prev) => applyPatch(prev, option.patch));

    const nextIndex = questionIndex + 1;
    const next = script[nextIndex];
    if (next) {
      setQuestionIndex(nextIndex);
      pushBubble({ role: "agent", text: next.ask, explain: next.explain });
      return;
    }
    setQuestionIndex(nextIndex);
    setPhase("confirm");
    pushBubble({ role: "agent", text: copy.intake.doneBody });
  }

  function finishEarly() {
    const { state, filledLabels } = fillFromPreset(brief, copy, {
      includeSectors: suggestedInclude,
      excludeSectors: suggestedExclude,
      candidateCount: 5,
    });
    setBrief(state);
    setPhase("confirm");
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
      // Session-scoped so the run page can show the brief without persisting criteria server-side.
      try {
        sessionStorage.setItem(`trefolio-screening-brief-${runId}`, JSON.stringify(payload));
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

  return (
    <main className="mx-auto w-full max-w-3xl px-3 py-6 sm:px-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-300">
        {phase === "chat" ? copy.intake.eyebrow : copy.brief.eyebrow}
      </p>
      <h1 className="mt-1 text-xl font-bold text-[color:var(--foreground)] sm:text-2xl">
        {phase === "chat" ? copy.intake.title : copy.brief.title}
      </h1>

      <MockNotice className="mt-4" />

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
            <div ref={transcriptEndRef} />
          </ul>

          {currentQuestion && (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-[color:var(--border)] pt-3">
              {currentQuestion.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => chooseOption(option)}
                  className="btn-secondary inline-flex min-h-11 items-center justify-center rounded-full px-3.5 text-[13px] font-semibold"
                >
                  {option.label}
                </button>
              ))}
              <button
                type="button"
                onClick={finishEarly}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-dashed border-[color:var(--border)] px-3.5 text-[13px] font-semibold text-[color:var(--muted)]"
              >
                {copy.intake.finishEarly}
              </button>
            </div>
          )}
        </section>

        <aside className="card h-fit rounded-[20px] border border-[color:var(--border)] p-3 sm:p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--muted)]">
            {phase === "chat" ? copy.intake.briefTitle : copy.intake.doneTitle}
          </h2>
          <div className="mt-2.5">
            <BriefList rows={rows} />
          </div>
          {phase === "chat" && (
            <p className="mt-2.5 text-[11px] text-[color:var(--muted)]">
              {pendingQuestions > 0
                ? fill(
                    pendingQuestions === 1 ? copy.intake.pendingOne : copy.intake.pendingMany,
                    { n: pendingQuestions },
                  )
                : copy.intake.briefEarlyHint}
            </p>
          )}
        </aside>
      </div>

      {phase === "confirm" && (
        <section className="card mt-4 rounded-[20px] border border-[color:var(--border)] p-4 sm:p-5">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-300">
            {copy.brief.filtersTitle}
          </h2>
          <div className="mt-2.5">
            <BriefTable rows={rows} />
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
              disabled={submitting || rows.length === 0}
              className="btn-primary inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold disabled:opacity-60"
            >
              {copy.brief.runCta}
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
