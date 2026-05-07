/**
 * One-shot transactional email announcing the unified trefolio account.
 *
 * Sends a short branded message to every confirmed trefolio user explaining
 * that their email + password now also works at clara.trefolio.com and
 * will.trefolio.com, and that one Pro subscription unlocks all three agents.
 *
 * Idempotent via the `unified_accounts_email_sent_at` user_settings flag.
 * Re-runs skip recipients that already received the message.
 *
 * Usage:
 *   RESEND_API_KEY=... \
 *   APP_BASE_URL=https://trefolio.com \
 *   npm run idp:send-unified-email -- [--limit=100] [--dry-run] [--locale=en]
 *
 * Phase 6 — see `knowledge/runbooks/unified-accounts-cutover.md`.
 */
import { ensureInitialized } from "../src/lib/db/client";
import { rowToDbUser } from "../src/lib/db/helpers";
import { sendEmail } from "../src/lib/email";

interface CliOptions {
  limit: number | null;
  dryRun: boolean;
  forceLocale: string | null;
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = { limit: null, dryRun: false, forceLocale: null };
  for (const arg of argv) {
    if (arg === "--dry-run") opts.dryRun = true;
    else if (arg.startsWith("--limit=")) opts.limit = Number(arg.slice("--limit=".length)) || null;
    else if (arg.startsWith("--locale=")) opts.forceLocale = arg.slice("--locale=".length);
  }
  return opts;
}

interface Body {
  subject: string;
  preheader: string;
  greeting: string;
  intro: string;
  bullets: string[];
  ctaLabel: string;
  ctaUrl: string;
  outro: string;
  signoff: string;
}

const COPY: Record<string, Body> = {
  en: {
    subject: "One trefolio account, three agents — same email & password",
    preheader: "Your trefolio sign-in now works on Clara and Will too.",
    greeting: "Hi {name},",
    intro:
      "We've unified accounts and billing across trefolio, Clara (clara.trefolio.com) and Will (will.trefolio.com). Same email, same password, three agents.",
    bullets: [
      "Sign in once at user.trefolio.com — your session works across all three apps.",
      "Free tier: 30 messages/day on Clara and Will, forever.",
      "Trefolio Pro (€7.99/mo or €59.99/yr) raises every limit to 200/day on Clara and Will, plus the full trefolio dashboard.",
      "Existing Pro subscribers: nothing changes — your subscription already unlocks the full team.",
    ],
    ctaLabel: "Open my unified account",
    ctaUrl: "https://user.trefolio.com",
    outro:
      "If something looks off, reply to this email and we'll sort it out.",
    signoff: "— The trefolio team",
  },
  es: {
    subject: "Una cuenta trefolio, tres agentes — mismo email y contraseña",
    preheader: "Tu sesión de trefolio ahora también funciona en Clara y Will.",
    greeting: "Hola {name},",
    intro:
      "Hemos unificado las cuentas y la facturación en trefolio, Clara (clara.trefolio.com) y Will (will.trefolio.com). Mismo email, misma contraseña, tres agentes.",
    bullets: [
      "Inicia sesión una vez en user.trefolio.com — tu sesión funciona en las tres apps.",
      "Gratis: 30 mensajes/día en Clara y Will, para siempre.",
      "Trefolio Pro (€7,99/mes o €59,99/año) sube todos los límites a 200/día en Clara y Will, además del panel completo de trefolio.",
      "Suscriptores Pro actuales: no cambia nada — tu suscripción ya desbloquea el equipo completo.",
    ],
    ctaLabel: "Abrir mi cuenta unificada",
    ctaUrl: "https://user.trefolio.com",
    outro:
      "Si ves algo raro, responde a este correo y lo solucionamos.",
    signoff: "— El equipo de trefolio",
  },
};

function pickLocale(userLocale: string | null, forced: string | null): "en" | "es" {
  const v = (forced ?? userLocale ?? "en").toLowerCase().slice(0, 2);
  return v === "es" ? "es" : "en";
}

function renderHtml(body: Body, name: string): string {
  const greeting = body.greeting.replace("{name}", escapeHtml(name || "there"));
  const bullets = body.bullets
    .map((b) => `<li style="margin:0 0 8px">${escapeHtml(b)}</li>`)
    .join("");
  return `<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#0f172a;background:#f8fafc;padding:24px;">
<div style="display:none;max-height:0;overflow:hidden;color:transparent;">${escapeHtml(body.preheader)}</div>
<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:28px;">
  <p style="margin:0 0 12px;font-weight:600;color:#0f172a;">${greeting}</p>
  <p style="margin:0 0 16px;color:#334155;">${escapeHtml(body.intro)}</p>
  <ul style="margin:0 0 20px;padding-left:18px;color:#334155;">${bullets}</ul>
  <p style="margin:0 0 24px;">
    <a href="${body.ctaUrl}" style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;font-weight:600;padding:10px 18px;border-radius:8px;">${escapeHtml(body.ctaLabel)}</a>
  </p>
  <p style="margin:0 0 16px;color:#475569;font-size:14px;">${escapeHtml(body.outro)}</p>
  <p style="margin:0;color:#64748b;font-size:14px;">${escapeHtml(body.signoff)}</p>
</div>
<p style="text-align:center;color:#94a3b8;font-size:12px;margin:16px 0 0;">
  trefolio · <a href="{{unsubscribe_url}}" style="color:#94a3b8;">unsubscribe</a>
</p>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const db = await ensureInitialized();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS unified_accounts_email_log (
      user_id TEXT PRIMARY KEY,
      sent_at TEXT NOT NULL,
      message_id TEXT
    )
  `);

  const limitClause = opts.limit ? `LIMIT ${opts.limit}` : "";
  const rs = await db.execute(`
    SELECT u.* FROM users u
    LEFT JOIN unified_accounts_email_log l ON l.user_id = u.id
    WHERE u.email IS NOT NULL AND u.email != '' AND u.email_verified = 1 AND l.user_id IS NULL
    ORDER BY u.created_at ASC
    ${limitClause}
  `);

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const row of rs.rows) {
    const user = rowToDbUser(row);
    const settingsRs = await db.execute({
      sql: `SELECT preferred_language FROM user_settings WHERE user_id = ? LIMIT 1`,
      args: [user.id],
    });
    const userLocale = (settingsRs.rows[0]?.preferred_language as string | undefined) ?? null;
    const locale = pickLocale(userLocale, opts.forceLocale);
    const body = COPY[locale];
    const html = renderHtml(body, user.display_name || user.username || "");

    if (opts.dryRun) {
      console.log(`[dry-run] -> ${user.email} (${locale})`);
      skipped++;
      continue;
    }

    const result = await sendEmail({
      to: user.email,
      subject: body.subject,
      html,
      transactional: false,
      userId: user.id,
    });

    if (result.success && !result.suppressed) {
      await db.execute({
        sql: `INSERT INTO unified_accounts_email_log (user_id, sent_at, message_id) VALUES (?, ?, ?)`,
        args: [user.id, new Date().toISOString(), result.messageId ?? ""],
      });
      sent++;
    } else if (result.suppressed) {
      await db.execute({
        sql: `INSERT INTO unified_accounts_email_log (user_id, sent_at, message_id) VALUES (?, ?, ?)`,
        args: [user.id, new Date().toISOString(), "SUPPRESSED"],
      });
      skipped++;
    } else {
      console.error(`Failed: ${user.email} -> ${result.error}`);
      failed++;
    }
  }

  console.log(`Done. sent=${sent} failed=${failed} skipped=${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
