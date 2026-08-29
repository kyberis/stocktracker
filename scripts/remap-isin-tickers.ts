#!/usr/bin/env npx tsx
/**
 * Remap holdings (and matching txs) where ticker is an ISIN or ISIN.VENUE
 * into a Yahoo-quotable symbol. Moves the ISIN into the `isin` column.
 *
 * Usage:
 *   npx tsx scripts/remap-isin-tickers.ts                  # dry-run all priority users
 *   npx tsx scripts/remap-isin-tickers.ts --apply          # write
 *   npx tsx scripts/remap-isin-tickers.ts --user fjgronda  # one username
 *   npx tsx scripts/remap-isin-tickers.ts --all            # every user with ISIN tickers
 *   npx tsx scripts/remap-isin-tickers.ts --all --p2       # also close worthless rights/CVRs
 *
 * Reads Turso from `.env.production.local` (stocktracker_TURSO_*).
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient, type Client } from "@libsql/client";
import YahooFinance from "yahoo-finance2";

import { looksLikeIsin } from "../src/lib/isin";
import { KNOWN_ISINS } from "../src/lib/known-isins";

function loadDotEnv(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const raw = readFileSync(resolve(path), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z][A-Za-z0-9_]*)=(.*)$/);
      if (!m) continue;
      let val = m[2];
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      out[m[1]] = val;
    }
  } catch {
    // ignore
  }
  return out;
}

const PRIORITY_USERNAMES = [
  "stefanie_daene",
  "fjgronda",
  "pedro.gavafibra",
  "cerdoeveriwhere",
  "lpbartivas",
  "masque2204",
  "julien.adam.pro",
  "mjkorenhof",
  "filhuiberts",
  "filipkochan4",
  "thimo.decoene",
  "hgzg2qgvaz",
  "info",
  "suarez84welcome2",
];

/** Known ISINs that may remap even when Yahoo has no live quote (OTC / thin). */
const ALLOW_UNQUOTED = new Set(["CA07380N1042"]);

type PlanAction = "remap" | "close";

const YAHOO_EXCHANGE_MAP: Record<string, string> = {
  NMS: "NASDAQ",
  NGM: "NASDAQ",
  NCM: "NASDAQ",
  NYQ: "NYSE",
  PCX: "NYSE",
  BTS: "NYSE",
  GER: "XET",
  MCE: "MAD",
  EBS: "SWX",
  LSE: "LSE",
  AMS: "AMS",
  PAR: "PAR",
  BRU: "BRU",
  MIL: "MIL",
  TOR: "TSE",
  VAN: "VAN",
};

const SUFFIX_TO_EXCHANGE: Record<string, string> = {
  L: "LSE",
  DE: "XET",
  F: "FRA",
  AS: "AMS",
  PA: "PAR",
  MC: "MAD",
  BR: "BRU",
  MI: "MIL",
  CO: "OMK",
  HE: "HEL",
  ST: "STO",
  OL: "OSL",
  VI: "VIE",
  SW: "SWX",
  TO: "TSE",
  V: "VAN",
  HK: "HKG",
  T: "TSE",
  SG: "STU",
};

type Plan = {
  username: string;
  email: string;
  userId: string;
  holdingId: string;
  oldTicker: string;
  newTicker: string;
  isin: string;
  oldExchange: string;
  newExchange: string;
  name: string;
  shares: number;
  purchasePrice: number;
  displayCurrency: string;
  oldValueInEur: number;
  newValueInEur: number | null;
  quotePrice: number | null;
  quoteCurrency: string | null;
  source: "known" | "yahoo" | "openfigi" | "unresolved";
  txCount: number;
  skipReason?: string;
  action?: PlanAction;
};

function extractIsinFromTicker(ticker: string): { isin: string; suffix: string } | null {
  const raw = ticker.trim().toUpperCase();
  if (!raw) return null;
  if (looksLikeIsin(raw)) return { isin: raw, suffix: "" };
  const m = raw.match(/^([A-Z]{2}[A-Z0-9]{9}\d)\.([A-Z]{1,4})$/);
  if (m && looksLikeIsin(m[1])) return { isin: m[1], suffix: m[2] };
  return null;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isinLikeSymbol(symbol: string, isin: string): boolean {
  const s = symbol.toUpperCase();
  const i = isin.toUpperCase();
  return s === i || s.startsWith(`${i}.`);
}

async function openFigiResolve(isin: string): Promise<string | null> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const key = process.env.OPENFIGI_API_KEY;
  if (key) headers["X-OPENFIGI-APIKEY"] = key;
  try {
    const res = await fetch("https://api.openfigi.com/v3/mapping", {
      method: "POST",
      headers,
      body: JSON.stringify([{ idType: "ID_ISIN", idValue: isin }]),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{
      data?: Array<{ ticker?: string; exchCode?: string; marketSector?: string }>;
    }>;
    const rows =
      data[0]?.data?.filter(
        (d) =>
          d.ticker &&
          (d.marketSector === "Equity" ||
            d.marketSector === "Govt" ||
            String((d as { securityType?: string }).securityType || "").includes("ETP") ||
            String((d as { securityType2?: string }).securityType2 || "").includes("Fund")),
      ) ?? [];
    if (rows.length === 0) return null;
    const EXCH: Record<string, string> = {
      US: "",
      UW: "",
      UN: "",
      UA: "",
      GR: ".DE",
      LN: ".L",
      NA: ".AS",
      BB: ".BR",
      FP: ".PA",
      SM: ".MC",
      IM: ".MI",
      CT: ".TO",
      HK: ".HK",
    };
    const best = rows[0];
    const suffix = EXCH[best.exchCode || ""] ?? "";
    return suffix ? `${best.ticker}${suffix}` : String(best.ticker);
  } catch {
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const allUsers = args.includes("--all");
  const p2 = args.includes("--p2");
  const userIdx = args.indexOf("--user");
  const filterUser = userIdx >= 0 ? args[userIdx + 1] : undefined;

  const env = {
    ...loadDotEnv(".env.production.local"),
    ...loadDotEnv(".env.local"),
  };
  const url =
    process.env.stocktracker_TURSO_DATABASE_URL ||
    process.env.TREFOLIO_TURSO_DATABASE_URL ||
    env.stocktracker_TURSO_DATABASE_URL ||
    env.TREFOLIO_TURSO_DATABASE_URL;
  const token =
    process.env.stocktracker_TURSO_AUTH_TOKEN ||
    process.env.TREFOLIO_TURSO_AUTH_TOKEN ||
    env.stocktracker_TURSO_AUTH_TOKEN ||
    env.TREFOLIO_TURSO_AUTH_TOKEN;
  if (!url || !token) {
    console.error("Missing Turso credentials");
    process.exit(1);
  }

  const client = createClient({ url, authToken: token });
  const yahoo = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

  console.log(`mode=${apply ? "APPLY" : "DRY-RUN"} all=${allUsers} p2=${p2} user=${filterUser || "-"}`);

  let usernames = PRIORITY_USERNAMES;
  if (filterUser) usernames = [filterUser];
  if (allUsers) {
    const all = await client.execute({
      sql: `SELECT DISTINCT u.username
            FROM holdings h
            JOIN users u ON u.id = h.user_id
            WHERE h.shares > 0
            ORDER BY u.username`,
      args: [],
    });
    usernames = all.rows.map((r) => String(r.username));
  }

  const plans: Plan[] = [];
  const unresolved: Plan[] = [];
  const quoteCache = new Map<string, { price: number; currency: string; exchange: string } | null>();
  const resolveCache = new Map<string, { symbol: string; source: Plan["source"] } | null>();

  async function getQuote(symbol: string) {
    if (quoteCache.has(symbol)) return quoteCache.get(symbol)!;
    try {
      const q = (await yahoo.quote(symbol)) as Record<string, unknown>;
      const price = Number(q.regularMarketPrice || 0);
      if (!(price > 0)) {
        quoteCache.set(symbol, null);
        return null;
      }
      const rawEx = String(q.exchange || q.fullExchangeName || "");
      const exchange = YAHOO_EXCHANGE_MAP[rawEx.toUpperCase()] || rawEx.toUpperCase();
      const currency = String(q.currency || "USD").toUpperCase();
      const result = { price, currency: currency === "GBp" ? "GBX" : currency, exchange };
      quoteCache.set(symbol, result);
      return result;
    } catch {
      quoteCache.set(symbol, null);
      return null;
    }
  }

  async function resolveSymbol(isin: string, preferredSuffix: string): Promise<{
    symbol: string;
    source: Plan["source"];
  } | null> {
    const cacheKey = `${isin}|${preferredSuffix}`;
    if (resolveCache.has(cacheKey)) return resolveCache.get(cacheKey)!;

    if (KNOWN_ISINS[isin]) {
      const symbol = KNOWN_ISINS[isin];
      const q = await getQuote(symbol);
      if (q) {
        const out = { symbol, source: "known" as const };
        resolveCache.set(cacheKey, out);
        return out;
      }
      if (ALLOW_UNQUOTED.has(isin)) {
        const out = { symbol, source: "known" as const };
        resolveCache.set(cacheKey, out);
        return out;
      }
    }

    try {
      const search = (await yahoo.search(isin, { quotesCount: 10 }, { validateResult: false })) as {
        quotes?: Array<{ symbol?: string; quoteType?: string; exchange?: string }>;
      };
      const candidates = (search.quotes || [])
        .filter((q) => q.symbol && ["EQUITY", "ETF", "MUTUALFUND"].includes(String(q.quoteType || "")))
        .map((q) => String(q.symbol));

      const ranked = [
        ...candidates.filter((s) => preferredSuffix && s.toUpperCase().endsWith(`.${preferredSuffix}`)),
        ...candidates.filter((s) => !isinLikeSymbol(s, isin)),
        ...candidates,
      ];
      const seen = new Set<string>();
      for (const sym of ranked) {
        const upper = sym.toUpperCase();
        if (seen.has(upper)) continue;
        seen.add(upper);
        const q = await getQuote(sym);
        if (q) {
          const out = { symbol: sym, source: "yahoo" as const };
          resolveCache.set(cacheKey, out);
          return out;
        }
        await sleep(80);
      }
    } catch {
      // fall through
    }

    const figi = await openFigiResolve(isin);
    if (figi) {
      const q = await getQuote(figi);
      if (q) {
        const out = { symbol: figi, source: "openfigi" as const };
        resolveCache.set(cacheKey, out);
        return out;
      }
    }

    resolveCache.set(cacheKey, null);
    return null;
  }

  async function fxToEur(
    amount: number,
    currency: string,
    _symbol: string,
  ): Promise<number | null> {
    const cur = currency.toUpperCase() === "GBp" ? "GBX" : currency.toUpperCase();
    if (cur === "EUR") return amount;
    if (cur === "GBX") {
      try {
        const q = (await yahoo.quote("EURGBP=X")) as { regularMarketPrice?: number };
        const rate = Number(q.regularMarketPrice || 0);
        if (!(rate > 0)) return null;
        return amount / 100 / rate;
      } catch {
        return null;
      }
    }
    if (cur === "GBP") {
      try {
        const q = (await yahoo.quote("EURGBP=X")) as { regularMarketPrice?: number };
        const rate = Number(q.regularMarketPrice || 0);
        if (!(rate > 0)) return null;
        return amount / rate;
      } catch {
        return null;
      }
    }
    try {
      const q = (await yahoo.quote(`EUR${cur}=X`)) as { regularMarketPrice?: number };
      const rate = Number(q.regularMarketPrice || 0);
      if (!(rate > 0)) return null;
      return amount / rate;
    } catch {
      return null;
    }
  }

  function normalizeQuoteCurrency(symbol: string, price: number, currency: string): {
    price: number;
    currency: string;
  } {
    const cur = currency.toUpperCase() === "GBp" ? "GBX" : currency.toUpperCase();
    // LSE: prices ≥ 50 with currency GBP are almost always pence mislabeled as pounds.
    if (/\.L$/i.test(symbol) && cur === "GBP" && price >= 50) {
      return { price, currency: "GBX" };
    }
    return { price, currency: cur };
  }

  for (const username of usernames) {
    const userRes = await client.execute({
      sql: `SELECT id, username, email FROM users WHERE username = ?`,
      args: [username],
    });
    if (!userRes.rows[0]) {
      console.log(JSON.stringify({ username, error: "user_not_found" }));
      continue;
    }
    const userId = String(userRes.rows[0].id);
    const email = String(userRes.rows[0].email || "");

    const holdings = await client.execute({
      sql: `SELECT id, ticker, name, isin, exchange, shares, purchase_price, display_currency, value_in_eur, asset_type
            FROM holdings WHERE user_id = ? AND shares > 0`,
      args: [userId],
    });

    for (const row of holdings.rows) {
      const oldTicker = String(row.ticker || "");
      const parsed = extractIsinFromTicker(oldTicker);
      if (!parsed) continue;

      const name = String(row.name || "");
      const valueEur = Number(row.value_in_eur) || 0;
      const isRightsOrCvr =
        /DERECHO|RIGHT|CVR|WARRANT/i.test(name) || /CVR/i.test(oldTicker);
      const isGovtBond = /REPUBLIC OF|GOVERNMENT|BUONI POLIENNALI|BTP\b/i.test(name);
      const isStructuredXs = parsed.isin.startsWith("XS") && !KNOWN_ISINS[parsed.isin];

      // P2: close worthless rights / CVRs only (never large face-value bonds with blank marks).
      if (p2 && isRightsOrCvr && valueEur <= 0.5) {
        plans.push({
          username,
          email,
          userId,
          holdingId: String(row.id),
          oldTicker,
          newTicker: oldTicker,
          isin: parsed.isin,
          oldExchange: String(row.exchange || ""),
          newExchange: String(row.exchange || ""),
          name,
          shares: Number(row.shares),
          purchasePrice: Number(row.purchase_price),
          displayCurrency: String(row.display_currency || ""),
          oldValueInEur: valueEur,
          newValueInEur: 0,
          quotePrice: null,
          quoteCurrency: null,
          source: "unresolved",
          txCount: 0,
          skipReason: "close_worthless",
          action: "close",
        });
        continue;
      }

      // Skip cash / rights / unstructured XS / gov bonds that are not in the known map
      if (isRightsOrCvr || isStructuredXs || (isGovtBond && !KNOWN_ISINS[parsed.isin])) {
        unresolved.push({
          username,
          email,
          userId,
          holdingId: String(row.id),
          oldTicker,
          newTicker: oldTicker,
          isin: parsed.isin,
          oldExchange: String(row.exchange || ""),
          newExchange: String(row.exchange || ""),
          name,
          shares: Number(row.shares),
          purchasePrice: Number(row.purchase_price),
          displayCurrency: String(row.display_currency || ""),
          oldValueInEur: valueEur,
          newValueInEur: null,
          quotePrice: null,
          quoteCurrency: null,
          source: "unresolved",
          txCount: 0,
          skipReason: isGovtBond ? "govt_bond_skip" : "rights_or_bond_skip",
        });
        continue;
      }

      const resolved = await resolveSymbol(parsed.isin, parsed.suffix);
      await sleep(120);

      const txCountRes = await client.execute({
        sql: `SELECT COUNT(*) as c FROM transactions WHERE user_id = ? AND UPPER(ticker) = UPPER(?)`,
        args: [userId, oldTicker],
      });
      const txCount = Number(txCountRes.rows[0]?.c || 0);

      if (!resolved) {
        unresolved.push({
          username,
          email,
          userId,
          holdingId: String(row.id),
          oldTicker,
          newTicker: oldTicker,
          isin: parsed.isin,
          oldExchange: String(row.exchange || ""),
          newExchange: String(row.exchange || ""),
          name,
          shares: Number(row.shares),
          purchasePrice: Number(row.purchase_price),
          displayCurrency: String(row.display_currency || ""),
          oldValueInEur: Number(row.value_in_eur),
          newValueInEur: null,
          quotePrice: null,
          quoteCurrency: null,
          source: "unresolved",
          txCount,
          skipReason: "no_quotable_symbol",
        });
        continue;
      }

      const quoteFetched = await getQuote(resolved.symbol);
      const quoteRaw = quoteFetched ? { ...quoteFetched } : null;

      let newValueInEur: number | null = null;
      let valueSkipped = false;
      if (quoteRaw) {
        const old = Number(row.value_in_eur);
        const shares = Number(row.shares);
        const candidates: Array<{ price: number; currency: string; eur: number }> = [];

        const pushCandidate = async (price: number, currency: string) => {
          const eur = await fxToEur(shares * price, currency, resolved.symbol);
          if (eur != null && eur > 0) candidates.push({ price, currency, eur });
        };

        const baseCur =
          quoteRaw.currency.toUpperCase() === "GBp" ? "GBX" : quoteRaw.currency.toUpperCase();
        await pushCandidate(quoteRaw.price, baseCur);

        // Ambiguous LSE quotes: Yahoo often returns pence mislabeled as GBP/USD.
        if (/\.L$/i.test(resolved.symbol) && quoteRaw.price >= 50) {
          await pushCandidate(quoteRaw.price, "GBP");
          await pushCandidate(quoteRaw.price, "GBX");
          await pushCandidate(quoteRaw.price, "USD");
        }

        let best = candidates[0] ?? null;
        if (old > 0 && candidates.length > 1) {
          best = candidates.reduce((a, b) =>
            Math.abs(a.eur - old) <= Math.abs(b.eur - old) ? a : b,
          );
        }

        if (best) {
          if (old <= 0 || (best.eur / old >= 0.33 && best.eur / old <= 3) || old <= 50) {
            newValueInEur = best.eur;
          } else {
            valueSkipped = true;
          }
          quoteRaw.price = best.price;
          quoteRaw.currency = best.currency;
        }
      }

      const quote = quoteRaw;
      const suffix = resolved.symbol.includes(".")
        ? resolved.symbol.split(".").pop()!.toUpperCase()
        : "";
      const newExchange =
        (quote?.exchange && quote.exchange.length <= 8 ? quote.exchange : "") ||
        SUFFIX_TO_EXCHANGE[suffix] ||
        String(row.exchange || "");

      plans.push({
        username,
        email,
        userId,
        holdingId: String(row.id),
        oldTicker,
        newTicker: resolved.symbol,
        isin: parsed.isin,
        oldExchange: String(row.exchange || ""),
        newExchange,
        name,
        shares: Number(row.shares),
        purchasePrice: Number(row.purchase_price),
        displayCurrency: String(row.display_currency || ""),
        oldValueInEur: Number(row.value_in_eur),
        newValueInEur,
        quotePrice: quote?.price ?? null,
        quoteCurrency: quote?.currency ?? null,
        source: resolved.source,
        txCount,
        skipReason: valueSkipped ? "value_guard_keep_old_eur" : undefined,
        action: "remap",
      });
    }
  }

  console.log("\n=== REMAP PLANS ===");
  const remaps = plans.filter((p) => p.action !== "close");
  const closes = plans.filter((p) => p.action === "close");
  console.log(`resolvable=${remaps.length} close=${closes.length} unresolved=${unresolved.length}`);
  for (const p of remaps) {
    console.log(
      JSON.stringify({
        user: p.username,
        from: p.oldTicker,
        to: p.newTicker,
        isin: p.isin,
        exchange: `${p.oldExchange || "∅"}→${p.newExchange || "∅"}`,
        source: p.source,
        quote: p.quotePrice,
        ccy: p.quoteCurrency,
        valueEur: p.oldValueInEur,
        newValueEur: p.newValueInEur != null ? Math.round(p.newValueInEur) : null,
        txs: p.txCount,
        note: p.skipReason,
      }),
    );
  }
  if (closes.length > 0) {
    console.log("\n=== CLOSE WORTHLESS ===");
    for (const p of closes) {
      console.log(
        JSON.stringify({
          user: p.username,
          ticker: p.oldTicker,
          isin: p.isin,
          name: p.name,
          shares: p.shares,
          valueEur: p.oldValueInEur,
          action: "close",
        }),
      );
    }
  }

  console.log("\n=== UNRESOLVED / SKIPPED ===");
  for (const p of unresolved) {
    console.log(
      JSON.stringify({
        user: p.username,
        ticker: p.oldTicker,
        isin: p.isin,
        name: p.name,
        reason: p.skipReason,
        valueEur: p.oldValueInEur,
      }),
    );
  }

  if (apply && plans.length > 0) {
    console.log("\n=== APPLYING ===");
    for (const p of plans) {
      await applyPlan(client, p);
      console.log(
        JSON.stringify({
          applied: true,
          action: p.action || "remap",
          user: p.username,
          from: p.oldTicker,
          to: p.newTicker,
        }),
      );
    }
  }

  const bySource = remaps.reduce(
    (acc, p) => {
      acc[p.source] = (acc[p.source] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  console.log("\n=== SUMMARY ===");
  console.log(
    JSON.stringify({
      resolvable: remaps.length,
      closed: closes.length,
      unresolved: unresolved.length,
      bySource,
    }),
  );

  client.close();
}

async function applyPlan(client: Client, p: Plan) {
  const existingIsin = await client.execute({
    sql: `SELECT isin FROM holdings WHERE id = ? AND user_id = ?`,
    args: [p.holdingId, p.userId],
  });
  const isinToStore =
    String(existingIsin.rows[0]?.isin || "").trim() || p.isin;

  if (p.action === "close") {
    await client.execute({
      sql: `UPDATE holdings
            SET shares = 0, isin = ?, value_in_eur = 0
            WHERE id = ? AND user_id = ?`,
      args: [isinToStore, p.holdingId, p.userId],
    });
    return;
  }

  await client.execute({
    sql: `UPDATE holdings
          SET ticker = ?, exchange = ?, isin = ?, value_in_eur = COALESCE(?, value_in_eur)
          WHERE id = ? AND user_id = ?`,
    args: [
      p.newTicker,
      p.newExchange,
      isinToStore,
      p.newValueInEur,
      p.holdingId,
      p.userId,
    ],
  });

  if (p.txCount > 0) {
    await client.execute({
      sql: `UPDATE transactions
            SET ticker = ?, exchange = CASE WHEN TRIM(COALESCE(exchange,'')) = '' THEN ? ELSE exchange END
            WHERE user_id = ? AND UPPER(ticker) = UPPER(?)`,
      args: [p.newTicker, p.newExchange, p.userId, p.oldTicker],
    });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
