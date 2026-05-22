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
  /** Initial status line shown while Warren works (before any tool runs). */
  thinking: string;
  /** AI errors */
  aiError: string;
  quotaExceeded: string;
  userNotFound: string;
  /** Caption for the /chart allocation pie chart. */
  allocationChartTitle: string;
  /** Sent when /chart can't be rendered (no holdings or images disabled). */
  chartUnavailable: string;
  /** Voice message exceeds the duration cap. */
  voiceTooLong: (maxSeconds: number) => string;
  /** Voice message exceeds the size cap. */
  voiceTooLarge: string;
  /** Whisper failed or returned no usable text. */
  voiceTranscribeFailed: string;
  /** Echo prefix shown above the transcript so the user can spot misrecognitions. */
  voiceTranscribed: (transcript: string) => string;
  /** Voice + TTS audio disclaimer prepended to the spoken reply. */
  voiceDisclaimerSpoken: string;
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
  /** After a Folio-tier Warren reply, nudge upgrade for a higher-quality model (second message). */
  warrenUpgradeModelHint: string;
  officeProRequired: string;
  officeNoMission: string;
  officeMissionSummary: (title: string, pending: number) => string;
  officeOpenWeb: string;
  helpOffice: string;
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
  thinking: "💭 Thinking…",
  aiError: "I couldn't reach the AI just now. Please try again in a moment.",
  quotaExceeded:
    "You've reached your monthly Warren limit. Upgrade or come back next month — see /billing in the app.",
  userNotFound: "I couldn't find your account. Try /unlink and link again from your profile.",
  allocationChartTitle: "Portfolio allocation",
  chartUnavailable:
    "I can't render a chart right now — make sure you have holdings in this portfolio.",
  voiceTooLong: (max: number) =>
    `Voice notes longer than ${max} seconds aren't supported yet. Try a shorter clip or send text.`,
  voiceTooLarge:
    "That voice note is too large. Send a shorter clip (under 4 MB) or type your question.",
  voiceTranscribeFailed:
    "I couldn't understand the audio. Try recording again in a quiet spot, or send text.",
  voiceTranscribed: (t: string) => `🎤 _"${t}"_`,
  voiceDisclaimerSpoken:
    "Heads up: this is AI-generated assistance, not financial advice.",
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
  warrenUpgradeModelHint:
    "Tip: you're on Folio (free) — Warren uses a compact model here. Trefolio unlocks a larger GPT model, higher AI limits, and premium market data. Upgrade in trefolio → Profile → Subscription.",
  officeProRequired:
    "Agent Office is Trefolio Pro only. Upgrade in trefolio → Profile → Subscription, then open /office in the app.",
  officeNoMission:
    "No active office mission. Open trefolio → Agent Office and ask Warren to coordinate with Clara and Will.",
  officeMissionSummary: (title: string, pending: number) =>
    `🏢 *Agent Office* — active mission: *${title}* (${pending} step${pending === 1 ? "" : "s"} pending). Confirm each step in the web app.`,
  officeOpenWeb: "Open https://trefolio.com/office to chat and confirm steps.",
  helpOffice: "Agent Office (Pro)",
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
  thinking: "💭 Pensando…",
  aiError: "No pude contactar con la IA. Inténtalo de nuevo en un momento.",
  quotaExceeded:
    "Has alcanzado tu límite mensual de Warren. Mejora tu plan o espera al próximo mes — usa /billing en la app.",
  userNotFound:
    "No encuentro tu cuenta. Prueba /unlink y vuelve a vincular desde tu perfil.",
  allocationChartTitle: "Asignación de la cartera",
  chartUnavailable:
    "No puedo generar el gráfico ahora — comprueba que tengas posiciones en esta cartera.",
  voiceTooLong: (max: number) =>
    `Aún no admito audios de más de ${max} segundos. Prueba con uno más corto o escríbeme.`,
  voiceTooLarge:
    "Ese audio es demasiado pesado. Mándame uno más corto (menos de 4 MB) o escríbeme.",
  voiceTranscribeFailed:
    "No pude entender el audio. Pruébalo de nuevo en un sitio tranquilo o escríbeme.",
  voiceTranscribed: (t: string) => `🎤 _"${t}"_`,
  voiceDisclaimerSpoken:
    "Aviso: esto es asistencia generada por IA, no asesoramiento financiero.",
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
  warrenUpgradeModelHint:
    "Consejo: estás en Folio (gratis) — aquí Warren usa un modelo compacto. Trefolio desbloquea un GPT mayor, más consultas IA y datos de mercado premium. Mejora en trefolio → Perfil → Suscripción.",
  officeProRequired:
    "La Oficina de agentes es solo Trefolio Pro. Mejora en trefolio → Perfil → Suscripción y abre /office en la app.",
  officeNoMission:
    "Sin misión activa en la Oficina. Abre trefolio → Oficina de agentes y pídele a Warren que coordine con Clara y Will.",
  officeMissionSummary: (title: string, pending: number) =>
    `🏢 *Oficina de agentes* — misión activa: *${title}* (${pending} paso${pending === 1 ? "" : "s"} pendiente${pending === 1 ? "" : "s"}). Confirmá cada paso en la web.`,
  officeOpenWeb: "Abrí https://trefolio.com/office para chatear y confirmar pasos.",
  helpOffice: "Oficina de agentes (Pro)",
};

const BUNDLES: Record<TelegramLocale, TelegramStrings> = { en: EN, es: ES };

/** Resolve the closest bundle for a language code (e.g. "es-MX" → "es"). */
export function localizeTelegram(code: string | TelegramLocale | undefined): TelegramStrings {
  if (!code) return BUNDLES.en;
  const head = code.toLowerCase().slice(0, 2);
  if (head === "es") return BUNDLES.es;
  return BUNDLES.en;
}
