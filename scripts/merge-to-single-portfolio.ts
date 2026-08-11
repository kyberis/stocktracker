#!/usr/bin/env npx tsx
/**
 * One-shot: consolidate every user to a single portfolio.
 *
 * For each user with >1 portfolio:
 * - Merge non-default portfolios that have holdings or cash into is_default
 * - Delete empty extras
 *
 * Usage:
 *   npx tsx scripts/merge-to-single-portfolio.ts --dry-run
 *   npx tsx scripts/merge-to-single-portfolio.ts --apply
 *   npx tsx scripts/merge-to-single-portfolio.ts --apply --email=user@example.com
 *
 * Uses TURSO / stocktracker_TURSO_* from the environment (.env.production.local etc.).
 */

import { ensureInitialized } from "../src/lib/db/client";
import { consolidateUserToSinglePortfolio, listPortfolios } from "../src/lib/db/portfolios";
import { str, num } from "../src/lib/db/helpers";

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run") || !args.includes("--apply");
  const emailArg = args.find((a) => a.startsWith("--email="));
  const emailFilter = emailArg ? emailArg.slice("--email=".length).trim().toLowerCase() : null;

  if (!args.includes("--apply") && !args.includes("--dry-run")) {
    console.log("Defaulting to --dry-run (pass --apply to write).");
  }

  const client = await ensureInitialized();

  let userRows;
  if (emailFilter) {
    const r = await client.execute({
      sql: "SELECT id, email FROM users WHERE lower(email) = ?",
      args: [emailFilter],
    });
    userRows = r.rows;
  } else {
    const r = await client.execute({
      sql: `SELECT u.id, u.email, COUNT(p.id) as cnt
            FROM users u
            JOIN portfolios p ON p.user_id = u.id
            GROUP BY u.id
            HAVING COUNT(p.id) > 1
            ORDER BY cnt DESC`,
      args: [],
    });
    userRows = r.rows;
  }

  console.log(`Users to process: ${userRows.length} (dryRun=${dryRun})`);

  let mergedUsers = 0;
  for (const row of userRows) {
    const userId = str(row.id);
    const email = str(row.email);
    const portfolios = await listPortfolios(userId);
    if (portfolios.length <= 1) {
      console.log(`skip ${email}: already ${portfolios.length} portfolio(s)`);
      continue;
    }

    const details: string[] = [];
    for (const p of portfolios) {
      const h = await client.execute({
        sql: "SELECT COUNT(*) as cnt FROM holdings WHERE user_id = ? AND portfolio_id = ?",
        args: [userId, p.id],
      });
      const c = await client.execute({
        sql: "SELECT COUNT(*) as cnt FROM cash_entries WHERE user_id = ? AND portfolio_id = ?",
        args: [userId, p.id],
      });
      details.push(
        `${p.name}${p.isDefault ? " [default]" : ""} (h=${num(h.rows[0]?.cnt)} c=${num(c.rows[0]?.cnt)})`,
      );
    }
    console.log(`\n${email} (${userId}): ${details.join(" | ")}`);

    if (dryRun) {
      const principal = portfolios.find((p) => p.isDefault) ?? portfolios[0];
      for (const p of portfolios) {
        if (p.id === principal.id) continue;
        const h = await client.execute({
          sql: "SELECT COUNT(*) as cnt FROM holdings WHERE user_id = ? AND portfolio_id = ?",
          args: [userId, p.id],
        });
        const c = await client.execute({
          sql: "SELECT COUNT(*) as cnt FROM cash_entries WHERE user_id = ? AND portfolio_id = ?",
          args: [userId, p.id],
        });
        const has = num(h.rows[0]?.cnt) > 0 || num(c.rows[0]?.cnt) > 0;
        console.log(`  would ${has ? "MERGE" : "DELETE empty"} → ${p.name}`);
      }
      continue;
    }

    const result = await consolidateUserToSinglePortfolio(userId);
    console.log(
      `  merged=[${result.merged.join(",")}] deletedEmpty=[${result.deletedEmpty.join(",")}] → principal ${result.principalId}`,
    );
    mergedUsers += 1;
  }

  const remaining = await client.execute({
    sql: `SELECT u.email, COUNT(p.id) as cnt
          FROM users u JOIN portfolios p ON p.user_id = u.id
          GROUP BY u.id HAVING COUNT(p.id) > 1`,
    args: [],
  });
  console.log(`\nDone. Applied users: ${mergedUsers}. Remaining multi-portfolio users: ${remaining.rows.length}`);
  for (const r of remaining.rows) {
    console.log(`  still multi: ${str(r.email)} (${num(r.cnt)})`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
