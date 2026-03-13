import type { CreateNotificationInput } from "@/lib/db/notifications";

export function welcomeNotification(): CreateNotificationInput {
  return {
    type: "welcome",
    title: "Welcome to trefolio!",
    titleEs: "\u00a1Bienvenido a trefolio!",
    message:
      "Your free Folio account is ready. You can track real-time quotes, monitor dividends, get AI-powered insights (5/month), and import your portfolio from 13+ brokers in seconds.",
    messageEs:
      "Tu cuenta Folio gratuita est\u00e1 lista. Puedes seguir cotizaciones en tiempo real, monitorear dividendos, obtener an\u00e1lisis con IA (5/mes) e importar tu cartera de 13+ br\u00f3kers en segundos.",
    link: "/landing",
    linkLabel: "Explore all features",
    linkLabelEs: "Explorar todas las funciones",
  };
}

export function bifolioUpgradeNotification(): CreateNotificationInput {
  return {
    type: "upgrade",
    title: "Welcome to Bifolio!",
    titleEs: "\u00a1Bienvenido a Bifolio!",
    message:
      "Congratulations on upgrading! You\u2019ve unlocked: Portfolio Sharing, CSV Export, Email & Push Alerts (up to 10), 50 holdings, 20 AI calls/month, Net Worth tracking, and Economic Calendar.",
    messageEs:
      "\u00a1Felicidades por mejorar tu plan! Has desbloqueado: Compartir Cartera, Exportar CSV, Alertas Email y Push (hasta 10), 50 posiciones, 20 consultas IA/mes, Seguimiento de Patrimonio y Calendario Econ\u00f3mico.",
    link: "/tools/alerts",
    linkLabel: "Set up your first alert",
    linkLabelEs: "Configura tu primera alerta",
  };
}

export function trefolioUpgradeNotification(): CreateNotificationInput {
  return {
    type: "upgrade",
    title: "Welcome to Trefolio Pro!",
    titleEs: "\u00a1Bienvenido a Trefolio Pro!",
    message:
      "You now have full access to everything: Fundamentals & Financial Statements, Alpha Intelligence (news, insiders, institutions), WhatsApp & Device Alerts, Unlimited Holdings & Alerts, Stock Screener, Crypto Portfolio, up to 3 portfolios, and 30 AI calls/day.",
    messageEs:
      "Ahora tienes acceso completo: Fundamentales y Estados Financieros, Alpha Intelligence (noticias, insiders, instituciones), Alertas WhatsApp y Dispositivo, Posiciones y Alertas ilimitadas, Screener de Acciones, Cartera Crypto, hasta 3 carteras y 30 consultas IA/d\u00eda.",
    link: "/",
    linkLabel: "Explore AI Insights",
    linkLabelEs: "Explorar AI Insights",
  };
}

export function downgradeNotification(planExpiresAt: string): CreateNotificationInput {
  const dateStr = planExpiresAt
    ? new Date(planExpiresAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "the end of your billing period";
  const dateStrEs = planExpiresAt
    ? new Date(planExpiresAt).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })
    : "el final de tu periodo de facturaci\u00f3n";

  return {
    type: "downgrade",
    title: "Your subscription is changing",
    titleEs: "Tu suscripci\u00f3n va a cambiar",
    message: `Your current plan remains fully active until ${dateStr}. After that, your account will revert to the free Folio plan. You can resubscribe anytime from your profile.`,
    messageEs: `Tu plan actual sigue completamente activo hasta el ${dateStrEs}. Despu\u00e9s, tu cuenta volver\u00e1 al plan gratuito Folio. Puedes volver a suscribirte en cualquier momento desde tu perfil.`,
    link: "/profile",
    linkLabel: "Manage subscription",
    linkLabelEs: "Gestionar suscripci\u00f3n",
  };
}
