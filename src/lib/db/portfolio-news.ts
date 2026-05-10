import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import type { NewsArticle } from "@/lib/api-providers/types";

export function normalizePortfolioNewsSymbol(ticker: string): string {
  const base = ticker.includes(".") ? (ticker.split(".")[0] ?? ticker) : ticker;
  return base.toUpperCase().trim();
}

function rowToNewsArticle(
  row: Record<string, unknown>,
  symbolCsv: string | null,
): NewsArticle {
  let extra: {
    tickerSentiment?: NewsArticle["tickerSentiment"];
    topics?: string[];
    overallSentiment?: string;
    overallSentimentScore?: number;
  } = {};
  try {
    extra = JSON.parse(String(row.extra_json ?? "{}")) as typeof extra;
  } catch {
    extra = {};
  }

  let tickerSentiment = extra.tickerSentiment ?? [];
  if (tickerSentiment.length === 0 && symbolCsv) {
    const syms = symbolCsv.split(",").filter(Boolean);
    tickerSentiment = syms.map((t) => ({
      ticker: t,
      relevance: 1,
      sentimentScore: 0,
      sentimentLabel: "",
    }));
  }

  return {
    title: String(row.title ?? ""),
    url: String(row.url ?? ""),
    source: String(row.source ?? ""),
    publishedAt: String(row.published_at ?? ""),
    summary: String(row.summary ?? ""),
    overallSentiment: extra.overallSentiment ?? "",
    overallSentimentScore: extra.overallSentimentScore ?? 0,
    tickerSentiment,
    topics: extra.topics ?? [],
  };
}

export async function ingestNewsArticles(articles: NewsArticle[]): Promise<void> {
  if (articles.length === 0) return;
  const client = await ensureInitialized();

  for (const article of articles) {
    const url = article.url?.trim();
    if (!url) continue;

    const symbols = new Set<string>();
    for (const ts of article.tickerSentiment) {
      const s = normalizePortfolioNewsSymbol(ts.ticker);
      if (s) symbols.add(s);
    }

    const extraJson = JSON.stringify({
      tickerSentiment: article.tickerSentiment,
      topics: article.topics,
      overallSentiment: article.overallSentiment,
      overallSentimentScore: article.overallSentimentScore,
    });

    const newId = randomUUID() as string;
    const ins = await client.execute({
      sql: `INSERT OR IGNORE INTO portfolio_news_articles
            (id, url, title, summary, source, published_at, ingested_at, extra_json)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)`,
      args: [
        newId,
        url,
        article.title,
        article.summary,
        article.source,
        article.publishedAt,
        extraJson,
      ],
    });

    let articleId: string = newId;
    if ((ins.rowsAffected ?? 0) === 0) {
      const found = await client.execute({
        sql: `SELECT id FROM portfolio_news_articles WHERE url = ? LIMIT 1`,
        args: [url],
      });
      const existing = found.rows[0]?.id;
      if (!existing) continue;
      articleId = String(existing);
    }

    for (const sym of symbols) {
      await client.execute({
        sql: `INSERT OR IGNORE INTO portfolio_news_article_symbols (article_id, symbol) VALUES (?, ?)`,
        args: [articleId, sym],
      });
    }
  }
}

export async function listPortfolioNewsForTickers(
  tickers: string[],
  limit: number,
): Promise<NewsArticle[]> {
  if (tickers.length === 0) return [];
  const client = await ensureInitialized();
  const norm = [...new Set(tickers.map(normalizePortfolioNewsSymbol))].filter(Boolean);
  if (norm.length === 0) return [];

  const placeholders = norm.map(() => "?").join(",");
  const res = await client.execute({
    sql: `SELECT a.id, a.url, a.title, a.summary, a.source, a.published_at, a.extra_json,
                 GROUP_CONCAT(DISTINCT s.symbol) AS symbols
          FROM portfolio_news_articles a
          INNER JOIN portfolio_news_article_symbols s ON s.article_id = a.id
          WHERE s.symbol IN (${placeholders})
          GROUP BY a.id
          ORDER BY a.published_at DESC
          LIMIT ?`,
    args: [...norm, Math.min(limit, 500)],
  });

  const out: NewsArticle[] = [];
  for (const row of res.rows) {
    const r = row as unknown as Record<string, unknown>;
    out.push(
      rowToNewsArticle(
        r,
        r.symbols != null ? String(r.symbols) : null,
      ),
    );
  }
  return out;
}

export async function listSymbolsNeedingProviderFetch(
  tickers: string[],
  staleMs: number,
): Promise<string[]> {
  if (tickers.length === 0) return [];
  const client = await ensureInitialized();
  const norm = [...new Set(tickers.map(normalizePortfolioNewsSymbol))].filter(Boolean);
  const need: string[] = [];
  const now = Date.now();

  for (const sym of norm) {
    const countRes = await client.execute({
      sql: `SELECT COUNT(*) AS c FROM portfolio_news_article_symbols WHERE symbol = ?`,
      args: [sym],
    });
    const count = Number(countRes.rows[0]?.c ?? 0);
    if (count === 0) {
      need.push(sym);
      continue;
    }

    const metaRes = await client.execute({
      sql: `SELECT last_fetched_at FROM portfolio_news_symbol_fetch_meta WHERE symbol = ?`,
      args: [sym],
    });
    const last = metaRes.rows[0]?.last_fetched_at;
    const lastStr = last != null ? String(last) : "";
    if (!lastStr) {
      need.push(sym);
      continue;
    }
    const t = new Date(lastStr).getTime();
    if (Number.isNaN(t) || now - t > staleMs) {
      need.push(sym);
    }
  }

  return [...new Set(need)];
}

export async function touchSymbolFetchMeta(symbols: string[]): Promise<void> {
  if (symbols.length === 0) return;
  const client = await ensureInitialized();
  const uniq = [...new Set(symbols.map(normalizePortfolioNewsSymbol))].filter(Boolean);
  for (const sym of uniq) {
    await client.execute({
      sql: `INSERT INTO portfolio_news_symbol_fetch_meta (symbol, last_fetched_at)
            VALUES (?, datetime('now'))
            ON CONFLICT(symbol) DO UPDATE SET last_fetched_at = excluded.last_fetched_at`,
      args: [sym],
    });
  }
}
