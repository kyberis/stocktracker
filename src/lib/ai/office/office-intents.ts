import { buildPortfolioSnapshot } from "@/lib/ai/warren/build-snapshot";
import { listActiveAgentMissions } from "@/lib/db/agent-office";
import { fetchClaraSavingsSummary } from "./clara-client";
import { searchWillNotes } from "./will-client";
import type { OfficeCoordinationLine, OfficeStreamFrame } from "./types";
import type { RunOfficeOrchestrationInput } from "./orchestrator";

function formatEur(n: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function formatPct(n: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(n);
}

export function wantsNoteSearchIntent(message: string): boolean {
  return /buscar en mis notas|search my notes|search notes|find in my notes|mis notas|my notes/i.test(message);
}

export function wantsPortfolioSummaryIntent(message: string): boolean {
  return /resumen de cartera|portfolio summary|summarize (my )?portfolio|how is my portfolio/i.test(message);
}

export function wantsSpendingIntent(message: string): boolean {
  return /cuánto gast|how much did i spend|spending this month|gasté este mes|gastado este mes/i.test(message);
}

export function wantsPendingInvestmentIntent(message: string): boolean {
  return /inversi[oó]n\s+pendiente|pending\s+invest|algo\s+pendiente.*invert|revis(a|ar).*(inversi|invert)|had\s+any.*invest|pendiente.*(invert|compr)|something\s+to\s+invest|left\s+to\s+invest/i.test(
    message,
  );
}

export function wantsMissionIntent(message: string): boolean {
  const m = message.toLowerCase();
  return /inteligente|smart|opportun|rebalance|diversif|infra|plata|money|ahorro|savings|misión|mission/.test(m);
}

export function extractNoteSearchQuery(message: string): string {
  const stripped = message
    .replace(/buscar en mis notas|search my notes|search notes|find in my notes|mis notas|my notes/gi, "")
    .trim();
  return stripped.length >= 2 ? stripped : "investing portfolio trading diversification";
}

type PersistFn = (
  input: RunOfficeOrchestrationInput,
  role: "warren" | "clara" | "will",
  content: string,
  createdAt: string,
) => Promise<void>;

type EmitFn = (frame: OfficeStreamFrame) => void;

export async function handleNoteSearch(
  input: RunOfficeOrchestrationInput,
  locale: "es" | "en",
  nextTs: () => string,
  persist: PersistFn,
  emitFrame: EmitFn,
): Promise<{ mission: null }> {
  const query = extractNoteSearchQuery(input.userMessage);

  const warrenIntro =
    locale === "es"
      ? `Busco en tus notas con Will: «${query}».`
      : `Searching your notes with Will for: “${query}”.`;
  await persist(input, "warren", warrenIntro, nextTs());

  const willHit = await searchWillNotes(input.identity, query);
  const coordination: OfficeCoordinationLine[] = [
    {
      from: "warren",
      to: "will",
      summary:
        locale === "es"
          ? `Búsqueda: «${query}»`
          : `Search: “${query}”`,
    },
  ];

  if (willHit.available && willHit.excerpt) {
    coordination.push({
      from: "will",
      to: "warren",
      summary:
        locale === "es"
          ? `Encontré una nota (${willHit.noteDate || "sin fecha"}): «${willHit.excerpt}»`
          : `Found a note (${willHit.noteDate || "no date"}): “${willHit.excerpt}”`,
    });

    const willReply =
      locale === "es"
        ? `Encontré esto (${willHit.noteDate || ""}):\n\n«${willHit.excerpt}»`
        : `Here's what I found (${willHit.noteDate || ""}):\n\n“${willHit.excerpt}”`;
    await persist(input, "will", willReply, nextTs());
  } else {
    const reason =
      willHit.note ||
      (locale === "es"
        ? "No hay notas que coincidan. ¿Tenés cuenta en will.trefolio.com con el mismo email?"
        : "No matching notes. Do you have an account at will.trefolio.com with the same email?");
    coordination.push({
      from: "will",
      to: "warren",
      summary: reason,
    });
    await persist(input, "will", reason, nextTs());
  }

  emitFrame({ kind: "coordination", lines: coordination });
  return { mission: null };
}

export async function handlePortfolioSummary(
  input: RunOfficeOrchestrationInput,
  locale: "es" | "en",
  nextTs: () => string,
  persist: PersistFn,
): Promise<{ mission: null }> {
  const snapshot = await buildPortfolioSnapshot({
    userId: input.userId,
    portfolioId: input.portfolioId,
    baseCurrency: input.baseCurrency || "EUR",
  });

  const top = snapshot.topHoldings.slice(0, 3);
  const topLines = top
    .map((h) => `${h.ticker || h.name}: ${formatEur(h.value, locale)} (${formatPct(h.weight, locale)}%)`)
    .join("\n");

  const cashEur = Object.values(snapshot.cashSummary || {}).reduce((a, b) => a + b, 0);

  const summary =
    locale === "es"
      ? [
          `Valor total: ${formatEur(snapshot.totals.value, locale)} (${formatPct(snapshot.totals.gainLossPct, locale)}% P&L).`,
          `Coste: ${formatEur(snapshot.totals.cost, locale)} · Cash: ${formatEur(cashEur, locale)}.`,
          snapshot.holdingsCount > 0 ? `Top posiciones:\n${topLines}` : "Sin posiciones abiertas.",
        ].join("\n")
      : [
          `Total value: ${formatEur(snapshot.totals.value, locale)} (${formatPct(snapshot.totals.gainLossPct, locale)}% P&L).`,
          `Cost: ${formatEur(snapshot.totals.cost, locale)} · Cash: ${formatEur(cashEur, locale)}.`,
          snapshot.holdingsCount > 0 ? `Top holdings:\n${topLines}` : "No open holdings.",
        ].join("\n");

  await persist(input, "warren", summary, nextTs());
  return { mission: null };
}

export async function handleSpendingQuery(
  input: RunOfficeOrchestrationInput,
  locale: "es" | "en",
  nextTs: () => string,
  persist: PersistFn,
  emitFrame: EmitFn,
): Promise<{ mission: null }> {
  const warrenIntro =
    locale === "es"
      ? "Consulto con Clara tu situación de ahorro (el detalle de gastos del mes está en Clara)."
      : "Checking with Clara on your savings (monthly spending detail lives in Clara).";
  await persist(input, "warren", warrenIntro, nextTs());

  const clara = await fetchClaraSavingsSummary(input.identity);
  const coordination: OfficeCoordinationLine[] = [];

  if (clara.available) {
    const line =
      locale === "es"
        ? `Ahorro: ${formatEur(clara.emergencyBalanceEur ?? 0, locale)} · Excedente seguro: ${formatEur(clara.surplusEur ?? 0, locale)}. Para gastos del mes, abrí clara.trefolio.com.`
        : `Savings: ${formatEur(clara.emergencyBalanceEur ?? 0, locale)} · Safe surplus: ${formatEur(clara.surplusEur ?? 0, locale)}. For this month's spending, open clara.trefolio.com.`;
    coordination.push({ from: "warren", to: "clara", summary: line });
    await persist(input, "clara", line, nextTs());
  } else {
    const hint =
      clara.note ||
      (locale === "es"
        ? "No encontré tu cuenta Clara — usá el mismo email en clara.trefolio.com."
        : "Couldn't find your Clara account — use the same email at clara.trefolio.com.");
    coordination.push({ from: "warren", to: "clara", summary: hint });
    await persist(input, "clara", hint, nextTs());
  }

  emitFrame({ kind: "coordination", lines: coordination });
  return { mission: null };
}

export async function handlePendingInvestmentQuery(
  input: RunOfficeOrchestrationInput,
  locale: "es" | "en",
  nextTs: () => string,
  persist: PersistFn,
  emitFrame: EmitFn,
): Promise<{ mission: null }> {
  const warrenIntro =
    locale === "es"
      ? "Reviso misiones activas, ahorro marcado para invertir en Clara y tus notas en Will."
      : "Checking active missions, Clara savings marked for investing, and your Will notes.";
  await persist(input, "warren", warrenIntro, nextTs());

  const [missions, clara, willHit] = await Promise.all([
    listActiveAgentMissions(input.userId),
    fetchClaraSavingsSummary(input.identity),
    searchWillNotes(input.identity, "inversión pendiente pending investment comprar buy plan"),
  ]);

  const coordination: OfficeCoordinationLine[] = [];
  const findings: string[] = [];

  const pendingSteps = missions.flatMap((m) =>
    m.steps.filter((s) => s.status !== "done").map((s) => ({ mission: m, step: s })),
  );
  if (pendingSteps.length > 0) {
    const lines = pendingSteps
      .slice(0, 3)
      .map(({ mission, step }) =>
        locale === "es"
          ? `• ${mission.title}: paso ${step.step} — ${step.action}`
          : `• ${mission.title}: step ${step.step} — ${step.action}`,
      )
      .join("\n");
    findings.push(
      locale === "es"
        ? `Tenés ${pendingSteps.length} paso(s) pendiente(s) en misiones activas:\n${lines}`
        : `You have ${pendingSteps.length} pending step(s) in active missions:\n${lines}`,
    );
    coordination.push({
      from: "warren",
      to: "warren",
      summary:
        locale === "es"
          ? `${pendingSteps.length} paso(s) de misión sin confirmar`
          : `${pendingSteps.length} unconfirmed mission step(s)`,
    });
  }

  const investingBucket = clara.freeInInvestingBucketEur ?? 0;
  if (clara.available && investingBucket > 0) {
    findings.push(
      locale === "es"
        ? `Clara tiene ${formatEur(investingBucket, locale)} marcados en el bucket Inversión sin desplegar en cartera.`
        : `Clara has ${formatEur(investingBucket, locale)} marked in the Investing bucket not yet deployed to your portfolio.`,
    );
    coordination.push({
      from: "warren",
      to: "clara",
      summary:
        locale === "es"
          ? `${formatEur(investingBucket, locale)} libres en Inversión`
          : `${formatEur(investingBucket, locale)} free in Investing`,
    });
  } else if (!clara.available) {
    coordination.push({
      from: "warren",
      to: "clara",
      summary:
        clara.note ||
        (locale === "es" ? "Clara no respondió" : "Clara did not respond"),
    });
  }

  if (willHit.available && willHit.excerpt) {
    findings.push(
      locale === "es"
        ? `En Will encontré (${willHit.noteDate || "sin fecha"}): «${willHit.excerpt}»`
        : `Will note (${willHit.noteDate || "no date"}): “${willHit.excerpt}”`,
    );
    coordination.push({
      from: "warren",
      to: "will",
      summary:
        locale === "es"
          ? `Nota: «${willHit.excerpt.slice(0, 80)}…»`
          : `Note: “${willHit.excerpt.slice(0, 80)}…”`,
    });
  } else {
    coordination.push({
      from: "warren",
      to: "will",
      summary:
        willHit.note ||
        (locale === "es"
          ? "Sin notas sobre inversiones pendientes"
          : "No notes about pending investments"),
    });
  }

  emitFrame({ kind: "coordination", lines: coordination });

  if (findings.length === 0) {
    const none =
      locale === "es"
        ? "No encontré inversiones pendientes: no hay pasos de misión abiertos, ni ahorro marcado para invertir en Clara, ni notas relevantes en Will."
        : "I didn't find pending investments: no open mission steps, no Clara savings marked for investing, and no relevant Will notes.";
    await persist(input, "warren", none, nextTs());
    return { mission: null };
  }

  const summary =
    locale === "es"
      ? `Esto es lo que encontré:\n\n${findings.join("\n\n")}`
      : `Here's what I found:\n\n${findings.join("\n\n")}`;
  await persist(input, "warren", summary, nextTs());

  if (pendingSteps.length > 0) {
    emitFrame({ kind: "mission", mission: missions[0]! });
  }

  return { mission: null };
}
