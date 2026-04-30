import type { Language } from "./types";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const WELCOME_MESSAGES: Record<string, string> = {
  en: "Welcome to trefolio! You will receive price alerts here. Manage alerts in your profile: ",
  es: "¡Bienvenido a trefolio! Recibirás alertas de precio aquí. Gestiona las alertas en tu perfil: ",
  fr: "Bienvenue sur trefolio ! Vous recevrez des alertes de prix ici. Gérez vos alertes dans votre profil : ",
  de: "Willkommen bei trefolio! Du erhältst hier Preisalarme. Verwalte Alarme in deinem Profil: ",
  it: "Benvenuto su trefolio! Riceverai avvisi sui prezzi qui. Gestisci gli avvisi nel profilo: ",
  pt: "Bem-vindo ao trefolio! Receberá alertas de preço aqui. Gerencie alertas no seu perfil: ",
  nl: "Welkom bij trefolio! Je ontvangt hier prijsmeldingen. Beheer meldingen in je profiel: ",
  pl: "Witamy w trefolio! Tutaj będziesz otrzymywać alerty cenowe. Zarządzaj alertami w profilu: ",
  ca: "Benvingut a trefolio! Rebràs alertes de preu aquí. Gestiona les alertes al perfil: ",
};

function getWelcomeBody(language: Language): string {
  const base = process.env.APP_BASE_URL || "https://trefolio.com";
  const msg = WELCOME_MESSAGES[language] || WELCOME_MESSAGES.en;
  return `${msg}${base}`;
}

async function callTelegramApi(method: string, body: Record<string, unknown>): Promise<{ ok: boolean; description?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, description: "missing_token" };
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  try {
    return (await res.json()) as { ok: boolean; description?: string };
  } catch {
    return { ok: false, description: "invalid_json" };
  }
}

export async function sendTelegramWelcome(chatId: string, language: Language = "en"): Promise<{ success: boolean; error?: string }> {
  const text = getWelcomeBody(language);
  const result = await callTelegramApi("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
  if (result.ok) return { success: true };
  console.error("Telegram welcome failed:", result.description);
  return { success: false, error: result.description };
}

export async function sendTelegramAlert(
  chatId: string,
  alert: {
    ticker: string;
    name: string;
    currentPrice: number;
    currency: string;
    changeDescription: string;
  }
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.warn("TELEGRAM_BOT_TOKEN not configured; skipping Telegram alert.");
    return { success: true };
  }
  const base = process.env.APP_BASE_URL || "https://trefolio.com";
  const title = escapeHtml("trefolio Price Alert");
  const lineName = escapeHtml(`${alert.name || alert.ticker} (${alert.ticker})`);
  const lineChange = escapeHtml(alert.changeDescription);
  const linePrice = escapeHtml(`Current price: ${alert.currency} ${alert.currentPrice.toFixed(2)}`);
  const html = `<b>${title}</b>\n\n<b>${lineName}</b>\n${lineChange}\n${linePrice}\n\n<a href="${base}">Open dashboard</a>`;
  const result = await callTelegramApi("sendMessage", {
    chat_id: chatId,
    text: html,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
  if (result.ok) return { success: true };
  console.error("Telegram alert failed:", result.description);
  return { success: false, error: result.description };
}
