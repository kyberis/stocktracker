import twilio from "twilio";

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

export async function sendWhatsAppVerification(phone: string): Promise<{ success: boolean; error?: string }> {
  const client = getTwilioClient();
  if (!client) return { success: false, error: "Twilio not configured" };

  const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!verifySid) return { success: false, error: "Twilio Verify service not configured" };

  try {
    await client.verify.v2.services(verifySid).verifications.create({
      to: phone,
      channel: getVerifyChannel(),
    });
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Failed to send WhatsApp verification:", msg);
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
