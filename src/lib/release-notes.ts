export type ChangeType = "feature" | "improvement" | "fix";
export { CURRENT_VERSION } from "@/lib/release-version";

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

export const releaseNotes: ReleaseEntry[] = [
  {
    version: "1.71.0",
    date: "2026-04-05",
    title: "Post Comments",
    titleTranslations: { es: "Comentarios en Publicaciones" },
    changes: [
      {
        type: "feature",
        text: "Comments on social posts: connected users can comment on posts, with threaded replies and real-time updates. Post authors can enable or disable comments from their profile settings (enabled by default).",
        translations: {
          es: "Comentarios en publicaciones sociales: los usuarios conectados pueden comentar en las publicaciones, con respuestas anidadas y actualizaciones en tiempo real. Los autores pueden activar o desactivar los comentarios desde la configuración de su perfil (activado por defecto).",
        },
      },
      {
        type: "improvement",
        text: "Comment counts are now displayed on post cards in the feed and profile pages.",
        translations: {
          es: "Los conteos de comentarios ahora se muestran en las tarjetas de publicaciones en el feed y perfiles.",
        },
      },
    ],
  },
  {
    version: "1.70.0",
    date: "2026-04-05",
    title: "Social Network",
    titleTranslations: { es: "Red Social" },
    changes: [
      {
        type: "feature",
        text: "Public investor profiles with unique URLs (/u/username): share your bio, headline, experience level, and optionally your portfolio value and holdings composition with the community.",
        translations: {
          es: "Perfiles públicos de inversor con URLs únicas (/u/usuario): comparte tu biografía, titular, nivel de experiencia, y opcionalmente el valor de tu portafolio y composición de participaciones con la comunidad.",
        },
      },
      {
        type: "feature",
        text: "Rich-content posts: publish articles, analyses, trade ideas, and portfolio updates with full formatting. Choose public, network-only, or private visibility for each post.",
        translations: {
          es: "Publicaciones con contenido enriquecido: publica artículos, análisis, ideas de trading y actualizaciones de portafolio con formato completo. Elige visibilidad pública, solo red, o privada para cada publicación.",
        },
      },
      {
        type: "feature",
        text: "Connection system: find investors, send connection requests, and message connected users directly through the existing private chat. Posts mentioning tickers automatically show financial disclaimers.",
        translations: {
          es: "Sistema de conexiones: encuentra inversores, envía solicitudes de conexión y envía mensajes directos a usuarios conectados a través del chat privado existente. Las publicaciones que mencionan tickers muestran automáticamente avisos financieros.",
        },
      },
      {
        type: "feature",
        text: "People search with filters: search by name or username, filter by experience level, and find active investors who share content or have connections.",
        translations: {
          es: "Búsqueda de personas con filtros: busca por nombre o usuario, filtra por nivel de experiencia y encuentra inversores activos que comparten contenido o tienen conexiones.",
        },
      },
      {
        type: "feature",
        text: "Network feed: see posts from your connections and discover public content from the community, all in a personalized timeline.",
        translations: {
          es: "Feed de red: ve publicaciones de tus conexiones y descubre contenido público de la comunidad, todo en una línea de tiempo personalizada.",
        },
      },
    ],
  },
  {
    version: "1.69.0",
    date: "2026-04-04",
    title: "AI Model Configuration",
    titleTranslations: { es: "Configuración de Modelos de IA" },
    changes: [
      {
        type: "feature",
        text: "Admins can now select which OpenAI model powers each AI feature (analysis, portfolio score, digest, import, and more) from the Settings page. Models can be swapped per flow without code changes.",
        translations: {
          es: "Los administradores ahora pueden seleccionar qué modelo de OpenAI impulsa cada función de IA (análisis, puntuación de portafolio, resumen, importación y más) desde la página de Configuración. Los modelos se pueden cambiar por flujo sin modificar código.",
        },
      },
      {
        type: "feature",
        text: "New AI Compare tool in the admin panel lets you replay real user prompts against multiple models side-by-side, comparing response quality, latency, and cost before switching production models.",
        translations: {
          es: "Nueva herramienta de Comparación de IA en el panel de administración permite reproducir prompts reales de usuarios contra múltiples modelos en paralelo, comparando calidad de respuesta, latencia y costo antes de cambiar los modelos en producción.",
        },
      },
      {
        type: "feature",
        text: "Published market digests are now automatically posted to X.com (Twitter) each evening. An AI-generated tweet summarizing the digest is scheduled for 18:00 UTC and posted via the existing X cron.",
        translations: {
          es: "Los resúmenes de mercado publicados ahora se publican automáticamente en X.com (Twitter) cada tarde. Un tweet generado por IA que resume el digest se programa para las 18:00 UTC y se publica a través del cron de X existente.",
        },
      },
      {
        type: "improvement",
        text: "Market digests now combine multiple forwarded newsletters sent on the same day into a single cohesive article. Links from original sources are preserved in the generated content, and new emails arriving later automatically update the existing draft.",
        translations: {
          es: "Los resúmenes de mercado ahora combinan múltiples boletines reenviados del mismo día en un solo artículo coherente. Los enlaces de las fuentes originales se preservan en el contenido generado, y nuevos correos que lleguen después actualizan automáticamente el borrador existente.",
        },
      },
      {
        type: "improvement",
        text: "Signup conversion events are now sent to Google Analytics for all signup methods (credentials, Google, and Apple), enabling accurate conversion tracking in GA4 and Google Ads.",
        translations: {
          es: "Los eventos de conversión de registro ahora se envían a Google Analytics para todos los métodos de registro (credenciales, Google y Apple), permitiendo un seguimiento preciso de conversiones en GA4 y Google Ads.",
        },
      },
    ],
  },
  {
    version: "1.68.1",
    date: "2026-04-03",
    title: "Broker Sync Fix",
    titleTranslations: { es: "Corrección de Sincronización de Broker" },
    changes: [
      {
        type: "fix",
        text: "Fixed SnapTrade resync not picking up updated holdings or new transactions. Broker connections are now refreshed before fetching data, and positions held across multiple broker accounts are correctly aggregated instead of only counting the first occurrence.",
        translations: {
          es: "Corregido que la resincronización de SnapTrade no detectara posiciones actualizadas ni nuevas transacciones. Las conexiones de brokers ahora se actualizan antes de obtener datos, y las posiciones en múltiples cuentas de broker se agregan correctamente en lugar de contar solo la primera ocurrencia.",
        },
      },
    ],
  },
  {
    version: "1.68.0",
    date: "2026-03-22",
    title: "Market Insights",
    titleTranslations: { es: "Análisis de Mercado" },
    changes: [
      {
        type: "fix",
        text: "Fixed crypto holdings showing no EUR value and missing snapshots when the ticker contained spaces instead of hyphens (e.g. 'BTC USD' instead of 'BTC-USD'). Tickers are now normalized across all quote fetching, snapshot generation, and cron refresh paths.",
        translations: {
          es: "Corregido que las criptomonedas no mostraran valor en EUR ni generaran snapshots cuando el ticker contenía espacios en lugar de guiones (ej. 'BTC USD' en vez de 'BTC-USD'). Los tickers ahora se normalizan en todas las rutas de obtención de cotizaciones, generación de snapshots y cron de actualización.",
        },
      },
      {
        type: "feature",
        text: "New Market Insights page with AI-curated market intelligence. Digests are automatically processed from financial newsletters, rewritten as original editorial content, translated into all active user languages, and published after admin review. Tickers in your portfolio are highlighted, and admins can optionally send digests via email.",
        translations: {
          es: "Nueva página de Análisis de Mercado con inteligencia de mercado curada por IA. Los resúmenes se procesan automáticamente de boletines financieros, se reescriben como contenido editorial original, se traducen a todos los idiomas activos y se publican tras revisión del administrador. Los tickers de tu portafolio se resaltan, y los administradores pueden enviar los resúmenes por email opcionalmente.",
        },
      },
      {
        type: "fix",
        text: "Portfolio chart no longer shows spikes when adding or removing cash and manual assets. The chart now tracks holdings value only, keeping it consistent with historical data.",
        translations: {
          es: "El gráfico del portafolio ya no muestra picos al añadir o eliminar efectivo y activos manuales. El gráfico ahora muestra solo el valor de las inversiones, manteniéndolo consistente con los datos históricos.",
        },
      },
      {
        type: "fix",
        text: "Market move alert now shows expanded only once per day; subsequent page visits keep it minimized. Dismissing hides it for the rest of the day.",
        translations: {
          es: "La alerta de movimientos de mercado ahora se muestra expandida solo una vez al día; las visitas posteriores la mantienen minimizada. Al descartarla se oculta por el resto del día.",
        },
      },
    ],
  },
  {
    version: "1.67.0",
    date: "2026-03-27",
    title: "Satisfaction Survey",
    titleTranslations: { es: "Encuesta de satisfacción" },
    changes: [
      {
        type: "feature",
        text: "In-app satisfaction survey that appears after meaningful interactions. Rate your experience with stars, leave optional comments, and help shape trefolio's future.",
        translations: {
          es: "Encuesta de satisfacción integrada que aparece tras interacciones significativas. Califica tu experiencia con estrellas, deja comentarios opcionales y ayuda a dar forma al futuro de trefolio.",
        },
      },
    ],
  },
  {
    version: "1.66.0",
    date: "2026-03-25",
    title: "Portfolio Performance Page",
    titleTranslations: { es: "Página de rendimiento del portafolio" },
    changes: [
      {
        type: "feature",
        text: "New dedicated /portfolio page with interactive value and performance charts. Supports 1D/1W/3M/6M/YTD/1Y time ranges, benchmark comparisons, asset type filtering, market session overlays, weekend shading, and a generate-history CTA for new users.",
        translations: {
          es: "Nueva página /portfolio dedicada con gráficos interactivos de valor y rendimiento. Soporta rangos de tiempo 1D/1S/3M/6M/YTD/1A, comparaciones con índices, filtrado por tipo de activo, superposición de sesiones de mercado, sombreado de fines de semana y un CTA de generación de historial para nuevos usuarios.",
        },
      },
      {
        type: "improvement",
        text: "Yahoo Finance API calls are now cached for 5 minutes to reduce redundant requests when multiple users hold the same tickers.",
        translations: {
          es: "Las llamadas a la API de Yahoo Finance ahora se almacenan en caché durante 5 minutos para reducir solicitudes redundantes cuando varios usuarios tienen los mismos tickers.",
        },
      },
      {
        type: "improvement",
        text: "Ask AI button on the portfolio page and chart footer — get instant AI-powered analysis of your portfolio performance.",
        translations: {
          es: "Botón 'Preguntar a la IA' en la página de portafolio y el pie del gráfico — obtén análisis instantáneo de tu rendimiento con inteligencia artificial.",
        },
      },
      {
        type: "fix",
        text: "Portfolio chart: market session dots now show their actual exchange color instead of all being green. Closed-market zones are more visible with stronger hatching and session open/close markers.",
        translations: {
          es: "Gráfico de portafolio: los indicadores de sesión de mercado ahora muestran su color real por bolsa en vez de ser todos verdes. Las zonas de mercado cerrado son más visibles con un rayado más fuerte y marcadores de apertura/cierre de sesión.",
        },
      },
      {
        type: "fix",
        text: "Benchmark overlay lines now draw correctly on the portfolio chart with proper data alignment, forward-fill, and normalization.",
        translations: {
          es: "Las líneas de comparación con índices ahora se dibujan correctamente en el gráfico de portafolio con alineación de datos, relleno progresivo y normalización adecuados.",
        },
      },
      {
        type: "improvement",
        text: "Benchmark overlays are now only shown in Performance mode, keeping the Value chart clean and focused on portfolio value.",
        translations: {
          es: "Las líneas de comparación con índices ahora solo se muestran en modo Rendimiento, manteniendo el gráfico de Valor limpio y enfocado en el valor del portafolio.",
        },
      },
      {
        type: "feature",
        text: "Spike detection on the portfolio chart — significant gains or losses are highlighted with colored dots. Hovering reveals a per-asset-type breakdown (from actual snapshot data) and estimated top holding contributors.",
        translations: {
          es: "Detección de picos en el gráfico de portafolio — las ganancias o pérdidas significativas se resaltan con puntos de color. Al pasar el cursor se muestra un desglose por tipo de activo (datos reales de snapshot) y las posiciones que probablemente contribuyeron más.",
        },
      },
      {
        type: "improvement",
        text: "Removed legacy chart stack — the V2 portfolio chart is now the default for all users on desktop and mobile.",
        translations: {
          es: "Se eliminó el gráfico heredado — el gráfico V2 del portafolio es ahora el predeterminado para todos los usuarios en escritorio y móvil.",
        },
      },
    ],
  },
  {
    version: "1.65.0",
    date: "2026-03-24",
    title: "Portfolio Breakdown by Asset Type",
    titleTranslations: { es: "Desglose del portafolio por tipo de activo" },
    changes: [
      {
        type: "feature",
        text: "See portfolio value and performance broken down by asset type (Stocks, ETFs, Crypto) with filter pills, stacked area chart, breakdown cards showing daily and total P&L per type, and a performance comparison table.",
        translations: {
          es: "Visualiza el valor y rendimiento de tu portafolio desglosado por tipo de activo (Acciones, ETFs, Cripto) con filtros, gráfico de áreas apiladas, tarjetas de desglose con P&L diario y total por tipo, y una tabla comparativa de rendimiento.",
        },
      },
    ],
  },
  {
    version: "1.64.3",
    date: "2026-03-23",
    title: "Expandable Portfolio Value Chart",
    titleTranslations: { es: "Gráfico de valor del portafolio expandible" },
    changes: [
      {
        type: "feature",
        text: "The Portfolio Value chart now has a maximize/minimize toggle — expand it to full width with inline stats (cost, gain/loss, day change, div. yield, holdings, est. annual dividend) below the graph.",
        translations: {
          es: "El gráfico de valor del portafolio ahora tiene un botón de maximizar/minimizar — expándelo a ancho completo con estadísticas en línea (coste, ganancia/pérdida, cambio del día, rdto. div., posiciones, ingreso anual est.) debajo del gráfico.",
        },
      },
    ],
  },
  {
    version: "1.64.2",
    date: "2026-03-23",
    title: "Collapsible Onboarding Checklist",
    titleTranslations: { es: "Checklist de inicio colapsable" },
    changes: [
      {
        type: "improvement",
        text: "The onboarding checklist now starts collapsed with a progress ring, expanding on click to reveal steps — less clutter on the dashboard.",
        translations: {
          es: "El checklist de inicio ahora comienza colapsado con un anillo de progreso, expandiéndose al hacer clic para mostrar los pasos — menos desorden en el panel.",
        },
      },
    ],
  },
  {
    version: "1.64.1",
    date: "2026-03-23",
    title: "Classification Fix for Bond ETFs & Crypto",
    titleTranslations: { es: "Corrección de clasificación para ETFs de bonos y criptomonedas" },
    changes: [
      {
        type: "fix",
        text: "Auto-classify now works for bond ETFs, money-market ETFs, ETCs, and crypto pairs that previously failed silently.",
        translations: {
          es: "La autoclasificación ahora funciona para ETFs de bonos, ETFs del mercado monetario, ETCs y pares de criptomonedas que antes fallaban silenciosamente.",
        },
      },
      {
        type: "fix",
        text: "ETFs and crypto no longer show as 'Unclassified' in the Sector view — ETFs display their fund category and crypto displays as 'Cryptocurrency'.",
        translations: {
          es: "Los ETFs y las criptomonedas ya no aparecen como 'Sin clasificar' en la vista de Sector — los ETFs muestran su categoría de fondo y las criptomonedas aparecen como 'Cryptocurrency'.",
        },
      },
    ],
  },
  {
    version: "1.64.0",
    date: "2026-03-22",
    title: "Snapshot Pipeline Optimization",
    titleTranslations: { es: "Optimización del pipeline de snapshots" },
    changes: [
      {
        type: "improvement",
        text: "Past-dated transactions now automatically recalculate portfolio history — no more manual recalculate needed.",
        translations: {
          es: "Las transacciones con fecha pasada ahora recalculan automáticamente el historial de cartera — ya no es necesario recalcular manualmente.",
        },
      },
      {
        type: "improvement",
        text: "Snapshot pipeline uses batched DB writes for faster cron jobs and backfills.",
        translations: {
          es: "El pipeline de snapshots usa escrituras por lotes para cron jobs y reconstrucciones más rápidas.",
        },
      },
      {
        type: "improvement",
        text: "Automatic snapshot compaction keeps database lean — old intraday rows are rolled up to hourly and daily granularity.",
        translations: {
          es: "Compactación automática de snapshots mantiene la base de datos liviana — las filas intradía antiguas se consolidan a granularidad horaria y diaria.",
        },
      },
      {
        type: "fix",
        text: "Backfill no longer deletes all snapshot history — only daily rows are rebuilt, preserving intraday data if the process fails midway.",
        translations: {
          es: "La reconstrucción ya no elimina todo el historial de snapshots — solo se reconstruyen las filas diarias, preservando datos intradía si el proceso falla a mitad de camino.",
        },
      },
    ],
  },
  {
    version: "1.63.0",
    date: "2026-03-22",
    title: "Global Portfolio Awareness",
    titleTranslations: { es: "Conciencia global de cartera" },
    changes: [
      {
        type: "feature",
        text: "Global portfolio selector — choose your active portfolio from the navigation bar and every page, tool, and AI feature will respect that selection.",
        translations: {
          es: "Selector global de cartera — elige tu cartera activa desde la barra de navegación y cada página, herramienta y función de IA respetará esa selección.",
        },
      },
      {
        type: "feature",
        text: "Tools breadcrumb navigation — when you open a tool, the card grid collapses into a clean breadcrumb bar with a back-to-menu button.",
        translations: {
          es: "Navegación por migas de pan en herramientas — al abrir una herramienta, la cuadrícula se colapsa en una barra de navegación con botón de volver al menú.",
        },
      },
      {
        type: "improvement",
        text: "News feed, event calendar, upcoming earnings, and AI portfolio review now filter by the active portfolio instead of showing all holdings.",
        translations: {
          es: "El feed de noticias, calendario de eventos, próximos resultados y revisión IA de cartera ahora filtran por la cartera activa en vez de mostrar todas las posiciones.",
        },
      },
      {
        type: "improvement",
        text: "Sync button in toolbar — the refresh icon is now a visible Sync CTA so it's clear how to update quotes on demand.",
        translations: {
          es: "Botón de sincronización en la barra — el icono de actualización es ahora un botón visible de Sincronizar para que sea claro cómo actualizar cotizaciones.",
        },
      },
      {
        type: "improvement",
        text: "Denser 1D chart — portfolio snapshots are now recorded every 5 minutes instead of hourly, producing smoother intraday evolution graphs even when offline.",
        translations: {
          es: "Gráfico 1D más detallado — las capturas de cartera se registran cada 5 minutos en lugar de cada hora, produciendo gráficos de evolución intradía más suaves incluso sin conexión.",
        },
      },
      {
        type: "feature",
        text: "Move holdings and cash between portfolios — Pro users can now move an entire position or a cash entry from one portfolio to another with automatic snapshot and totals recalculation.",
        translations: {
          es: "Mover posiciones y efectivo entre carteras — los usuarios Pro ahora pueden mover una posición completa o una entrada de efectivo de una cartera a otra con recálculo automático de totales e historial.",
        },
      },
      {
        type: "feature",
        text: "Instrument-aware detail tabs — stock pages now adapt to the asset type: stocks show Financial Statements and Earnings, ETFs show a new Holdings tab with top positions and sector weightings, and crypto shows a streamlined Overview.",
        translations: {
          es: "Pestañas de detalle según tipo de instrumento — las páginas de activos se adaptan al tipo: las acciones muestran Estados Financieros y Resultados, los ETF muestran una nueva pestaña de Composición con principales posiciones y ponderación por sector, y las criptomonedas muestran una Vista General simplificada.",
        },
      },
    ],
  },
  {
    version: "1.62.0",
    date: "2026-03-22",
    title: "Enhanced Rebalancing Tool with AI-powered portfolio analysis",
    titleTranslations: { es: "Herramienta de Rebalanceo mejorada con análisis de cartera impulsado por IA" },
    changes: [
      {
        type: "feature",
        text: "Completely redesigned rebalancing tool with auto-populated allocation overview, exposure analysis treemap, Add Money / Move Funds planner, and before/after comparison charts.",
        translations: {
          es: "Herramienta de rebalanceo completamente rediseñada con resumen de asignación auto-rellenado, mapa de exposición, planificador Añadir Dinero / Mover Fondos y gráficos de comparación antes/después.",
        },
      },
      {
        type: "feature",
        text: "AI Rebalancing Assistant (Pro) — get full portfolio analysis, rebalancing strategy suggestions, and plan evaluations from an AI financial expert.",
        translations: {
          es: "Asistente IA de Rebalanceo (Pro) — obtén análisis completo de cartera, sugerencias de estrategia de rebalanceo y evaluaciones de plan de un experto financiero IA.",
        },
      },
      {
        type: "improvement",
        text: "Google Ads conversion tracking — configure a Google Ads ID (AW-XXXXXXXXXX) alongside Google Analytics from the admin panel.",
        translations: {
          es: "Seguimiento de conversiones de Google Ads — configura un ID de Google Ads (AW-XXXXXXXXXX) junto con Google Analytics desde el panel de administración.",
        },
      },
      {
        type: "feature",
        text: "Industry Screener (Pro) — find stocks by industry within the rebalancing flow, pre-filtered by underweight sectors.",
        translations: {
          es: "Screener por Industria (Pro) — encuentra acciones por industria dentro del flujo de rebalanceo, pre-filtrado por sectores infraponderados.",
        },
      },
      {
        type: "improvement",
        text: "Screener now supports industry filtering alongside existing sector, country, and exchange filters.",
        translations: {
          es: "El screener ahora soporta filtrado por industria junto con los filtros existentes de sector, país y mercado.",
        },
      },
    ],
  },
  {
    version: "1.61.0",
    date: "2026-03-21",
    title: "UX polish — timezone fix, error boundaries, onboarding & email improvements",
    titleTranslations: { es: "Pulido UX — corrección de zona horaria, límites de error, mejoras de onboarding y email" },
    changes: [
      {
        type: "fix",
        text: "Purchase date default now uses local time instead of UTC, preventing 'tomorrow' from appearing in Americas timezones.",
        translations: {
          es: "La fecha de compra por defecto ahora usa hora local en vez de UTC, evitando que aparezca 'mañana' en zonas horarias de América.",
        },
      },
      {
        type: "improvement",
        text: "Email copyright year is now dynamic instead of hardcoded.",
        translations: {
          es: "El año de copyright en emails ahora es dinámico en vez de estar fijo.",
        },
      },
      {
        type: "improvement",
        text: "Onboarding skips the display name field when it was already provided during signup.",
        translations: {
          es: "El onboarding omite el campo de nombre para mostrar cuando ya fue proporcionado durante el registro.",
        },
      },
      {
        type: "improvement",
        text: "Added error boundaries to the Tools page and a global app-level fallback to prevent full-page crashes.",
        translations: {
          es: "Se agregaron límites de error en la página de Herramientas y un fallback global para prevenir caídas de página completa.",
        },
      },
      {
        type: "fix",
        text: "Email verification banner now accurately describes what requires verification (subscriptions and alert emails) instead of claiming data export is locked.",
        translations: {
          es: "El banner de verificación de email ahora describe con precisión qué requiere verificación (suscripciones y alertas por email) en vez de afirmar que la exportación de datos está bloqueada.",
        },
      },
    ],
  },
  {
    version: "1.60.0",
    date: "2026-03-21",
    title: "Phase 3 — Onboarding, Previews, Goals & AI Digest",
    titleTranslations: { es: "Fase 3 — Onboarding, Previews, Objetivos y Resumen IA" },
    changes: [
      {
        type: "feature",
        text: "Post-onboarding checklist guides new users through profile setup, adding stocks, creating alerts, and exploring tools.",
        translations: {
          es: "Lista de verificación post-onboarding guía a nuevos usuarios a configurar su perfil, agregar acciones, crear alertas y explorar herramientas.",
        },
      },
      {
        type: "feature",
        text: "Blurred pro-feature previews for Screener, Tax Report, and Portfolio Score show sample data behind the paywall to boost conversion.",
        translations: {
          es: "Vistas previas borrosas de funciones Pro para Screener, Informe Fiscal y Puntuación del Portafolio muestran datos de ejemplo detrás del paywall.",
        },
      },
      {
        type: "feature",
        text: "Goal prompt card on the dashboard encourages users with holdings to set a portfolio target.",
        translations: {
          es: "Tarjeta de objetivo en el dashboard motiva a usuarios con posiciones a definir una meta para su portafolio.",
        },
      },
      {
        type: "feature",
        text: "AI Weekly Digest delivers a personalized portfolio summary every Monday — dashboard card for Pro, teaser for free users, plus email delivery.",
        translations: {
          es: "Resumen Semanal IA entrega un resumen personalizado del portafolio cada lunes — tarjeta en dashboard para Pro, teaser para usuarios gratuitos, más envío por email.",
        },
      },
    ],
  },
  {
    version: "1.59.0",
    date: "2026-03-21",
    title: "Dashboard & Tools UX Overhaul",
    titleTranslations: { es: "Mejora de UX en Dashboard y Herramientas" },
    changes: [
      {
        type: "feature",
        text: "Stats grid now shows daily P/L with color-coded highlight, arrow indicator, and estimated annual dividend income.",
        translations: {
          es: "El panel de estadísticas ahora muestra el P/L diario con indicador de color y flecha, y el ingreso anual estimado por dividendos.",
        },
      },
      {
        type: "improvement",
        text: "Unified empty state design across all dashboard tabs — consistent icons, titles, and action buttons.",
        translations: {
          es: "Diseño unificado de estados vacíos en todas las pestañas del dashboard — iconos, títulos y botones de acción consistentes.",
        },
      },
      {
        type: "improvement",
        text: "Tools page tabs are now grouped by plan tier (Free, Bifolio, Trefolio) for clearer navigation.",
        translations: {
          es: "Las pestañas de herramientas ahora están agrupadas por plan (Free, Bifolio, Trefolio) para una navegación más clara.",
        },
      },
    ],
  },
  {
    version: "1.58.1",
    date: "2026-03-21",
    title: "Holdings Limit Awareness",
    titleTranslations: { es: "Visibilidad del límite de posiciones" },
    changes: [
      {
        type: "improvement",
        text: "Holdings counter now shows usage vs. limit (e.g. 18/20) in the dashboard stats grid and portfolio summary for free-tier users.",
        translations: {
          es: "El contador de posiciones ahora muestra el uso vs. límite (ej. 18/20) en las estadísticas del dashboard y resumen de cartera para usuarios del plan gratuito.",
        },
      },
      {
        type: "improvement",
        text: "Add stock/crypto modals now show an upgrade prompt when the holdings limit is reached instead of the add form.",
        translations: {
          es: "Los modales de agregar acción/cripto ahora muestran un aviso de mejora de plan cuando se alcanza el límite de posiciones.",
        },
      },
    ],
  },
  {
    version: "1.58.0",
    date: "2026-03-21",
    title: "Free Tier Improvements",
    titleTranslations: { es: "Mejoras del plan gratuito" },
    changes: [
      {
        type: "improvement",
        text: "Increased free plan holdings limit from 15 to 20 stocks & ETFs, fitting typical starter portfolios without immediate friction.",
        translations: {
          es: "Aumentado el límite de posiciones del plan gratuito de 15 a 20 acciones y ETFs, adaptándose a carteras iniciales típicas sin fricción inmediata.",
        },
      },
      {
        type: "improvement",
        text: "Increased free plan price alerts from 2 to 5 — enough to cover your top positions.",
        translations: {
          es: "Aumentadas las alertas de precio del plan gratuito de 2 a 5 — suficiente para cubrir tus principales posiciones.",
        },
      },
      {
        type: "feature",
        text: "Added password visibility toggle on signup and login pages to prevent mistyped passwords.",
        translations: {
          es: "Añadido botón de visibilidad de contraseña en las páginas de registro e inicio de sesión para evitar errores al escribir.",
        },
      },
      {
        type: "feature",
        text: "Broker CSV import now shows a pre-import warning when your file contains more tickers than your plan allows, listing exactly which ones will be skipped.",
        translations: {
          es: "La importación de CSV de broker ahora muestra una advertencia antes de importar cuando tu archivo contiene más tickers de los permitidos por tu plan, indicando exactamente cuáles serán omitidos.",
        },
      },
    ],
  },
  {
    version: "1.57.5",
    date: "2026-03-21",
    title: "Landing Page Content Refresh",
    titleTranslations: { es: "Actualización del contenido de la página de inicio" },
    changes: [
      {
        type: "improvement",
        text: "Refreshed all landing page screenshots with the latest dashboard UI, updated feature descriptions to highlight AI Portfolio Score, Portfolio AI drawer, chart AI assistant, DRIP simulation, portfolio evolution chart with 19 benchmarks, and Financial Planning with FIRE calculator.",
        translations: {
          es: "Actualizadas todas las capturas de pantalla de la landing page con la última interfaz del dashboard, actualizadas las descripciones de funciones para destacar AI Portfolio Score, panel de Portfolio AI, asistente IA del gráfico, simulación DRIP, gráfico de evolución con 19 benchmarks y Planificación Financiera con calculadora FIRE.",
        },
      },
      {
        type: "improvement",
        text: "Added 7-day free trial mention to pricing section, Financial Planning and referral program to the comparison table, and standardized broker CSV count to 14 across all copy.",
        translations: {
          es: "Añadida mención de prueba gratuita de 7 días en la sección de precios, Planificación Financiera y programa de referidos en la tabla comparativa, y estandarizado el número de formatos CSV a 14 en todo el texto.",
        },
      },
    ],
  },
  {
    version: "1.57.4",
    date: "2026-03-21",
    title: "Tax AI Rich Rendering & Auto Portfolio Analysis",
    titleTranslations: { es: "Renderizado enriquecido de IA fiscal y análisis automático de cartera" },
    changes: [
      {
        type: "fix",
        text: "Tax report AI assistant now renders headings, bullet points, and bold text properly instead of showing raw markdown.",
        translations: {
          es: "El asistente de IA fiscal ahora muestra encabezados, viñetas y texto en negrita correctamente en lugar de markdown sin procesar.",
        },
      },
      {
        type: "improvement",
        text: "The 'Ask AI' button on the portfolio chart now automatically triggers a comprehensive portfolio analysis with diversification, risk, and actionable recommendations.",
        translations: {
          es: "El botón 'Preguntar a la IA' del gráfico de cartera ahora lanza automáticamente un análisis completo con diversificación, riesgo y recomendaciones accionables.",
        },
      },
    ],
  },
  {
    version: "1.57.3",
    date: "2026-03-21",
    title: "WhatsApp Verification Improvements",
    titleTranslations: { es: "Mejoras en la verificación de WhatsApp" },
    changes: [
      {
        type: "fix",
        text: "Fixed WhatsApp phone verification by enabling the WhatsApp channel on Twilio Verify. Verification now sends a 6-digit code via WhatsApp.",
        translations: {
          es: "Corregida la verificación de WhatsApp habilitando el canal de WhatsApp en Twilio Verify. La verificación ahora envía un código de 6 dígitos por WhatsApp.",
        },
      },
      {
        type: "feature",
        text: "After verifying your WhatsApp number, you now receive a welcome message in your language.",
        translations: {
          es: "Tras verificar tu número de WhatsApp, ahora recibes un mensaje de bienvenida en tu idioma.",
        },
      },
      {
        type: "improvement",
        text: "WhatsApp verification UI now shows error messages, code-sent confirmation, and restricts code input to digits only.",
        translations: {
          es: "La verificación de WhatsApp ahora muestra mensajes de error, confirmación de envío de código y restringe la entrada solo a dígitos.",
        },
      },
    ],
  },
  {
    version: "1.57.2",
    date: "2026-03-21",
    title: "AI Prompt Logging for Admin Review",
    titleTranslations: { es: "Registro de Prompts de IA para Revisión de Admin" },
    changes: [
      {
        type: "feature",
        text: "All AI prompts and responses are now logged to the database. Admins can review them in the new AI Logs tab, with filters by user and source (fundamentals, portfolio AI, support chat, import, etc.).",
        translations: {
          es: "Todos los prompts y respuestas de IA ahora se registran en la base de datos. Los administradores pueden revisarlos en la nueva pestaña AI Logs, con filtros por usuario y origen (fundamentales, portfolio AI, chat de soporte, importación, etc.).",
        },
      },
      {
        type: "improvement",
        text: "AI logs now track input/output tokens separately and calculate the dollar cost per request using gpt-4o-mini pricing ($0.15/M input, $0.60/M output).",
        translations: {
          es: "Los registros de IA ahora rastrean tokens de entrada/salida por separado y calculan el costo en dólares por solicitud usando precios de gpt-4o-mini ($0.15/M entrada, $0.60/M salida).",
        },
      },
    ],
  },
  {
    version: "1.57.1",
    date: "2026-03-21",
    title: "ISIN Auto-Resolution",
    titleTranslations: { es: "Resolución Automática de ISIN" },
    changes: [
      {
        type: "fix",
        text: "Holdings imported with an ISIN instead of a ticker symbol now auto-resolve to the correct ticker via Yahoo Finance search, fixing missing price data.",
        translations: {
          es: "Las posiciones importadas con un ISIN en lugar de un símbolo de ticker ahora se resuelven automáticamente al ticker correcto mediante búsqueda en Yahoo Finance, corrigiendo datos de precios faltantes.",
        },
      },
      {
        type: "fix",
        text: "Portfolio chart no longer fluctuates when markets are closed. Snapshots are now skipped on weekends and outside trading hours unless the portfolio contains crypto (24/7).",
        translations: {
          es: "El gráfico del portafolio ya no fluctúa cuando los mercados están cerrados. Las instantáneas se omiten en fines de semana y fuera del horario de negociación a menos que el portafolio contenga criptomonedas (24/7).",
        },
      },
      {
        type: "improvement",
        text: "When all markets are closed, the 1-day chart shows a friendly 'markets closed' message with the last portfolio value and when the earliest market reopens.",
        translations: {
          es: "Cuando todos los mercados están cerrados, el gráfico de 1 día muestra un mensaje amigable de 'mercados cerrados' con el último valor del portafolio y la hora de reapertura del mercado más temprano.",
        },
      },
    ],
  },
  {
    version: "1.57.0",
    date: "2026-03-20",
    title: "About Page",
    titleTranslations: { es: "P\u00e1gina Acerca de" },
    changes: [
      {
        type: "feature",
        text: "New About page: learn about the person behind trefolio, the motivation, and the story of how it was built.",
        translations: {
          es: "Nueva p\u00e1gina Acerca de: conoce a la persona detr\u00e1s de trefolio, la motivaci\u00f3n y la historia de c\u00f3mo se construy\u00f3.",
        },
      },
    ],
  },
  {
    version: "1.56.0",
    date: "2026-03-20",
    title: "7-Day Pro Trial",
    titleTranslations: { es: "Prueba Pro de 7 D\u00edas" },
    changes: [
      {
        type: "feature",
        text: "7-day Trefolio Pro trial: after one week on the free plan with at least one holding, you\u2019ll receive a personal invitation to try every Pro feature for 7 days \u2014 no credit card required.",
        translations: {
          es: "Prueba de 7 d\u00edas de Trefolio Pro: despu\u00e9s de una semana en el plan gratuito con al menos una posici\u00f3n, recibir\u00e1s una invitaci\u00f3n personal para probar todas las funciones Pro durante 7 d\u00edas \u2014 sin tarjeta de cr\u00e9dito.",
        },
      },
    ],
  },
  {
    version: "1.55.0",
    date: "2026-03-20",
    title: "AI Portfolio Analysis — Full Details",
    titleTranslations: { es: "Análisis del Portafolio con IA — Detalle Completo" },
    changes: [
      {
        type: "improvement",
        text: "AI Portfolio Score now shows sector-by-sector and region-by-region analysis, names specific stocks in recommendations and concentration risks, and includes a dedicated full-page view under Tools.",
        translations: {
          es: "La Puntuación del Portafolio con IA ahora muestra análisis sector por sector y región por región, nombra acciones específicas en recomendaciones y riesgos de concentración, e incluye una vista de página completa en Herramientas.",
        },
      },
      {
        type: "improvement",
        text: "Portfolio scores are now stored permanently with timestamps, allowing you to track how your score evolves over time.",
        translations: {
          es: "Las puntuaciones del portafolio ahora se almacenan permanentemente con fecha, permitiéndote seguir cómo evoluciona tu puntuación.",
        },
      },
    ],
  },
  {
    version: "1.54.0",
    date: "2026-03-20",
    title: "AI Portfolio Score",
    titleTranslations: { es: "Puntuación del Portafolio con IA" },
    changes: [
      {
        type: "feature",
        text: "AI Portfolio Score: get a 0-100 score for your portfolio with sub-ratings for diversification, risk, costs, and macroeconomics, plus actionable recommendations — powered by AI structured output.",
        translations: {
          es: "Puntuación del Portafolio con IA: obtén una puntuación de 0-100 para tu portafolio con sub-puntuaciones de diversificación, riesgo, costes y macroeconomía, además de recomendaciones accionables — impulsado por IA.",
        },
      },
    ],
  },
  {
    version: "1.53.3",
    date: "2026-03-20",
    title: "Daily Chart View",
    titleTranslations: { es: "Vista diaria del gráfico" },
    changes: [
      {
        type: "feature",
        text: "Added 1D (Daily) time range to the portfolio evolution chart with 5-minute granularity. Shows intraday value and performance as snapshots are collected throughout the day.",
        translations: {
          es: "Añadido rango de tiempo 1D (Diario) al gráfico de evolución del portafolio con granularidad de 5 minutos. Muestra el valor y rendimiento intradía a medida que se recopilan datos durante el día.",
        },
      },
    ],
  },
  {
    version: "1.53.2",
    date: "2026-03-20",
    title: "Mobile Dashboard Reorder",
    titleTranslations: { es: "Reordenación del panel móvil" },
    changes: [
      {
        type: "improvement",
        text: "Reordered mobile dashboard: holdings list now appears directly after the chart for faster daily checks. Removed goal progress banner from mobile to reduce clutter.",
        translations: {
          es: "Reordenación del panel móvil: la lista de posiciones ahora aparece directamente después del gráfico para consultas diarias más rápidas. Se eliminó el banner de progreso de meta del móvil para reducir el desorden.",
        },
      },
    ],
  },
  {
    version: "1.53.1",
    date: "2026-03-20",
    title: "Broker Sync Duplication Fix",
    titleTranslations: { es: "Corrección de duplicación en sincronización de bróker" },
    changes: [
      {
        type: "fix",
        text: "Fixed holdings doubling after re-syncing a broker (e.g. DEGIRO) that required re-authentication. Transaction-derived holdings no longer duplicate positions already tracked by broker sync.",
        translations: {
          es: "Corregido el problema de duplicación de posiciones al re-sincronizar un bróker (ej. DEGIRO) que requería re-autenticación. Las posiciones derivadas de transacciones ya no duplican las posiciones rastreadas por la sincronización del bróker.",
        },
      },
      {
        type: "fix",
        text: "Portfolio history chart now recalculates after a broker sync import, ensuring the evolution graph reflects newly imported transactions.",
        translations: {
          es: "El gráfico de evolución del portafolio ahora se recalcula después de una importación por sincronización de bróker, asegurando que el gráfico refleje las transacciones recién importadas.",
        },
      },
      {
        type: "fix",
        text: "Fixed portfolio value jump on the same day in the evolution chart caused by conflicting backfill and live snapshot data.",
        translations: {
          es: "Corregido el salto de valor del portafolio en el mismo día en el gráfico de evolución causado por conflictos entre datos de backfill y snapshots en vivo.",
        },
      },
    ],
  },
  {
    version: "1.53.0",
    date: "2026-03-20",
    title: "Performance Breakdown Page",
    titleTranslations: { es: "Página de desglose del rendimiento" },
    changes: [
      {
        type: "feature",
        text: "New Performance tab replacing the old Metrics tab — annual return bar chart, performance breakdown (price gain, dividends, realized P&L), transaction cost totals, TTWROR, IRR, and advanced metrics (Sharpe, max drawdown, volatility) with year-by-year filtering.",
        translations: {
          es: "Nueva pestaña de Rendimiento que reemplaza la antigua pestaña de Métricas — gráfico de barras de retornos anuales, desglose del rendimiento (ganancia de precio, dividendos, P&L realizado), costes totales de transacción, TTWROR, TIR y métricas avanzadas (Sharpe, drawdown máximo, volatilidad) con filtrado por año.",
        },
      },
    ],
  },
  {
    version: "1.52.0",
    date: "2026-03-20",
    title: "Data quality nudges & import comparison page",
    titleTranslations: { es: "Avisos de calidad de datos y p\u00e1gina de comparaci\u00f3n de importaci\u00f3n" },
    changes: [
      {
        type: "feature",
        text: "Contextual data upgrade nudges across 6 screens (Tax Report, Transaction History, Dashboard, Import, Dividends, Performance) that detect incomplete transaction data and suggest connecting your broker or importing a CSV for more accurate tax reports, cost basis, and performance metrics.",
        translations: {
          es: "Avisos contextuales de mejora de datos en 6 pantallas (Informe Fiscal, Historial de Transacciones, Dashboard, Importaci\u00f3n, Dividendos, Rendimiento) que detectan datos incompletos y sugieren conectar tu br\u00f3ker o importar un CSV para informes fiscales, coste base y m\u00e9tricas de rendimiento m\u00e1s precisos.",
        },
      },
      {
        type: "feature",
        text: "New import comparison page (/import/compare) that explains the differences between Broker API sync and CSV import, with a feature matrix and direct links to each import method.",
        translations: {
          es: "Nueva p\u00e1gina de comparaci\u00f3n de importaci\u00f3n (/import/compare) que explica las diferencias entre sincronizaci\u00f3n por API del br\u00f3ker e importaci\u00f3n CSV, con matriz de funciones y enlaces directos a cada m\u00e9todo.",
        },
      },
    ],
  },
  {
    version: "1.51.0",
    date: "2026-03-19",
    title: "Dashboard V2 — Two-column layout & Portfolio AI",
    titleTranslations: { es: "Dashboard V2 — Diseño en dos columnas y Portfolio AI" },
    changes: [
      {
        type: "feature",
        text: "New two-column dashboard layout (behind feature flag): compact hero chart with inline portfolio value, right sidebar with allocation donut (Type/Sectors/Regions tabs), key stats grid, goal progress, upcoming earnings, and Portfolio AI trigger card.",
        translations: {
          es: "Nuevo diseño del dashboard en dos columnas (tras feature flag): gráfico compacto con valor del portafolio, barra lateral derecha con donut de asignación (pestañas Tipo/Sectores/Regiones), estadísticas clave, progreso del objetivo, próximos resultados y tarjeta de Portfolio AI.",
        },
      },
      {
        type: "feature",
        text: "Portfolio AI drawer: full-width slide-out panel that shares your entire portfolio context (holdings, allocations, performance, goals) with an AI assistant. Replaces the inline support chat with a more powerful, always-contextual experience.",
        translations: {
          es: "Panel de Portfolio AI: panel deslizante de ancho completo que comparte todo el contexto de tu portafolio (posiciones, asignación, rendimiento, objetivos) con un asistente de IA. Reemplaza el chat de soporte en línea con una experiencia más potente y siempre contextual.",
        },
      },
      {
        type: "feature",
        text: "Benchmark overlay: compare your portfolio performance against 19 benchmarks (S&P 500, NASDAQ, DAX, FTSE 100, MSCI World, Bitcoin, Ethereum, Gold, Oil, EUR/USD, and more) directly on the chart with dashed overlay lines and interactive legend chips.",
        translations: {
          es: "Superposición de benchmarks: compara el rendimiento de tu portafolio con 19 referencias (S&P 500, NASDAQ, DAX, FTSE 100, MSCI World, Bitcoin, Ethereum, Oro, Petróleo, EUR/USD y más) directamente en el gráfico con líneas superpuestas y chips de leyenda interactivos.",
        },
      },
    ],
  },
  {
    version: "1.50.0",
    date: "2026-03-19",
    title: "Chart AI assistant",
    titleTranslations: { es: "Asistente de IA en el gráfico" },
    changes: [
      {
        type: "feature",
        text: "Ask the portfolio evolution chart an AI assistant: open “Ask about this chart” under the graph to question moves in value or invested capital using your current range, markers, and downsampled points (same AI usage limits as other AI tools).",
        translations: {
          es: "Pregunta a un asistente de IA en el gráfico de evolución: abre «Preguntar sobre este gráfico» bajo el gráfico para consultar movimientos de valor o capital invertido con tu rango actual, marcadores y puntos resumidos (mismos límites de uso de IA que el resto de herramientas).",
        },
      },
      {
        type: "improvement",
        text: "The evolution chart now shows every ledger transaction in range as a marker (buy, sell, dividend, fee) with color-coded dots and amounts in the tooltip — not only aggregated buys and sells.",
        translations: {
          es: "El gráfico de evolución muestra ahora cada transacción del rango como marcador (compra, venta, dividendos, comisiones) con puntos por color e importes en el tooltip — no solo compras y ventas agregadas.",
        },
      },
      {
        type: "fix",
        text: "AI chat (chart assistant and support) no longer scrolls the whole page while the reply streams — only the message panel scrolls so you can read the answer as it appears.",
        translations: {
          es: "El chat de IA (asistente del gráfico y soporte) ya no desplaza toda la página mientras llega la respuesta: solo se desplaza el panel de mensajes para poder leer en directo.",
        },
      },
      {
        type: "improvement",
        text: "AI chat replies render Markdown (headings, lists, bold) instead of raw characters.",
        translations: {
          es: "Las respuestas del chat de IA muestran Markdown (títulos, listas, negrita) en lugar del texto crudo.",
        },
      },
      {
        type: "fix",
        text: "Portfolio evolution: hourly filler points no longer linearly interpolate invested capital between snapshots (only total value is smoothed), so the gray invested line doesn’t show a misleading day-to-day ramp when cost basis only changes at real snapshot times.",
        translations: {
          es: "Evolución del portafolio: los puntos de relleno horarios ya no interpolan linealmente el capital invertido entre instantáneas (solo se suaviza el valor total), para que la línea gris no muestre una falsa rampa día a día cuando el coste solo cambia en instantáneas reales.",
        },
      },
      {
        type: "fix",
        text: "Deleting a secondary portfolio now removes all data for that portfolio (including evolution chart snapshots and alerts), instead of merging it into your default portfolio.",
        translations: {
          es: "Al eliminar un portafolio secundario se borran todos sus datos (incluido el historial del gráfico de evolución y las alertas), en lugar de fusionarlos con el portafolio predeterminado.",
        },
      },
    ],
  },
  {
    version: "1.49.0",
    date: "2026-03-19",
    title: "Referral Share Popup",
    titleTranslations: { es: "Popup para Compartir Referidos" },
    changes: [
      {
        type: "feature",
        text: "Share your referral link from a new popup on the dashboard. See how it works, what Pro unlocks, and track your referral stats — all in one place.",
        translations: {
          es: "Comparte tu enlace de referido desde un nuevo popup en el dashboard. Mira cómo funciona, qué desbloquea Pro y sigue tus estadísticas de referidos — todo en un solo lugar.",
        },
      },
      {
        type: "improvement",
        text: "Portfolio history: 1M uses a full calendar month (not 30 rolling days), 1M / YTD / 1Y use hourly points when available, MAX is available on the chart, and all-time ranges longer than a year downsample to weekly points.",
        translations: {
          es: "Historial del portafolio: 1M usa un mes calendario completo (no 30 días rodantes), 1M / YTD / 1Y usan puntos horarios cuando hay datos, MAX está en el gráfico, y rangos de todo el tiempo de más de un año se muestran con puntos semanales.",
        },
      },
      {
        type: "improvement",
        text: "While the dashboard is open, portfolio snapshots are saved every 15 minutes (15-minute buckets) so evolution charts can show real intraday detail. Days when you do not open the app still have no intermediate points.",
        translations: {
          es: "Con el dashboard abierto, se guardan instantáneas del portafolio cada 15 minutos (bloques de 15 min) para que el gráfico de evolución muestre detalle intradía real. Los días en que no abres la app siguen sin puntos intermedios.",
        },
      },
      {
        type: "improvement",
        text: "A scheduled server job now writes portfolio history snapshots hourly (using live prices) so your evolution chart fills in over time even when you are not logged in.",
        translations: {
          es: "Un trabajo programado en el servidor ahora guarda instantáneas del historial del portafolio cada hora (con precios en vivo) para que el gráfico de evolución se complete con el tiempo aunque no hayas iniciado sesión.",
        },
      },
      {
        type: "improvement",
        text: "Operators can materialize current portfolio snapshots for all users on demand (cron POST, admin API, or npm run materialize:portfolio-snapshots) — see docs/PORTFOLIO_SNAPSHOT_MATERIALIZE.md.",
        translations: {
          es: "Los operadores pueden materializar instantáneas actuales del portafolio para todos los usuarios bajo demanda (POST del cron, API de admin o npm run materialize:portfolio-snapshots) — ver docs/PORTFOLIO_SNAPSHOT_MATERIALIZE.md.",
        },
      },
      {
        type: "improvement",
        text: "After portfolio imports, the server now rebuilds history from transactions (daily or weekly sampling) and writes a live snapshot row in the background; manual backfill also refreshes live quotes with a longer timeout.",
        translations: {
          es: "Tras importar el portafolio, el servidor reconstruye el historial desde transacciones (muestreo diario o semanal) y escribe una instantánea en vivo en segundo plano; el backfill manual también actualiza cotizaciones en vivo con más tiempo de espera.",
        },
      },
      {
        type: "improvement",
        text: "Reconstructed portfolio history now samples every recent weekday (~14 months) even for long-held portfolios, so short chart ranges aren’t stuck with only two weekly points. The dashboard only shows “Calculating portfolio history…” when you tap Recalculate; background refresh stays on the normal loading state.",
        translations: {
          es: "El historial reconstruido ahora muestrea cada día hábil reciente (~14 meses) incluso con portafolios de muchos años, para que rangos cortos no queden con solo dos puntos semanales. El dashboard solo muestra “Calculando historial del portafolio…” al pulsar Recalcular; la actualización en segundo plano usa el estado de carga habitual.",
        },
      },
      {
        type: "improvement",
        text: "Portfolio evolution charts in hourly mode (1W, 1M, YTD, 1Y) now add hourly interpolated points between sparse snapshots so the line moves smoothly across the whole range; denser real data (e.g. while the app is open) is unchanged.",
        translations: {
          es: "Los gráficos de evolución en modo horario (1S, 1M, YTD, 1A) añaden puntos horarios interpolados entre instantáneas dispersas para que la línea se mueva con suavidad en todo el rango; los datos reales más densos (p. ej. con la app abierta) no se sustituyen.",
        },
      },
    ],
  },
  {
    version: "1.48.0",
    date: "2026-03-19",
    title: "Portfolio Event Markers",
    titleTranslations: { es: "Marcadores de Eventos del Portafolio" },
    changes: [
      {
        type: "feature",
        text: "The portfolio chart now shows milestone markers for buy and sell events. Hover over the colored dots to see what happened — like when you sold a position or added new shares — so you can understand why the value changed.",
        translations: {
          es: "El gráfico del portafolio ahora muestra marcadores para eventos de compra y venta. Pasa el cursor sobre los puntos de colores para ver qué ocurrió — como cuando vendiste una posición o compraste nuevas acciones — para entender por qué cambió el valor.",
        },
      },
    ],
  },
  {
    version: "1.47.0",
    date: "2026-03-19",
    title: "Value vs Performance Chart",
    titleTranslations: { es: "Gráfico de Valor vs Rendimiento" },
    changes: [
      {
        type: "feature",
        text: "The portfolio chart now lets you toggle between Value and Performance views. Value shows your total portfolio worth (including deposits), while Performance shows your actual investment returns with deposits factored out.",
        translations: {
          es: "El gráfico del portafolio ahora permite alternar entre las vistas de Valor y Rendimiento. Valor muestra el patrimonio total (incluyendo depósitos), mientras que Rendimiento muestra tus retornos reales de inversión excluyendo depósitos.",
        },
      },
      {
        type: "improvement",
        text: "You can now manually recalculate your portfolio history from the chart header. Admins can also trigger backfill for any user from the admin panel.",
        translations: {
          es: "Ahora puedes recalcular manualmente el historial de tu portafolio desde el encabezado del gráfico. Los administradores también pueden ejecutar el backfill para cualquier usuario desde el panel de administración.",
        },
      },
    ],
  },
  {
    version: "1.46.0",
    date: "2026-03-19",
    title: "Refund Requests",
    titleTranslations: { es: "Solicitudes de Reembolso" },
    changes: [
      {
        type: "feature",
        text: "Paid subscribers can now request a refund directly from their profile. You'll receive an email confirmation and a follow-up once we've reviewed your request.",
        translations: {
          es: "Los suscriptores de pago ahora pueden solicitar un reembolso directamente desde su perfil. Recibirás una confirmación por email y un seguimiento una vez que hayamos revisado tu solicitud.",
        },
      },
    ],
  },
  {
    version: "1.45.0",
    date: "2026-03-19",
    title: "Holding Big Movers in Market Alert",
    titleTranslations: { es: "Grandes Movimientos de tus Acciones en Alerta de Mercado" },
    changes: [
      {
        type: "feature",
        text: "Market Alert now highlights your own holdings with intraday moves above 2%, so you catch big swings in your portfolio at a glance.",
        translations: {
          es: "La Alerta de Mercado ahora destaca tus propias acciones con movimientos intradía superiores al 2%, para que detectes grandes movimientos en tu portafolio de un vistazo.",
        },
      },
    ],
  },
  {
    version: "1.44.0",
    date: "2026-03-19",
    title: "One-Click Email Unsubscribe",
    titleTranslations: { es: "Desuscripción de Email con Un Clic" },
    changes: [
      {
        type: "feature",
        text: "All emails now include a working one-click unsubscribe link using unique, single-use tokens. Re-subscribe anytime from your profile notification settings.",
        translations: {
          es: "Todos los emails ahora incluyen un enlace de desuscripción funcional con tokens únicos de un solo uso. Puedes volver a suscribirte en cualquier momento desde la configuración de notificaciones de tu perfil.",
        },
      },
    ],
  },
  {
    version: "1.43.0",
    date: "2026-03-18",
    title: "Unified Holdings List",
    titleTranslations: { es: "Lista Unificada de Activos" },
    changes: [
      {
        type: "feature",
        text: "Stocks, ETFs, and crypto are now shown in a single unified list on the Portfolio tab, sorted by winners first. The separate Crypto tab has been removed.",
        translations: {
          es: "Acciones, ETFs y criptomonedas ahora se muestran en una lista unificada en la pestaña Portafolio, ordenados por ganadores primero. Se ha eliminado la pestaña Cripto separada.",
        },
      },
      {
        type: "improvement",
        text: "Holdings list shows top 7 by default with a 'View all' button to expand, keeping the dashboard focused.",
        translations: {
          es: "La lista de activos muestra los 7 principales por defecto con un botón 'Ver todo' para expandir, manteniendo el dashboard enfocado.",
        },
      },
      {
        type: "improvement",
        text: "Sort holdings by daily move to quickly see today's biggest movers.",
        translations: {
          es: "Ordena los activos por movimiento diario para ver rápidamente los mayores movimientos del día.",
        },
      },
      {
        type: "improvement",
        text: "Asset type badges (ETF, CRYPTO) now appear next to holding names for quick identification.",
        translations: {
          es: "Las etiquetas de tipo de activo (ETF, CRYPTO) ahora aparecen junto al nombre del activo para identificación rápida.",
        },
      },
      {
        type: "improvement",
        text: "Dashboard growth metrics now have clearer labels: 'Portfolio Value' (total return with all cash flows) vs 'Price Return' (current holdings price change only).",
        translations: {
          es: "Las métricas de crecimiento del dashboard ahora tienen etiquetas más claras: 'Valor del Portafolio' (retorno total con flujos de caja) vs 'Retorno por Precio' (solo cambio de precio de posiciones actuales).",
        },
      },
    ],
  },
  {
    version: "1.42.0",
    date: "2026-03-18",
    title: "Portfolio Evolution Chart",
    titleTranslations: { es: "Gráfico de Evolución de Cartera" },
    changes: [
      {
        type: "feature",
        text: "New portfolio evolution chart on the dashboard shows your portfolio value over time with 1W, 1M, 3M, 6M, YTD, and 1Y time ranges.",
        translations: {
          es: "Nuevo gráfico de evolución de cartera en el dashboard que muestra el valor de tu cartera a lo largo del tiempo con rangos de 1S, 1M, 3M, 6M, YTD y 1A.",
        },
      },
      {
        type: "feature",
        text: "Automatic portfolio history backfill reconstructs historical portfolio values from your transactions, so you get a complete chart from day one.",
        translations: {
          es: "El relleno automático del historial de cartera reconstruye los valores históricos a partir de tus transacciones, proporcionando un gráfico completo desde el primer día.",
        },
      },
    ],
  },
  {
    version: "1.41.0",
    date: "2026-03-18",
    title: "Onboarding Survey Steps",
    titleTranslations: { es: "Pasos de Encuesta en el Onboarding" },
    changes: [
      {
        type: "feature",
        text: "New onboarding survey steps ask what you want to use trefolio for and how you heard about us, helping us tailor your experience. Both steps are skippable.",
        translations: {
          es: "Nuevos pasos de encuesta en el onboarding preguntan para qué quieres usar trefolio y cómo nos conociste, ayudándonos a personalizar tu experiencia. Ambos pasos se pueden omitir.",
        },
      },
      {
        type: "improvement",
        text: "Streamlined onboarding flow combines profile, experience level, and tax residency into a single step for a faster setup.",
        translations: {
          es: "Flujo de onboarding optimizado que combina perfil, nivel de experiencia y residencia fiscal en un solo paso para una configuración más rápida.",
        },
      },
    ],
  },
  {
    version: "1.40.0",
    date: "2026-03-17",
    title: "Referral Program",
    titleTranslations: { es: "Programa de Referidos" },
    changes: [
      {
        type: "feature",
        text: "Refer friends with your unique link and earn 30 days of free Pro access for each one who signs up and verifies their email. Track your referral stats, share your link from the new Referrals tab in your profile, and see the referral funnel in Admin Analytics.",
        translations: {
          es: "Refiere amigos con tu enlace único y gana 30 días de acceso Pro gratuito por cada uno que se registre y verifique su email. Rastrea tus estadísticas de referidos, comparte tu enlace desde la nueva pestaña Referidos en tu perfil, y consulta el embudo de referidos en Analytics de Admin.",
        },
      },
      {
        type: "improvement",
        text: "Anti-abuse guardrails protect the referral program: self-referral prevention, disposable email blocking, per-referrer velocity limits (5 per 30 days), and a 365-day reward cap.",
        translations: {
          es: "Protecciones anti-abuso para el programa de referidos: prevención de auto-referencia, bloqueo de emails desechables, límites de velocidad por referidor (5 por 30 días), y un tope de recompensa de 365 días.",
        },
      },
      {
        type: "feature",
        text: "New referral program email template with personalized referral link — available in 18 European languages. When sent from the admin panel, each user's unique referral link is automatically inserted.",
        translations: {
          es: "Nueva plantilla de email del programa de referidos con enlace personalizado — disponible en 18 idiomas europeos. Al enviar desde el panel de admin, el enlace único de referido de cada usuario se inserta automáticamente.",
        },
      },
    ],
  },
  {
    version: "1.39.3",
    date: "2026-03-17",
    title: "Full Email Localization",
    titleTranslations: { es: "Localización Completa de Emails" },
    changes: [
      {
        type: "feature",
        text: "Users can now request missing broker integrations directly from Import, admins get a dedicated Broker Requests queue with requester details, and trefolio sends an automatic confirmation email using a new editable Email Template.",
        translations: {
          es: "Los usuarios ahora pueden solicitar integraciones de bróker faltantes directamente desde Importar, los administradores tienen una cola dedicada de Solicitudes de Bróker con datos del solicitante, y trefolio envía un email de confirmación automático usando una nueva plantilla editable de Email.",
        },
      },
      {
        type: "improvement",
        text: "Admins can now update each broker request status inline (requested, reviewing, planned, done, rejected), and broker request messages are now localized for Portuguese, German, French, and Italian users.",
        translations: {
          es: "Los administradores ahora pueden actualizar en línea el estado de cada solicitud de bróker (requested, reviewing, planned, done, rejected), y los mensajes de solicitud de bróker ahora están localizados para usuarios de portugués, alemán, francés e italiano.",
        },
      },
      {
        type: "fix",
        text: "Fixed Admin Email Template send stats where Delivered could show 0 even after successful sends by including sent records until webhook delivery events arrive.",
        translations: {
          es: "Corregidas las estadísticas de envío en Plantillas de Email (Admin), donde Entregados podía mostrar 0 incluso tras envíos correctos, incluyendo los envíos en estado sent hasta que lleguen los webhooks de entrega.",
        },
      },
      {
        type: "feature",
        text: "All transactional emails — verification, price alerts, welcome, upgrade, and 11 feature emails — are now fully localized in 35 European languages. Users receive emails in their preferred language automatically.",
        translations: {
          es: "Todos los emails transaccionales — verificación, alertas de precio, bienvenida, upgrade y 11 emails de características — están ahora completamente localizados en 35 idiomas europeos. Los usuarios reciben emails en su idioma preferido automáticamente.",
        },
      },
      {
        type: "improvement",
        text: "Updated the Admin Settings external services shortcuts with the latest active integrations, including Resend, SnapTrade, OpenFIGI, Finnhub, FMP, and Twilio.",
        translations: {
          es: "Actualizados los accesos directos de servicios externos en Ajustes de Admin con las integraciones activas más recientes, incluyendo Resend, SnapTrade, OpenFIGI, Finnhub, FMP y Twilio.",
        },
      },
      {
        type: "improvement",
        text: "Release notes now ship in two tracks: a curated public changelog for customers and a full internal changelog available only to admins.",
        translations: {
          es: "Las notas de versión ahora se publican en dos canales: un changelog público curado para clientes y un changelog interno completo disponible solo para administradores.",
        },
      },
      {
        type: "improvement",
        text: "Added first-touch attribution tracking (UTM/referrer) from landing to signup, persisted it on user profiles, and expanded Admin Analytics with signup and paid conversion performance by source.",
        translations: {
          es: "Añadido seguimiento de atribución de primer contacto (UTM/referente) desde la landing hasta el registro, guardado en el perfil del usuario, y ampliadas las analíticas de Admin con rendimiento de registros y conversiones de pago por fuente.",
        },
      },
      {
        type: "improvement",
        text: "Added a new Admin UTM Taxonomy tool to define approved sources, mediums, and campaign naming conventions in one place for cleaner attribution reporting.",
        translations: {
          es: "Añadida una nueva herramienta de Taxonomía UTM en Admin para definir fuentes, medios y convenciones de naming de campañas en un solo lugar y mejorar la calidad de los reportes de atribución.",
        },
      },
      {
        type: "improvement",
        text: "Admin Analytics now validates source and medium values against the approved UTM taxonomy, highlighting unknown and non-approved campaign tags with signup impact.",
        translations: {
          es: "Las Analíticas de Admin ahora validan los valores de source y medium contra la taxonomía UTM aprobada, destacando etiquetas desconocidas y no aprobadas junto con su impacto en registros.",
        },
      },
      {
        type: "improvement",
        text: "Implemented canonical conversion tracking for signup and checkout, added consent-safe ad dispatch logging, and introduced parity monitoring in Admin Analytics to track internal-vs-ad event match rate.",
        translations: {
          es: "Implementado el tracking canónico de conversiones para registro y checkout, añadido el registro de envío a plataformas publicitarias con respeto de consentimiento, e incorporado monitoreo de paridad en Analíticas de Admin para seguir la tasa de coincidencia entre eventos internos y publicitarios.",
        },
      },
    ],
  },
  {
    version: "1.39.2",
    date: "2026-03-17",
    title: "Ticker Rename Detection",
    titleTranslations: { es: "Detección de Cambio de Ticker" },
    changes: [
      {
        type: "improvement",
        text: "Broker-synced holdings now survive ticker renames (e.g. $VG → $VGn). When your broker reports a new ticker for the same security, trefolio updates the holding in-place and re-links your transaction history — no phantom duplicates, no broken quotes.",
        translations: {
          es: "Las posiciones sincronizadas del broker ahora sobreviven los cambios de ticker (ej. $VG → $VGn). Cuando tu broker reporta un nuevo ticker para el mismo valor, trefolio actualiza la posición en su lugar y re-vincula tu historial de transacciones — sin duplicados fantasma ni cotizaciones rotas.",
        },
      },
      {
        type: "improvement",
        text: "Automatic stale ticker recovery via OpenFIGI — when a quote fails and the holding has a FIGI identifier, trefolio resolves the current ticker and updates your portfolio automatically. This self-heals on the next data refresh with no action needed from you.",
        translations: {
          es: "Recuperación automática de tickers obsoletos vía OpenFIGI — cuando una cotización falla y la posición tiene un identificador FIGI, trefolio resuelve el ticker actual y actualiza tu cartera automáticamente. Se auto-repara en la siguiente actualización de datos sin que necesites hacer nada.",
        },
      },
    ],
  },
  {
    version: "1.39.1",
    date: "2026-03-17",
    title: "Broker Sync Fix",
    titleTranslations: { es: "Corrección de Sincronización de Broker" },
    changes: [
      {
        type: "fix",
        text: "Fixed a critical bug where broker-synced holdings (e.g. DEGIRO) could be deleted when the broker connection required re-authentication. The hourly auto-sync now correctly preserves holdings when position data is incomplete or the connection is degraded.",
        translations: {
          es: "Corrección de un error crítico donde las posiciones sincronizadas del broker (ej. DEGIRO) podían eliminarse cuando la conexión del broker requería re-autenticación. La sincronización automática por hora ahora preserva correctamente las posiciones cuando los datos son incompletos o la conexión está degradada.",
        },
      },
    ],
  },
  {
    version: "1.39.0",
    date: "2026-03-16",
    title: "Email System, Experience Personalization & Notification Preferences",
    titleTranslations: { es: "Sistema de Email, Personalización por Experiencia y Preferencias de Notificación" },
    changes: [
      {
        type: "feature",
        text: "New investment experience level selection during onboarding — choose between beginner, intermediate, experienced, or professional to personalize your trefolio experience.",
        translations: {
          es: "Nueva selección de nivel de experiencia en inversiones durante el onboarding — elige entre principiante, intermedio, experimentado o profesional para personalizar tu experiencia en trefolio.",
        },
      },
      {
        type: "feature",
        text: "Admin email template system with create, edit, preview (HTML and plain text), and send capabilities. Templates support English and Spanish with per-experience-level targeting.",
        translations: {
          es: "Sistema de plantillas de email para administradores con creación, edición, vista previa (HTML y texto plano) y envío. Las plantillas soportan inglés y español con segmentación por nivel de experiencia.",
        },
      },
      {
        type: "feature",
        text: "Email tracking via Resend webhooks — track delivery, opens, clicks, and bounces for all sent emails with detailed history visible in the admin user detail page.",
        translations: {
          es: "Seguimiento de emails vía webhooks de Resend — rastrea entregas, aperturas, clics y rebotes de todos los emails enviados con historial detallado visible en la página de detalle del usuario admin.",
        },
      },
      {
        type: "feature",
        text: "Email notification preferences — users can now disable marketing and template emails from their profile notification settings. All emails include an unsubscribe link.",
        translations: {
          es: "Preferencias de notificación por email — los usuarios ahora pueden desactivar emails de marketing y plantillas desde sus ajustes de notificación. Todos los emails incluyen un enlace de cancelación de suscripción.",
        },
      },
      {
        type: "improvement",
        text: "User language and experience level are now visible in the admin user detail page, making it easier to understand each customer's profile.",
        translations: {
          es: "El idioma y nivel de experiencia del usuario ahora son visibles en la página de detalle del usuario admin, facilitando la comprensión del perfil de cada cliente.",
        },
      },
    ],
  },
  {
    version: "1.38.0",
    date: "2026-03-15",
    title: "Dividend Depth: Yield-on-Cost & DRIP Simulation",
    titleTranslations: { es: "Profundidad de Dividendos: Rendimiento sobre Coste y Simulación DRIP" },
    changes: [
      {
        type: "feature",
        text: "Added a Broker Sync CTA section on the landing page showcasing one-click auto-sync with 20+ brokerages.",
        translations: {
          es: "Añadida sección de sincronización de broker en la página de inicio mostrando la sincronización automática con más de 20 brokers.",
        },
      },
      {
        type: "feature",
        text: "Broker sync now updates all portfolios linked to a broker — transactions are mapped (not duplicated) across portfolios, so auto-sync and manual re-sync push holdings, cash, and transactions to every linked portfolio.",
        translations: {
          es: "La sincronización de broker ahora actualiza todas las carteras vinculadas — las transacciones se mapean (sin duplicar) entre carteras, de modo que la sincronización automática y manual envía posiciones, efectivo y transacciones a cada cartera vinculada.",
        },
      },
      {
        type: "improvement",
        text: "Added a 'Post Now' button for scheduled X posts, allowing admins to manually publish any pending or failed post without waiting for the cron schedule.",
        translations: {
          es: "Añadido botón 'Post Now' para publicaciones programadas de X, permitiendo a los administradores publicar manualmente cualquier post pendiente o fallido sin esperar al cron.",
        },
      },
      {
        type: "feature",
        text: "Transaction history now supports filtering by ticker, type, and source, plus sortable column headers for quick navigation through large transaction lists.",
        translations: {
          es: "El historial de transacciones ahora permite filtrar por ticker, tipo y origen, además de columnas ordenables para navegar rápidamente en listas grandes de transacciones.",
        },
      },
      {
        type: "fix",
        text: "Fixed cash balances disappearing when one broker's token expires — syncing now only updates cash from active brokers, leaving expired brokers' cash untouched.",
        translations: {
          es: "Corregido que los saldos en efectivo desaparecían cuando el token de un bróker expiraba — la sincronización ahora solo actualiza el efectivo de los brókers activos, dejando intacto el de los expirados.",
        },
      },
      {
        type: "improvement",
        text: "Simplified broker sync UI: removed misleading per-broker sync buttons (the API always fetches all brokers at once). Use the single \"Sync All\" button instead; individual broker cards now only show Reconnect and Disconnect.",
        translations: {
          es: "Interfaz de sincronización de brókers simplificada: eliminados los botones de sincronización individual engañosos (la API siempre obtiene todos los brókers a la vez). Usa el botón \"Sincronizar Todo\"; las tarjetas individuales ahora solo muestran Reconectar y Desconectar.",
        },
      },
      {
        type: "improvement",
        text: "Broker sync now uses position data directly for holdings instead of converting positions into synthetic transactions. This eliminates duplicate holdings on re-sync and ensures all brokers (including Interactive Brokers) show accurate portfolio data from the first sync.",
        translations: {
          es: "La sincronización de brókers ahora usa los datos de posiciones directamente para las tenencias en vez de convertir posiciones en transacciones sintéticas. Esto elimina tenencias duplicadas al re-sincronizar y asegura que todos los brókers (incluido Interactive Brokers) muestren datos precisos del portafolio desde la primera sincronización.",
        },
      },
      {
        type: "improvement",
        text: "Tax report now warns when holdings were imported from broker positions without full transaction history, with a direct link to upload a CSV for accurate tax calculations.",
        translations: {
          es: "El informe fiscal ahora avisa cuando las posiciones fueron importadas sin historial completo de transacciones, con un enlace directo para subir un CSV y obtener cálculos fiscales precisos.",
        },
      },
      {
        type: "improvement",
        text: "Trefolio Pro portfolio limit increased from 3 to 5 — organize your investments across more independent portfolios.",
        translations: {
          es: "Límite de portafolios de Trefolio Pro aumentado de 3 a 5 — organiza tus inversiones en más portafolios independientes.",
        },
      },
      {
        type: "improvement",
        text: "Import page redesigned as a step-by-step wizard: pick your method, select your broker, follow the guide, upload, review, and import — one decision per screen for a smoother mobile experience.",
        translations: {
          es: "Página de importación rediseñada como asistente paso a paso: elige tu método, selecciona tu bróker, sigue la guía, sube el archivo, revisa e importa — una decisión por pantalla para una mejor experiencia en móvil.",
        },
      },
      {
        type: "improvement",
        text: "Manual add stock on the import page now reuses the same Add Stock modal as the dashboard — same fields, same behavior, consistent experience everywhere.",
        translations: {
          es: "Agregar acción manualmente en la página de importación ahora reutiliza el mismo modal de agregar acción del panel principal — mismos campos, mismo comportamiento, experiencia consistente.",
        },
      },
      {
        type: "improvement",
        text: "Admin email notifications for new signups, subscriptions, and plan changes, including user details and portfolio size.",
        translations: {
          es: "Notificaciones por email al admin para nuevos registros, suscripciones y cambios de plan, incluyendo detalles del usuario y tamaño de cartera.",
        },
      },
      {
        type: "fix",
        text: "Fixed broker sync (SnapTrade) not displaying the correct cash balance — when multiple accounts shared the same currency, only the last account's balance was kept. Cash is now correctly aggregated across all accounts.",
        translations: {
          es: "Corregido el error en la sincronización de broker (SnapTrade) que no mostraba el saldo correcto de efectivo — cuando varias cuentas compartían la misma moneda, solo se conservaba el saldo de la última cuenta. Ahora el efectivo se agrega correctamente entre todas las cuentas.",
        },
      },
      {
        type: "improvement",
        text: "Cash balances from SnapTrade are now tracked per broker instead of being merged into a single entry per currency. Each broker's cash is visible separately and summed in the portfolio total.",
        translations: {
          es: "Los saldos de efectivo de SnapTrade ahora se rastrean por broker en lugar de fusionarse en una sola entrada por moneda. El efectivo de cada broker es visible por separado y se suma en el total de la cartera.",
        },
      },
      {
        type: "fix",
        text: "Cash balances from broker imports now display in their original currency instead of defaulting to EUR.",
        translations: {
          es: "Los saldos de efectivo de las importaciones de broker ahora se muestran en su moneda original en lugar de EUR por defecto.",
        },
      },
      {
        type: "feature",
        text: "Yield-on-Cost (YOC) is now displayed per holding and at the portfolio level in the dividend tab, showing your dividend income relative to your original purchase price.",
        translations: {
          es: "El rendimiento sobre coste (YOC) ahora se muestra por posición y a nivel de cartera en la pestaña de dividendos, mostrando tus ingresos por dividendos en relación al precio original de compra.",
        },
      },
      {
        type: "feature",
        text: "Interactive DRIP simulation chart in the dividend tab projects your dividend income over 5–30 years with and without reinvestment, with adjustable dividend growth rate.",
        translations: {
          es: "Gráfico interactivo de simulación DRIP en la pestaña de dividendos que proyecta tus ingresos por dividendos a 5–30 años con y sin reinversión, con tasa de crecimiento ajustable.",
        },
      },
      {
        type: "improvement",
        text: "Dividend calculations refactored to use a shared service layer, improving consistency and testability.",
        translations: {
          es: "Los cálculos de dividendos se refactorizaron para usar una capa de servicio compartida, mejorando la consistencia y la capacidad de prueba.",
        },
      },
      {
        type: "improvement",
        text: "Dashboard toolbar now shows two data-freshness indicators: \"Quotes as of [time]\" (absolute time, turns amber when >30 min old) and \"Holdings synced [X ago]\" (relative time). Both update automatically without page refresh.",
        translations: {
          es: "La barra del panel ahora muestra dos indicadores de actualidad de datos: \"Cotizaciones a las [hora]\" (hora absoluta, se vuelve ámbar si tiene >30 min) y \"Cartera sincronizada [hace X]\" (tiempo relativo). Ambos se actualizan automáticamente sin recargar la página.",
        },
      },
    ],
  },
  {
    version: "1.37.0",
    date: "2026-03-14",
    title: "Multi-Broker Cash Fix",
    titleTranslations: { es: "Corrección de Efectivo Multi-Broker" },
    changes: [
      {
        type: "improvement",
        text: "After a SnapTrade sync, a dismissible banner now confirms how many positions and new transactions were imported, or notifies you when the background auto-sync has refreshed your portfolio.",
        translations: {
          es: "Tras una sincronización de SnapTrade, un banner descartable confirma cuántas posiciones y nuevas transacciones se importaron, o te avisa cuando la sincronización automática en segundo plano ha actualizado tu cartera.",
        },
      },
      {
        type: "improvement",
        text: "Refined landing page marketing claims to use verifiable, evidence-based language instead of unsubstantiated superlatives.",
        translations: {
          es: "Se refinaron las afirmaciones de marketing en la página de inicio para usar lenguaje verificable y basado en evidencia en lugar de superlativos no fundamentados.",
        },
      },
      {
        type: "fix",
        text: "Importing from a new broker no longer deletes cash entries from other brokers. Cash is now tracked per source so Degiro, Interactive Brokers, SnapTrade, and manual entries coexist safely.",
        translations: {
          es: "Importar desde un nuevo broker ya no elimina las entradas de efectivo de otros brokers. El efectivo ahora se rastrea por origen para que Degiro, Interactive Brokers, SnapTrade y entradas manuales coexistan de forma segura.",
        },
      },
      {
        type: "fix",
        text: "Widget portfolio totals now respect the selected scope: Scriptable and Widget View default to all portfolios unless a specific portfolio is chosen, and values render with the correct portfolio currency.",
        translations: {
          es: "Los totales del widget ahora respetan el alcance seleccionado: Scriptable y Vista Widget usan todos los portafolios por defecto salvo que se elija uno específico, y los valores se muestran con la moneda correcta del portafolio.",
        },
      },
      {
        type: "fix",
        text: "Sample portfolio seeding is no longer available for real accounts: signup, onboarding, and dashboard empty-state actions now require importing or adding real holdings. Sample data remains available only in /demo.",
        translations: {
          es: "La carga de datos de ejemplo ya no está disponible para cuentas reales: el registro, onboarding y acciones del estado vacío del dashboard ahora requieren importar o añadir posiciones reales. Los datos de ejemplo quedan disponibles solo en /demo.",
        },
      },
      {
        type: "fix",
        text: "Scriptable widget scripts no longer hardcode a portfolio ID. Widget scope is now resolved on the backend from your profile configuration, so portfolio changes apply dynamically without re-copying scripts.",
        translations: {
          es: "Los scripts del widget de Scriptable ya no fijan un ID de portafolio. El alcance del widget ahora se resuelve en el backend según tu configuración de perfil, por lo que los cambios de portafolio se aplican dinámicamente sin volver a copiar el script.",
        },
      },
    ],
  },
  {
    version: "1.36.0",
    date: "2026-03-14",
    title: "Financial Planning Module",
    titleTranslations: { es: "Módulo de Planificación Financiera" },
    changes: [
      {
        type: "feature",
        text: "Financial Planning — FIRE calculator with 5 variants (Lean, Regular, Fat, Coast, Barista), retirement projections with Monte Carlo simulation and confidence bands, and multi-goal tracking with custom milestones. New Planning tab in Tools for Pro users.",
        translations: {
          es: "Planificación Financiera — calculadora FIRE con 5 variantes (Austero, Regular, Holgado, Costa, Barista), proyecciones de jubilación con simulación Monte Carlo y bandas de confianza, y seguimiento de múltiples metas con hitos personalizados. Nueva pestaña Planificación en Herramientas para usuarios Pro.",
        },
      },
      {
        type: "improvement",
        text: "Goals expanded to support multiple goals per portfolio with types (retirement, house, education, emergency fund, vacation, FIRE), custom milestones, priority ordering, and a dedicated management UI.",
        translations: {
          es: "Metas ampliadas para soportar múltiples metas por portafolio con tipos (jubilación, casa, educación, fondo de emergencia, vacaciones, FIRE), hitos personalizados, orden de prioridad e interfaz de gestión dedicada.",
        },
      },
    ],
  },
  {
    version: "1.35.0",
    date: "2026-03-14",
    title: "AI Support Chat",
    titleTranslations: { es: "Chat de Soporte IA" },
    changes: [
      {
        type: "feature",
        text: "AI Support Agent — Starter and Pro users can now chat with an AI assistant that knows trefolio inside and out. Get instant help with features, troubleshooting, and account questions directly from the dashboard.",
        translations: {
          es: "Agente de Soporte IA — los usuarios Starter y Pro ahora pueden chatear con un asistente IA que conoce trefolio a fondo. Obtén ayuda instantánea con funciones, solución de problemas y preguntas de cuenta directamente desde el panel.",
        },
      },
      {
        type: "feature",
        text: "Admin support chat dashboard — admins can review all support conversations, see what users are asking, monitor resolution quality, and configure rate limits and custom AI instructions.",
        translations: {
          es: "Panel de soporte para administradores — los admins pueden revisar todas las conversaciones de soporte, ver qué preguntan los usuarios, monitorear la calidad de resolución y configurar límites y instrucciones personalizadas del IA.",
        },
      },
    ],
  },
  {
    version: "1.34.0",
    date: "2026-03-14",
    title: "Native Mobile App Polish",
    titleTranslations: { es: "Pulido de la App Nativa Móvil" },
    changes: [
      {
        type: "improvement",
        text: "Branded app bar with trefolio logo and name replaces the blank white header on iOS and Android.",
        translations: {
          es: "Barra de app con el logo y nombre de trefolio reemplaza la cabecera blanca en iOS y Android.",
        },
      },
      {
        type: "improvement",
        text: "Portfolio switcher — tap the header title to switch between portfolios or view all.",
        translations: {
          es: "Selector de portafolio — toca el título de la cabecera para cambiar entre portafolios o ver todos.",
        },
      },
      {
        type: "improvement",
        text: "Native splash screen stays visible until data is loaded, then fades out smoothly.",
        translations: {
          es: "La pantalla de carga nativa permanece visible hasta que los datos se cargan, luego desaparece suavemente.",
        },
      },
      {
        type: "improvement",
        text: "Navigation loading bar — thin animated progress indicator appears during page transitions.",
        translations: {
          es: "Barra de carga de navegación — indicador de progreso animado durante las transiciones de página.",
        },
      },
      {
        type: "fix",
        text: "Fixed transaction history table overflowing the viewport on Android, which hid the tool tabs.",
        translations: {
          es: "Corregida la tabla de historial de transacciones que desbordaba la pantalla en Android, ocultando las pestañas de herramientas.",
        },
      },
      {
        type: "fix",
        text: "Fixed tab bar disappearing on wider Android screens.",
        translations: {
          es: "Corregida la barra de pestañas que desaparecía en pantallas Android más anchas.",
        },
      },
      {
        type: "fix",
        text: "Fixed iOS opening Safari instead of the in-app WebView for internal navigation.",
        translations: {
          es: "Corregido iOS abriendo Safari en lugar del WebView interno para la navegación.",
        },
      },
    ],
  },
  {
    version: "1.33.0",
    date: "2026-03-14",
    title: "Native Mobile App UI",
    titleTranslations: { es: "Interfaz Nativa para Móvil" },
    changes: [
      {
        type: "feature",
        text: "Native mobile app experience — card-based portfolio dashboard with all 8 tabs, 5 mobile-optimized tools (Watchlist, Dividends, Transactions, Alerts, Performance), simplified 3-tab navigation, and streamlined native shell.",
        translations: {
          es: "Experiencia nativa móvil — panel de portafolio con tarjetas en las 8 pestañas, 5 herramientas optimizadas para móvil (Watchlist, Dividendos, Transacciones, Alertas, Rendimiento), navegación simplificada de 3 pestañas y shell nativo optimizado.",
        },
      },
    ],
  },
  {
    version: "1.32.0",
    date: "2026-03-13",
    title: "Persistent Goal Tracker",
    titleTranslations: { es: "Seguimiento de Metas Persistente" },
    changes: [
      {
        type: "feature",
        text: "Goal Tracker — set a portfolio target, save it, and track progress automatically as your portfolio grows. Includes a dashboard progress banner, milestone celebrations at 25/50/75/100%, and projection charts with goal line overlay.",
        translations: {
          es: "Seguimiento de Metas — establece un objetivo de portafolio, guárdalo y sigue tu progreso automáticamente. Incluye barra de progreso en el panel, celebraciones en hitos del 25/50/75/100% y gráficos de proyección con línea de meta.",
        },
      },
    ],
  },
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
      {
        type: "improvement",
        text: "Redesigned Markets & Assets panel: unified card layout, 7-day sparkline trends on market indices, enhanced portfolio hero row, and color-coded asset allocation bar",
        translations: {
          es: "Panel de Mercados y Activos rediseñado: diseño unificado, tendencias sparkline de 7 días en índices de mercado, fila destacada del portafolio mejorada y barra de asignación de activos con colores",
          de: "Neugestaltetes Markt- & Vermögenspanel: einheitliches Kartenlayout, 7-Tage-Sparkline-Trends bei Marktindizes, verbesserte Portfolio-Hervorhebung und farbcodierte Vermögensallokationsleiste",
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
        text: "Automatic portfolio sync every hour — your holdings stay up-to-date without manual imports",
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
        text: "Create up to 5 independent portfolios with separate holdings and performance tracking (Trefolio)",
        translations: { es: "Crea hasta 5 portafolios independientes con posiciones y rendimiento separados (Trefolio)" },
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
        text: "New Bifolio plan at \u20ac3.99/mo — 50 holdings, AI calls, sharing, CSV export, and 1-year history",
        translations: { es: "Nuevo plan Bifolio a \u20ac3,99/mes — 50 posiciones, llamadas IA, compartir, exportar CSV e historial de 1 año" },
      },
      {
        type: "improvement",
        text: "Trefolio plan at \u20ac7.49/mo includes advanced metrics, full history, and unlimited everything",
        translations: { es: "Plan Trefolio a \u20ac7,49/mes incluye métricas avanzadas, historial completo y todo ilimitado" },
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
