import { randomBytes } from "crypto";
import { ensureInitialized } from "@/lib/db/client";
import { str } from "@/lib/db/helpers";
import { isFeatureEnabled, getEmailTemplateBySlug } from "@/lib/db";
import { sendTrialInvitationEmail, getEmailLocale } from "@/lib/email";
import { sendLifecycleTemplateEmail } from "@/lib/lifecycle-email";
import { grantsAndTrialsRedirectToIdp } from "@/lib/idp/config";
import { syncTrialTokenToIdp } from "@/lib/idp/client";

const ACTIVATION_TEMPLATE_SLUG = "welcome-no-stocks";
const WINBACK_TEMPLATE_SLUG = "feature-ai-analysis";

export type LifecycleJobResult = Record<string, unknown>;

export async function runTrialInvitationsJob(): Promise<LifecycleJobResult> {
  if (!(await isFeatureEnabled("commerce_enabled"))) {
    return { skipped: true, reason: "commerce_enabled flag is off" };
  }
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
      if (grantsAndTrialsRedirectToIdp()) {
        try {
          await syncTrialTokenToIdp({
            email: str(row.email),
            trialToken: token,
          });
        } catch (err) {
          console.error(`[cron:trial-invitations] idp sync failed user ${userId}:`, err);
          errors++;
          continue;
        }
      }
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
      const sendResult = await sendTrialInvitationEmail(
        str(row.email),
        str(row.display_name),
        token,
        locale,
        userId,
      );
      if (!sendResult.suppressed) {
        invited++;
      }
    } catch (err) {
      console.error(`[cron:trial-invitations] user ${userId}:`, err);
      errors++;
    }
  }

  return { invited, errors };
}

export async function runLifecycleActivationJob(): Promise<LifecycleJobResult> {
  if (!(await isFeatureEnabled("lifecycle_activation_email_enabled"))) {
    return { skipped: true, reason: "lifecycle_activation_email_enabled flag is off" };
  }

  const template = await getEmailTemplateBySlug(ACTIVATION_TEMPLATE_SLUG);
  if (!template) {
    return { skipped: true, reason: `email template '${ACTIVATION_TEMPLATE_SLUG}' not found` };
  }

  const client = await ensureInitialized();
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
        slug: ACTIVATION_TEMPLATE_SLUG,
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
}

export async function runLifecycleWinbackJob(): Promise<LifecycleJobResult> {
  if (!(await isFeatureEnabled("lifecycle_winback_email_enabled"))) {
    return { skipped: true, reason: "lifecycle_winback_email_enabled flag is off" };
  }

  const template = await getEmailTemplateBySlug(WINBACK_TEMPLATE_SLUG);
  if (!template) {
    return { skipped: true, reason: `email template '${WINBACK_TEMPLATE_SLUG}' not found` };
  }

  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT u.id, u.email, u.display_name
FROM users u
WHERE u.email != ''
  AND u.email_verified = 1
  AND (
    (u.last_active_at != '' AND u.last_active_at <= datetime('now', '-14 days'))
    OR (u.last_active_at = '' AND u.created_at <= datetime('now', '-14 days'))
  )
  AND EXISTS (SELECT 1 FROM holdings h WHERE h.user_id = u.id)
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
        slug: WINBACK_TEMPLATE_SLUG,
        userId,
        email: str(row.email),
        displayName: str(row.display_name),
        locale: getEmailLocale(lang || "en"),
      });

      if (outcome.suppressed) suppressed++;
      else if (outcome.sent) sent++;
      else errors++;
    } catch (err) {
      console.error(`[cron:lifecycle-winback] user ${userId}:`, err);
      errors++;
    }
  }

  return { eligible: result.rows.length, sent, suppressed, errors };
}

/** Sequential so Resend and Turso are not hit by three batches at once. */
export async function runLifecycleEmailsJob(): Promise<LifecycleJobResult> {
  const invitations = await runTrialInvitationsJob();
  const activation = await runLifecycleActivationJob();
  const winback = await runLifecycleWinbackJob();
  return { invitations, activation, winback };
}
