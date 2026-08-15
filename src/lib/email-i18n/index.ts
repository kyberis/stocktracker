export type { EmailLocale, WelcomeStrings, BifolioStrings, TrefolioStrings } from "./types";
import type { EmailLocale, WelcomeStrings, BifolioStrings, TrefolioStrings } from "./types";
import { batch as batchA } from "./batch-a";
import { batch as batchB } from "./batch-b";
import { batch as batchC } from "./batch-c";
import { batch as batchD } from "./batch-d";
import { seedSubjects } from "./seed-subjects";

const en: { welcome: WelcomeStrings; bifolio: BifolioStrings; trefolio: TrefolioStrings } = {
  welcome: {
    subject: "Welcome to trefolio!",
    heading: "Welcome aboard!",
    intro: "Hi <strong>{{name}}</strong>, welcome to trefolio &mdash; the extra leaf for your portfolio. Your account is ready. Here&rsquo;s what you can do right away:",
    f1Title: "Real-time Quotes",
    f1Desc: "Live prices from Yahoo Finance across 5+ exchanges worldwide.",
    f2Title: "Dividend Tracking",
    f2Desc: "See annual income, per-stock yields, and monthly dividend projections.",
    f3Title: "AI-Powered Insights",
    f3Desc: "Get 5 free AI analysis calls per month to understand your holdings.",
    f4Title: "Import in Seconds",
    f4Desc: "Bring your portfolio from 13+ brokers via CSV, Broker Sync, or AI Import.",
    ctaPrimary: "Import Your Portfolio",
    ctaSecondary: "Explore the Dashboard",
    tipLabel: "Tip:",
    tip: "Add a holding to see live quotes, charts, and AI insights.",
    tipLink: "Open your dashboard",
    footer: "You received this email because you signed up for trefolio.",
    manage: "Manage email preferences",
    fallbackName: "there",
  },
  bifolio: {
    subject: "Welcome to trefolio!",
    heading: "You\u2019ve upgraded!",
    intro: "Congrats, <strong>{{name}}</strong>! Your upgrade is now active. Here&rsquo;s everything you just unlocked:",
    f1Title: "Portfolio Sharing",
    f1Desc: "Generate a public link to share your portfolio with anyone.",
    f2Title: "CSV Export",
    f2Desc: "Download your holdings and transactions as CSV files.",
    f3Title: "Email &amp; Push Alerts",
    f3Desc: "Set up to 10 price alerts with email and push notifications.",
    f4Title: "Expanded Limits",
    f4Desc: "Track up to 50 holdings (up from 15) and 20 AI calls/month (up from 5).",
    ctaPrimary: "Set Up Your First Alert",
    ctaSecondary: "Share Your Portfolio",
    upsell: "<strong>Want even more?</strong> trefolio unlocks fundamentals, advanced metrics, WhatsApp alerts, and unlimited holdings.",
    upsellLink: "Learn more",
    footer: "You received this email because you upgraded your trefolio account.",
    manage: "Manage email preferences",
    fallbackName: "there",
  },
  trefolio: {
    subject: "Welcome to trefolio!",
    heading: "Welcome to Pro!",
    intro: "<strong>{{name}}</strong>, you now have full access to every feature trefolio offers. Here&rsquo;s your complete toolkit:",
    g1Label: "Data &amp; Analysis",
    g1Items: ["Alpha Vantage premium data", "Fundamentals: income, balance sheet, cash flow", "Economic indicators dashboard"],
    g2Label: "Intelligence",
    g2Items: ["News feed with sentiment analysis", "Insider trades &amp; institutional holdings", "AI analysis: 30 calls/day (unlimited monthly)"],
    g3Label: "Advanced Metrics",
    g3Items: ["Sharpe ratio, max drawdown, volatility", "Full portfolio performance history"],
    g4Label: "Crypto Pro",
    g4Items: ["Crypto charts, exchange rates, AI analysis", "Dedicated crypto portfolio tab"],
    g5Label: "Alerts &amp; Limits",
    g5Items: ["WhatsApp &amp; device notifications", "Unlimited price alerts &amp; holdings", "Up to 5 portfolios"],
    ctaPrimary: "Explore AI Insights",
    ctaSecondary: "View Fundamentals",
    community: "&#x1F31F; <strong>You&rsquo;re one of our first 500 Pro members.</strong> Thank you for believing in trefolio early on. Your feedback shapes what we build next.",
    footer: "You received this email because you upgraded to trefolio.",
    manage: "Manage email preferences",
    fallbackName: "there",
  },
};

const es: { welcome: WelcomeStrings; bifolio: BifolioStrings; trefolio: TrefolioStrings } = {
  welcome: {
    subject: "\u00A1Bienvenido a trefolio!",
    heading: "\u00A1Bienvenido!",
    intro: "Hola <strong>{{name}}</strong>, bienvenido a trefolio &mdash; la hoja extra para tu cartera. Tu cuenta est&aacute; lista. Esto es lo que puedes hacer:",
    f1Title: "Cotizaciones en Tiempo Real",
    f1Desc: "Precios en vivo de Yahoo Finance en m&aacute;s de 5 bolsas mundiales.",
    f2Title: "Seguimiento de Dividendos",
    f2Desc: "Ingresos anuales, rendimientos por acci&oacute;n y proyecciones mensuales.",
    f3Title: "An&aacute;lisis con IA",
    f3Desc: "5 consultas de IA gratuitas al mes para entender tus inversiones.",
    f4Title: "Importa en Segundos",
    f4Desc: "Trae tu cartera desde 13+ br&oacute;kers v&iacute;a CSV, Broker Sync o IA.",
    ctaPrimary: "Importar Cartera",
    ctaSecondary: "Explorar el Dashboard",
    tipLabel: "Consejo:",
    tip: "A&ntilde;ade una posici&oacute;n para ver cotizaciones, gr&aacute;ficos e insights de IA.",
    tipLink: "Abre tu panel",
    footer: "Recibiste este email porque te registraste en trefolio.",
    manage: "Gestionar preferencias",
    fallbackName: "all&iacute;",
  },
  bifolio: {
    subject: "\u00A1Bienvenido a trefolio!",
    heading: "\u00A1Has mejorado tu plan!",
    intro: "Felicidades, <strong>{{name}}</strong>. Tu mejora ya est&aacute; activa. Esto es lo que has desbloqueado:",
    f1Title: "Compartir Cartera",
    f1Desc: "Genera un enlace p&uacute;blico para compartir tu cartera con cualquiera.",
    f2Title: "Exportar CSV",
    f2Desc: "Descarga tus posiciones y transacciones en archivos CSV.",
    f3Title: "Alertas Email y Push",
    f3Desc: "Configura hasta 10 alertas de precio con notificaciones por email y push.",
    f4Title: "L&iacute;mites Ampliados",
    f4Desc: "Hasta 50 posiciones (antes 15) y 20 consultas IA/mes (antes 5).",
    ctaPrimary: "Configura Tu Primera Alerta",
    ctaSecondary: "Compartir Cartera",
    upsell: "<strong>&iquest;Quieres a&uacute;n m&aacute;s?</strong> trefolio desbloquea fundamentales, m&eacute;tricas avanzadas, alertas WhatsApp y posiciones ilimitadas.",
    upsellLink: "Saber m&aacute;s",
    footer: "Recibiste este email porque mejoraste tu cuenta de trefolio.",
    manage: "Gestionar preferencias",
    fallbackName: "all&iacute;",
  },
  trefolio: {
    subject: "\u00A1Bienvenido a trefolio!",
    heading: "\u00A1Bienvenido a Pro!",
    intro: "<strong>{{name}}</strong>, ahora tienes acceso completo a todas las funciones de trefolio. Aqu&iacute; tienes tu kit completo:",
    g1Label: "Datos y An&aacute;lisis",
    g1Items: ["Datos premium de Alpha Vantage", "Fundamentales: ingresos, balance, flujo de caja", "Panel de indicadores econ&oacute;micos"],
    g2Label: "Inteligencia",
    g2Items: ["Noticias con an&aacute;lisis de sentimiento", "Operaciones de insiders y posiciones institucionales", "An&aacute;lisis IA: 30 consultas/d&iacute;a (ilimitado mensual)"],
    g3Label: "M&eacute;tricas Avanzadas",
    g3Items: ["Ratio Sharpe, drawdown m&aacute;ximo, volatilidad", "Historial completo de rendimiento"],
    g4Label: "Crypto Pro",
    g4Items: ["Gr&aacute;ficos crypto, tipos de cambio, an&aacute;lisis IA", "Pesta&ntilde;a dedicada de cartera crypto"],
    g5Label: "Alertas y L&iacute;mites",
    g5Items: ["Notificaciones WhatsApp y dispositivo", "Alertas y posiciones ilimitadas", "Hasta 5 carteras"],
    ctaPrimary: "Explorar IA Insights",
    ctaSecondary: "Ver Fundamentales",
    community: "&#x1F31F; <strong>Eres uno de nuestros primeros 500 miembros Pro.</strong> Gracias por creer en trefolio desde el principio. Tu feedback da forma a lo que construimos.",
    footer: "Recibiste este email porque mejoraste a trefolio.",
    manage: "Gestionar preferencias",
    fallbackName: "all&iacute;",
  },
};

function mergeBatches<T>(
  base: Record<string, T>,
  ...batches: Record<string, T>[]
): Record<EmailLocale, T> {
  const result = { ...base } as Record<string, T>;
  for (const b of batches) {
    Object.assign(result, b);
  }
  return result as Record<EmailLocale, T>;
}

export const welcomeCopy: Record<EmailLocale, WelcomeStrings> = mergeBatches(
  { en: en.welcome, es: es.welcome },
  batchA.welcome,
  batchB.welcome,
  batchC.welcome,
  batchD.welcome,
);

export const bifolioCopy: Record<EmailLocale, BifolioStrings> = mergeBatches(
  { en: en.bifolio, es: es.bifolio },
  batchA.bifolio,
  batchB.bifolio,
  batchC.bifolio,
  batchD.bifolio,
);

export const trefolioCopy: Record<EmailLocale, TrefolioStrings> = mergeBatches(
  { en: en.trefolio, es: es.trefolio },
  batchA.trefolio,
  batchB.trefolio,
  batchC.trefolio,
  batchD.trefolio,
);

export function resolveIntro(template: string, name: string): string {
  return template.replace("{{name}}", name);
}

export function getEmailLocale(lang: string): EmailLocale {
  if (lang in welcomeCopy) return lang as EmailLocale;
  return "en";
}

/**
 * Look up a translated subject for a DB-seeded email template.
 * Falls back to EN/ES subjects stored in the template itself.
 */
export function getTemplateSubject(
  slug: string,
  locale: string,
  fallbackSubject: string,
  fallbackSubjectEs: string,
): string {
  if (locale === "en") return fallbackSubject;
  if (locale === "es") return fallbackSubjectEs || fallbackSubject;
  return seedSubjects[slug]?.[locale] ?? fallbackSubject;
}

export { seedSubjects };

export { getLocalizedTemplateHtml } from "./template-lookup";
