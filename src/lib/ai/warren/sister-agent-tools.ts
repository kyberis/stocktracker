import { tool } from "ai";
import { z } from "zod";

import { fetchClaraSavingsSummary } from "@/lib/ai/office/clara-client";
import type { OfficeIdentity } from "@/lib/ai/office/office-identity";
import { createWillOfficeNote, searchWillNotes } from "@/lib/ai/office/will-client";
import { listActiveAgentMissions } from "@/lib/db/agent-office";
import type { WarrenToolContext } from "./tools";

function hasSisterIdentity(identity: OfficeIdentity | null | undefined): identity is OfficeIdentity {
  return Boolean(identity?.idpSub?.trim() || identity?.email?.trim());
}

function sisterUnavailable(ctx: WarrenToolContext) {
  return {
    available: false,
    note: ctx.isDemo
      ? "Demo mode — sign in to connect Clara and Will."
      : "Missing unified account identity — sign in with your trefolio account linked to user.trefolio.com.",
  };
}

/** Clara + Will + Office mission read tools — shared by Warren drawer, Office, and Telegram. */
export function buildSisterAgentTools(ctx: WarrenToolContext) {
  const identity = ctx.officeIdentity;

  return {
    consultClaraSavings: tool({
      description:
        "Ask Clara (personal finance app) for savings summary: emergency fund balance/target, safe surplus, and investing-bucket cash. Use for spending questions, savings capacity, or before proposing investments.",
      inputSchema: z.object({}),
      execute: async () => {
        if (!hasSisterIdentity(identity)) return sisterUnavailable(ctx);
        ctx.emitStep("Consulting Clara on your savings…");
        const clara = await fetchClaraSavingsSummary(identity);
        if (clara.available) {
          const line = `Emergency ${clara.emergencyBalanceEur ?? 0} EUR (target ${clara.emergencyTargetEur ?? 0}) · Surplus ${clara.surplusEur ?? 0} EUR · Investing bucket ${clara.freeInInvestingBucketEur ?? 0} EUR free.`;
          ctx.emitSisterCoordination?.({ from: "warren", to: "clara", summary: line });
          ctx.emitSisterAgentMessage?.(
            "clara",
            `Savings snapshot: emergency ${clara.emergencyBalanceEur ?? 0} EUR, safe surplus ${clara.surplusEur ?? 0} EUR, ${clara.freeInInvestingBucketEur ?? 0} EUR free in Investing.`,
          );
          return {
            available: true,
            emergencyBalanceEur: clara.emergencyBalanceEur,
            emergencyTargetEur: clara.emergencyTargetEur,
            surplusEur: clara.surplusEur,
            freeInInvestingBucketEur: clara.freeInInvestingBucketEur,
            note: "For detailed monthly spending breakdown, the user can open clara.trefolio.com.",
          };
        }
        const hint =
          clara.note ||
          "Clara account not linked — use the same email at clara.trefolio.com.";
        ctx.emitSisterCoordination?.({ from: "warren", to: "clara", summary: hint });
        return { available: false, note: hint };
      },
    }),

    searchWillNotes: tool({
      description:
        "Search Will (investing notes journal) for notes matching a query. Use when the user asks about past decisions, journal entries, or 'search my notes'.",
      inputSchema: z.object({
        query: z.string().min(2).max(200).describe("Search terms, e.g. diversification, infra, pending investment"),
      }),
      execute: async ({ query }) => {
        if (!hasSisterIdentity(identity)) return sisterUnavailable(ctx);
        ctx.emitStep(`Searching Will notes for "${query}"…`);
        const hit = await searchWillNotes(identity, query);
        ctx.emitSisterCoordination?.({
          from: "warren",
          to: "will",
          summary: hit.available && hit.excerpt ? `Found: "${hit.excerpt.slice(0, 80)}…"` : hit.note || "No matching notes",
        });
        if (hit.available && hit.excerpt) {
          ctx.emitSisterAgentMessage?.(
            "will",
            `Found (${hit.noteDate || "no date"}): «${hit.excerpt}»`,
          );
          return {
            available: true,
            excerpt: hit.excerpt,
            noteDate: hit.noteDate,
            query,
          };
        }
        return {
          available: false,
          query,
          note: hit.note || "No matching notes — sign in at will.trefolio.com with the same email.",
        };
      },
    }),

    logWillNote: tool({
      description:
        "Log a short investing note in Will (investing journal). Use when the user wants to record a decision, thesis, or reminder.",
      inputSchema: z.object({
        text: z.string().min(4).max(2000),
      }),
      execute: async ({ text }) => {
        if (!hasSisterIdentity(identity)) return sisterUnavailable(ctx);
        if (ctx.isDemo) {
          return { ok: false, note: "Demo mode is read-only for Will notes." };
        }
        ctx.emitStep("Logging note in Will…");
        const result = await createWillOfficeNote(identity, text);
        if (result.ok) {
          ctx.emitSisterAgentMessage?.("will", `Logged: «${text.slice(0, 120)}${text.length > 120 ? "…" : ""}»`);
        }
        return result;
      },
    }),

    listOfficeMissions: tool({
      description:
        "List active Agent Office multi-step missions (Clara→Warren→Will coordination board). ONLY when the user asks about pending mission steps or open coordinated plans — NOT for moat screener, stock ideas, portfolio positions, or 'my investment in X'.",
      inputSchema: z.object({}),
      execute: async () => {
        const missions = await listActiveAgentMissions(ctx.userId);
        return {
          count: missions.length,
          missions: missions.map((m) => ({
            id: m.id,
            title: m.title,
            status: m.status,
            pendingSteps: m.steps
              .filter((s) => s.status !== "done")
              .map((s) => ({ step: s.step, agent: s.agent, action: s.action, status: s.status })),
          })),
        };
      },
    }),
  } as const;
}

export function sisterAgentToolsEnabled(ctx: WarrenToolContext): boolean {
  return hasSisterIdentity(ctx.officeIdentity);
}
