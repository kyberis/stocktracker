/**
 * One-off support email to vsant1 after holdings restore.
 *
 *   set -a && source .env.production.local && set +a
 *   npx tsx scripts/send-vsant1-holdings-fixed-email.ts [--dry-run]
 */
import { sendEmail, htmlToPlainText } from "../src/lib/email";
import { logEmailSend } from "../src/lib/db";

const USER_ID = "d6ff4e06-7f73-4bff-99c7-1f9916ba87f0";
const TO = "vsant1@eclipso.eu";
const DISPLAY = "verasan";
const BASE = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://trefolio.com";
const DASHBOARD = `${BASE}/?utm_source=email&utm_medium=transactional&utm_campaign=support_holdings_fix`;

const SUBJECT = "Your portfolio holdings are back";

function buildHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
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
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;">We fixed your portfolio view</h1>
          <p style="margin:0 0 12px;font-size:15px;color:#475569;line-height:1.6;">Hi ${DISPLAY},</p>
          <p style="margin:0 0 12px;font-size:15px;color:#475569;line-height:1.6;">
            You reported that your holdings were missing after importing an Interactive Brokers CSV.
            We investigated your account, fixed a platform bug that could hide imported positions,
            and restored your portfolio from that import.
          </p>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
            Your holdings should show again when you open trefolio. If anything looks incomplete,
            reply to this email and we&rsquo;ll take another look.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr><td align="center">
              <a href="${DASHBOARD}" target="_blank" style="display:inline-block;padding:14px 36px;background-color:#10b981;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:10px;letter-spacing:0.2px;">View your portfolio</a>
            </td></tr>
          </table>
          <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;line-height:1.5;">
            Portfolio tracking is for information only and is not investment advice.
          </p>
        </td></tr>
        <tr><td style="padding:0 32px;"><div style="border-top:1px solid #e2e8f0;margin:24px 0;"></div></td></tr>
        <tr><td style="padding:0 32px 32px;">
          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.5;">
            You&rsquo;re receiving this because we resolved an issue on your trefolio account.
            <a href="${BASE}/" style="color:#94a3b8;text-decoration:underline;">Open dashboard</a>
          </p>
          <p style="margin:8px 0 0;font-size:11px;color:#94a3b8;text-align:center;line-height:1.5;">
            <a href="{{unsubscribe_url}}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a> from email notifications
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
  const html = buildHtml();
  console.log("To:", TO);
  console.log("Subject:", SUBJECT);
  console.log("--- HTML preview (first 500 chars) ---");
  console.log(html.slice(0, 500));
  if (dryRun) {
    console.log("dry-run — not sent");
    return;
  }

  const result = await sendEmail({
    to: TO,
    subject: SUBJECT,
    html,
    text: htmlToPlainText(html),
    userId: USER_ID,
    replyTo: "support@trefolio.com",
    transactional: true,
  });

  await logEmailSend({
    resendId: result.messageId || "",
    templateId: "",
    userId: USER_ID,
    emailTo: TO,
    subject: SUBJECT,
    bodyHtml: html,
    bodyText: htmlToPlainText(html),
    status: result.suppressed ? "suppressed" : result.success ? "sent" : "failed",
  });

  if (!result.success) {
    console.error("Send failed:", result.error, result.suppressed ? "(suppressed)" : "");
    process.exit(1);
  }
  console.log("Sent. resendId:", result.messageId);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
