import { NextRequest } from "next/server";
import { ensureInitialized } from "@/lib/db/client";
import { str } from "@/lib/db/helpers";
import { isFeatureEnabled, getEmailTemplateBySlug } from "@/lib/db";
import { getEmailLocale } from "@/lib/email";
import { sendLifecycleTemplateEmail } from "@/lib/lifecycle-email";
import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const TEMPLATE_SLUG = "welcome-no-stocks";

const runLifecycleActivation = withCronLogging("lifecycle-activation", async () => {
  if (!(await isFeatureEnabled("lifecycle_activation_email_enabled"))) {
    return { skipped: true, reason: "lifecycle_activation_email_enabled flag is off" };
  }

  const template = await getEmailTemplateBySlug(TEMPLATE_SLUG);
  if (!template) {
    return { skipped: true, reason: `email template '${TEMPLATE_SLUG}' not found` };
  }

  const client = await ensureInitialized();
  // Users who signed up 48-72h ago, still have zero holdings, and haven't
  // already received this specific template (checked against email_sends
  // rather than a dedicated column, matching the existing DB-seeded
  // template infrastructure).
  const result = await client.execute({
    sql: `SELECT u.id, u.email, u.display_name
FROM users u
WHERE u.email != ''
  AND u.email_verified = 1
  AND u.created_at <= datetime('now', '-48 hours')
  AND u.created_at > datetime('now', '-72 hours')
  AND NOT EXISTS (SELECT 1 FROM holdings h WHERE h.user_id = u.id)
  AND NOT EXISTS (
    SELECT 1 FROM user_settings us
    WHERE us.user_id = u.id AND us.email_notifications_enabled = 0
  )
  AND NOT EXISTS (
    SELECT 1 FROM email_sends es WHERE es.user_id = u.id AND es.template_id = ?
  )
LIMIT 100`,
    args: [template.id],
  });

  let sent = 0;
  let suppressed = 0;
  let errors = 0;

  for (const row of result.rows) {
    const userId = str(row.id);
    try {
      const langRes = await client.execute({
        sql: "SELECT language FROM user_settings WHERE user_id = ?",
        args: [userId],
      });
      const lang =
        langRes.rows.length > 0 && langRes.rows[0].language != null
          ? String(langRes.rows[0].language)
          : "en";

      const outcome = await sendLifecycleTemplateEmail({
        slug: TEMPLATE_SLUG,
        userId,
        email: str(row.email),
        displayName: str(row.display_name),
        locale: getEmailLocale(lang || "en"),
      });

      if (outcome.suppressed) suppressed++;
      else if (outcome.sent) sent++;
      else errors++;
    } catch (err) {
      console.error(`[cron:lifecycle-activation] user ${userId}:`, err);
      errors++;
    }
  }

  return { eligible: result.rows.length, sent, suppressed, errors };
});

function authorize(req: NextRequest) {
  return verifyCronAuth("lifecycle-activation", req);
}

export async function GET(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  return runLifecycleActivation();
}

export async function POST(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  return runLifecycleActivation();
}
