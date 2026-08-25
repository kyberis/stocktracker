"use client";

import React, { useCallback, useEffect, useState } from "react";

type PeriodDays = 7 | 30 | 90;

interface SurveyQuestion {
  id: string;
  type: "nps" | "rating" | "text" | "single_choice";
  prompt: string;
  options?: string[];
}

interface SurveyProposal {
  templateId: "winback" | "missing_tool" | "nps";
  title: string;
  rationale: string;
  targetUserIds: string[];
  questionsEn: SurveyQuestion[];
  questionsEs: SurveyQuestion[];
}

interface ReportPayload {
  id: string;
  periodDays: number;
  html: string;
  createdAt: string;
  usedFallback?: boolean;
  model?: string;
  surveyProposals: SurveyProposal[];
  narrative?: {
    insights?: string[];
    recommendations?: string[];
  };
  snapshot?: {
    emailEligibleTargets?: Record<string, { emails?: string[] }>;
    totals?: { totalUsers: number; activeUsers7d: number; activeUsers30d: number };
  };
}

interface ReportSummary {
  id: string;
  periodDays: number;
  createdAt: string;
  usedFallback: boolean;
  model: string;
  proposalCount: number;
}

interface CampaignRow {
  id: string;
  templateId: string;
  title: string;
  status: string;
  createdAt: string;
  inviteCount: number;
  responseCount: number;
}

export default function EngagementReportTab() {
  const [periodDays, setPeriodDays] = useState<PeriodDays>(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [history, setHistory] = useState<ReportSummary[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [confirmProposal, setConfirmProposal] = useState<SurveyProposal | null>(null);
  const [sendBusy, setSendBusy] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    const [reportsRes, campaignsRes] = await Promise.all([
      fetch("/api/admin/engagement-report"),
      fetch("/api/admin/survey-campaigns"),
    ]);
    if (reportsRes.ok) {
      const data = await reportsRes.json();
      setHistory(data.reports || []);
    }
    if (campaignsRes.ok) {
      const data = await campaignsRes.json();
      setCampaigns(data.campaigns || []);
    }
  }, []);

  useEffect(() => {
    loadHistory().catch(() => {});
  }, [loadHistory]);

  const generate = async () => {
    setBusy(true);
    setError(null);
    setSendResult(null);
    try {
      const res = await fetch("/api/admin/engagement-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodDays }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");
      setReport(data.report);
      await loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setBusy(false);
    }
  };

  const openReport = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/engagement-report?id=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setReport(data.report);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setBusy(false);
    }
  };

  const downloadHtml = () => {
    if (!report?.html) return;
    const blob = new Blob([report.html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trefolio-engagement-${report.periodDays}d-${report.id.slice(0, 8)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const recipientEmails = (proposal: SurveyProposal): string[] => {
    const emails =
      report?.snapshot?.emailEligibleTargets?.[proposal.templateId]?.emails || [];
    // Prefer emails aligned to target ids order when possible
    return emails.slice(0, proposal.targetUserIds.length);
  };

  const createAndSend = async (proposal: SurveyProposal) => {
    if (!report) return;
    setSendBusy(true);
    setSendResult(null);
    setError(null);
    try {
      const createRes = await fetch("/api/admin/survey-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: proposal.templateId,
          title: proposal.title,
          rationale: proposal.rationale,
          reportId: report.id,
          targetUserIds: proposal.targetUserIds,
          questionsEn: proposal.questionsEn,
          questionsEs: proposal.questionsEs,
        }),
      });
      const created = await createRes.json();
      if (!createRes.ok) throw new Error(created.error || "Failed to create campaign");

      const sendRes = await fetch(`/api/admin/survey-campaigns/${created.campaign.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", confirmed: true }),
      });
      const sent = await sendRes.json();
      if (!sendRes.ok) throw new Error(sent.error || "Failed to send");

      setSendResult(
        `Sent campaign "${proposal.title}": ${sent.stats?.sent ?? 0} sent, ${sent.stats?.suppressed ?? 0} suppressed, ${sent.stats?.failed ?? 0} failed.`,
      );
      setConfirmProposal(null);
      await loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSendBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3 justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Engagement Report</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 max-w-2xl">
            Generate an HTML report with KPIs, AI narrative, named cohorts, and survey proposals.
            Surveys email a magic link to an in-app form after admin confirmation.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-gray-500 dark:text-slate-400">
            Period
            <select
              className="ml-2 rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-sm"
              value={periodDays}
              onChange={(e) => setPeriodDays(Number(e.target.value) as PeriodDays)}
            >
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
          </label>
          <button
            type="button"
            onClick={generate}
            disabled={busy}
            className="btn-primary disabled:opacity-50"
          >
            {busy ? "Generating…" : "Generate report"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-500/20 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      {sendResult && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-500/20 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
          {sendResult}
        </div>
      )}

      {report && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-gray-500 dark:text-slate-400">
              Report {report.id.slice(0, 8)} · {report.createdAt}
              {report.usedFallback ? " · fallback narrative" : ""}
              {report.model ? ` · ${report.model}` : ""}
            </span>
            <button type="button" className="btn-secondary text-xs" onClick={downloadHtml}>
              Download HTML
            </button>
            <a
              className="btn-secondary text-xs"
              href={`data:text/html;charset=utf-8,${encodeURIComponent(report.html)}`}
              target="_blank"
              rel="noreferrer"
            >
              Open HTML
            </a>
          </div>

          {report.narrative?.insights && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold mb-2">Insights</h3>
              <ul className="list-disc pl-5 text-sm space-y-1 text-gray-700 dark:text-slate-300">
                {report.narrative.insights.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
              {report.narrative.recommendations && (
                <>
                  <h3 className="text-sm font-semibold mt-3 mb-2">Recommendations</h3>
                  <ul className="list-disc pl-5 text-sm space-y-1 text-gray-700 dark:text-slate-300">
                    {report.narrative.recommendations.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-semibold">Survey proposals</h3>
            {(report.surveyProposals || []).length === 0 && (
              <p className="text-sm text-gray-500">No proposals in this report.</p>
            )}
            {(report.surveyProposals || []).map((p) => (
              <div
                key={`${p.templateId}-${p.title}`}
                className="rounded-lg border border-gray-200 dark:border-slate-700 p-3 space-y-2"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {p.title}{" "}
                      <span className="text-xs font-normal text-indigo-600 dark:text-indigo-400">
                        {p.templateId}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">{p.rationale}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {p.targetUserIds.length} targets
                      {recipientEmails(p).length > 0
                        ? ` · ${recipientEmails(p).slice(0, 3).join(", ")}${recipientEmails(p).length > 3 ? "…" : ""}`
                        : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-primary text-xs"
                    disabled={p.targetUserIds.length === 0}
                    onClick={() => setConfirmProposal(p)}
                  >
                    Create &amp; send…
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="font-semibold mb-1">EN questions</div>
                    <ul className="list-disc pl-4 space-y-1">
                      {p.questionsEn.map((q) => (
                        <li key={q.id}>
                          [{q.type}] {q.prompt}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="font-semibold mb-1">ES questions</div>
                    <ul className="list-disc pl-4 space-y-1">
                      {p.questionsEs.map((q) => (
                        <li key={q.id}>
                          [{q.type}] {q.prompt}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-200 dark:border-slate-700 text-xs text-gray-500">
              HTML preview
            </div>
            <iframe
              title="Engagement report HTML"
              className="w-full min-h-[640px] bg-white"
              srcDoc={report.html}
              sandbox=""
            />
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-3">Recent reports</h3>
          {history.length === 0 ? (
            <p className="text-sm text-gray-500">No reports yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {history.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    className="text-left text-indigo-600 dark:text-indigo-400 hover:underline"
                    onClick={() => openReport(h.id)}
                  >
                    {h.periodDays}d · {h.createdAt}
                    {h.usedFallback ? " (fallback)" : ""}
                  </button>
                  <span className="text-xs text-gray-400">{h.proposalCount} surveys</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-3">Survey campaigns</h3>
          {campaigns.length === 0 ? (
            <p className="text-sm text-gray-500">No campaigns yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {campaigns.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2">
                  <span>
                    {c.title}{" "}
                    <span className="text-xs text-gray-400">
                      {c.templateId} · {c.status}
                    </span>
                  </span>
                  <span className="text-xs text-gray-400">
                    {c.responseCount}/{c.inviteCount}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {confirmProposal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="survey-confirm-title"
        >
          <div className="glass-overlay max-w-lg w-full rounded-2xl p-5 space-y-3">
            <h3 id="survey-confirm-title" className="text-lg font-semibold">
              Confirm survey send
            </h3>
            <p className="text-sm text-gray-600 dark:text-slate-300">
              Create campaign <strong>{confirmProposal.title}</strong> and email{" "}
              <strong>{confirmProposal.targetUserIds.length}</strong> users a link to the in-app
              survey. Unsubscribed users and disabled email notifications are skipped.
            </p>
            <div className="max-h-40 overflow-auto rounded-lg border border-gray-200 dark:border-slate-700 p-2 text-xs">
              {(recipientEmails(confirmProposal).length
                ? recipientEmails(confirmProposal)
                : confirmProposal.targetUserIds
              ).map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="btn-secondary"
                disabled={sendBusy}
                onClick={() => setConfirmProposal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={sendBusy}
                onClick={() => createAndSend(confirmProposal)}
              >
                {sendBusy ? "Sending…" : "Confirm create & send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
