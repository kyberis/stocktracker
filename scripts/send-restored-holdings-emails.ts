/**
 * Support email to users whose empty ledgers were restored from AI import logs.
 *
 *   set -a && source .env.production.local && set +a
 *   npx tsx scripts/send-restored-holdings-emails.ts [--dry-run]
 */
import { ensureInitialized } from "../src/lib/db/client";
import { logEmailSend } from "../src/lib/db";
import { isMarketingEmailAllowed, sendEmail, htmlToPlainText } from "../src/lib/email";

const BASE = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://trefolio.com";
const DASHBOARD = `${BASE}/?utm_source=email&utm_medium=transactional&utm_campaign=support_holdings_fix`;

/** Restored accounts (exclude vsant1 — already emailed). */
const RECIPIENT_EMAILS = [
  "mjkorenhof@windowslive.com",
  "stiofanobroin1@gmail.com",
  "marc.greim@gmail.com",
  "hgzg2qgvaz@yzcalo.com",
  "fjgronda@gmail.com",
  "lpbartivas@gmail.com",
  "anurag.tiwari3108@gmail.com",
  "filipkochan4@gmail.com",
];

type Locale = "en" | "es";

const COPY: Record<
  Locale,
  { subject: string; title: string; body1: string; body2: string; cta: string; footer: string; unsub: string; disclaimer: string }
> = {
  en: {
    subject: "Your portfolio holdings are back",
    title: "We fixed your portfolio view",
    body1:
      "We noticed your holdings were missing after a portfolio import or reset. We investigated your account, fixed a platform bug that could hide imported positions, and restored your portfolio from your earlier import.",
    body2:
      "Your holdings should show again when you open trefolio. If anything looks incomplete, reply to this email and we\u2019ll take another look.",
    cta: "View your portfolio",
    footer: "You\u2019re receiving this because we resolved an issue on your trefolio account.",
    unsub: "Unsubscribe",
    disclaimer: "Portfolio tracking is for information only and is not investment advice.",
  },
  es: {
    subject: "Tus posiciones del portfolio ya están de nuevo",
    title: "Hemos corregido la vista de tu portfolio",
    body1:
      "Detectamos que tus posiciones faltaban tras una importaci\u00f3n o un reinicio de cartera. Revisamos tu cuenta, corregimos un fallo de la plataforma que pod\u00eda ocultar posiciones importadas y restauramos tu portfolio a partir de esa importaci\u00f3n.",
    body2:
      "Tus posiciones deber\u00edan mostrarse de nuevo al abrir trefolio. Si algo parece incompleto, responde a este email y lo revisamos.",
    cta: "Ver tu portfolio",
    footer: "Recibes este mensaje porque resolvimos un problema en tu cuenta de trefolio.",
    unsub: "Cancelar suscripci\u00f3n",
    disclaimer: "El seguimiento de carteras es solo informativo y no constituye asesoramiento de inversi\u00f3n.",
  },
};

function localeFromLanguage(lang: string | null | undefined): Locale {
  const l = (lang || "en").toLowerCase();
  if (l === "es" || l.startsWith("es-")) return "es";
  return "en";
}

function displayName(username: string, email: string): string {
  const u = (username || "").trim();
  if (u) return u;
  return email.split("@")[0] || "there";
}

function buildHtml(opts: { display: string; locale: Locale }): string {
  const c = COPY[opts.locale];
  const openDash = opts.locale === "es" ? "Abrir dashboard" : "Open dashboard";
  const unsubSuffix =
    opts.locale === "es" ? "de notificaciones por email" : "from email notifications";
  return `<!DOCTYPE html>
<html lang="${opts.locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#059669 0%,#10b981 100%);padding:32px 32px 28px;text-align:center;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr>
              <td style="width:36px;height:36px;vertical-align:middle;">
                <img src="${BASE}/email-logo@2x.png" alt="" width="36" height="36" style="display:block;width:36px;height:36px;border-radius:8px;" />
              </td>
              <td style="padding-left:10px;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">trefolio</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:32px 32px 0;">
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;">${c.title}</h1>
          <p style="margin:0 0 12px;font-size:15px;color:#475569;line-height:1.6;">${opts.locale === "es" ? "Hola" : "Hi"} ${opts.display},</p>
          <p style="margin:0 0 12px;font-size:15px;color:#475569;line-height:1.6;">${c.body1}</p>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">${c.body2}</p>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr><td align="center">
              <a href="${DASHBOARD}" target="_blank" style="display:inline-block;padding:14px 36px;background-color:#10b981;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:10px;letter-spacing:0.2px;">${c.cta}</a>
            </td></tr>
          </table>
          <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;line-height:1.5;">${c.disclaimer}</p>
        </td></tr>
        <tr><td style="padding:0 32px;"><div style="border-top:1px solid #e2e8f0;margin:24px 0;"></div></td></tr>
        <tr><td style="padding:0 32px 32px;">
          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.5;">
            ${c.footer}
            <a href="${BASE}/" style="color:#94a3b8;text-decoration:underline;">${openDash}</a>
          </p>
          <p style="margin:8px 0 0;font-size:11px;color:#94a3b8;text-align:center;line-height:1.5;">
            <a href="{{unsubscribe_url}}" style="color:#94a3b8;text-decoration:underline;">${c.unsub}</a> ${unsubSuffix}
          </p>
        </td></tr>
      </table>
      <p style="margin:24px 0 0;font-size:11px;color:#94a3b8;text-align:center;">
        &copy; ${new Date().getFullYear()} trefolio &mdash; Every portfolio deserves a bit of luck &#x1F340;
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const client = await ensureInitialized();

  for (const email of RECIPIENT_EMAILS) {
    const u = await client.execute({
      sql: `SELECT u.id, u.email, u.username, u.display_name,
                   s.language, s.email_notifications_enabled
            FROM users u
            LEFT JOIN user_settings s ON s.user_id = u.id
            WHERE lower(u.email) = lower(?)`,
      args: [email],
    });
    const row = u.rows[0];
    if (!row) {
      console.log(`SKIP ${email}: user not found`);
      continue;
    }

    const userId = String(row.id);
    const to = String(row.email);
    const locale = localeFromLanguage(row.language == null ? undefined : String(row.language));
    const display = displayName(String(row.username || row.display_name || ""), to);
    const marketingAllowed = await isMarketingEmailAllowed(userId);

    const unsub = await client.execute({
      sql: `SELECT COUNT(*) AS c FROM unsubscribe_tokens WHERE user_id = ? AND used_at IS NOT NULL`,
      args: [userId],
    });
    const already = await client.execute({
      sql: `SELECT COUNT(*) AS c FROM email_sends WHERE user_id = ? AND subject LIKE '%holdings are back%'`,
      args: [userId],
    });
    const unsubUsed = Number(unsub.rows[0]?.c || 0);
    const alreadySent = Number(already.rows[0]?.c || 0);

    console.log(
      `\n${to} lang=${locale} display=${display} emailOn=${row.email_notifications_enabled} marketingAllowed=${marketingAllowed} unsubUsed=${unsubUsed} already=${alreadySent}`,
    );

    if (!marketingAllowed || Number(row.email_notifications_enabled) === 0) {
      console.log(`SKIP ${to}: unsubscribed / email notifications disabled`);
      continue;
    }
    if (alreadySent > 0) {
      console.log(`SKIP ${to}: already sent holdings-are-back email`);
      continue;
    }

    const subject = COPY[locale].subject;
    const html = buildHtml({ display, locale });

    if (dryRun) {
      console.log(`DRY ${to}: would send "${subject}"`);
      continue;
    }

    const result = await sendEmail({
      to,
      subject,
      html,
      text: htmlToPlainText(html),
      userId,
      replyTo: "support@trefolio.com",
      transactional: true,
    });

    await logEmailSend({
      resendId: result.messageId || "",
      templateId: "",
      userId,
      emailTo: to,
      subject,
      bodyHtml: html,
      bodyText: htmlToPlainText(html),
      status: result.suppressed ? "suppressed" : result.success ? "sent" : "failed",
    });

    if (!result.success) {
      console.error(`FAIL ${to}:`, result.error, result.suppressed ? "(suppressed)" : "");
      continue;
    }
    console.log(`OK ${to} resendId=${result.messageId}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
