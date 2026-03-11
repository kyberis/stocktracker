interface ExchangeSchedule {
  tz: string;
  openHour: number;
  openMinute: number;
  closeHour: number;
  closeMinute: number;
}

const EXCHANGE_SCHEDULES: Record<string, ExchangeSchedule> = {
  // US
  NYSE: { tz: "America/New_York", openHour: 9, openMinute: 30, closeHour: 16, closeMinute: 0 },
  NMS: { tz: "America/New_York", openHour: 9, openMinute: 30, closeHour: 16, closeMinute: 0 },
  NGM: { tz: "America/New_York", openHour: 9, openMinute: 30, closeHour: 16, closeMinute: 0 },
  NCM: { tz: "America/New_York", openHour: 9, openMinute: 30, closeHour: 16, closeMinute: 0 },
  NYQ: { tz: "America/New_York", openHour: 9, openMinute: 30, closeHour: 16, closeMinute: 0 },
  PCX: { tz: "America/New_York", openHour: 9, openMinute: 30, closeHour: 16, closeMinute: 0 },
  PNK: { tz: "America/New_York", openHour: 9, openMinute: 30, closeHour: 16, closeMinute: 0 },

  // Canada
  TSE: { tz: "America/Toronto", openHour: 9, openMinute: 30, closeHour: 16, closeMinute: 0 },
  TOR: { tz: "America/Toronto", openHour: 9, openMinute: 30, closeHour: 16, closeMinute: 0 },

  // UK
  LSE: { tz: "Europe/London", openHour: 8, openMinute: 0, closeHour: 16, closeMinute: 30 },

  // Germany - XETRA, Tradegate, Frankfurt
  XET: { tz: "Europe/Berlin", openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 30 },
  TGD: { tz: "Europe/Berlin", openHour: 8, openMinute: 0, closeHour: 22, closeMinute: 0 },
  TDG: { tz: "Europe/Berlin", openHour: 8, openMinute: 0, closeHour: 22, closeMinute: 0 },
  FRA: { tz: "Europe/Berlin", openHour: 8, openMinute: 0, closeHour: 20, closeMinute: 0 },
  GER: { tz: "Europe/Berlin", openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 30 },

  // Spain
  MAD: { tz: "Europe/Madrid", openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 30 },
  BME: { tz: "Europe/Madrid", openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 30 },

  // France
  PAR: { tz: "Europe/Paris", openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 30 },

  // Netherlands
  AMS: { tz: "Europe/Amsterdam", openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 30 },

  // Belgium
  BRU: { tz: "Europe/Brussels", openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 30 },

  // Italy
  MIL: { tz: "Europe/Rome", openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 30 },

  // Switzerland
  SWX: { tz: "Europe/Zurich", openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 30 },
  EBS: { tz: "Europe/Zurich", openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 30 },

  // Nordic
  CPH: { tz: "Europe/Copenhagen", openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 0 },
  OMK: { tz: "Europe/Copenhagen", openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 0 },
  HEL: { tz: "Europe/Helsinki", openHour: 10, openMinute: 0, closeHour: 18, closeMinute: 30 },
  STO: { tz: "Europe/Stockholm", openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 30 },
  OSL: { tz: "Europe/Oslo", openHour: 9, openMinute: 0, closeHour: 16, closeMinute: 20 },

  // Austria
  VIE: { tz: "Europe/Vienna", openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 30 },

  // Japan
  JPX: { tz: "Asia/Tokyo", openHour: 9, openMinute: 0, closeHour: 15, closeMinute: 0 },
  TYO: { tz: "Asia/Tokyo", openHour: 9, openMinute: 0, closeHour: 15, closeMinute: 0 },
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
