import { Snaptrade } from "snaptrade-typescript-sdk";
import type { AccountHoldings, Position, UniversalActivity } from "snaptrade-typescript-sdk";
import type { ExtractedTransaction, ExtractedHolding, CashBalance } from "@/hooks/import-types";

let _client: Snaptrade | null = null;

function getClient(): Snaptrade {
  if (_client) return _client;
  const clientId = process.env.SNAPTRADE_CLIENT_ID;
  const consumerKey = process.env.SNAPTRADE_CONSUMER_KEY;
  if (!clientId || !consumerKey) {
    throw new SnapTradeClientError("SnapTrade credentials not configured. Set SNAPTRADE_CLIENT_ID and SNAPTRADE_CONSUMER_KEY.");
  }
  _client = new Snaptrade({ clientId, consumerKey });
  return _client;
}

export class SnapTradeClientError extends Error {
  constructor(message: string, public readonly statusCode?: number) {
    super(message);
    this.name = "SnapTradeClientError";
  }
}

export async function registerUser(userId: string): Promise<{ snapTradeUserId: string; userSecret: string }> {
  const client = getClient();
  const res = await client.authentication.registerSnapTradeUser({ userId });
  const data = res.data;
  if (!data.userId || !data.userSecret) {
    throw new SnapTradeClientError("SnapTrade registration did not return userId/userSecret.");
  }
  return { snapTradeUserId: data.userId, userSecret: data.userSecret };
}

export async function deleteUser(userId: string): Promise<void> {
  const client = getClient();
  await client.authentication.deleteSnapTradeUser({ userId });
}

export async function generateConnectionPortalUrl(
  userId: string,
  userSecret: string,
  reconnectConnectionId?: string,
): Promise<{ redirectUrl: string; sessionId?: string }> {
  const client = getClient();
  const res = await client.authentication.loginSnapTradeUser({
    userId,
    userSecret,
    ...(reconnectConnectionId ? { reconnect: reconnectConnectionId } : {}),
  });
  const data = res.data as { redirectURI?: string; sessionId?: string };
  if (!data.redirectURI) {
    throw new SnapTradeClientError("SnapTrade did not return a redirect URL.");
  }
  return { redirectUrl: data.redirectURI, sessionId: data.sessionId };
}

export interface BrokerageConnectionStatus {
  id: string;
  brokerageName: string;
  disabled: boolean;
  disabledDate: string | null;
}

export async function listBrokerageConnections(
  userId: string,
  userSecret: string,
): Promise<BrokerageConnectionStatus[]> {
  const client = getClient();
  try {
    const res = await client.connections.listBrokerageAuthorizations({ userId, userSecret });
    return res.data.map((c) => ({
      id: c.id || "",
      brokerageName: c.brokerage?.name || c.name || "",
      disabled: c.disabled ?? false,
      disabledDate: c.disabled_date || null,
    }));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new SnapTradeClientError(`Failed to list brokerage connections: ${msg}`);
  }
}

/**
 * SnapTrade returns tickers with MIC exchange codes (e.g. `NOVO B.XCSE`)
 * but Yahoo Finance uses its own suffixes (e.g. `NOVO-B.CO`).
 * This map converts MIC codes to Yahoo Finance suffixes.
 */
const MIC_TO_YAHOO_SUFFIX: Record<string, string> = {
  XNAS: "",    XNYS: "",    XASE: "",    BATS: "",    ARCX: "",
  XGAT: ".DE", XETR: ".DE", XFRA: ".F",
  XLON: ".L",  XAMS: ".AS", XBRU: ".BR", XPAR: ".PA",
  XMAD: ".MC", XMIL: ".MI", XLIS: ".LS",
  XCSE: ".CO", XHEL: ".HE", XSTO: ".ST", XOSL: ".OL", XICE: ".IC",
  XSWX: ".SW", XWBO: ".VI",
  XTSE: ".TO", XTSX: ".TO", XASX: ".AX",
  XHKG: ".HK", XSES: ".SI", XTKS: ".T",
  XWAR: ".WA", XPRA: ".PR", XBUD: ".BD", XBSE: ".RO",
};

const YAHOO_SUFFIX_TO_EXCHANGE: Record<string, string> = {
  ".DE": "XET", ".F": "FRA", ".L": "LSE", ".AS": "AMS", ".BR": "EBR",
  ".PA": "EPA", ".MC": "MAD", ".MI": "MIL", ".CO": "OMK", ".HE": "HEL",
  ".ST": "STO", ".OL": "OSL", ".SW": "SWX", ".VI": "VIE",
  ".TO": "TSE", ".AX": "ASX", ".HK": "HKG",
};

/**
 * Convert a SnapTrade symbol + exchange into a Yahoo Finance-compatible ticker.
 *
 * SnapTrade may return:
 *   - `BRK.B`       (dot-separated share class, needs dash: `BRK-B`)
 *   - `NOVO B.XCSE`  (space-separated class + MIC, needs: `NOVO-B.CO`)
 *   - `W9C.XGAT`    (ticker.MIC, needs: `W9C.DE`)
 *   - `IS0E.XGAT`   (same pattern)
 *   - `AAPL`         (US ticker, no change)
 */
function normalizeSnapTradeTicker(
  rawSymbol: string,
  exchangeMic?: string,
): { ticker: string; exchange: string } {
  if (!rawSymbol) return { ticker: "", exchange: "" };

  let symbol = rawSymbol.trim();

  // Handle space-separated share class: "NOVO B.XCSE" → raw="NOVO B", mic from suffix
  const spaceIdx = symbol.indexOf(" ");
  if (spaceIdx > 0) {
    const afterSpace = symbol.slice(spaceIdx + 1);
    const dotIdx = afterSpace.indexOf(".");
    if (dotIdx > 0) {
      const shareClass = afterSpace.slice(0, dotIdx);
      const micFromSymbol = afterSpace.slice(dotIdx + 1).toUpperCase();
      const baseTicker = symbol.slice(0, spaceIdx);
      const mic = micFromSymbol || (exchangeMic || "").toUpperCase();
      const suffix = MIC_TO_YAHOO_SUFFIX[mic] ?? "";
      const yahooTicker = `${baseTicker}-${shareClass}${suffix}`;
      return {
        ticker: yahooTicker,
        exchange: YAHOO_SUFFIX_TO_EXCHANGE[suffix] || mic || "",
      };
    }
    // Space but no dot after: "NOVO B" → "NOVO-B"
    symbol = symbol.replace(/\s+/g, "-");
  }

  // Check if the suffix is a known MIC code: "W9C.XGAT" → "W9C.DE"
  const lastDot = symbol.lastIndexOf(".");
  if (lastDot > 0) {
    const beforeDot = symbol.slice(0, lastDot);
    const afterDot = symbol.slice(lastDot + 1).toUpperCase();

    if (MIC_TO_YAHOO_SUFFIX[afterDot] !== undefined) {
      const suffix = MIC_TO_YAHOO_SUFFIX[afterDot];
      const yahooTicker = `${beforeDot}${suffix}`;
      return {
        ticker: yahooTicker,
        exchange: YAHOO_SUFFIX_TO_EXCHANGE[suffix] || afterDot || "",
      };
    }

    // BRK.B → BRK-B (single-letter share class after dot, US stock)
    if (afterDot.length === 1 && /^[A-Z]$/.test(afterDot)) {
      const mic = (exchangeMic || "").toUpperCase();
      const isUS = !mic || (mic.startsWith("X") && ["XNAS", "XNYS", "XASE", "ARCX", "BATS"].includes(mic));
      if (isUS) {
        return { ticker: `${beforeDot}-${afterDot}`, exchange: "" };
      }
    }
  }

  // No MIC suffix found — try using the exchange MIC from the position metadata
  const mic = (exchangeMic || "").toUpperCase();
  if (mic && MIC_TO_YAHOO_SUFFIX[mic] !== undefined) {
    const suffix = MIC_TO_YAHOO_SUFFIX[mic];
    // Only add suffix if the symbol doesn't already have a Yahoo-style suffix
    if (!symbol.includes(".") && suffix) {
      return {
        ticker: `${symbol}${suffix}`,
        exchange: YAHOO_SUFFIX_TO_EXCHANGE[suffix] || mic || "",
      };
    }
  }

  return { ticker: symbol, exchange: YAHOO_SUFFIX_TO_EXCHANGE[`.${symbol.split(".").pop()}`] || "" };
}

function inferAssetType(description?: string | null, type?: string | null): "stock" | "etf" {
  const upper = (description || "").toUpperCase();
  if (upper.includes("ETF") || upper.includes("UCITS") || upper.includes("INDEX FUND")) return "etf";
  if (type && type.toLowerCase().includes("etf")) return "etf";
  return "stock";
}

function positionToHolding(pos: Position): ExtractedHolding | null {
  const sym = pos.symbol?.symbol;
  if (!sym) return null;
  const rawTicker = sym.symbol || "";
  if (!rawTicker) return null;

  const exchangeMic = sym.exchange?.mic_code || "";
  const { ticker, exchange } = normalizeSnapTradeTicker(rawTicker, exchangeMic);
  if (!ticker) return null;

  return {
    name: sym.description || ticker,
    ticker,
    shares: pos.units ?? 0,
    purchasePrice: pos.average_purchase_price ?? 0,
    displayCurrency: sym.currency?.code || "USD",
    exchange: exchange || sym.exchange?.code || "",
    assetType: inferAssetType(sym.description, sym.type?.code),
  };
}

function positionToTransaction(pos: Position): ExtractedTransaction | null {
  const sym = pos.symbol?.symbol;
  if (!sym) return null;
  const rawTicker = sym.symbol || "";
  if (!rawTicker) return null;

  const exchangeMic = sym.exchange?.mic_code || "";
  const { ticker } = normalizeSnapTradeTicker(rawTicker, exchangeMic);
  if (!ticker) return null;

  const shares = pos.units ?? 0;
  const price = pos.average_purchase_price ?? pos.price ?? 0;
  const currency = sym.currency?.code || "USD";

  return {
    date: new Date().toISOString().split("T")[0],
    type: "buy",
    ticker,
    name: sym.description || ticker,
    shares: Math.abs(shares),
    pricePerShare: price,
    totalAmount: Math.abs(shares) * price,
    fees: 0,
    currency,
    sourceRef: `snaptrade:${ticker}:${shares}`,
  };
}

export interface SnapTradeHoldingsResult {
  holdings: ExtractedHolding[];
  transactions: ExtractedTransaction[];
  cashBalances: CashBalance[];
  accounts: { id: string; name: string; institution: string }[];
}

export async function fetchAllHoldings(
  userId: string,
  userSecret: string,
): Promise<SnapTradeHoldingsResult> {
  const client = getClient();

  let allAccountHoldings: AccountHoldings[];
  try {
    const res = await client.accountInformation.getAllUserHoldings({
      userId,
      userSecret,
    });
    allAccountHoldings = res.data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new SnapTradeClientError(`Failed to fetch holdings from SnapTrade: ${msg}`);
  }

  const holdings: ExtractedHolding[] = [];
  const transactions: ExtractedTransaction[] = [];
  const cashBalances: CashBalance[] = [];
  const accounts: { id: string; name: string; institution: string }[] = [];
  const seenTickers = new Set<string>();

  for (const acctHoldings of allAccountHoldings) {
    const acct = acctHoldings.account;
    if (acct) {
      accounts.push({
        id: String(acct.id || ""),
        name: String(acct.name || "Unknown Account"),
        institution: String(acct.institution_name || ""),
      });
    }

    if (acctHoldings.positions) {
      for (const pos of acctHoldings.positions) {
        if (pos.cash_equivalent) continue;

        const holding = positionToHolding(pos);
        if (holding && !seenTickers.has(holding.ticker)) {
          seenTickers.add(holding.ticker);
          holdings.push(holding);
        }

        const tx = positionToTransaction(pos);
        if (tx) transactions.push(tx);
      }
    }

    if (acctHoldings.balances) {
      for (const bal of acctHoldings.balances) {
        if (bal.currency?.code && bal.cash != null) {
          cashBalances.push({ currency: bal.currency.code, amount: bal.cash });
        }
      }
    }
  }

  return { holdings, transactions, cashBalances, accounts };
}

/* ── Activities (real transaction history) ── */

const ACTIVITY_TYPE_MAP: Record<string, ExtractedTransaction["type"] | null> = {
  BUY: "buy",
  SELL: "sell",
  DIVIDEND: "dividend",
  REI: "dividend",
  FEE: "fee",
};

function activityToTransaction(a: UniversalActivity): ExtractedTransaction | null {
  const mappedType = ACTIVITY_TYPE_MAP[(a.type || "").toUpperCase()];
  if (!mappedType) return null;

  const rawTicker = a.symbol?.symbol || a.symbol?.raw_symbol || "";
  let ticker = rawTicker;
  if (!ticker && mappedType === "fee") ticker = "FEE";
  if (!ticker) return null;

  if (a.symbol?.raw_symbol && a.symbol?.exchange?.mic_code && !a.symbol?.symbol) {
    const normalized = normalizeSnapTradeTicker(a.symbol.raw_symbol, a.symbol.exchange.mic_code);
    ticker = normalized.ticker || ticker;
  }

  const units = Math.abs(a.units ?? 0);
  const price = Math.abs(a.price ?? 0);
  const amount = Math.abs(a.amount ?? units * price);
  const fee = Math.abs(a.fee ?? 0);
  const currency = a.currency?.code || a.symbol?.currency?.code || "USD";
  const date = a.trade_date ? a.trade_date.split("T")[0] : "";

  if (!date) return null;

  return {
    date,
    type: mappedType,
    ticker,
    name: a.symbol?.description || ticker,
    shares: units,
    pricePerShare: price,
    totalAmount: amount,
    fees: fee,
    currency,
    sourceRef: a.id ? `snaptrade-activity:${a.id}` : undefined,
  };
}

export interface FetchActivitiesOptions {
  userId: string;
  userSecret: string;
  brokerageAuthorizationId?: string;
  startDate?: string;
}

const SNAPTRADE_ACTIVITIES_LIMIT = 10_000;

export interface FetchActivitiesResult {
  transactions: ExtractedTransaction[];
  rawCount: number;
  /** True when SnapTrade returned exactly 10k activities, meaning older records were likely truncated. */
  possiblyTruncated: boolean;
}

export async function fetchActivities(
  opts: FetchActivitiesOptions,
): Promise<FetchActivitiesResult> {
  const client = getClient();

  try {
    const res = await client.transactionsAndReporting.getActivities({
      userId: opts.userId,
      userSecret: opts.userSecret,
      ...(opts.startDate ? { startDate: opts.startDate } : {}),
      ...(opts.brokerageAuthorizationId
        ? { brokerageAuthorizations: opts.brokerageAuthorizationId }
        : {}),
      type: "BUY,SELL,DIVIDEND,REI,FEE",
    });

    const activities: UniversalActivity[] = res.data ?? [];
    const transactions: ExtractedTransaction[] = [];
    for (const a of activities) {
      const tx = activityToTransaction(a);
      if (tx) transactions.push(tx);
    }
    return {
      transactions,
      rawCount: activities.length,
      possiblyTruncated: activities.length >= SNAPTRADE_ACTIVITIES_LIMIT,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new SnapTradeClientError(`Failed to fetch activities from SnapTrade: ${msg}`);
  }
}
