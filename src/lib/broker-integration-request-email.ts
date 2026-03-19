import {
  getEmailTemplateBySlug,
  logEmailSend,
} from "@/lib/db";
import { getTemplateSubject } from "@/lib/email-i18n";
import { htmlToPlainText, sendEmail } from "@/lib/email";

const TEMPLATE_SLUG = "broker-integration-request-received";

type SupportedLocale = "en" | "es" | "pt" | "de" | "fr" | "it";

const LOCALIZED_FALLBACKS: Record<
  Exclude<SupportedLocale, "en" | "es">,
  { subject: string; bodyText: string; bodyHtml: string }
> = {
  pt: {
    subject: "Recebemos seu pedido de integracao de corretora",
    bodyText:
      "Ola {{display_name}},\n\nRecebemos seu pedido para adicionar {{broker_name}} ao trefolio.\nNossa equipe vai avaliar com base em demanda, qualidade de dados e viabilidade tecnica.\n\nID do pedido: {{request_id}}\n\nAbrir Central de Importacao: {{base_url}}/import",
    bodyHtml:
      "<p>Ola {{display_name}},</p><p>Recebemos seu pedido para adicionar <strong>{{broker_name}}</strong> ao trefolio.</p><p>Nossa equipe vai avaliar com base em demanda, qualidade de dados e viabilidade tecnica.</p><p>ID do pedido: <strong>{{request_id}}</strong></p><p><a href='{{base_url}}/import'>Abrir Central de Importacao</a></p><p>Voce recebeu este e-mail do trefolio. <a href='{{unsubscribe_url}}'>Cancelar inscricao</a></p>",
  },
  de: {
    subject: "Wir haben deine Anfrage fuer eine Broker-Integration erhalten",
    bodyText:
      "Hallo {{display_name}},\n\nwir haben deine Anfrage erhalten, {{broker_name}} zu trefolio hinzuzufuegen.\nUnser Team bewertet Anfragen regelmaessig nach Nachfrage, Datenqualitaet und technischer Machbarkeit.\n\nAnfrage-ID: {{request_id}}\n\nImport Center oeffnen: {{base_url}}/import",
    bodyHtml:
      "<p>Hallo {{display_name}},</p><p>wir haben deine Anfrage erhalten, <strong>{{broker_name}}</strong> zu trefolio hinzuzufuegen.</p><p>Unser Team bewertet Anfragen regelmaessig nach Nachfrage, Datenqualitaet und technischer Machbarkeit.</p><p>Anfrage-ID: <strong>{{request_id}}</strong></p><p><a href='{{base_url}}/import'>Import Center oeffnen</a></p><p>Du hast diese E-Mail von trefolio erhalten. <a href='{{unsubscribe_url}}'>Abmelden</a></p>",
  },
  fr: {
    subject: "Nous avons bien recu votre demande d'integration de courtier",
    bodyText:
      "Bonjour {{display_name}},\n\nnous avons recu votre demande pour ajouter {{broker_name}} a trefolio.\nNotre equipe evaluera votre demande selon la demande, la qualite des donnees et la faisabilite technique.\n\nID de demande: {{request_id}}\n\nOuvrir le Centre d'import: {{base_url}}/import",
    bodyHtml:
      "<p>Bonjour {{display_name}},</p><p>nous avons recu votre demande pour ajouter <strong>{{broker_name}}</strong> a trefolio.</p><p>Notre equipe evaluera votre demande selon la demande, la qualite des donnees et la faisabilite technique.</p><p>ID de demande: <strong>{{request_id}}</strong></p><p><a href='{{base_url}}/import'>Ouvrir le Centre d'import</a></p><p>Vous avez recu cet e-mail de trefolio. <a href='{{unsubscribe_url}}'>Se desabonner</a></p>",
  },
  it: {
    subject: "Abbiamo ricevuto la tua richiesta di integrazione broker",
    bodyText:
      "Ciao {{display_name}},\n\nabbiamo ricevuto la tua richiesta per aggiungere {{broker_name}} a trefolio.\nIl nostro team valutera la richiesta in base a domanda, qualita dei dati e fattibilita tecnica.\n\nID richiesta: {{request_id}}\n\nApri Centro Import: {{base_url}}/import",
    bodyHtml:
      "<p>Ciao {{display_name}},</p><p>abbiamo ricevuto la tua richiesta per aggiungere <strong>{{broker_name}}</strong> a trefolio.</p><p>Il nostro team valutera la richiesta in base a domanda, qualita dei dati e fattibilita tecnica.</p><p>ID richiesta: <strong>{{request_id}}</strong></p><p><a href='{{base_url}}/import'>Apri Centro Import</a></p><p>Hai ricevuto questa e-mail da trefolio. <a href='{{unsubscribe_url}}'>Annulla iscrizione</a></p>",
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

export async function sendBrokerIntegrationRequestReceivedEmail(input: {
  userId: string;
  email: string;
  displayName: string;
  language: string;
  brokerName: string;
  requestId: string;
}): Promise<void> {
  const template = await getEmailTemplateBySlug(TEMPLATE_SLUG);
  if (!template) return;

  const locale = normalizeLocale(input.language);
  const baseUrl = getBaseUrl();
  const vars = {
    display_name: input.displayName || "there",
    broker_name: input.brokerName,
    request_id: input.requestId,
    base_url: baseUrl,
  };

  const fallback = locale !== "en" && locale !== "es" ? LOCALIZED_FALLBACKS[locale] : null;
  const subjectRaw = fallback
    ? fallback.subject
    : getTemplateSubject(TEMPLATE_SLUG, locale, template.subject, template.subjectEs);
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

  const result = await sendEmail({
    to: input.email,
    subject,
    html,
    text,
    userId: input.userId,
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
