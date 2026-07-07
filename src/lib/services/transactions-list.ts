import { listTransactions } from "@/lib/db";
import type { Transaction } from "@/lib/types";
import type { ServiceResult } from "@/lib/services/service-result";
import { serviceErr } from "@/lib/services/service-result";

export interface ListTransactionsOpts {
  portfolioId?: string;
  holdingId?: string;
  type?: Transaction["type"];
  since?: string;
  limit?: number;
}

export async function listTransactionsForUser(
  userId: string,
  opts?: ListTransactionsOpts,
): Promise<ServiceResult<Transaction[]>> {
  if (!userId) return serviceErr("userId is required", "invalid_input");

  let txs = await listTransactions(userId, opts?.holdingId, opts?.portfolioId);

  if (opts?.type) {
    txs = txs.filter((tx) => tx.type === opts.type);
  }
  if (opts?.since) {
    const sinceMs = new Date(opts.since).getTime();
    if (!Number.isNaN(sinceMs)) {
      txs = txs.filter((tx) => tx.createdAt && new Date(tx.createdAt).getTime() >= sinceMs);
    }
  }

  const limit = opts?.limit;
  if (limit != null && limit > 0) {
    txs = txs.slice(0, Math.min(limit, 500));
  }

  return { ok: true, data: txs };
}
