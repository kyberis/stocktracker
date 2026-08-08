import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { str } from "./helpers";

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15 / 1_000_000, output: 0.60 / 1_000_000 },
  "gpt-4o": { input: 2.50 / 1_000_000, output: 10.00 / 1_000_000 },
  "gpt-4.1-nano": { input: 0.10 / 1_000_000, output: 0.40 / 1_000_000 },
  "gpt-4.1-mini": { input: 0.40 / 1_000_000, output: 1.60 / 1_000_000 },
  "gpt-4.1": { input: 2.00 / 1_000_000, output: 8.00 / 1_000_000 },
  "o4-mini": { input: 1.10 / 1_000_000, output: 4.40 / 1_000_000 },
};

function calcCost(model: string, inputTokens: number, outputTokens: number): number {
  const bare = model.includes("/") ? model.split("/").pop()! : model;
  const pricing =
    MODEL_PRICING[model] ??
    MODEL_PRICING[bare] ??
    MODEL_PRICING["gpt-4o-mini"];
  return inputTokens * pricing.input + outputTokens * pricing.output;
}

/** Public wrapper for screening (and other) per-run cost ledgers. */
export function calcAiLogCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  return calcCost(model, inputTokens, outputTokens);
}

export interface AiLogEntry {
  id: string;
  userId: string;
  source: string;
  model: string;
  promptSystem: string;
  promptUser: string;
  response: string;
  tokensUsed: number;
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
  durationMs: number;
  status: string;
  errorMessage: string;
  createdAt: string;
}

export interface AiLogWithUser extends AiLogEntry {
  username: string;
  email: string;
}

export interface InsertAiLogParams {
  userId: string;
  source: string;
  model: string;
  promptSystem: string;
  promptUser: string;
  response?: string;
  tokensUsed?: number;
  tokensInput?: number;
  tokensOutput?: number;
  durationMs?: number;
  status?: "success" | "error";
  errorMessage?: string;
}

export async function insertAiLog(params: InsertAiLogParams): Promise<string> {
  const client = await ensureInitialized();
  const id = randomUUID();
  const tokensInput = params.tokensInput ?? 0;
  const tokensOutput = params.tokensOutput ?? 0;
  const tokensUsed = params.tokensUsed ?? (tokensInput + tokensOutput);
  const costUsd = calcCost(params.model, tokensInput, tokensOutput);
  await client.execute({
    sql: `INSERT INTO ai_logs (id, user_id, source, model, prompt_system, prompt_user, response, tokens_used, tokens_input, tokens_output, cost_usd, duration_ms, status, error_message)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      params.userId,
      params.source,
      params.model,
      params.promptSystem.slice(0, 50_000),
      params.promptUser.slice(0, 50_000),
      (params.response || "").slice(0, 50_000),
      tokensUsed,
      tokensInput,
      tokensOutput,
      costUsd,
      params.durationMs ?? 0,
      params.status ?? "success",
      params.errorMessage ?? "",
    ],
  });
  return id;
}

export async function updateAiLogResponse(
  id: string,
  response: string,
  tokensUsed: number,
  tokensInput: number,
  tokensOutput: number,
  model: string,
): Promise<void> {
  const client = await ensureInitialized();
  const costUsd = calcCost(model, tokensInput, tokensOutput);
  await client.execute({
    sql: "UPDATE ai_logs SET response = ?, tokens_used = ?, tokens_input = ?, tokens_output = ?, cost_usd = ? WHERE id = ?",
    args: [response.slice(0, 50_000), tokensUsed, tokensInput, tokensOutput, costUsd, id],
  });
}

export async function updateAiLogError(
  id: string,
  errorMessage: string,
): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE ai_logs SET status = 'error', error_message = ? WHERE id = ?",
    args: [errorMessage, id],
  });
}

export interface GetAiLogsOptions {
  limit?: number;
  offset?: number;
  userId?: string;
  source?: string;
}

export async function getAiLogs(
  opts: GetAiLogsOptions = {},
): Promise<{ logs: AiLogWithUser[]; total: number }> {
  const client = await ensureInitialized();
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;

  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (opts.userId) {
    conditions.push("a.user_id = ?");
    args.push(opts.userId);
  }
  if (opts.source) {
    conditions.push("a.source = ?");
    args.push(opts.source);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const [countResult, result] = await Promise.all([
    client.execute({ sql: `SELECT COUNT(*) as c FROM ai_logs a ${where}`, args }),
    client.execute({
      sql: `SELECT a.*, u.username, u.email
            FROM ai_logs a
            LEFT JOIN users u ON u.id = a.user_id
            ${where}
            ORDER BY a.created_at DESC
            LIMIT ? OFFSET ?`,
      args: [...args, limit, offset],
    }),
  ]);

  return {
    logs: result.rows.map((r) => ({
      id: str(r.id),
      userId: str(r.user_id),
      source: str(r.source),
      model: str(r.model),
      promptSystem: str(r.prompt_system),
      promptUser: str(r.prompt_user),
      response: str(r.response),
      tokensUsed: Number(r.tokens_used) || 0,
      tokensInput: Number(r.tokens_input) || 0,
      tokensOutput: Number(r.tokens_output) || 0,
      costUsd: Number(r.cost_usd) || 0,
      durationMs: Number(r.duration_ms) || 0,
      status: str(r.status),
      errorMessage: str(r.error_message),
      createdAt: str(r.created_at),
      username: str(r.username),
      email: str(r.email),
    })),
    total: Number(countResult.rows[0]?.c) || 0,
  };
}
