import type { EngagementSnapshot, NamedUserRef } from "./snapshot";
import type { AiReportOutput } from "./generate";
import { SURVEY_TEMPLATES } from "./templates";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function userTable(users: NamedUserRef[], title: string): string {
  if (users.length === 0) {
    return `<h3>${esc(title)}</h3><p class="muted">None in sample.</p>`;
  }
  const rows = users
    .map(
      (u) =>
        `<tr><td>${esc(u.username)}</td><td>${esc(u.email)}</td><td>${esc(u.plan)}</td><td>${u.eventCountInWindow}</td><td>${esc(u.lastEventAt || "—")}</td><td>${esc(u.note || u.segment)}</td></tr>`,
    )
    .join("");
  return `<h3>${esc(title)}</h3>
  <table><thead><tr><th>User</th><th>Email</th><th>Plan</th><th>Events</th><th>Last event</th><th>Note</th></tr></thead>
  <tbody>${rows}</tbody></table>`;
}

export function renderEngagementReportHtml(
  snapshot: EngagementSnapshot,
  ai: AiReportOutput,
  meta?: { usedFallback?: boolean; model?: string },
): string {
  const generatedAt = esc(snapshot.generatedAt);
  const toolRows = snapshot.toolUsage
    .map(
      (t) =>
        `<tr><td>${esc(t.label)}</td><td>${t.count}</td><td>${esc(t.topEvents.map((e) => `${e.event} (${e.count})`).join(", "))}</td></tr>`,
    )
    .join("");
  const eventRows = snapshot.topEvents
    .slice(0, 15)
    .map((e) => `<tr><td>${esc(e.event)}</td><td>${e.count}</td></tr>`)
    .join("");
  const mcpRows =
    snapshot.mcpTools.length === 0
      ? `<tr><td colspan="3" class="muted">No MCP tool calls in window</td></tr>`
      : snapshot.mcpTools
          .map((t) => `<tr><td>${esc(t.tool)}</td><td>${t.count}</td><td>${t.users}</td></tr>`)
          .join("");

  const dist = [1, 2, 3, 4, 5]
    .map((r) => `${r}★: ${snapshot.satisfaction.ratingDistribution[r] || 0}`)
    .join(" · ");

  const narrative = ai.narrativeSections
    .map((s) => `<section><h2>${esc(s.title)}</h2>${s.html}</section>`)
    .join("\n");

  const insights = ai.insights.map((i) => `<li>${esc(i)}</li>`).join("");
  const recs = ai.recommendations.map((i) => `<li>${esc(i)}</li>`).join("");

  const surveyBlocks = ai.surveyProposals
    .map((p) => {
      const tmpl = SURVEY_TEMPLATES[p.templateId];
      const qEn = p.questionsEn.map((q) => `<li><strong>${esc(q.type)}</strong>: ${esc(q.prompt)}</li>`).join("");
      const qEs = p.questionsEs.map((q) => `<li><strong>${esc(q.type)}</strong>: ${esc(q.prompt)}</li>`).join("");
      return `<div class="card">
        <h3>${esc(p.title)} <span class="pill">${esc(tmpl.label)}</span></h3>
        <p>${esc(p.rationale)}</p>
        <p><strong>Targets:</strong> ${p.targetUserIds.length} users</p>
        <h4>Questions (EN)</h4><ul>${qEn}</ul>
        <h4>Questions (ES)</h4><ul>${qEs}</ul>
      </div>`;
    })
    .join("\n");

  const commentRows = snapshot.satisfaction.recentComments
    .map(
      (c) =>
        `<tr><td>${esc(c.username)}</td><td>${c.rating}★</td><td>${esc(c.comment)}</td><td>${esc(c.submittedAt)}</td></tr>`,
    )
    .join("");

  const feedbackRows = snapshot.feedback.recent
    .map(
      (f) =>
        `<tr><td>${esc(f.username)}</td><td>${esc(f.type)}</td><td>${esc(f.subject)}</td><td>${esc(f.status)}</td><td>${esc(f.createdAt)}</td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>trefolio engagement report — ${snapshot.periodDays}d</title>
  <style>
    /* Force light document colors: iframe inherits OS dark preference otherwise,
       leaving light text on white tables (near-invisible). */
    :root { color-scheme: light only; }
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; padding: 32px; line-height: 1.5; color: #0f172a; background: #f8fafc; }
    h1 { margin: 0 0 8px; font-size: 1.75rem; color: #0f172a; }
    h2 { margin-top: 2rem; font-size: 1.25rem; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; color: #0f172a; }
    h3, h4 { margin-top: 1.25rem; font-size: 1.05rem; color: #0f172a; }
    p, li { color: #0f172a; }
    .muted { color: #475569; }
    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin: 16px 0 24px; }
    .kpi { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; color: #0f172a; }
    .kpi .n { font-size: 1.4rem; font-weight: 700; font-variant-numeric: tabular-nums; color: #0f172a; }
    .kpi .l { font-size: 0.75rem; color: #475569; text-transform: uppercase; letter-spacing: 0.04em; }
    table { width: 100%; border-collapse: collapse; background: #fff; color: #0f172a; border-radius: 12px; overflow: hidden; margin: 8px 0 16px; border: 1px solid #e2e8f0; }
    th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 0.9rem; vertical-align: top; color: #0f172a; background: #fff; }
    th { background: #f1f5f9; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.03em; color: #334155; }
    .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin: 12px 0; background: #fff; color: #0f172a; }
    .pill { display: inline-block; font-size: 0.7rem; padding: 2px 8px; border-radius: 999px; background: #e0e7ff; color: #3730a3; margin-left: 6px; }
    footer { margin-top: 40px; font-size: 0.8rem; color: #475569; }
    @media print { body { background: #fff; padding: 0; } .kpi, .card, table { break-inside: avoid; } }
  </style>
</head>
<body>
  <header>
    <h1>trefolio engagement report</h1>
    <p class="muted">Period: last ${snapshot.periodDays} days · Generated ${generatedAt}${meta?.model ? ` · Model ${esc(meta.model)}` : ""}${meta?.usedFallback ? " · deterministic fallback (AI unavailable/invalid)" : ""}</p>
  </header>

  <div class="kpis">
    <div class="kpi"><div class="n">${snapshot.totals.totalUsers}</div><div class="l">Total users</div></div>
    <div class="kpi"><div class="n">${snapshot.totals.activeUsers7d}</div><div class="l">Active 7d</div></div>
    <div class="kpi"><div class="n">${snapshot.totals.activeUsers30d}</div><div class="l">Active 30d</div></div>
    <div class="kpi"><div class="n">${snapshot.totals.eventsInWindow}</div><div class="l">Events in window</div></div>
    <div class="kpi"><div class="n">${snapshot.segments.engaged.count}</div><div class="l">Engaged</div></div>
    <div class="kpi"><div class="n">${snapshot.segments.dormant.count + snapshot.segments.churned.count}</div><div class="l">Dormant+churned</div></div>
    <div class="kpi"><div class="n">${snapshot.satisfaction.averageRating || "—"}</div><div class="l">CSAT avg</div></div>
    <div class="kpi"><div class="n">${snapshot.feedback.open}</div><div class="l">Open feedback</div></div>
  </div>

  ${narrative}

  <section>
    <h2>Key insights</h2>
    <ul>${insights}</ul>
    <h2>Recommended actions</h2>
    <ul>${recs}</ul>
  </section>

  <section>
    <h2>Segments</h2>
    <table><thead><tr><th>Segment</th><th>Count</th></tr></thead>
    <tbody>
      <tr><td>Engaged (≤7d)</td><td>${snapshot.segments.engaged.count}</td></tr>
      <tr><td>Warm (8–30d)</td><td>${snapshot.segments.warm.count}</td></tr>
      <tr><td>Dormant (31–90d)</td><td>${snapshot.segments.dormant.count}</td></tr>
      <tr><td>Churned (&gt;90d)</td><td>${snapshot.segments.churned.count}</td></tr>
      <tr><td>Never active</td><td>${snapshot.segments.never_active.count}</td></tr>
    </tbody></table>
    ${userTable(snapshot.powerUsers, "Power users")}
    ${userTable(snapshot.segments.dormant.users, "Dormant sample")}
    ${userTable(snapshot.segments.churned.users, "Churned sample")}
    ${userTable(snapshot.satisfaction.lowRaters, "Low CSAT (≤3★)")}
  </section>

  <section>
    <h2>Tool usage</h2>
    <table><thead><tr><th>Bucket</th><th>Events</th><th>Top events</th></tr></thead><tbody>${toolRows}</tbody></table>
    <h3>Top events</h3>
    <table><thead><tr><th>Event</th><th>Count</th></tr></thead><tbody>${eventRows}</tbody></table>
    <h3>MCP tools</h3>
    <table><thead><tr><th>Tool</th><th>Calls</th><th>Users</th></tr></thead><tbody>${mcpRows}</tbody></table>
  </section>

  <section>
    <h2>Satisfaction &amp; feedback</h2>
    <p>Submitted ratings: <strong>${snapshot.satisfaction.submitted}</strong> · Average: <strong>${snapshot.satisfaction.averageRating || "—"}</strong> · ${esc(dist)}</p>
    <h3>Recent CSAT comments</h3>
    <table><thead><tr><th>User</th><th>Rating</th><th>Comment</th><th>When</th></tr></thead><tbody>${commentRows || `<tr><td colspan="4" class="muted">No comments</td></tr>`}</tbody></table>
    <p>Feedback tickets — open: ${snapshot.feedback.open}, answered: ${snapshot.feedback.answered}, closed: ${snapshot.feedback.closed}</p>
    <table><thead><tr><th>User</th><th>Type</th><th>Subject</th><th>Status</th><th>When</th></tr></thead><tbody>${feedbackRows || `<tr><td colspan="5" class="muted">No feedback</td></tr>`}</tbody></table>
  </section>

  <section>
    <h2>Survey proposals</h2>
    <p class="muted">Admin can create and email these campaigns after confirmation. Questions are localized per recipient language at send time.</p>
    ${surveyBlocks}
  </section>

  <footer>
    Admin-only document. Contains personal data (emails). Do not forward outside the ops team.
    Survey emails honor unsubscribe and email-notification preferences.
  </footer>
</body>
</html>`;
}
