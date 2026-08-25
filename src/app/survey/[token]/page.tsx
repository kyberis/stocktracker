"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface SurveyQuestion {
  id: string;
  type: "nps" | "rating" | "text" | "single_choice";
  prompt: string;
  options?: string[];
}

export default function SurveyTokenPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token || "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("en");
  const [completed, setCompleted] = useState(false);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const isEs = language === "es";

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/survey/${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Survey not found");
        setTitle(data.title || "");
        setLanguage(data.language || "en");
        setQuestions(data.questions || []);
        setCompleted(Boolean(data.completed));
        setDone(Boolean(data.completed));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/survey/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submit failed");
      setDone(true);
      setCompleted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-10 bg-[color:var(--page-background)]">
      <div className="max-w-lg mx-auto card p-6 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">trefolio</p>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            {title || (isEs ? "Encuesta" : "Survey")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {isEs
              ? "Tus respuestas se usan solo para mejorar el producto. No es asesoramiento financiero."
              : "Your answers are used only to improve the product. This is not financial advice."}
          </p>
        </div>

        {loading && <p className="text-sm text-gray-500">{isEs ? "Cargando…" : "Loading…"}</p>}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        {done ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            {isEs ? "Gracias — recibimos tus respuestas." : "Thanks — we received your answers."}
          </p>
        ) : (
          !loading &&
          !completed &&
          questions.length > 0 && (
            <form onSubmit={submit} className="space-y-4">
              {questions.map((q) => (
                <div key={q.id} className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-800 dark:text-slate-200" htmlFor={q.id}>
                    {q.prompt}
                  </label>
                  {q.type === "nps" || q.type === "rating" ? (
                    <select
                      id={q.id}
                      required
                      className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                      value={answers[q.id] ?? ""}
                      onChange={(ev) =>
                        setAnswers((prev) => ({ ...prev, [q.id]: Number(ev.target.value) }))
                      }
                    >
                      <option value="" disabled>
                        {isEs ? "Elige…" : "Choose…"}
                      </option>
                      {Array.from({ length: q.type === "nps" ? 11 : 5 }, (_, i) =>
                        q.type === "nps" ? i : i + 1,
                      ).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  ) : q.type === "single_choice" && q.options?.length ? (
                    <select
                      id={q.id}
                      required
                      className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                      value={String(answers[q.id] ?? "")}
                      onChange={(ev) =>
                        setAnswers((prev) => ({ ...prev, [q.id]: ev.target.value }))
                      }
                    >
                      <option value="" disabled>
                        {isEs ? "Elige…" : "Choose…"}
                      </option>
                      {q.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <textarea
                      id={q.id}
                      required
                      rows={3}
                      className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                      value={String(answers[q.id] ?? "")}
                      onChange={(ev) =>
                        setAnswers((prev) => ({ ...prev, [q.id]: ev.target.value }))
                      }
                    />
                  )}
                </div>
              ))}
              <button type="submit" className="btn-primary w-full" disabled={submitting}>
                {submitting
                  ? isEs
                    ? "Enviando…"
                    : "Submitting…"
                  : isEs
                    ? "Enviar respuestas"
                    : "Submit answers"}
              </button>
            </form>
          )
        )}
      </div>
    </main>
  );
}
