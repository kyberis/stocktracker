import twilio from "twilio";
import type { Language } from "./types";

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return null;
  return twilio(accountSid, authToken);
}

function getWhatsAppFrom(): string {
  return process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+18705213951";
}

function getVerifyChannel(): "sms" | "whatsapp" {
  const explicit = process.env.TWILIO_VERIFY_CHANNEL;
  if (explicit === "whatsapp" || explicit === "sms") return explicit;
  const baseUrl = process.env.APP_BASE_URL || "";
  return baseUrl.includes("localhost") ? "sms" : "whatsapp";
}

const WELCOME_MESSAGES: Record<string, string> = {
  en: "Welcome to trefolio! 🎉\n\nYour WhatsApp number has been verified successfully. You'll receive price alerts and notifications right here.\n\nManage your alerts at: ",
  es: "¡Bienvenido a trefolio! 🎉\n\nTu número de WhatsApp ha sido verificado correctamente. Recibirás alertas de precio y notificaciones aquí.\n\nGestiona tus alertas en: ",
  fr: "Bienvenue sur trefolio ! 🎉\n\nVotre numéro WhatsApp a été vérifié avec succès. Vous recevrez vos alertes de prix et notifications ici.\n\nGérez vos alertes sur : ",
  de: "Willkommen bei trefolio! 🎉\n\nDeine WhatsApp-Nummer wurde erfolgreich verifiziert. Du erhältst Preisalarme und Benachrichtigungen direkt hier.\n\nVerwalte deine Alarme unter: ",
  it: "Benvenuto su trefolio! 🎉\n\nIl tuo numero WhatsApp è stato verificato con successo. Riceverai avvisi sui prezzi e notifiche qui.\n\nGestisci i tuoi avvisi su: ",
  pt: "Bem-vindo ao trefolio! 🎉\n\nO seu número WhatsApp foi verificado com sucesso. Receberá alertas de preço e notificações aqui.\n\nGerencie seus alertas em: ",
  nl: "Welkom bij trefolio! 🎉\n\nJe WhatsApp-nummer is succesvol geverifieerd. Je ontvangt prijswaarschuwingen en meldingen hier.\n\nBeheer je meldingen op: ",
  pl: "Witamy w trefolio! 🎉\n\nTwój numer WhatsApp został pomyślnie zweryfikowany. Będziesz otrzymywać alerty cenowe i powiadomienia tutaj.\n\nZarządzaj alertami na: ",
  ca: "Benvingut a trefolio! 🎉\n\nEl teu número de WhatsApp ha estat verificat correctament. Rebràs alertes de preu i notificacions aquí.\n\nGestiona les teves alertes a: ",
};

function getWelcomeMessage(language: Language): string {
  const baseUrl = process.env.APP_BASE_URL || "https://trefolio.com";
  const msg = WELCOME_MESSAGES[language] || WELCOME_MESSAGES.en;
  return msg + baseUrl;
}

export async function sendWhatsAppVerification(phone: string): Promise<{ success: boolean; error?: string; channel?: string }> {
  const client = getTwilioClient();
  if (!client) return { success: false, error: "Twilio not configured" };

  const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!verifySid) return { success: false, error: "Twilio Verify service not configured" };

  const preferredChannel = getVerifyChannel();

  try {
    await client.verify.v2.services(verifySid).verifications.create({
      to: phone,
      channel: preferredChannel,
    });
    return { success: true, channel: preferredChannel };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    if (preferredChannel === "whatsapp" && msg.toLowerCase().includes("channel disabled")) {
      console.warn("WhatsApp channel disabled on Verify service, falling back to SMS");
      try {
        await client.verify.v2.services(verifySid).verifications.create({
          to: phone,
          channel: "sms",
        });
        return { success: true, channel: "sms" };
      } catch (smsErr) {
        const smsMsg = smsErr instanceof Error ? smsErr.message : String(smsErr);
        console.error("Failed to send SMS verification fallback:", smsMsg);
        return { success: false, error: smsMsg };
      }
    }

    console.error("Failed to send verification:", msg);
    return { success: false, error: msg };
  }
}

export async function confirmWhatsAppVerification(
  phone: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  const client = getTwilioClient();
  if (!client) return { success: false, error: "Twilio not configured" };

  const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!verifySid) return { success: false, error: "Twilio Verify service not configured" };

  try {
    const check = await client.verify.v2.services(verifySid).verificationChecks.create({
      to: phone,
      code,
    });
    if (check.status === "approved") return { success: true };
    return { success: false, error: "Invalid code" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Failed to confirm WhatsApp verification:", msg);
    return { success: false, error: msg };
  }
}

export async function sendWhatsAppWelcome(
  phone: string,
  language: Language = "en"
): Promise<{ success: boolean; error?: string }> {
  const client = getTwilioClient();
  if (!client) return { success: false, error: "Twilio not configured" };

  try {
    await client.messages.create({
      from: getWhatsAppFrom(),
      to: `whatsapp:${phone}`,
      body: getWelcomeMessage(language),
    });
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Failed to send WhatsApp welcome:", msg);
    return { success: false, error: msg };
  }
}

export async function sendWhatsAppAlert(
  phone: string,
  alert: {
    ticker: string;
    name: string;
    currentPrice: number;
    currency: string;
    changeDescription: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const client = getTwilioClient();
  if (!client) {
    console.warn("Twilio not configured; skipping WhatsApp alert.");
    return { success: true };
  }

  const body = [
    `📊 *trefolio Price Alert*`,
    ``,
    `*${alert.name || alert.ticker}* (${alert.ticker})`,
    alert.changeDescription,
    `Current price: ${alert.currency} ${alert.currentPrice.toFixed(2)}`,
    ``,
    `Open your dashboard: ${process.env.APP_BASE_URL || "https://trefolio.com"}`,
  ].join("\n");

  try {
    await client.messages.create({
      from: getWhatsAppFrom(),
      to: `whatsapp:${phone}`,
      body,
    });
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Failed to send WhatsApp alert:", msg);
    return { success: false, error: msg };
  }
}
