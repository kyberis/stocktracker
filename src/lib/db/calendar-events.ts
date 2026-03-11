import { ensureInitialized } from "./client";

export interface CalendarEvent {
  id: string;
  event_type: "earnings" | "economic" | "ipo";
  symbol: string | null;
  name: string;
  event_date: string;
  event_time: string | null;
  details: string | null;
  created_at: string;
  updated_at: string;
}

function str(v: unknown): string {
  return String(v ?? "");
}

function rowToEvent(row: Record<string, unknown>): CalendarEvent {
  return {
    id: str(row.id),
    event_type: str(row.event_type) as CalendarEvent["event_type"],
    symbol: row.symbol ? str(row.symbol) : null,
    name: str(row.name),
    event_date: str(row.event_date),
    event_time: row.event_time ? str(row.event_time) : null,
    details: row.details ? str(row.details) : null,
    created_at: str(row.created_at),
    updated_at: str(row.updated_at),
  };
}

export async function upsertCalendarEvent(event: {
  id: string;
  event_type: string;
  symbol: string | null;
  name: string;
  event_date: string;
  event_time: string | null;
  details: string | null;
}): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: `INSERT OR REPLACE INTO calendar_events (id, event_type, symbol, name, event_date, event_time, details, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    args: [event.id, event.event_type, event.symbol, event.name, event.event_date, event.event_time, event.details],
  });
}

export async function upsertCalendarEventsBatch(events: {
  id: string;
  event_type: string;
  symbol: string | null;
  name: string;
  event_date: string;
  event_time: string | null;
  details: string | null;
}[]): Promise<void> {
  if (events.length === 0) return;
  const client = await ensureInitialized();
  await client.batch(
    events.map((e) => ({
      sql: `INSERT OR REPLACE INTO calendar_events (id, event_type, symbol, name, event_date, event_time, details, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [e.id, e.event_type, e.symbol, e.name, e.event_date, e.event_time, e.details],
    })),
    "write"
  );
}

export async function deleteStaleEvents(beforeDate: string): Promise<number> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "DELETE FROM calendar_events WHERE event_date < ?",
    args: [beforeDate],
  });
  return result.rowsAffected;
}

export async function listCalendarEvents(opts: {
  types?: string[];
  from?: string;
  to?: string;
  symbols?: string[];
}): Promise<CalendarEvent[]> {
  const client = await ensureInitialized();

  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (opts.types && opts.types.length > 0) {
    conditions.push(`event_type IN (${opts.types.map(() => "?").join(",")})`);
    args.push(...opts.types);
  }
  if (opts.from) {
    conditions.push("event_date >= ?");
    args.push(opts.from);
  }
  if (opts.to) {
    conditions.push("event_date <= ?");
    args.push(opts.to);
  }
  if (opts.symbols && opts.symbols.length > 0) {
    conditions.push(`(symbol IN (${opts.symbols.map(() => "?").join(",")}) OR symbol IS NULL)`);
    args.push(...opts.symbols);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await client.execute({
    sql: `SELECT * FROM calendar_events ${where} ORDER BY event_date ASC, event_type ASC`,
    args,
  });

  return result.rows.map((r) => rowToEvent(r as unknown as Record<string, unknown>));
}

export async function listCalendarEventsByType(opts: {
  type: string;
  from?: string;
  to?: string;
}): Promise<CalendarEvent[]> {
  const client = await ensureInitialized();
  const conditions = ["event_type = ?"];
  const args: (string | number)[] = [opts.type];

  if (opts.from) {
    conditions.push("event_date >= ?");
    args.push(opts.from);
  }
  if (opts.to) {
    conditions.push("event_date <= ?");
    args.push(opts.to);
  }

  const result = await client.execute({
    sql: `SELECT * FROM calendar_events WHERE ${conditions.join(" AND ")} ORDER BY event_date ASC`,
    args,
  });

  return result.rows.map((r) => rowToEvent(r as unknown as Record<string, unknown>));
}
