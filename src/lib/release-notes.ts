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

export const CURRENT_VERSION = "0.34.1";

export const releaseNotes: ReleaseEntry[] = [
  {
    version: "0.34.1",
    date: "2026-03-06",
    title: "Conversion Funnel Analytics",
    titleTranslations: { es: "Analíticas de Embudo de Conversión" },
    changes: [
      {
        type: "feature",
        text: "Admin conversion funnel view showing the free-to-paid journey: Signups → Upsell Shown → Upsell Clicked → Checkout Started → Checkout Completed, with stage-by-stage drop-off rates",
        translations: { es: "Vista de embudo de conversión en admin mostrando el recorrido de gratis a pago: Registros → Upsell Mostrado → Upsell Clicado → Checkout Iniciado → Checkout Completado, con tasas de abandono por etapa" },
      },
    ],
  },
  {
    version: "0.34.0",
    date: "2026-03-06",
    title: "Security Hardening & Scaling Readiness",
    titleTranslations: { es: "Refuerzo de Seguridad y Preparación para Escalado" },
    changes: [
      {
        type: "improvement",
        text: "IP-based rate limiting on signup (5/hour) and login (10/15 min) to prevent abuse and brute-force attacks",
        translations: { es: "Limitación de intentos por IP en registro (5/hora) e inicio de sesión (10/15 min) para prevenir abuso y ataques de fuerza bruta" },
      },
      {
        type: "feature",
        text: "Cloudflare Turnstile CAPTCHA on signup and login forms to block automated bot signups",
        translations: { es: "CAPTCHA Cloudflare Turnstile en formularios de registro e inicio de sesión para bloquear registros automáticos de bots" },
      },
      {
        type: "improvement",
        text: "Global monthly OpenAI call cap (10,000/month) prevents runaway AI costs from traffic spikes",
        translations: { es: "Límite mensual global de llamadas a OpenAI (10.000/mes) para prevenir costes desbocados por picos de tráfico" },
      },
      {
        type: "improvement",
        text: "Automatic analytics event cleanup — events older than 90 days are purged daily to control database growth",
        translations: { es: "Limpieza automática de eventos analíticos — los eventos de más de 90 días se eliminan diariamente para controlar el crecimiento de la base de datos" },
      },
      {
        type: "improvement",
        text: "Added HSTS and Content-Security-Policy headers for stronger browser security",
        translations: { es: "Añadidas cabeceras HSTS y Content-Security-Policy para mayor seguridad del navegador" },
      },
      {
        type: "improvement",
        text: "Session secret now enforced in production — the app refuses to start without APP_SESSION_SECRET set",
        translations: { es: "Secreto de sesión ahora obligatorio en producción — la app no arranca sin APP_SESSION_SECRET configurado" },
      },
      {
        type: "improvement",
        text: "Pro subscriber capacity raised from 10 to 500 for ad campaign readiness",
        translations: { es: "Capacidad de suscriptores Pro aumentada de 10 a 500 para preparación de campañas publicitarias" },
      },
    ],
  },
  {
    version: "0.33.0",
    date: "2026-03-06",
    title: "Mandatory Email Verification",
    titleTranslations: { es: "Verificación de Email Obligatoria" },
    changes: [
      {
        type: "feature",
        text: "Email verification is now required after signup — new users must verify their email before accessing the app",
        translations: { es: "La verificación de email es ahora obligatoria tras el registro — los nuevos usuarios deben verificar su email antes de acceder a la aplicación" },
      },
      {
        type: "improvement",
        text: "Redesigned verification email with professional branded template",
        translations: { es: "Rediseño del email de verificación con plantilla profesional de marca" },
      },
      {
        type: "improvement",
        text: "Verification email is now sent automatically on signup with a dedicated interstitial page",
        translations: { es: "El email de verificación se envía automáticamente al registrarse con una página de espera dedicada" },
      },
    ],
  },
  {
    version: "0.32.0",
    date: "2026-03-06",
    title: "SEO & AI Discoverability",
    titleTranslations: { es: "SEO y Descubrimiento por IA" },
    changes: [
      {
        type: "improvement",
        text: "Added sitemap, robots.txt, structured data (JSON-LD), Open Graph, and Twitter card metadata for better search engine visibility",
        translations: { es: "Añadido sitemap, robots.txt, datos estructurados (JSON-LD), Open Graph y metadatos de Twitter Card para mejor visibilidad en motores de búsqueda" },
      },
      {
        type: "feature",
        text: "Added llms.txt and llms-full.txt for AI search engine discoverability (ChatGPT, Perplexity, Google AI Overviews)",
        translations: { es: "Añadido llms.txt y llms-full.txt para descubrimiento por motores de búsqueda con IA (ChatGPT, Perplexity, Google AI Overviews)" },
      },
      {
        type: "improvement",
        text: "Security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy) added to all responses",
        translations: { es: "Cabeceras de seguridad (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy) añadidas a todas las respuestas" },
      },
    ],
  },
  {
    version: "0.31.0",
    date: "2026-03-06",
    title: "AI Portfolio Review",
    titleTranslations: { es: "Revisión de Portafolio con IA" },
    changes: [
      {
        type: "feature",
        text: "AI Portfolio Review -- get personalized feedback and recommendations for your portfolio powered by OpenAI (Pro, 5 reviews/month)",
        translations: { es: "Revisión de Portafolio con IA -- obtén análisis y recomendaciones personalizadas para tu portafolio con OpenAI (Pro, 5 revisiones/mes)" },
      },
    ],
  },
  {
    version: "0.30.0",
    date: "2026-03-06",
    title: "Google Login & Email-Based Authentication",
    titleTranslations: { es: "Inicio de sesión con Google y autenticación por email" },
    changes: [
      {
        type: "feature",
        text: "Sign in with Google -- create an account or log in instantly with your Google account",
        translations: { es: "Inicio de sesión con Google -- crea una cuenta o inicia sesión al instante con tu cuenta de Google" },
      },
      {
        type: "feature",
        text: "Email is now the primary identifier for new accounts, replacing username-based signup",
        translations: { es: "El email es ahora el identificador principal para nuevas cuentas, reemplazando el registro por nombre de usuario" },
      },
      {
        type: "improvement",
        text: "Redesigned login and signup pages with a modern, clean layout",
        translations: { es: "Páginas de inicio de sesión y registro rediseñadas con un diseño moderno y limpio" },
      },
    ],
  },
  {
    version: "0.29.0",
    date: "2026-03-06",
    title: "Support for 35 European Languages",
    titleTranslations: { es: "Soporte para 35 idiomas europeos" },
    changes: [
      {
        type: "improvement",
        text: "Portfolio CSV import is now up to 20x faster thanks to batched transaction processing",
        translations: { es: "La importación de CSV de cartera es ahora hasta 20 veces más rápida gracias al procesamiento por lotes" },
      },
      {
        type: "improvement",
        text: "Bulk import now gracefully stops at the 15-holding free-tier limit instead of failing the entire import",
        translations: { es: "La importación masiva ahora se detiene correctamente al alcanzar el límite de 15 posiciones del plan gratuito en lugar de fallar toda la importación" },
      },
      {
        type: "feature",
        text: "The app now supports 35 European languages including all 24 official EU languages plus Norwegian, Ukrainian, Turkish, Serbian, Icelandic, Albanian, Bosnian, Macedonian, Belarusian, Catalan, and Welsh",
        translations: { es: "La app ahora soporta 35 idiomas europeos incluyendo los 24 idiomas oficiales de la UE más noruego, ucraniano, turco, serbio, islandés, albanés, bosnio, macedonio, bielorruso, catalán y galés" },
      },
      {
        type: "improvement",
        text: "Language switcher redesigned as a searchable dropdown showing native language names",
        translations: { es: "Selector de idioma rediseñado como desplegable con búsqueda mostrando nombres nativos" },
      },
      {
        type: "improvement",
        text: "AI analysis responses are now generated in the user's selected language",
        translations: { es: "Las respuestas del análisis IA ahora se generan en el idioma seleccionado por el usuario" },
      },
    ],
  },
  {
    version: "0.28.1",
    date: "2026-03-06",
    title: "Portfolio Performance Accuracy Fix",
    titleTranslations: { es: "Corrección de precisión en rendimiento del portafolio" },
    changes: [
      {
        type: "fix",
        text: "TTWROR and IRR now correctly convert multi-currency transactions to EUR, fixing wildly inaccurate returns for portfolios with non-EUR holdings",
        translations: { es: "TTWROR e IRR ahora convierten correctamente las transacciones en múltiples divisas a EUR, corrigiendo rendimientos muy inexactos en portafolios con posiciones fuera del EUR" },
      },
      {
        type: "improvement",
        text: "Performance metrics now use the exchange rate from the transaction date instead of today's rate, improving accuracy for older trades",
        translations: { es: "Las métricas de rendimiento ahora usan el tipo de cambio de la fecha de la transacción en lugar del actual, mejorando la precisión para operaciones antiguas" },
      },
    ],
  },
  {
    version: "0.28.0",
    date: "2026-03-06",
    title: "Privacy Policy, Terms of Service & Routing Improvements",
    titleTranslations: { es: "Política de privacidad, términos de servicio y mejoras de navegación" },
    changes: [
      {
        type: "feature",
        text: "Privacy Policy and Terms of Service pages are now available from the landing page footer",
        translations: { es: "Las páginas de Política de privacidad y Términos de servicio están ahora disponibles desde el pie de la página principal" },
      },
      {
        type: "improvement",
        text: "Unauthenticated visitors now land on the homepage at / instead of being redirected to /landing",
        translations: { es: "Los visitantes no autenticados ahora llegan a la página principal en / en lugar de ser redirigidos a /landing" },
      },
      {
        type: "improvement",
        text: "Logging out now returns you to the homepage instead of the login page",
        translations: { es: "Al cerrar sesión ahora vuelves a la página principal en vez de a la página de inicio de sesión" },
      },
    ],
  },
  {
    version: "0.27.0",
    date: "2026-03-05",
    title: "Updated Pricing & Free-Tier Holdings Cap",
    titleTranslations: { es: "Precios actualizados y límite de posiciones en el plan Free" },
    changes: [
      {
        type: "improvement",
        text: "Pro pricing adjusted to €4.99/month (€39.99/year) — still up to 2x cheaper than alternatives",
        translations: { es: "Precios de Pro ajustados a 4,99 €/mes (39,99 €/año) — sigue siendo hasta 2x más barato que las alternativas" },
      },
      {
        type: "feature",
        text: "Free plan now includes up to 15 holdings; Pro users enjoy unlimited holdings",
        translations: { es: "El plan Free ahora incluye hasta 15 posiciones; los usuarios Pro disfrutan de posiciones ilimitadas" },
      },
    ],
  },
  {
    version: "0.26.1",
    date: "2026-03-05",
    title: "Rebrand: StockTracker is now trefolio",
    titleTranslations: { es: "Cambio de marca: StockTracker ahora es trefolio" },
    changes: [
      {
        type: "improvement",
        text: "The product has been renamed from StockTracker to trefolio — a new identity inspired by growth and good fortune",
        translations: { es: "El producto ha sido renombrado de StockTracker a trefolio — una nueva identidad inspirada en el crecimiento y la buena fortuna" },
      },
    ],
  },
  {
    version: "0.26.0",
    date: "2026-03-05",
    title: "Multi-Broker Import: IBKR, Trading 212 & Revolut",
    titleTranslations: { es: "Importación multi-broker: IBKR, Trading 212 y Revolut" },
    changes: [
      {
        type: "feature",
        text: "Import transactions from Interactive Brokers (Activity Statement & Flex Query CSV)",
        translations: { es: "Importa transacciones desde Interactive Brokers (Extracto de Actividad y Flex Query CSV)" },
      },
      {
        type: "feature",
        text: "Import transactions from Trading 212 (History CSV export with automatic fee detection)",
        translations: { es: "Importa transacciones desde Trading 212 (exportación CSV del historial con detección automática de comisiones)" },
      },
      {
        type: "feature",
        text: "Import transactions from Revolut (Account statement Excel/CSV with dividend grouping)",
        translations: { es: "Importa transacciones desde Revolut (extracto de cuenta Excel/CSV con agrupación de dividendos)" },
      },
      {
        type: "improvement",
        text: "Unified broker parser architecture with shared deduplication and ISIN resolution across all brokers",
        translations: { es: "Arquitectura unificada de parsers de brokers con deduplicación compartida y resolución de ISIN entre todos los brokers" },
      },
    ],
  },
  {
    version: "0.25.0",
    date: "2026-03-05",
    title: "Professional Landing Page Redesign",
    titleTranslations: { es: "Rediseño profesional de la página de inicio" },
    changes: [
      {
        type: "feature",
        text: "Unauthenticated visitors now see a professional marketing landing page at / instead of a bare login form",
        translations: { es: "Los visitantes no autenticados ahora ven una página de inicio profesional en / en lugar de un formulario de inicio de sesión básico" },
      },
      {
        type: "improvement",
        text: "Redesigned landing page with structured value propositions, alternating feature sections with real screenshots, testimonials, positive comparison table, and multi-column footer",
        translations: { es: "Página de inicio rediseñada con propuestas de valor estructuradas, secciones de funcionalidades alternadas con capturas reales, testimonios, tabla comparativa positiva y pie de página multicolumna" },
      },
      {
        type: "improvement",
        text: "Landing page navbar now includes section anchor links (Features, Pricing, FAQ) and a mobile hamburger menu",
        translations: { es: "La barra de navegación de la página de inicio ahora incluye enlaces ancla a secciones (Funcionalidades, Precios, FAQ) y un menú hamburguesa para móvil" },
      },
      {
        type: "improvement",
        text: "Login and signup pages now link back to the landing page via the logo",
        translations: { es: "Las páginas de inicio de sesión y registro ahora enlazan a la página de inicio a través del logo" },
      },
    ],
  },
  {
    version: "0.24.2",
    date: "2026-03-05",
    title: "Transaction & Holdings Sync Fixes",
    titleTranslations: { es: "Correcciones de sincronización de transacciones y posiciones" },
    changes: [
      {
        type: "fix",
        text: "Portfolio reset no longer has transactions re-appear after a cold start",
        translations: { es: "Restablecer el portafolio ya no hace que las transacciones reaparezcan tras un reinicio en frío" },
      },
      {
        type: "fix",
        text: "Deleting a transaction now rebuilds holdings so portfolio values update immediately",
        translations: { es: "Eliminar una transacción ahora reconstruye las posiciones para que los valores del portafolio se actualicen inmediatamente" },
      },
      {
        type: "improvement",
        text: "Stock rows now display the exchange and ticker symbol for clearer identification",
        translations: { es: "Las filas de acciones ahora muestran la bolsa y el símbolo del ticker para una identificación más clara" },
      },
    ],
  },
  {
    version: "0.24.1",
    date: "2026-03-05",
    title: "AI Hallucination Safeguards",
    titleTranslations: { es: "Protecciones contra Alucinación de IA" },
    changes: [
      {
        type: "improvement",
        text: "AI analysis prompts now include strict grounding rules — the model is instructed to only reference data provided and never fabricate facts",
        translations: { es: "Los prompts de análisis IA ahora incluyen reglas estrictas de fundamentación — el modelo solo referencia datos proporcionados y nunca inventa hechos" },
      },
      {
        type: "improvement",
        text: "Lowered AI analysis temperature from 0.7 to 0.3 for more deterministic, fact-based financial summaries",
        translations: { es: "Reducida la temperatura del análisis IA de 0.7 a 0.3 para resúmenes financieros más deterministas y basados en hechos" },
      },
      {
        type: "improvement",
        text: "AI portfolio import now validates ticker formats and date formats, filtering out hallucinated or malformed entries",
        translations: { es: "La importación IA de portafolio ahora valida formatos de ticker y fecha, filtrando entradas alucinadas o malformadas" },
      },
      {
        type: "fix",
        text: "AI import now correctly handles responses wrapped in markdown code fences",
        translations: { es: "La importación IA ahora maneja correctamente respuestas envueltas en bloques de código markdown" },
      },
      {
        type: "improvement",
        text: "AI import shows warnings when entries are filtered out due to invalid tickers or dates, and provides clear messages on empty extractions",
        translations: { es: "La importación IA muestra advertencias cuando se filtran entradas por tickers o fechas inválidas, y proporciona mensajes claros en extracciones vacías" },
      },
    ],
  },
  {
    version: "0.24.0",
    date: "2026-03-05",
    title: "Developer Architecture Page",
    titleTranslations: { es: "Página de Arquitectura para Desarrolladores" },
    changes: [
      {
        type: "feature",
        text: "Admin-only Developer page with feature domain registry, architecture overview, API route explorer, and code pattern reference",
        translations: { es: "Página de Desarrollador solo para admin con registro de dominios de funcionalidades, vista de arquitectura, explorador de rutas API y referencia de patrones de código" },
      },
    ],
  },
  {
    version: "0.23.0",
    date: "2026-03-05",
    title: "Simplified Portfolio View",
    titleTranslations: { es: "Vista de Cartera Simplificada" },
    changes: [
      {
        type: "feature",
        text: "Simplified portfolio view inspired by DeGiro — see total value, per-stock values in EUR, and daily changes at a glance",
        translations: { es: "Vista de cartera simplificada inspirada en DeGiro — consulta el valor total, valor por acción en EUR y cambios diarios de un vistazo" },
      },
      {
        type: "improvement",
        text: "Compact portfolio summary header replaces the 5-card grid for a cleaner dashboard",
        translations: { es: "Cabecera compacta del resumen del portafolio reemplaza la cuadrícula de 5 tarjetas para un panel más limpio" },
      },
      {
        type: "feature",
        text: "Auto-classify holdings by sector, region, and asset class using Yahoo Finance data on import or on demand",
        translations: { es: "Auto-clasificación de posiciones por sector, región y clase de activo usando datos de Yahoo Finance al importar o bajo demanda" },
      },
      {
        type: "improvement",
        text: "CSV broker import now runs asynchronously with job polling, fixing local dev timeouts and improving reliability",
        translations: { es: "La importación CSV de broker ahora se ejecuta de forma asíncrona con sondeo de estado, corrigiendo timeouts en desarrollo local y mejorando la fiabilidad" },
      },
    ],
  },
  {
    version: "0.22.0",
    date: "2026-03-05",
    title: "Performance Optimizations",
    titleTranslations: { es: "Optimizaciones de Rendimiento" },
    changes: [
      {
        type: "improvement",
        text: "Lazy-load charts, modals, and tool tabs — reduced initial bundle size by up to 75% on key pages",
        translations: { es: "Carga diferida de gráficos, modales y pestañas de herramientas — reducción del tamaño inicial del bundle hasta un 75% en páginas clave" },
      },
      {
        type: "improvement",
        text: "Parallel quote and exchange-rate fetching — faster portfolio data loading",
        translations: { es: "Obtención paralela de cotizaciones y tipos de cambio — carga de datos del portfolio más rápida" },
      },
      {
        type: "improvement",
        text: "Memoized context providers and list components to reduce unnecessary re-renders",
        translations: { es: "Proveedores de contexto y componentes de lista memorizados para reducir re-renderizados innecesarios" },
      },
      {
        type: "improvement",
        text: "Added Cache-Control headers to exchange-rate, search, and economic-indicator API routes",
        translations: { es: "Añadidas cabeceras Cache-Control a las rutas API de tipos de cambio, búsqueda e indicadores económicos" },
      },
    ],
  },
  {
    version: "0.21.0",
    date: "2026-03-05",
    title: "Admin Feature Flags",
    titleTranslations: { es: "Flags de Funcionalidad para Admin" },
    changes: [
      {
        type: "feature",
        text: "Admin-managed feature flags — enable or disable Price Alerts and CSV Export globally from the admin Settings panel",
        translations: { es: "Flags de funcionalidad gestionados por admin — habilita o deshabilita Alertas de Precio y Exportación CSV globalmente desde el panel de Configuración de admin" },
      },
      {
        type: "feature",
        text: "Admin-managed Resend API key — configure email delivery credentials from the admin panel instead of environment variables",
        translations: { es: "Clave API de Resend gestionada por admin — configura las credenciales de envío de email desde el panel de admin en lugar de variables de entorno" },
      },
      {
        type: "improvement",
        text: "Features hidden from UI when disabled by admin — alerts tab and CSV export buttons only appear when the admin has enabled them",
        translations: { es: "Funcionalidades ocultas en la UI cuando están deshabilitadas por admin — la pestaña de alertas y los botones de exportación CSV solo aparecen cuando el admin los ha habilitado" },
      },
    ],
  },
  {
    version: "0.20.0",
    date: "2026-03-05",
    title: "Price Alerts & CSV Export",
    titleTranslations: { es: "Alertas de Precio y Exportación CSV" },
    changes: [
      {
        type: "feature",
        text: "Price alerts — set above/below price targets for any stock. Free users get 2 alerts; Pro users get unlimited with email delivery",
        translations: { es: "Alertas de precio — establece objetivos de precio por encima/debajo para cualquier acción. Usuarios Free tienen 2 alertas; usuarios Pro tienen ilimitadas con envío por email" },
      },
      {
        type: "feature",
        text: "Email verification flow — verify your email in Profile to receive price alert notifications via Resend",
        translations: { es: "Flujo de verificación de email — verifica tu correo en Perfil para recibir notificaciones de alertas de precio vía Resend" },
      },
      {
        type: "feature",
        text: "CSV export for portfolio holdings, transactions, and cash balances (Pro feature)",
        translations: { es: "Exportación CSV de posiciones, transacciones y saldos de efectivo (función Pro)" },
      },
      {
        type: "improvement",
        text: "Automated cron job checks price alerts every 15 minutes and triggers email notifications for Pro users",
        translations: { es: "Tarea cron automatizada verifica alertas de precio cada 15 minutos y envía notificaciones por email a usuarios Pro" },
      },
    ],
  },
  {
    version: "0.19.0",
    date: "2026-03-05",
    title: "Redesigned navigation header and mobile bottom tabs",
    titleTranslations: { es: "Navegación rediseñada con cabecera y pestañas móviles inferiores" },
    changes: [
      {
        type: "feature",
        text: "New two-row header: persistent global navigation bar (Portfolio, Tools, Indicators) with contextual action bar per page",
        translations: { es: "Nueva cabecera de dos filas: barra de navegación global persistente (Portafolio, Herramientas, Indicadores) con barra de acciones contextual por página" },
      },
      {
        type: "feature",
        text: "Mobile bottom tab bar for quick access to all main sections on small screens",
        translations: { es: "Barra de pestañas inferior en móvil para acceso rápido a todas las secciones principales en pantallas pequeñas" },
      },
      {
        type: "improvement",
        text: "User dropdown menu consolidates profile, admin access, plan badge, and sign-out into a single compact control",
        translations: { es: "Menú desplegable de usuario consolida perfil, acceso admin, insignia de plan y cierre de sesión en un solo control compacto" },
      },
      {
        type: "improvement",
        text: "Shared layout across all authenticated pages eliminates duplicate provider wrappers and inconsistent per-page headers",
        translations: { es: "Layout compartido en todas las páginas autenticadas elimina proveedores duplicados y cabeceras inconsistentes por página" },
      },
    ],
  },
  {
    version: "0.18.1",
    date: "2026-03-05",
    title: "Missing price reporting and automatic ISIN resolution",
    titleTranslations: { es: "Reporte de precios faltantes y resolución automática de ISIN" },
    changes: [
      {
        type: "feature",
        text: "Report button appears on holdings with missing prices — submits a feedback report so the admin can fix the ticker mapping",
        translations: { es: "Botón de reporte aparece en posiciones sin precio — envía un reporte de feedback para que el admin corrija el mapeo del ticker" },
      },
      {
        type: "improvement",
        text: "DEGIRO import now auto-resolves unmapped ISINs via Yahoo Finance search, reducing manual ticker mapping",
        translations: { es: "La importación DEGIRO ahora resuelve ISINs no mapeados automáticamente vía búsqueda de Yahoo Finance, reduciendo el mapeo manual de tickers" },
      },
      {
        type: "fix",
        text: "Constellation Software, iShares Gold Producers, and iShares MSCI China now resolve correct prices after DEGIRO import by using proper exchange-suffixed tickers",
        translations: { es: "Constellation Software, iShares Gold Producers e iShares MSCI China ahora muestran precios correctos tras importación DEGIRO al usar tickers con sufijo de bolsa adecuado" },
      },
      {
        type: "fix",
        text: "Import modal can no longer be dismissed by clicking outside while an import is in progress, preventing partial imports",
        translations: { es: "El modal de importación ya no se puede cerrar haciendo clic fuera mientras una importación está en progreso, evitando importaciones parciales" },
      },
    ],
  },
  {
    version: "0.18.0",
    date: "2026-03-05",
    title: "Feedback system and Pro badge in header",
    titleTranslations: { es: "Sistema de feedback y distintivo Pro en el encabezado" },
    changes: [
      {
        type: "feature",
        text: "Submit feedback or report issues directly from the dashboard — admin can view and reply from the Admin panel",
        translations: { es: "Envía feedback o reporta problemas directamente desde el panel — el admin puede verlos y responder desde el panel de administración" },
      },
      {
        type: "improvement",
        text: "Pro/Free plan badge is now prominently displayed next to your username in the header",
        translations: { es: "El distintivo de plan Pro/Free ahora se muestra de forma destacada junto a tu nombre de usuario en el encabezado" },
      },
    ],
  },
  {
    version: "0.17.6",
    date: "2026-03-05",
    title: "Fix Pro plan not activating after Stripe checkout",
    titleTranslations: { es: "Corregir plan Pro no activándose tras checkout de Stripe" },
    changes: [
      {
        type: "fix",
        text: "Pro plan now activates immediately after returning from Stripe checkout instead of staying on Free due to webhook delay",
        translations: { es: "El plan Pro ahora se activa inmediatamente al volver del checkout de Stripe en lugar de quedarse en Free por retraso del webhook" },
      },
    ],
  },
  {
    version: "0.17.5",
    date: "2026-03-04",
    title: "Import cash balances from DEGIRO CSV",
    titleTranslations: { es: "Importar saldos de efectivo desde CSV de DEGIRO" },
    changes: [
      {
        type: "feature",
        text: "DEGIRO imports now automatically detect remaining cash balances per currency and add them to the Cash section, with FX conversion to EUR",
        translations: { es: "Las importaciones de DEGIRO ahora detectan automáticamente los saldos de efectivo por moneda y los añaden a la sección de Efectivo, con conversión FX a EUR" },
      },
    ],
  },
  {
    version: "0.17.4",
    date: "2026-03-04",
    title: "External Services quick links in Admin",
    titleTranslations: { es: "Enlaces rápidos a servicios externos en Admin" },
    changes: [
      {
        type: "feature",
        text: "Added External Services card in Admin Settings with quick links to Stripe, Grafana, Upstash Redis, Vercel, Turso, Alpha Vantage, and OpenAI dashboards",
        translations: { es: "Añadida tarjeta de Servicios Externos en Configuración de Admin con enlaces rápidos a los paneles de Stripe, Grafana, Upstash Redis, Vercel, Turso, Alpha Vantage y OpenAI" },
      },
    ],
  },
  {
    version: "0.17.3",
    date: "2026-03-04",
    title: "Remove deprecated generate-from-holdings button",
    titleTranslations: { es: "Eliminar botón obsoleto de generar desde posiciones" },
    changes: [
      {
        type: "improvement",
        text: "Removed the deprecated 'Generate buy transactions from holdings' button since transactions are the source of truth for holdings",
        translations: { es: "Eliminado el botón obsoleto 'Generar transacciones de compra desde posiciones' ya que las transacciones son la fuente de verdad para las posiciones" },
      },
    ],
  },
  {
    version: "0.17.2",
    date: "2026-03-04",
    title: "CSV Import Error Handling",
    titleTranslations: { es: "Manejo de errores en importación CSV" },
    changes: [
      {
        type: "fix",
        text: "Fixed CSV import showing a blank dead-end screen when parsing returned no transactions",
        translations: { es: "Corregido que la importación CSV mostraba una pantalla en blanco sin salida cuando no se encontraban transacciones" },
      },
      {
        type: "improvement",
        text: "Import preview always shows a Cancel button and specific error messages for auth, parsing, and network failures",
        translations: { es: "La vista previa de importación siempre muestra un botón Cancelar y mensajes de error específicos para fallos de autenticación, análisis y red" },
      },
    ],
  },
  {
    version: "0.17.1",
    date: "2026-03-04",
    title: "Improved CSV Import Experience",
    titleTranslations: { es: "Experiencia de importación CSV mejorada" },
    changes: [
      {
        type: "improvement",
        text: "CSV import no longer shows misleading AI references — parsing and importing labels are accurate",
        translations: { es: "La importación CSV ya no muestra referencias engañosas a IA — las etiquetas de análisis e importación son precisas" },
      },
      {
        type: "improvement",
        text: "Import progress bar shows real-time progress (X of Y) with error count during transaction import",
        translations: { es: "Barra de progreso muestra avance en tiempo real (X de Y) con conteo de errores durante la importación" },
      },
      {
        type: "fix",
        text: "Fixed database migration that could fail when ai_daily_reset_at column was missing",
        translations: { es: "Corregida migración de base de datos que podía fallar cuando faltaba la columna ai_daily_reset_at" },
      },
    ],
  },
  {
    version: "0.17.0",
    date: "2026-03-04",
    title: "Grafana Cloud Integration for Vercel",
    titleTranslations: { es: "Integración con Grafana Cloud para Vercel" },
    changes: [
      {
        type: "feature",
        text: "Push-based metrics to Grafana Cloud via OTLP HTTP, compatible with Vercel serverless functions",
        translations: { es: "Métricas push a Grafana Cloud vía OTLP HTTP, compatible con funciones serverless de Vercel" },
      },
      {
        type: "feature",
        text: "Scheduled cron job pushes DB-derived gauges (users, holdings, transactions, events) every minute",
        translations: { es: "Tarea cron programada envía métricas derivadas de la BD (usuarios, holdings, transacciones, eventos) cada minuto" },
      },
      {
        type: "improvement",
        text: "Admin panel detects Grafana Cloud vs local Grafana and links to the correct dashboard",
        translations: { es: "El panel de administración detecta Grafana Cloud vs local y enlaza al dashboard correcto" },
      },
    ],
  },
  {
    version: "0.16.0",
    date: "2026-03-04",
    title: "Per-Customer Rate Limiting & Pro Capacity Management",
    titleTranslations: { es: "Límites de Uso por Cliente y Gestión de Capacidad Pro" },
    changes: [
      {
        type: "feature",
        text: "Per-customer rate limiting for Alpha Vantage (15 req/min per user) and AI analysis (30/day for Pro)",
        translations: { es: "Límites de uso por cliente para Alpha Vantage (15 req/min por usuario) e IA (30/día para Pro)" },
      },
      {
        type: "feature",
        text: "Pro subscriber capacity cap with visible counter showing remaining spots on upgrade screens",
        translations: { es: "Límite de capacidad Pro con contador visible de plazas disponibles en pantallas de mejora" },
      },
      {
        type: "feature",
        text: "Daily AI import limit (5/day) to prevent abuse of the shared OpenAI key",
        translations: { es: "Límite diario de importaciones IA (5/día) para prevenir abuso de la clave compartida de OpenAI" },
      },
      {
        type: "improvement",
        text: "Admin panel now shows platform capacity, per-user AV and AI usage breakdowns",
        translations: { es: "El panel de administración ahora muestra capacidad de la plataforma y desglose de uso por usuario" },
      },
      {
        type: "improvement",
        text: "Checkout blocked when Pro is at capacity; capacity endpoint for frontend awareness",
        translations: { es: "Checkout bloqueado cuando Pro está lleno; endpoint de capacidad para el frontend" },
      },
      {
        type: "improvement",
        text: "Event-driven rate limiting via Upstash Redis for sub-millisecond checks on Vercel; Turso writes deferred with waitUntil()",
        translations: { es: "Limitación de uso basada en eventos vía Upstash Redis para verificaciones sub-milisegundo en Vercel; escrituras a Turso diferidas con waitUntil()" },
      },
    ],
  },
  {
    version: "0.15.0",
    date: "2026-03-04",
    title: "Prometheus Metrics & Grafana Observability",
    titleTranslations: { es: "Métricas Prometheus y Observabilidad con Grafana" },
    changes: [
      {
        type: "feature",
        text: "Added /api/metrics endpoint exposing Prometheus-format metrics for Grafana dashboards",
        translations: { es: "Nuevo endpoint /api/metrics con métricas en formato Prometheus para dashboards de Grafana" },
      },
      {
        type: "improvement",
        text: "All API routes now track request count, latency histograms, and error rates",
        translations: { es: "Todas las rutas API ahora registran conteo de peticiones, histogramas de latencia y tasas de error" },
      },
      {
        type: "improvement",
        text: "External provider calls (Yahoo Finance, Alpha Vantage) instrumented with duration and failure tracking",
        translations: { es: "Llamadas a proveedores externos (Yahoo Finance, Alpha Vantage) instrumentadas con duración y seguimiento de fallos" },
      },
      {
        type: "improvement",
        text: "Business metrics for auth events, holdings, transactions, imports, AI calls, billing, and paywall hits",
        translations: { es: "Métricas de negocio para eventos de autenticación, posiciones, transacciones, importaciones, llamadas IA, facturación y paywall" },
      },
    ],
  },
  {
    version: "0.14.0",
    date: "2026-03-04",
    title: "Portfolio Growth Periods",
    titleTranslations: { es: "Crecimiento del Portafolio por Períodos" },
    changes: [
      {
        type: "feature",
        text: "Dashboard now shows portfolio growth for YTD, 1 Month, and 1 Year periods",
        translations: { es: "El dashboard ahora muestra el crecimiento del portafolio para los períodos YTD, 1 Mes y 1 Año" },
      },
    ],
  },
  {
    version: "0.13.0",
    date: "2026-03-04",
    title: "Admin User Tier Management",
    titleTranslations: { es: "Gestión de Planes de Usuario para Administradores" },
    changes: [
      {
        type: "feature",
        text: "Admins can now change user subscription tiers (Free/Pro) from the admin panel",
        translations: { es: "Los administradores ahora pueden cambiar el plan de suscripción (Free/Pro) de los usuarios desde el panel de administración" },
      },
    ],
  },
  {
    version: "0.12.0",
    date: "2026-03-04",
    title: "Multi-Format CSV Import & Incremental Holdings",
    titleTranslations: { es: "Importación CSV Multi-Formato y Posiciones Incrementales" },
    changes: [
      {
        type: "feature",
        text: "Added simple CSV import format alongside DeGiro, with manual format selection",
        translations: { es: "Se añadió formato de importación CSV simple junto a DeGiro, con selección manual de formato" },
      },
      {
        type: "improvement",
        text: "Holdings are now incrementally updated on each transaction for faster dashboard loads",
        translations: { es: "Las posiciones ahora se actualizan incrementalmente en cada transacción para cargas más rápidas del dashboard" },
      },
      {
        type: "feature",
        text: "Added FAQ section and how-to-upload video tutorial to the landing page",
        translations: { es: "Se añadió sección de preguntas frecuentes y video tutorial de importación a la página de inicio" },
      },
      {
        type: "fix",
        text: "Fixed TTWROR calculation (now uses Modified Dietz) and IRR handling for short time spans",
        translations: { es: "Se corrigió el cálculo de TTWROR (ahora usa Dietz Modificado) y el manejo de TIR para periodos cortos" },
      },
    ],
  },
  {
    version: "0.11.0",
    date: "2026-03-03",
    title: "Subscriptions and Pro Tiering",
    titleTranslations: { es: "Suscripciones y Niveles Pro" },
    changes: [
      {
        type: "feature",
        text: "Introduced Stripe-powered subscriptions with monthly (2 EUR) and annual (20 EUR) Pro plans, including checkout, webhook sync, and self-service billing portal",
        translations: { es: "Se introdujeron suscripciones con Stripe con planes Pro mensual (2 EUR) y anual (20 EUR), incluyendo checkout, sincronización por webhook y portal de facturación autoservicio" },
      },
      {
        type: "feature",
        text: "Added Free vs Pro entitlement gating with graceful upgrade prompts for fundamentals, intelligence, and economic indicators",
        translations: { es: "Se añadió control de acceso por nivel Free vs Pro con prompts de actualización para fundamentales, inteligencia e indicadores económicos" },
      },
      {
        type: "improvement",
        text: "Implemented Free-tier AI usage limits (5 calls/month) with server-side tracking and Pro unlimited access",
        translations: { es: "Se implementaron límites de uso de IA en el plan Free (5 llamadas/mes) con seguimiento en servidor y acceso ilimitado en Pro" },
      },
      {
        type: "improvement",
        text: "Added contextual Free vs Pro comparison cards across AI limit and locked premium screens, plus always-visible upgrade guidance in Profile and Settings",
        translations: { es: "Se añadieron tarjetas contextuales de comparación Free vs Pro en límites de IA y pantallas premium bloqueadas, además de guía de mejora siempre visible en Perfil y Configuración" },
      },
      {
        type: "improvement",
        text: "Portfolio Growth Projection is now visible but blurred for Free users with a direct Pro upgrade prompt, and can be minimized from the dashboard",
        translations: { es: "La Proyección de Crecimiento del Portafolio ahora es visible pero difuminada para usuarios Free con acceso directo a mejora a Pro, y puede minimizarse desde el dashboard" },
      },
      {
        type: "fix",
        text: "DEGIRO CSV import now uses the broker parser in Import Portfolio, and dashboard holdings are derived from transaction history for consistent portfolio totals",
        translations: { es: "La importación CSV de DEGIRO ahora usa el parser del bróker en Importar Portafolio, y las posiciones del dashboard se derivan del historial de transacciones para mantener totales consistentes" },
      },
      {
        type: "fix",
        text: "DEGIRO import now preserves each transaction fee currency and attaches fees by exact order timestamp, preventing duplicated or mis-currency costs in imported transactions",
        translations: { es: "La importación de DEGIRO ahora conserva la moneda de cada comisión y asigna comisiones por marca de tiempo exacta de la orden, evitando costes duplicados o en moneda incorrecta en transacciones importadas" },
      },
      {
        type: "improvement",
        text: "Portfolio Performance now includes clear in-app methodology notes explaining TTWROR and IRR calculations",
        translations: { es: "Rendimiento del Portafolio ahora incluye notas metodológicas en la app que explican los cálculos de TTWROR y TIR" },
      },
      {
        type: "feature",
        text: "Public landing page with feature showcase, pricing comparison, competitor table, and investor metrics — accessible at /landing",
        translations: { es: "Página de inicio pública con vitrina de funcionalidades, comparación de precios, tabla de competidores y métricas para inversores — accesible en /landing" },
      },
    ],
  },
  {
    version: "0.10.1",
    date: "2026-03-03",
    title: "Pre-Deploy Test Suite",
    titleTranslations: { es: "Suite de Pruebas Pre-Despliegue" },
    changes: [
      {
        type: "feature",
        text: "Comprehensive pre-deploy test suite: 24 unit tests (Vitest) and 26 E2E tests (Playwright) covering auth, portfolio CRUD, broker import, and admin panel — runs before every Vercel deploy",
        translations: { es: "Suite de pruebas pre-despliegue completa: 24 pruebas unitarias (Vitest) y 26 pruebas E2E (Playwright) cubriendo autenticación, CRUD de portafolio, importación de bróker y panel de admin — se ejecuta antes de cada despliegue a Vercel" },
      },
      {
        type: "improvement",
        text: "Added npm run pre-deploy script that chains TypeScript type-check, ESLint, unit tests, production build, and E2E tests",
        translations: { es: "Nuevo script npm run pre-deploy que encadena verificación de tipos TypeScript, ESLint, pruebas unitarias, compilación de producción y pruebas E2E" },
      },
    ],
  },
  {
    version: "0.10.0",
    date: "2026-03-03",
    title: "DEGIRO CSV Import for All Users",
    titleTranslations: { es: "Importación CSV de DEGIRO para Todos los Usuarios" },
    changes: [
      {
        type: "feature",
        text: "All users can now import their DEGIRO Account CSV to automatically populate transactions, dividends, and fees with full server-side parsing",
        translations: { es: "Todos los usuarios pueden importar su CSV de Cuenta DEGIRO para poblar automáticamente transacciones, dividendos y comisiones con análisis completo en el servidor" },
      },
      {
        type: "improvement",
        text: "Redesigned broker import UI with card-based broker selection, import summary stats, and progress feedback",
        translations: { es: "Interfaz de importación de bróker rediseñada con selección de bróker por tarjetas, resumen de estadísticas y retroalimentación de progreso" },
      },
    ],
  },
  {
    version: "0.9.9",
    date: "2026-03-03",
    title: "Portfolio Growth Projection",
    titleTranslations: { es: "Proyección de Crecimiento del Portafolio" },
    changes: [
      {
        type: "feature",
        text: "New portfolio growth projection on the Dashboard — estimate future portfolio value with customizable annual growth rate, dividend reinvestment toggle, and yearly contributions, visualized with an interactive chart",
        translations: { es: "Nueva proyección de crecimiento del portafolio en el Dashboard — estima el valor futuro del portafolio con tasa de crecimiento anual personalizable, opción de reinvertir dividendos y aportaciones anuales, visualizado con un gráfico interactivo" },
      },
    ],
  },
  {
    version: "0.9.8",
    date: "2026-03-03",
    title: "DEGIRO Transaction Import",
    titleTranslations: { es: "Importación de Transacciones DEGIRO" },
    changes: [
      {
        type: "feature",
        text: "Full DEGIRO Account CSV import — buys, sells, dividends (with withholding taxes), and broker fees are automatically parsed and seeded",
        translations: { es: "Importación completa del CSV de cuenta DEGIRO — compras, ventas, dividendos (con retenciones), y comisiones se parsean y cargan automáticamente" },
      },
      {
        type: "improvement",
        text: "Dividend section now populated with real dividend history from DEGIRO, including tax withholdings and monthly calendar",
        translations: { es: "La sección de dividendos ahora muestra el historial real de dividendos de DEGIRO, incluyendo retenciones fiscales y calendario mensual" },
      },
      {
        type: "improvement",
        text: "Transaction history shows all buy/sell/dividend/fee activity parsed from the DEGIRO CSV",
        translations: { es: "El historial de transacciones muestra toda la actividad de compra/venta/dividendo/comisión parseada del CSV de DEGIRO" },
      },
    ],
  },
  {
    version: "0.9.7",
    date: "2026-03-03",
    title: "Generate Transactions from Holdings",
    titleTranslations: { es: "Generar Transacciones desde Posiciones" },
    changes: [
      {
        type: "feature",
        text: "One-click generation of buy transactions from existing holdings when the transaction history is empty",
        translations: { es: "Generación con un clic de transacciones de compra desde posiciones existentes cuando el historial de transacciones está vacío" },
      },
    ],
  },
  {
    version: "0.9.6",
    date: "2026-03-03",
    title: "Estimated Dividend Income",
    titleTranslations: { es: "Ingresos por Dividendos Estimados" },
    changes: [
      {
        type: "feature",
        text: "Dividends section now shows estimated annual income based on your holdings' dividend yields, even without recorded transactions",
        translations: { es: "La sección de dividendos ahora muestra ingresos anuales estimados basados en el rendimiento por dividendo de tus posiciones, incluso sin transacciones registradas" },
      },
      {
        type: "improvement",
        text: "Per-stock dividend breakdown with yield percentages and projected 5-year growth",
        translations: { es: "Desglose de dividendos por acción con porcentajes de rendimiento y proyección de crecimiento a 5 años" },
      },
    ],
  },
  {
    version: "0.9.5",
    date: "2026-03-03",
    title: "Delete Account",
    titleTranslations: { es: "Eliminar Cuenta" },
    changes: [
      {
        type: "feature",
        text: "Users can now delete their own account from the Profile page with password confirmation",
        translations: { es: "Los usuarios ahora pueden eliminar su propia cuenta desde la página de Perfil con confirmación de contraseña" },
      },
    ],
  },
  {
    version: "0.9.4",
    date: "2026-03-03",
    title: "Admin-Managed OpenAI Key",
    titleTranslations: { es: "Clave OpenAI Gestionada por Admin" },
    changes: [
      {
        type: "feature",
        text: "OpenAI API key is now stored encrypted and managed by the admin in the Settings tab, just like Alpha Vantage",
        translations: { es: "La clave API de OpenAI ahora se almacena cifrada y la gestiona el administrador en la pestaña de Configuración, igual que Alpha Vantage" },
      },
      {
        type: "improvement",
        text: "Removed dependency on STOCKTRACKER_OPENAI_API_KEY environment variable — key is configured through the Admin panel",
        translations: { es: "Eliminada la dependencia de la variable de entorno STOCKTRACKER_OPENAI_API_KEY — la clave se configura desde el panel de Admin" },
      },
    ],
  },
  {
    version: "0.9.3",
    date: "2026-03-03",
    title: "Smart Import & Dividend Projections",
    titleTranslations: { es: "Importación Inteligente y Proyecciones de Dividendos" },
    changes: [
      {
        type: "feature",
        text: "AI import now extracts transactions (dividends, buys, sells, fees) alongside holdings from CSV and images",
        translations: { es: "La importación con IA ahora extrae transacciones (dividendos, compras, ventas, comisiones) además de posiciones desde CSV e imágenes" },
      },
      {
        type: "feature",
        text: "Dividend section shows yearly income history and 5-year projections with 10% annual growth",
        translations: { es: "La sección de dividendos muestra historial anual y proyecciones a 5 años con crecimiento del 10% anual" },
      },
    ],
  },
  {
    version: "0.9.2",
    date: "2026-03-03",
    title: "Centralized API Key Management",
    titleTranslations: { es: "Gestión Centralizada de Clave API" },
    changes: [
      {
        type: "feature",
        text: "Alpha Vantage API key is now managed globally by the admin and shared with all users (encrypted at rest)",
        translations: { es: "La clave API de Alpha Vantage ahora la gestiona el administrador de forma global y se comparte con todos los usuarios (cifrada en reposo)" },
      },
      {
        type: "improvement",
        text: "Added Settings tab in admin panel with API key configuration",
        translations: { es: "Nueva pestaña de Configuración en el panel de administración con gestión de clave API" },
      },
      {
        type: "improvement",
        text: "API key removed from user-facing settings — server resolves it automatically",
        translations: { es: "Clave API eliminada de la configuración del usuario — el servidor la resuelve automáticamente" },
      },
    ],
  },
  {
    version: "0.9.1",
    date: "2026-03-03",
    title: "Analytics & Performance Insights",
    titleTranslations: { es: "Analíticas y Métricas de Rendimiento" },
    changes: [
      {
        type: "improvement",
        text: "Updated seed portfolio data from DEGIRO account CSV with latest holdings and cash balances",
        translations: { es: "Datos de cartera semilla actualizados desde CSV de cuenta DEGIRO con posiciones y saldos de efectivo al día" },
      },
      {
        type: "feature",
        text: "Vercel Analytics and Speed Insights for privacy-friendly page-view and Core Web Vitals tracking",
        translations: { es: "Vercel Analytics y Speed Insights para seguimiento de visitas y métricas web sin cookies" },
      },
      {
        type: "feature",
        text: "Internal event tracking for feature usage (stock views, AI analysis, imports, logins)",
        translations: { es: "Seguimiento interno de uso de funciones (vistas de acciones, análisis IA, importaciones, inicios de sesión)" },
      },
      {
        type: "feature",
        text: "Admin analytics dashboard with usage charts, top stocks, and signup trends",
        translations: { es: "Panel de analíticas para administradores con gráficos de uso, acciones populares y tendencias de registro" },
      },
    ],
  },
  {
    version: "0.9.0",
    date: "2026-03-03",
    title: "AI Portfolio Import & Economic Dashboard",
    titleTranslations: { es: "Importación IA de Portafolio y Panel Económico" },
    changes: [
      {
        type: "feature",
        text: "Import portfolios from screenshots or CSV files using AI extraction",
        translations: { es: "Importar portafolios desde capturas de pantalla o archivos CSV con extracción IA" },
      },
      {
        type: "feature",
        text: "US economic indicators dashboard (GDP, CPI, unemployment, and more)",
        translations: { es: "Panel de indicadores económicos de EE.UU. (PIB, IPC, desempleo y más)" },
      },
      {
        type: "feature",
        text: "AI-powered analysis for stocks, intelligence data, and economic indicators",
        translations: { es: "Análisis potenciado por IA para acciones, datos de inteligencia e indicadores económicos" },
      },
      {
        type: "improvement",
        text: "Portfolio benchmark comparison with S&P 500, Nasdaq, Dow Jones, and Euro Stoxx 50",
        translations: { es: "Comparación del portafolio con S&P 500, Nasdaq, Dow Jones y Euro Stoxx 50" },
      },
      {
        type: "feature",
        text: "Configurable auto-refresh for stock quotes (every 15 min, 30 min, or 1 hour)",
        translations: { es: "Actualización automática configurable de cotizaciones (cada 15 min, 30 min o 1 hora)" },
      },
    ],
  },
  {
    version: "0.8.0",
    date: "2026-02-15",
    title: "Alpha Intelligence & Insider Data",
    titleTranslations: { es: "Alpha Intelligence y Datos de Insiders" },
    changes: [
      {
        type: "feature",
        text: "Market news sentiment analysis with bullish/bearish indicators",
        translations: { es: "Análisis de sentimiento de noticias de mercado con indicadores alcistas/bajistas" },
      },
      {
        type: "feature",
        text: "Insider transactions tracking for individual stocks",
        translations: { es: "Seguimiento de transacciones de insiders para acciones individuales" },
      },
      {
        type: "feature",
        text: "Institutional holdings breakdown by top investors",
        translations: { es: "Desglose de tenencias institucionales por principales inversores" },
      },
      {
        type: "feature",
        text: "Earnings call transcript viewer",
        translations: { es: "Visor de transcripciones de llamadas de resultados" },
      },
    ],
  },
  {
    version: "0.7.0",
    date: "2026-01-28",
    title: "Stock Detail Pages & Fundamentals",
    titleTranslations: { es: "Páginas de Detalle de Acciones y Fundamentales" },
    changes: [
      {
        type: "feature",
        text: "Dedicated stock detail pages with interactive price charts",
        translations: { es: "Páginas de detalle de acciones con gráficos de precios interactivos" },
      },
      {
        type: "feature",
        text: "Financial statements: income, balance sheet, cash flow, and earnings",
        translations: { es: "Estados financieros: resultados, balance general, flujo de caja y ganancias" },
      },
      {
        type: "improvement",
        text: "Alpha Vantage integration for extended fundamental data",
        translations: { es: "Integración con Alpha Vantage para datos fundamentales extendidos" },
      },
      {
        type: "fix",
        text: "Market open/closed status detection for different time zones",
        translations: { es: "Detección de estado abierto/cerrado del mercado para diferentes zonas horarias" },
      },
    ],
  },
  {
    version: "0.6.0",
    date: "2026-01-10",
    title: "Multi-User Support & Profiles",
    titleTranslations: { es: "Soporte Multi-Usuario y Perfiles" },
    changes: [
      {
        type: "feature",
        text: "User authentication with secure session management",
        translations: { es: "Autenticación de usuarios con gestión segura de sesiones" },
      },
      {
        type: "feature",
        text: "User profiles with avatar and display name",
        translations: { es: "Perfiles de usuario con avatar y nombre visible" },
      },
      {
        type: "feature",
        text: "Admin panel for user management",
        translations: { es: "Panel de administración para gestión de usuarios" },
      },
      {
        type: "improvement",
        text: "Dark mode support across all pages",
        translations: { es: "Soporte de modo oscuro en todas las páginas" },
      },
    ],
  },
  {
    version: "0.5.0",
    date: "2025-12-20",
    title: "Portfolio Dashboard & Cash Tracking",
    titleTranslations: { es: "Panel de Portafolio y Seguimiento de Efectivo" },
    changes: [
      {
        type: "feature",
        text: "Portfolio dashboard with real-time stock quotes",
        translations: { es: "Panel de portafolio con cotizaciones de acciones en tiempo real" },
      },
      {
        type: "feature",
        text: "Cash balance tracking with multiple entries",
        translations: { es: "Seguimiento de saldos de efectivo con múltiples entradas" },
      },
      {
        type: "feature",
        text: "Multi-language support (English & Spanish)",
        translations: { es: "Soporte multi-idioma (inglés y español)" },
      },
      {
        type: "improvement",
        text: "Responsive design for mobile and tablet",
        translations: { es: "Diseño responsivo para móvil y tablet" },
      },
    ],
  },
];
