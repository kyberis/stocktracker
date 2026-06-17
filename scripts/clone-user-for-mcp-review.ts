/**
 * Clone a trefolio user's portfolio data into a dedicated MCP / Claude review account.
 *
 * Usage (production Turso + IdP env required):
 *   set -a && source .env.production.local && set +a
 *   npx tsx scripts/clone-user-for-mcp-review.ts
 *
 * Options:
 *   --source=suarez84@gmail.com
 *   --target=claude-mcp-review@trefolio.com
 *   --password='...'   (optional; generated if omitted)
 *   --dry-run
 */
import { randomUUID } from "node:crypto";

import { hashPassword } from "../src/lib/auth/password";
import { ensureInitialized } from "../src/lib/db/client";
import { importUser } from "../src/lib/idp/client";

const DEFAULT_SOURCE = "suarez84@gmail.com";
const DEFAULT_TARGET = "claude-mcp-review@trefolio.com";
const DEFAULT_USERNAME = "claude_mcp_review";
const DEFAULT_DISPLAY = "Claude MCP Reviewer";

type Row = Record<string, unknown>;

interface Cli {
  sourceEmail: string;
  targetEmail: string;
  password: string | null;
  dryRun: boolean;
}

function parseCli(): Cli {
  const opts: Cli = {
    sourceEmail: DEFAULT_SOURCE,
    targetEmail: DEFAULT_TARGET,
    password: null,
    dryRun: false,
  };
  for (const arg of process.argv.slice(2)) {
    if (arg === "--dry-run") opts.dryRun = true;
    else if (arg.startsWith("--source=")) opts.sourceEmail = arg.slice("--source=".length);
    else if (arg.startsWith("--target=")) opts.targetEmail = arg.slice("--target=".length);
    else if (arg.startsWith("--password=")) opts.password = arg.slice("--password=".length);
  }
  return opts;
}

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

async function findUserByEmail(client: Awaited<ReturnType<typeof ensureInitialized>>, email: string) {
  const r = await client.execute({
    sql: "SELECT * FROM users WHERE lower(email)=lower(?) LIMIT 1",
    args: [email],
  });
  return r.rows[0] as Row | undefined;
}

async function deleteUserCascade(client: Awaited<ReturnType<typeof ensureInitialized>>, userId: string) {
  await client.execute({ sql: "DELETE FROM users WHERE id = ?", args: [userId] });
}

async function copyTableRows(
  client: Awaited<ReturnType<typeof ensureInitialized>>,
  table: string,
  sourceUserId: string,
  targetUserId: string,
  mutate: (row: Row) => Row,
): Promise<number> {
  const cols = await client.execute({ sql: `PRAGMA table_info(${table})` });
  const colNames = cols.rows.map((r) => str(r.name));
  const select = await client.execute({
    sql: `SELECT * FROM ${table} WHERE user_id = ?`,
    args: [sourceUserId],
  });
  if (select.rows.length === 0) return 0;

  const placeholders = colNames.map(() => "?").join(", ");
  const sql = `INSERT INTO ${table} (${colNames.join(", ")}) VALUES (${placeholders})`;
  let n = 0;
  for (const raw of select.rows) {
    const row = mutate({ ...(raw as Row) });
    await client.execute({ sql, args: colNames.map((c) => row[c] ?? null) });
    n++;
  }
  return n;
}

async function main() {
  const cli = parseCli();
  const client = await ensureInitialized();

  const source = await findUserByEmail(client, cli.sourceEmail);
  if (!source) throw new Error(`Source user not found: ${cli.sourceEmail}`);
  const sourceUserId = str(source.id);

  const existingTarget = await findUserByEmail(client, cli.targetEmail);
  const password = cli.password || `TrfReview-${randomUUID().slice(0, 8)}!`;
  const passwordHash = await hashPassword(password);

  if (cli.dryRun) {
    console.log("DRY RUN — would clone", cli.sourceEmail, "→", cli.targetEmail);
    console.log("sourceUserId", sourceUserId);
    if (existingTarget) console.log("would replace existing target id", existingTarget.id);
    return;
  }

  if (existingTarget) {
    console.log("Removing existing target user", existingTarget.id);
    await deleteUserCascade(client, str(existingTarget.id));
  }

  let idpSub = "";
  try {
    const imported = await importUser({
      email: cli.targetEmail,
      passwordHash,
      name: DEFAULT_DISPLAY,
      emailVerified: true,
      plan: "pro",
      locale: "en",
    });
    idpSub = imported.sub;
    console.log(`IdP user ${imported.created ? "created" : "updated"} sub=${idpSub}`);
  } catch (err) {
    console.warn("IdP import failed (continuing with local user only):", err);
  }

  const targetUserId = randomUUID();
  await client.execute({
    sql: `INSERT INTO users (
      id, username, password_hash, role, must_change_password,
      ai_calls_reset_at, email, display_name, avatar_url, auth_provider,
      google_id, apple_id, email_verified, plan, idp_sub, onboarding_completed
    ) VALUES (?, ?, ?, 'user', 0, datetime('now'), ?, ?, '', 'credentials', '', '', 1, 'pro', ?, 1)`,
    args: [targetUserId, DEFAULT_USERNAME, passwordHash, cli.targetEmail, DEFAULT_DISPLAY, idpSub],
  });

  const portfolioIdMap = new Map<string, string>();
  const portfolios = await client.execute({
    sql: "SELECT * FROM portfolios WHERE user_id = ? ORDER BY sort_order, created_at",
    args: [sourceUserId],
  });
  for (const p of portfolios.rows as Row[]) {
    const newId = randomUUID();
    portfolioIdMap.set(str(p.id), newId);
    await client.execute({
      sql: `INSERT INTO portfolios (id, user_id, name, is_default, sort_order, created_at, currency)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        newId,
        targetUserId,
        str(p.name),
        Number(p.is_default) || 0,
        Number(p.sort_order) || 0,
        str(p.created_at) || new Date().toISOString(),
        str(p.currency) || "EUR",
      ],
    });
  }
  console.log(`portfolios copied: ${portfolios.rows.length}`);

  const holdingIdMap = new Map<string, string>();
  const holdingsCopied = await copyTableRows(client, "holdings", sourceUserId, targetUserId, (row) => {
    const oldId = str(row.id);
    const newId = randomUUID();
    holdingIdMap.set(oldId, newId);
    const oldPortfolio = str(row.portfolio_id);
    return {
      ...row,
      id: newId,
      user_id: targetUserId,
      portfolio_id: portfolioIdMap.get(oldPortfolio) || oldPortfolio,
    };
  });
  console.log(`holdings copied: ${holdingsCopied}`);

  const cashCopied = await copyTableRows(client, "cash_entries", sourceUserId, targetUserId, (row) => ({
    ...row,
    id: randomUUID(),
    user_id: targetUserId,
    portfolio_id: portfolioIdMap.get(str(row.portfolio_id)) || str(row.portfolio_id),
  }));
  console.log(`cash_entries copied: ${cashCopied}`);

  const txCopied = await copyTableRows(client, "transactions", sourceUserId, targetUserId, (row) => {
    const oldHolding = str(row.holding_id);
    return {
      ...row,
      id: randomUUID(),
      user_id: targetUserId,
      portfolio_id: portfolioIdMap.get(str(row.portfolio_id)) || str(row.portfolio_id),
      holding_id: holdingIdMap.get(oldHolding) || oldHolding,
    };
  });
  console.log(`transactions copied: ${txCopied}`);

  const moatCopied = await copyTableRows(client, "moat_reports", sourceUserId, targetUserId, (row) => ({
    ...row,
    id: randomUUID(),
    user_id: targetUserId,
  }));
  console.log(`moat_reports copied: ${moatCopied}`);

  const settings = await client.execute({
    sql: "SELECT * FROM user_settings WHERE user_id = ?",
    args: [sourceUserId],
  });
  if (settings.rows.length > 0) {
    const s = settings.rows[0] as Row;
    await client.execute({
      sql: `INSERT INTO user_settings (user_id, provider, alpha_vantage_api_key, language)
            VALUES (?, ?, ?, ?)`,
      args: [targetUserId, str(s.provider) || "yahoo", "", str(s.language) || "en"],
    });
    console.log("user_settings copied");
  } else {
    await client.execute({
      sql: "INSERT INTO user_settings (user_id, provider, alpha_vantage_api_key, language) VALUES (?, 'yahoo', '', 'en')",
      args: [targetUserId],
    });
  }

  console.log("\n=== Claude MCP review account ready ===");
  console.log("email:", cli.targetEmail);
  console.log("password:", password);
  console.log("login:", "https://user.trefolio.com/sign-in");
  console.log("trefolio user id:", targetUserId);
  console.log("idp_sub:", idpSub || "(none — link via OIDC login)");
  console.log("MCP URL:", "https://trefolio.com/api/mcp/user/mcp");
  console.log("\nShare these credentials with Anthropic reviewers via the Connectors Directory portal.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
