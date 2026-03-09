export type ChangeType = "feature" | "improvement" | "fix";

export interface ReleaseChange {
  type: ChangeType;
  text: string;
  translations?: Partial<Record<string, string>>;
}

export interface ReleaseEntry {
  version: string;
  date: string;
  title: string;
  titleTranslations?: Partial<Record<string, string>>;
  changes: ReleaseChange[];
}

export const CURRENT_VERSION = "1.7.0";

export const releaseNotes: ReleaseEntry[] = [
  {
    version: "1.7.0",
    date: "2026-03-09",
    title: "Multiple Portfolios",
    titleTranslations: { es: "Múltiples Portafolios" },
    changes: [
      {
        type: "feature",
        text: "Multiple portfolios — Trefolio users can create up to 3 separate portfolios with independent holdings, transactions, and performance tracking",
        translations: { es: "Múltiples portafolios — los usuarios Trefolio pueden crear hasta 3 portafolios separados con posiciones, transacciones y seguimiento de rendimiento independientes" },
      },
      {
        type: "feature",
        text: "Portfolio switcher in the dashboard toolbar — quickly switch between portfolios or view the combined total",
        translations: { es: "Selector de portafolios en la barra de herramientas — cambia rápidamente entre portafolios o consulta el total combinado" },
      },
      {
        type: "feature",
        text: "Device & widget portfolio selector — choose which portfolio your trefolio Leaf and mobile widget display",
        translations: { es: "Selector de portafolio para dispositivo y widget — elige qué portafolio muestra tu trefolio Leaf y widget móvil" },
      },
      {
        type: "feature",
        text: "Move holdings between portfolios — Pro users can relocate positions and their transaction history to a different portfolio",
        translations: { es: "Mover posiciones entre portafolios — los usuarios Pro pueden reubicar posiciones y su historial de transacciones a un portafolio diferente" },
      },
      {
        type: "improvement",
        text: "Import flow now lets you choose a target portfolio when you have multiple portfolios",
        translations: { es: "El flujo de importación ahora permite elegir un portafolio destino cuando tienes múltiples portafolios" },
      },
      {
        type: "improvement",
        text: "Downgrade protection — extra portfolios become read-only instead of being deleted when switching to a lower plan",
        translations: { es: "Protección ante cambio de plan — los portafolios extra se convierten en solo lectura en lugar de eliminarse al cambiar a un plan inferior" },
      },
      {
        type: "improvement",
        text: "Broker sync reconnection — expired brokerage connections are detected automatically and can be re-authorized with one click, reusing the same account",
        translations: { es: "Reconexión de sincronización de bróker — las conexiones expiradas se detectan automáticamente y se pueden reautorizar con un clic, reutilizando la misma cuenta" },
      },
    ],
  },
  {
    version: "1.6.0",
    date: "2026-03-08",
    title: "Tier Rebrand: Folio, Bifolio & Trefolio",
    titleTranslations: { es: "Renombre de Planes: Folio, Bifolio y Trefolio" },
    changes: [
      {
        type: "feature",
        text: "Subscription tiers renamed to Folio (free), Bifolio (mid), and Trefolio (top) — with growing clover icons reflecting the trefolio brand",
        translations: { es: "Los niveles de suscripción se renombraron a Folio (gratis), Bifolio (intermedio) y Trefolio (completo) — con iconos de trébol creciente que reflejan la marca trefolio" },
      },
      {
        type: "improvement",
        text: "Pricing section now has a Monthly/Annual toggle — see per-month equivalent and savings at a glance",
        translations: { es: "La sección de precios ahora tiene un selector Mensual/Anual — consulta el equivalente mensual y los ahorros de un vistazo" },
      },
    ],
  },
  {
    version: "1.5.0",
    date: "2026-03-08",
    title: "SnapTrade Brokerage Sync & Contact Page",
    titleTranslations: { es: "Sincronización de Bróker SnapTrade y Página de Contacto" },
    changes: [
      {
        type: "feature",
        text: "SnapTrade integration: connect 20+ brokerages (Robinhood, Questrade, Wealthsimple, Webull, and more) and auto-import your holdings via secure OAuth — Trefolio only",
        translations: { es: "Integración SnapTrade: conecta más de 20 brókers (Robinhood, Questrade, Wealthsimple, Webull y más) e importa automáticamente tus posiciones vía OAuth seguro — solo Trefolio" },
      },
      {
        type: "feature",
        text: "New Contact Us page with a contact form — reach us directly from the website",
        translations: { es: "Nueva página de Contacto con formulario — comunícate directamente desde el sitio web" },
      },
    ],
  },
  {
    version: "1.4.0",
    date: "2026-03-08",
    title: "New 3-Tier Pricing: Folio, Bifolio & Trefolio",
    titleTranslations: { es: "Nuevos 3 Niveles de Precio: Folio, Bifolio y Trefolio" },
    changes: [
      {
        type: "feature",
        text: "New Bifolio plan (€3.99/mo) — 50 holdings, 20 AI calls, portfolio sharing, CSV export, and 1-year growth history",
        translations: { es: "Nuevo plan Bifolio (€3,99/mes) — 50 posiciones, 20 llamadas IA, compartir cartera, exportar CSV e historial de crecimiento de 1 año" },
      },
      {
        type: "improvement",
        text: "Trefolio plan now includes advanced metrics, full history, economic indicators, and unlimited everything at €7.49/mo — 40% cheaper than alternatives",
        translations: { es: "El plan Trefolio ahora incluye métricas avanzadas, historial completo, indicadores económicos y todo ilimitado a €7,49/mes — 40% más barato que las alternativas" },
      },
      {
        type: "improvement",
        text: "Redesigned upgrade cards show all three plans side-by-side with clear feature comparison",
        translations: { es: "Las tarjetas de mejora rediseñadas muestran los tres planes lado a lado con comparación clara de características" },
      },
    ],
  },
  {
    version: "1.3.0",
    date: "2026-03-08",
    title: "Public Sharing & Transaction P&L",
    titleTranslations: { es: "Compartir Cartera y P&L por Transacción" },
    changes: [
      {
        type: "feature",
        text: "Share your portfolio publicly — generate a read-only link to showcase your holdings (Pro)",
        translations: { es: "Comparte tu cartera públicamente — genera un enlace de solo lectura para mostrar tus posiciones (Pro)" },
      },
      {
        type: "feature",
        text: "Realized P&L column in transaction history — see FIFO gain/loss for every sell",
        translations: { es: "Columna de P&L realizado en el historial de transacciones — visualiza la ganancia/pérdida FIFO en cada venta" },
      },
      {
        type: "improvement",
        text: "Stealth mode now masks P&L values in transaction history",
        translations: { es: "El modo sigiloso ahora oculta los valores de P&L en el historial de transacciones" },
      },
    ],
  },
  {
    version: "1.2.0",
    date: "2026-03-08",
    title: "Advanced Metrics & Portfolio History",
    titleTranslations: { es: "Métricas Avanzadas e Historial de Cartera" },
    changes: [
      {
        type: "feature",
        text: "New Metrics tab — Sharpe Ratio, Max Drawdown, and Annualized Volatility for Pro users (TTWROR & IRR free for all)",
        translations: { es: "Nueva pestaña de Métricas — Ratio de Sharpe, Máx. Drawdown y Volatilidad Anualizada para usuarios Pro (TTWROR e IRR gratis para todos)" },
      },
      {
        type: "feature",
        text: "New Growth tab — portfolio value history chart with 1M / 3M / 6M / 1Y / All range selector (30-day history free, full history Pro)",
        translations: { es: "Nueva pestaña de Crecimiento — gráfico del historial del valor de la cartera con selector de rango 1M / 3M / 6M / 1A / Todo (historial de 30 días gratis, historial completo Pro)" },
      },
    ],
  },
  {
    version: "1.1.0",
    date: "2026-03-08",
    title: "Diversification & Dividends",
    titleTranslations: { es: "Diversificación y Dividendos" },
    changes: [
      {
        type: "feature",
        text: "New Diversification tab — sector, region, asset class, and asset type breakdown with donut charts and rebalancing targets",
        translations: { es: "Nueva pestaña de Diversificación — desglose por sector, región, clase de activo y tipo de activo con gráficos donut y objetivos de rebalanceo" },
      },
      {
        type: "feature",
        text: "New Dividends tab — dividend history, projections, per-stock breakdown, and monthly income vs. proceeds-from-sales chart",
        translations: { es: "Nueva pestaña de Dividendos — historial de dividendos, proyecciones, desglose por acción y gráfico de ingresos mensuales frente a ingresos por ventas" },
      },
      {
        type: "feature",
        text: "Ex-Dividend Calendar — upcoming ex-dividend dates for your holdings in the next 90 days with estimated income",
        translations: { es: "Calendario Ex-Dividendo — próximas fechas ex-dividendo para tus posiciones en los próximos 90 días con ingresos estimados" },
      },
      {
        type: "feature",
        text: "Stealth Mode — hide all monetary values with one click for privacy in public spaces",
        translations: { es: "Modo Sigilo — oculta todos los valores monetarios con un clic para mayor privacidad en espacios públicos" },
      },
    ],
  },
  {
    version: "1.0.0",
    date: "2026-03-08",
    title: "trefolio 1.0",
    titleTranslations: { es: "trefolio 1.0" },
    changes: [
      {
        type: "feature",
        text: "Added 9 new broker statement importers: Charles Schwab, Fidelity, Nordnet, Tastytrade, Freetrade, eToro, Wealthsimple, Questrade, and Firstrade",
        translations: { es: "Añadidos 9 nuevos importadores de extractos de broker: Charles Schwab, Fidelity, Nordnet, Tastytrade, Freetrade, eToro, Wealthsimple, Questrade y Firstrade" },
      },
      {
        type: "feature",
        text: "Three-mode power management for trefolio Leaf — Active, Glance, and Sleep modes extend battery life up to 48 hours",
        translations: { es: "Gestión de energía en tres modos para trefolio Leaf — los modos Activo, Vistazo y Suspensión extienden la batería hasta 48 horas" },
      },
      {
        type: "feature",
        text: "Battery percentage and charging status displayed on the device dashboard",
        translations: { es: "Porcentaje de batería y estado de carga en el panel del dispositivo" },
      },
      {
        type: "feature",
        text: "Full WCAG 2.1 AA accessibility — keyboard navigation, screen reader support, and color contrast compliance across the entire interface",
        translations: { es: "Accesibilidad WCAG 2.1 AA completa — navegación por teclado, soporte para lectores de pantalla y cumplimiento de contraste de color en toda la interfaz" },
      },
      {
        type: "feature",
        text: "Blog with guides for European investors — broker import tutorials, portfolio tracker comparisons, and AI analysis explainers",
        translations: { es: "Blog con guías para inversores europeos — tutoriales de importación de brókers, comparativas de rastreadores de cartera y explicaciones de análisis con IA" },
      },
      {
        type: "improvement",
        text: "SEO and discoverability — hreflang tags for 35 languages, WebSite schema, social previews on all public pages",
        translations: { es: "SEO y descubribilidad — etiquetas hreflang para 35 idiomas, esquema WebSite, vistas previas sociales en todas las páginas públicas" },
      },
      {
        type: "improvement",
        text: "Smart refresh during market hours — frequent updates while trading, battery-saving mode otherwise",
        translations: { es: "Actualización inteligente en horario de mercado — actualizaciones frecuentes durante el trading, modo ahorro de batería fuera de horario" },
      },
      {
        type: "improvement",
        text: "Dedicated import page with step-by-step how-to guides for every supported broker",
        translations: { es: "Página de importación dedicada con guías paso a paso para cada bróker soportado" },
      },
    ],
  },
  {
    version: "0.9.0",
    date: "2026-03-05",
    title: "trefolio Leaf Device",
    titleTranslations: { es: "Dispositivo trefolio Leaf" },
    changes: [
      {
        type: "feature",
        text: "trefolio Leaf AMOLED device dashboard — view your portfolio, top holdings, and AI insights on dedicated hardware",
        translations: { es: "Panel AMOLED del dispositivo trefolio Leaf — consulta tu cartera, principales posiciones e insights de IA en hardware dedicado" },
      },
      {
        type: "feature",
        text: "Over-the-air firmware updates with automatic rollback if anything goes wrong",
        translations: { es: "Actualizaciones de firmware por aire con reversión automática si algo falla" },
      },
      {
        type: "feature",
        text: "WiFi setup via captive portal — configure the device directly from your phone",
        translations: { es: "Configuración WiFi mediante portal cautivo — configura el dispositivo directamente desde tu teléfono" },
      },
      {
        type: "feature",
        text: "Display themes — choose between Classic Dark, Minimal Light, and Midnight Green",
        translations: { es: "Temas de pantalla — elige entre Classic Dark, Minimal Light y Midnight Green" },
      },
      {
        type: "feature",
        text: "Device waitlist — sign up to be notified when trefolio Leaf is available",
        translations: { es: "Lista de espera del dispositivo — regístrate para recibir notificación cuando trefolio Leaf esté disponible" },
      },
      {
        type: "feature",
        text: "Linking a trefolio Leaf unlocks a free year of Pro — no charge until your second year",
        translations: { es: "Vincular un trefolio Leaf desbloquea un año gratuito de Pro — sin cargo hasta el segundo año" },
      },
      {
        type: "improvement",
        text: "Secure device passkey authentication with 12-character alphanumeric format",
        translations: { es: "Autenticación segura del dispositivo con clave alfanumérica de 12 caracteres" },
      },
    ],
  },
  {
    version: "0.8.0",
    date: "2026-02-28",
    title: "Modern Authentication",
    titleTranslations: { es: "Autenticación Moderna" },
    changes: [
      {
        type: "feature",
        text: "Sign in with Google — create an account or log in instantly with your Google account",
        translations: { es: "Inicia sesión con Google — crea una cuenta o inicia sesión al instante con tu cuenta de Google" },
      },
      {
        type: "feature",
        text: "Sign in with Apple — available on login, signup, and account linking screens",
        translations: { es: "Inicia sesión con Apple — disponible en inicio de sesión, registro y vinculación de cuentas" },
      },
      {
        type: "feature",
        text: "Passwordless sign-in with passkeys — use biometrics, security keys, or your device",
        translations: { es: "Inicio de sesión sin contraseña con llaves de acceso — usa biometría, llaves de seguridad o tu dispositivo" },
      },
      {
        type: "feature",
        text: "Mandatory email verification after signup for stronger account security",
        translations: { es: "Verificación de email obligatoria tras el registro para mayor seguridad de la cuenta" },
      },
      {
        type: "improvement",
        text: "Link your Google account from your profile to sign in with either password or Google",
        translations: { es: "Vincula tu cuenta de Google desde tu perfil para iniciar sesión con contraseña o Google" },
      },
    ],
  },
  {
    version: "0.7.0",
    date: "2026-02-15",
    title: "PWA, Widgets & 35 Languages",
    titleTranslations: { es: "PWA, Widgets y 35 Idiomas" },
    changes: [
      {
        type: "feature",
        text: "Install trefolio as a PWA on your phone — add to home screen for a native app experience",
        translations: { es: "Instala trefolio como PWA en tu teléfono — añade a la pantalla de inicio para una experiencia de app nativa" },
      },
      {
        type: "feature",
        text: "iOS home screen widget — see portfolio value and daily P/L at a glance",
        translations: { es: "Widget de pantalla de inicio en iOS — consulta el valor de tu cartera y P/L diario de un vistazo" },
      },
      {
        type: "feature",
        text: "35 European languages supported, including all 24 official EU languages",
        translations: { es: "35 idiomas europeos soportados, incluyendo los 24 idiomas oficiales de la UE" },
      },
      {
        type: "improvement",
        text: "AI analysis responds in your selected language",
        translations: { es: "El análisis de IA responde en tu idioma seleccionado" },
      },
      {
        type: "improvement",
        text: "Searchable language picker showing native language names",
        translations: { es: "Selector de idioma con búsqueda mostrando nombres nativos de cada lengua" },
      },
    ],
  },
  {
    version: "0.6.0",
    date: "2026-02-01",
    title: "Multi-Broker Import & AI Intelligence",
    titleTranslations: { es: "Importación Multi-Bróker e Inteligencia con IA" },
    changes: [
      {
        type: "feature",
        text: "Import your portfolio from DEGIRO, Interactive Brokers, Trading 212, and Revolut",
        translations: { es: "Importa tu cartera desde DEGIRO, Interactive Brokers, Trading 212 y Revolut" },
      },
      {
        type: "feature",
        text: "IBKR Flex API direct sync — connect once, then re-sync on demand without CSV downloads (Pro)",
        translations: { es: "Sincronización directa vía API Flex de IBKR — conéctate una vez y re-sincroniza bajo demanda sin descargas de CSV (Pro)" },
      },
      {
        type: "feature",
        text: "AI Portfolio Review — get personalized feedback and recommendations for your portfolio (Pro, 5 reviews/month)",
        translations: { es: "Revisión de Portafolio con IA — obtén análisis y recomendaciones personalizadas para tu cartera (Pro, 5 revisiones/mes)" },
      },
      {
        type: "feature",
        text: "Portfolio news feed with sentiment analysis for your holdings (Pro)",
        translations: { es: "Noticias del portafolio con análisis de sentimiento para tus posiciones (Pro)" },
      },
      {
        type: "feature",
        text: "AI-powered import from screenshots and unstructured files — paste or upload and let AI extract your transactions",
        translations: { es: "Importación con IA desde capturas de pantalla y archivos no estructurados — pega o sube y deja que la IA extraiga tus transacciones" },
      },
      {
        type: "improvement",
        text: "Filter your dashboard by broker to see per-provider breakdowns",
        translations: { es: "Filtra tu panel por bróker para ver desgloses por proveedor" },
      },
    ],
  },
  {
    version: "0.5.0",
    date: "2026-01-15",
    title: "Pro Subscriptions & Price Alerts",
    titleTranslations: { es: "Suscripciones Pro y Alertas de Precio" },
    changes: [
      {
        type: "feature",
        text: "Pro subscriptions — EUR 4.99/month or EUR 39.99/year with Stripe-powered secure checkout",
        translations: { es: "Suscripciones Pro — 4,99 EUR/mes o 39,99 EUR/año con pago seguro mediante Stripe" },
      },
      {
        type: "feature",
        text: "Free plan includes up to 15 holdings; Pro unlocks unlimited holdings",
        translations: { es: "El plan gratuito incluye hasta 15 posiciones; Pro desbloquea posiciones ilimitadas" },
      },
      {
        type: "feature",
        text: "Price alerts — set above/below targets and get email notifications (2 free, unlimited with Pro)",
        translations: { es: "Alertas de precio — establece objetivos de precio y recibe notificaciones por email (2 gratis, ilimitadas con Pro)" },
      },
      {
        type: "feature",
        text: "CSV export for holdings, transactions, and cash balances (Pro)",
        translations: { es: "Exportación CSV de posiciones, transacciones y saldos de efectivo (Pro)" },
      },
      {
        type: "feature",
        text: "Professional landing page with feature showcase, pricing comparison, and FAQ",
        translations: { es: "Página de inicio profesional con vitrina de funcionalidades, comparación de precios y preguntas frecuentes" },
      },
      {
        type: "improvement",
        text: "Security hardening — CAPTCHA protection, rate limiting, and encrypted sessions",
        translations: { es: "Refuerzo de seguridad — protección CAPTCHA, limitación de intentos y sesiones cifradas" },
      },
    ],
  },
  {
    version: "0.4.0",
    date: "2025-12-20",
    title: "Portfolio Dashboard",
    titleTranslations: { es: "Panel de Portafolio" },
    changes: [
      {
        type: "feature",
        text: "Real-time portfolio dashboard with live stock quotes across 5+ exchanges",
        translations: { es: "Panel de portafolio en tiempo real con cotizaciones en vivo de más de 5 bolsas" },
      },
      {
        type: "feature",
        text: "Stock detail pages with interactive price charts and financial statements",
        translations: { es: "Páginas de detalle de acciones con gráficos de precios interactivos y estados financieros" },
      },
      {
        type: "feature",
        text: "Portfolio growth projection with customizable annual growth rate and contributions",
        translations: { es: "Proyección de crecimiento del portafolio con tasa de crecimiento anual y aportaciones personalizables" },
      },
      {
        type: "feature",
        text: "Dividend tracking with income projections, calendar, and per-stock breakdown",
        translations: { es: "Seguimiento de dividendos con proyecciones de ingresos, calendario y desglose por acción" },
      },
      {
        type: "feature",
        text: "Economic indicators dashboard — GDP, CPI, unemployment, and more",
        translations: { es: "Panel de indicadores económicos — PIB, IPC, desempleo y más" },
      },
      {
        type: "feature",
        text: "Benchmark your portfolio against S&P 500, Nasdaq, Dow Jones, and Euro Stoxx 50",
        translations: { es: "Compara tu portafolio con S&P 500, Nasdaq, Dow Jones y Euro Stoxx 50" },
      },
      {
        type: "improvement",
        text: "Performance metrics (TTWROR and IRR) with accurate multi-currency conversion",
        translations: { es: "Métricas de rendimiento (TTWROR y TIR) con conversión multi-divisa precisa" },
      },
      {
        type: "improvement",
        text: "Market news sentiment, insider transactions, and institutional holdings data",
        translations: { es: "Sentimiento de noticias de mercado, transacciones de insiders y datos de tenencias institucionales" },
      },
    ],
  },
];
