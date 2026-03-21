import { randomBytes } from "crypto";
import { NextRequest } from "next/server";
import { ensureInitialized } from "@/lib/db/client";
import { str } from "@/lib/db/helpers";
import { isFeatureEnabled } from "@/lib/db";
import { sendTrialInvitationEmail, getEmailLocale } from "@/lib/email";
import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const runTrialInvitations = withCronLogging("trial-invitations", async () => {
  if (!(await isFeatureEnabled("pro_trial_enabled"))) {
    return { skipped: true, reason: "pro_trial_enabled flag is off" };
  }
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT u.id, u.email, u.display_name, u.experience_level
FROM users u
WHERE u.plan = 'free'
  AND u.trial_invited_at = ''
  AND u.trial_activated_at = ''
  AND u.email_verified = 1
  AND u.created_at <= datetime('now', '-7 days')
  AND u.created_at > datetime('now', '-8 days')
  AND EXISTS (
    SELECT 1 FROM holdings h WHERE h.user_id = u.id
    UNION ALL
    SELECT 1 FROM transactions t WHERE t.user_id = u.id
  )
LIMIT 100`,
    args: [],
  });

  let invited = 0;
  let errors = 0;

  for (const row of result.rows) {
    const userId = str(row.id);
    try {
      const token = randomBytes(32).toString("hex");
      await client.execute({
        sql: "UPDATE users SET trial_token = ?, trial_invited_at = datetime('now') WHERE id = ?",
        args: [token, userId],
      });
      const langRes = await client.execute({
        sql: "SELECT language FROM user_settings WHERE user_id = ?",
        args: [userId],
      });
      const lang =
        langRes.rows.length > 0 && langRes.rows[0].language != null
          ? String(langRes.rows[0].language)
          : "en";
      const locale = getEmailLocale(lang || "en");
      await sendTrialInvitationEmail(
        str(row.email),
        str(row.display_name),
        token,
        locale,
        userId,
      );
      invited++;
    } catch (err) {
      console.error(`[cron:trial-invitations] user ${userId}:`, err);
      errors++;
    }
  }

  return { invited, errors };
});

function authorize(req: NextRequest) {
  return verifyCronAuth("trial-invitations", req.headers.get("authorization"));
}

export async function GET(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  return runTrialInvitations();
}

export async function POST(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  return runTrialInvitations();
}
