import { buildPortfolioSnapshot } from "@/lib/ai/warren/build-snapshot";
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
