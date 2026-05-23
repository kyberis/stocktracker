import { randomUUID } from "crypto";

import { buildPortfolioSnapshot } from "@/lib/ai/warren/build-snapshot";
import { fetchClaraSavingsSummary } from "./clara-client";
import type { OfficeIdentity } from "./office-identity";
import { searchWillNotes } from "./will-client";
import { findPrimarySectorGap, portfolioCashEur } from "./analyze-gaps";
import type {
  AgentMissionRecord,
  AgentMissionStep,
  OfficeCoordinationLine,
  OfficeStreamFrame,
} from "./types";
import {
  appendOfficeMessage,
  createAgentMission,
  listActiveAgentMissions,
} from "@/lib/db/agent-office";

export interface RunOfficeOrchestrationInput {
  userId: string;
  identity: OfficeIdentity;
  portfolioId?: string;
  baseCurrency?: string;
  language?: string;
  userMessage: string;
  onFrame?: (frame: OfficeStreamFrame) => void;
}

function emit(onFrame: RunOfficeOrchestrationInput["onFrame"], frame: OfficeStreamFrame) {
  onFrame?.(frame);
}

function createOfficeClock(baseMs: number) {
  let tick = 0;
  return () => new Date(baseMs + ++tick * 1_200).toISOString();
}

async function persistAgentMessage(
  input: RunOfficeOrchestrationInput,
  role: "warren" | "clara" | "will",
  content: string,
  createdAt: string,
) {
  await appendOfficeMessage(input.userId, role, content, createdAt);
  emit(input.onFrame, { kind: "message", role, content, createdAt });
}

function wantsMissionIntent(message: string): boolean {
  const m = message.toLowerCase();
  return (
    /inteligente|smart|opportun|rebalance|diversif|infra|plata|money|ahorro|savings|misión|mission/.test(m) ||
    /resumen de cartera|portfolio summary|cuánto gast|how much did i spend|buscar en mis notas|search my notes/.test(m)
  );
}

function formatPct(n: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(n);
}

function formatEur(n: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

export async function runOfficeOrchestration(
  input: RunOfficeOrchestrationInput,
): Promise<{ mission: AgentMissionRecord | null }> {
  const locale = input.language?.startsWith("es") ? "es" : "en";
  const baseMs = Date.now();
  const nextTs = createOfficeClock(baseMs);
  const userTs = new Date(baseMs).toISOString();

  await appendOfficeMessage(input.userId, "user", input.userMessage, userTs);

  emit(input.onFrame, {
    kind: "message",
    role: "user",
    content: input.userMessage,
    createdAt: userTs,
  });

  const existing = await listActiveAgentMissions(input.userId);
  if (existing.length > 0 && !wantsMissionIntent(input.userMessage)) {
    const warrenReply =
      locale === "es"
        ? "Tenés una misión activa en el tablero. Confirmá cada paso cuando estés listo, o cancelala para empezar otra coordinación."
        : "You have an active mission on the board. Confirm each step when ready, or cancel it to start a new coordination.";
    await persistAgentMessage(input, "warren", warrenReply, nextTs());
    emit(input.onFrame, { kind: "mission", mission: existing[0]! });
    return { mission: existing[0]! };
  }

  if (!wantsMissionIntent(input.userMessage)) {
    const warrenReply =
      locale === "es"
        ? "Puedo coordinar con Clara (ahorros) y Will (notas) para proponerte una misión. Probá: «¿Hay algo inteligente que pueda hacer con mi plata?»"
        : "I can coordinate with Clara (savings) and Will (notes) to propose a mission. Try: “Is there anything smart I can do with my money?”";
    await persistAgentMessage(input, "warren", warrenReply, nextTs());
    return { mission: null };
  }

  const snapshot = await buildPortfolioSnapshot({
    userId: input.userId,
    portfolioId: input.portfolioId,
    baseCurrency: input.baseCurrency || "EUR",
  });

  const gap = findPrimarySectorGap(snapshot);
  const cashEur = Math.round(portfolioCashEur(snapshot));

  const [clara, will] = await Promise.all([
    fetchClaraSavingsSummary(input.identity),
    searchWillNotes(input.identity, "diversification infrastructure emergency savings"),
  ]);

  const coordination: OfficeCoordinationLine[] = [];

  if (gap) {
    const warrenText =
      locale === "es"
        ? `Revisé tu cartera. Tenés baja concentración en ${gap.label} (${formatPct(gap.currentPct, locale)}% vs ~${formatPct(gap.targetPct, locale)}% razonable). Cash en cartera (${formatEur(cashEur, locale)}) no alcanza para un rebalanceo significativo. Voy a consultar con Clara y Will.`
        : `I reviewed your portfolio. You have low concentration in ${gap.label} (${formatPct(gap.currentPct, locale)}% vs ~${formatPct(gap.targetPct, locale)}% reasonable). Portfolio cash (${formatEur(cashEur, locale)}) is not enough for a meaningful rebalance. I'll check with Clara and Will.`;

    await persistAgentMessage(input, "warren", warrenText, nextTs());
  } else {
    const warrenText =
      locale === "es"
        ? "No detecté un gap sectorial claro ahora mismo. Igual consulto con Clara y Will por si hay ahorro o notas relevantes."
        : "I didn't detect a clear sector gap right now. I'll still check with Clara and Will for savings or relevant notes.";
    await persistAgentMessage(input, "warren", warrenText, nextTs());
  }

  if (clara.available) {
    const surplus = clara.surplusEur ?? 0;
    const line =
      locale === "es"
        ? `¿Cuánto ahorro disponible sin romper el colchón? → ${formatEur(surplus, locale)} excedente seguro (emergencia ${formatEur(clara.emergencyBalanceEur ?? 0, locale)}, objetivo ${formatEur(clara.emergencyTargetEur ?? 0, locale)} ✓). Presupuesto: ${formatEur(clara.freeInInvestingBucketEur ?? 0, locale)} libres en Inversión.`
        : `How much savings without breaking the emergency fund? → ${formatEur(surplus, locale)} safe surplus (emergency ${formatEur(clara.emergencyBalanceEur ?? 0, locale)}, target ${formatEur(clara.emergencyTargetEur ?? 0, locale)} ✓). Budget: ${formatEur(clara.freeInInvestingBucketEur ?? 0, locale)} free in Investing.`;
    coordination.push({ from: "warren", to: "clara", summary: line });
  } else {
    const claraHint =
      clara.note ||
      (input.identity.idpSub
        ? locale === "es"
          ? "Clara no respondió — abrí clara.trefolio.com con la misma cuenta."
          : "Clara did not respond — open clara.trefolio.com with the same account."
        : locale === "es"
          ? "Clara no pudo identificarte — usá la misma cuenta en user.trefolio.com y clara.trefolio.com."
          : "Clara could not identify you — use the same account on user.trefolio.com and clara.trefolio.com.");
    coordination.push({
      from: "warren",
      to: "clara",
      summary: claraHint,
    });
  }

  if (will.available && will.excerpt) {
    coordination.push({
      from: "warren",
      to: "will",
      summary:
        locale === "es"
          ? `Notas sobre diversificación → "${will.excerpt}" (${will.noteDate || ""})`
          : `Notes on diversification → "${will.excerpt}" (${will.noteDate || ""})`,
    });
  } else {
    coordination.push({
      from: "warren",
      to: "will",
      summary:
        locale === "es"
          ? "Will no devolvió notas recientes sobre diversificación."
          : "Will returned no recent notes on diversification.",
    });
  }

  if (clara.available && (clara.surplusEur ?? 0) > 0) {
    coordination.push({
      from: "clara",
      to: "warren",
      summary:
        locale === "es"
          ? `Confirmado: ${formatEur(clara.surplusEur ?? 0, locale)} pueden moverse a bucket Inversión sin afectar gastos fijos del próximo mes.`
          : `Confirmed: ${formatEur(clara.surplusEur ?? 0, locale)} can move to the Investing bucket without affecting next month's fixed expenses.`,
    });
  }

  emit(input.onFrame, { kind: "coordination", lines: coordination });

  const investAmount = clara.available
    ? Math.min(clara.surplusEur ?? 0, gap?.gapEur ?? clara.surplusEur ?? 0)
    : 0;

  if (investAmount <= 0 && !gap) {
    const msg =
      locale === "es"
        ? "Por ahora no armé una misión: no hay excedente de ahorro claro ni gap sectorial fuerte."
        : "No mission for now: no clear savings surplus or strong sector gap.";
    await persistAgentMessage(input, "warren", msg, nextTs());
    return { mission: null };
  }

  const amount = investAmount > 0 ? investAmount : Math.min(gap?.gapEur ?? 0, 800);

  const steps: AgentMissionStep[] = [];

  if (clara.available && amount > 0) {
    steps.push({
      step: 1,
      agent: "clara",
      agentLabel: locale === "es" ? "Clara · Finanzas" : "Clara · Finance",
      action:
        locale === "es"
          ? `Marcar ${formatEur(amount, locale)} del excedente de emergencia como "disponible para inversión"`
          : `Mark ${formatEur(amount, locale)} of emergency surplus as "available for investing"`,
      status: "ready",
      kind: "clara_release_savings",
      payload: { amountEur: amount },
    });
  }

  steps.push({
    step: steps.length + 1,
    agent: "warren",
    agentLabel: locale === "es" ? "Warren · Cartera" : "Warren · Portfolio",
    action:
      locale === "es"
        ? `Añadir posición ~${formatEur(amount, locale)} en ETF infra — requiere paso ${steps.length > 0 ? 1 : "—"}`
        : `Add ~${formatEur(amount, locale)} infra ETF position — requires step ${steps.length > 0 ? 1 : "—"}`,
    status: steps.length > 0 ? "blocked" : "ready",
    kind: "warren_add_cash",
    requiresStep: steps.length > 0 ? 1 : undefined,
    payload: { amountEur: amount, sector: gap?.label || "Infra / Utilities" },
  });

  steps.push({
    step: steps.length + 1,
    agent: "will",
    agentLabel: locale === "es" ? "Will · Notas" : "Will · Notes",
    action:
      locale === "es"
        ? `Registrar: "Rebalanceo infra con excedente Clara — ${new Date().toLocaleDateString("es")}"`
        : `Log: "Infra rebalance with Clara surplus — ${new Date().toLocaleDateString("en")}"`,
    status: "ready",
    kind: "will_log_note",
    payload: {
      text:
        locale === "es"
          ? `Rebalanceo ${gap?.label || "infra"} con excedente Clara — ${new Date().toISOString().slice(0, 10)}`
          : `${gap?.label || "Infra"} rebalance with Clara surplus — ${new Date().toISOString().slice(0, 10)}`,
    },
  });

  const mission = await createAgentMission(input.userId, {
    title: locale === "es" ? "Rebalanceo sector Infra" : "Infra sector rebalance",
    description:
      locale === "es"
        ? `Mover excedente de ahorro (Clara) hacia ${gap?.label || "infra"} subponderada (Warren).${will.excerpt ? " Alineado con tu nota." : ""}`
        : `Move savings surplus (Clara) into underweight ${gap?.label || "infra"} (Warren).${will.excerpt ? " Aligned with your note." : ""}`,
    steps,
  });

  const warrenMission =
    locale === "es"
      ? "Armé una misión de 3 pasos. Revisala en el tablero → confirmá cada paso por separado. Nada se ejecuta sin tu OK."
      : "I built a 3-step mission. Review it on the board → confirm each step separately. Nothing runs without your OK.";
  await persistAgentMessage(input, "warren", warrenMission, nextTs());

  if (clara.available && amount > 0) {
    const claraMsg =
      locale === "es"
        ? `El paso 1 lo manejo yo: marco ${formatEur(amount, locale)} como disponibles para inversión.`
        : `Step 1 is on me: I mark ${formatEur(amount, locale)} as available for investing.`;
    await persistAgentMessage(input, "clara", claraMsg, nextTs());
  }

  const willMsg =
    locale === "es"
      ? "Cuando confirmes, puedo registrar la decisión en tu diario de inversión."
      : "When you confirm, I can log the decision in your investing journal.";
  await persistAgentMessage(input, "will", willMsg, nextTs());

  emit(input.onFrame, { kind: "mission", mission });

  return { mission };
}

/** Local-only confirm when sister apps are down (dev/demo). */
export function stubClaraRelease(amountEur: number): { ok: boolean; message: string } {
  return { ok: true, message: `Stub: marked €${amountEur} for investing` };
}

export function stubWillNote(text: string): { ok: boolean; message: string } {
  return { ok: true, message: `Stub: logged note (${text.slice(0, 40)}…)` };
}

export function newMissionId(): string {
  return randomUUID();
}
