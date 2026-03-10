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

export const CURRENT_VERSION = "1.12.0";

export const releaseNotes: ReleaseEntry[] = [
  {
    version: "1.12.0",
    date: "2026-03-10",
    title: "Crypto Portfolio",
    titleTranslations: { es: "Cartera Cripto" },
    changes: [
      {
        type: "feature",
        text: "Crypto portfolio tracking — add Bitcoin, Ethereum, and other cryptocurrencies to your portfolio with a dedicated Crypto dashboard tab (Pro)",
        translations: { es: "Seguimiento de cartera cripto — añade Bitcoin, Ethereum y otras criptomonedas a tu cartera con una pestaña dedicada de Cripto en el dashboard (Pro)" },
      },
      {
        type: "feature",
        text: "Admin feature flags for each tool on the Tools page and WhatsApp notifications — enable or disable Transactions, Dividends, Performance, Taxonomy, Rebalancing, Accounts, Watchlist, and WhatsApp from the admin panel",
        translations: { es: "Flags de características de administrador para cada herramienta en la página de Herramientas y notificaciones de WhatsApp — activa o desactiva Transacciones, Dividendos, Rendimiento, Taxonomía, Rebalanceo, Cuentas, Lista de seguimiento y WhatsApp desde el panel de administración" },
      },
    ],
  },
  {
    version: "1.11.0",
    date: "2026-03-10",
    title: "trefolio Leaf Waitlist",
    titleTranslations: { es: "Lista de espera trefolio Leaf" },
    changes: [
      {
        type: "feature",
        text: "Interactive demo at /demo — try the full dashboard with a sample portfolio, no signup required",
        translations: { es: "Demo interactiva en /demo — prueba el dashboard completo con una cartera de ejemplo, sin necesidad de registro" },
      },
      {
        type: "feature",
        text: "Dedicated trefolio Leaf waitlist page at /leaf — join the waitlist for the limited-edition AMOLED desk display",
        translations: { es: "Página dedicada de lista de espera trefolio Leaf en /leaf — únete a la lista de espera del display AMOLED de edición limitada" },
      },
      {
        type: "feature",
        text: "Leaf promotion banner on the dashboard — dismissible banner for logged-in users when device is enabled",
        translations: { es: "Banner promocional Leaf en el dashboard — banner descartable para usuarios conectados cuando el dispositivo está habilitado" },
      },
      {
        type: "feature",
        text: "Admin Docs viewer — browse and preview all HTML planning documents (device lab review, cost analysis, mockups) directly in the admin panel",
        translations: { es: "Visor de Docs en admin — navega y previsualiza todos los documentos HTML de planificación directamente en el panel de admin" },
      },
      {
        type: "improvement",
        text: "Google Analytics 4 integration — consent-gated analytics forwarding for all tracked user actions, with GDPR-compliant Consent Mode v2",
        translations: { es: "Integración de Google Analytics 4 — reenvío de analíticas con consentimiento para todas las acciones rastreadas, con Consent Mode v2 compatible con GDPR" },
      },
    ],
  },
  {
    version: "1.10.0",
    date: "2026-03-09",
    title: "Crypto Market",
    titleTranslations: { es: "Mercado Cripto" },
    changes: [
      {
        type: "feature",
        text: "Cryptocurrency Market section — real-time prices, market cap, and volume for top cryptocurrencies powered by CoinLore, available to all users",
        translations: { es: "Sección de Mercado de Criptomonedas — precios en tiempo real, capitalización y volumen de las principales criptomonedas con CoinLore, disponible para todos los usuarios" },
      },
      {
        type: "feature",
        text: "Pro crypto upgrade — historical price charts, OHLCV market details, live exchange rates with bid/ask, and AI-powered market analysis via Alpha Vantage",
        translations: { es: "Actualización cripto Pro — gráficos históricos de precios, datos OHLCV, tasas de cambio en vivo con compra/venta, y análisis de mercado con IA vía Alpha Vantage" },
      },
      {
        type: "improvement",
        text: "Server-side API cache for crypto data — reduces Alpha Vantage calls with intelligent TTL-based caching (30min daily, 2hr weekly/monthly, 5min exchange rates)",
        translations: { es: "Caché de API del servidor para datos cripto — reduce llamadas a Alpha Vantage con caché inteligente basada en TTL (30min diario, 2h semanal/mensual, 5min tasas de cambio)" },
      },
    ],
  },
  {
    version: "1.9.0",
    date: "2026-03-09",
    title: "Alerts Everywhere",
    titleTranslations: { es: "Alertas en Todas Partes" },
    changes: [
      {
        type: "improvement",
        text: "Widget portfolio selector — choose which portfolio to display on the iOS Scriptable widget and Widget View, or show all portfolios combined",
        translations: { es: "Selector de portafolio en el widget — elige qué portafolio mostrar en el widget Scriptable de iOS y la Vista Widget, o muestra todos los portafolios combinados" },
      },
      {
        type: "fix",
        text: "Widget now shows the correct amount for the selected portfolio and opens trefolio.com when tapped",
        translations: { es: "El widget ahora muestra el monto correcto para el portafolio seleccionado y abre trefolio.com al tocarlo" },
      },
      {
        type: "feature",
        text: "Set price alerts directly from your watchlist — click the bell icon on any watched stock to create a threshold or percentage alert without leaving the page",
        translations: { es: "Crea alertas de precio directamente desde tu lista de seguimiento — haz clic en el icono de campana en cualquier acción para crear una alerta de umbral o porcentaje sin salir de la página" },
      },
      {
        type: "feature",
        text: "Set alerts from the stock detail drawer — open any portfolio stock and create an alert right from the slide-out panel",
        translations: { es: "Crea alertas desde el panel de detalle — abre cualquier acción del portafolio y crea una alerta directamente desde el panel lateral" },
      },
      {
        type: "feature",
        text: "Alert indicators on portfolio stocks — a bell icon now appears next to any stock that has an active price alert",
        translations: { es: "Indicadores de alerta en acciones del portafolio — un icono de campana aparece junto a cualquier acción que tenga una alerta de precio activa" },
      },
      {
        type: "feature",
        text: "Quick portfolio-wide alert from your profile — enable a single toggle to get notified when your entire portfolio moves significantly in a day",
        translations: { es: "Alerta rápida para toda la cartera desde tu perfil — activa un solo interruptor para recibir notificaciones cuando toda tu cartera se mueva significativamente en un día" },
      },
      {
        type: "improvement",
        text: "Set Alert button moved next to the stock price in the detail drawer for quicker access",
        translations: { es: "El botón de alerta se movió junto al precio en el panel de detalle para un acceso más rápido" },
      },
      {
        type: "improvement",
        text: "SnapTrade imports now fetch real transaction history and remember the last sync date per broker, so re-syncs only pull new activity instead of the full history",
        translations: { es: "Las importaciones de SnapTrade ahora obtienen el historial real de transacciones y recuerdan la última fecha de sincronización por bróker, para que las re-sincronizaciones solo obtengan actividad nueva" },
      },
    ],
  },
  {
    version: "1.8.0",
    date: "2026-03-09",
    title: "Multi-Channel Price Alerts",
    titleTranslations: { es: "Alertas de Precio Multi-Canal" },
    changes: [
      {
        type: "feature",
        text: "Percentage-based alerts — get notified when any stock moves by a custom percentage, measured against daily change or your purchase price",
        translations: { es: "Alertas basadas en porcentaje — recibe notificaciones cuando una acción se mueva un porcentaje personalizado, medido contra el cambio diario o tu precio de compra" },
      },
      {
        type: "feature",
        text: "Portfolio-wide alerts — set a single percentage threshold that monitors every holding in your portfolio automatically",
        translations: { es: "Alertas para todo el portafolio — establece un umbral de porcentaje que monitorea automáticamente todas las posiciones de tu portafolio" },
      },
      {
        type: "feature",
        text: "WhatsApp notifications — receive price alert messages directly on WhatsApp (Trefolio plan)",
        translations: { es: "Notificaciones por WhatsApp — recibe alertas de precio directamente en WhatsApp (plan Trefolio)" },
      },
      {
        type: "feature",
        text: "Browser push notifications — get instant desktop/mobile alerts via Chrome, Firefox, or Edge push notifications (Bifolio plan and above)",
        translations: { es: "Notificaciones push del navegador — recibe alertas instantáneas en escritorio/móvil vía notificaciones push de Chrome, Firefox o Edge (plan Bifolio y superior)" },
      },
      {
        type: "feature",
        text: "trefolio Leaf alert notifications — your device now shows price alert notifications alongside portfolio data",
        translations: { es: "Notificaciones de alertas en trefolio Leaf — tu dispositivo ahora muestra notificaciones de alertas de precio junto con los datos del portafolio" },
      },
      {
        type: "improvement",
        text: "Enhanced stock detail page — now shows your position summary (total value, gain/loss, cost basis, 52-week range, market cap, dividends) and full transaction history when viewing any stock",
        translations: { es: "Página de detalle de acción mejorada — ahora muestra el resumen de tu posición (valor total, ganancia/pérdida, coste medio, rango de 52 semanas, capitalización, dividendos) e historial completo de transacciones al ver cualquier acción" },
      },
      {
        type: "improvement",
        text: "Email alerts now available on Bifolio plan (previously Trefolio only)",
        translations: { es: "Alertas por email ahora disponibles en el plan Bifolio (antes solo Trefolio)" },
      },
      {
        type: "improvement",
        text: "Notification channel preferences in Profile — choose which channels receive your alerts",
        translations: { es: "Preferencias de canales de notificación en Perfil — elige qué canales reciben tus alertas" },
      },
      {
        type: "improvement",
        text: "WhatsApp message limits — 5/day and 30/month per user to manage costs; remaining quota shown in notification settings",
        translations: { es: "Límites de mensajes WhatsApp — 5/día y 30/mes por usuario para gestionar costes; cuota restante visible en ajustes de notificaciones" },
      },
      {
        type: "improvement",
        text: "Landing page now highlights trefolio as a Progressive Web App (PWA) with a homescreen mockup screenshot",
        translations: { es: "La página de inicio ahora destaca trefolio como Progressive Web App (PWA) con una captura del icono en la pantalla de inicio" },
      },
      {
        type: "fix",
        text: "PWA now properly updates after a new deploy — the service worker cache is busted on each build and an update banner prompts you to refresh",
        translations: { es: "La PWA ahora se actualiza correctamente tras un nuevo despliegue — la caché del service worker se invalida en cada build y un banner te invita a refrescar" },
      },
      {
        type: "fix",
        text: "Broker API (SnapTrade) import now correctly imports cash balances into the selected portfolio and refreshes them in the dashboard",
        translations: { es: "La importación por API de broker (SnapTrade) ahora importa correctamente los saldos de efectivo en el portafolio seleccionado y los actualiza en el panel" },
      },
    ],
  },
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
