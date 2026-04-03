import { randomUUID } from "crypto";
import type { InValue } from "@libsql/client";
import { ensureInitialized } from "./client";
import { str, num } from "./helpers";

/* ── Types ── */

export type DigestStatus = "draft" | "published" | "archived";

export interface MarketDigest {
  id: string;
  gmailMessageId: string;
  sender: string;
  originalSubject: string;
  receivedAt: string;
  rawText: string;
  rawHtml: string;
  mentionedTickers: string[];
  sectors: string[];
  sentiment: string;
  aiModel: string;
  tokensUsed: number;
  status: DigestStatus;
  publishedAt: string;
  emailSent: boolean;
  createdAt: string;
}

export interface DigestTranslation {
  id: string;
  digestId: string;
  language: string;
  title: string;
  summary: string;
  keyPoints: string[];
  createdAt: string;
}

export interface MarketDigestWithTranslations extends MarketDigest {
  translations: DigestTranslation[];
}

/* ── Helpers ── */

function parseJsonArray(raw: string): string[] {
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function rowToDigest(r: Record<string, unknown>): MarketDigest {
  return {
    id: str(r.id),
    gmailMessageId: str(r.gmail_message_id),
    sender: str(r.sender),
    originalSubject: str(r.original_subject),
    receivedAt: str(r.received_at),
    rawText: str(r.raw_text),
    rawHtml: str(r.raw_html),
    mentionedTickers: parseJsonArray(str(r.mentioned_tickers)),
    sectors: parseJsonArray(str(r.sectors)),
    sentiment: str(r.sentiment),
    aiModel: str(r.ai_model),
    tokensUsed: num(r.tokens_used),
    status: str(r.status) as DigestStatus,
    publishedAt: str(r.published_at),
    emailSent: num(r.email_sent) === 1,
    createdAt: str(r.created_at),
  };
}

function rowToTranslation(r: Record<string, unknown>): DigestTranslation {
  return {
    id: str(r.id),
    digestId: str(r.digest_id),
    language: str(r.language),
    title: str(r.title),
    summary: str(r.summary),
    keyPoints: parseJsonArray(str(r.key_points)),
    createdAt: str(r.created_at),
  };
}

/* ── Queries ── */

export async function digestExistsByGmailId(gmailMessageId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const res = await client.execute({
    sql: "SELECT 1 FROM market_digests WHERE gmail_message_id = ? LIMIT 1",
    args: [gmailMessageId],
  });
  return res.rows.length > 0;
}

export async function insertMarketDigest(data: {
  gmailMessageId: string;
  sender: string;
  originalSubject: string;
  receivedAt: string;
  rawText: string;
  rawHtml: string;
  mentionedTickers: string[];
  sectors: string[];
  sentiment: string;
  aiModel: string;
  tokensUsed: number;
  translations: { language: string; title: string; summary: string; keyPoints: string[] }[];
}): Promise<string> {
  const client = await ensureInitialized();
  const digestId = randomUUID();

  await client.execute({
    sql: `INSERT INTO market_digests
      (id, gmail_message_id, sender, original_subject, received_at, raw_text, raw_html,
       mentioned_tickers, sectors, sentiment, ai_model, tokens_used, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
    args: [
      digestId,
      data.gmailMessageId,
      data.sender,
      data.originalSubject,
      data.receivedAt,
      data.rawText,
      data.rawHtml,
      JSON.stringify(data.mentionedTickers),
      JSON.stringify(data.sectors),
      data.sentiment,
      data.aiModel,
      data.tokensUsed,
    ],
  });

  for (const t of data.translations) {
    await client.execute({
      sql: `INSERT INTO market_digest_translations
        (id, digest_id, language, title, summary, key_points)
        VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        randomUUID(),
        digestId,
        t.language,
        t.title,
        t.summary,
        JSON.stringify(t.keyPoints),
      ],
    });
  }

  return digestId;
}

export async function listMarketDigests(opts: {
  status?: DigestStatus;
  limit?: number;
  offset?: number;
}): Promise<MarketDigest[]> {
  const client = await ensureInitialized();
  const conditions: string[] = [];
  const args: InValue[] = [];

  if (opts.status) {
    conditions.push("status = ?");
    args.push(opts.status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;

  const res = await client.execute({
    sql: `SELECT * FROM market_digests ${where} ORDER BY received_at DESC LIMIT ? OFFSET ?`,
    args: [...args, limit, offset],
  });

  return res.rows.map((r) => rowToDigest(r as unknown as Record<string, unknown>));
}

export async function getMarketDigestWithTranslations(
  id: string,
): Promise<MarketDigestWithTranslations | null> {
  const client = await ensureInitialized();
  const digestRes = await client.execute({
    sql: "SELECT * FROM market_digests WHERE id = ?",
    args: [id],
  });
  if (digestRes.rows.length === 0) return null;

  const digest = rowToDigest(digestRes.rows[0] as unknown as Record<string, unknown>);

  const transRes = await client.execute({
    sql: "SELECT * FROM market_digest_translations WHERE digest_id = ? ORDER BY language",
    args: [id],
  });

  const translations = transRes.rows.map((r) =>
    rowToTranslation(r as unknown as Record<string, unknown>),
  );

  return { ...digest, translations };
}

export async function updateTranslation(
  translationId: string,
  data: { title?: string; summary?: string; keyPoints?: string[] },
): Promise<void> {
  const client = await ensureInitialized();
  const sets: string[] = [];
  const args: InValue[] = [];

  if (data.title !== undefined) {
    sets.push("title = ?");
    args.push(data.title);
  }
  if (data.summary !== undefined) {
    sets.push("summary = ?");
    args.push(data.summary);
  }
  if (data.keyPoints !== undefined) {
    sets.push("key_points = ?");
    args.push(JSON.stringify(data.keyPoints));
  }

  if (sets.length === 0) return;
  args.push(translationId);

  await client.execute({
    sql: `UPDATE market_digest_translations SET ${sets.join(", ")} WHERE id = ?`,
    args,
  });
}

export async function publishDigest(id: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE market_digests SET status = 'published', published_at = datetime('now') WHERE id = ?",
    args: [id],
  });
}

export async function archiveDigest(id: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE market_digests SET status = 'archived' WHERE id = ?",
    args: [id],
  });
}

export async function markDigestEmailSent(id: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE market_digests SET email_sent = 1 WHERE id = ?",
    args: [id],
  });
}

export async function getActiveUserLanguages(): Promise<string[]> {
  const client = await ensureInitialized();
  const res = await client.execute({
    sql: "SELECT DISTINCT language FROM user_settings WHERE language IS NOT NULL AND language != ''",
    args: [],
  });
  const langs = res.rows.map((r) => str((r as unknown as Record<string, unknown>).language)).filter(Boolean);
  if (!langs.includes("en")) langs.unshift("en");
  return langs;
}

export async function getUsersForDigestEmail(): Promise<
  { id: string; email: string; displayName: string; language: string; defaultPortfolioId: string }[]
> {
  const client = await ensureInitialized();
  const res = await client.execute({
    sql: `SELECT u.id, u.email, u.display_name,
            COALESCE((SELECT us.language FROM user_settings us WHERE us.user_id = u.id), 'en') AS language,
            COALESCE(
              (SELECT p.id FROM portfolios p WHERE p.user_id = u.id AND p.is_default = 1 LIMIT 1),
              (SELECT p.id FROM portfolios p WHERE p.user_id = u.id ORDER BY p.created_at ASC LIMIT 1),
              ''
            ) AS default_portfolio_id
          FROM users u
          WHERE u.email != ''
            AND u.email_verified = 1`,
    args: [],
  });
  return res.rows.map((r) => ({
    id: str((r as unknown as Record<string, unknown>).id),
    email: str((r as unknown as Record<string, unknown>).email),
    displayName: str((r as unknown as Record<string, unknown>).display_name),
    language: str((r as unknown as Record<string, unknown>).language) || "en",
    defaultPortfolioId: str((r as unknown as Record<string, unknown>).default_portfolio_id),
  }));
}

export async function getDigestTranslation(
  digestId: string,
  language: string,
): Promise<DigestTranslation | null> {
  const client = await ensureInitialized();
  const res = await client.execute({
    sql: "SELECT * FROM market_digest_translations WHERE digest_id = ? AND language = ? LIMIT 1",
    args: [digestId, language],
  });
  if (res.rows.length === 0) return null;
  return rowToTranslation(res.rows[0] as unknown as Record<string, unknown>);
}
