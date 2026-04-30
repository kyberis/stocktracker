/**
 * Lightweight string bundle for Telegram-specific copy.
 *
 * Trefolio's main `useI18n` is React-only; we keep a small set of strings
 * here so the Telegram handler (a pure server module) can render commands,
 * help menus, and error messages without pulling in React.
 *
 * For now we ship English + Spanish. When the user picks a different
 * language via `/lang`, the AI replies in that language but the Telegram
 * scaffolding (button labels, /help text) falls back to English.
 */

export type TelegramLocale = "en" | "es";

export interface TelegramStrings {
  /** Confirm button label. */
  confirm: string;
  cancel: string;
  /** Confirm label for destructive proposals (e.g. "Yes, delete"). */
  confirmDestructive: string;
  /** Toast/text shown after a successful confirmation. */
  confirmed: string;
  cancelled: string;
  /** Generic action-failed message. */
  actionFailed: string;
  /** Proposal-card has expired. */
  proposalExpired: string;
  /** User tapped a stale button after the proposal was already resolved. */
  proposalAlreadyHandled: string;
  /** Sent when the user sends a message but the chat is not linked yet. */
  notLinked: (botUsername: string) => string;
  /** Sent when /start is used with a missing/expired token. */
  linkTokenInvalid: string;
  /** Greeting after a successful link. */
  linkSuccess: (name: string) => string;
  /** Confirmation after /unlink. */
  unlinked: string;
  /** /lang usage hint. */
  langUsage: string;
  langSet: (code: string) => string;
  unknownCommand: string;
  noPortfolios: string;
  noHoldings: string;
  noAlerts: string;
  yourPortfolios: string;
  yourHoldings: string;
  yourAlerts: string;
  /** "(and N more)" footer for truncated lists. */
  andMore: (n: number) => string;
  /** AI errors */
  aiError: string;
  quotaExceeded: string;
  userNotFound: string;
  // Help menu strings
  helpTitle: string;
  helpIntro: string;
  helpPortfolio: string;
  helpGrowth: string;
  helpDividendsNews: string;
  helpAlerts: string;
  helpWatchlist: string;
  helpWrites: string;
  helpAccount: string;
  helpEx1: string;
  helpEx2: string;
  helpEx3: string;
  helpEx4: string;
  helpEx5: string;
  helpEx6: string;
  helpEx7: string;
  helpEx8: string;
  helpEx9: string;
  helpEx10: string;
  helpDisclaimer: string;
}

const EN: TelegramStrings = {
  confirm: "Confirm",
  cancel: "Cancel",
  confirmDestructive: "Yes, delete",
  confirmed: "Done",
  cancelled: "Cancelled",
  actionFailed: "Action failed",
  proposalExpired: "This proposal has expired. Ask Warren again to recreate it.",
  proposalAlreadyHandled: "This proposal was already handled.",
  notLinked: (bot: string) =>
    bot
      ? `You're not linked to a trefolio account yet. Open https://trefolio.com/profile, tap "Connect Telegram", then come back here.`
      : "You're not linked to a trefolio account yet. Open trefolio in your browser, go to Profile, and connect Telegram.",
  linkTokenInvalid:
    "That link is invalid or has expired. Generate a new one from your trefolio profile.",
  linkSuccess: (name: string) =>
    name
      ? `Linked! Hi ${name}, I'm Warren. Use /help to see what I can do.`
      : "Linked! I'm Warren. Use /help to see what I can do.",
  unlinked: "Unlinked. You can link again any time from your profile.",
  langUsage: "Usage: /lang <code> (e.g. /lang es).",
  langSet: (code: string) => `Language set to ${code}. I'll reply in this language.`,
  unknownCommand: "Unknown command. Try /help.",
  noPortfolios: "You don't have any portfolios yet.",
  noHoldings: "No holdings in this portfolio.",
  noAlerts: "No active alerts.",
  yourPortfolios: "Your portfolios",
  yourHoldings: "Your holdings",
  yourAlerts: "Active alerts",
  andMore: (n: number) => `(and ${n} more)`,
  aiError: "I couldn't reach the AI just now. Please try again in a moment.",
  quotaExceeded:
    "You've reached your monthly Warren limit. Upgrade or come back next month — see /billing in the app.",
  userNotFound: "I couldn't find your account. Try /unlink and link again from your profile.",
  helpTitle: "Warren — what I can do",
  helpIntro:
    "I'm your portfolio companion on Telegram. Ask me in plain language or use these shortcuts.",
  helpPortfolio: "Portfolio",
  helpGrowth: "Growth & metrics",
  helpDividendsNews: "Dividends & news",
  helpAlerts: "Alerts",
  helpWatchlist: "Watchlist",
  helpWrites: "Add / change (with confirmation)",
  helpAccount: "Account",
  helpEx1: "How is my portfolio?",
  helpEx2: "Show my allocation",
  helpEx3: "TTWROR / XIRR for this year",
  helpEx4: "How does my portfolio compare to SPX?",
  helpEx5: "Upcoming dividends",
  helpEx6: "Alert me if AAPL drops 5%",
  helpEx7: "Add NVDA to my watchlist",
  helpEx8: "I bought 10 AAPL at 180",
  helpEx9: "Sell my MSFT position",
  helpEx10: "Add €5,000 in cash",
  helpDisclaimer:
    "Warren is AI-generated assistance, not financial advice.",
};

const ES: TelegramStrings = {
  confirm: "Confirmar",
  cancel: "Cancelar",
  confirmDestructive: "Sí, borrar",
  confirmed: "Hecho",
  cancelled: "Cancelado",
  actionFailed: "Acción fallida",
  proposalExpired: "Esta propuesta ha expirado. Pídeselo a Warren de nuevo.",
  proposalAlreadyHandled: "Esta propuesta ya se gestionó.",
  notLinked: (bot: string) =>
    bot
      ? `Aún no estás vinculado a una cuenta de trefolio. Abre https://trefolio.com/profile, pulsa "Conectar Telegram" y vuelve aquí.`
      : "Aún no estás vinculado a una cuenta de trefolio. Abre trefolio, ve a Perfil y conecta Telegram.",
  linkTokenInvalid:
    "Ese enlace no es válido o ha caducado. Genera uno nuevo desde tu perfil de trefolio.",
  linkSuccess: (name: string) =>
    name
      ? `¡Vinculado! Hola ${name}, soy Warren. Usa /help para ver qué puedo hacer.`
      : "¡Vinculado! Soy Warren. Usa /help para ver qué puedo hacer.",
  unlinked: "Desvinculado. Puedes volver a vincular cuando quieras desde tu perfil.",
  langUsage: "Uso: /lang <código> (por ejemplo /lang es).",
  langSet: (code: string) => `Idioma configurado a ${code}. Te responderé en este idioma.`,
  unknownCommand: "Comando desconocido. Prueba /help.",
  noPortfolios: "Aún no tienes carteras.",
  noHoldings: "No hay posiciones en esta cartera.",
  noAlerts: "No hay alertas activas.",
  yourPortfolios: "Tus carteras",
  yourHoldings: "Tus posiciones",
  yourAlerts: "Alertas activas",
  andMore: (n: number) => `(y ${n} más)`,
  aiError: "No pude contactar con la IA. Inténtalo de nuevo en un momento.",
  quotaExceeded:
    "Has alcanzado tu límite mensual de Warren. Mejora tu plan o espera al próximo mes — usa /billing en la app.",
  userNotFound:
    "No encuentro tu cuenta. Prueba /unlink y vuelve a vincular desde tu perfil.",
  helpTitle: "Warren — qué puedo hacer",
  helpIntro:
    "Soy tu compañero de cartera en Telegram. Pregúntame con lenguaje natural o usa estos atajos.",
  helpPortfolio: "Cartera",
  helpGrowth: "Crecimiento y métricas",
  helpDividendsNews: "Dividendos y noticias",
  helpAlerts: "Alertas",
  helpWatchlist: "Watchlist",
  helpWrites: "Añadir / cambiar (con confirmación)",
  helpAccount: "Cuenta",
  helpEx1: "¿Cómo va mi cartera?",
  helpEx2: "Muéstrame mi asignación",
  helpEx3: "TTWROR / XIRR de este año",
  helpEx4: "¿Cómo me comparo con el SPX?",
  helpEx5: "Próximos dividendos",
  helpEx6: "Avísame si AAPL baja un 5%",
  helpEx7: "Añade NVDA a mi watchlist",
  helpEx8: "Compré 10 AAPL a 180",
  helpEx9: "Vende toda mi posición en MSFT",
  helpEx10: "Añade 5.000 € en efectivo",
  helpDisclaimer: "Warren es asistencia generada por IA, no asesoramiento financiero.",
};

const BUNDLES: Record<TelegramLocale, TelegramStrings> = { en: EN, es: ES };

/** Resolve the closest bundle for a language code (e.g. "es-MX" → "es"). */
export function localizeTelegram(code: string | TelegramLocale | undefined): TelegramStrings {
  if (!code) return BUNDLES.en;
  const head = code.toLowerCase().slice(0, 2);
  if (head === "es") return BUNDLES.es;
  return BUNDLES.en;
}
