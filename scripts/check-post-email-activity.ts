/**
 * One-off: did restored-holdings email recipients visit after send?
 *
 *   set -a && source .env.production.local && set +a
 *   npx tsx scripts/check-post-email-activity.ts
 */
import { ensureInitialized } from "../src/lib/db/client";

const EMAILS = [
  "vsant1@eclipso.eu",
  "stiofanobroin1@gmail.com",
  "hgzg2qgvaz@yzcalo.com",
  "fjgronda@gmail.com",
  "lpbartivas@gmail.com",
  "filipkochan4@gmail.com",
];

async function main() {
  const client = await ensureInitialized();

  for (const email of EMAILS) {
    const u = await client.execute({
      sql: `SELECT id, email, username, last_active_at FROM users WHERE lower(email) = lower(?)`,
      args: [email],
    });
    const row = u.rows[0];
    if (!row) {
      console.log(`${email}\tMISSING`);
      continue;
    }
    const userId = String(row.id);

    const sent = await client.execute({
      sql: `SELECT sent_at, status
            FROM email_sends
            WHERE user_id = ?
              AND (
                subject LIKE '%holdings are back%'
                OR subject LIKE '%posiciones del portfolio%'
              )
            ORDER BY sent_at ASC
            LIMIT 1`,
      args: [userId],
    });
    const emailAt = sent.rows[0] ? String(sent.rows[0].sent_at) : null;
    const lastActive = row.last_active_at != null ? String(row.last_active_at) : "";

    let sessionsAfter = 0;
    let lastSession = "";
    try {
      const sess = await client.execute({
        sql: emailAt
          ? `SELECT COUNT(*) AS c, MAX(created_at) AS mx FROM sessions WHERE user_id = ? AND created_at >= ?`
          : `SELECT COUNT(*) AS c, MAX(created_at) AS mx FROM sessions WHERE user_id = ?`,
        args: emailAt ? [userId, emailAt] : [userId],
      });
      sessionsAfter = Number(sess.rows[0]?.c || 0);
      lastSession = sess.rows[0]?.mx != null ? String(sess.rows[0].mx) : "";
    } catch {
      /* optional */
    }

    let analyticsAfter = 0;
    let lastAnalytics = "";
    try {
      const an = await client.execute({
        sql: emailAt
          ? `SELECT COUNT(*) AS c, MAX(created_at) AS mx FROM analytics_events WHERE user_id = ? AND created_at >= ?`
          : `SELECT COUNT(*) AS c, MAX(created_at) AS mx FROM analytics_events WHERE user_id = ?`,
        args: emailAt ? [userId, emailAt] : [userId],
      });
      analyticsAfter = Number(an.rows[0]?.c || 0);
      lastAnalytics = an.rows[0]?.mx != null ? String(an.rows[0].mx) : "";
    } catch {
      /* optional */
    }

    const visited =
      !!emailAt &&
      ((lastActive && lastActive >= emailAt) ||
        (lastSession && lastSession >= emailAt) ||
        (lastAnalytics && lastAnalytics >= emailAt));

    console.log(
      [
        email,
        `sent=${emailAt || "none"}`,
        `lastActive=${lastActive || "none"}`,
        `sessionsAfter=${sessionsAfter}`,
        `analyticsAfter=${analyticsAfter}`,
        visited ? "YES" : "NO",
      ].join("\t"),
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
