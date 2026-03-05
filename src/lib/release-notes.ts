export type ChangeType = "feature" | "improvement" | "fix";

export interface ReleaseChange {
  type: ChangeType;
  text: string;
  textEs?: string;
}

export interface ReleaseEntry {
  version: string;
  date: string;
  title: string;
  titleEs?: string;
  changes: ReleaseChange[];
}

export const CURRENT_VERSION = "0.19.0";

export const releaseNotes: ReleaseEntry[] = [
  {
    version: "0.19.0",
    date: "2026-03-05",
    title: "Redesigned navigation header and mobile bottom tabs",
    titleEs: "Navegación rediseñada con cabecera y pestañas móviles inferiores",
    changes: [
      {
        type: "feature",
        text: "New two-row header: persistent global navigation bar (Portfolio, Tools, Indicators) with contextual action bar per page",
        textEs: "Nueva cabecera de dos filas: barra de navegación global persistente (Portafolio, Herramientas, Indicadores) con barra de acciones contextual por página",
      },
      {
        type: "feature",
        text: "Mobile bottom tab bar for quick access to all main sections on small screens",
        textEs: "Barra de pestañas inferior en móvil para acceso rápido a todas las secciones principales en pantallas pequeñas",
      },
      {
        type: "improvement",
        text: "User dropdown menu consolidates profile, admin access, plan badge, and sign-out into a single compact control",
        textEs: "Menú desplegable de usuario consolida perfil, acceso admin, insignia de plan y cierre de sesión en un solo control compacto",
      },
      {
        type: "improvement",
        text: "Shared layout across all authenticated pages eliminates duplicate provider wrappers and inconsistent per-page headers",
        textEs: "Layout compartido en todas las páginas autenticadas elimina proveedores duplicados y cabeceras inconsistentes por página",
      },
    ],
  },
  {
    version: "0.18.1",
    date: "2026-03-05",
    title: "Missing price reporting and automatic ISIN resolution",
    titleEs: "Reporte de precios faltantes y resolución automática de ISIN",
    changes: [
      {
        type: "feature",
        text: "Report button appears on holdings with missing prices — submits a feedback report so the admin can fix the ticker mapping",
        textEs: "Botón de reporte aparece en posiciones sin precio — envía un reporte de feedback para que el admin corrija el mapeo del ticker",
      },
      {
        type: "improvement",
        text: "DEGIRO import now auto-resolves unmapped ISINs via Yahoo Finance search, reducing manual ticker mapping",
        textEs: "La importación DEGIRO ahora resuelve ISINs no mapeados automáticamente vía búsqueda de Yahoo Finance, reduciendo el mapeo manual de tickers",
      },
      {
        type: "fix",
        text: "Constellation Software, iShares Gold Producers, and iShares MSCI China now resolve correct prices after DEGIRO import by using proper exchange-suffixed tickers",
        textEs: "Constellation Software, iShares Gold Producers e iShares MSCI China ahora muestran precios correctos tras importación DEGIRO al usar tickers con sufijo de bolsa adecuado",
      },
      {
        type: "fix",
        text: "Import modal can no longer be dismissed by clicking outside while an import is in progress, preventing partial imports",
        textEs: "El modal de importación ya no se puede cerrar haciendo clic fuera mientras una importación está en progreso, evitando importaciones parciales",
      },
    ],
  },
  {
    version: "0.18.0",
    date: "2026-03-05",
    title: "Feedback system and Pro badge in header",
    titleEs: "Sistema de feedback y distintivo Pro en el encabezado",
    changes: [
      {
        type: "feature",
        text: "Submit feedback or report issues directly from the dashboard — admin can view and reply from the Admin panel",
        textEs: "Envía feedback o reporta problemas directamente desde el panel — el admin puede verlos y responder desde el panel de administración",
      },
      {
        type: "improvement",
        text: "Pro/Free plan badge is now prominently displayed next to your username in the header",
        textEs: "El distintivo de plan Pro/Free ahora se muestra de forma destacada junto a tu nombre de usuario en el encabezado",
      },
    ],
  },
  {
    version: "0.17.6",
    date: "2026-03-05",
    title: "Fix Pro plan not activating after Stripe checkout",
    titleEs: "Corregir plan Pro no activándose tras checkout de Stripe",
    changes: [
      {
        type: "fix",
        text: "Pro plan now activates immediately after returning from Stripe checkout instead of staying on Free due to webhook delay",
        textEs: "El plan Pro ahora se activa inmediatamente al volver del checkout de Stripe en lugar de quedarse en Free por retraso del webhook",
      },
    ],
  },
  {
    version: "0.17.5",
    date: "2026-03-04",
    title: "Import cash balances from DEGIRO CSV",
    titleEs: "Importar saldos de efectivo desde CSV de DEGIRO",
    changes: [
      {
        type: "feature",
        text: "DEGIRO imports now automatically detect remaining cash balances per currency and add them to the Cash section, with FX conversion to EUR",
        textEs: "Las importaciones de DEGIRO ahora detectan automáticamente los saldos de efectivo por moneda y los añaden a la sección de Efectivo, con conversión FX a EUR",
      },
    ],
  },
  {
    version: "0.17.4",
    date: "2026-03-04",
    title: "External Services quick links in Admin",
    titleEs: "Enlaces rápidos a servicios externos en Admin",
    changes: [
      {
        type: "feature",
        text: "Added External Services card in Admin Settings with quick links to Stripe, Grafana, Upstash Redis, Vercel, Turso, Alpha Vantage, and OpenAI dashboards",
        textEs: "Añadida tarjeta de Servicios Externos en Configuración de Admin con enlaces rápidos a los paneles de Stripe, Grafana, Upstash Redis, Vercel, Turso, Alpha Vantage y OpenAI",
      },
    ],
  },
  {
    version: "0.17.3",
    date: "2026-03-04",
    title: "Remove deprecated generate-from-holdings button",
    titleEs: "Eliminar botón obsoleto de generar desde posiciones",
    changes: [
      {
        type: "improvement",
        text: "Removed the deprecated 'Generate buy transactions from holdings' button since transactions are the source of truth for holdings",
        textEs: "Eliminado el botón obsoleto 'Generar transacciones de compra desde posiciones' ya que las transacciones son la fuente de verdad para las posiciones",
      },
    ],
  },
  {
    version: "0.17.2",
    date: "2026-03-04",
    title: "CSV Import Error Handling",
    titleEs: "Manejo de errores en importación CSV",
    changes: [
      {
        type: "fix",
        text: "Fixed CSV import showing a blank dead-end screen when parsing returned no transactions",
        textEs: "Corregido que la importación CSV mostraba una pantalla en blanco sin salida cuando no se encontraban transacciones",
      },
      {
        type: "improvement",
        text: "Import preview always shows a Cancel button and specific error messages for auth, parsing, and network failures",
        textEs: "La vista previa de importación siempre muestra un botón Cancelar y mensajes de error específicos para fallos de autenticación, análisis y red",
      },
    ],
  },
  {
    version: "0.17.1",
    date: "2026-03-04",
    title: "Improved CSV Import Experience",
    titleEs: "Experiencia de importación CSV mejorada",
    changes: [
      {
        type: "improvement",
        text: "CSV import no longer shows misleading AI references — parsing and importing labels are accurate",
        textEs: "La importación CSV ya no muestra referencias engañosas a IA — las etiquetas de análisis e importación son precisas",
      },
      {
        type: "improvement",
        text: "Import progress bar shows real-time progress (X of Y) with error count during transaction import",
        textEs: "Barra de progreso muestra avance en tiempo real (X de Y) con conteo de errores durante la importación",
      },
      {
        type: "fix",
        text: "Fixed database migration that could fail when ai_daily_reset_at column was missing",
        textEs: "Corregida migración de base de datos que podía fallar cuando faltaba la columna ai_daily_reset_at",
      },
    ],
  },
  {
    version: "0.17.0",
    date: "2026-03-04",
    title: "Grafana Cloud Integration for Vercel",
    titleEs: "Integración con Grafana Cloud para Vercel",
    changes: [
      {
        type: "feature",
        text: "Push-based metrics to Grafana Cloud via OTLP HTTP, compatible with Vercel serverless functions",
        textEs: "Métricas push a Grafana Cloud vía OTLP HTTP, compatible con funciones serverless de Vercel",
      },
      {
        type: "feature",
        text: "Scheduled cron job pushes DB-derived gauges (users, holdings, transactions, events) every minute",
        textEs: "Tarea cron programada envía métricas derivadas de la BD (usuarios, holdings, transacciones, eventos) cada minuto",
      },
      {
        type: "improvement",
        text: "Admin panel detects Grafana Cloud vs local Grafana and links to the correct dashboard",
        textEs: "El panel de administración detecta Grafana Cloud vs local y enlaza al dashboard correcto",
      },
    ],
  },
  {
    version: "0.16.0",
    date: "2026-03-04",
    title: "Per-Customer Rate Limiting & Pro Capacity Management",
    titleEs: "Límites de Uso por Cliente y Gestión de Capacidad Pro",
    changes: [
      {
        type: "feature",
        text: "Per-customer rate limiting for Alpha Vantage (15 req/min per user) and AI analysis (30/day for Pro)",
        textEs: "Límites de uso por cliente para Alpha Vantage (15 req/min por usuario) e IA (30/día para Pro)",
      },
      {
        type: "feature",
        text: "Pro subscriber capacity cap with visible counter showing remaining spots on upgrade screens",
        textEs: "Límite de capacidad Pro con contador visible de plazas disponibles en pantallas de mejora",
      },
      {
        type: "feature",
        text: "Daily AI import limit (5/day) to prevent abuse of the shared OpenAI key",
        textEs: "Límite diario de importaciones IA (5/día) para prevenir abuso de la clave compartida de OpenAI",
      },
      {
        type: "improvement",
        text: "Admin panel now shows platform capacity, per-user AV and AI usage breakdowns",
        textEs: "El panel de administración ahora muestra capacidad de la plataforma y desglose de uso por usuario",
      },
      {
        type: "improvement",
        text: "Checkout blocked when Pro is at capacity; capacity endpoint for frontend awareness",
        textEs: "Checkout bloqueado cuando Pro está lleno; endpoint de capacidad para el frontend",
      },
      {
        type: "improvement",
        text: "Event-driven rate limiting via Upstash Redis for sub-millisecond checks on Vercel; Turso writes deferred with waitUntil()",
        textEs: "Limitación de uso basada en eventos vía Upstash Redis para verificaciones sub-milisegundo en Vercel; escrituras a Turso diferidas con waitUntil()",
      },
    ],
  },
  {
    version: "0.15.0",
    date: "2026-03-04",
    title: "Prometheus Metrics & Grafana Observability",
    titleEs: "Métricas Prometheus y Observabilidad con Grafana",
    changes: [
      {
        type: "feature",
        text: "Added /api/metrics endpoint exposing Prometheus-format metrics for Grafana dashboards",
        textEs: "Nuevo endpoint /api/metrics con métricas en formato Prometheus para dashboards de Grafana",
      },
      {
        type: "improvement",
        text: "All API routes now track request count, latency histograms, and error rates",
        textEs: "Todas las rutas API ahora registran conteo de peticiones, histogramas de latencia y tasas de error",
      },
      {
        type: "improvement",
        text: "External provider calls (Yahoo Finance, Alpha Vantage) instrumented with duration and failure tracking",
        textEs: "Llamadas a proveedores externos (Yahoo Finance, Alpha Vantage) instrumentadas con duración y seguimiento de fallos",
      },
      {
        type: "improvement",
        text: "Business metrics for auth events, holdings, transactions, imports, AI calls, billing, and paywall hits",
        textEs: "Métricas de negocio para eventos de autenticación, posiciones, transacciones, importaciones, llamadas IA, facturación y paywall",
      },
    ],
  },
  {
    version: "0.14.0",
    date: "2026-03-04",
    title: "Portfolio Growth Periods",
    titleEs: "Crecimiento del Portafolio por Períodos",
    changes: [
      {
        type: "feature",
        text: "Dashboard now shows portfolio growth for YTD, 1 Month, and 1 Year periods",
        textEs: "El dashboard ahora muestra el crecimiento del portafolio para los períodos YTD, 1 Mes y 1 Año",
      },
    ],
  },
  {
    version: "0.13.0",
    date: "2026-03-04",
    title: "Admin User Tier Management",
    titleEs: "Gestión de Planes de Usuario para Administradores",
    changes: [
      {
        type: "feature",
        text: "Admins can now change user subscription tiers (Free/Pro) from the admin panel",
        textEs: "Los administradores ahora pueden cambiar el plan de suscripción (Free/Pro) de los usuarios desde el panel de administración",
      },
    ],
  },
  {
    version: "0.12.0",
    date: "2026-03-04",
    title: "Multi-Format CSV Import & Incremental Holdings",
    titleEs: "Importación CSV Multi-Formato y Posiciones Incrementales",
    changes: [
      {
        type: "feature",
        text: "Added simple CSV import format alongside DeGiro, with manual format selection",
        textEs: "Se añadió formato de importación CSV simple junto a DeGiro, con selección manual de formato",
      },
      {
        type: "improvement",
        text: "Holdings are now incrementally updated on each transaction for faster dashboard loads",
        textEs: "Las posiciones ahora se actualizan incrementalmente en cada transacción para cargas más rápidas del dashboard",
      },
      {
        type: "feature",
        text: "Added FAQ section and how-to-upload video tutorial to the landing page",
        textEs: "Se añadió sección de preguntas frecuentes y video tutorial de importación a la página de inicio",
      },
      {
        type: "fix",
        text: "Fixed TTWROR calculation (now uses Modified Dietz) and IRR handling for short time spans",
        textEs: "Se corrigió el cálculo de TTWROR (ahora usa Dietz Modificado) y el manejo de TIR para periodos cortos",
      },
    ],
  },
  {
    version: "0.11.0",
    date: "2026-03-03",
    title: "Subscriptions and Pro Tiering",
    titleEs: "Suscripciones y Niveles Pro",
    changes: [
      {
        type: "feature",
        text: "Introduced Stripe-powered subscriptions with monthly (2 EUR) and annual (20 EUR) Pro plans, including checkout, webhook sync, and self-service billing portal",
        textEs: "Se introdujeron suscripciones con Stripe con planes Pro mensual (2 EUR) y anual (20 EUR), incluyendo checkout, sincronización por webhook y portal de facturación autoservicio",
      },
      {
        type: "feature",
        text: "Added Free vs Pro entitlement gating with graceful upgrade prompts for fundamentals, intelligence, and economic indicators",
        textEs: "Se añadió control de acceso por nivel Free vs Pro con prompts de actualización para fundamentales, inteligencia e indicadores económicos",
      },
      {
        type: "improvement",
        text: "Implemented Free-tier AI usage limits (5 calls/month) with server-side tracking and Pro unlimited access",
        textEs: "Se implementaron límites de uso de IA en el plan Free (5 llamadas/mes) con seguimiento en servidor y acceso ilimitado en Pro",
      },
      {
        type: "improvement",
        text: "Added contextual Free vs Pro comparison cards across AI limit and locked premium screens, plus always-visible upgrade guidance in Profile and Settings",
        textEs: "Se añadieron tarjetas contextuales de comparación Free vs Pro en límites de IA y pantallas premium bloqueadas, además de guía de mejora siempre visible en Perfil y Configuración",
      },
      {
        type: "improvement",
        text: "Portfolio Growth Projection is now visible but blurred for Free users with a direct Pro upgrade prompt, and can be minimized from the dashboard",
        textEs: "La Proyección de Crecimiento del Portafolio ahora es visible pero difuminada para usuarios Free con acceso directo a mejora a Pro, y puede minimizarse desde el dashboard",
      },
      {
        type: "fix",
        text: "DEGIRO CSV import now uses the broker parser in Import Portfolio, and dashboard holdings are derived from transaction history for consistent portfolio totals",
        textEs: "La importación CSV de DEGIRO ahora usa el parser del bróker en Importar Portafolio, y las posiciones del dashboard se derivan del historial de transacciones para mantener totales consistentes",
      },
      {
        type: "fix",
        text: "DEGIRO import now preserves each transaction fee currency and attaches fees by exact order timestamp, preventing duplicated or mis-currency costs in imported transactions",
        textEs: "La importación de DEGIRO ahora conserva la moneda de cada comisión y asigna comisiones por marca de tiempo exacta de la orden, evitando costes duplicados o en moneda incorrecta en transacciones importadas",
      },
      {
        type: "improvement",
        text: "Portfolio Performance now includes clear in-app methodology notes explaining TTWROR and IRR calculations",
        textEs: "Rendimiento del Portafolio ahora incluye notas metodológicas en la app que explican los cálculos de TTWROR y TIR",
      },
      {
        type: "feature",
        text: "Public landing page with feature showcase, pricing comparison, competitor table, and investor metrics — accessible at /landing",
        textEs: "Página de inicio pública con vitrina de funcionalidades, comparación de precios, tabla de competidores y métricas para inversores — accesible en /landing",
      },
    ],
  },
  {
    version: "0.10.1",
    date: "2026-03-03",
    title: "Pre-Deploy Test Suite",
    titleEs: "Suite de Pruebas Pre-Despliegue",
    changes: [
      {
        type: "feature",
        text: "Comprehensive pre-deploy test suite: 24 unit tests (Vitest) and 26 E2E tests (Playwright) covering auth, portfolio CRUD, broker import, and admin panel — runs before every Vercel deploy",
        textEs: "Suite de pruebas pre-despliegue completa: 24 pruebas unitarias (Vitest) y 26 pruebas E2E (Playwright) cubriendo autenticación, CRUD de portafolio, importación de bróker y panel de admin — se ejecuta antes de cada despliegue a Vercel",
      },
      {
        type: "improvement",
        text: "Added npm run pre-deploy script that chains TypeScript type-check, ESLint, unit tests, production build, and E2E tests",
        textEs: "Nuevo script npm run pre-deploy que encadena verificación de tipos TypeScript, ESLint, pruebas unitarias, compilación de producción y pruebas E2E",
      },
    ],
  },
  {
    version: "0.10.0",
    date: "2026-03-03",
    title: "DEGIRO CSV Import for All Users",
    titleEs: "Importación CSV de DEGIRO para Todos los Usuarios",
    changes: [
      {
        type: "feature",
        text: "All users can now import their DEGIRO Account CSV to automatically populate transactions, dividends, and fees with full server-side parsing",
        textEs: "Todos los usuarios pueden importar su CSV de Cuenta DEGIRO para poblar automáticamente transacciones, dividendos y comisiones con análisis completo en el servidor",
      },
      {
        type: "improvement",
        text: "Redesigned broker import UI with card-based broker selection, import summary stats, and progress feedback",
        textEs: "Interfaz de importación de bróker rediseñada con selección de bróker por tarjetas, resumen de estadísticas y retroalimentación de progreso",
      },
    ],
  },
  {
    version: "0.9.9",
    date: "2026-03-03",
    title: "Portfolio Growth Projection",
    titleEs: "Proyección de Crecimiento del Portafolio",
    changes: [
      {
        type: "feature",
        text: "New portfolio growth projection on the Dashboard — estimate future portfolio value with customizable annual growth rate, dividend reinvestment toggle, and yearly contributions, visualized with an interactive chart",
        textEs: "Nueva proyección de crecimiento del portafolio en el Dashboard — estima el valor futuro del portafolio con tasa de crecimiento anual personalizable, opción de reinvertir dividendos y aportaciones anuales, visualizado con un gráfico interactivo",
      },
    ],
  },
  {
    version: "0.9.8",
    date: "2026-03-03",
    title: "DEGIRO Transaction Import",
    titleEs: "Importación de Transacciones DEGIRO",
    changes: [
      {
        type: "feature",
        text: "Full DEGIRO Account CSV import — buys, sells, dividends (with withholding taxes), and broker fees are automatically parsed and seeded",
        textEs: "Importación completa del CSV de cuenta DEGIRO — compras, ventas, dividendos (con retenciones), y comisiones se parsean y cargan automáticamente",
      },
      {
        type: "improvement",
        text: "Dividend section now populated with real dividend history from DEGIRO, including tax withholdings and monthly calendar",
        textEs: "La sección de dividendos ahora muestra el historial real de dividendos de DEGIRO, incluyendo retenciones fiscales y calendario mensual",
      },
      {
        type: "improvement",
        text: "Transaction history shows all buy/sell/dividend/fee activity parsed from the DEGIRO CSV",
        textEs: "El historial de transacciones muestra toda la actividad de compra/venta/dividendo/comisión parseada del CSV de DEGIRO",
      },
    ],
  },
  {
    version: "0.9.7",
    date: "2026-03-03",
    title: "Generate Transactions from Holdings",
    titleEs: "Generar Transacciones desde Posiciones",
    changes: [
      {
        type: "feature",
        text: "One-click generation of buy transactions from existing holdings when the transaction history is empty",
        textEs: "Generación con un clic de transacciones de compra desde posiciones existentes cuando el historial de transacciones está vacío",
      },
    ],
  },
  {
    version: "0.9.6",
    date: "2026-03-03",
    title: "Estimated Dividend Income",
    titleEs: "Ingresos por Dividendos Estimados",
    changes: [
      {
        type: "feature",
        text: "Dividends section now shows estimated annual income based on your holdings' dividend yields, even without recorded transactions",
        textEs: "La sección de dividendos ahora muestra ingresos anuales estimados basados en el rendimiento por dividendo de tus posiciones, incluso sin transacciones registradas",
      },
      {
        type: "improvement",
        text: "Per-stock dividend breakdown with yield percentages and projected 5-year growth",
        textEs: "Desglose de dividendos por acción con porcentajes de rendimiento y proyección de crecimiento a 5 años",
      },
    ],
  },
  {
    version: "0.9.5",
    date: "2026-03-03",
    title: "Delete Account",
    titleEs: "Eliminar Cuenta",
    changes: [
      {
        type: "feature",
        text: "Users can now delete their own account from the Profile page with password confirmation",
        textEs: "Los usuarios ahora pueden eliminar su propia cuenta desde la página de Perfil con confirmación de contraseña",
      },
    ],
  },
  {
    version: "0.9.4",
    date: "2026-03-03",
    title: "Admin-Managed OpenAI Key",
    titleEs: "Clave OpenAI Gestionada por Admin",
    changes: [
      {
        type: "feature",
        text: "OpenAI API key is now stored encrypted and managed by the admin in the Settings tab, just like Alpha Vantage",
        textEs: "La clave API de OpenAI ahora se almacena cifrada y la gestiona el administrador en la pestaña de Configuración, igual que Alpha Vantage",
      },
      {
        type: "improvement",
        text: "Removed dependency on STOCKTRACKER_OPENAI_API_KEY environment variable — key is configured through the Admin panel",
        textEs: "Eliminada la dependencia de la variable de entorno STOCKTRACKER_OPENAI_API_KEY — la clave se configura desde el panel de Admin",
      },
    ],
  },
  {
    version: "0.9.3",
    date: "2026-03-03",
    title: "Smart Import & Dividend Projections",
    titleEs: "Importación Inteligente y Proyecciones de Dividendos",
    changes: [
      {
        type: "feature",
        text: "AI import now extracts transactions (dividends, buys, sells, fees) alongside holdings from CSV and images",
        textEs: "La importación con IA ahora extrae transacciones (dividendos, compras, ventas, comisiones) además de posiciones desde CSV e imágenes",
      },
      {
        type: "feature",
        text: "Dividend section shows yearly income history and 5-year projections with 10% annual growth",
        textEs: "La sección de dividendos muestra historial anual y proyecciones a 5 años con crecimiento del 10% anual",
      },
    ],
  },
  {
    version: "0.9.2",
    date: "2026-03-03",
    title: "Centralized API Key Management",
    titleEs: "Gestión Centralizada de Clave API",
    changes: [
      {
        type: "feature",
        text: "Alpha Vantage API key is now managed globally by the admin and shared with all users (encrypted at rest)",
        textEs: "La clave API de Alpha Vantage ahora la gestiona el administrador de forma global y se comparte con todos los usuarios (cifrada en reposo)",
      },
      {
        type: "improvement",
        text: "Added Settings tab in admin panel with API key configuration",
        textEs: "Nueva pestaña de Configuración en el panel de administración con gestión de clave API",
      },
      {
        type: "improvement",
        text: "API key removed from user-facing settings — server resolves it automatically",
        textEs: "Clave API eliminada de la configuración del usuario — el servidor la resuelve automáticamente",
      },
    ],
  },
  {
    version: "0.9.1",
    date: "2026-03-03",
    title: "Analytics & Performance Insights",
    titleEs: "Analíticas y Métricas de Rendimiento",
    changes: [
      {
        type: "improvement",
        text: "Updated seed portfolio data from DEGIRO account CSV with latest holdings and cash balances",
        textEs: "Datos de cartera semilla actualizados desde CSV de cuenta DEGIRO con posiciones y saldos de efectivo al día",
      },
      {
        type: "feature",
        text: "Vercel Analytics and Speed Insights for privacy-friendly page-view and Core Web Vitals tracking",
        textEs: "Vercel Analytics y Speed Insights para seguimiento de visitas y métricas web sin cookies",
      },
      {
        type: "feature",
        text: "Internal event tracking for feature usage (stock views, AI analysis, imports, logins)",
        textEs: "Seguimiento interno de uso de funciones (vistas de acciones, análisis IA, importaciones, inicios de sesión)",
      },
      {
        type: "feature",
        text: "Admin analytics dashboard with usage charts, top stocks, and signup trends",
        textEs: "Panel de analíticas para administradores con gráficos de uso, acciones populares y tendencias de registro",
      },
    ],
  },
  {
    version: "0.9.0",
    date: "2026-03-03",
    title: "AI Portfolio Import & Economic Dashboard",
    titleEs: "Importación IA de Portafolio y Panel Económico",
    changes: [
      {
        type: "feature",
        text: "Import portfolios from screenshots or CSV files using AI extraction",
        textEs: "Importar portafolios desde capturas de pantalla o archivos CSV con extracción IA",
      },
      {
        type: "feature",
        text: "US economic indicators dashboard (GDP, CPI, unemployment, and more)",
        textEs: "Panel de indicadores económicos de EE.UU. (PIB, IPC, desempleo y más)",
      },
      {
        type: "feature",
        text: "AI-powered analysis for stocks, intelligence data, and economic indicators",
        textEs: "Análisis potenciado por IA para acciones, datos de inteligencia e indicadores económicos",
      },
      {
        type: "improvement",
        text: "Portfolio benchmark comparison with S&P 500, Nasdaq, Dow Jones, and Euro Stoxx 50",
        textEs: "Comparación del portafolio con S&P 500, Nasdaq, Dow Jones y Euro Stoxx 50",
      },
      {
        type: "feature",
        text: "Configurable auto-refresh for stock quotes (every 15 min, 30 min, or 1 hour)",
        textEs: "Actualización automática configurable de cotizaciones (cada 15 min, 30 min o 1 hora)",
      },
    ],
  },
  {
    version: "0.8.0",
    date: "2026-02-15",
    title: "Alpha Intelligence & Insider Data",
    titleEs: "Alpha Intelligence y Datos de Insiders",
    changes: [
      {
        type: "feature",
        text: "Market news sentiment analysis with bullish/bearish indicators",
        textEs: "Análisis de sentimiento de noticias de mercado con indicadores alcistas/bajistas",
      },
      {
        type: "feature",
        text: "Insider transactions tracking for individual stocks",
        textEs: "Seguimiento de transacciones de insiders para acciones individuales",
      },
      {
        type: "feature",
        text: "Institutional holdings breakdown by top investors",
        textEs: "Desglose de tenencias institucionales por principales inversores",
      },
      {
        type: "feature",
        text: "Earnings call transcript viewer",
        textEs: "Visor de transcripciones de llamadas de resultados",
      },
    ],
  },
  {
    version: "0.7.0",
    date: "2026-01-28",
    title: "Stock Detail Pages & Fundamentals",
    titleEs: "Páginas de Detalle de Acciones y Fundamentales",
    changes: [
      {
        type: "feature",
        text: "Dedicated stock detail pages with interactive price charts",
        textEs: "Páginas de detalle de acciones con gráficos de precios interactivos",
      },
      {
        type: "feature",
        text: "Financial statements: income, balance sheet, cash flow, and earnings",
        textEs: "Estados financieros: resultados, balance general, flujo de caja y ganancias",
      },
      {
        type: "improvement",
        text: "Alpha Vantage integration for extended fundamental data",
        textEs: "Integración con Alpha Vantage para datos fundamentales extendidos",
      },
      {
        type: "fix",
        text: "Market open/closed status detection for different time zones",
        textEs: "Detección de estado abierto/cerrado del mercado para diferentes zonas horarias",
      },
    ],
  },
  {
    version: "0.6.0",
    date: "2026-01-10",
    title: "Multi-User Support & Profiles",
    titleEs: "Soporte Multi-Usuario y Perfiles",
    changes: [
      {
        type: "feature",
        text: "User authentication with secure session management",
        textEs: "Autenticación de usuarios con gestión segura de sesiones",
      },
      {
        type: "feature",
        text: "User profiles with avatar and display name",
        textEs: "Perfiles de usuario con avatar y nombre visible",
      },
      {
        type: "feature",
        text: "Admin panel for user management",
        textEs: "Panel de administración para gestión de usuarios",
      },
      {
        type: "improvement",
        text: "Dark mode support across all pages",
        textEs: "Soporte de modo oscuro en todas las páginas",
      },
    ],
  },
  {
    version: "0.5.0",
    date: "2025-12-20",
    title: "Portfolio Dashboard & Cash Tracking",
    titleEs: "Panel de Portafolio y Seguimiento de Efectivo",
    changes: [
      {
        type: "feature",
        text: "Portfolio dashboard with real-time stock quotes",
        textEs: "Panel de portafolio con cotizaciones de acciones en tiempo real",
      },
      {
        type: "feature",
        text: "Cash balance tracking with multiple entries",
        textEs: "Seguimiento de saldos de efectivo con múltiples entradas",
      },
      {
        type: "feature",
        text: "Multi-language support (English & Spanish)",
        textEs: "Soporte multi-idioma (inglés y español)",
      },
      {
        type: "improvement",
        text: "Responsive design for mobile and tablet",
        textEs: "Diseño responsivo para móvil y tablet",
      },
    ],
  },
];
