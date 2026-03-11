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

export const CURRENT_VERSION = "1.17.0";

export const releaseNotes: ReleaseEntry[] = [
  {
    version: "1.17.0",
    date: "2026-03-11",
    title: "Public Release Notes & Empty State CTAs",
    titleTranslations: { es: "Notas de versión públicas y CTAs en estado vacío" },
    changes: [
      {
        type: "feature",
        text: "Public release notes page at /releasenotes — browse the full changelog without logging in",
        translations: { es: "Página pública de notas de versión en /releasenotes — consulta el historial completo sin iniciar sesión" },
      },
      {
        type: "improvement",
        text: "Empty portfolio table now suggests importing or adding a stock instead of showing plain text",
        translations: { es: "La tabla de cartera vacía ahora sugiere importar o añadir una acción en lugar de mostrar solo texto" },
      },
      {
        type: "improvement",
        text: "Polished release notes — shorter, more benefit-focused descriptions across all versions",
        translations: { es: "Notas de versión mejoradas — descripciones más cortas y orientadas a beneficios en todas las versiones" },
      },
    ],
  },
  {
    version: "1.16.0",
    date: "2026-03-10",
    title: "Transactional Emails & Bug Reports",
    titleTranslations: { es: "Emails transaccionales y reportes de errores" },
    changes: [
      {
        type: "feature",
        text: "Welcome and upgrade emails — new subscribers receive a personalized onboarding email; plan upgrades trigger a feature-highlight email",
        translations: { es: "Emails de bienvenida y mejora — los nuevos suscriptores reciben un email de incorporación personalizado; las mejoras de plan envían un email con las funciones desbloqueadas" },
      },
      {
        type: "feature",
        text: "Bug report option in the feedback modal with automatic context capture",
        translations: { es: "Opción de reporte de errores en el modal de feedback con captura automática de contexto" },
      },
    ],
  },
  {
    version: "1.15.0",
    date: "2026-03-10",
    title: "Market Ticker Bar",
    titleTranslations: { es: "Barra indicadora de mercados" },
    changes: [
      {
        type: "feature",
        text: "Live market ticker bar showing EUR/USD, Bitcoin, Gold, S&P 500, and major exchange statuses at a glance",
        translations: { es: "Barra de mercados en vivo con EUR/USD, Bitcoin, Oro, S&P 500 y estado de las principales bolsas" },
      },
      {
        type: "improvement",
        text: "Exchange rate tooltip on non-EUR transactions shows the rate used for conversion",
        translations: { es: "Tooltip de tipo de cambio en transacciones no-EUR muestra la tasa usada para la conversión" },
      },
    ],
  },
  {
    version: "1.14.0",
    date: "2026-03-10",
    title: "Portfolio Base Currency",
    titleTranslations: { es: "Moneda base del portafolio" },
    changes: [
      {
        type: "feature",
        text: "Choose EUR or USD as your portfolio base currency — all totals and metrics convert automatically",
        translations: { es: "Elige EUR o USD como moneda base del portafolio — todos los totales y métricas se convierten automáticamente" },
      },
    ],
  },
  {
    version: "1.13.0",
    date: "2026-03-10",
    title: "Ad-Supported Free Tier",
    titleTranslations: { es: "Plan gratuito con publicidad" },
    changes: [
      {
        type: "feature",
        text: "Ad-supported free tier — paid plans enjoy a completely ad-free experience",
        translations: { es: "Plan gratuito con publicidad — los planes de pago disfrutan de una experiencia sin anuncios" },
      },
      {
        type: "feature",
        text: "Performance explainer showing step-by-step TTWROR and IRR calculations from your real transactions",
        translations: { es: "Explicación del rendimiento con cálculos TTWROR e IRR paso a paso basados en tus transacciones reales" },
      },
      {
        type: "feature",
        text: "Full crypto transaction management — add, edit, and delete individual transactions inline",
        translations: { es: "Gestión completa de transacciones cripto — añade, edita y elimina transacciones individuales en línea" },
      },
    ],
  },
  {
    version: "1.12.0",
    date: "2026-03-10",
    title: "Crypto Portfolio",
    titleTranslations: { es: "Cartera Cripto" },
    changes: [
      {
        type: "feature",
        text: "Crypto portfolio tracking with a dedicated dashboard tab (Pro)",
        translations: { es: "Seguimiento de cartera cripto con pestaña dedicada en el dashboard (Pro)" },
      },
      {
        type: "feature",
        text: "Asset allocation breakdown — Stocks, ETFs, Crypto, and Cash in an interactive donut chart",
        translations: { es: "Distribución de activos — Acciones, ETFs, Cripto y Efectivo en un gráfico interactivo" },
      },
    ],
  },
  {
    version: "1.11.0",
    date: "2026-03-10",
    title: "Interactive Demo & trefolio Leaf Waitlist",
    titleTranslations: { es: "Demo interactiva y lista de espera trefolio Leaf" },
    changes: [
      {
        type: "feature",
        text: "Interactive demo at /demo — try the full dashboard with sample data, no signup needed",
        translations: { es: "Demo interactiva en /demo — prueba el dashboard completo con datos de ejemplo, sin registro" },
      },
      {
        type: "feature",
        text: "trefolio Leaf waitlist page — join the waitlist for the limited-edition AMOLED desk display",
        translations: { es: "Página de lista de espera trefolio Leaf — únete a la lista de espera del display AMOLED de edición limitada" },
      },
      {
        type: "improvement",
        text: "GDPR-compliant Google Analytics 4 integration with Consent Mode v2",
        translations: { es: "Integración de Google Analytics 4 compatible con GDPR y Consent Mode v2" },
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
        text: "Crypto market section with real-time prices, market cap, and volume for top cryptocurrencies",
        translations: { es: "Sección de mercado cripto con precios en tiempo real, capitalización y volumen de las principales criptomonedas" },
      },
      {
        type: "feature",
        text: "Pro crypto charts, OHLCV data, live exchange rates, and AI market analysis",
        translations: { es: "Gráficos cripto Pro, datos OHLCV, tasas de cambio en vivo y análisis de mercado con IA" },
      },
    ],
  },
  {
    version: "1.9.0",
    date: "2026-03-09",
    title: "Alerts Everywhere",
    titleTranslations: { es: "Alertas en todas partes" },
    changes: [
      {
        type: "feature",
        text: "Set price alerts from your watchlist, stock detail drawer, or profile — alerts are accessible everywhere",
        translations: { es: "Crea alertas de precio desde la lista de seguimiento, el panel de detalle o tu perfil — las alertas están accesibles en todas partes" },
      },
      {
        type: "feature",
        text: "Portfolio-wide alert toggle — get notified when your entire portfolio moves significantly",
        translations: { es: "Alerta para toda la cartera — recibe notificaciones cuando tu cartera se mueva significativamente" },
      },
      {
        type: "improvement",
        text: "Widget portfolio selector for iOS Scriptable widget and Widget View",
        translations: { es: "Selector de portafolio en el widget para iOS Scriptable y Vista Widget" },
      },
      {
        type: "improvement",
        text: "SnapTrade incremental sync — re-syncs only pull new activity",
        translations: { es: "Sincronización incremental de SnapTrade — las re-sincronizaciones solo obtienen actividad nueva" },
      },
      {
        type: "fix",
        text: "Widget now shows the correct amount for the selected portfolio",
        translations: { es: "El widget ahora muestra el monto correcto para el portafolio seleccionado" },
      },
    ],
  },
  {
    version: "1.8.0",
    date: "2026-03-09",
    title: "Multi-Channel Price Alerts",
    titleTranslations: { es: "Alertas de precio multi-canal" },
    changes: [
      {
        type: "feature",
        text: "Percentage-based alerts — trigger on daily change or vs. your purchase price",
        translations: { es: "Alertas basadas en porcentaje — se activan por cambio diario o respecto a tu precio de compra" },
      },
      {
        type: "feature",
        text: "WhatsApp, browser push, and trefolio Leaf notifications for price alerts",
        translations: { es: "Notificaciones por WhatsApp, push del navegador y trefolio Leaf para alertas de precio" },
      },
      {
        type: "improvement",
        text: "Enhanced stock detail with position summary, cost basis, 52-week range, and transaction history",
        translations: { es: "Detalle de acción mejorado con resumen de posición, coste medio, rango de 52 semanas e historial de transacciones" },
      },
      {
        type: "improvement",
        text: "Email alerts now available on Bifolio plan; notification channel preferences in Profile",
        translations: { es: "Alertas por email disponibles en plan Bifolio; preferencias de canales de notificación en Perfil" },
      },
      {
        type: "fix",
        text: "PWA updates correctly after deploys with a refresh prompt",
        translations: { es: "La PWA se actualiza correctamente tras despliegues con un aviso para refrescar" },
      },
      {
        type: "fix",
        text: "SnapTrade import now correctly handles cash balances",
        translations: { es: "La importación de SnapTrade ahora maneja correctamente los saldos de efectivo" },
      },
    ],
  },
  {
    version: "1.7.0",
    date: "2026-03-09",
    title: "Multiple Portfolios",
    titleTranslations: { es: "Múltiples portafolios" },
    changes: [
      {
        type: "feature",
        text: "Create up to 3 independent portfolios with separate holdings and performance tracking (Trefolio)",
        translations: { es: "Crea hasta 3 portafolios independientes con posiciones y rendimiento separados (Trefolio)" },
      },
      {
        type: "feature",
        text: "Portfolio switcher in the toolbar — switch or view the combined total",
        translations: { es: "Selector de portafolios en la barra — cambia entre portafolios o consulta el total combinado" },
      },
      {
        type: "feature",
        text: "Move holdings between portfolios with full transaction history",
        translations: { es: "Mueve posiciones entre portafolios con todo el historial de transacciones" },
      },
      {
        type: "improvement",
        text: "Import and device/widget selectors now support multiple portfolios",
        translations: { es: "Los selectores de importación y dispositivo/widget ahora soportan múltiples portafolios" },
      },
      {
        type: "improvement",
        text: "Downgrade protection — extra portfolios become read-only on lower plans",
        translations: { es: "Protección ante bajada de plan — los portafolios extra pasan a solo lectura" },
      },
    ],
  },
  {
    version: "1.6.0",
    date: "2026-03-08",
    title: "Tier Rebrand: Folio, Bifolio & Trefolio",
    titleTranslations: { es: "Renombre de planes: Folio, Bifolio y Trefolio" },
    changes: [
      {
        type: "feature",
        text: "Plans renamed to Folio (free), Bifolio (mid), and Trefolio (top) with clover-themed branding",
        translations: { es: "Planes renombrados a Folio (gratis), Bifolio (intermedio) y Trefolio (completo) con diseño de trébol" },
      },
      {
        type: "improvement",
        text: "Monthly/Annual toggle on the pricing section with savings at a glance",
        translations: { es: "Selector Mensual/Anual en la sección de precios con ahorros visibles" },
      },
    ],
  },
  {
    version: "1.5.0",
    date: "2026-03-08",
    title: "SnapTrade Brokerage Sync",
    titleTranslations: { es: "Sincronización de bróker SnapTrade" },
    changes: [
      {
        type: "feature",
        text: "Connect 20+ brokerages via SnapTrade and auto-import holdings with secure OAuth (Trefolio)",
        translations: { es: "Conecta más de 20 brókers vía SnapTrade e importa automáticamente tus posiciones con OAuth seguro (Trefolio)" },
      },
      {
        type: "feature",
        text: "Contact Us page with a direct contact form",
        translations: { es: "Página de Contacto con formulario directo" },
      },
    ],
  },
  {
    version: "1.4.0",
    date: "2026-03-08",
    title: "3-Tier Pricing",
    titleTranslations: { es: "Precios en 3 niveles" },
    changes: [
      {
        type: "feature",
        text: "New Bifolio plan at €3.99/mo — 50 holdings, AI calls, sharing, CSV export, and 1-year history",
        translations: { es: "Nuevo plan Bifolio a €3,99/mes — 50 posiciones, llamadas IA, compartir, exportar CSV e historial de 1 año" },
      },
      {
        type: "improvement",
        text: "Trefolio plan at €7.49/mo includes advanced metrics, full history, and unlimited everything",
        translations: { es: "Plan Trefolio a €7,49/mes incluye métricas avanzadas, historial completo y todo ilimitado" },
      },
    ],
  },
  {
    version: "1.3.0",
    date: "2026-03-08",
    title: "Public Sharing & Transaction P&L",
    titleTranslations: { es: "Compartir cartera y P&L por transacción" },
    changes: [
      {
        type: "feature",
        text: "Share your portfolio via a public read-only link (Pro)",
        translations: { es: "Comparte tu cartera con un enlace público de solo lectura (Pro)" },
      },
      {
        type: "feature",
        text: "Realized P&L column in transaction history with FIFO gain/loss per sell",
        translations: { es: "Columna de P&L realizado en el historial de transacciones con ganancia/pérdida FIFO por venta" },
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
    titleTranslations: { es: "Métricas avanzadas e historial de cartera" },
    changes: [
      {
        type: "feature",
        text: "Metrics tab — Sharpe Ratio, Max Drawdown, Volatility (Pro); TTWROR & IRR free for all",
        translations: { es: "Pestaña de Métricas — Ratio de Sharpe, Máx. Drawdown, Volatilidad (Pro); TTWROR e IRR gratis para todos" },
      },
      {
        type: "feature",
        text: "Growth tab — portfolio value chart with 1M / 3M / 6M / 1Y / All range selector",
        translations: { es: "Pestaña de Crecimiento — gráfico del valor de la cartera con selector 1M / 3M / 6M / 1A / Todo" },
      },
    ],
  },
  {
    version: "1.1.0",
    date: "2026-03-08",
    title: "Diversification & Dividends",
    titleTranslations: { es: "Diversificación y dividendos" },
    changes: [
      {
        type: "feature",
        text: "Diversification tab — sector, region, and asset breakdown with donut charts and rebalancing targets",
        translations: { es: "Pestaña de Diversificación — desglose por sector, región y activo con gráficos donut y objetivos de rebalanceo" },
      },
      {
        type: "feature",
        text: "Dividends tab — history, projections, per-stock breakdown, and income charts",
        translations: { es: "Pestaña de Dividendos — historial, proyecciones, desglose por acción y gráficos de ingresos" },
      },
      {
        type: "feature",
        text: "Ex-Dividend Calendar with upcoming dates and estimated income",
        translations: { es: "Calendario Ex-Dividendo con próximas fechas e ingresos estimados" },
      },
      {
        type: "feature",
        text: "Stealth Mode — hide all monetary values with one click",
        translations: { es: "Modo Sigilo — oculta todos los valores monetarios con un clic" },
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
        text: "9 new broker importers: Schwab, Fidelity, Nordnet, Tastytrade, Freetrade, eToro, Wealthsimple, Questrade, and Firstrade",
        translations: { es: "9 nuevos importadores: Schwab, Fidelity, Nordnet, Tastytrade, Freetrade, eToro, Wealthsimple, Questrade y Firstrade" },
      },
      {
        type: "feature",
        text: "Full WCAG 2.1 AA accessibility — keyboard navigation, screen reader support, and color contrast compliance",
        translations: { es: "Accesibilidad WCAG 2.1 AA completa — navegación por teclado, lectores de pantalla y contraste de color" },
      },
      {
        type: "feature",
        text: "Blog with guides for European investors — broker tutorials, tracker comparisons, and AI explainers",
        translations: { es: "Blog con guías para inversores europeos — tutoriales de brókers, comparativas y explicaciones de IA" },
      },
      {
        type: "improvement",
        text: "Smart refresh during market hours to save battery; dedicated import page with step-by-step guides",
        translations: { es: "Actualización inteligente en horario de mercado para ahorrar batería; página de importación con guías paso a paso" },
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
        text: "trefolio Leaf — view your portfolio, top holdings, and AI insights on a dedicated AMOLED display",
        translations: { es: "trefolio Leaf — consulta tu cartera, principales posiciones e insights de IA en una pantalla AMOLED dedicada" },
      },
      {
        type: "feature",
        text: "Over-the-air firmware updates with automatic rollback",
        translations: { es: "Actualizaciones de firmware por aire con reversión automática" },
      },
      {
        type: "feature",
        text: "WiFi setup via captive portal and three display themes",
        translations: { es: "Configuración WiFi por portal cautivo y tres temas de pantalla" },
      },
      {
        type: "feature",
        text: "Linking a Leaf unlocks a free year of Pro",
        translations: { es: "Vincular un Leaf desbloquea un año gratuito de Pro" },
      },
    ],
  },
  {
    version: "0.8.0",
    date: "2026-02-28",
    title: "Modern Authentication",
    titleTranslations: { es: "Autenticación moderna" },
    changes: [
      {
        type: "feature",
        text: "Sign in with Google, Apple, or passwordless passkeys",
        translations: { es: "Inicia sesión con Google, Apple o llaves de acceso sin contraseña" },
      },
      {
        type: "feature",
        text: "Mandatory email verification after signup",
        translations: { es: "Verificación de email obligatoria tras el registro" },
      },
      {
        type: "improvement",
        text: "Link your Google account from your profile for dual sign-in options",
        translations: { es: "Vincula tu cuenta de Google desde tu perfil para dos opciones de inicio de sesión" },
      },
    ],
  },
  {
    version: "0.7.0",
    date: "2026-02-15",
    title: "PWA, Widgets & 35 Languages",
    titleTranslations: { es: "PWA, Widgets y 35 idiomas" },
    changes: [
      {
        type: "feature",
        text: "Install trefolio as a PWA — add to home screen for a native app experience",
        translations: { es: "Instala trefolio como PWA — añade a la pantalla de inicio para una experiencia nativa" },
      },
      {
        type: "feature",
        text: "iOS home screen widget showing portfolio value and daily P/L",
        translations: { es: "Widget de pantalla de inicio en iOS con valor de cartera y P/L diario" },
      },
      {
        type: "feature",
        text: "35 European languages supported, including all 24 official EU languages",
        translations: { es: "35 idiomas europeos soportados, incluyendo los 24 oficiales de la UE" },
      },
      {
        type: "improvement",
        text: "AI analysis responds in your selected language",
        translations: { es: "El análisis de IA responde en tu idioma seleccionado" },
      },
    ],
  },
  {
    version: "0.6.0",
    date: "2026-02-01",
    title: "Multi-Broker Import & AI Intelligence",
    titleTranslations: { es: "Importación multi-bróker e inteligencia con IA" },
    changes: [
      {
        type: "feature",
        text: "Import from DEGIRO, Interactive Brokers, Trading 212, and Revolut",
        translations: { es: "Importa desde DEGIRO, Interactive Brokers, Trading 212 y Revolut" },
      },
      {
        type: "feature",
        text: "AI Portfolio Review with personalized feedback and recommendations (Pro)",
        translations: { es: "Revisión de cartera con IA con análisis y recomendaciones personalizadas (Pro)" },
      },
      {
        type: "feature",
        text: "AI-powered import from screenshots and unstructured files",
        translations: { es: "Importación con IA desde capturas de pantalla y archivos no estructurados" },
      },
      {
        type: "feature",
        text: "Portfolio news feed with sentiment analysis (Pro)",
        translations: { es: "Noticias del portafolio con análisis de sentimiento (Pro)" },
      },
      {
        type: "improvement",
        text: "Dashboard broker filter for per-provider breakdowns",
        translations: { es: "Filtro por bróker en el dashboard para desgloses por proveedor" },
      },
    ],
  },
  {
    version: "0.5.0",
    date: "2026-01-15",
    title: "Pro Subscriptions & Price Alerts",
    titleTranslations: { es: "Suscripciones Pro y alertas de precio" },
    changes: [
      {
        type: "feature",
        text: "Pro subscriptions with Stripe checkout — monthly or annual billing",
        translations: { es: "Suscripciones Pro con pago Stripe — facturación mensual o anual" },
      },
      {
        type: "feature",
        text: "Price alerts with email notifications (2 free, unlimited with Pro)",
        translations: { es: "Alertas de precio con notificaciones por email (2 gratis, ilimitadas con Pro)" },
      },
      {
        type: "feature",
        text: "CSV export for holdings, transactions, and cash (Pro)",
        translations: { es: "Exportación CSV de posiciones, transacciones y efectivo (Pro)" },
      },
      {
        type: "improvement",
        text: "Security hardening — CAPTCHA, rate limiting, and encrypted sessions",
        translations: { es: "Refuerzo de seguridad — CAPTCHA, limitación de intentos y sesiones cifradas" },
      },
    ],
  },
  {
    version: "0.4.0",
    date: "2025-12-20",
    title: "Portfolio Dashboard",
    titleTranslations: { es: "Panel de portafolio" },
    changes: [
      {
        type: "feature",
        text: "Real-time portfolio dashboard with live quotes from 5+ exchanges",
        translations: { es: "Panel de portafolio en tiempo real con cotizaciones de más de 5 bolsas" },
      },
      {
        type: "feature",
        text: "Stock detail pages with interactive charts and financial statements",
        translations: { es: "Páginas de detalle con gráficos interactivos y estados financieros" },
      },
      {
        type: "feature",
        text: "Growth projections, dividend tracking, and economic indicators",
        translations: { es: "Proyecciones de crecimiento, seguimiento de dividendos e indicadores económicos" },
      },
      {
        type: "feature",
        text: "Benchmark against S&P 500, Nasdaq, Dow Jones, and Euro Stoxx 50",
        translations: { es: "Compara con S&P 500, Nasdaq, Dow Jones y Euro Stoxx 50" },
      },
    ],
  },
];
