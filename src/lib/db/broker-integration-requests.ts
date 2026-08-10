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

export interface BrokerIntegrationRequestGroup {
  normalizedName: string;
  /** Most recently submitted raw variant — used as the display label. */
  displayName: string;
  /** Every distinct raw casing/spacing variant users have actually typed. */
  variants: string[];
  count: number;
  statusCounts: Record<BrokerIntegrationRequestStatus, number>;
  earliestRequestedAt: string;
  latestRequestedAt: string;
}

/** Case/whitespace folding only — not a fuzzy alias map (e.g. "IBKR" vs "Interactive Brokers" are kept distinct). */
export function normalizeBrokerName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

export async function createBrokerIntegrationRequest(input: {
  userId: string;
  brokerName: string;
  note?: string;
}): Promise<BrokerIntegrationRequest> {
  const client = await ensureInitialized();
  const id = randomUUID();
  const brokerName = input.brokerName.trim();
  await client.execute({
    sql: `INSERT INTO broker_integration_requests (id, user_id, broker_name, broker_name_normalized, note, status)
          VALUES (?, ?, ?, ?, ?, 'requested')`,
    args: [id, input.userId, brokerName, normalizeBrokerName(brokerName), (input.note || "").trim()],
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

const STATUS_VALUES: BrokerIntegrationRequestStatus[] = [
  "requested",
  "reviewing",
  "planned",
  "done",
  "rejected",
];

/**
 * Case-insensitive demand ranking — groups requests by normalized broker
 * name so e.g. "Trade Republic" / "Trade republic" / "TRADE REPUBLIC" count
 * as one signal instead of being split across rows. Read-only aggregation:
 * never merges or mutates the underlying rows, since different raw rows in
 * the same group may legitimately have different admin-set statuses.
 */
export async function listBrokerIntegrationRequestGroupsForAdmin(
  page: number,
  pageSize: number
): Promise<{ entries: BrokerIntegrationRequestGroup[]; total: number }> {
  const client = await ensureInitialized();

  const statusCaseSql = STATUS_VALUES.map(
    (s) => `SUM(CASE WHEN status = '${s}' THEN 1 ELSE 0 END) AS status_${s}`,
  ).join(",\n              ");

  const [countResult, result] = await Promise.all([
    client.execute(
      "SELECT COUNT(DISTINCT broker_name_normalized) as c FROM broker_integration_requests",
    ),
    client.execute({
      sql: `SELECT
              broker_name_normalized,
              GROUP_CONCAT(DISTINCT broker_name) AS variants,
              COUNT(*) AS total,
              MIN(created_at) AS earliest,
              MAX(created_at) AS latest,
              (SELECT r2.broker_name FROM broker_integration_requests r2
                 WHERE r2.broker_name_normalized = r.broker_name_normalized
                 ORDER BY r2.created_at DESC LIMIT 1) AS display_name,
              ${statusCaseSql}
            FROM broker_integration_requests r
            GROUP BY broker_name_normalized
            ORDER BY total DESC, latest DESC
            LIMIT ? OFFSET ?`,
      args: [pageSize, page * pageSize],
    }),
  ]);

  const entries: BrokerIntegrationRequestGroup[] = result.rows.map((r) => {
    const variants = str(r.variants)
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    const statusCounts = Object.fromEntries(
      STATUS_VALUES.map((s) => [s, Number(r[`status_${s}`]) || 0]),
    ) as Record<BrokerIntegrationRequestStatus, number>;

    return {
      normalizedName: str(r.broker_name_normalized),
      displayName: str(r.display_name) || str(r.broker_name_normalized),
      variants,
      count: Number(r.total) || 0,
      statusCounts,
      earliestRequestedAt: str(r.earliest),
      latestRequestedAt: str(r.latest),
    };
  });

  return {
    entries,
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
