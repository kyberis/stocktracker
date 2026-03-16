import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { str, num } from "./helpers";

/* ── Types ── */

export interface EmailTemplate {
  id: string;
  slug: string;
  name: string;
  subject: string;
  subjectEs: string;
  bodyHtml: string;
  bodyHtmlEs: string;
  bodyText: string;
  bodyTextEs: string;
  category: string;
  experienceLevel: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailSend {
  id: string;
  resendId: string;
  templateId: string;
  userId: string;
  emailTo: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  sentAt: string;
  status: string;
  deliveredAt: string;
  openedAt: string;
  openCount: number;
  clickedAt: string;
  bouncedAt: string;
  failedAt: string;
}

/* ── Template CRUD ── */

export async function listEmailTemplates(): Promise<EmailTemplate[]> {
  const client = await ensureInitialized();
  const result = await client.execute(
    "SELECT * FROM email_templates ORDER BY category ASC, name ASC"
  );
  return result.rows.map(mapTemplateRow);
}

export async function getEmailTemplate(id: string): Promise<EmailTemplate | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM email_templates WHERE id = ?",
    args: [id],
  });
  if (result.rows.length === 0) return null;
  return mapTemplateRow(result.rows[0]);
}

export async function getEmailTemplateBySlug(slug: string): Promise<EmailTemplate | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM email_templates WHERE slug = ?",
    args: [slug],
  });
  if (result.rows.length === 0) return null;
  return mapTemplateRow(result.rows[0]);
}

export async function createEmailTemplate(data: {
  slug: string;
  name: string;
  subject: string;
  subjectEs?: string;
  bodyHtml: string;
  bodyHtmlEs?: string;
  bodyText?: string;
  bodyTextEs?: string;
  category?: string;
  experienceLevel?: string;
}): Promise<EmailTemplate> {
  const client = await ensureInitialized();
  const id = randomUUID();
  await client.execute({
    sql: `INSERT INTO email_templates (id, slug, name, subject, subject_es, body_html, body_html_es, body_text, body_text_es, category, experience_level)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, data.slug, data.name, data.subject, data.subjectEs || "",
      data.bodyHtml, data.bodyHtmlEs || "", data.bodyText || "", data.bodyTextEs || "",
      data.category || "general", data.experienceLevel || "",
    ],
  });
  const template = await getEmailTemplate(id);
  if (!template) throw new Error("Failed to create email template");
  return template;
}

export async function updateEmailTemplate(
  id: string,
  data: Partial<{
    slug: string;
    name: string;
    subject: string;
    subjectEs: string;
    bodyHtml: string;
    bodyHtmlEs: string;
    bodyText: string;
    bodyTextEs: string;
    category: string;
    experienceLevel: string;
  }>
): Promise<EmailTemplate | null> {
  const existing = await getEmailTemplate(id);
  if (!existing) return null;

  const client = await ensureInitialized();
  await client.execute({
    sql: `UPDATE email_templates SET
            slug = ?, name = ?, subject = ?, subject_es = ?,
            body_html = ?, body_html_es = ?, body_text = ?, body_text_es = ?,
            category = ?, experience_level = ?, updated_at = datetime('now')
          WHERE id = ?`,
    args: [
      data.slug ?? existing.slug,
      data.name ?? existing.name,
      data.subject ?? existing.subject,
      data.subjectEs ?? existing.subjectEs,
      data.bodyHtml ?? existing.bodyHtml,
      data.bodyHtmlEs ?? existing.bodyHtmlEs,
      data.bodyText ?? existing.bodyText,
      data.bodyTextEs ?? existing.bodyTextEs,
      data.category ?? existing.category,
      data.experienceLevel ?? existing.experienceLevel,
      id,
    ],
  });
  return getEmailTemplate(id);
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({ sql: "DELETE FROM email_templates WHERE id = ?", args: [id] });
}

/* ── Email Sends ── */

export async function logEmailSend(data: {
  resendId?: string;
  templateId?: string;
  userId: string;
  emailTo: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  status?: string;
}): Promise<string> {
  const client = await ensureInitialized();
  const id = randomUUID();
  await client.execute({
    sql: `INSERT INTO email_sends (id, resend_id, template_id, user_id, email_to, subject, body_html, body_text, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      data.resendId || "",
      data.templateId || "",
      data.userId,
      data.emailTo,
      data.subject,
      data.bodyHtml,
      data.bodyText || "",
      data.status || "sent",
    ],
  });
  return id;
}

export async function listEmailSendsForUser(userId: string, limit = 50): Promise<EmailSend[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM email_sends WHERE user_id = ? ORDER BY sent_at DESC LIMIT ?",
    args: [userId, limit],
  });
  return result.rows.map(mapSendRow);
}

export async function listEmailSends(limit = 100): Promise<EmailSend[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM email_sends ORDER BY sent_at DESC LIMIT ?",
    args: [limit],
  });
  return result.rows.map(mapSendRow);
}

export async function getEmailSendByResendId(resendId: string): Promise<EmailSend | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM email_sends WHERE resend_id = ?",
    args: [resendId],
  });
  if (result.rows.length === 0) return null;
  return mapSendRow(result.rows[0]);
}

export async function updateEmailSendStatus(
  resendId: string,
  event: string,
  timestamp: string
): Promise<void> {
  const client = await ensureInitialized();
  const existing = await getEmailSendByResendId(resendId);
  if (!existing) return;

  switch (event) {
    case "email.delivered":
      await client.execute({
        sql: "UPDATE email_sends SET status = 'delivered', delivered_at = ? WHERE resend_id = ? AND status = 'sent'",
        args: [timestamp, resendId],
      });
      break;
    case "email.opened":
      await client.execute({
        sql: `UPDATE email_sends SET
                status = CASE WHEN status IN ('sent', 'delivered') THEN 'opened' ELSE status END,
                opened_at = CASE WHEN opened_at = '' THEN ? ELSE opened_at END,
                open_count = open_count + 1
              WHERE resend_id = ?`,
        args: [timestamp, resendId],
      });
      break;
    case "email.clicked":
      await client.execute({
        sql: `UPDATE email_sends SET
                status = CASE WHEN status IN ('sent', 'delivered', 'opened') THEN 'clicked' ELSE status END,
                clicked_at = CASE WHEN clicked_at = '' THEN ? ELSE clicked_at END
              WHERE resend_id = ?`,
        args: [timestamp, resendId],
      });
      break;
    case "email.bounced":
      await client.execute({
        sql: "UPDATE email_sends SET status = 'bounced', bounced_at = ? WHERE resend_id = ?",
        args: [timestamp, resendId],
      });
      break;
    case "email.failed":
      await client.execute({
        sql: "UPDATE email_sends SET status = 'failed', failed_at = ? WHERE resend_id = ?",
        args: [timestamp, resendId],
      });
      break;
    case "email.complained":
      await client.execute({
        sql: "UPDATE email_sends SET status = 'bounced', bounced_at = ? WHERE resend_id = ?",
        args: [timestamp, resendId],
      });
      break;
  }
}

export async function getTemplateStats(templateId: string): Promise<{
  totalSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
}> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status IN ('delivered','opened','clicked') THEN 1 ELSE 0 END) as delivered,
            SUM(CASE WHEN status IN ('opened','clicked') THEN 1 ELSE 0 END) as opened,
            SUM(CASE WHEN status = 'clicked' THEN 1 ELSE 0 END) as clicked,
            SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END) as bounced
          FROM email_sends WHERE template_id = ?`,
    args: [templateId],
  });
  const r = result.rows[0];
  return {
    totalSent: num(r?.total),
    delivered: num(r?.delivered),
    opened: num(r?.opened),
    clicked: num(r?.clicked),
    bounced: num(r?.bounced),
  };
}

/* ── Row mappers ── */

function mapTemplateRow(r: import("@libsql/client").Row): EmailTemplate {
  return {
    id: str(r.id),
    slug: str(r.slug),
    name: str(r.name),
    subject: str(r.subject),
    subjectEs: str(r.subject_es),
    bodyHtml: str(r.body_html),
    bodyHtmlEs: str(r.body_html_es),
    bodyText: str(r.body_text),
    bodyTextEs: str(r.body_text_es),
    category: str(r.category),
    experienceLevel: str(r.experience_level),
    createdAt: str(r.created_at),
    updatedAt: str(r.updated_at),
  };
}

function mapSendRow(r: import("@libsql/client").Row): EmailSend {
  return {
    id: str(r.id),
    resendId: str(r.resend_id),
    templateId: str(r.template_id),
    userId: str(r.user_id),
    emailTo: str(r.email_to),
    subject: str(r.subject),
    bodyHtml: str(r.body_html),
    bodyText: str(r.body_text),
    sentAt: str(r.sent_at),
    status: str(r.status),
    deliveredAt: str(r.delivered_at),
    openedAt: str(r.opened_at),
    openCount: num(r.open_count),
    clickedAt: str(r.clicked_at),
    bouncedAt: str(r.bounced_at),
    failedAt: str(r.failed_at),
  };
}
