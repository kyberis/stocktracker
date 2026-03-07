import { ensureInitialized } from "./client";
import { str, num } from "./helpers";

export interface DbPasskey {
  id: string;
  user_id: string;
  credential_public_key: string;
  counter: number;
  device_type: string;
  backed_up: boolean;
  transports: string[];
  name: string;
  created_at: string;
  last_used_at: string;
}

export interface PublicPasskey {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string;
  deviceType: string;
  backedUp: boolean;
}

function rowToPasskey(row: Record<string, unknown>): DbPasskey {
  let transports: string[] = [];
  try {
    transports = JSON.parse(str(row.transports));
  } catch {
    transports = [];
  }
  return {
    id: str(row.id),
    user_id: str(row.user_id),
    credential_public_key: str(row.credential_public_key),
    counter: num(row.counter),
    device_type: str(row.device_type),
    backed_up: num(row.backed_up) === 1,
    transports,
    name: str(row.name),
    created_at: str(row.created_at),
    last_used_at: str(row.last_used_at),
  };
}

export function mapPasskey(p: DbPasskey): PublicPasskey {
  return {
    id: p.id,
    name: p.name,
    createdAt: p.created_at,
    lastUsedAt: p.last_used_at,
    deviceType: p.device_type,
    backedUp: p.backed_up,
  };
}

export async function getPasskeysByUserId(userId: string): Promise<DbPasskey[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM passkeys WHERE user_id = ? ORDER BY created_at DESC",
    args: [userId],
  });
  return result.rows.map((r) => rowToPasskey(r as unknown as Record<string, unknown>));
}

export async function getPasskeyById(id: string): Promise<DbPasskey | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM passkeys WHERE id = ?",
    args: [id],
  });
  if (result.rows.length === 0) return null;
  return rowToPasskey(result.rows[0] as unknown as Record<string, unknown>);
}

export async function createPasskey(params: {
  id: string;
  userId: string;
  publicKey: string;
  counter: number;
  deviceType: string;
  backedUp: boolean;
  transports: string[];
  name: string;
}): Promise<DbPasskey> {
  const client = await ensureInitialized();
  await client.execute({
    sql: `INSERT INTO passkeys (id, user_id, credential_public_key, counter, device_type, backed_up, transports, name)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      params.id,
      params.userId,
      params.publicKey,
      params.counter,
      params.deviceType,
      params.backedUp ? 1 : 0,
      JSON.stringify(params.transports),
      params.name,
    ],
  });
  const created = await getPasskeyById(params.id);
  if (!created) throw new Error("Failed to create passkey");
  return created;
}

export async function updatePasskeyCounter(id: string, counter: number): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE passkeys SET counter = ?, last_used_at = datetime('now') WHERE id = ?",
    args: [counter, id],
  });
}

export async function renamePasskey(id: string, userId: string, name: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE passkeys SET name = ? WHERE id = ? AND user_id = ?",
    args: [name, id, userId],
  });
}

export async function deletePasskey(id: string, userId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "DELETE FROM passkeys WHERE id = ? AND user_id = ?",
    args: [id, userId],
  });
  return result.rowsAffected > 0;
}

export async function countPasskeysByUserId(userId: string): Promise<number> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT COUNT(*) as cnt FROM passkeys WHERE user_id = ?",
    args: [userId],
  });
  return num(result.rows[0]?.cnt);
}
