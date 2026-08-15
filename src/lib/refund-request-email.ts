import {
  getEmailTemplateBySlug,
  logEmailSend,
} from "@/lib/db";
import { getTemplateSubject } from "@/lib/email-i18n";
import { htmlToPlainText, sendEmail } from "@/lib/email";

type SupportedLocale = "en" | "es" | "pt" | "de" | "fr" | "it";

interface LocalizedContent {
  subject: string;
  bodyText: string;
  bodyHtml: string;
}

const RECEIVED_FALLBACKS: Record<Exclude<SupportedLocale, "en" | "es">, LocalizedContent> = {
  pt: {
    subject: "Recebemos seu pedido de reembolso",
    bodyText: "Ola {{display_name}},\n\nRecebemos seu pedido de reembolso e nossa equipe ira revisa-lo em breve.\nVoce recebera uma resposta por email em ate 1-3 dias uteis.\n\nID do pedido: {{request_id}}",
    bodyHtml: "<p>Ola {{display_name}},</p><p>Recebemos seu pedido de reembolso e nossa equipe ira revisa-lo em breve.</p><p>Voce recebera uma resposta por email em ate 1-3 dias uteis.</p><p>ID do pedido: <strong>{{request_id}}</strong></p><p>Voce recebeu este e-mail do trefolio. <a href='{{unsubscribe_url}}'>Cancelar inscricao</a></p>",
  },
  de: {
    subject: "Wir haben deine Erstattungsanfrage erhalten",
    bodyText: "Hallo {{display_name}},\n\nwir haben deine Erstattungsanfrage erhalten und unser Team wird sie in Kuerze pruefen.\nDu erhaeltst innerhalb von 1-3 Werktagen eine Antwort per E-Mail.\n\nAnfrage-ID: {{request_id}}",
    bodyHtml: "<p>Hallo {{display_name}},</p><p>Wir haben deine Erstattungsanfrage erhalten und unser Team wird sie in Kuerze pruefen.</p><p>Du erhaeltst innerhalb von 1-3 Werktagen eine Antwort per E-Mail.</p><p>Anfrage-ID: <strong>{{request_id}}</strong></p><p>Du hast diese E-Mail von trefolio erhalten. <a href='{{unsubscribe_url}}'>Abmelden</a></p>",
  },
  fr: {
    subject: "Nous avons bien recu votre demande de remboursement",
    bodyText: "Bonjour {{display_name}},\n\nnous avons recu votre demande de remboursement et notre equipe l'examinera sous peu.\nVous recevrez une reponse par email dans un delai de 1 a 3 jours ouvrables.\n\nID de demande: {{request_id}}",
    bodyHtml: "<p>Bonjour {{display_name}},</p><p>Nous avons recu votre demande de remboursement et notre equipe l'examinera sous peu.</p><p>Vous recevrez une reponse par email dans un delai de 1 a 3 jours ouvrables.</p><p>ID de demande: <strong>{{request_id}}</strong></p><p>Vous avez recu cet e-mail de trefolio. <a href='{{unsubscribe_url}}'>Se desabonner</a></p>",
  },
  it: {
    subject: "Abbiamo ricevuto la tua richiesta di rimborso",
    bodyText: "Ciao {{display_name}},\n\nabbiamo ricevuto la tua richiesta di rimborso e il nostro team la esaminerà a breve.\nRiceverai una risposta via email entro 1-3 giorni lavorativi.\n\nID richiesta: {{request_id}}",
    bodyHtml: "<p>Ciao {{display_name}},</p><p>Abbiamo ricevuto la tua richiesta di rimborso e il nostro team la esaminerà a breve.</p><p>Riceverai una risposta via email entro 1-3 giorni lavorativi.</p><p>ID richiesta: <strong>{{request_id}}</strong></p><p>Hai ricevuto questa e-mail da trefolio. <a href='{{unsubscribe_url}}'>Annulla iscrizione</a></p>",
  },
};

const APPROVED_FALLBACKS: Record<Exclude<SupportedLocale, "en" | "es">, LocalizedContent> = {
  pt: {
    subject: "Seu pedido de reembolso foi aprovado",
    bodyText: "Ola {{display_name}},\n\nSeu pedido de reembolso foi aprovado. O reembolso sera processado e devera aparecer no seu metodo de pagamento original em ate 5-10 dias uteis.\n\nID do pedido: {{request_id}}\n\nSe tiver alguma duvida, entre em contato conosco em support@trefolio.com.",
    bodyHtml: "<p>Ola {{display_name}},</p><p>Seu pedido de reembolso foi aprovado. O reembolso sera processado e devera aparecer no seu metodo de pagamento original em ate 5-10 dias uteis.</p><p>ID do pedido: <strong>{{request_id}}</strong></p><p>Se tiver alguma duvida, entre em contato conosco em <a href='mailto:support@trefolio.com'>support@trefolio.com</a>.</p><p>Voce recebeu este e-mail do trefolio. <a href='{{unsubscribe_url}}'>Cancelar inscricao</a></p>",
  },
  de: {
    subject: "Deine Erstattungsanfrage wurde genehmigt",
    bodyText: "Hallo {{display_name}},\n\ndeine Erstattungsanfrage wurde genehmigt. Die Erstattung wird bearbeitet und sollte innerhalb von 5-10 Werktagen auf deinem urspruenglichen Zahlungsmittel erscheinen.\n\nAnfrage-ID: {{request_id}}\n\nBei Fragen kontaktiere uns unter support@trefolio.com.",
    bodyHtml: "<p>Hallo {{display_name}},</p><p>Deine Erstattungsanfrage wurde genehmigt. Die Erstattung wird bearbeitet und sollte innerhalb von 5-10 Werktagen auf deinem urspruenglichen Zahlungsmittel erscheinen.</p><p>Anfrage-ID: <strong>{{request_id}}</strong></p><p>Bei Fragen kontaktiere uns unter <a href='mailto:support@trefolio.com'>support@trefolio.com</a>.</p><p>Du hast diese E-Mail von trefolio erhalten. <a href='{{unsubscribe_url}}'>Abmelden</a></p>",
  },
  fr: {
    subject: "Votre demande de remboursement a ete approuvee",
    bodyText: "Bonjour {{display_name}},\n\nvotre demande de remboursement a ete approuvee. Le remboursement sera traite et devrait apparaitre sur votre moyen de paiement d'origine dans un delai de 5 a 10 jours ouvrables.\n\nID de demande: {{request_id}}\n\nSi vous avez des questions, contactez-nous a support@trefolio.com.",
    bodyHtml: "<p>Bonjour {{display_name}},</p><p>Votre demande de remboursement a ete approuvee. Le remboursement sera traite et devrait apparaitre sur votre moyen de paiement d'origine dans un delai de 5 a 10 jours ouvrables.</p><p>ID de demande: <strong>{{request_id}}</strong></p><p>Si vous avez des questions, contactez-nous a <a href='mailto:support@trefolio.com'>support@trefolio.com</a>.</p><p>Vous avez recu cet e-mail de trefolio. <a href='{{unsubscribe_url}}'>Se desabonner</a></p>",
  },
  it: {
    subject: "La tua richiesta di rimborso e stata approvata",
    bodyText: "Ciao {{display_name}},\n\nla tua richiesta di rimborso e stata approvata. Il rimborso verra elaborato e dovrebbe apparire sul tuo metodo di pagamento originale entro 5-10 giorni lavorativi.\n\nID richiesta: {{request_id}}\n\nSe hai domande, contattaci a support@trefolio.com.",
    bodyHtml: "<p>Ciao {{display_name}},</p><p>La tua richiesta di rimborso e stata approvata. Il rimborso verra elaborato e dovrebbe apparire sul tuo metodo di pagamento originale entro 5-10 giorni lavorativi.</p><p>ID richiesta: <strong>{{request_id}}</strong></p><p>Se hai domande, contattaci a <a href='mailto:support@trefolio.com'>support@trefolio.com</a>.</p><p>Hai ricevuto questa e-mail da trefolio. <a href='{{unsubscribe_url}}'>Annulla iscrizione</a></p>",
  },
};

const REJECTED_FALLBACKS: Record<Exclude<SupportedLocale, "en" | "es">, LocalizedContent> = {
  pt: {
    subject: "Atualizacao sobre seu pedido de reembolso",
    bodyText: "Ola {{display_name}},\n\nApos analisar seu pedido de reembolso, nao conseguimos processar um reembolso no momento.\n\nID do pedido: {{request_id}}\n\nSe acredita que houve um erro ou tem mais perguntas, entre em contato conosco em support@trefolio.com.",
    bodyHtml: "<p>Ola {{display_name}},</p><p>Apos analisar seu pedido de reembolso, nao conseguimos processar um reembolso no momento.</p><p>ID do pedido: <strong>{{request_id}}</strong></p><p>Se acredita que houve um erro ou tem mais perguntas, entre em contato conosco em <a href='mailto:support@trefolio.com'>support@trefolio.com</a>.</p><p>Voce recebeu este e-mail do trefolio. <a href='{{unsubscribe_url}}'>Cancelar inscricao</a></p>",
  },
  de: {
    subject: "Update zu deiner Erstattungsanfrage",
    bodyText: "Hallo {{display_name}},\n\nnach Pruefung deiner Erstattungsanfrage koennen wir derzeit keine Erstattung vornehmen.\n\nAnfrage-ID: {{request_id}}\n\nWenn du glaubst, dass ein Fehler vorliegt, kontaktiere uns unter support@trefolio.com.",
    bodyHtml: "<p>Hallo {{display_name}},</p><p>Nach Pruefung deiner Erstattungsanfrage koennen wir derzeit keine Erstattung vornehmen.</p><p>Anfrage-ID: <strong>{{request_id}}</strong></p><p>Wenn du glaubst, dass ein Fehler vorliegt, kontaktiere uns unter <a href='mailto:support@trefolio.com'>support@trefolio.com</a>.</p><p>Du hast diese E-Mail von trefolio erhalten. <a href='{{unsubscribe_url}}'>Abmelden</a></p>",
  },
  fr: {
    subject: "Mise a jour concernant votre demande de remboursement",
    bodyText: "Bonjour {{display_name}},\n\napres examen de votre demande de remboursement, nous ne pouvons pas traiter de remboursement pour le moment.\n\nID de demande: {{request_id}}\n\nSi vous pensez qu'il s'agit d'une erreur, contactez-nous a support@trefolio.com.",
    bodyHtml: "<p>Bonjour {{display_name}},</p><p>Apres examen de votre demande de remboursement, nous ne pouvons pas traiter de remboursement pour le moment.</p><p>ID de demande: <strong>{{request_id}}</strong></p><p>Si vous pensez qu'il s'agit d'une erreur, contactez-nous a <a href='mailto:support@trefolio.com'>support@trefolio.com</a>.</p><p>Vous avez recu cet e-mail de trefolio. <a href='{{unsubscribe_url}}'>Se desabonner</a></p>",
  },
  it: {
    subject: "Aggiornamento sulla tua richiesta di rimborso",
    bodyText: "Ciao {{display_name}},\n\ndopo aver esaminato la tua richiesta di rimborso, non siamo in grado di elaborare un rimborso al momento.\n\nID richiesta: {{request_id}}\n\nSe ritieni che si tratti di un errore, contattaci a support@trefolio.com.",
    bodyHtml: "<p>Ciao {{display_name}},</p><p>Dopo aver esaminato la tua richiesta di rimborso, non siamo in grado di elaborare un rimborso al momento.</p><p>ID richiesta: <strong>{{request_id}}</strong></p><p>Se ritieni che si tratti di un errore, contattaci a <a href='mailto:support@trefolio.com'>support@trefolio.com</a>.</p><p>Hai ricevuto questa e-mail da trefolio. <a href='{{unsubscribe_url}}'>Annulla iscrizione</a></p>",
  },
};

function normalizeLocale(language: string): SupportedLocale {
  const base = language.toLowerCase().split("-")[0] as SupportedLocale;
  if (["en", "es", "pt", "de", "fr", "it"].includes(base)) return base;
  return "en";
}

function getBaseUrl(): string {
  return process.env.APP_BASE_URL || "http://localhost:3000";
}

function applyTokens(input: string, vars: Record<string, string>): string {
  let output = input;
  for (const [key, value] of Object.entries(vars)) {
    const token = `{{${key}}}`;
    output = output.split(token).join(value);
  }
  return output;
}

interface RefundEmailInput {
  userId: string;
  email: string;
  displayName: string;
  language: string;
  requestId: string;
}

async function sendRefundTemplateEmail(
  slug: string,
  fallbacks: Record<Exclude<SupportedLocale, "en" | "es">, LocalizedContent>,
  input: RefundEmailInput,
): Promise<void> {
  const template = await getEmailTemplateBySlug(slug);
  if (!template) return;

  const locale = normalizeLocale(input.language);
  const vars = {
    display_name: input.displayName || "there",
    request_id: input.requestId,
    base_url: getBaseUrl(),
  };

  const fallback = locale !== "en" && locale !== "es" ? fallbacks[locale] : null;
  const subjectRaw = fallback
    ? fallback.subject
    : getTemplateSubject(slug, locale, template.subject, template.subjectEs);
  const htmlRaw = fallback
    ? fallback.bodyHtml
    : locale === "es" && template.bodyHtmlEs
      ? template.bodyHtmlEs
      : template.bodyHtml;
  const textRaw = fallback
    ? fallback.bodyText
    : locale === "es" && template.bodyTextEs
      ? template.bodyTextEs
      : template.bodyText;
  const subject = applyTokens(subjectRaw, vars);
  const html = applyTokens(htmlRaw, vars);
  const text = applyTokens(textRaw || htmlToPlainText(htmlRaw), vars);

  const automationKey =
    slug === "refund-request-approved"
      ? "refund-approved"
      : slug === "refund-request-rejected"
        ? "refund-rejected"
        : "refund-received";
  const result = await sendEmail({
    to: input.email,
    subject,
    html,
    text,
    userId: input.userId,
    transactional: true,
    automationKey,
  });

  await logEmailSend({
    resendId: result.messageId || "",
    templateId: template.id,
    userId: input.userId,
    emailTo: input.email,
    subject,
    bodyHtml: html,
    bodyText: text,
    status: result.success ? "sent" : "failed",
  });
}

export async function sendRefundRequestReceivedEmail(
  input: RefundEmailInput,
): Promise<void> {
  return sendRefundTemplateEmail("refund-request-received", RECEIVED_FALLBACKS, input);
}

export async function sendRefundRequestApprovedEmail(
  input: RefundEmailInput,
): Promise<void> {
  return sendRefundTemplateEmail("refund-request-approved", APPROVED_FALLBACKS, input);
}

export async function sendRefundRequestRejectedEmail(
  input: RefundEmailInput,
): Promise<void> {
  return sendRefundTemplateEmail("refund-request-rejected", REJECTED_FALLBACKS, input);
}
