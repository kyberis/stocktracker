import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { str } from "./helpers";

export interface DeviceInterestEntry {
  id: string;
  email: string;
  createdAt: string;
}

export async function addDeviceInterest(email: string): Promise<boolean> {
  const client = await ensureInitialized();
  try {
    await client.execute({
      sql: "INSERT INTO device_interest (id, email) VALUES (?, ?)",
      args: [randomUUID(), email.toLowerCase().trim()],
    });
    return true;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("UNIQUE constraint")) return false;
    throw e;
  }
}

export async function listDeviceInterest(): Promise<DeviceInterestEntry[]> {
  const client = await ensureInitialized();
  const result = await client.execute(
    "SELECT id, email, created_at FROM device_interest ORDER BY created_at DESC"
  );
  return result.rows.map((r) => ({
    id: str(r.id),
    email: str(r.email),
    createdAt: str(r.created_at),
  }));
}

export async function listDeviceInterestPaginated(page: number, pageSize: number): Promise<{ entries: DeviceInterestEntry[]; total: number }> {
  const client = await ensureInitialized();
  const [countResult, result] = await Promise.all([
    client.execute("SELECT COUNT(*) as c FROM device_interest"),
    client.execute({
      sql: "SELECT id, email, created_at FROM device_interest ORDER BY created_at DESC LIMIT ? OFFSET ?",
      args: [pageSize, page * pageSize],
    }),
  ]);
  return {
    entries: result.rows.map((r) => ({
      id: str(r.id),
      email: str(r.email),
      createdAt: str(r.created_at),
    })),
    total: Number(countResult.rows[0]?.c) || 0,
  };
}

export async function countDeviceInterest(): Promise<number> {
  const client = await ensureInitialized();
  const result = await client.execute("SELECT COUNT(*) as c FROM device_interest");
  return Number(result.rows[0]?.c) || 0;
}
