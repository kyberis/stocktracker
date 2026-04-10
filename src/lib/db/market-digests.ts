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
  xScheduledPostId: string;
  digestDate: string;
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

export interface MarketDigestSource {
  id: string;
  digestId: string;
  gmailMessageId: string;
  sender: string;
  originalSubject: string;
  originalDate: string;
  receivedAt: string;
  rawText: string;
  rawHtml: string;
  extractedLinks: { url: string; text: string }[];
  createdAt: string;
}

export interface MarketDigestWithTranslations extends MarketDigest {
  translations: DigestTranslation[];
  sources: MarketDigestSource[];
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
    xScheduledPostId: str(r.x_scheduled_post_id),
    digestDate: str(r.digest_date),
    createdAt: str(r.created_at),
  };
}

function rowToSource(r: Record<string, unknown>): MarketDigestSource {
  let links: { url: string; text: string }[] = [];
  try {
    links = JSON.parse(str(r.extracted_links));
  } catch { /* empty */ }
  return {
    id: str(r.id),
    digestId: str(r.digest_id),
    gmailMessageId: str(r.gmail_message_id),
    sender: str(r.sender),
    originalSubject: str(r.original_subject),
    originalDate: str(r.original_date),
    receivedAt: str(r.received_at),
    rawText: str(r.raw_text),
    rawHtml: str(r.raw_html),
    extractedLinks: links,
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

export async function digestSourceExistsByGmailId(gmailMessageId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const res = await client.execute({
    sql: "SELECT 1 FROM market_digest_sources WHERE gmail_message_id = ? LIMIT 1",
    args: [gmailMessageId],
  });
  return res.rows.length > 0;
}

export async function getDigestByDate(digestDate: string): Promise<MarketDigest | null> {
  const client = await ensureInitialized();
  const res = await client.execute({
    sql: "SELECT * FROM market_digests WHERE digest_date = ? LIMIT 1",
    args: [digestDate],
  });
  if (res.rows.length === 0) return null;
  return rowToDigest(res.rows[0] as unknown as Record<string, unknown>);
}

export async function addDigestSource(digestId: string, source: {
  gmailMessageId: string;
  sender: string;
  originalSubject: string;
  originalDate: string;
  receivedAt: string;
  rawText: string;
  rawHtml: string;
  extractedLinks: { url: string; text: string }[];
}): Promise<string> {
  const client = await ensureInitialized();
  const id = randomUUID();
  await client.execute({
    sql: `INSERT OR IGNORE INTO market_digest_sources
      (id, digest_id, gmail_message_id, sender, original_subject, original_date, received_at, raw_text, raw_html, extracted_links)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      digestId,
      source.gmailMessageId,
      source.sender,
      source.originalSubject,
      source.originalDate,
      source.receivedAt,
      source.rawText,
      source.rawHtml,
      JSON.stringify(source.extractedLinks),
    ],
  });
  return id;
}

export async function getDigestSources(digestId: string): Promise<MarketDigestSource[]> {
  const client = await ensureInitialized();
  const res = await client.execute({
    sql: "SELECT * FROM market_digest_sources WHERE digest_id = ? ORDER BY original_date, created_at",
    args: [digestId],
  });
  return res.rows.map((r) => rowToSource(r as unknown as Record<string, unknown>));
}

export async function updateDigestContent(digestId: string, data: {
  mentionedTickers: string[];
  sectors: string[];
  sentiment: string;
  aiModel: string;
  tokensUsed: number;
  translations: { language: string; title: string; summary: string; keyPoints: string[] }[];
}): Promise<void> {
  const client = await ensureInitialized();

  await client.execute({
    sql: `UPDATE market_digests
      SET mentioned_tickers = ?, sectors = ?, sentiment = ?, ai_model = ?, tokens_used = ?
      WHERE id = ?`,
    args: [
      JSON.stringify(data.mentionedTickers),
      JSON.stringify(data.sectors),
      data.sentiment,
      data.aiModel,
      data.tokensUsed,
      digestId,
    ],
  });

  for (const t of data.translations) {
    const existing = await client.execute({
      sql: "SELECT id FROM market_digest_translations WHERE digest_id = ? AND language = ?",
      args: [digestId, t.language],
    });
    if (existing.rows.length > 0) {
      await client.execute({
        sql: "UPDATE market_digest_translations SET title = ?, summary = ?, key_points = ? WHERE id = ?",
        args: [t.title, t.summary, JSON.stringify(t.keyPoints), str((existing.rows[0] as unknown as Record<string, unknown>).id)],
      });
    } else {
      await client.execute({
        sql: `INSERT INTO market_digest_translations (id, digest_id, language, title, summary, key_points)
          VALUES (?, ?, ?, ?, ?, ?)`,
        args: [randomUUID(), digestId, t.language, t.title, t.summary, JSON.stringify(t.keyPoints)],
      });
    }
  }
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
  digestDate?: string;
  translations: { language: string; title: string; summary: string; keyPoints: string[] }[];
}): Promise<string> {
  const client = await ensureInitialized();
  const digestId = randomUUID();

  await client.execute({
    sql: `INSERT OR IGNORE INTO market_digests
      (id, gmail_message_id, sender, original_subject, received_at, raw_text, raw_html,
       mentioned_tickers, sectors, sentiment, ai_model, tokens_used, status, digest_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
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
      data.digestDate ?? "",
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

export interface MarketDigestListItem extends MarketDigest {
  sourceCount: number;
  sourceDomains: string[];
}

export async function listMarketDigests(opts: {
  status?: DigestStatus;
  limit?: number;
  offset?: number;
}): Promise<MarketDigestListItem[]> {
  const client = await ensureInitialized();
  const conditions: string[] = [];
  const args: InValue[] = [];

  if (opts.status) {
    conditions.push("d.status = ?");
    args.push(opts.status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;

  const res = await client.execute({
    sql: `SELECT d.*,
            COALESCE((SELECT COUNT(*) FROM market_digest_sources s WHERE s.digest_id = d.id), 0) AS source_count,
            COALESCE((SELECT GROUP_CONCAT(DISTINCT s.sender) FROM market_digest_sources s WHERE s.digest_id = d.id), '') AS source_senders
          FROM market_digests d ${where}
          ORDER BY d.received_at DESC LIMIT ? OFFSET ?`,
    args: [...args, limit, offset],
  });

  return res.rows.map((r) => {
    const row = r as unknown as Record<string, unknown>;
    const digest = rowToDigest(row);
    const senders = str(row.source_senders).split(",").filter(Boolean);
    const domains = [...new Set(senders.map(extractDomain).filter(Boolean))];
    return {
      ...digest,
      sourceCount: num(row.source_count),
      sourceDomains: domains,
    };
  });
}

function extractDomain(sender: string): string {
  const emailMatch = sender.match(/@([\w.-]+)/);
  if (emailMatch) return emailMatch[1];
  const trimmed = sender.trim().toLowerCase();
  if (trimmed.includes(".")) return trimmed;
  return sender.trim();
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

  const sourceRes = await client.execute({
    sql: "SELECT * FROM market_digest_sources WHERE digest_id = ? ORDER BY original_date, created_at",
    args: [id],
  });

  const sources = sourceRes.rows.map((r) =>
    rowToSource(r as unknown as Record<string, unknown>),
  );

  return { ...digest, translations, sources };
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
            AND u.email_verified = 1
            AND NOT EXISTS (
              SELECT 1 FROM user_settings us
              WHERE us.user_id = u.id AND us.email_notifications_enabled = 0
            )`,
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

export async function markDigestXScheduled(digestId: string, xPostId: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE market_digests SET x_scheduled_post_id = ? WHERE id = ?",
    args: [xPostId, digestId],
  });
}
