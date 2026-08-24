import { tool } from "ai";
import { z } from "zod";
import { randomUUID } from "crypto";

import { findUserById } from "@/lib/db";
import { canUseBrokerSync, effectivePlan } from "@/lib/subscription";
import type { SubscriptionPlan } from "@/lib/types";
import type { WarrenToolContext } from "./tools";
import type { ImportTransactionsProposalData, WarrenImportSource } from "./types";
import { extractAiPortfolioFromAttachment } from "./import-ai";
import {
  decodeAttachmentCsv,
  findCsvOrSpreadsheetAttachment,
  findImageAttachment,
  parseBrokerCsvPreview,
} from "./import-parse";
import { fetchSnapTradeImportPreview, prepareSnapTradeConnect } from "./import-snaptrade";

function importAppBaseUrl(): string {
  return process.env.APP_BASE_URL?.trim().replace(/\/+$/g, "") || "https://trefolio.com";
}

function emitImportProposal(
  ctx: WarrenToolContext,
  data: ImportTransactionsProposalData,
  title: string,
  summary: string,
) {
  const id = randomUUID();
  const s = data.summary;
  ctx.emitProposal({
    id,
    kind: "importTransactions",
    title,
    summary,
    rows: [
      { label: "Transactions", value: String(s.total) },
      { label: "Buys", value: String(s.buys) },
      { label: "Sells", value: String(s.sells) },
      { label: "Dividends", value: String(s.dividends) },
      ...(s.duplicatesRemoved ? [{ label: "Duplicates skipped", value: String(s.duplicatesRemoved) }] : []),
      ...(data.detectedBroker ? [{ label: "Format", value: data.detectedBroker }] : []),
    ],
    data: { ...data, portfolioId: data.portfolioId ?? ctx.activePortfolioId },
  });
  return id;
}

export function buildWarrenImportTools(ctx: WarrenToolContext) {
  return {
    presentImportOptions: tool({
      description:
        "Show the three ways to import a portfolio: broker CSV/Excel, live broker sync (SnapTrade), or AI from a screenshot/generic CSV. Call this whenever the user asks to import their portfolio, upload holdings, or bring in a broker statement — before parsing any file.",
      inputSchema: z.object({}),
      execute: async () => {
        ctx.emitStep("Preparing import options…");
        const user = await findUserById(ctx.userId);
        const plan = effectivePlan(
          (user?.plan || "free") as SubscriptionPlan,
          user?.plan_expires_at ?? "",
        );
        const brokerOk = canUseBrokerSync(plan, user?.plan_expires_at ?? "");
        ctx.emitPart({
          kind: "importOptions",
          data: {
            methods: [
              { id: "csv", available: true },
              {
                id: "snaptrade",
                available: brokerOk,
                requiresPro: !brokerOk,
                upgradeHint: brokerOk
                  ? undefined
                  : "Broker sync needs Trefolio. Import a CSV instead, or upgrade.",
              },
              { id: "ai", available: true },
            ],
          },
        });
        return {
          methods: ["csv", "snaptrade", "ai"],
          tip: "Tell the user to pick CSV (attach a file), broker sync, or AI (screenshot). Do not invent holdings.",
        };
      },
    }),

    parseBrokerCsvImport: tool({
      description:
        "Parse an attached broker CSV or Excel file with the same deterministic parsers as /import. Call when the user attached a CSV/XLSX or chose CSV import. Emits a confirmation card. If the format is unknown, tell the user you will use AI extract next and call extractAiPortfolioImport.",
      inputSchema: z.object({}),
      execute: async () => {
        if (ctx.isDemo) {
          return { error: "demo_mode", message: "Demo mode cannot import files." };
        }
        const file = findCsvOrSpreadsheetAttachment(ctx.attachments);
        if (!file) {
          return {
            error: "no_csv_attachment",
            message: "Ask the user to attach a CSV or Excel export from their broker (paperclip), then call this tool again.",
          };
        }
        ctx.emitStep("Parsing your broker file…");
        const csv = decodeAttachmentCsv(file);
        const parsed = await parseBrokerCsvPreview(ctx.userId, csv, ctx.activePortfolioId);
        if (!parsed.ok) {
          return { error: "parse_failed", message: parsed.error };
        }
        if (parsed.fallbackToAi) {
          return {
            fallbackToAi: true,
            reason: parsed.reason,
            message:
              "No broker format matched. Call extractAiPortfolioImport on the same attachment to extract with AI.",
          };
        }
        const preview = parsed.preview;
        if (preview.transactions.length === 0) {
          return {
            empty: true,
            message: "The file parsed but had no new transactions (they may already be in the ledger).",
          };
        }
        const proposalId = emitImportProposal(
          ctx,
          {
            source: "broker_csv" satisfies WarrenImportSource,
            detectedBroker: preview.detectedBroker,
            transactions: preview.transactions,
            cashBalances: preview.cashBalances,
            summary: preview.summary,
            portfolioId: ctx.activePortfolioId,
          },
          preview.detectedBroker
            ? `Import ${preview.summary.total} ${preview.detectedBroker} transactions`
            : `Import ${preview.summary.total} transactions`,
          "Review the rows, then confirm to add them to your portfolio.",
        );
        return {
          proposalId,
          status: "awaiting_user_confirmation",
          detectedBroker: preview.detectedBroker,
          total: preview.summary.total,
        };
      },
    }),

    extractAiPortfolioImport: tool({
      description:
        "Extract holdings and transactions from an attached screenshot or unrecognized CSV using the same AI import pipeline as /import. Call when the user chose AI import, attached an image of their portfolio, or parseBrokerCsvImport returned fallbackToAi.",
      inputSchema: z.object({}),
      execute: async () => {
        if (ctx.isDemo) {
          return { error: "demo_mode", message: "Demo mode cannot import files." };
        }
        const file =
          findImageAttachment(ctx.attachments) || findCsvOrSpreadsheetAttachment(ctx.attachments);
        if (!file) {
          return {
            error: "no_attachment",
            message: "Ask the user to attach a screenshot or CSV (paperclip), then call this tool again.",
          };
        }
        ctx.emitStep("Extracting holdings with AI…");
        const extracted = await extractAiPortfolioFromAttachment({
          userId: ctx.userId,
          file,
          role: ctx.userRole,
          plan: ctx.subscriptionPlan,
          portfolioId: ctx.activePortfolioId,
          gatewayHeaders: ctx.gatewayHeaders,
        });
        if (!extracted.ok) {
          return { error: "extract_failed", message: extracted.error };
        }
        if (extracted.preview.transactions.length === 0) {
          return {
            empty: true,
            warning: extracted.preview.warning,
            message: extracted.preview.warning || "Nothing could be extracted from that file.",
          };
        }
        const txs = extracted.preview.transactions;
        const proposalId = emitImportProposal(
          ctx,
          {
            source: "ai_import",
            transactions: txs,
            summary: {
              total: txs.length,
              buys: txs.filter((t) => t.type === "buy").length,
              sells: txs.filter((t) => t.type === "sell").length,
              dividends: txs.filter((t) => t.type === "dividend").length,
              fees: txs.filter((t) => t.type === "fee").length,
            },
            portfolioId: ctx.activePortfolioId,
          },
          `Import ${txs.length} AI-extracted transactions`,
          extracted.preview.warning || "Review the extracted rows, then confirm.",
        );
        return { proposalId, status: "awaiting_user_confirmation", total: txs.length };
      },
    }),

    startSnapTradeConnect: tool({
      description:
        "Start live broker sync via SnapTrade. Call when the user wants to import from their broker / connect a brokerage. Opens the SnapTrade portal on web. On Telegram, return a link to /import. If already connected, tell the user to call fetchSnapTradeImport next.",
      inputSchema: z.object({}),
      execute: async () => {
        if (ctx.isDemo) {
          return { error: "demo_mode", message: "Demo mode cannot connect brokers." };
        }
        ctx.emitStep("Opening broker connection…");
        const prepared = await prepareSnapTradeConnect(ctx.userId);
        if (!prepared.ok) {
          return { error: "connect_failed", message: prepared.error, upgrade: prepared.upgrade };
        }
        if (prepared.alreadyConnected) {
          return {
            alreadyConnected: true,
            brokerCount: prepared.brokerCount,
            message: "The user already has a connected broker. Call fetchSnapTradeImport now.",
          };
        }
        if (ctx.channel !== "web") {
          const url = `${importAppBaseUrl()}/import?method=snaptrade_api`;
          return {
            telegram: true,
            importUrl: url,
            message: `Tell the user to connect their broker in the web app: ${url}. SnapTrade cannot open a popup in this channel.`,
          };
        }
        ctx.emitClientAction?.({ action: "open_snaptrade", url: prepared.redirectUrl });
        return {
          portalOpened: true,
          message:
            "The SnapTrade portal is opening. Tell the user to connect their broker. After they finish, they will send a follow-up — then call fetchSnapTradeImport.",
        };
      },
    }),

    fetchSnapTradeImport: tool({
      description:
        "After the user connected a broker via SnapTrade, fetch new transactions and show a confirmation card (same as /import broker sync). Call when the user says they connected, or startSnapTradeConnect returned alreadyConnected.",
      inputSchema: z.object({}),
      execute: async () => {
        if (ctx.isDemo) {
          return { error: "demo_mode", message: "Demo mode cannot fetch brokers." };
        }
        ctx.emitStep("Fetching broker transactions…");
        const fetched = await fetchSnapTradeImportPreview(ctx.userId, ctx.activePortfolioId);
        if (!fetched.ok) {
          return {
            error: "fetch_failed",
            message: fetched.error,
            needsReconnect: fetched.needsReconnect,
          };
        }
        if (fetched.transactions.length === 0) {
          return {
            empty: true,
            cashImported: fetched.cashImported,
            message:
              fetched.cashImported > 0
                ? "Holdings and cash were synced. There are no new transactions to import."
                : "Connected, but there are no new transactions to import.",
          };
        }
        const proposalId = emitImportProposal(
          ctx,
          {
            source: "snaptrade_api",
            transactions: fetched.transactions,
            summary: fetched.summary,
            portfolioId: ctx.activePortfolioId,
          },
          `Import ${fetched.summary.total} broker transactions`,
          "Holdings and cash from the broker were already synced. Confirm to add these new transactions to your ledger.",
        );
        return {
          proposalId,
          status: "awaiting_user_confirmation",
          total: fetched.summary.total,
          cashImported: fetched.cashImported,
        };
      },
    }),
  } as const;
}
