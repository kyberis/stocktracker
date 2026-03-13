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

export const CURRENT_VERSION = "1.31.0";

export const releaseNotes: ReleaseEntry[] = [
  {
    version: "1.31.0",
    date: "2026-03-13",
    title: "Tax Reports — 17 Countries",
    titleTranslations: { es: "Informes Fiscales — 17 Países", de: "Steuerberichte — 17 Länder", fr: "Rapports Fiscaux — 17 Pays" },
    changes: [
      {
        type: "feature",
        text: "Tax reports expanded to 17 countries: UK (CGT, Section 104), US (Schedule D, wash sale), Switzerland (canton wealth tax), Austria (KESt 27.5%), Portugal (NHR regime), Belgium (TOB transaction tax), Ireland (deemed disposal), Sweden (ISK/KF), Denmark (mark-to-market), Norway (shielding deduction), Finland (presumptive acquisition cost), and Poland (Belka tax)",
        translations: {
          es: "Informes fiscales ampliados a 17 países: UK (CGT), EE.UU. (Schedule D), Suiza (impuesto patrimonial cantonal), Austria (KESt), Portugal (régimen NHR), Bélgica (TOB), Irlanda (disposición presunta), Suecia (ISK/KF), Dinamarca (mark-to-market), Noruega (deducción blindaje), Finlandia (coste adquisición presuntivo) y Polonia (impuesto Belka)",
          de: "Steuerberichte auf 17 Länder erweitert: UK (CGT), USA (Schedule D), Schweiz (Kantonssteuer), Österreich (KESt), Portugal (NHR), Belgien (TOB), Irland (Deemed Disposal), Schweden (ISK/KF), Dänemark (Mark-to-Market), Norwegen (Skjermingsfradrag), Finnland (Hankintameno-olettama) und Polen (Belka-Steuer)",
        },
      },
      {
        type: "feature",
        text: "Country-specific controls: Sweden ISK/KF account type selector, Portugal NHR regime toggle, Swiss canton picker with canton-specific wealth tax rates",
        translations: {
          es: "Controles específicos por país: selector de tipo de cuenta ISK/KF para Suecia, activador de régimen NHR para Portugal, selector de cantón suizo con tasas cantonales",
          de: "Länderspezifische Steuerungen: ISK/KF-Kontotyp für Schweden, NHR-Regime für Portugal, Kantonswahl mit kantonsspezifischen Vermögenssteuersätzen für die Schweiz",
        },
      },
      {
        type: "feature",
        text: "Multi-language blog with broker-specific and tax-specific guides in 10 European languages (ES, FR, DE, IT, PT, NL, PL, SV, DA, FI) — localized SEO content for DEGIRO, Interactive Brokers, Trading 212, Revolut, Nordnet, Scalable Capital, and Trade Republic",
        translations: {
          es: "Blog multilingüe con guías específicas de brokers e impuestos en 10 idiomas europeos — contenido SEO localizado para DEGIRO, Interactive Brokers, Trading 212, Revolut, Nordnet, Scalable Capital y Trade Republic",
          de: "Mehrsprachiger Blog mit broker- und steuerspezifischen Anleitungen in 10 europäischen Sprachen — lokalisierte SEO-Inhalte für DEGIRO, Interactive Brokers, Trading 212, Revolut, Nordnet, Scalable Capital und Trade Republic",
          fr: "Blog multilingue avec guides spécifiques aux courtiers et à la fiscalité en 10 langues européennes — contenu SEO localisé pour DEGIRO, Interactive Brokers, Trading 212, Revolut, Nordnet, Scalable Capital et Trade Republic",
        },
      },
      {
        type: "improvement",
        text: "Automated tax rule monitoring expanded to cover all 17 countries with annually-changing thresholds and rates",
        translations: {
          es: "Monitoreo automatizado de reglas fiscales ampliado a los 17 países con umbrales y tasas que cambian anualmente",
          de: "Automatische Steuerregelüberwachung auf alle 17 Länder mit jährlich wechselnden Schwellenwerten und Sätzen erweitert",
        },
      },
    ],
  },
  {
    version: "1.30.0",
    date: "2026-03-13",
    title: "Portfolio Simulator — Backtest, What-If & Stress Test",
    titleTranslations: { es: "Simulador de Cartera — Backtest, What-If y Test de Estrés", de: "Portfolio-Simulator — Backtest, What-If & Stresstest", fr: "Simulateur de Portefeuille — Backtest, What-If & Test de Stress" },
    changes: [
      {
        type: "feature",
        text: "Historical backtesting — DCA simulation with up to 30 years of data, benchmark comparison, CAGR, Sharpe ratio, max drawdown, best/worst year, and dividend income tracking",
        translations: {
          es: "Backtest histórico — simulación DCA con hasta 30 años de datos, comparación con benchmark, CAGR, ratio de Sharpe, caída máxima, mejor/peor año y seguimiento de ingresos por dividendos",
          de: "Historisches Backtesting — DCA-Simulation mit bis zu 30 Jahren Daten, Benchmark-Vergleich, CAGR, Sharpe-Ratio, maximaler Drawdown, bestes/schlechtestes Jahr und Dividendeneinnahmen",
        },
      },
      {
        type: "feature",
        text: "What-If scenario builder — modify your portfolio and project future growth with current vs scenario side-by-side comparison, dividend yield change, and sector concentration analysis",
        translations: {
          es: "Constructor de escenarios What-If — modifica tu cartera y proyecta el crecimiento futuro con comparación actual vs escenario, cambio en rendimiento por dividendos y análisis de concentración sectorial",
        },
      },
      {
        type: "feature",
        text: "Crisis stress testing — simulate impact of 5 historical crises (2008 GFC, COVID-19, Dot-com, 2022 Rate Hike, Euro Debt) on your portfolio with sector-level drawdowns, resilience score, and holding-by-holding impact table",
        translations: {
          es: "Test de estrés de crisis — simula el impacto de 5 crisis históricas en tu cartera con caídas sectoriales, puntuación de resiliencia y tabla de impacto por posición",
        },
      },
      {
        type: "improvement",
        text: "Blog — 10 new SEO-optimized feature guides covering tax reports, dividends, portfolio simulator, stock screener, performance metrics, price alerts, net worth tracking, broker sync, event calendar, and trefolio Leaf. Social share buttons (LinkedIn, X, copy link) added to all blog posts.",
        translations: {
          es: "Blog — 10 nuevas guías de funcionalidades optimizadas para SEO: informes fiscales, dividendos, simulador, screener, métricas de rendimiento, alertas, patrimonio neto, sincronización de broker, calendario de eventos y trefolio Leaf. Botones de compartir en redes sociales añadidos a todos los artículos.",
        },
      },
    ],
  },
  {
    version: "1.29.0",
    date: "2026-03-13",
    title: "European Tax Reports",
    titleTranslations: { es: "Informes Fiscales Europeos", de: "Europäische Steuerberichte", fr: "Rapports Fiscaux Européens", nl: "Europese Belastingrapporten", it: "Report Fiscali Europei" },
    changes: [
      {
        type: "feature",
        text: "European tax reports for Germany, France, Spain, Netherlands, and Italy — generate country-specific tax summaries with FIFO/LIFO/average cost basis, dividend income, withholding tax, and form field mapping (Anlage KAP, Déclaration 2074, Modelo 100, Box 3, Quadro RT/RW)",
        translations: {
          es: "Informes fiscales europeos para Alemania, Francia, España, Países Bajos e Italia — genera resúmenes fiscales específicos por país con base de coste FIFO/LIFO/promedio, ingresos por dividendos, retenciones y mapeo de campos de formulario",
          de: "Europäische Steuerberichte für Deutschland, Frankreich, Spanien, die Niederlande und Italien — länderspezifische Steuerzusammenfassungen mit FIFO/LIFO/Durchschnittskostenbasis, Dividendenerträgen, Quellensteuern und Formularfeldzuordnung (Anlage KAP, Vorabpauschale, Teilfreistellung)",
        },
      },
      {
        type: "feature",
        text: "AI Tax Assistant — get an AI-powered analysis of your tax report with optimization suggestions, data quality checks, and country-specific guidance",
        translations: {
          es: "Asistente fiscal IA — obtén un análisis impulsado por IA de tu informe fiscal con sugerencias de optimización, comprobaciones de calidad de datos y orientación específica por país",
          de: "KI-Steuerassistent — KI-gestützte Analyse Ihres Steuerberichts mit Optimierungsvorschlägen, Datenqualitätsprüfungen und länderspezifischer Beratung",
        },
      },
      {
        type: "feature",
        text: "Germany-specific: Vorabpauschale calculator for accumulating ETFs, Teilfreistellung (30% equity exemption), and Sparerpauschbetrag tracking",
        translations: {
          de: "Deutschland-spezifisch: Vorabpauschale-Rechner für thesaurierende ETFs, Teilfreistellung (30% Aktienfreistellung) und Sparerpauschbetrag-Verfolgung",
        },
      },
      {
        type: "feature",
        text: "Spain-specific: Modelo 720 foreign asset threshold detection and 2-month wash sale rule checking",
        translations: {
          es: "Específico para España: Detección del umbral del Modelo 720 para activos en el extranjero y verificación de la regla antiaplicación de 2 meses",
        },
      },
      {
        type: "feature",
        text: "Netherlands Box 3 wealth tax calculator with deemed return rates and threshold tracking",
        translations: {
          nl: "Box 3 vermogensbelastingberekening met forfaitaire rendementen en drempelbewaking",
        },
      },
      {
        type: "feature",
        text: "Italy-specific: LIFO cost basis for regime dichiarativo, Quadro RW foreign asset monitoring, and IVAFE calculation",
        translations: {
          it: "Specifico per l'Italia: Base di costo LIFO per regime dichiarativo, monitoraggio Quadro RW attività estere e calcolo IVAFE",
        },
      },
      {
        type: "improvement",
        text: "CSV export for tax data — download realized gains, dividends, and form field summaries",
        translations: {
          es: "Exportación CSV de datos fiscales — descarga ganancias realizadas, dividendos y resúmenes de campos de formulario",
        },
      },
    ],
  },
  {
    version: "1.28.0",
    date: "2026-03-13",
    title: "Streamlined Onboarding",
    titleTranslations: { es: "Onboarding Simplificado" },
    changes: [
      {
        type: "feature",
        text: "New portfolio import step during onboarding — connect your broker, upload a CSV, or use AI import right from setup",
        translations: { es: "Nuevo paso de importación de portafolio durante el onboarding — conecta tu broker, sube un CSV o usa importación con IA directamente desde la configuración" },
      },
      {
        type: "improvement",
        text: "Email verification is no longer a blocker — sign up and start using trefolio immediately; verify later to unlock billing and data export",
        translations: { es: "La verificación de email ya no es obligatoria — regístrate y empieza a usar trefolio inmediatamente; verifica después para desbloquear facturación y exportación" },
      },
      {
        type: "feature",
        text: "Country-aware broker suggestions during onboarding — see the most popular brokers for your region first",
        translations: { es: "Sugerencias de brokers por país durante el onboarding — ve primero los brokers más populares de tu región" },
      },
      {
        type: "improvement",
        text: "New users always see a populated dashboard — sample data is auto-loaded if you skip import, with a banner to import your real portfolio",
        translations: { es: "Los nuevos usuarios siempre ven un dashboard con datos — se cargan datos de ejemplo automáticamente si omites la importación, con un banner para importar tu portafolio real" },
      },
      {
        type: "improvement",
        text: "Interactive dashboard tour now triggers on first visit, not just theme changes",
        translations: { es: "El tour interactivo del dashboard ahora se activa en la primera visita, no solo al cambiar de tema" },
      },
    ],
  },
  {
    version: "1.27.0",
    date: "2026-03-12",
    title: "Screener Navigation & Price Charts",
    titleTranslations: { es: "Navegación del Screener y Gráficos de Precios" },
    changes: [
      {
        type: "improvement",
        text: "Stock screener now lives at /tools/screener with its own URL — clicking a stock goes to /tools/screener/stock/TICKER, and back always returns to the screener with filters preserved",
        translations: { es: "El screener de acciones ahora tiene su propia URL en /tools/screener — al hacer clic en una acción se navega a /tools/screener/stock/TICKER, y volver siempre regresa al screener con los filtros aplicados" },
      },
      {
        type: "feature",
        text: "Price evolution chart now always visible on stock detail pages, even for stocks not in your portfolio",
        translations: { es: "El gráfico de evolución de precios ahora siempre es visible en las páginas de detalle de acciones, incluso para acciones que no están en tu cartera" },
      },
    ],
  },
  {
    version: "1.26.0",
    date: "2026-03-12",
    title: "In-App Notification Center",
    titleTranslations: { es: "Centro de Notificaciones" },
    changes: [
      {
        type: "feature",
        text: "New notification center with bell icon — receive welcome, upgrade, and downgrade notifications plus admin broadcasts right inside the app",
        translations: { es: "Nuevo centro de notificaciones con icono de campana — recibe notificaciones de bienvenida, upgrade y downgrade, además de avisos del administrador dentro de la app" },
      },
    ],
  },
  {
    version: "1.25.0",
    date: "2026-03-12",
    title: "Stock Screener",
    titleTranslations: { es: "Filtro de Acciones" },
    changes: [
      {
        type: "feature",
        text: "New stock screener lets you filter 600+ stocks by dividend yield, P/E ratio, sector, market cap, exchange, and country with preset strategies",
        translations: { es: "Nuevo filtro de acciones que permite filtrar más de 600 acciones por dividendo, ratio P/E, sector, capitalización, bolsa y país con estrategias predefinidas" },
      },
    ],
  },
  {
    version: "1.24.0",
    date: "2026-03-12",
    title: "Onboarding Wizard",
    titleTranslations: { es: "Asistente de Configuración Inicial" },
    changes: [
      {
        type: "feature",
        text: "New onboarding wizard after email verification guides you through setting your name, default currency, tax residency, passkey, and Google account linking",
        translations: { es: "Nuevo asistente de configuración tras la verificación de email que te guía para establecer tu nombre, moneda predeterminada, residencia fiscal, passkey y vinculación de cuenta de Google" },
      },
    ],
  },
  {
    version: "1.23.1",
    date: "2026-03-12",
    title: "Multi-Broker Sync Fixes",
    titleTranslations: { es: "Correcciones de Sincronización Multi-Broker" },
    changes: [
      {
        type: "improvement",
        text: "Theme fonts now load on demand — only the font for your active theme is downloaded, reducing page weight for most users",
        translations: { es: "Las fuentes de los temas ahora se cargan bajo demanda — solo se descarga la fuente del tema activo, reduciendo el peso de la página para la mayoría de usuarios" },
      },
      {
        type: "fix",
        text: "Fixed automatic 6-hour broker sync failing silently due to missing cron authentication on the bulk import endpoint",
        translations: { es: "Corregida la sincronización automática cada 6 horas que fallaba silenciosamente por falta de autenticación cron en el endpoint de importación masiva" },
      },
      {
        type: "improvement",
        text: "Broker connection status now shows all connected brokerages with active/disabled state and expiry dates for easier multi-broker management",
        translations: { es: "El estado de conexión del broker ahora muestra todas las cuentas conectadas con estado activo/deshabilitado y fechas de expiración para facilitar la gestión multi-broker" },
      },
      {
        type: "feature",
        text: "Added broker availability check to diagnose which brokerages are supported and their current status",
        translations: { es: "Añadida verificación de disponibilidad de brokers para diagnosticar qué brokers están soportados y su estado actual" },
      },
    ],
  },
  {
    version: "1.23.0",
    date: "2026-03-12",
    title: "Net Worth Tracking — Real Estate, Savings & Pensions",
    titleTranslations: { es: "Seguimiento de Patrimonio Neto — Inmuebles, Ahorros y Pensiones" },
    changes: [
      {
        type: "improvement",
        text: "Redesigned landing page with CSS-illustrated dashboard mock, themes showcase, value proposition cards, trust section, and getting-started steps",
        translations: { es: "Página de inicio rediseñada con panel CSS ilustrado, vitrina de temas, tarjetas de propuesta de valor, sección de confianza y pasos de inicio" },
      },
      {
        type: "feature",
        text: "Guided theme tour walks you through the main dashboard sections the first time you switch to a new theme",
        translations: { es: "Tour guiado del tema que te muestra las secciones principales del panel la primera vez que cambias a un tema nuevo" },
      },
      {
        type: "feature",
        text: "Track your full net worth with manual entries for real estate, savings accounts, and pension/retirement funds",
        translations: { es: "Registra tu patrimonio neto completo con entradas manuales para inmuebles, cuentas de ahorro y fondos de pensión/jubilación" },
      },
      {
        type: "feature",
        text: "Net Worth Overview card with total value, category breakdown, and donut chart on the portfolio dashboard",
        translations: { es: "Tarjeta de Resumen de Patrimonio Neto con valor total, desglose por categoría y gráfico de dona en el panel del portafolio" },
      },
      {
        type: "feature",
        text: "Add Manual Asset modal with type picker, multi-currency support, and optional notes for each asset",
        translations: { es: "Modal de Añadir Activo Manual con selector de tipo, soporte multi-divisa y notas opcionales para cada activo" },
      },
      {
        type: "improvement",
        text: "Cash section now groups entries by category (real estate, savings, pension, cash) with subtotals",
        translations: { es: "La sección de efectivo ahora agrupa las entradas por categoría (inmuebles, ahorros, pensión, efectivo) con subtotales" },
      },
      {
        type: "improvement",
        text: "Asset allocation donut chart now includes real estate, savings, and pension alongside stocks, ETFs, and crypto",
        translations: { es: "El gráfico de asignación de activos ahora incluye inmuebles, ahorros y pensión junto con acciones, ETFs y cripto" },
      },
    ],
  },
  {
    version: "1.22.0",
    date: "2026-03-12",
    title: "Multi-Currency Expansion — 21 Currencies Supported",
    titleTranslations: { es: "Expansión Multi-Divisa — 21 Monedas Soportadas" },
    changes: [
      {
        type: "feature",
        text: "Expanded from 5 to 21 supported currencies including GBP, CHF, SEK, NOK, AUD, NZD, JPY, PLN, CZK, HUF, SGD, HKD, and more",
        translations: { es: "Ampliación de 5 a 21 divisas soportadas incluyendo GBP, CHF, SEK, NOK, AUD, NZD, JPY, PLN, CZK, HUF, SGD, HKD y más" },
      },
      {
        type: "feature",
        text: "Dynamic exchange rate fetching — only the currencies in your portfolio are fetched, no wasted API calls",
        translations: { es: "Obtención dinámica de tipos de cambio — solo se consultan las divisas de tu portafolio" },
      },
      {
        type: "feature",
        text: "Change portfolio base currency after creation directly from the portfolio dropdown",
        translations: { es: "Cambia la moneda base del portafolio después de crearlo desde el menú desplegable" },
      },
      {
        type: "feature",
        text: "Default currency preference in Settings — new portfolios automatically use your preferred currency",
        translations: { es: "Preferencia de moneda predeterminada en Configuración — los nuevos portafolios usan tu moneda preferida" },
      },
      {
        type: "feature",
        text: "FX impact indicator on holdings — see how much of your gain/loss is from currency movement vs stock performance",
        translations: { es: "Indicador de impacto cambiario en posiciones — ve cuánto de tu ganancia/pérdida es por movimiento de divisa vs rendimiento del activo" },
      },
      {
        type: "improvement",
        text: "Warning banner when exchange rates are unavailable instead of silently showing approximate values",
        translations: { es: "Banner de advertencia cuando los tipos de cambio no están disponibles en lugar de mostrar valores aproximados silenciosamente" },
      },
      {
        type: "fix",
        text: "Fixed incorrect exchange rate key format in portfolio projection chart causing wrong dividend yield calculations",
        translations: { es: "Corregido el formato incorrecto de clave de tipo de cambio en la proyección del portafolio que causaba cálculos erróneos de rendimiento de dividendos" },
      },
    ],
  },
  {
    version: "1.21.0",
    date: "2026-03-11",
    title: "Dashboard Themes — Personalize Your Experience",
    titleTranslations: { es: "Temas del Panel — Personaliza tu Experiencia" },
    changes: [
      {
        type: "feature",
        text: "Choose from 4 dashboard themes: Default, Canvas (light & spacious), Terminal (dense monospace), and Studio (sidebar + glass effects)",
        translations: { es: "Elige entre 4 temas: Predeterminado, Canvas (claro y espacioso), Terminal (monoespacio denso) y Studio (barra lateral + efectos de cristal)" },
      },
      {
        type: "feature",
        text: "Themes apply site-wide across all authenticated pages — portfolio, import, tools, profile, and more",
        translations: { es: "Los temas se aplican en todo el sitio: cartera, importación, herramientas, perfil y más" },
      },
      {
        type: "improvement",
        text: "Theme selection available in Settings — Default for all plans, Canvas for Bifolio+, Terminal and Studio for Trefolio",
        translations: { es: "Selección de temas disponible en Configuración — Predeterminado para todos, Canvas para Bifolio+, Terminal y Studio para Trefolio" },
      },
    ],
  },
  {
    version: "1.20.0",
    date: "2026-03-11",
    title: "Event Calendar — Earnings, Economic Events & IPOs",
    titleTranslations: { es: "Calendario de Eventos — Resultados, Eventos Económicos y OPVs" },
    changes: [
      {
        type: "feature",
        text: "New Event Calendar dashboard tab with earnings reports, economic events, and IPO tracking",
        translations: { es: "Nuevo Calendario de Eventos con informes de resultados, eventos económicos y seguimiento de OPVs" },
      },
      {
        type: "feature",
        text: "Interactive month grid view with color-coded event dots and a chronological list view",
        translations: { es: "Vista de cuadrícula mensual interactiva con puntos de colores por tipo de evento y vista de lista cronológica" },
      },
      {
        type: "feature",
        text: "Portfolio-aware earnings highlights — see which upcoming reports affect your holdings",
        translations: { es: "Resultados destacados según tu cartera — mira qué informes próximos afectan tus posiciones" },
      },
      {
        type: "improvement",
        text: "Free users see earnings for their holdings; Bifolio adds full market earnings + economic events; Trefolio unlocks IPO calendar",
        translations: { es: "Usuarios gratuitos ven resultados de sus posiciones; Bifolio añade todos los resultados + eventos económicos; Trefolio desbloquea calendario de OPVs" },
      },
      {
        type: "fix",
        text: "Broker connect and reconnect now work correctly in PWA standalone mode (popup replaced with same-window redirect)",
        translations: { es: "La conexión y reconexión del bróker ahora funciona correctamente en modo PWA (popup reemplazado por redirección en la misma ventana)" },
      },
      {
        type: "improvement",
        text: "Stale broker connections with all credentials expired for over 24 hours are now automatically cleaned up to avoid unnecessary charges",
        translations: { es: "Las conexiones de bróker inactivas con credenciales expiradas durante más de 24 horas se eliminan automáticamente para evitar cargos innecesarios" },
      },
      {
        type: "feature",
        text: "Last activity timestamp shown on your profile for security awareness",
        translations: { es: "Marca de tiempo de última actividad visible en tu perfil para mayor seguridad" },
      },
      {
        type: "feature",
        text: "Big market move alerts — marquee highlights, a floating toast, and an optional browser push notification when any index moves more than 4%",
        translations: { es: "Alertas de grandes movimientos — el marquesina resalta, una notificación flotante, y notificación push del navegador cuando un índice se mueve más del 4%" },
      },
      {
        type: "improvement",
        text: "Cron job execution tracking with admin visibility — see run history, success rates, and errors at a glance",
        translations: { es: "Seguimiento de ejecución de tareas cron con visibilidad para administradores — historial de ejecuciones, tasas de éxito y errores de un vistazo" },
      },
    ],
  },
  {
    version: "1.19.0",
    date: "2026-03-11",
    title: "Broker Sync for Everyone — Auto-Sync & Privacy First",
    titleTranslations: { es: "Broker Sync para todos — Sincronización automática y privacidad ante todo" },
    changes: [
      {
        type: "feature",
        text: "Broker Sync now available on Bifolio (1 connection) and Trefolio (unlimited) — no longer Pro-only",
        translations: { es: "Broker Sync ahora disponible en Bifolio (1 conexión) y Trefolio (ilimitado) — ya no solo Pro" },
      },
      {
        type: "feature",
        text: "Automatic portfolio sync every 6 hours — your holdings stay up-to-date without manual imports",
        translations: { es: "Sincronización automática de cartera cada 6 horas — tus posiciones se mantienen actualizadas sin importaciones manuales" },
      },
      {
        type: "feature",
        text: "Dashboard reconnect banner — expired broker credentials are surfaced immediately with a one-tap fix",
        translations: { es: "Banner de reconexión en el dashboard — las credenciales expiradas del bróker se muestran inmediatamente con solución en un toque" },
      },
      {
        type: "improvement",
        text: "Privacy-first trust messaging on import page: read-only access, no credential storage, powered by SnapTrade & Plaid",
        translations: { es: "Mensajes de confianza y privacidad en la página de importación: acceso de solo lectura, sin almacenamiento de credenciales, con SnapTrade y Plaid" },
      },
      {
        type: "improvement",
        text: "Auto-sync status bar shows last sync time and next sync estimate on broker connection cards",
        translations: { es: "La barra de estado de auto-sincronización muestra la última sincronización y la próxima estimación en las tarjetas de conexión del bróker" },
      },
    ],
  },
  {
    version: "1.18.0",
    date: "2026-03-11",
    title: "Tier Rebalance — More Value at Every Plan",
    titleTranslations: { es: "Rebalanceo de planes — Más valor en cada nivel" },
    changes: [
      {
        type: "feature",
        text: "Portfolio Growth Projection is now free for all users",
        translations: { es: "La Proyección de Crecimiento del Portafolio ahora es gratis para todos los usuarios" },
      },
      {
        type: "feature",
        text: "Advanced metrics (Sharpe Ratio, Max Drawdown, Volatility) now included in Bifolio",
        translations: { es: "Métricas avanzadas (Ratio de Sharpe, Máximo Drawdown, Volatilidad) ahora incluidas en Bifolio" },
      },
      {
        type: "feature",
        text: "Full portfolio growth history (all time ranges) now included in Bifolio",
        translations: { es: "Historial completo de crecimiento del portafolio (todos los rangos) ahora incluido en Bifolio" },
      },
      {
        type: "improvement",
        text: "Updated pricing pages, landing page, and plan comparisons to reflect new tier structure",
        translations: { es: "Páginas de precios, landing page y comparaciones de planes actualizadas con la nueva estructura de niveles" },
      },
      {
        type: "improvement",
        text: "Paid features now show tier badges — subtle leaf icons for subscribers, upgrade pills for free users",
        translations: { es: "Las funciones de pago ahora muestran insignias de nivel — iconos de hoja sutiles para suscriptores, indicadores de mejora para usuarios gratuitos" },
      },
    ],
  },
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
