interface ExchangeSchedule {
  tz: string;
  openHour: number;
  openMinute: number;
  closeHour: number;
  closeMinute: number;
}

const US_SCHEDULE: ExchangeSchedule = { tz: "America/New_York", openHour: 9, openMinute: 30, closeHour: 16, closeMinute: 0 };
const XETRA_SCHEDULE: ExchangeSchedule = { tz: "Europe/Berlin", openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 30 };
const EURONEXT_SCHEDULE: ExchangeSchedule = { tz: "Europe/Paris", openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 30 };

const CANADA_SCHEDULE: ExchangeSchedule = { tz: "America/Toronto", openHour: 9, openMinute: 30, closeHour: 16, closeMinute: 0 };
const UK_SCHEDULE: ExchangeSchedule = { tz: "Europe/London", openHour: 8, openMinute: 0, closeHour: 16, closeMinute: 30 };
const TRADEGATE_SCHEDULE: ExchangeSchedule = { tz: "Europe/Berlin", openHour: 8, openMinute: 0, closeHour: 22, closeMinute: 0 };
const SPAIN_SCHEDULE: ExchangeSchedule = { tz: "Europe/Madrid", openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 30 };
const ITALY_SCHEDULE: ExchangeSchedule = { tz: "Europe/Rome", openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 30 };
const SWISS_SCHEDULE: ExchangeSchedule = { tz: "Europe/Zurich", openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 30 };
const COPENHAGEN_SCHEDULE: ExchangeSchedule = { tz: "Europe/Copenhagen", openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 0 };
const HELSINKI_SCHEDULE: ExchangeSchedule = { tz: "Europe/Helsinki", openHour: 10, openMinute: 0, closeHour: 18, closeMinute: 30 };
const STOCKHOLM_SCHEDULE: ExchangeSchedule = { tz: "Europe/Stockholm", openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 30 };
const OSLO_SCHEDULE: ExchangeSchedule = { tz: "Europe/Oslo", openHour: 9, openMinute: 0, closeHour: 16, closeMinute: 20 };
const VIENNA_SCHEDULE: ExchangeSchedule = { tz: "Europe/Vienna", openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 30 };
const POLAND_SCHEDULE: ExchangeSchedule = { tz: "Europe/Warsaw", openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 5 };
const JAPAN_SCHEDULE: ExchangeSchedule = { tz: "Asia/Tokyo", openHour: 9, openMinute: 0, closeHour: 15, closeMinute: 0 };
const HK_SCHEDULE: ExchangeSchedule = { tz: "Asia/Hong_Kong", openHour: 9, openMinute: 30, closeHour: 16, closeMinute: 0 };
const AUSTRALIA_SCHEDULE: ExchangeSchedule = { tz: "Australia/Sydney", openHour: 10, openMinute: 0, closeHour: 16, closeMinute: 0 };
const SINGAPORE_SCHEDULE: ExchangeSchedule = { tz: "Asia/Singapore", openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 0 };
const KOREA_SCHEDULE: ExchangeSchedule = { tz: "Asia/Seoul", openHour: 9, openMinute: 0, closeHour: 15, closeMinute: 30 };
const INDIA_SCHEDULE: ExchangeSchedule = { tz: "Asia/Kolkata", openHour: 9, openMinute: 15, closeHour: 15, closeMinute: 30 };

const EXCHANGE_SCHEDULES: Record<string, ExchangeSchedule> = {
  // US — Yahoo codes + common aliases + MIC codes
  NYSE: US_SCHEDULE,
  NMS: US_SCHEDULE,
  NGM: US_SCHEDULE,
  NCM: US_SCHEDULE,
  NYQ: US_SCHEDULE,
  PCX: US_SCHEDULE,
  PNK: US_SCHEDULE,
  BATS: US_SCHEDULE,
  BTS: US_SCHEDULE,
  ARCX: US_SCHEDULE,
  OTC: US_SCHEDULE,
  NASDAQ: US_SCHEDULE,
  NDQ: US_SCHEDULE,
  NSY: US_SCHEDULE,
  AMEX: US_SCHEDULE,
  NYSEARCA: US_SCHEDULE,
  NYSEAMERICAN: US_SCHEDULE,
  CCC: US_SCHEDULE,
  XNAS: US_SCHEDULE,
  XNYS: US_SCHEDULE,
  XASE: US_SCHEDULE,

  // Canada
  TSE: CANADA_SCHEDULE,
  TOR: CANADA_SCHEDULE,
  CVE: CANADA_SCHEDULE,
  NEO: CANADA_SCHEDULE,
  XTSE: CANADA_SCHEDULE,
  XTSX: CANADA_SCHEDULE,

  // UK
  LSE: UK_SCHEDULE,
  LON: UK_SCHEDULE,
  IOB: UK_SCHEDULE,
  XLON: UK_SCHEDULE,

  // Germany
  XET: XETRA_SCHEDULE,
  GER: XETRA_SCHEDULE,
  ETR: XETRA_SCHEDULE,
  XETR: XETRA_SCHEDULE,
  TGD: TRADEGATE_SCHEDULE,
  TDG: TRADEGATE_SCHEDULE,
  XGAT: TRADEGATE_SCHEDULE,
  FRA: { tz: "Europe/Berlin", openHour: 8, openMinute: 0, closeHour: 20, closeMinute: 0 },
  XFRA: { tz: "Europe/Berlin", openHour: 8, openMinute: 0, closeHour: 20, closeMinute: 0 },

  // Spain
  MAD: SPAIN_SCHEDULE,
  BME: SPAIN_SCHEDULE,
  MCE: SPAIN_SCHEDULE,
  XMAD: SPAIN_SCHEDULE,

  // France
  PAR: EURONEXT_SCHEDULE,
  EPA: EURONEXT_SCHEDULE,
  ENX: EURONEXT_SCHEDULE,
  XPAR: EURONEXT_SCHEDULE,

  // Netherlands
  AMS: EURONEXT_SCHEDULE,
  XAMS: EURONEXT_SCHEDULE,

  // Belgium
  BRU: EURONEXT_SCHEDULE,
  EBR: EURONEXT_SCHEDULE,
  XBRU: EURONEXT_SCHEDULE,

  // Portugal
  LIS: EURONEXT_SCHEDULE,
  XLIS: EURONEXT_SCHEDULE,

  // Ireland
  ISE: { tz: "Europe/Dublin", openHour: 8, openMinute: 0, closeHour: 16, closeMinute: 28 },

  // Italy
  MIL: ITALY_SCHEDULE,
  BIT: ITALY_SCHEDULE,
  XMIL: ITALY_SCHEDULE,

  // Switzerland
  SWX: SWISS_SCHEDULE,
  EBS: SWISS_SCHEDULE,
  XSWX: SWISS_SCHEDULE,

  // Denmark / Nordic
  CPH: COPENHAGEN_SCHEDULE,
  OMK: COPENHAGEN_SCHEDULE,
  XCSE: COPENHAGEN_SCHEDULE,

  // Finland
  HEL: HELSINKI_SCHEDULE,
  XHEL: HELSINKI_SCHEDULE,

  // Sweden
  STO: STOCKHOLM_SCHEDULE,
  XSTO: STOCKHOLM_SCHEDULE,

  // Norway
  OSL: OSLO_SCHEDULE,
  XOSL: OSLO_SCHEDULE,

  // Iceland
  ICE: { tz: "Atlantic/Reykjavik", openHour: 9, openMinute: 30, closeHour: 15, closeMinute: 30 },
  XICE: { tz: "Atlantic/Reykjavik", openHour: 9, openMinute: 30, closeHour: 15, closeMinute: 30 },

  // Austria
  VIE: VIENNA_SCHEDULE,
  XWBO: VIENNA_SCHEDULE,

  // Poland
  WAR: POLAND_SCHEDULE,
  WSE: POLAND_SCHEDULE,
  XWAR: POLAND_SCHEDULE,

  // Czech Republic
  PRA: { tz: "Europe/Prague", openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 20 },
  XPRA: { tz: "Europe/Prague", openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 20 },

  // Hungary
  BUD: { tz: "Europe/Budapest", openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 5 },
  XBUD: { tz: "Europe/Budapest", openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 5 },

  // Romania
  BVB: { tz: "Europe/Bucharest", openHour: 10, openMinute: 0, closeHour: 18, closeMinute: 0 },
  XBSE: { tz: "Europe/Bucharest", openHour: 10, openMinute: 0, closeHour: 18, closeMinute: 0 },

  // Turkey
  IST: { tz: "Europe/Istanbul", openHour: 10, openMinute: 0, closeHour: 18, closeMinute: 0 },

  // Israel
  TLV: { tz: "Asia/Jerusalem", openHour: 9, openMinute: 59, closeHour: 17, closeMinute: 15 },

  // Japan
  JPX: JAPAN_SCHEDULE,
  TYO: JAPAN_SCHEDULE,
  XTKS: JAPAN_SCHEDULE,

  // Hong Kong
  HKG: HK_SCHEDULE,
  HKSE: HK_SCHEDULE,
  XHKG: HK_SCHEDULE,

  // Australia
  ASX: AUSTRALIA_SCHEDULE,
  AX: AUSTRALIA_SCHEDULE,
  XASX: AUSTRALIA_SCHEDULE,

  // Singapore
  SGX: SINGAPORE_SCHEDULE,
  SES: SINGAPORE_SCHEDULE,
  XSES: SINGAPORE_SCHEDULE,

  // South Korea
  KSC: KOREA_SCHEDULE,
  KRX: KOREA_SCHEDULE,

  // India
  NSE: INDIA_SCHEDULE,
  BSE: INDIA_SCHEDULE,
  NSI: INDIA_SCHEDULE,
  BOM: INDIA_SCHEDULE,

  // Taiwan
  TAI: { tz: "Asia/Taipei", openHour: 9, openMinute: 0, closeHour: 13, closeMinute: 30 },
  TWO: { tz: "Asia/Taipei", openHour: 9, openMinute: 0, closeHour: 13, closeMinute: 30 },

  // China
  SHH: { tz: "Asia/Shanghai", openHour: 9, openMinute: 30, closeHour: 15, closeMinute: 0 },
  SHZ: { tz: "Asia/Shanghai", openHour: 9, openMinute: 30, closeHour: 15, closeMinute: 0 },

  // Indonesia
  JKT: { tz: "Asia/Jakarta", openHour: 9, openMinute: 0, closeHour: 15, closeMinute: 0 },

  // Brazil
  SAO: { tz: "America/Sao_Paulo", openHour: 10, openMinute: 0, closeHour: 17, closeMinute: 0 },

  // Mexico
  MEX: { tz: "America/Mexico_City", openHour: 8, openMinute: 30, closeHour: 15, closeMinute: 0 },
};

function getLocalTime(tz: string, now: Date): { hours: number; minutes: number; dayOfWeek: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    weekday: "short",
  }).formatToParts(now);

  let hours = 0;
  let minutes = 0;
  let weekday = "";
  for (const p of parts) {
    if (p.type === "hour") hours = parseInt(p.value, 10);
    if (p.type === "minute") minutes = parseInt(p.value, 10);
    if (p.type === "weekday") weekday = p.value;
  }

  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { hours, minutes, dayOfWeek: dayMap[weekday] ?? new Date().getDay() };
}

export interface MarketStatus {
  isOpen: boolean;
  nextEvent: string;
}

export function getMarketStatus(exchange: string, now?: Date): MarketStatus {
  const schedule = EXCHANGE_SCHEDULES[exchange.toUpperCase()];
  if (!schedule) {
    return { isOpen: false, nextEvent: "" };
  }

  const currentTime = now ?? new Date();
  const { hours, minutes, dayOfWeek } = getLocalTime(schedule.tz, currentTime);
  const currentMinutes = hours * 60 + minutes;
  const openMinutes = schedule.openHour * 60 + schedule.openMinute;
  const closeMinutes = schedule.closeHour * 60 + schedule.closeMinute;

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isOpen = !isWeekend && currentMinutes >= openMinutes && currentMinutes < closeMinutes;

  let nextEvent = "";
  if (isOpen) {
    const remaining = closeMinutes - currentMinutes;
    if (remaining <= 60) {
      nextEvent = `${remaining}m`;
    } else {
      const h = Math.floor(remaining / 60);
      const m = remaining % 60;
      nextEvent = m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
  }

  return { isOpen, nextEvent };
}

/**
 * Returns true if the given exchange was open at any point during the current
 * calendar day in the exchange's local timezone. This is true when:
 * - The market is currently open, OR
 * - The local time is past the market's close time on a weekday
 *
 * Returns false on weekends or before the market opens on a given day.
 * Crypto is always considered "open today".
 */
export function wasMarketOpenToday(exchange: string, now?: Date): boolean {
  const schedule = EXCHANGE_SCHEDULES[exchange.toUpperCase()];
  if (!schedule) return false;

  const currentTime = now ?? new Date();
  const { hours, minutes, dayOfWeek } = getLocalTime(schedule.tz, currentTime);
  const currentMinutes = hours * 60 + minutes;
  const openMinutes = schedule.openHour * 60 + schedule.openMinute;

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  if (isWeekend) return false;

  return currentMinutes >= openMinutes;
}

/* ── Snapshot gating: should we record a portfolio snapshot right now? ─ */

/**
 * Returns true when at least one holding in the list has a market that is
 * currently open.  Crypto (assetType "crypto") counts as always-active.
 *
 * When no holding carries a recognised exchange code (e.g. manual imports),
 * falls back to a simple weekday heuristic so snapshots still get written
 * during normal trading days.
 */
export function isAnyMarketActive(
  holdings: ReadonlyArray<{ assetType?: string; exchange?: string }>,
  now?: Date,
): boolean {
  if (holdings.length === 0) return false;
  if (holdings.some((h) => h.assetType === "crypto")) return true;

  const ts = now ?? new Date();
  const withExchange = holdings.filter((h) => h.exchange);

  if (withExchange.length > 0) {
    return withExchange.some((h) => getMarketStatus(h.exchange!, ts).isOpen);
  }

  // No exchange info at all — weekday heuristic
  const day = ts.getUTCDay();
  return day !== 0 && day !== 6;
}

const EXCHANGE_LABEL: Record<string, string> = {
  // US
  NYSE: "NYSE", NMS: "NASDAQ", NGM: "NASDAQ", NCM: "NASDAQ", NDQ: "NASDAQ", NASDAQ: "NASDAQ", XNAS: "NASDAQ",
  NYQ: "NYSE", NSY: "NYSE", XNYS: "NYSE", ARCX: "NYSE Arca", NYSEARCA: "NYSE Arca", PCX: "NYSE Arca",
  PNK: "OTC Markets", CCC: "NYSE", NYSEAMERICAN: "NYSE American", AMEX: "NYSE American", XASE: "NYSE American",
  BATS: "NYSE", BTS: "NYSE", OTC: "OTC Markets",
  // Canada
  TSE: "TSX", TOR: "TSX", XTSE: "TSX", XTSX: "TSX-V", CVE: "TSX-V", NEO: "TSX",
  // UK
  LSE: "LSE", LON: "LSE", IOB: "LSE", XLON: "LSE",
  // Germany
  XET: "XETRA", GER: "XETRA", ETR: "XETRA", XETR: "XETRA",
  TGD: "Tradegate", TDG: "Tradegate", XGAT: "Tradegate",
  FRA: "Frankfurt", XFRA: "Frankfurt",
  // France / Euronext
  PAR: "Euronext", EPA: "Euronext", ENX: "Euronext", XPAR: "Euronext",
  AMS: "Euronext", XAMS: "Euronext", BRU: "Euronext", EBR: "Euronext", XBRU: "Euronext",
  LIS: "Euronext", XLIS: "Euronext",
  // Spain
  MCE: "BME", MAD: "BME", BME: "BME", XMAD: "BME",
  // Italy
  MIL: "Borsa Italiana", BIT: "Borsa Italiana", XMIL: "Borsa Italiana",
  // Switzerland
  SWX: "SIX", EBS: "SIX", XSWX: "SIX",
  // Ireland
  ISE: "Euronext Dublin",
  // Nordic
  CPH: "OMX Copenhagen", OMK: "OMX Copenhagen", XCSE: "OMX Copenhagen",
  XHEL: "OMX Helsinki", XSTO: "OMX Stockholm", XOSL: "Oslo Børs",
  // Asia-Pacific
  TYO: "Tokyo SE", XTKS: "Tokyo SE",
  HKSE: "HKSE", XHKG: "HKSE",
  AX: "ASX", XASX: "ASX",
  SES: "SGX", XSES: "SGX",
  KRX: "KRX", NSI: "NSE India", BOM: "BSE India",
};

export interface NextMarketOpen {
  market: string;
  time: string;
}

/**
 * For a set of holdings, compute when the earliest market next opens.
 * Returns the market name and the opening time formatted in the client's
 * local timezone, or null when no recognised exchanges are found.
 */
export function getNextMarketOpen(
  holdings: ReadonlyArray<{ assetType?: string; exchange?: string }>,
  now?: Date,
): NextMarketOpen | null {
  const ts = now ?? new Date();
  const candidates: { ms: number; market: string; time: string }[] = [];

  const seen = new Set<string>();
  for (const h of holdings) {
    if (h.assetType === "crypto") continue;
    const ex = h.exchange?.toUpperCase();
    if (!ex || seen.has(ex)) continue;
    seen.add(ex);
    const schedule = EXCHANGE_SCHEDULES[ex];
    if (!schedule) continue;

    const displayName = EXCHANGE_LABEL[ex] ?? ex;
    const result = nextOpenInfo(schedule, displayName, ts);
    if (result) candidates.push(result);
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.ms - b.ms);
  return { market: candidates[0].market, time: candidates[0].time };
}

function nextOpenInfo(
  schedule: ExchangeSchedule,
  marketName: string,
  now: Date,
): { ms: number; market: string; time: string } | null {
  const { hours, minutes, dayOfWeek } = getLocalTime(schedule.tz, now);
  const currentMin = hours * 60 + minutes;
  const openMin = schedule.openHour * 60 + schedule.openMinute;

  let daysToAdd: number;
  if (dayOfWeek >= 1 && dayOfWeek <= 5 && currentMin < openMin) {
    daysToAdd = 0;
  } else if (dayOfWeek === 5) {
    daysToAdd = 3;
  } else if (dayOfWeek === 6) {
    daysToAdd = 2;
  } else if (dayOfWeek === 0) {
    daysToAdd = 1;
  } else {
    daysToAdd = 1;
  }

  const minutesUntil = daysToAdd * 24 * 60 + (openMin - currentMin);
  const openDate = new Date(now.getTime() + minutesUntil * 60_000);

  // Format in the client's local timezone (browser default)
  const dayName = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(openDate);
  const timeParts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(openDate);
  const tzAbbr = new Intl.DateTimeFormat("en-US", {
    timeZoneName: "short",
  })
    .formatToParts(openDate)
    .find((p) => p.type === "timeZoneName")?.value ?? "";

  return { ms: minutesUntil * 60_000, market: marketName, time: `${dayName} ${timeParts} ${tzAbbr}` };
}

/* ── Ticker-bar market overview ──────────────────────────────────────── */

export interface TickerMarketStatus {
  id: string;
  name: string;
  shortName: string;
  isOpen: boolean;
}

const TICKER_MARKETS: Array<{ id: string; name: string; shortName: string; exchangeKey: string }> = [
  { id: "nyse", name: "NYSE", shortName: "NYSE", exchangeKey: "NYSE" },
  { id: "nasdaq", name: "NASDAQ", shortName: "NASDAQ", exchangeKey: "NMS" },
  { id: "xetra", name: "XETRA", shortName: "XETRA", exchangeKey: "XET" },
  { id: "lse", name: "LSE", shortName: "LSE", exchangeKey: "LSE" },
  { id: "euronext", name: "Euronext", shortName: "ENX", exchangeKey: "AMS" },
  { id: "tse", name: "Tokyo SE", shortName: "TSE", exchangeKey: "JPX" },
];

export function getTickerMarketStatuses(now: Date = new Date()): TickerMarketStatus[] {
  return TICKER_MARKETS.map((m) => ({
    id: m.id,
    name: m.name,
    shortName: m.shortName,
    isOpen: getMarketStatus(m.exchangeKey, now).isOpen,
  }));
}

/* ── Chart market-session overlays ────────────────────────────────────── */

const MARKET_SESSION_COLORS: Record<string, string> = {
  NYSE: "#10b981", NASDAQ: "#10b981", "NYSE Arca": "#10b981", "NYSE American": "#10b981",
  XETRA: "#3b82f6", Tradegate: "#60a5fa", Frankfurt: "#3b82f6",
  LSE: "#8b5cf6",
  TSX: "#f59e0b", "TSX-V": "#f59e0b",
  Euronext: "#f59e0b", BME: "#f97316", "Borsa Italiana": "#f97316",
  SIX: "#06b6d4",
  "OMX Copenhagen": "#06b6d4", "OMX Helsinki": "#06b6d4", "OMX Stockholm": "#06b6d4", "Oslo Børs": "#06b6d4",
  "Tokyo SE": "#ec4899", HKSE: "#ec4899",
  ASX: "#14b8a6", SGX: "#14b8a6",
  KRX: "#ec4899", "NSE India": "#f97316", "BSE India": "#f97316",
};

export interface ChartMarketSession {
  name: string;
  color: string;
  openDate: Date;
  closeDate: Date;
  openLabel: string;
  closeLabel: string;
}

/**
 * Convert an exchange-local time (hour:minute in tz) to a UTC instant (Date)
 * so that `date.getHours()` gives browser-local time.
 */
function exchangeTimeToLocalInstant(dayIso: string, hour: number, minute: number, tz: string): Date {
  const [y, m, d] = dayIso.split("-").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, hour, minute, 0));
  const local = getLocalTime(tz, guess);
  const targetMin = hour * 60 + minute;
  const actualMin = local.hours * 60 + local.minutes;
  return new Date(guess.getTime() - (actualMin - targetMin) * 60_000);
}

/**
 * Deduplicated market sessions for the user's holdings on a given day.
 * Open/close times are in the browser's local timezone.
 */
export function getPortfolioMarketSessions(
  holdings: ReadonlyArray<{ assetType?: string; exchange?: string }>,
  day?: Date,
): ChartMarketSession[] {
  const ref = day ?? new Date();
  const dow = ref.getDay();
  if (dow === 0 || dow === 6) return [];

  const dayIso = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}-${String(ref.getDate()).padStart(2, "0")}`;

  const seen = new Map<string, ExchangeSchedule>();
  for (const h of holdings) {
    if (h.assetType === "crypto") continue;
    const ex = h.exchange?.toUpperCase();
    if (!ex) continue;
    const schedule = EXCHANGE_SCHEDULES[ex];
    if (!schedule) continue;
    const name = EXCHANGE_LABEL[ex] ?? ex;
    if (!seen.has(name)) seen.set(name, schedule);
  }

  const fmt = (d: Date) =>
    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

  const sessions: ChartMarketSession[] = [];
  for (const [name, schedule] of seen) {
    const openDate = exchangeTimeToLocalInstant(dayIso, schedule.openHour, schedule.openMinute, schedule.tz);
    const closeDate = exchangeTimeToLocalInstant(dayIso, schedule.closeHour, schedule.closeMinute, schedule.tz);
    sessions.push({
      name,
      color: MARKET_SESSION_COLORS[name] ?? "#64748b",
      openDate,
      closeDate,
      openLabel: fmt(openDate),
      closeLabel: fmt(closeDate),
    });
  }

  sessions.sort((a, b) => a.openDate.getTime() - b.openDate.getTime());
  return sessions;
}

export interface ActiveMarketInfo {
  name: string;
  isOpen: boolean;
  closesIn: string;
}

/**
 * Which of the user's markets are open at a given instant.
 * Open markets sorted first; includes time-until-close.
 */
export function getActiveMarketsAt(
  holdings: ReadonlyArray<{ assetType?: string; exchange?: string }>,
  at: Date,
): ActiveMarketInfo[] {
  const seen = new Map<string, string>();
  for (const h of holdings) {
    if (h.assetType === "crypto") continue;
    const ex = h.exchange?.toUpperCase();
    if (!ex || !EXCHANGE_SCHEDULES[ex]) continue;
    const name = EXCHANGE_LABEL[ex] ?? ex;
    if (!seen.has(name)) seen.set(name, ex);
  }

  const result: ActiveMarketInfo[] = [];
  for (const [name, ex] of seen) {
    const status = getMarketStatus(ex, at);
    result.push({ name, isOpen: status.isOpen, closesIn: status.nextEvent });
  }

  result.sort((a, b) => (a.isOpen === b.isOpen ? 0 : a.isOpen ? -1 : 1));
  return result;
}
