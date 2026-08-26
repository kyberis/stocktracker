import { Snaptrade } from "snaptrade-typescript-sdk";
import type {
  AccountHoldings,
  AccountOrderRecord,
  Brokerage,
  Position,
  UniversalActivity,
} from "snaptrade-typescript-sdk";
import type { ExtractedTransaction, ExtractedHolding, CashBalance } from "@/hooks/import-types";
import { inferAssetType } from "@/lib/infer-asset-type";
import { insertSnapTradeLog } from "@/lib/db/snaptrade-logs";
import { canonicalExchangeCode } from "@/lib/db/helpers";
import { extractSnapTradeHttpStatus, isSnapTradeNotFound } from "@/lib/snaptrade-http";
import { trackExternalProvider } from "@/lib/traffic/provider-track";
import { snapTradeTradeFingerprint } from "@/lib/transaction-fingerprint";

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

async function logSnapTradeCall<T>(
  action: string,
  userId: string,
  requestSummary: Record<string, unknown>,
  fn: () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  trackExternalProvider("snaptrade");
  try {
    const result = await fn();
    const durationMs = Date.now() - start;
    insertSnapTradeLog({
      userId,
      action,
      status: "success",
      requestSummary,
      responseBody: result,
      durationMs,
    }).catch(() => {});
    return result;
  } catch (err) {
    const durationMs = Date.now() - start;
    insertSnapTradeLog({
      userId,
      action,
      status: "error",
      requestSummary,
      errorMessage: err instanceof Error ? err.message : String(err),
      durationMs,
    }).catch(() => {});
    throw err;
  }
}

export async function registerUser(userId: string): Promise<{ snapTradeUserId: string; userSecret: string }> {
  return logSnapTradeCall("registerUser", userId, { userId }, async () => {
    const client = getClient();
    const res = await client.authentication.registerSnapTradeUser({ userId });
    const data = res.data;
    if (!data.userId || !data.userSecret) {
      throw new SnapTradeClientError("SnapTrade registration did not return userId/userSecret.");
    }
    return { snapTradeUserId: data.userId, userSecret: data.userSecret };
  });
}

export async function deleteUser(userId: string): Promise<void> {
  return logSnapTradeCall("deleteUser", userId, { userId }, async () => {
    const client = getClient();
    try {
      await client.authentication.deleteSnapTradeUser({ userId });
    } catch (err: unknown) {
      // Already deregistered — treat as success so disconnect stays idempotent.
      if (isSnapTradeNotFound(err)) return;
      throw err;
    }
  });
}

export interface AvailableBrokerage {
  id: string;
  slug: string;
  name: string;
  displayName: string;
  enabled: boolean;
  maintenanceMode: boolean;
  isDegraded: boolean;
  logoUrl: string | null;
}

export async function removeBrokerageConnection(
  userId: string,
  userSecret: string,
  connectionId: string,
): Promise<{ alreadyRemoved: boolean }> {
  return logSnapTradeCall("removeBrokerageConnection", userId, { userId, connectionId }, async () => {
    const client = getClient();
    try {
      await client.connections.removeBrokerageAuthorization({
        authorizationId: connectionId,
        userId,
        userSecret,
      });
      return { alreadyRemoved: false };
    } catch (err: unknown) {
      // Authorization already gone on SnapTrade (common after portal reconnect).
      if (isSnapTradeNotFound(err)) {
        return { alreadyRemoved: true };
      }
      const msg = err instanceof Error ? err.message : String(err);
      throw new SnapTradeClientError(
        `Failed to remove brokerage connection: ${msg}`,
        extractSnapTradeHttpStatus(err),
      );
    }
  });
}

export async function refreshBrokerageConnection(
  userId: string,
  userSecret: string,
  connectionId: string,
): Promise<void> {
  return logSnapTradeCall("refreshBrokerageConnection", userId, { userId, connectionId }, async () => {
    const client = getClient();
    try {
      await client.connections.refreshBrokerageAuthorization({
        authorizationId: connectionId,
        userId,
        userSecret,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[SnapTrade] refreshBrokerageAuthorization failed: ${msg}`);
    }
  });
}

export async function listBrokerages(): Promise<AvailableBrokerage[]> {
  return logSnapTradeCall("listBrokerages", "system", {}, async () => {
    const client = getClient();
    try {
      const res = await client.referenceData.listAllBrokerages();
      return (res.data ?? []).map((b: Brokerage) => ({
        id: b.id || "",
        slug: b.slug || "",
        name: b.name || "",
        displayName: b.display_name || b.name || "",
        enabled: b.enabled ?? false,
        maintenanceMode: b.maintenance_mode ?? false,
        isDegraded: b.is_degraded ?? false,
        logoUrl: b.aws_s3_square_logo_url || b.aws_s3_logo_url || null,
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new SnapTradeClientError(`Failed to list brokerages: ${msg}`);
    }
  });
}

export async function generateConnectionPortalUrl(
  userId: string,
  userSecret: string,
  reconnectConnectionId?: string,
  customRedirect?: string,
  broker?: string,
): Promise<{ redirectUrl: string; sessionId?: string }> {
  return logSnapTradeCall(
    "generateConnectionPortalUrl",
    userId,
    { userId, reconnectConnectionId: reconnectConnectionId ?? null, broker: broker ?? null },
    async () => {
      const client = getClient();
      const res = await client.authentication.loginSnapTradeUser({
        userId,
        userSecret,
        ...(reconnectConnectionId ? { reconnect: reconnectConnectionId } : {}),
        ...(customRedirect ? { customRedirect } : {}),
        ...(broker ? { broker, immediateRedirect: true } : {}),
      });
      const data = res.data as { redirectURI?: string; sessionId?: string };
      if (!data.redirectURI) {
        throw new SnapTradeClientError("SnapTrade did not return a redirect URL.");
      }
      return { redirectUrl: data.redirectURI, sessionId: data.sessionId };
    },
  );
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
  return logSnapTradeCall("listBrokerageConnections", userId, { userId }, async () => {
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
  });
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
function padHkYahooTicker(ticker: string): string {
  const upper = ticker.trim().toUpperCase();
  const match = upper.match(/^0*(\d{1,5})\.HK$/);
  if (!match) return ticker;
  return `${match[1].padStart(4, "0")}.HK`;
}

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
        ticker: padHkYahooTicker(yahooTicker),
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
      const yahooTicker = padHkYahooTicker(`${beforeDot}${suffix}`);
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
        ticker: padHkYahooTicker(`${symbol}${suffix}`),
        exchange: YAHOO_SUFFIX_TO_EXCHANGE[suffix] || mic || "",
      };
    }
  }

  return {
    ticker: padHkYahooTicker(symbol),
    exchange: YAHOO_SUFFIX_TO_EXCHANGE[`.${symbol.split(".").pop()}`] || "",
  };
}

function positionToHolding(pos: Position): ExtractedHolding | null {
  const sym = pos.symbol?.symbol;
  if (!sym) return null;
  const rawTicker = sym.symbol || "";
  if (!rawTicker) return null;

  const exchangeMic = sym.exchange?.mic_code || "";
  const { ticker, exchange } = normalizeSnapTradeTicker(rawTicker, exchangeMic);
  if (!ticker) return null;

  const figiShareClass = sym.figi_instrument?.figi_share_class || "";
  const inferred = inferAssetType({ name: sym.description, brokerType: sym.type?.code });
  const assetType = inferred === "crypto" ? "stock" : inferred;

  const brokerPrice = typeof pos.price === "number" && Number.isFinite(pos.price) ? pos.price : undefined;

  return {
    name: sym.description || ticker,
    ticker,
    shares: pos.units ?? 0,
    purchasePrice: pos.average_purchase_price ?? 0,
    displayCurrency: sym.currency?.code || "USD",
    exchange: canonicalExchangeCode(exchange || sym.exchange?.code || "") || exchange || sym.exchange?.code || "",
    assetType,
    ...(figiShareClass ? { figiShareClass } : {}),
    ...(brokerPrice != null && brokerPrice > 0 ? { brokerPrice } : {}),
  };
}

export interface SnapTradeHoldingsResult {
  holdings: ExtractedHolding[];
  cashBalances: CashBalance[];
  accounts: { id: string; name: string; institution: string }[];
  /** EXECUTED buy/sell orders from holdings (intraday; fills activity lag). */
  orderTransactions: ExtractedTransaction[];
  /** Broker-reported NAV when SnapTrade sends `total_value` in EUR. */
  brokerNavEUR?: number | null;
}

export { snapTradeTradeFingerprint } from "@/lib/transaction-fingerprint";

/**
 * Merge activity history with recent EXECUTED orders.
 * Activities win on fingerprint collision (richer fees/amounts); orders fill
 * the SnapTrade daily activity lag and empty post-reconnect activity caches.
 *
 * Orders intentionally ignore startDate — they only cover recent months and
 * must still surface trades that landed before a bad incremental watermark
 * (e.g. reconnect that advanced last_imported_at with 0 activities).
 */
export function mergeSnapTradeTransactions(
  activities: ExtractedTransaction[],
  orders: ExtractedTransaction[],
  opts?: { existingFingerprints?: Set<string> },
): ExtractedTransaction[] {
  const seen = new Set<string>(opts?.existingFingerprints ?? []);
  const merged: ExtractedTransaction[] = [];

  for (const tx of activities) {
    const fp = snapTradeTradeFingerprint(tx);
    seen.add(fp);
    merged.push(tx);
  }

  for (const tx of orders) {
    const fp = snapTradeTradeFingerprint(tx);
    if (seen.has(fp)) continue;
    seen.add(fp);
    merged.push(tx);
  }

  return merged;
}

function parseOrderNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** Exported for unit tests — DEGIRO often mislabels open limits as EXECUTED. */
export function snapTradeOrderHasFillEvidence(
  order: { filled_quantity?: unknown; execution_price?: unknown },
  type: "buy" | "sell",
  shares: number,
  positionUnits: number,
): boolean {
  const filled = parseOrderNumber(order.filled_quantity);
  if (filled > 0 || parseOrderNumber(order.execution_price) > 0) return true;
  if (type === "sell" && positionUnits + 1e-9 >= shares) return false;
  if (type === "buy" && positionUnits <= 0) return false;
  return true;
}

function orderToTransaction(
  order: AccountOrderRecord,
  positionUnitsByTicker: Map<string, number>,
): ExtractedTransaction | null {
  const status = String(order.status || "").toUpperCase();
  if (status !== "EXECUTED" && status !== "PARTIAL") return null;

  const action = String(order.action || "").toUpperCase();
  let type: ExtractedTransaction["type"] | null = null;
  if (action === "BUY" || action === "BUY_OPEN" || action === "BUY_COVER") type = "buy";
  else if (action === "SELL" || action === "SELL_CLOSE" || action === "SELL_SHORT") type = "sell";
  if (!type) return null;

  const sym = order.universal_symbol;
  const rawSymbol = sym?.symbol || sym?.raw_symbol || "";
  if (!rawSymbol) return null;

  const exchangeMic = sym?.exchange?.mic_code || "";
  const normalized = normalizeSnapTradeTicker(rawSymbol, exchangeMic);
  const ticker = normalized.ticker || rawSymbol;

  const filled = parseOrderNumber(order.filled_quantity);
  const total = parseOrderNumber(order.total_quantity);
  const shares = Math.abs(filled > 0 ? filled : total);
  if (shares <= 0) return null;

  const posUnits = positionUnitsByTicker.get(ticker.toUpperCase()) ?? 0;
  if (!snapTradeOrderHasFillEvidence(order, type, shares, posUnits)) return null;

  const price = Math.abs(
    parseOrderNumber(order.execution_price) || parseOrderNumber(order.limit_price),
  );
  const currency = sym?.currency?.code || "USD";
  const rawDate = order.time_executed || order.time_placed || "";
  const date = rawDate ? String(rawDate).slice(0, 10) : "";
  if (!date) return null;

  const orderId = order.brokerage_order_id || "";
  // Prefer normalized venue (XET) over SnapTrade's raw code (XETRA) so txs match holdings.
  // Canonicalize aliases (CPH→OMK) so rebuild doesn't create duplicate lots.
  const exchangeCode = canonicalExchangeCode(
    String(normalized.exchange || sym?.exchange?.code || ""),
  );
  return {
    date,
    type,
    ticker,
    name: sym?.description || ticker,
    shares,
    pricePerShare: price,
    totalAmount: +(shares * price).toFixed(2),
    fees: 0,
    currency,
    sourceRef: orderId ? `snaptrade-order:${orderId}` : undefined,
    ...(exchangeCode ? { exchange: exchangeCode } : {}),
  };
}

export async function fetchAllHoldings(
  userId: string,
  userSecret: string,
  filterAccountIds?: Set<string>,
  accountInstitutionMap?: Map<string, string>,
): Promise<SnapTradeHoldingsResult> {
  return logSnapTradeCall("fetchAllHoldings", userId, { userId }, async () => {
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

    // Log the raw SDK response before any transformation
    insertSnapTradeLog({
      userId,
      action: "fetchAllHoldings:raw",
      status: "success",
      requestSummary: { userId, note: "raw SDK response before transformation" },
      responseBody: allAccountHoldings,
      durationMs: 0,
    }).catch(() => {});

    const holdingsByTicker = new Map<string, ExtractedHolding>();
    const cashBalances: CashBalance[] = [];
    const accounts: { id: string; name: string; institution: string }[] = [];
    const orderTransactions: ExtractedTransaction[] = [];
    let brokerNavEUR: number | null = null;

    for (const acctHoldings of allAccountHoldings) {
      const acct = acctHoldings.account;
      const acctId = String(acct?.id || "");
      if (filterAccountIds && acctId && !filterAccountIds.has(acctId)) continue;

      const institution = String(acct?.institution_name || "") || accountInstitutionMap?.get(acctId) || "";

      const rawNav = (acctHoldings as AccountHoldings & {
        total_value?: { currency?: string; value?: number };
      }).total_value;
      if (
        rawNav &&
        typeof rawNav.value === "number" &&
        Number.isFinite(rawNav.value) &&
        String(rawNav.currency || "").toUpperCase() === "EUR"
      ) {
        brokerNavEUR = (brokerNavEUR ?? 0) + rawNav.value;
      }

      if (acct) {
        accounts.push({
          id: acctId,
          name: String(acct.name || "Unknown Account"),
          institution,
        });
      }

      const positionUnitsByTicker = new Map<string, number>();

      if (acctHoldings.positions) {
        for (const pos of acctHoldings.positions) {
          if (pos.cash_equivalent) continue;
          if ((pos.units ?? 0) <= 0) continue;

          const holding = positionToHolding(pos);
          if (!holding || holding.shares <= 0) continue;

          positionUnitsByTicker.set(
            holding.ticker.toUpperCase(),
            (positionUnitsByTicker.get(holding.ticker.toUpperCase()) ?? 0) + holding.shares,
          );

          const existing = holdingsByTicker.get(holding.ticker);
          if (existing) {
            const totalShares = existing.shares + holding.shares;
            existing.purchasePrice =
              (existing.purchasePrice * existing.shares + holding.purchasePrice * holding.shares) / totalShares;
            if ((existing.brokerPrice ?? 0) > 0 || (holding.brokerPrice ?? 0) > 0) {
              existing.brokerPrice =
                ((existing.brokerPrice ?? 0) * existing.shares + (holding.brokerPrice ?? 0) * holding.shares) /
                totalShares;
            }
            existing.shares = totalShares;
          } else {
            holdingsByTicker.set(holding.ticker, holding);
          }
        }
      }

      if (acctHoldings.balances) {
        for (const bal of acctHoldings.balances) {
          if (bal.currency?.code && bal.cash != null) {
            cashBalances.push({
              currency: bal.currency.code,
              amount: bal.cash,
              broker: institution,
            });
          }
        }
      }

      // Holdings payload includes recent orders (intraday). Activities are daily.
      const rawOrders = (acctHoldings as AccountHoldings & { orders?: AccountOrderRecord[] | null }).orders;
      if (rawOrders) {
        for (const order of rawOrders) {
          const tx = orderToTransaction(order, positionUnitsByTicker);
          if (!tx) continue;
          if (institution) tx.brokerName = institution;
          orderTransactions.push(tx);
        }
      }
    }

    return {
      holdings: [...holdingsByTicker.values()],
      cashBalances,
      accounts,
      orderTransactions,
      brokerNavEUR,
    };
  });
}

/* —— Activities (real transaction history) —— */

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

  const rawSymbol = a.symbol?.raw_symbol || a.symbol?.symbol || "";
  let ticker = rawSymbol;
  if (!ticker && mappedType === "fee") ticker = "FEE";
  if (!ticker) return null;

  let exchangeCode = "";
  if (ticker !== "FEE") {
    const exchangeMic = a.symbol?.exchange?.mic_code || "";
    const normalized = normalizeSnapTradeTicker(ticker, exchangeMic);
    ticker = normalized.ticker || ticker;
    exchangeCode = canonicalExchangeCode(
      String(normalized.exchange || a.symbol?.exchange?.code || ""),
    );
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
    ...(exchangeCode ? { exchange: exchangeCode } : {}),
  };
}

export interface SnapTradeAccount {
  id: string;
  name: string;
  institution: string;
  brokerageAuthorizationId: string;
}

export async function listAccounts(
  userId: string,
  userSecret: string,
): Promise<SnapTradeAccount[]> {
  return logSnapTradeCall("listAccounts", userId, { userId }, async () => {
    const client = getClient();
    try {
      const res = await client.accountInformation.listUserAccounts({ userId, userSecret });
      return (res.data ?? []).map((a) => ({
        id: String(a.id || ""),
        name: String(a.name || "Unknown Account"),
        institution: String(a.institution_name || ""),
        brokerageAuthorizationId: String(a.brokerage_authorization || ""),
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new SnapTradeClientError(`Failed to list accounts: ${msg}`);
    }
  });
}

export interface FetchActivitiesOptions {
  userId: string;
  userSecret: string;
  accountId: string;
  startDate?: string;
}

const SNAPTRADE_PAGE_LIMIT = 1000;

export interface FetchActivitiesResult {
  transactions: ExtractedTransaction[];
  rawCount: number;
  possiblyTruncated: boolean;
}

export async function fetchActivities(
  opts: FetchActivitiesOptions,
): Promise<FetchActivitiesResult> {
  return logSnapTradeCall(
    "fetchActivities",
    opts.userId,
    { userId: opts.userId, accountId: opts.accountId, startDate: opts.startDate ?? null },
    async () => {
      const client = getClient();

      try {
        const allActivities: UniversalActivity[] = [];
        let offset = 0;

        while (true) {
          const normalizedStartDate = opts.startDate ? opts.startDate.slice(0, 10) : undefined;
          const res = await client.accountInformation.getAccountActivities({
            accountId: opts.accountId,
            userId: opts.userId,
            userSecret: opts.userSecret,
            ...(normalizedStartDate ? { startDate: normalizedStartDate } : {}),
            type: "BUY,SELL,DIVIDEND,REI,FEE",
            offset,
            limit: SNAPTRADE_PAGE_LIMIT,
          });

          const resBody = res.data as { data?: UniversalActivity[]; pagination?: { total?: number } } | UniversalActivity[];
          const page: UniversalActivity[] = Array.isArray(resBody) ? resBody : (resBody?.data ?? []);

          allActivities.push(...page);

          if (page.length < SNAPTRADE_PAGE_LIMIT) break;
          offset += SNAPTRADE_PAGE_LIMIT;

          if (allActivities.length >= 10_000) break;
        }

        // Log raw activities before transformation
        insertSnapTradeLog({
          userId: opts.userId,
          action: "fetchActivities:raw",
          status: "success",
          requestSummary: { userId: opts.userId, accountId: opts.accountId, startDate: opts.startDate ?? null, note: "raw SDK response before transformation" },
          responseBody: allActivities,
          durationMs: 0,
        }).catch(() => {});

        const transactions: ExtractedTransaction[] = [];
        for (const a of allActivities) {
          const tx = activityToTransaction(a);
          if (tx) transactions.push(tx);
        }
        return {
          transactions,
          rawCount: allActivities.length,
          possiblyTruncated: allActivities.length >= 10_000,
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new SnapTradeClientError(`Failed to fetch activities from SnapTrade: ${msg}`);
      }
    },
  );
}
