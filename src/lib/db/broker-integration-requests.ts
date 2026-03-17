import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { str } from "./helpers";

export interface BrokerIntegrationRequest {
  id: string;
  userId: string;
  brokerName: string;
  note: string;
  status: "requested" | "reviewing" | "planned" | "done" | "rejected";
  createdAt: string;
}

export type BrokerIntegrationRequestStatus =
  BrokerIntegrationRequest["status"];

export interface BrokerIntegrationRequestWithUser extends BrokerIntegrationRequest {
  userEmail: string;
  userDisplayName: string;
  username: string;
  userLanguage: string;
}

export async function createBrokerIntegrationRequest(input: {
  userId: string;
  brokerName: string;
  note?: string;
}): Promise<BrokerIntegrationRequest> {
  const client = await ensureInitialized();
  const id = randomUUID();
  await client.execute({
    sql: `INSERT INTO broker_integration_requests (id, user_id, broker_name, note, status)
          VALUES (?, ?, ?, ?, 'requested')`,
    args: [id, input.userId, input.brokerName.trim(), (input.note || "").trim()],
  });

  const created = await getBrokerIntegrationRequestById(id);
  if (!created) throw new Error("Failed to create broker integration request");
  return created;
}

export async function getBrokerIntegrationRequestById(
  id: string
): Promise<BrokerIntegrationRequest | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT id, user_id, broker_name, note, status, created_at
          FROM broker_integration_requests
          WHERE id = ?`,
    args: [id],
  });
  if (result.rows.length === 0) return null;
  return mapRow(result.rows[0]);
}

export async function listBrokerIntegrationRequestsForAdmin(
  page: number,
  pageSize: number
): Promise<{ entries: BrokerIntegrationRequestWithUser[]; total: number }> {
  const client = await ensureInitialized();
  const [countResult, result] = await Promise.all([
    client.execute("SELECT COUNT(*) as c FROM broker_integration_requests"),
    client.execute({
      sql: `SELECT
              r.id,
              r.user_id,
              r.broker_name,
              r.note,
              r.status,
              r.created_at,
              u.email AS user_email,
              u.display_name AS user_display_name,
              u.username AS username,
              COALESCE(us.language, 'en') AS user_language
            FROM broker_integration_requests r
            JOIN users u ON u.id = r.user_id
            LEFT JOIN user_settings us ON us.user_id = r.user_id
            ORDER BY r.created_at DESC
            LIMIT ? OFFSET ?`,
      args: [pageSize, page * pageSize],
    }),
  ]);

  return {
    entries: result.rows.map((r) => ({
      ...mapRow(r),
      userEmail: str(r.user_email),
      userDisplayName: str(r.user_display_name),
      username: str(r.username),
      userLanguage: str(r.user_language) || "en",
    })),
    total: Number(countResult.rows[0]?.c) || 0,
  };
}

export async function updateBrokerIntegrationRequestStatus(
  id: string,
  status: BrokerIntegrationRequestStatus
): Promise<BrokerIntegrationRequest | null> {
  const client = await ensureInitialized();
  await client.execute({
    sql: `UPDATE broker_integration_requests
          SET status = ?
          WHERE id = ?`,
    args: [status, id],
  });
  return getBrokerIntegrationRequestById(id);
}

function mapRow(r: import("@libsql/client").Row): BrokerIntegrationRequest {
  return {
    id: str(r.id),
    userId: str(r.user_id),
    brokerName: str(r.broker_name),
    note: str(r.note),
    status: (str(r.status) || "requested") as BrokerIntegrationRequest["status"],
    createdAt: str(r.created_at),
  };
}
