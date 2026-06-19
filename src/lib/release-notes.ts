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
    version: "2.5.33",
    date: "2026-05-28",
    title: "Investor Briefing polish",
    titleTranslations: {
      es: "Pulido del Briefing de inversor",
    },
    changes: [
      {
        type: "improvement",
        text: "MCP landing screenshots for IdP Developer tokens (steps 1–2) and Cursor mcp.json setup (step 4).",
        translations: {
          es: "Capturas en la landing MCP para Developer tokens del IdP (pasos 1–2) y configuración mcp.json en Cursor (paso 4).",
        },
      },
      {
        type: "improvement",
        text: "MCP landing screenshots: Claude extended thinking with trefolio connector in Context panel (steps 3 & 5 + hero).",
        translations: {
          es: "Capturas en la landing MCP: Claude extended thinking con conector trefolio en el panel Context (pasos 3 y 5 + hero).",
        },
      },
      {
        type: "feature",
        text: "MCP setup landing at /landing/mcp with step-by-step token and Claude Code guide; more visible MCP promo on the public home page.",
        translations: {
          es: "Landing de configuración MCP en /landing/mcp con guía paso a paso para token y Claude Code; promo MCP más visible en la home pública.",
        },
      },
      {
        type: "improvement",
        text: "Claude Connectors docs: troubleshooting for OAuth 401, user_not_linked, MOAT quotas, and PAT vs OAuth; MCP endpoint CORS for browser OAuth preflight from claude.ai.",
        translations: {
          es: "Docs Claude Connectors: resolución de problemas para OAuth 401, user_not_linked, cuotas MOAT y PAT vs OAuth; CORS en el endpoint MCP para preflight OAuth desde claude.ai.",
        },
      },
      {
        type: "improvement",
        text: "Published trefolio MCP skill for Claude Skills Directory at skills/trefolio-mcp (portfolio + Warren MOAT tool workflows).",
        translations: {
          es: "Skill MCP de trefolio publicado para el Directorio de Skills de Claude en skills/trefolio-mcp (flujos de cartera y herramientas Warren MOAT).",
        },
      },
      {
        type: "improvement",
        text: "While Subscriptions & commerce is off, new Warren accounts receive 30 days of Trefolio Pro on signup and auto-renew for another 30 days on expiry until commerce is enabled again.",
        translations: {
          es: "Con Suscripciones y comercio desactivado, las cuentas nuevas en Warren reciben 30 días de Trefolio Pro al registrarse y se renuevan automáticamente otros 30 días al expirar hasta que se reactive el comercio.",
        },
      },
      {
        type: "improvement",
        text: "Admin feature flag commerce_enabled hides subscription pricing, upsell cards, and checkout on trefolio (default off). Enable Subscriptions & commerce in Feature Flags to resume sales.",
        translations: {
          es: "El flag commerce_enabled en Admin oculta precios, upsell y checkout en trefolio (desactivado por defecto). Activa Suscripciones y comercio en Feature Flags para reanudar ventas.",
        },
      },
      {
        type: "feature",
        text: "Admin FinPulse handles: manage curated X accounts for Market voices in Settings (aid_finpulse_handles platform setting).",
        translations: {
          es: "Admin handles FinPulse: gestiona cuentas X curadas para Voces del mercado en Ajustes (platform setting aid_finpulse_handles).",
        },
      },
      {
        type: "feature",
        text: "Unified portfolio impact score (1–5) across news, FinPulse, and earnings — priority strip, sorted feeds, and GET /api/aid/feed.",
        translations: {
          es: "Impacto unificado en cartera (1–5) en noticias, FinPulse y resultados — tira prioritaria, feeds ordenados y GET /api/aid/feed.",
        },
      },
      {
        type: "improvement",
        text: "Investor Briefing telemetry: aid_return_within_24h, aid_section_viewed, aid_feed_loaded, aid_priority_item_clicked; success thresholds documented.",
        translations: {
          es: "Telemetría del Briefing de inversor: aid_return_within_24h, aid_section_viewed, aid_feed_loaded, aid_priority_item_clicked; umbrales documentados.",
        },
      },
      {
        type: "fix",
        text: "Investor Briefing catch-up: last-visit now marks reliably after viewing, refreshes the new-count badge, and clarifies that the priority strip shows top 5 of all new items.",
        translations: {
          es: "Ponerse al día en Briefing de inversor: la última visita se guarda bien al ver la página, se actualiza el contador de novedades y se aclara que la tira prioritaria muestra el top 5 de todas las novedades.",
        },
      },
      {
        type: "improvement",
        text: "Investor Briefing layout: customize main column and sidebar section order with drag handles; preference saved in the database via GET/PUT /api/aid/layout.",
        translations: {
          es: "Layout del Briefing de inversor: personaliza el orden de secciones en columna principal y barra lateral con asas de arrastre; preferencia guardada en base de datos vía GET/PUT /api/aid/layout.",
        },
      },
      {
        type: "improvement",
        text: "FinPulse shows which X accounts trefolio follows under Market voices (from the curated handle list).",
        translations: {
          es: "FinPulse muestra qué cuentas de X sigue trefolio bajo Voces del mercado (lista curada de handles).",
        },
      },
      {
        type: "fix",
        text: "Investor Briefing market status uses portfolio exchange hours (EU/US) instead of a broken UTC-only clock; news feed shows up to 40 items with new-since-visit first.",
        translations: {
          es: "Estado de mercado del Briefing usa horarios de las bolsas de tu cartera; el feed de noticias muestra hasta 40 ítems priorizando novedades desde la última visita.",
        },
      },
    ],
  },
  {
    version: "2.5.32",
    date: "2026-05-28",
    title: "AID addictiveness",
    titleTranslations: {
      es: "AID más adictivo",
    },
    changes: [
      {
        type: "improvement",
        text: "Investor Briefing: the /aid beta is now labeled Investor Briefing in the UI (replacing the AID acronym) with a clearer subtitle about portfolio, news, and market voices.",
        translations: {
          es: "Briefing de inversor: la beta /aid se muestra como Briefing de inversor (en lugar del acrónimo AID) con un subtítulo más claro sobre cartera, noticias y voces del mercado.",
        },
      },
      {
        type: "feature",
        text: "AID FinPulse: dual-tab feed (For you + Market voices) with AI summaries of influential X posts, Tavily ingestion cron, and portfolio relevance badges.",
        translations: {
          es: "FinPulse AID: feed con pestañas Para ti y Voces del mercado, resúmenes IA de posts de X, cron Tavily y badges de relevancia para tu cartera.",
        },
      },
      {
        type: "feature",
        text: "AID briefing strip: since-your-last-visit counts, AI morning brief, catch-up CTA, and unread badge on the home AID entry.",
        translations: {
          es: "Tira de briefing AID: novedades desde la última visita, resumen matinal IA, CTA ponerse al día y badge en la entrada AID del home.",
        },
      },
      {
        type: "improvement",
        text: "AID layout reorder: FinPulse and news first, proactive Warren nudge (once per day), extras row sorted by urgency.",
        translations: {
          es: "Reorden AID: FinPulse y noticias primero, aviso proactivo de Warren (1/día), extras ordenados por urgencia.",
        },
      },
    ],
  },
  {
    version: "2.5.31",
    date: "2026-05-27",
    title: "Financial statements data",
    titleTranslations: {
      es: "Datos de estados financieros",
    },
    changes: [
      {
        type: "feature",
        text: "AID earnings recap: web search + AI summaries for your holdings that reported in the last 21 days, cached for 90 days on aid_news_cache.",
        translations: {
          es: "Resumen de resultados AID: búsqueda web + IA para posiciones que reportaron en 21 días, caché 90 días.",
        },
      },
      {
        type: "improvement",
        text: "AID Warren chat stays pinned on desktop while you scroll the dashboard (sticky column with taller viewport height).",
        translations: {
          es: "El chat Warren en AID permanece fijo en escritorio al hacer scroll (columna sticky con más altura).",
        },
      },
      {
        type: "feature",
        text: "AID holdings lookup: search your portfolio positions from the dashboard and jump to stock detail or intelligence pages.",
        translations: {
          es: "Buscador AID: busca posiciones de tu cartera en el panel y abre la ficha o intelligence de cada valor.",
        },
      },
      {
        type: "fix",
        text: "AID news section: clearer empty states per filter, more tickers supported (e.g. NOVO-B), earnings calendar rows without waiting for AI cache, and Movement filter uses ±3% day change.",
        translations: {
          es: "Noticias AID: vacíos más claros por filtro, más tickers (p. ej. NOVO-B), filas de resultados sin esperar caché IA, y filtro Movimiento usa ±3 % del día.",
        },
      },
      {
        type: "fix",
        text: "AID digest: migration v116 creates aid_news_cache (fixes prod missing table after duplicate v114); Yahoo quote fetch handles symbols with no market data without crashing.",
        translations: {
          es: "Digest AID: migración v116 crea aid_news_cache (corrige tabla ausente en prod tras v114 duplicada); cotizaciones Yahoo sin datos ya no provocan error.",
        },
      },
      {
        type: "improvement",
        text: "AID launch readiness: Privacy Policy entries for Tavily, Clara, and Will; WCAG-focused focus rings and main landmark; Will recent-tags API in notetaker; CI Playwright job for AID; compliance checklist at knowledge/compliance/aid-beta-compliance.md.",
        translations: {
          es: "Preparación lanzamiento AID: entradas en Política de Privacidad para Tavily, Clara y Will; anillos de foco y landmark main; API recent-tags en Will; job Playwright en CI; checklist en knowledge/compliance/aid-beta-compliance.md.",
        },
      },
      {
        type: "improvement",
        text: "AID mockup parity: extras row with movers, vs-target drift, 7-day events, active alerts, monthly dividends, and top-3 concentration; dividends modal yield by asset type; Will tag cloud via insights API; Clara broker cash note; full analytics events; Playwright E2E; and accessibility tweaks on modals.",
        translations: {
          es: "Paridad mockup AID: fila extras con movers, desviación vs objetivo, eventos 7 días, alertas, dividendos mensuales y concentración top-3; rendimiento por tipo en modal dividendos; tags Will vía insights; nota de cash en broker Clara; eventos analytics; E2E Playwright; y mejoras a11y en modales.",
        },
      },
      {
        type: "improvement",
        text: "AID polish: Will and Clara insight cards fetch real data via GET /api/aid/insights, mobile Warren opens as a collapsible sheet, page-level AI and financial disclaimers, per-user beta rollout script, and API tests for digest, refresh, insights, and cron auth.",
        translations: {
          es: "Pulido AID: tarjetas Will y Clara con datos reales vía GET /api/aid/insights, Warren móvil en sheet colapsable, disclaimers de IA y datos financieros, script de beta por usuario, y tests de APIs digest, refresh, insights y cron.",
        },
      },
      {
        type: "improvement",
        text: "AID portfolio extras: week/month performance on the pulse card, allocation vs rebalance targets with top holdings per type, top movers and concentration tiles, per-ticker news refresh, and a cron job that pre-warms digest cache every 6 hours for aid_beta users.",
        translations: {
          es: "Extras AID: rendimiento semana/mes en la tarjeta de pulso, asignación vs objetivos de rebalanceo con top holdings por tipo, tiles de top movers y concentración, actualización de noticias por ticker, y cron que precalienta la caché del digest cada 6 h para usuarios aid_beta.",
        },
      },
      {
        type: "feature",
        text: "AID news digest: scannable bullet summaries for your tickers (48h), cached per user with optional Tavily web search for earnings days, filters for All / Earnings / Movement, and GET /api/aid/digest plus POST /api/aid/refresh.",
        translations: {
          es: "Digest de noticias AID: resúmenes en viñetas para tus tickers (48 h), caché por usuario con búsqueda web Tavily opcional en días de resultados, filtros Todo/Resultados/Movimiento, y APIs GET /api/aid/digest y POST /api/aid/refresh.",
        },
      },
      {
        type: "feature",
        text: "AID (Advanced Investor Dashboard) beta: enable the aid_beta feature flag to show a Beta · AID entry on the home dashboard and open /aid — portfolio pulse by asset type, allocation and dividend quick views, compact news, saved moats/strategies, and an embedded Warren panel with Will and Clara insight cards.",
        translations: {
          es: "Beta AID (Advanced Investor Dashboard): activa el flag aid_beta para ver la entrada Beta · AID en el home y abrir /aid — pulso de cartera por tipo de activo, vistas rápidas de asignación y dividendos, noticias compactas, moats/estrategias guardados y Warren integrado con tarjetas Will y Clara.",
        },
      },
      {
        type: "improvement",
        text: "When portfolio history is incomplete (missing cost basis or asset breakdown), the dashboard now rebuilds it automatically in the background instead of showing a Recalculate banner.",
        translations: {
          es: "Cuando el historial del portafolio está incompleto (falta cost basis o desglose por activo), el dashboard ahora lo reconstruye automáticamente en segundo plano en lugar de mostrar un banner de Recalcular.",
        },
      },
      {
        type: "feature",
        text: "The portfolio hero now shows a performance matrix by asset class (Today, 1W, 1M, YTD, 1Y, and longer horizons on Pro) instead of the inline chart. Open the full interactive chart from View chart on the dashboard or on /portfolio.",
        translations: {
          es: "El hero del portfolio muestra ahora una matriz de rendimiento por clase de activo (Hoy, 1S, 1M, YTD, 1A y horizontes largos en Pro) en lugar del gráfico inline. Abre el gráfico interactivo completo con Ver gráfico en el dashboard o en /portfolio.",
        },
      },
      {
        type: "improvement",
        text: "The performance matrix includes an info popup that explains how Today, All Assets, and longer periods are calculated, in your language.",
        translations: {
          es: "La matriz de rendimiento incluye un popup informativo que explica cómo se calculan Hoy, Todos los activos y los periodos largos, en tu idioma.",
        },
      },
      {
        type: "fix",
        text: "The invested-assets headline day change now uses the same market-aware formula as the performance matrix and asset pills, so it no longer disagrees after European markets close.",
        translations: {
          es: "El cambio diario del titular de activos invertidos usa ahora la misma fórmula que la matriz de rendimiento y las pastillas por tipo, y ya no contradice el resto tras el cierre de Europa.",
        },
      },
      {
        type: "fix",
        text: "Holdings imported with the exchange code as the ticker (e.g. TDG.DE on Tradegate) now load price history and live quotes via ISIN when available.",
        translations: {
          es: "Las posiciones importadas con el código de mercado como ticker (p. ej. TDG.DE en Tradegate) cargan ahora historial y cotización en vivo mediante el ISIN cuando está disponible.",
        },
      },
      {
        type: "fix",
        text: "Portfolio day change for All Assets now uses the same calculation as each asset class in the performance matrix and breakdown pills, so totals no longer show 0% while individual classes move.",
        translations: {
          es: "El cambio diario de Todos los activos usa ahora el mismo cálculo que cada clase en la matriz de rendimiento y las pastillas del desglose, para que el total ya no muestre 0% cuando las clases individuales sí se mueven.",
        },
      },
      {
        type: "improvement",
        text: "Stock financial statements (income, balance sheet, cash flow, earnings) now load from FMP with a permanent cache, so repeat visits are faster and line items are more complete than Yahoo-only data.",
        translations: {
          es: "Los estados financieros (resultados, balance, flujo de caja y ganancias) ahora se cargan desde FMP con caché permanente: las visitas repetidas son más rápidas y las partidas más completas que con solo Yahoo.",
        },
      },
      {
        type: "improvement",
        text: "Moat evaluation and sync now use FMP only for fundamental data (Alpha Vantage removed from that path).",
        translations: {
          es: "La evaluación Moat y su sincronización usan solo FMP para datos fundamentales (Alpha Vantage eliminado de ese flujo).",
        },
      },
    ],
  },
  {
    version: "2.5.30",
    date: "2026-05-23",
    title: "Agent Office",
    titleTranslations: {
      es: "Oficina de agentes",
    },
    changes: [
      {
        type: "improvement",
        text: "The default dashboard now leans into a sharper finance-first visual direction with denser chrome, cleaner search and action controls, more disciplined chart surfaces, and calmer right-rail widgets, while preserving the distinct Canvas, Terminal, and Studio themes.",
        translations: {
          es: "El dashboard por defecto ahora adopta una dirección visual más financiera y precisa, con chrome más denso, búsqueda y acciones más limpias, superficies de gráficos más disciplinadas y widgets laterales más sobrios, manteniendo los temas Canvas, Terminal y Studio con su identidad propia.",
        },
      },
      {
        type: "improvement",
        text: "The app now uses a new glass-inspired visual system across the default shell, navigation, dashboard hero cards, and mobile chrome, while keeping Canvas, Terminal, and Studio themes compatible.",
        translations: {
          es: "La app ahora usa un nuevo sistema visual inspirado en vidrio en el shell por defecto, la navegación, las tarjetas hero del dashboard y el chrome móvil, manteniendo compatibles los temas Canvas, Terminal y Studio.",
        },
      },
      {
        type: "improvement",
        text: "Portfolio News on the dashboard home now uses a dense wire-style headline list (time, source, tickers) instead of stacked cards; the full News tab still shows richer article cards with summaries.",
        translations: {
          es: "Portfolio News en la home del dashboard ahora usa un listado denso estilo wire (hora, fuente, tickers) en lugar de tarjetas apiladas; la pestaña completa de noticias sigue mostrando tarjetas más ricas con resumen.",
        },
      },
      {
        type: "fix",
        text: "When a signed-in browser tab keeps running after the session expires, authenticated client requests now redirect back to /login with the current page preserved instead of quietly piling up repeated 401 errors.",
        translations: {
          es: "Cuando una pestaña autenticada sigue abierta después de expirar la sesión, las peticiones cliente autenticadas ahora redirigen a /login conservando la página actual en lugar de acumular silenciosamente errores 401 repetidos.",
        },
      },
      {
        type: "fix",
        text: "The public demo no longer bounces unauthenticated visitors to login: demo mode now skips session bootstrap calls and hides header widgets that require private notification/account APIs.",
        translations: {
          es: "La demo pública ya no rebota a los visitantes sin sesión hacia el login: el modo demo ahora evita las llamadas iniciales de sesión y oculta los widgets del header que dependen de APIs privadas de cuenta y notificaciones.",
        },
      },
      {
        type: "improvement",
        text: "Portfolio news now uses a cleaner editorial layout in both dashboard previews and the full news tab, with clearer bylines, calmer metadata, and the same topic/ticker coverage preserved.",
        translations: {
          es: "Las noticias de la cartera ahora usan una composición más editorial y limpia tanto en los previews del dashboard como en la pestaña completa de noticias, con bylines más claros, metadatos más sobrios y la misma cobertura de temas y tickers intacta.",
        },
      },
      {
        type: "feature",
        text: "Admin settings can now route operational Telegram alerts through an external ProdOps service: trefolio queues signup, membership, feedback, broker-request, and trial-activation events in an outbox and dispatches them asynchronously to staff channels.",
        translations: {
          es: "Ajustes de admin ya puede enviar alertas operativas por Telegram mediante un servicio externo ProdOps: trefolio encola eventos de registro, membresía, feedback, solicitud de broker y activación de trial en un outbox y los despacha de forma asíncrona a canales del equipo.",
        },
      },
      {
        type: "improvement",
        text: "ProdOps Telegram recipients can now be linked from admin with a one-time Telegram Start flow, matching the Clara/Will handshake instead of manually pasting a chat id.",
        translations: {
          es: "Los destinatarios de ProdOps por Telegram ahora se pueden vincular desde admin con un flujo de Start de un solo uso, alineado con Clara/Will en lugar de pegar el chat id manualmente.",
        },
      },
      {
        type: "fix",
        text: "ProdOps now detects a misconfigured TREFOLIO_BASE_URL (for example user.trefolio.com instead of https://trefolio.com), logs the target URL on query failures, and returns a clearer Telegram error when the query API returns 404.",
        translations: {
          es: "ProdOps detecta un TREFOLIO_BASE_URL mal configurado (por ejemplo user.trefolio.com en lugar de https://trefolio.com), registra la URL objetivo en fallos de consulta y devuelve un error de Telegram más claro cuando la API de consulta responde 404.",
        },
      },
      {
        type: "fix",
        text: "ProdOps staff Telegram queries (`latest user created`, etc.) no longer hit session middleware — `/api/internal/prodops-query` bypasses cookie auth so the external ProdOps service can authenticate with the shared HMAC secret only.",
        translations: {
          es: "Las consultas de staff en Telegram de ProdOps (`latest user created`, etc.) ya no pasan por el middleware de sesión — `/api/internal/prodops-query` omite la cookie para que el servicio externo ProdOps se autentique solo con el secreto HMAC compartido.",
        },
      },
      {
        type: "fix",
        text: "ProdOps Telegram linking now reports callback/configuration failures separately from expired links, avoiding false 'invalid or expired' bot replies when the server-to-server callback is blocked upstream.",
        translations: {
          es: "El vinculado de ProdOps por Telegram ahora distingue fallos de callback/configuración de enlaces vencidos, evitando respuestas falsas de 'inválido o vencido' cuando el callback entre servidores queda bloqueado aguas arriba.",
        },
      },
      {
        type: "fix",
        text: "ProdOps Telegram recipient linking works again: the signed link-completion callback and prodops-dispatch cron are no longer blocked by session middleware before HMAC/cron auth runs.",
        translations: {
          es: "El vinculado de destinatarios ProdOps por Telegram vuelve a funcionar: el callback firmado de completado de enlace y el cron prodops-dispatch ya no los bloquea el middleware de sesión antes de aplicar la autenticación HMAC/cron.",
        },
      },
      {
        type: "feature",
        text: "New Agent Office (/office) — Trefolio Pro workspace where Warren, Clara, and Will coordinate visible multi-step missions with per-agent Confirm. Free users see a preview paywall; featured on the landing page.",
        translations: {
          es: "Nueva Oficina de agentes (/office) — espacio Pro donde Warren, Clara y Will coordinan misiones visibles con Confirmar por agente. Usuarios free ven paywall con preview; destacada en la landing.",
        },
      },
      {
        type: "fix",
        text: "IdP admin “Linked apps” now resolves trefolio accounts for users created before OIDC cutover — local rows persist idp_sub on login and onboarding trial sync, and /api/v1/users/by-sub backfills the link when matched by email.",
        translations: {
          es: "El admin del IdP en “Linked apps” vuelve a detectar cuentas de trefolio creadas antes del cutover OIDC: las filas locales guardan idp_sub al iniciar sesión y en el trial de onboarding, y /api/v1/users/by-sub repara el enlace si coincide el email.",
        },
      },
      {
        type: "improvement",
        text: "Agent Office backend — live chat orchestration, mission persistence, Clara/Will integration stubs, Pro-gated APIs, and /office on Telegram.",
        translations: {
          es: "Oficina de agentes — orquestación en vivo, misiones persistentes, integración Clara/Will, APIs Pro y comando /office en Telegram.",
        },
      },
      {
        type: "fix",
        text: "Trial countdown banner now shows calendar days and hours (e.g. 6d 21h) instead of 0d 165h.",
        translations: {
          es: "El banner del trial Pro muestra días y horas calendario (p. ej. 6d 21h) en lugar de 0d 165h.",
        },
      },
      {
        type: "fix",
        text: "Agent Office chips now run real actions: Search my notes queries Will directly, Portfolio summary shows live holdings, and spending checks Clara — instead of always building the same rebalance mission.",
        translations: {
          es: "Los chips de la Oficina ejecutan acciones reales: Buscar en mis notas consulta a Will, Resumen de cartera muestra posiciones en vivo, y gastos consulta a Clara — en lugar de armar siempre la misma misión de rebalanceo.",
        },
      },
      {
        type: "fix",
        text: "Agent Office answers “pending investment” questions directly — checking active missions, Clara investing-bucket savings, and Will notes — instead of suggesting a generic smart-money prompt.",
        translations: {
          es: "La Oficina responde directamente a «¿inversión pendiente?» — revisa misiones activas, ahorro en bucket Inversión de Clara y notas en Will — en lugar de sugerir solo el prompt genérico de «¿algo inteligente con mi plata?».",
        },
      },
      {
        type: "fix",
        text: "Clara Agent Office API no longer redirects Warren to /login — internal /api/internal/office/* routes bypass session auth (service token only).",
        translations: {
          es: "La API interna de Clara para la Oficina ya no redirige a Warren a /login — las rutas /api/internal/office/* omiten auth de sesión (solo token de servicio).",
        },
      },
      {
        type: "fix",
        text: "Agent Office Clara/Will clients normalize CLARA_BASE_URL and WILL_BASE_URL to https — http:// production URLs no longer fail with a false “auth redirect” on Vercel’s 308 upgrade.",
        translations: {
          es: "Los clientes de Clara/Will en la Oficina normalizan CLARA_BASE_URL y WILL_BASE_URL a https — las URLs http:// en producción ya no fallan con un falso «auth redirect» por el 308 de Vercel.",
        },
      },
      {
        type: "feature",
        text: "Agent Office free-form chat — Warren now answers any portfolio question with full AI + tools (same engine as the Warren drawer), instead of only handling fixed chip intents.",
        translations: {
          es: "Chat libre en la Oficina de agentes — Warren responde cualquier pregunta de cartera con AI completa y herramientas (mismo motor que el drawer de Warren), no solo los chips fijos.",
        },
      },
      {
        type: "feature",
        text: "Agent Office renders Warren visuals — portfolio cards, stock snapshots, moat summaries, stock picks, and confirm proposals — same rich output as the Warren drawer.",
        translations: {
          es: "La Oficina muestra visuales de Warren — tarjetas de cartera, snapshots, resúmenes moat, stock picks y propuestas Confirm — igual que el drawer de Warren.",
        },
      },
      {
        type: "feature",
        text: "Warren AI gains moat tools — getMoatEvaluation, screenMoatStocks, renderMoatSummaryCard, and renderStockPickCard — for moat analysis and screener-style ideas in Office and the drawer.",
        translations: {
          es: "Warren AI incorpora herramientas moat — getMoatEvaluation, screenMoatStocks, renderMoatSummaryCard y renderStockPickCard — para análisis de moat e ideas tipo screener en la Oficina y el drawer.",
        },
      },
      {
        type: "improvement",
        text: "Agent Office chat now shows your message immediately on send, Warren’s thinking indicator, then tool steps and streamed replies — matching the dashboard Warren drawer.",
        translations: {
          es: "El chat de la Oficina muestra tu mensaje al enviar, el indicador de Warren pensando y luego los pasos de herramientas y respuestas en streaming — igual que el drawer de Warren.",
        },
      },
      {
        type: "fix",
        text: "Warren “show my investment in X” prompts now prefetch the matching holding and route to listHoldings + renderHoldingCard instead of wrongly answering with Agent Office missions.",
        translations: {
          es: "Los prompts de Warren «mostrame mi inversión en X» precargan la posición y usan listHoldings + renderHoldingCard en lugar de responder erróneamente con misiones de la Oficina.",
        },
      },
      {
        type: "fix",
        text: "Warren moat screener prompts (e.g. “ideas with P/E below 15”) now prefetch screener results and route to screenMoatStocks instead of wrongly answering with Agent Office missions.",
        translations: {
          es: "Los prompts de moat screener en Warren (p. ej. «ideas con P/E bajo 15») precargan resultados y usan screenMoatStocks en lugar de responder erróneamente con misiones de la Oficina.",
        },
      },
      {
        type: "improvement",
        text: "Clara and Will now expose Agent Office internal routes (savings summary, note search, mission step actions) so Warren can coordinate live across apps with unified IdP identity.",
        translations: {
          es: "Clara y Will exponen rutas internas de la Oficina de agentes (resumen de ahorros, búsqueda de notas, acciones de misión) para que Warren coordine en vivo entre apps con identidad IdP unificada.",
        },
      },
      {
        type: "fix",
        text: "Agent Office now resolves your unified IdP identity (sub + email) before calling Clara or Will, so sister apps know which user Warren is coordinating for. Quick-reply chips send immediately; agent timestamps are staggered in the stream.",
        translations: {
          es: "La Oficina de agentes resuelve tu identidad unificada del IdP (sub + email) antes de llamar a Clara o Will, para que las apps hermanas sepan qué usuario coordina Warren. Los chips envían al instante; las marcas de tiempo de los agentes se escalonan en el stream.",
        },
      },
    ],
  },
  {
    version: "2.5.29",
    date: "2026-05-23",
    title: "Onboarding trial step",
    titleTranslations: {
      es: "Trial en el onboarding",
    },
    changes: [
      {
        type: "feature",
        text: "New signups see a 7-day Trefolio Pro trial offer as the last onboarding step, with Clara and Will access highlighted and no credit card required. Import is offered right after.",
        translations: {
          es: "Los nuevos registros ven una oferta de prueba Pro de 7 días como último paso del onboarding, con acceso a Clara y Will y sin tarjeta. La importación se propone justo después.",
        },
      },
    ],
  },
  {
    version: "2.5.28",
    date: "2026-05-12",
    title: "IdP sign-out link prefetch",
    titleTranslations: {
      es: "Prefetch del enlace de cierre en el IdP",
    },
    changes: [
      {
        type: "fix",
        text: "The identity service no longer uses Next.js `<Link>` for `/api/oauth2/end_session` — production link prefetch could issue a background GET and clear `idp_session` immediately after Google login while `/agents` or admin chrome was visible. Sign out is now a plain anchor.",
        translations: {
          es: "El servicio de identidad ya no usa `<Link>` de Next.js para `/api/oauth2/end_session`: el prefetch del enlace en producción podía lanzar un GET en segundo plano y borrar `idp_session` justo tras el login con Google con la barra de /agents o admin visible. Cerrar sesión es ahora un enlace HTML normal.",
        },
      },
    ],
  },
  {
    version: "2.5.27",
    date: "2026-05-12",
    title: "IdP passkey Set-Cookie",
    titleTranslations: {
      es: "Set-Cookie de passkey en el IdP",
    },
    changes: [
      {
        type: "fix",
        text: "Passkey login (and related challenge cookies, account sign-out) now attach Set-Cookie on the JSON Response object instead of relying on cookies().set in Route Handlers, fixing missing idp_session after passkey sign-in on Vercel.",
        translations: {
          es: "El login por passkey (y cookies de reto relacionadas, cierre de sesión) adjuntan ahora Set-Cookie en el objeto Response JSON en lugar de cookies().set en Route Handlers, corrigiendo idp_session ausente tras login por passkey en Vercel.",
        },
      },
    ],
  },
  {
    version: "2.5.26",
    date: "2026-05-12",
    title: "IdP impersonation session pairing",
    titleTranslations: {
      es: "Emparejamiento de sesión con suplantación en el IdP",
    },
    changes: [
      {
        type: "fix",
        text: "The identity service no longer treats `idp_impersonator` alone as a logged-in operator: `/agents` and ops-Telegram APIs now require a valid `idp_session` (victim) whenever impersonation is stamped, matching the impersonation banner and preventing operator UI without a session cookie.",
        translations: {
          es: "El servicio de identidad ya no trata solo idp_impersonator como operador con sesión: /agents y las APIs ops-Telegram exigen un idp_session (víctima) válido si hay suplantación, alineado con el banner y evitando la UI de operador sin cookie de sesión.",
        },
      },
    ],
  },
  {
    version: "2.5.25",
    date: "2026-05-12",
    title: "IdP session cache hygiene",
    titleTranslations: {
      es: "Higiene de caché de sesión del IdP",
    },
    changes: [
      {
        type: "fix",
        text: "Identity service sends Cache-Control: no-store on /agents, /account, /admin, /sign-in, /oauth2, and /api/account to reduce stale UI versus cookies; restores RSC on bfcache via pageshow; ops Telegram panel explains when the browser omits idp_session.",
        translations: {
          es: "El servicio de identidad envía Cache-Control: no-store en /agents, /account, /admin, /sign-in, /oauth2 y /api/account para reducir UI obsoleta respecto a las cookies; revalida RSC al salir del bfcache vía pageshow; el panel ops Telegram explica si el navegador no envía idp_session.",
        },
      },
    ],
  },
  {
    version: "2.5.24",
    date: "2026-05-11",
    title: "IdP ops Telegram Cookie header",
    titleTranslations: {
      es: "Cabecera Cookie ops Telegram en el IdP",
    },
    changes: [
      {
        type: "fix",
        text: "Ops Telegram session resolution also parses the raw `Cookie` header (and `headers().get('cookie')`) so `idp_session` is found when Next.js cookie helpers drop it on POST.",
        translations: {
          es: "La resolución de sesión ops Telegram también analiza la cabecera Cookie en bruto (y headers().get('cookie')) para encontrar idp_session cuando los helpers de cookies de Next.js lo omiten en POST.",
        },
      },
    ],
  },
  {
    version: "2.5.23",
    date: "2026-05-11",
    title: "IdP ops Telegram cookie merge",
    titleTranslations: {
      es: "Fusión de cookies ops Telegram en el IdP",
    },
    changes: [
      {
        type: "fix",
        text: "Ops Telegram link API merges `idp_session` / `idp_impersonator` from `NextRequest.cookies` and `cookies()` per cookie name so a non-empty value is found when one store is empty on POST (fixes persistent missing_or_invalid_session).",
        translations: {
          es: "La API del enlace ops Telegram fusiona idp_session / idp_impersonator desde NextRequest.cookies y cookies() por nombre para encontrar un valor cuando un almacén está vacío en POST (corrige missing_or_invalid_session persistente).",
        },
      },
    ],
  },
  {
    version: "2.5.22",
    date: "2026-05-11",
    title: "IdP ops Telegram API session",
    titleTranslations: {
      es: "Sesión en la API ops Telegram del IdP",
    },
    changes: [
      {
        type: "fix",
        text: "POST /api/account/ops-telegram/* on the identity service now reads IdP session cookies from the incoming request (fixes 401 when generating the ops bot link). Bare GET returns 405 with a short hint instead of looking like an auth failure.",
        translations: {
          es: "POST /api/account/ops-telegram/* en el servicio de identidad lee ahora las cookies de sesión del IdP desde la petición entrante (corrige el 401 al generar el enlace del bot ops). Un GET directo devuelve 405 con una pista breve.",
        },
      },
    ],
  },
  {
    version: "2.5.21",
    date: "2026-05-11",
    title: "IdP Google callback redirect",
    titleTranslations: {
      es: "Redirección del callback Google del IdP",
    },
    changes: [
      {
        type: "fix",
        text: "Google OAuth callback on the identity service now redirects with an absolute URL after sign-in (fixes production error when next was /agents or other relative paths).",
        translations: {
          es: "El callback de Google OAuth en el servicio de identidad redirige ahora con URL absoluta tras iniciar sesión (corrige el error en producción cuando next era /agents u otras rutas relativas).",
        },
      },
    ],
  },
  {
    version: "2.5.20",
    date: "2026-05-11",
    title: "IdP Google on host",
    titleTranslations: {
      es: "Google en el host del IdP",
    },
    changes: [
      {
        type: "improvement",
        text: "The identity service highlights “Continue with Google” on user.trefolio.com /agents and /sign-in so Google-only accounts can set idp_session via /api/auth/google/start without relying on a product redirect first.",
        translations: {
          es: "El servicio de identidad destaca «Continuar con Google» en /agents y /sign-in de user.trefolio.com para que cuentas solo Google puedan establecer idp_session con /api/auth/google/start sin depender antes de un redirect del producto.",
        },
      },
    ],
  },
  {
    version: "2.5.19",
    date: "2026-05-11",
    title: "IdP first-party sign-in",
    titleTranslations: {
      es: "Inicio de sesión directo en el IdP",
    },
    changes: [
      {
        type: "improvement",
        text: "The identity service now exposes /sign-in on user.trefolio.com so password accounts can set the idp_session cookie without an OAuth redirect through trefolio; /agents links there for operators who previously saw no cookie after only logging into the product site.",
        translations: {
          es: "El servicio de identidad ofrece /sign-in en user.trefolio.com para que las cuentas con contraseña puedan establecer la cookie idp_session sin el redirect OAuth por trefolio; /agents enlaza ahí para operadores que solo habían iniciado sesión en el producto y no veían cookie.",
        },
      },
    ],
  },
  {
    version: "2.5.18",
    date: "2026-05-11",
    title: "IdP home sign-in",
    titleTranslations: {
      es: "Inicio de sesión en la home del IdP",
    },
    changes: [
      {
        type: "improvement",
        text: "The identity service home page (user.trefolio.com) now shows a primary “Sign in” button that opens trefolio’s /login with your chosen UI language, so you can start authentication without guessing which app to open first.",
        translations: {
          es: "La página principal del servicio de identidad (user.trefolio.com) muestra un botón principal «Iniciar sesión» que abre /login en trefolio con el idioma de interfaz elegido, para poder empezar la autenticación sin adivinar qué app abrir primero.",
        },
      },
    ],
  },
  {
    version: "2.5.17",
    date: "2026-05-11",
    title: "IdP sync reliability",
    titleTranslations: {
      es: "Fiabilidad de sincronización con el IdP",
    },
    changes: [
      {
        type: "fix",
        text: "Unified IdP entitlement and profile mirror into a single `/v1/entitlements` fetch on session refresh (was two parallel calls). Increased IdP S2S timeout to 20s and retry once on transient timeouts.",
        translations: {
          es: "La sincronización de derechos y perfil con el IdP usa una sola petición a `/v1/entitlements` al refrescar la sesión (antes eran dos en paralelo). Tiempo máximo de espera del cliente S2S al IdP aumentado a 20s y un reintento ante timeouts transitorios.",
        },
      },
    ],
  },
  {
    version: "2.5.16",
    date: "2026-05-11",
    title: "Warren Screener",
    titleTranslations: {
      es: "Warren Screener",
    },
    changes: [
      {
        type: "feature",
        text: "New Warren Screener under Tools: lists moat-evaluated stocks with preset positive P/E under 15 and market cap under about five billion (screener-feed units), optional min/max cap filters on the classic Moat Screener tab, and sort by market cap.",
        translations: {
          es: "Nuevo Warren Screener en Herramientas: lista acciones con evaluación moat con P/E positivo bajo 15 y capitalización hasta unos 5.000M (unidades del feed del screener), filtros opcionales de capitalización mín./máx. en el buscador Moat clásico y ordenación por capitalización.",
        },
      },
    ],
  },
  {
    version: "2.5.15",
    date: "2026-05-11",
    title: "MyInvestor stock import",
    titleTranslations: {
      es: "Importación de acciones MyInvestor",
    },
    changes: [
      {
        type: "feature",
        text: "Broker CSV import adds MyInvestor (Inversis): upload the Excel operations export from inversis.com/cbmyinvestor; the server decodes .xls/.xlsx (first sheet) and maps buys, sells, dividends, and fees into your ledger.",
        translations: {
          es: "La importación CSV añade MyInvestor (Inversis): sube el Excel de operaciones desde inversis.com/cbmyinvestor; el servidor decodifica .xls/.xlsx (primera hoja) y mapea compras, ventas, dividendos y comisiones al libro de transacciones.",
        },
      },
      {
        type: "improvement",
        text: "Broker import uploads now send native files so Excel exports parse correctly for Revolut, eToro, and other spreadsheet-capable brokers—not only plain CSV text.",
        translations: {
          es: "Las subidas de importación por bróker envían el archivo original para que los Excel se procesen bien en Revolut, eToro y otros casos con hoja de cálculo, no solo CSV en texto plano.",
        },
      },
    ],
  },
  {
    version: "2.5.14",
    date: "2026-05-11",
    title: "IdP Telegram agent directory",
    titleTranslations: {
      es: "Directorio de agentes de Telegram en el IdP",
    },
    changes: [
      {
        type: "improvement",
        text: "Service-only GET `/api/internal/telegram-link-status?sub=…` (Bearer `IDP_SERVICE_TOKEN`) reports whether the linked trefolio user has connected the Warren Telegram bot — used by user.trefolio.com account hub with no PII beyond the boolean.",
        translations: {
          es: "Nuevo GET `/api/internal/telegram-link-status?sub=…` solo para servicios (Bearer `IDP_SERVICE_TOKEN`) que indica si el usuario de trefolio asociado al `sub` del IdP tiene el bot de Telegram Warren vinculado — para la cuenta en user.trefolio.com, sin datos personales salvo el booleano.",
        },
      },
    ],
  },
  {
    version: "2.5.13",
    date: "2026-05-11",
    title: "Internal ops metrics for IdP digest",
    titleTranslations: {
      es: "Métricas internas de operaciones para el resumen del IdP",
    },
    changes: [
      {
        type: "improvement",
        text: "Added service-only GET `/api/internal/ops-metrics` (Bearer `IDP_SERVICE_TOKEN`) exposing aggregate portfolio-app stats for the trefolio-accounts business ops Telegram digest — no personal data in the payload.",
        translations: {
          es: "Nuevo GET `/api/internal/ops-metrics` solo para servicios (Bearer `IDP_SERVICE_TOKEN`) con estadísticas agregadas de la app de cartera para el resumen de operaciones en Telegram de trefolio-accounts — sin datos personales en la respuesta.",
        },
      },
    ],
  },
  {
    version: "2.5.12",
    date: "2026-05-10",
    title: "Home portfolio news & goal planner tools tab",
    titleTranslations: {
      es: "Noticias de cartera en inicio y planificador en herramientas",
    },
    changes: [
      {
        type: "feature",
        text: "Pro: each portfolio news card has an “AI summary” action that sends the headline and feed excerpt to the AI for a short neutral summary (full article is not fetched). Free users see the same control as an upgrade link to billing. Uses the monthly `news_ai_summary` quota (Free tier limit is 0).",
        translations: {
          es: "Pro: cada noticia de cartera incluye la acción «Resumen IA», que envía titular y extracto del feed a la IA para un breve resumen neutral (no se descarga el artículo completo). En plan gratuito el mismo control enlaza a facturación. Usa la cuota mensual `news_ai_summary` (el límite en gratuito es 0).",
        },
      },
      {
        type: "feature",
        text: "Warren (web + Telegram) can call `getHoldingsNews` to read the same cached portfolio-linked headlines as the app, then answers with a short 2-4 bullet digest (system prompt updated).",
        translations: {
          es: "Warren (web y Telegram) puede usar `getHoldingsNews` para leer los mismos titulares de cartera en caché que la app y responde con un breve resumen de 2-4 viñetas (instrucciones del sistema actualizadas).",
        },
      },
      {
        type: "feature",
        text: "Dashboard home replaces the inline Goal Planner with a compact portfolio news preview (full feed still under News). News is available on the Free plan; headline matches your holdings are highlighted. Stories are stored in the database and merged over time so routine views read from Turso—external news APIs run only on a timed refresh per symbol (configurable via PORTFOLIO_NEWS_SYMBOL_STALE_MS). Intelligence quota is consumed only when a provider fetch runs, not on cache reads.",
        translations: {
          es: "La portada sustituye el Planificador de metas por un avance de noticias de cartera (el listado completo sigue en Noticias). Las noticias están en el plan gratuito; se destacan las que coinciden con tus posiciones. Los artículos se guardan en base de datos y se van acumulando; las vistas habituales leen desde Turso y las APIs externas solo se usan al refrescar cada símbolo (PORTFOLIO_NEWS_SYMBOL_STALE_MS). La cuota de intelligence solo se gasta cuando hay llamada al proveedor, no al leer caché.",
        },
      },
      {
        type: "improvement",
        text: "Dashboard home compact news preview shows 10 headlines (was 5) before View all.",
        translations: {
          es: "El avance de noticias en la portada muestra 10 titulares (antes 5) antes de Ver todo.",
        },
      },
      {
        type: "improvement",
        text: "Goal Planner (growth projection) moved to Tools → Goal Planner at /tools/projection for all plans; goal progress shortcuts open that page.",
        translations: {
          es: "El Planificador de metas (proyección) pasa a Herramientas → Planificador de metas en /tools/projection para todos los planes; los accesos rápidos de progreso abren esa página.",
        },
      },
      {
        type: "fix",
        text: "Restore missing runtime deps (mcp-handler, pdf-parse) in the lockfile and widen portfolio news ingest article IDs so `next build` type-check passes.",
        translations: {
          es: "Dependencias de ejecución faltantes (mcp-handler, pdf-parse) en el lockfile e IDs de artículos al ingerir noticias ampliados para que pase el chequeo de tipos de `next build`.",
        },
      },
      {
        type: "fix",
        text: "Unified IdP login behind local Caddy: derive public origin as HTTPS for `*.trefolio-dev.com` when `Host` is forwarded but `X-Forwarded-Proto` is missing so OIDC `redirect_uri` matches on token exchange.",
        translations: {
          es: "Login IdP unificado detrás de Caddy local: el origen público se trata como HTTPS para `*.trefolio-dev.com` cuando se reenvía `Host` pero falta `X-Forwarded-Proto`, para que el `redirect_uri` de OIDC coincida en el intercambio de token.",
        },
      },
      {
        type: "fix",
        text: "Home portfolio news feed refetches when your holdings tickers change (and cancels in-flight requests); an earlier empty API result no longer blocks all later loads.",
        translations: {
          es: "Las noticias de cartera en inicio se vuelven a cargar cuando cambian los tickers de tus posiciones (y se cancelan peticiones en curso); un resultado vacío anterior ya no bloquea todas las cargas posteriores.",
        },
      },
      {
        type: "fix",
        text: "Add missing Goal Planner and portfolio news UI strings for French, German, Portuguese, and Dutch so locale parity tests pass.",
        translations: {
          es: "Añade las cadenas faltantes del Planificador de metas y de las noticias de cartera en francés, alemán, portugués y neerlandés para que pasen las pruebas de paridad de idiomas.",
        },
      },
    ],
  },
  {
    version: "2.5.11",
    date: "2026-05-09",
    title: "Unified IdP login bridge & legacy auth removal",
    titleTranslations: {
      es: "Puente de login unificado y eliminación de auth legada",
    },
    changes: [
      {
        type: "feature",
        text: "/login and /signup show a short countdown and explanation before sending you to user.trefolio.com (one account for trefolio, Clara, and Will). Legacy email/password, Google, Apple, and passkey sign-in APIs are disabled whenever the IdP is configured; USE_LEGACY_AUTH is removed.",
        translations: {
          es: "/login y /signup muestran una cuenta atrás y un texto explicativo antes de llevarte a user.trefolio.com (una cuenta para trefolio, Clara y Will). Las APIs legadas de email/contraseña, Google, Apple y passkey quedan desactivadas cuando el IdP está configurado; se elimina USE_LEGACY_AUTH.",
        },
      },
      {
        type: "feature",
        text: "Unified account hub at user.trefolio.com/account (profile, avatar URL, tax residency, connected accounts, passkeys, password). Trefolio syncs those fields from the IdP on session refresh; Clara and Will settings link there when the unified IdP is configured. Operators can backfill profiles with POST /v1/admin/users/profile-import on the IdP.",
        translations: {
          es: "Portal de cuenta unificado en user.trefolio.com/account (perfil, URL de avatar, residencia fiscal, cuentas conectadas, passkeys, contraseña). Trefolio sincroniza esos datos desde el IdP al refrescar la sesión; Clara y Will enlazan desde Ajustes cuando el IdP unificado está activo. Los operadores pueden volcar perfiles con POST /v1/admin/users/profile-import en el IdP.",
        },
      },
      {
        type: "improvement",
        text: "Creating a unified account on user.trefolio.com sends the same style of production-only admin notification email as trefolio (Resend; optional SIGNUP_NOTIFY_EMAIL), so operators see new IdP signups even before the user opens Warren.",
        translations: {
          es: "Al crear una cuenta unificada en user.trefolio.com se envía el mismo tipo de correo de aviso al equipo (solo en producción, vía Resend; SIGNUP_NOTIFY_EMAIL opcional) que en trefolio, para ver altas en el IdP aunque el usuario aún no abra Warren.",
        },
      },
      {
        type: "improvement",
        text: "Operators get one admin email per new unified identity: Warren and Clara no longer send duplicate “new customer” mail when the IdP is configured (the notification is sent once from user.trefolio.com when the account row is created). Legacy-only deployments without the IdP still use Warren/Clara local signup notifications.",
        translations: {
          es: "El equipo recibe un solo correo por nueva identidad unificada: Warren y Clara ya no envían el duplicado de «nuevo cliente» cuando el IdP está configurado (el aviso sale una vez desde user.trefolio.com al crear la cuenta). En despliegues solo legados sin IdP siguen los avisos locales de alta en Warren/Clara.",
        },
      },
    ],
  },
  {
    version: "2.5.10",
    date: "2026-05-09",
    title: "AI models by plan & IdP config",
    titleTranslations: {
      es: "Modelos IA por plan y configuración en el IdP",
    },
    changes: [
      {
        type: "improvement",
        text: "Plan comparison copy (ProCompareCard, landing pricing, mobile paywall) now states the three main Folio vs Trefolio differences in one place: AI model tier, usage quotas, and premium paid–API market-data headroom, with a short legal-safe note that published limits may change.",
        translations: {
          es: "El copy de comparación de planes (ProCompareCard, precios en la landing, paywall móvil) resume en un solo sitio las tres diferencias principales Folio vs Trefolio: nivel del modelo de IA, cuotas de uso y margen para datos de mercado «premium» vía APIs de pago, con una nota breve de que los límites publicados pueden cambiar.",
        },
      },
      {
        type: "feature",
        text: "Folio (free) conversational AI uses a compact default model; Trefolio uses the ecosystem model map from user.trefolio.com when configured (`ACCOUNTS_AI_CONFIG_SECRET` or `IDP_SERVICE_TOKEN`), with Turso `platform_settings` as fallback. Quality-critical flows (portfolio score, AI import) always use the IdP-configured model. Warren web shows a short Folio notice with upgrade CTA; Telegram sends a separate hint after replies for free users.",
        translations: {
          es: "En Folio (gratis) la IA conversacional usa un modelo compacto por defecto; en Trefolio se usa el mapa de modelos del ecosistema en user.trefolio.com si está configurado (`ACCOUNTS_AI_CONFIG_SECRET` o `IDP_SERVICE_TOKEN`), con `platform_settings` en Turso como respaldo. Los flujos críticos (puntuación de cartera, importación por IA) usan siempre el modelo configurado en el IdP. Warren en web muestra un aviso breve con CTA de mejora; en Telegram se envía un segundo mensaje con la pista para usuarios gratuitos.",
        },
      },
      {
        type: "improvement",
        text: "Admin AI model edits in trefolio sync to the IdP when reachable; the unified accounts design doc, IdP scaffold (`PlatformAiModelConfig` + internal route), integration skill, and privacy policy describe the IdP as holding ecosystem-wide AI routing configuration.",
        translations: {
          es: "La edición de modelos IA en el admin de trefolio se sincroniza con el IdP cuando hay conexión; el design doc de cuentas unificadas, el scaffold del IdP (`PlatformAiModelConfig` + ruta interna), la skill de integración y la política de privacidad describen que el IdP guarda la configuración de enrutamiento de IA del ecosistema.",
        },
      },
    ],
  },
  {
    version: "2.5.9",
    date: "2026-05-09",
    title: "MCP portfolio read API",
    titleTranslations: {
      es: "API MCP de lectura de cartera",
    },
    changes: [
      {
        type: "feature",
        text: "Per-user MCP at `/api/mcp/user` (HTTP transport): authenticate with the same `tfp_pat_…` token you create on user.trefolio.com → Developer; tools list portfolios, holdings, and cash (stored values only). Rate limits align with other ecosystem MCP endpoints.",
        translations: {
          es: "MCP por usuario en `/api/mcp/user` (transporte HTTP): autenticación con el mismo token `tfp_pat_…` que creas en user.trefolio.com → Developer; herramientas para listar carteras, posiciones y efectivo (solo valores almacenados). Límites de peticiones alineados con el resto del ecosistema MCP.",
        },
      },
      {
        type: "improvement",
        text: "Unified IdP login language: visits to user.trefolio.com from Will and Clara now forward OIDC `ui_locales` using the shared `trefolio_ui_locale` cookie when present (same bridge as trefolio); trefolio `/login` preserves an explicit `?ui_locales=` query through to `/api/auth/oidc/start`.",
        translations: {
          es: "Idioma unificado en el login del IdP: las visitas a user.trefolio.com desde Will y Clara envían `ui_locales` con la cookie compartida `trefolio_ui_locale` cuando existe (el mismo puente que trefolio); en trefolio `/login` se conserva `?ui_locales=` hasta `/api/auth/oidc/start`.",
        },
      },
      {
        type: "fix",
        text: "Warren AI: (1) normalize chat history so missing assistant prose cannot yield consecutive user messages; (2) route model calls through **Chat Completions** (`provider.chat` → `/chat/completions`) instead of the default OpenAI **Responses** integration (`/v1/responses`), which was triggering sporadic gateway errors (`input.*.output: Invalid input`) on long threads.",
        translations: {
          es: "Warren IA: (1) normalizamos el historial para que no falte el turno del asistente y no queden dos usuarios seguidos; (2) las llamadas al modelo van por **Chat Completions** (`provider.chat` → `/chat/completions`) en lugar de la integración **Responses** (`/v1/responses`), que provocaba errores esporádicos del gateway (`input.*.output: Invalid input`) en hilos largos.",
        },
      },
      {
        type: "improvement",
        text: "Documentation: unified accounts design doc, cutover runbook, `scripts/idp-cutover-checklist.mjs`, and `.env.local.example` now describe IdP-only Pro billing (device-grant webhook exception on trefolio) and deprecate unused `BILLING_REDIRECT_TO_IDP`.",
        translations: {
          es: "Documentación: el design doc de cuentas unificadas, el runbook de cutover, `scripts/idp-cutover-checklist.mjs` y `.env.local.example` describen facturación Pro solo en el IdP (excepción del webhook device-grant en trefolio) y deprecan `BILLING_REDIRECT_TO_IDP` sin uso.",
        },
      },
      {
        type: "improvement",
        text: "Developer tooling: the Cursor Marketplace plugin bundle now lives in its own public repository ([github.com/kyberis/cursor-plugins](https://github.com/kyberis/cursor-plugins)) and is linked into this monorepo as a Git submodule at `cursor-plugins/`.",
        translations: {
          es: "Herramientas para desarrolladores: el paquete de plugin de Cursor para el Marketplace vive ahora en un repositorio público propio ([github.com/kyberis/cursor-plugins](https://github.com/kyberis/cursor-plugins)) y está enlazado en este monorepo como submódulo Git en `cursor-plugins/`.",
        },
      },
      {
        type: "improvement",
        text: "“Manage subscription” opens the billing portal in a new browser tab so your trefolio session stays on the profile page.",
        translations: {
          es: "«Gestionar suscripción» abre el portal de facturación en una pestaña nueva para no abandonar la sesión en el perfil de trefolio.",
        },
      },
    ],
  },
  {
    version: "2.5.8",
    date: "2026-05-09",
    title: "Warren multimodal chat & reply language",
    titleTranslations: {
      es: "Warren: chat multimodal e idioma de respuesta",
    },
    changes: [
      {
        type: "feature",
        text: "Warren accepts images, PDFs, CSV exports, and audio in the web drawer and on Telegram (photos & documents); attachments are normalized to safe limits before reaching the model.",
        translations: {
          es: "Warren acepta imágenes, PDF, CSV y audio en el cajón web y en Telegram (fotos y documentos); los adjuntos se normalizan con límites seguros antes del modelo.",
        },
      },
      {
        type: "improvement",
        text: "Warren replies in the language of your latest message when it can be inferred, using your UI/Telegram language only as a fallback.",
        translations: {
          es: "Warren responde en el idioma de tu último mensaje cuando puede inferirlo; solo usa el idioma de la interfaz o Telegram como respaldo.",
        },
      },
      {
        type: "improvement",
        text: "SEO / AI discovery: robots.txt now lets AI crawlers (GPTBot, ClaudeBot, Perplexity, OAI-SearchBot, etc.) fetch the same public routes as normal bots — landing, blog, demo, llms — not only `/` plus llms files.",
        translations: {
          es: "SEO / descubribilidad IA: robots.txt permite a crawlers de IA las mismas rutas públicas que a bots normales — landing, blog, demo, llms — no solo `/` más los llms.",
        },
      },
      {
        type: "improvement",
        text: "llms.txt / llms-full.txt include a “Trefolio ecosystem” blurb linking Will and Clara for cross-product context in answer engines.",
        translations: {
          es: "llms.txt / llms-full.txt incluyen un apartado «ecosistema Trefolio» con enlaces a Will y Clara para contexto cruzado en motores de respuesta.",
        },
      },
    ],
  },
  {
    version: "2.5.7",
    date: "2026-05-09",
    title: "IdP upgrade checkout explicit subscribe",
    titleTranslations: {
      es: "Checkout /upgrade del IdP con suscripción explícita",
    },
    changes: [
      {
        type: "improvement",
        text: "AI Gateway auth now reads Vercel’s `x-vercel-oidc-token` request header (OIDC for Functions) before falling back to env keys — production routes no longer rely only on `VERCEL_OIDC_TOKEN` from builds.",
        translations: {
          es: "La autenticación con AI Gateway usa primero la cabecera `x-vercel-oidc-token` (OIDC en Functions) antes de las variables de entorno — las rutas en producción ya no dependen solo de `VERCEL_OIDC_TOKEN` del build.",
        },
      },
      {
        type: "improvement",
        text: "IdP (`external/accounts`): `/upgrade` no longer auto-redirects after a countdown — users click “Continue to secure checkout” to open Stripe; cancelled checkout CTA is “Subscribe again”; copy clarifies one Pro subscription covers trefolio, Clara, and Will with materially higher per-day AI caps than Free (no “unlimited” claim).",
        translations: {
          es: "IdP (`external/accounts`): `/upgrade` ya no redirige automáticamente tras una cuenta atrás — el usuario pulsa «Continue to secure checkout» para abrir Stripe; si cancela, el CTA es «Subscribe again»; el copy aclara que una suscripción Pro cubre trefolio, Clara y Will con cupos diarios de IA notablemente mayores que en Free (sin prometer ilimitado).",
        },
      },
    ],
  },
  {
    version: "2.5.6",
    date: "2026-05-08",
    title: "IdP billing checkout Stripe diagnostics",
    titleTranslations: {
      es: "Diagnóstico Stripe en checkout del IdP",
    },
    changes: [
      {
        type: "improvement",
        text: "All Warren and portfolio AI traffic now uses Vercel AI Gateway (`AI_GATEWAY_API_KEY` / `VERCEL_OIDC_TOKEN`) instead of calling OpenAI’s API host directly; Whisper/TTS use the same Gateway-compatible endpoints.",
        translations: {
          es: "Warren y el portfolio AI usan Vercel AI Gateway (`AI_GATEWAY_API_KEY` / `VERCEL_OIDC_TOKEN`) en lugar del host directo de OpenAI; Whisper/TTS pasan por los mismos endpoints compatibles con Gateway.",
        },
      },
      {
        type: "improvement",
        text: "CI lint: relax experimental `react-hooks/*` rules that were blocking `main`, rename `useLegacyAuth` → `legacyAuthEnabled` (not a React hook) for middleware, refactor mobile/native viewport hooks, and rename `useRemoteDbInDevExplicitOptIn` to avoid false hook detection.",
        translations: {
          es: "Lint en CI: aflojadas reglas experimentales `react-hooks/*` que bloqueaban `main`, `useLegacyAuth` pasó a `legacyAuthEnabled` (no es hook de React) para middleware, refactor de hooks viewport móvil/native, y rename de `useRemoteDbInDevExplicitOptIn` para evitar falsos positivos de hooks.",
        },
      },
      {
        type: "improvement",
        text: "Structured `[http:401]` logging extended: new `json401()` helper used across API routes (AI/portfolio/device, auth login/passkey/password, webhooks, IdP service plane) so every manual 401 is correlated with source + reason in logs.",
        translations: {
          es: "Registro `[http:401]` ampliado: helper `json401()` en rutas API (AI/portfolio/device, login/passkey/password, webhooks, plano de servicio IdP) para correlacionar cada 401 manual con origen y motivo.",
        },
      },
      {
        type: "improvement",
        text: "401 responses log structured `[http:401]` context: source, reason (e.g. missing cookie vs invalid JWT), path, method, request ids, client IP (from forwarded headers), and user-agent prefix — no cookies or Bearer secrets.",
        translations: {
          es: "Los 401 registran contexto estructurado `[http:401]`: origen, motivo (p. ej. cookie ausente vs JWT inválido), ruta, método, ids de petición, IP cliente (cabeceras forward) y prefijo de user-agent — sin cookies ni secretos Bearer.",
        },
      },
      {
        type: "fix",
        text: "`/api/cron/snaptrade-cleanup` now uses `verifyCronAuth` like other crons. Documented that Vercel’s `Authorization: Bearer` value comes only from project `CRON_SECRET`; `CRON_SECRET_FALLBACK` is app-only for accepting a second token during rotation.",
        translations: {
          es: "`/api/cron/snaptrade-cleanup` usa `verifyCronAuth` como el resto de crons. Aclaración: el `Authorization: Bearer` de Vercel usa solo la variable de proyecto `CRON_SECRET`; `CRON_SECRET_FALLBACK` existe solo en la app para aceptar un segundo valor durante rotación.",
        },
      },
      {
        type: "improvement",
        text: "Auth/checkout probe logs now include Vercel deploy context (env, region, short commit), safe inbound headers (x-vercel-id, x-request-id, forwarded host/proto), and richer flow fields (token timing, IdP host, OAuth code lengths, redirect hosts).",
        translations: {
          es: "Las migas de auth/checkout incluyen contexto de deploy en Vercel (entorno, región, commit corto), cabeceras entrantes seguras (x-vercel-id, x-request-id, host/proto reenviados) y más detalle de flujo (tiempo de token, host del IdP, longitudes de código OAuth, hosts de redirect).",
        },
      },
      {
        type: "fix",
        text: "`/api/cron/*` authentication: trim `CRON_SECRET` before compare (avoids Vercel 401 when the env value ends with newline), flexible `Bearer` parsing, timing-safe equality, optional `CRON_SECRET_FALLBACK` during rotation; `verifyCronAuth` takes the full request. Same Bearer rules for cron-style `POST /api/transactions/bulk` with `x-cron-user-id`.",
        translations: {
          es: "Auth de `/api/cron/*`: se recorta `CRON_SECRET` antes de comparar (evita 401 si el valor en Vercel lleva salto de línea), parsing flexible de `Bearer`, igualdad en tiempo constante y `CRON_SECRET_FALLBACK` opcional en rotaciones; `verifyCronAuth` recibe la petición completa. Mismas reglas Bearer para `POST /api/transactions/bulk` con `x-cron-user-id`.",
        },
      },
      {
        type: "improvement",
        text: "More verbose structured logs for production debugging: trefolio OIDC start/callback and billing checkout breadcrumbs (`[trefolio.auth.probe]`); IdP token + authorize + checkout (`[accounts.auth.probe]`); Clara (etracker) credentials/Google sign-in; Will (notetaker) credentials, Google, and IdP OAuth — no passwords or secrets in logs.",
        translations: {
          es: "Logs estructurados más verbosos para depurar en producción: migas OIDC/checkout en trefolio (`[trefolio.auth.probe]`); token + authorize + checkout en IdP (`[accounts.auth.probe]`); credenciales/Google en Clara (etracker); credenciales, Google e OAuth IdP en Will (notetaker) — sin contraseñas ni secretos en los logs.",
        },
      },
      {
        type: "improvement",
        text: "IdP (`external/accounts`): clearer handling when Stripe returns “No such price” (likely live/test or account mismatch vs `STRIPE_SECRET_KEY`); sanitize `STRIPE_PRICE_PRO_*` values; README troubleshooting for `/api/billing/checkout`.",
        translations: {
          es: "IdP (`external/accounts`): manejo más claro cuando Stripe devuelve «No such price» (suele ser desajuste test/live o cuenta distinta de `STRIPE_SECRET_KEY`); saneo de valores `STRIPE_PRICE_PRO_*`; troubleshooting en README para `/api/billing/checkout`.",
        },
      },
      {
        type: "fix",
        text: "IdP (`external/accounts`): password reset now returns `mail_suppressed` when email is skipped (non-prod) and HTTP 500 with guidance when Resend fails in production; README states `RESEND_API_KEY` must be set on trefolio-accounts for reset mail.",
        translations: {
          es: "IdP (`external/accounts`): la recuperación de contraseña devuelve `mail_suppressed` si el correo se omite (no prod) y HTTP 500 con orientación si Resend falla en producción; el README indica que `RESEND_API_KEY` debe estar en trefolio-accounts para el correo de reset.",
        },
      },
      {
        type: "improvement",
        text: "IdP (`external/accounts`): `/favicon.ico` and `/favicon.png` (same mark as trefolio) plus `metadataBase` / `icons` in the root layout for correct browser and OG base URLs.",
        translations: {
          es: "IdP (`external/accounts`): `/favicon.ico` y `/favicon.png` (misma marca que trefolio) y `metadataBase` / `icons` en el layout raíz para URLs base correctas en navegador y OG.",
        },
      },
      {
        type: "fix",
        text: "IdP (`external/accounts`): `findUserByEmail` matches `lower(email)` so password reset finds accounts with legacy mixed-case emails; log Resend message id on successful reset sends; success copy mentions spam folder.",
        translations: {
          es: "IdP (`external/accounts`): `findUserByEmail` usa `lower(email)` para que el reset encuentre cuentas con email en mayúsculas/minúsculas heredadas; se registra el id de Resend al enviar; el texto de éxito menciona la carpeta de spam.",
        },
      },
      {
        type: "improvement",
        text: "IdP (`external/accounts`): password reset sends when `RESEND_API_KEY` is set even outside production; locale resolution reads `trefolio_ui_locale` everywhere (matches `/oauth2/authorize`); `<html lang>` follows cookie; Stripe checkout validates price IDs (+ env aliases `STRIPE_PRICE_ID_PRO_*`) before redirect; `/upgrade` bilingual copy explaining Warren+Clara+Will Pro bundle.",
        translations: {
          es: "IdP (`external/accounts`): recuperación envía correo si `RESEND_API_KEY` está definida fuera de producción; el idioma lee también `trefolio_ui_locale` como en authorize; `<html lang>` sigue la cookie; checkout valida price IDs antes de Stripe (aliases `STRIPE_PRICE_ID_PRO_*`); página `/upgrade` bilingüe con copy del paquete Pro Warren+Clara+Will.",
        },
      },
      {
        type: "improvement",
        text: "IdP (`external/accounts`): strip `sslmode` and redundant SSL query params from `DATABASE_URL` before creating the `pg` Pool (TLS unchanged via Pool `ssl`); removes duplicate `postgresConnectionStringForPool` and silences the pg v8 `sslmode` deprecation warning on cold start.",
        translations: {
          es: "IdP (`external/accounts`): quitar `sslmode` y parámetros SSL redundantes de `DATABASE_URL` antes del pool `pg` (la TLS sigue con `ssl` del Pool); elimina `postgresConnectionStringForPool` duplicado y silencia el aviso de deprecación `sslmode` de pg v8 al arrancar.",
        },
      },
    ],
  },
  {
    version: "2.5.5",
    date: "2026-05-08",
    title: "IdP self-service password recovery",
    titleTranslations: {
      es: "Recuperación de contraseña en autoservicio en el IdP",
    },
    changes: [
      {
        type: "improvement",
        text: "IdP (`external/accounts`): self-service password recovery — `/account/forgot-password`, email reset link (Resend, 1h JWT), `/account/reset-password`, `POST /api/auth/forgot-password` and `POST /api/auth/reset-password`, plus a Forgot password link on `/oauth2/authorize`.",
        translations: {
          es: "IdP (`external/accounts`): recuperación de contraseña en autoservicio — `/account/forgot-password`, enlace por correo (Resend, JWT 1h), `/account/reset-password`, `POST /api/auth/forgot-password` y `POST /api/auth/reset-password`, y enlace «Olvidé mi contraseña» en `/oauth2/authorize`.",
        },
      },
    ],
  },
  {
    version: "2.5.4",
    date: "2026-05-08",
    title: "Unified billing cutover docs & IdP upgrade UX",
    titleTranslations: {
      es: "Docs de cutover de facturación y UX de upgrade en el IdP",
    },
    changes: [
      {
        type: "improvement",
        text: "Unified accounts cutover runbook and `scripts/idp-cutover-checklist.mjs` now require flipping `BILLING_REDIRECT_TO_IDP=true` together with `USE_LEGACY_AUTH=false` on trefolio, and warn if billing redirect is on while legacy auth is still enabled (avoids mismatched Stripe webhooks). `.env.local.example` documents the pairing.",
        translations: {
          es: "El runbook de cutover de cuentas unificadas y `scripts/idp-cutover-checklist.mjs` exigen activar `BILLING_REDIRECT_TO_IDP=true` junto con `USE_LEGACY_AUTH=false` en trefolio y avisan si el redirect de facturación está on con auth legacy (evita webhooks de Stripe desalineados). `.env.local.example` documenta el emparejamiento.",
        },
      },
      {
        type: "improvement",
        text: "IdP (`external/accounts`): `/upgrade` benefits landing varies by `from=trefolio|clara|will` (headings, bullet order, accents, footnotes) via `src/lib/upgrade-from-copy.ts`; portal-return links prefer the originating product.",
        translations: {
          es: "IdP (`external/accounts`): la landing de beneficios en `/upgrade` depende de `from=trefolio|clara|will` (títulos, orden de bullets, acentos, notas) vía `src/lib/upgrade-from-copy.ts`; al volver del portal de Stripe el enlace vuelve al producto de origen.",
        },
      },
      {
        type: "improvement",
        text: "Clara (`external/etracker`): Settings shows Trefolio Pro upgrade and billing-portal links on user.trefolio.com when unified IdP auth is active; quota modal CTA label now says user.trefolio.com. Will (`external/notetaker`): IdP upgrade URLs prefer `IDP_ISSUER` for browser links.",
        translations: {
          es: "Clara (`external/etracker`): Ajustes muestra enlaces de mejora a Trefolio Pro y portal de facturación en user.trefolio.com con IdP unificado; el modal de cuota dice user.trefolio.com en el CTA. Will (`external/notetaker`): las URLs de upgrade al IdP usan `IDP_ISSUER` para el navegador.",
        },
      },
    ],
  },
  {
    version: "2.5.3",
    date: "2026-05-07",
    title: "AI prompt hardening",
    titleTranslations: {
      es: "Endurecimiento de prompts de IA",
    },
    changes: [
      {
        type: "fix",
        text: "OIDC sign-in and `/api/auth/me` now promote the local trefolio user to `admin` when their email is listed in `TREFOLIO_ADMIN_EMAILS` (or, if unset, the same `IDP_ADMIN_EMAILS` used for user.trefolio.com), and refresh the session cookie so `/api/admin/*` works without a separate database role update.",
        translations: {
          es: "El inicio vía OIDC y `/api/auth/me` ahora promueven el usuario local de trefolio a `admin` si su email figura en `TREFOLIO_ADMIN_EMAILS` (o, si no está definida, en el mismo `IDP_ADMIN_EMAILS` que user.trefolio.com) y renuevan la cookie de sesión para que `/api/admin/*` funcione sin tocar el rol a mano en la base de datos.",
        },
      },
      {
        type: "fix",
        text: "Admin Settings no longer crashes when `/api/admin/*` returns 403 (for example while impersonating a user): AdSense config falls back to empty slot defaults, and a banner explains that impersonation blocks platform admin API access.",
        translations: {
          es: "Ajustes de admin ya no se caen si `/api/admin/*` responde 403 (p. ej. con suplantación de usuario): la config de AdSense usa valores por defecto y un aviso explica que la suplantación bloquea las APIs de administración de plataforma.",
        },
      },
      {
        type: "fix",
        text: "Restored the info@trefolio.com “new customer” admin email when the first trefolio account is provisioned after sign-in via user.trefolio.com (OIDC); it was only firing for legacy email/password and Google/Apple callbacks.",
        translations: {
          es: "Se recupera el correo interno a info@trefolio.com por nuevo cliente cuando se crea la cuenta local tras iniciar sesión vía user.trefolio.com (OIDC); antes solo se enviaba con registro clásico por email/contraseña o callbacks de Google/Apple.",
        },
      },
      {
        type: "improvement",
        text: "Local development (`next dev`) and Vitest no longer use Turso when `STOCKTRACKER_TURSO_DATABASE_URL` / `TREFOLIO_TURSO_DATABASE_URL` are set unless you opt in with `STOCKTRACKER_USE_REMOTE_DB_IN_DEV=true` (or `TREFOLIO_*`), preventing accidental reads/writes against a production database copied into `.env.local`. Default local DB file remains `data/trefolio.db`.",
        translations: {
          es: "El desarrollo local (`next dev`) y Vitest ya no usan Turso si están definidas las URLs/con tokens salvo que actives `STOCKTRACKER_USE_REMOTE_DB_IN_DEV=true` (o `TREFOLIO_*`), para evitar lecturas/escrituras accidentales contra producción al copiar `.env.local`. La base local por defecto sigue siendo `data/trefolio.db`.",
        },
      },
      {
        type: "improvement",
        text: "Stripe checkout failures from `/api/billing/checkout` now include the provider error in JSON (`message`) and the upgrade card surfaces it when present, making misconfigured Price IDs easier to diagnose.",
        translations: {
          es: "Los fallos de Stripe en `/api/billing/checkout` incluyen ahora el error del proveedor en JSON (`message`) y la tarjeta de mejora lo muestra si viene informado, facilitando diagnosticar Price IDs mal configurados.",
        },
      },
      {
        type: "improvement",
        text: "Portfolio AI chat and Warren web chat reduce prompt-injection risk: portfolio telemetry for Portfolio AI is built only on the server; Warren validates the active portfolio against your account, uses the database portfolio name, applies a strict snapshot schema, and tightens system-prompt label sanitisation.",
        translations: {
          es: "El chat de IA de cartera y Warren en la web reducen el riesgo de inyección de prompts: los datos de cartera para Portfolio AI se generan solo en el servidor; Warren valida la cartera activa frente a tu cuenta, usa el nombre en base de datos, aplica un esquema estricto del snapshot y sanea las etiquetas en el system prompt.",
        },
      },
      {
        type: "improvement",
        text: "Added Vitest route tests for `/api/warren/chat` and `/api/portfolio/ai-chat` plus a Playwright spec for extra strict-body rejection cases (message limits, roles, oversized content, nested snapshot keys).",
        translations: {
          es: "Añadimos pruebas Vitest de rutas para `/api/warren/chat` y `/api/portfolio/ai-chat` y un spec de Playwright con más casos de rechazo por cuerpo estricto (límites de mensajes, roles, contenido largo, claves anidadas en el snapshot).",
        },
      },
      {
        type: "improvement",
        text: "Clara (`external/etracker`) and Will (`external/notetaker`) now ship Vitest coverage for import-preference framing and multilingual Will prompt safety; optional IdP browser smoke is `e2e/idp-browser-smoke.spec.ts` when `E2E_IDP_BROWSER=1` (see `playwright.config.ts`).",
        translations: {
          es: "Clara (`external/etracker`) y Will (`external/notetaker`) incluyen cobertura Vitest para el mensaje de preferencias de importación y la regla anti-inyección en prompts multilingües; el humo de navegador IdP opcional es `e2e/idp-browser-smoke.spec.ts` con `E2E_IDP_BROWSER=1` (ver `playwright.config.ts`).",
        },
      },
    ],
  },
  {
    version: "2.5.2",
    date: "2026-05-06",
    title: "Unified billing portal links",
    titleTranslations: {
      es: "Enlaces al portal de facturación unificado",
    },
    changes: [
      {
        type: "improvement",
        text: "When unified IdP billing is enabled (BILLING_REDIRECT_TO_IDP), “Manage subscription” in Profile and upgrade flows opens the Stripe Customer Portal on user.trefolio.com instead of the local portal route, matching where subscriptions are billed.",
        translations: {
          es: "Con la facturación unificada en el IdP activada (BILLING_REDIRECT_TO_IDP), «Gestionar suscripción» en el perfil y en los flujos de mejora abre el portal de cliente de Stripe en user.trefolio.com en lugar de la ruta local, alineado con donde se cobra la suscripción.",
        },
      },
      {
        type: "improvement",
        text: "Optional env GRANTS_AND_TRIALS_REDIRECT_TO_IDP sends 7-day trial and admin complimentary-grant emails to activation pages on user.trefolio.com (with cron/admin IdP sync); legacy product-hosted claim URLs remain when unset.",
        translations: {
          es: "Variable opcional GRANTS_AND_TRIALS_REDIRECT_TO_IDP: las invitaciones de prueba de 7 días y los grants administrativos enlazan a las páginas de activación en user.trefolio.com (con sincronización del cron/admin al IdP); si no está activa, se siguen usando las URLs en el producto.",
        },
      },
      {
        type: "improvement",
        text: "The landing page “three agents” section shows Warren, Clara, and Will brand icons instead of letter placeholders.",
        translations: {
          es: "En la landing, la sección de los tres agentes muestra los iconos de marca de Warren, Clara y Will en lugar de iniciales.",
        },
      },
    ],
  },
  {
    version: "2.5.1",
    date: "2026-05-05",
    title: "Unified signup via accounts",
    titleTranslations: {
      es: "Alta unificada vía accounts",
    },
    changes: [
      {
        type: "improvement",
        text: "Your chosen app language is mirrored to a shared cookie so the identity UI (user.trefolio.com) matches trefolio, Clara, and Will instead of only following the browser Accept-Language header.",
        translations: {
          es: "El idioma que eliges en la app se refleja en una cookie compartida para que la UI del IdP (user.trefolio.com) coincida con trefolio, Clara y Will, y no dependa solo del encabezado Accept-Language del navegador.",
        },
      },
      {
        type: "feature",
        text: "The identity service (user.trefolio.com) supports English, German, Spanish, French, and Italian for the sign-in UI, check-email flow, and verification emails; trefolio sends your active UI locale to the IdP (OIDC ui_locales plus a shared cookie) when starting login or signup.",
        translations: {
          es: "El servicio de identidad (user.trefolio.com) admite inglés, alemán, español, francés e italiano en la UI de acceso, la pantalla de revisión de correo y los correos de verificación; trefolio envía tu idioma de interfaz activo al IdP (ui_locales OIDC y una cookie compartida) al iniciar sesión o registro.",
        },
      },
      {
        type: "improvement",
        text: "When the IdP is enabled and legacy auth is off, /signup and app registration links send you to user.trefolio.com with branding for the app you came from (trefolio, Clara or Will). New accounts still finish onboarding or accept-terms inside each product afterward.",
        translations: {
          es: "Con el IdP activo y la auth legada desactivada, /signup y los enlaces de registro te llevan a user.trefolio.com con la marca de la app de origen (trefolio, Clara o Will). Las cuentas nuevas siguen completando onboarding o aceptación de términos dentro de cada producto.",
        },
      },
      {
        type: "improvement",
        text: "The identity admin user page shows IdP sign-in attempt/failure counts and, for linked Will accounts, Telegram outbound send attempts/failures (requires deploying the matching accounts + Will schema updates).",
        translations: {
          es: "La página de detalle de usuario del admin del IdP muestra intentos y fallos de acceso al IdP y, si hay cuenta en Will vinculada, intentos y fallos de envío por Telegram (requiere desplegar los cambios de esquema en accounts y Will).",
        },
      },
      {
        type: "improvement",
        text: "Cross-service resilience: trefolio OIDC login no longer waits on IdP entitlement sync before redirecting (sync runs in the background; /api/auth/me still reconciles). IdP S2S HTTP calls from trefolio use a bounded timeout. Clara’s Telegram webhook registers Telegram↔IdP links in the background with short fetch timeouts so IdP slowness does not block bot replies.",
        translations: {
          es: "Resiliencia entre servicios: el login OIDC de trefolio ya no espera la sincronización de derechos con el IdP antes de redirigir (se hace en segundo plano; /api/auth/me sigue reconciliando). Las llamadas HTTP S2S al IdP desde trefolio llevan tiempo máximo. El webhook de Telegram de Clara registra el enlace Telegram↔IdP en segundo plano con timeouts cortos para que un IdP lento no bloquee las respuestas del bot.",
        },
      },
      {
        type: "improvement",
        text: "The identity service (user.trefolio.com) rejects disposable and known fake email domains on password signup and on new Google sign-ups, using the same domain list as trefolio.",
        translations: {
          es: "El servicio de identidad (user.trefolio.com) rechaza dominios de correo desechables y falsos conocidos en el registro con contraseña y en nuevos accesos con Google, con la misma lista que trefolio.",
        },
      },
      {
        type: "improvement",
        text: "The IdP OAuth client for trefolio now allows https://www.trefolio.com and 127.0.0.1 callback/logout URLs alongside apex and localhost; run `npm run idp:cutover-checklist` for the Phase 6 cutover steps and optional env validation.",
        translations: {
          es: "El cliente OAuth del IdP para trefolio admite ahora https://www.trefolio.com y callbacks/logout en 127.0.0.1 además del apex y localhost; ejecuta `npm run idp:cutover-checklist` para los pasos del cutover (fase 6) y validación opcional de variables.",
        },
      },
      {
        type: "improvement",
        text: "When unified OIDC is active, /login immediately continues into the IdP (middleware → /api/auth/oidc/start → user.* /oauth2/authorize), so you reach user.trefolio.com or user.trefolio-dev.com without rendering an extra stop on the product login screen.",
        translations: {
          es: "Con OIDC unificado activo, /login continúa enseguida hacia el IdP (middleware → /api/auth/oidc/start → user.* /oauth2/authorize), así llegas a user.trefolio.com o user.trefolio-dev.com sin una parada extra en la pantalla de login del producto.",
        },
      },
      {
        type: "fix",
        text: "Signing out on trefolio.com returns you to trefolio after the IdP finishes single sign-out: the IdP end_session page no longer falls back to a relative “/” (which kept you on user.trefolio.com) when the post-logout URL is missing or rejected — it now picks a safe absolute product URL from the OAuth client. Trefolio’s /api/auth/logout also uses the public request origin (X-Forwarded-Host / APP_BASE_URL) so post_logout_redirect_uri matches the site you actually used.",
        translations: {
          es: "Al cerrar sesión en trefolio.com vuelves a trefolio tras el cierre unificado en el IdP: la página end_session ya no usa “/” relativo (que te dejaba en user.trefolio.com) si falta o rechaza post_logout_redirect_uri — ahora elige una URL absoluta segura según el cliente OAuth. El /api/auth/logout de trefolio también usa el origen público de la petición (X-Forwarded-Host / APP_BASE_URL) para que post_logout coincida con el host real.",
        },
      },
      {
        type: "fix",
        text: "Local HTTPS dev (Caddy): IdP login no longer sends the browser to localhost when apps use loopback IDP_BASE_URL — set IDP_ISSUER (and optional IDP_SERVER_ORIGIN on accounts) per dev/README.md; trefolio honors IDP_ISSUER for /oauth2/authorize, IdP logout links, and ID-token verification.",
        translations: {
          es: "En dev HTTPS con Caddy: el login IdP ya no manda el navegador a localhost si las apps usan IDP_BASE_URL en loopback — configura IDP_ISSUER (y opcional IDP_SERVER_ORIGIN en accounts) según dev/README.md; trefolio respeta IDP_ISSUER para /oauth2/authorize, logout del IdP y verificación del id_token.",
        },
      },
      {
        type: "fix",
        text: "Clara: settings data-export control uses Base UI `Button` with `nativeButton={false}` when rendering as a download link so the GDPR export button no longer triggers a runtime accessibility warning.",
        translations: {
          es: "Clara: el control de exportación de datos en ajustes usa el `Button` de Base UI con `nativeButton={false}` al renderizar como enlace de descarga, así el botón de exportación RGPD ya no dispara el aviso de accesibilidad en runtime.",
        },
      },
      {
        type: "fix",
        text: "Clara: signing out from the app header now uses the site root as the post-logout return URL (like Will), instead of /login, so user.trefolio.com end_session no longer sends you into a login ↔ IdP redirect loop.",
        translations: {
          es: "Clara: cerrar sesión desde el menú del header usa la raíz del sitio como URL de vuelta tras el logout del IdP (como Will), en lugar de /login, para que user.trefolio.com end_session no te meta en un bucle login ↔ IdP.",
        },
      },
    ],
  },
  {
    version: "2.5.0",
    date: "2026-05-05",
    title: "One account, three agents — Warren, Clara and Will under Trefolio Pro",
    titleTranslations: {
      es: "Una cuenta, tres agentes: Warren, Clara y Will bajo Trefolio Pro",
    },
    changes: [
      {
        type: "feature",
        text: "Trefolio, Clara (clara.trefolio.com) and Will (will.trefolio.com) now share a single account and a single Pro subscription. Sign in once at user.trefolio.com and your identity, plan and Telegram links work across all three apps. €7.99/mo (or €59.99/yr) unlocks the full team — Warren on your portfolio, Clara on your day-to-day money and Will on your notes.",
        translations: {
          es: "Trefolio, Clara (clara.trefolio.com) y Will (will.trefolio.com) ahora comparten una sola cuenta y una sola suscripción Pro. Inicia sesión una vez en user.trefolio.com y tu identidad, plan y enlaces de Telegram funcionan en las tres apps. €7,99/mes (o €59,99/año) desbloquea el equipo completo: Warren para tu cartera, Clara para tu día a día y Will para tus notas.",
        },
      },
      {
        type: "feature",
        text: "Sign in to all three apps with Google or with a passkey (Face ID, Touch ID, Windows Hello, or your device PIN). \"Continue with Google\" is now an option on the unified sign-in page, and you can enroll passkeys at user.trefolio.com/account/passkeys to skip passwords on every device you trust.",
        translations: {
          es: "Inicia sesión en las tres apps con Google o con una passkey (Face ID, Touch ID, Windows Hello o el PIN de tu dispositivo). «Continuar con Google» ya es una opción en la pantalla de inicio de sesión unificada, y puedes registrar passkeys en user.trefolio.com/account/passkeys para saltar la contraseña en cada dispositivo de confianza.",
        },
      },
      {
        type: "feature",
        text: "Unified daily query limits for the agent products: 30 messages/day per app on the Free tier, lifted to 200 messages/day per app on Pro. Same caps in web chat and Telegram. When you hit the limit you see a clear upsell that takes you to a single upgrade page covering all three agents.",
        translations: {
          es: "Cuotas diarias unificadas para los agentes: 30 mensajes/día por app en el plan gratuito, ampliado a 200 mensajes/día por app en Pro. Los mismos límites en el chat web y en Telegram. Al llegar al tope ves un mensaje claro que te lleva a una única página de upgrade que cubre los tres agentes.",
        },
      },
      {
        type: "feature",
        text: "Landing page redesigned around the three-agent ecosystem: a new \"Your agents team\" section introduces Warren, Clara and Will side by side, and the pricing copy now spells out the daily quotas you get on each agent at every tier.",
        translations: {
          es: "Landing rediseñada alrededor del ecosistema de tres agentes: una nueva sección «Tu equipo de agentes» presenta a Warren, Clara y Will juntos, y el copy de precios ahora indica las cuotas diarias que tienes en cada agente en cada plan.",
        },
      },
      {
        type: "improvement",
        text: "Behind the scenes, authentication and billing moved to a dedicated identity service (user.trefolio.com) using OIDC + PKCE. Existing accounts and Stripe subscriptions were migrated automatically — no action required. The session cookie shape is unchanged so the Capacitor mobile apps keep working without a new build.",
        translations: {
          es: "Por dentro, la autenticación y la facturación se mudaron a un servicio de identidad dedicado (user.trefolio.com) usando OIDC + PKCE. Las cuentas y suscripciones existentes de Stripe se migraron automáticamente: no necesitas hacer nada. La forma de la cookie de sesión no cambia, así que las apps móviles Capacitor siguen funcionando sin una nueva build.",
        },
      },
      {
        type: "fix",
        text: "User migration now de-duplicates identities by normalized email across trefolio, Clara and Will before assigning IdP subjects. This prevents split accounts and login mismatches when the same person existed in multiple apps.",
        translations: {
          es: "La migración de usuarios ahora deduplica identidades por email normalizado entre trefolio, Clara y Will antes de asignar `sub` del IdP. Esto evita cuentas partidas y conflictos de login cuando la misma persona existía en varias apps.",
        },
      },
      {
        type: "improvement",
        text: "/login now sends you straight to the unified sign-in at user.trefolio.com when the IdP is enabled, instead of showing two competing forms. The legacy email/password screen still loads when USE_LEGACY_AUTH=true so the cutover stays reversible.",
        translations: {
          es: "/login ahora te lleva directo al inicio de sesión unificado en user.trefolio.com cuando el IdP está activo, en vez de mostrar dos formularios distintos. La pantalla clásica de email y contraseña sigue cargando con USE_LEGACY_AUTH=true para que la migración siga siendo reversible.",
        },
      },
      {
        type: "fix",
        text: "OIDC callback and error redirects now use the browser-facing host from reverse-proxy headers (X-Forwarded-Host / X-Forwarded-Proto) when present, so local HTTPS stacks like trefolio-dev.com behind Caddy keep the same redirect_uri for authorize and token exchange and no longer bounce you to localhost after IdP login.",
        translations: {
          es: "El callback OIDC y las redirecciones de error ahora usan el host visible para el navegador según los headers del proxy inverso (X-Forwarded-Host / X-Forwarded-Proto) cuando existen, así que entornos HTTPS locales como trefolio-dev.com detrás de Caddy mantienen el mismo redirect_uri en authorize y en el intercambio de tokens y ya no te devuelven a localhost tras iniciar sesión en el IdP.",
        },
      },
      {
        type: "fix",
        text: "Unified sign-in countdown (user.trefolio.com) no longer freezes mid-way: the IdP SSO redirect timer uses a single interval so React Strict Mode cannot cancel the next tick, and the no-JavaScript meta refresh URL escapes ampersands so the browser parses the redirect target correctly.",
        translations: {
          es: "La cuenta atrás del inicio de sesión unificado (user.trefolio.com) ya no se queda a medias: el temporizador de redirección SSO del IdP usa un solo intervalo para que el modo estricto de React no cancele el siguiente tick, y la URL del meta refresh sin JavaScript escapa los ampersands para que el navegador interprete bien el destino.",
        },
      },
      {
        type: "fix",
        text: "IdP-only login no longer loops with ERR_TOO_MANY_REDIRECTS after a failed OIDC callback: /login now renders the error instead of immediately redirecting back to the IdP. Local HTTPS dev: prefer IDP_BASE_URL=http://localhost:3300 for Node token/JWKS calls (see dev/README.md).",
        translations: {
          es: "El inicio solo-IdP ya no entra en bucle (ERR_TOO_MANY_REDIRECTS) tras un callback OIDC fallido: /login muestra el error en lugar de redirigir al instante al IdP. En dev con HTTPS local: conviene IDP_BASE_URL=http://localhost:3300 para las llamadas token/JWKS desde Node (ver dev/README.md).",
        },
      },
    ],
  },
  {
    version: "2.4.2",
    date: "2026-05-04",
    title: "Warren tells you what he's doing on Telegram",
    titleTranslations: {
      es: "Warren te cuenta qu\u00e9 est\u00e1 haciendo en Telegram",
    },
    changes: [
      {
        type: "improvement",
        text: "While Warren works in Telegram you now see a small status line that updates with each step \u2014 \"Looking up your holdings\u2026\", \"Fetching live quote\u2026\", \"Searching the investing knowledge base\u2026\". The line is edited in place and disappears the moment the final answer arrives, so the chat stays tidy. Same idea you already had in the web Warren drawer.",
        translations: {
          es: "Mientras Warren trabaja en Telegram ahora ves una l\u00ednea corta de estado que se actualiza con cada paso: \u00abMirando tus posiciones\u2026\u00bb, \u00abPidiendo la cotizaci\u00f3n\u2026\u00bb, \u00abBuscando en la base de inversi\u00f3n\u2026\u00bb. La l\u00ednea se edita en el sitio y desaparece al llegar la respuesta final, as\u00ed que el chat queda limpio. Misma idea que ya ten\u00edas en el cajón web de Warren.",
        },
      },
    ],
  },
  {
    version: "2.4.1",
    date: "2026-05-02",
    title: "Warren replies are tighter and end with a useful next step",
    titleTranslations: {
      es: "Warren responde de forma m\u00e1s directa y termina con una sugerencia \u00fatil",
    },
    changes: [
      {
        type: "improvement",
        text: "Warren now replies in a more direct, conversational style: length follows the question (1\u20132 sentences for concrete asks; short paragraphs or bullets for open ones), no boilerplate greetings or sign-offs, and substantive answers end with one short follow-up question or next step instead of generic closers. The \"AI-generated, not financial advice\" line still appears on Telegram and on advisory web turns; on the web drawer it relies on the persistent footer rather than repeating it after every message.",
        translations: {
          es: "Warren ahora responde en un estilo m\u00e1s directo y conversacional: la extensi\u00f3n se ajusta a la pregunta (1\u20132 frases para consultas concretas; p\u00e1rrafos cortos o vi\u00f1etas para las abiertas), sin saludos ni cierres gen\u00e9ricos, y las respuestas sustanciales terminan con una pregunta de seguimiento o un pr\u00f3ximo paso \u00fatil en vez de muletillas. La l\u00ednea \u00abAsistencia generada por IA, no es asesoramiento financiero\u00bb sigue apareciendo en Telegram y en los turnos de web con contenido asesor; en el cajón web se apoya en el pie de p\u00e1gina permanente en lugar de repetirla en cada mensaje.",
        },
      },
    ],
  },
  {
    version: "2.4.0",
    date: "2026-05-02",
    title: "Warren talks: voice notes on Telegram + a value-investing knowledge base",
    titleTranslations: {
      es: "Warren habla: audios en Telegram + base de inversi\u00f3n en valor",
    },
    changes: [
      {
        type: "feature",
        text: "Send voice notes to Warren on Telegram. Warren transcribes the audio (OpenAI Whisper), runs the same portfolio-aware turn as a typed message, and sends the answer back as text AND as a spoken voice note (OpenAI text-to-speech). The transcript is echoed first so you can spot anything that was misheard. Caps: 60 seconds and 4 MB per voice note. No raw audio is stored on our servers.",
        translations: {
          es: "Mand\u00e1 audios a Warren por Telegram. Warren transcribe el audio (OpenAI Whisper), ejecuta el mismo turno de cartera que un mensaje de texto, y te responde con texto Y con un audio hablado (OpenAI text-to-speech). Primero te muestra la transcripci\u00f3n para que puedas detectar errores. L\u00edmites: 60 segundos y 4 MB por audio. No guardamos el audio crudo en nuestros servidores.",
        },
      },
      {
        type: "feature",
        text: "Warren now answers concept questions from a curated value-investing knowledge base — \"what is margin of safety?\", \"explain P/E ratio\", \"how does diversification work?\", \"what is drawdown?\". The library covers ~35 entries across philosophy, metrics, asset types, risk, behavioural pitfalls and frameworks; Warren paraphrases the relevant ones in your language and ties them back to your portfolio when it makes sense.",
        translations: {
          es: "Warren ahora responde preguntas de conceptos desde una base curada de inversi\u00f3n en valor: \u00abqu\u00e9 es el margen de seguridad\u00bb, \u00abexplica el PER\u00bb, \u00abc\u00f3mo funciona la diversificaci\u00f3n\u00bb, \u00abqu\u00e9 es el drawdown\u00bb. La biblioteca cubre unas 35 entradas entre filosof\u00eda, m\u00e9tricas, tipos de activo, riesgos, sesgos y frameworks; Warren las parafrasea en tu idioma y las conecta con tu cartera cuando tiene sentido.",
        },
      },
    ],
  },
  {
    version: "2.3.2",
    date: "2026-05-02",
    title: "Warren on the web now matches Telegram and the dashboard",
    titleTranslations: {
      es: "Warren en la web ahora coincide con Telegram y el dashboard",
    },
    changes: [
      {
        type: "fix",
        text: "Fixed the web Warren chat showing different invested values, gain percentages, and currency labels than Telegram and the dashboard. The web client was building its own copy of the AI snapshot with the same FX/unit bugs that were already fixed on the server. Both surfaces now share a single helper, so per-holding numbers cannot drift again.",
        translations: {
          es: "Se corrigi\u00f3 que el chat de Warren en la web mostrara valores invertidos, porcentajes de ganancia y etiquetas de moneda distintos a los de Telegram y el dashboard. El cliente web constru\u00eda su propia copia del snapshot de la IA con los mismos errores de FX/unidades que ya se hab\u00edan corregido en el servidor. Ambas superficies ahora comparten un \u00fanico helper, por lo que los n\u00fameros por posici\u00f3n no pueden volver a divergir.",
        },
      },
    ],
  },
  {
    version: "2.3.1",
    date: "2026-05-02",
    title: "Warren now reports the same invested values as the web",
    titleTranslations: {
      es: "Warren ahora reporta los mismos valores de inversi\u00f3n que la web",
    },
    changes: [
      {
        type: "fix",
        text: "Fixed Warren AI returning different invested totals and average price per share than the web for non-EUR holdings. The chat snapshot was building FX rate keys in the wrong direction (e.g. GBPEUR instead of EURGBP), so non-EUR positions were silently kept in their local currency. Totals, gain/loss, and per-holding numbers now match the web exactly.",
        translations: {
          es: "Se corrigi\u00f3 que Warren AI devolviera totales invertidos y precio promedio por acci\u00f3n distintos a los de la web para posiciones que no estaban en EUR. El snapshot del chat constru\u00eda las claves del tipo de cambio en la direcci\u00f3n incorrecta (por ejemplo GBPEUR en lugar de EURGBP), por lo que las posiciones no-EUR se manten\u00edan silenciosamente en su moneda local. Los totales, ganancias/p\u00e9rdidas y los n\u00fameros por posici\u00f3n ahora coinciden exactamente con la web.",
        },
      },
      {
        type: "fix",
        text: "Fixed Warren reporting wrong gain percentages and currency labels for LSE / GBp-quoted holdings. The per-holding row mixed pence-quoted current prices with pound-stored cost basis when computing gain percent, producing ~100x errors, and tagged the average purchase price with the quote currency instead of the holding's display currency.",
        translations: {
          es: "Se corrigi\u00f3 que Warren reportara porcentajes de ganancia y etiquetas de moneda incorrectos para posiciones del LSE cotizadas en GBp. La fila por posici\u00f3n mezclaba precios actuales en peniques con la base de coste en libras al calcular el porcentaje de ganancia, lo que produc\u00eda errores de ~100x, y etiquetaba el precio promedio de compra con la moneda de la cotizaci\u00f3n en lugar de la moneda de visualizaci\u00f3n de la posici\u00f3n.",
        },
      },
    ],
  },
  {
    version: "2.3.0",
    date: "2026-05-02",
    title: "Warren on Telegram now renders styled replies and portfolio charts",
    titleTranslations: {
      es: "Warren en Telegram ahora muestra respuestas con estilo y gr\u00e1ficos",
    },
    changes: [
      {
        type: "fix",
        text: "Warren replies on Telegram are now properly styled: headings, bold, bullets, and links from the AI's Markdown are translated into Telegram MarkdownV2 instead of being shown as literal `###` and `**` characters.",
        translations: {
          es: "Las respuestas de Warren en Telegram ahora se muestran con estilo: t\u00edtulos, negritas, vi\u00f1etas y enlaces del Markdown de la IA se traducen a MarkdownV2 de Telegram en lugar de aparecer como caracteres `###` y `**` literales.",
        },
      },
      {
        type: "feature",
        text: "Telegram bot now supports charts: use /chart to get a portfolio allocation pie chart, and Warren can attach charts inline (rendered as PNG images) for any answer that benefits from a visual.",
        translations: {
          es: "El bot de Telegram ahora soporta gr\u00e1ficos: usa /chart para obtener un gr\u00e1fico circular con la asignaci\u00f3n de tu cartera, y Warren puede adjuntar gr\u00e1ficos en l\u00ednea (renderizados como im\u00e1genes PNG) para cualquier respuesta que se beneficie de una visualizaci\u00f3n.",
        },
      },
    ],
  },
  {
    version: "2.2.3",
    date: "2026-05-02",
    title: "Telegram link no longer rejects valid tokens",
    titleTranslations: {
      es: "El enlace de Telegram ya no rechaza tokens v\u00e1lidos",
    },
    changes: [
      {
        type: "fix",
        text: "Connecting Telegram from Profile → Notifications no longer fails with \"link invalid or expired\": the bot now accepts both the Warren-bot deep link and the legacy notifications deep link, and a single connection enables both Warren chat and price-alert delivery.",
        translations: {
          es: "Conectar Telegram desde Perfil \u2192 Notificaciones ya no falla con \u201cenlace inv\u00e1lido o caducado\u201d: el bot acepta tanto el enlace del bot de Warren como el enlace antiguo de notificaciones, y una sola conexi\u00f3n activa el chat con Warren y la entrega de alertas de precio.",
        },
      },
    ],
  },
  {
    version: "2.2.2",
    date: "2026-05-02",
    title: "Profile page width matches the rest of the app",
    titleTranslations: {
      es: "El ancho del perfil ahora coincide con el resto de la app",
    },
    changes: [
      {
        type: "fix",
        text: "The Profile page now uses the same max width and horizontal padding as Portfolio and other content pages, instead of being noticeably narrower than the rest of the app.",
        translations: {
          es: "La p\u00e1gina de Perfil ahora usa el mismo ancho m\u00e1ximo y los mismos m\u00e1rgenes horizontales que Portfolio y el resto de p\u00e1ginas, en lugar de aparecer m\u00e1s estrecha que el resto de la app.",
        },
      },
    ],
  },
  {
    version: "2.2.1",
    date: "2026-04-30",
    title: "Telegram replaces WhatsApp for alert delivery",
    titleTranslations: {
      es: "Telegram sustituye a WhatsApp en los avisos",
    },
    changes: [
      {
        type: "improvement",
        text: "Price alerts now use Telegram (Bot API) instead of WhatsApp/Twilio: connect from Profile → Notifications via deep link, optional webhook secret, and the same per-user rate limits as before.",
        translations: {
          es: "Las alertas de precio usan Telegram (Bot API) en lugar de WhatsApp/Twilio: con\u00e9ctate desde Perfil \u2192 Notificaciones con enlace profundo, secreto opcional del webhook y los mismos l\u00edmites por usuario que antes.",
        },
      },
      {
        type: "fix",
        text: "Restored missing Telegram notification and profile settings strings in Spanish, Portuguese, and Dutch so all locales match English keys again.",
        translations: {
          es: "Se recuperaron cadenas faltantes de Telegram y del perfil en espa\u00f1ol, portugu\u00e9s y neerland\u00e9s para que todos los idiomas vuelvan a alinearse con las claves en ingl\u00e9s.",
        },
      },
      {
        type: "improvement",
        text: "Warren AI is now available on the mobile dashboard: a prominent card at the top of the Portfolio tab and an Ask AI button in the chart footer both open the same Warren drawer used on desktop.",
        translations: {
          es: "Warren AI ya est\u00e1 disponible en el panel m\u00f3vil: una tarjeta destacada en la parte superior de la pesta\u00f1a Portfolio y un bot\u00f3n Ask AI en el pie del gr\u00e1fico abren el mismo cajón de Warren que en escritorio.",
        },
      },
    ],
  },
  {
    version: "2.2.0",
    date: "2026-04-30",
    title: "Warren on Telegram",
    titleTranslations: {
      es: "Warren en Telegram",
    },
    changes: [
      {
        type: "feature",
        text: "Warren is now available on Telegram. Connect your account from Profile, then chat with Warren from anywhere — same capabilities as the web drawer: read your portfolio, growth, dividends, news, alerts and watchlist, and ask Warren to add holdings, cash, or alerts (every write shows a Confirm/Cancel card before anything is saved).",
        translations: {
          es: "Warren ya est\u00e1 disponible en Telegram. Conecta tu cuenta desde Perfil y chatea con Warren desde donde quieras \u2014 con las mismas capacidades que el panel web: leer tu cartera, crecimiento, dividendos, noticias, alertas y watchlist, y pedirle que a\u00f1ada posiciones, cash o alertas (cada escritura muestra una tarjeta de Confirmar/Cancelar antes de guardarse).",
        },
      },
      {
        type: "improvement",
        text: "Telegram replies share Warren's quota (ai_consult), so free users still get 15/month and Pro users 500/month across web and Telegram combined.",
        translations: {
          es: "Las respuestas en Telegram comparten la cuota de Warren (ai_consult): los usuarios Free siguen con 15/mes y los Pro con 500/mes, combinando web y Telegram.",
        },
      },
      {
        type: "fix",
        text: "Vercel builds: require Turso env vars instead of falling back to local file SQLite during `npm run build`, and surface DB errors in logs with the underlying message.",
        translations: {
          es: "Builds en Vercel: se exigen variables de entorno de Turso en lugar de usar SQLite local durante `npm run build`, y los errores de BD muestran el mensaje original en los logs.",
        },
      },
      {
        type: "fix",
        text: "Warren on Telegram: send every rendered card (allocation, summary, holdings, snapshots), not only the first one, and allow the model up to three cards per turn like the web drawer.",
        translations: {
          es: "Warren en Telegram: se env\u00edan todas las tarjetas renderizadas (asignaci\u00f3n, resumen, posiciones, snapshots), no solo la primera, y el modelo puede usar hasta tres tarjetas por turno como en el panel web.",
        },
      },
    ],
  },
  {
    version: "2.1.2",
    date: "2026-04-30",
    title: "Leaf firmware tooling and display diagnostics",
    titleTranslations: {
      es: "Herramientas Leaf y diagn\u00F3stico de pantalla",
    },
    changes: [
      {
        type: "improvement",
        text: "trefolio Leaf (LILYGO T4-S3): extra PlatformIO environments for hardware isolation (`hello` alongside display solid-fill tests, RGB cycle without LVGL, LVGL text demo, USB-only bare-serial), host scripts for SPIFFS builds and factory reflash, Wi-Fi preset example header, and README/platformio updates merged with the upstream hello diagnostic build.",
        translations: {
          es: "trefolio Leaf (LILYGO T4-S3): entornos PlatformIO adicionales para aislar hardware (`hello` junto a tests de pantalla en color plano, ciclo RGB sin LVGL, demo de texto LVGL, bare-serial solo USB), scripts de host para SPIFFS y reflashing de f\u00E1brica, cabecera ejemplo de Wi-Fi preset, y README/platformio alineados con el build de diagn\u00F3stico hello del upstream.",
        },
      },
    ],
  },
  {
    version: "2.1.1",
    date: "2026-04-30",
    title: "Warren \u2014 corrected name",
    titleTranslations: {
      es: "Warren \u2014 nombre corregido",
    },
    changes: [
      {
        type: "fix",
        text: "Renamed the AI portfolio companion from \"Warrent\" to \"Warren\" everywhere \u2014 UI, API routes (/api/warren/chat, /api/warren/confirm), system prompt, and assets.",
        translations: {
          es: "Renombramos al compa\u00F1ero de IA de cartera de \"Warrent\" a \"Warren\" en toda la app \u2014 UI, rutas de API (/api/warren/chat, /api/warren/confirm), prompt del sistema y recursos.",
        },
      },
    ],
  },
  {
    version: "2.1.0",
    date: "2026-04-30",
    title: "Meet Warren — your AI portfolio companion",
    titleTranslations: {
      es: "Conoce a Warren — tu compa\u00F1ero de portafolio con IA",
    },
    changes: [
      {
        type: "feature",
        text: "Introducing Warren, a chat-first AI assistant for your portfolio. Ask anything, see live charts and cards inline, and let Warren prepare actions like adding holdings, creating alerts, or watching tickers. Every action shows a confirmation card before anything is saved \u2014 no surprises.",
        translations: {
          es: "Te presentamos a Warren, un asistente de IA conversacional para tu portafolio. Preg\u00FAntale lo que quieras, m\u00EDralo responder con tarjetas y gr\u00E1ficos integrados, y deja que prepare acciones como a\u00F1adir posiciones, crear alertas o vigilar tickers. Cada acci\u00F3n muestra una tarjeta de confirmaci\u00F3n antes de guardarse \u2014 sin sorpresas.",
        },
      },
      {
        type: "improvement",
        text: "Warren grounds every answer in your real holdings via dedicated read tools (portfolio summary, holdings, alerts, watchlist, cash) and live Yahoo Finance quotes \u2014 so it never invents numbers about your portfolio.",
        translations: {
          es: "Warren fundamenta cada respuesta en tus tenencias reales mediante herramientas de lectura dedicadas (resumen de portafolio, posiciones, alertas, watchlist, efectivo) y cotizaciones en vivo de Yahoo Finance \u2014 nunca inventa cifras sobre tu portafolio.",
        },
      },
      {
        type: "improvement",
        text: "Refactored chat portfolio cards (holding, allocation, summary, stock pick) into a shared `chat-cards` library so both private chat and Warren reuse the same visual language.",
        translations: {
          es: "Hemos extra\u00EDdo las tarjetas de chat de portafolio (holding, allocation, summary, stock pick) a una librer\u00EDa compartida `chat-cards` para que el chat privado y Warren usen el mismo lenguaje visual.",
        },
      },
    ],
  },
  {
    version: "2.0.0",
    date: "2026-04-29",
    title: "All features for everyone — Pro now means more headroom",
    titleTranslations: {
      es: "Todas las funciones para todos — Pro ahora significa m\u00E1s margen",
    },
    changes: [
      {
        type: "feature",
        text: "Every feature in trefolio is now available on the Free Folio plan — fundamentals, intelligence, screener, moat reports, tax reports, AI analysis, exports, share links and more. Trefolio Pro multiplies your monthly quotas for AI consultations and premium-data lookups instead of unlocking new screens.",
        translations: {
          es: "Todas las funciones de trefolio est\u00E1n ahora disponibles en el plan Folio gratuito — fundamentals, intelligence, screener, moat reports, informes fiscales, an\u00E1lisis con IA, exportaciones, enlaces de compartir y m\u00E1s. Trefolio Pro multiplica tus cuotas mensuales de consultas de IA y datos premium en lugar de desbloquear nuevas pantallas.",
        },
      },
      {
        type: "improvement",
        text: "AI usage is now measured in consultations (calls) instead of tokens, so the limit you see matches what you do: ask the AI a question, that's one consultation. Each query is internally capped at 6,000 tokens to keep responses fast and predictable.",
        translations: {
          es: "El uso de IA ahora se mide en consultas (llamadas) en lugar de tokens, para que el l\u00EDmite que ves coincida con lo que haces: hacer una pregunta a la IA es una consulta. Cada consulta tiene un tope interno de 6.000 tokens para mantener respuestas r\u00E1pidas y predecibles.",
        },
      },
      {
        type: "improvement",
        text: "New per-feature usage badges show \"X / Y this period\" on every quota-bearing screen, with a friendly upgrade nudge only when you've used 80% or more of the period.",
        translations: {
          es: "Nuevas insignias de uso por funci\u00F3n muestran \"X / Y este per\u00EDodo\" en cada pantalla con cuota, con un aviso amigable de mejora solo cuando has usado el 80% o m\u00E1s del per\u00EDodo.",
        },
      },
      {
        type: "improvement",
        text: "Existing Trefolio Pro subscribers keep their plan unchanged — Pro quotas are large enough that normal use never hits a wall.",
        translations: {
          es: "Los suscriptores actuales de Trefolio Pro mantienen su plan sin cambios — las cuotas Pro son lo bastante amplias para que el uso normal nunca se tope con un l\u00EDmite.",
        },
      },
      {
        type: "improvement",
        text: "Refreshed landing page, pricing comparison and in-app paywall copy to reflect the universal-access model: same features on Folio and Trefolio, with Trefolio multiplying the monthly AI and premium-data quotas roughly 20\u00D7. Removed all \u201CPro only\u201D blurred overlays from in-app screens.",
        translations: {
          es: "Renovamos la landing, la comparativa de precios y los textos de paywall en la app para reflejar el modelo de acceso universal: mismas funciones en Folio y Trefolio, con Trefolio multiplicando las cuotas mensuales de IA y datos premium aproximadamente 20\u00D7. Eliminamos todas las superposiciones difuminadas de \u201Csolo Pro\u201D dentro de la app.",
        },
      },
    ],
  },
  {
    version: "1.77.74",
    date: "2026-04-28",
    title: "Bigger, more readable text on the Leaf device",
    titleTranslations: {
      es: "Texto m\u00E1s grande y legible en el dispositivo Leaf",
    },
    changes: [
      {
        type: "improvement",
        text: "Increased font sizes across the entire trefolio Leaf interface — dashboard, holdings list, stock detail, settings, passkey screen and error/loading screens — so portfolio numbers, tickers and labels are easier to read at a glance.",
        translations: {
          es: "Aumentamos el tama\u00F1o de las fuentes en toda la interfaz del trefolio Leaf — panel principal, lista de posiciones, detalle de acci\u00F3n, ajustes, pantalla de passkey y pantallas de error/carga — para que los n\u00FAmeros de la cartera, los tickers y las etiquetas se lean mejor de un vistazo.",
        },
      },
    ],
  },
  {
    version: "1.77.73",
    date: "2026-04-23",
    title: "Mobile home matches desktop",
    titleTranslations: {
      es: "La pantalla principal m\u00F3vil ahora refleja la del escritorio",
    },
    changes: [
      {
        type: "improvement",
        text: "The mobile portfolio home now shows the same data and sections as the desktop dashboard: fully-wired hero chart with invested vs cash split, asset-type filter pills with day change, market-aware breakdown, stats grid, asset performance table, allocation tabs, compact dividend and earnings cards, period returns, performance metrics, projection, goal celebration and progress, plus the full banner stack (SnapTrade reconnect, Leaf promo, upgrade nudge, secure account prompt and holdings-usage warning). The diversification tab now also includes the rebalancing view.",
        translations: {
          es: "La pantalla principal m\u00F3vil ahora muestra los mismos datos y secciones que el panel de escritorio: gr\u00E1fico principal completo con separaci\u00F3n entre invertido y efectivo, chips de filtro por tipo de activo con cambio del d\u00EDa, desglose con estado de mercado, cuadr\u00EDcula de estad\u00EDsticas, tabla de rendimiento por activo, pesta\u00F1as de asignaci\u00F3n, tarjetas compactas de dividendos y resultados, rentabilidades por periodo, m\u00E9tricas de rendimiento, proyecci\u00F3n, celebraci\u00F3n y progreso del objetivo, adem\u00E1s de la pila completa de avisos (reconexi\u00F3n de SnapTrade, promo Leaf, empuj\u00F3n de actualizaci\u00F3n, solicitud de cuenta segura y aviso de l\u00EDmite de posiciones). La pesta\u00F1a de diversificaci\u00F3n ahora tambi\u00E9n incluye la vista de rebalanceo.",
        },
      },
    ],
  },
  {
    version: "1.77.72",
    date: "2026-04-22",
    title: "Mini sparkline on the collapsed hero chart",
    titleTranslations: {
      es: "Mini gr\u00E1fico en la tarjeta colapsada",
    },
    changes: [
      {
        type: "improvement",
        text: "When the main portfolio chart is collapsed, the hero card now shows a compact sparkline with the last week (or month for Pro) of portfolio value plus the period return. Tap the sparkline to open the full interactive chart.",
        translations: {
          es: "Cuando el gr\u00E1fico principal de la cartera est\u00E1 colapsado, la tarjeta hero muestra ahora un mini gr\u00E1fico con la \u00FAltima semana (o el \u00FAltimo mes para Pro) del valor de la cartera junto con el retorno del periodo. Toca el mini gr\u00E1fico para abrir el gr\u00E1fico interactivo completo.",
        },
      },
    ],
  },
  {
    version: "1.77.71",
    date: "2026-04-22",
    title: "Smarter asset breakdown for single\u2011type portfolios",
    titleTranslations: {
      es: "Desglose m\u00E1s inteligente para carteras de un solo tipo",
    },
    changes: [
      {
        type: "improvement",
        text: "If your portfolio holds only one asset type, the \u201CAll Assets\u201D pill is no longer shown \u2014 it would just duplicate the single type. The breakdown strip now also resizes to match however many types you actually hold, so it stays tidy with one, two, three or four pills.",
        translations: {
          es: "Si tu cartera solo tiene un tipo de activo, el chip \u201CTodos los Activos\u201D ya no aparece: ser\u00EDa id\u00E9ntico al chip del \u00FAnico tipo. La tira de desglose tambi\u00E9n se ajusta al n\u00FAmero de tipos que realmente tienes, para mantenerse limpia con uno, dos, tres o cuatro chips.",
        },
      },
    ],
  },
  {
    version: "1.77.70",
    date: "2026-04-22",
    title: "Unified asset filter and breakdown inside the hero",
    titleTranslations: {
      es: "Filtro y desglose de activos unificados dentro del hero",
    },
    changes: [
      {
        type: "improvement",
        text: "Merged the asset-type filter chips (All / Stocks / ETFs / Crypto) with the breakdown cards and moved the resulting compact strip inside the portfolio hero, right below the invested\u2011assets headline. One surface now shows value, day change and allocation per type and also acts as the chart filter \u2014 saving two rows of vertical space on the dashboard.",
        translations: {
          es: "Hemos unido los chips de filtro por tipo de activo (Todos / Acciones / ETFs / Cripto) con las tarjetas de desglose y hemos movido la tira compacta resultante dentro del hero de la cartera, justo debajo del titular de activos invertidos. Una sola superficie muestra ahora valor, cambio del d\u00EDa y asignaci\u00F3n por tipo y a la vez act\u00FAa como filtro del gr\u00E1fico, ahorrando dos filas verticales en el panel.",
        },
      },
    ],
  },
  {
    version: "1.77.69",
    date: "2026-04-22",
    title: "Invested vs cash split on the dashboard hero",
    titleTranslations: {
      es: "Hero del panel: separación entre invertido y efectivo",
    },
    changes: [
      {
        type: "improvement",
        text: "The portfolio hero now leads with your invested assets instead of your net worth, so the day-change percent only measures capital at risk \u2014 cash no longer dilutes the headline.",
        translations: {
          es: "El hero de la cartera ahora muestra primero los activos invertidos en lugar del patrimonio neto, de modo que el cambio diario en porcentaje solo mide el capital en riesgo: el efectivo ya no dilu\u00EDa el titular.",
        },
      },
      {
        type: "improvement",
        text: "Cash available for investment is shown just below the headline, with a one-click \u201CUpdate\u201D action that jumps to the cash editor so you can correct the balance after a deposit or withdrawal. Net worth (invested + cash) is still visible as a tooltip.",
        translations: {
          es: "El efectivo disponible para invertir aparece justo debajo del titular, con una acci\u00F3n directa de \u201CActualizar\u201D que salta al editor de efectivo para que puedas corregir el saldo tras un ingreso o retirada. El patrimonio neto (invertido + efectivo) sigue visible como tooltip.",
        },
      },
      {
        type: "improvement",
        text: "The asset list now has aligned column headers (Name \u00B7 Value \u00B7 Return), a quieter search field and a slimmer deep-dive call-to-action on the portfolio chart card.",
        translations: {
          es: "La lista de activos ahora tiene cabeceras de columna alineadas (Nombre \u00B7 Valor \u00B7 Rentabilidad), un buscador m\u00E1s discreto y una invitaci\u00F3n al gr\u00E1fico detallado m\u00E1s ligera en la tarjeta de la cartera.",
        },
      },
    ],
  },
  {
    version: "1.77.68",
    date: "2026-04-22",
    title: "Platform hardening",
    titleTranslations: {
      es: "Endurecimiento de la plataforma",
    },
    changes: [
      {
        type: "improvement",
        text: "Typed the social posts, intelligence, and fundamentals API routes with Zod parsers and a typed provider-method map, removing runtime `any` casts that could have masked bad inputs.",
        translations: {
          es: "Las rutas de la API para publicaciones sociales, 'intelligence' y fundamentales ahora usan validación Zod y mapas tipados de métodos de proveedor, eliminando conversiones de tipo 'any' que podían ocultar entradas inválidas.",
        },
      },
      {
        type: "improvement",
        text: "Wrapped the portfolio value chart, private chat room, and the admin tabs area in error boundaries so a crash in one panel no longer blanks out the surrounding page.",
        translations: {
          es: "El gráfico de valor de cartera, la sala de chat privado y el área de pestañas de administración ahora están protegidos por límites de error, de modo que un fallo en un panel no deja en blanco el resto de la página.",
        },
      },
      {
        type: "improvement",
        text: "Failed admin and profile fetches now log the underlying error so regressions surface in observability instead of being silently swallowed.",
        translations: {
          es: "Las peticiones fallidas de administración y de perfil ahora registran el error original para que las regresiones aparezcan en la observabilidad en lugar de quedarse en silencio.",
        },
      },
      {
        type: "improvement",
        text: "The stock screener shows an inline, screen-reader-friendly error banner when the filter metadata or results request fails, instead of a silent empty state.",
        translations: {
          es: "El screener de acciones muestra un banner de error en línea, compatible con lectores de pantalla, cuando falla la petición de metadatos o resultados, en lugar de un estado vacío silencioso.",
        },
      },
      {
        type: "improvement",
        text: "Heavy chart and stock detail bundles are now lazy-loaded on dashboard and portfolio pages, making initial render lighter.",
        translations: {
          es: "Los paquetes pesados del gráfico y del detalle de acción ahora se cargan bajo demanda en el panel y en las páginas de cartera, aligerando el render inicial.",
        },
      },
      {
        type: "improvement",
        text: "Added API route tests for chat send and read-receipt flows and unit tests for chat-room helpers, raising the Private Chat domain's automated coverage.",
        translations: {
          es: "Se añadieron pruebas de rutas API para el envío de mensajes y el acuse de lectura del chat, y pruebas unitarias de los ayudantes del chat, elevando la cobertura automatizada del dominio Chat Privado.",
        },
      },
      {
        type: "improvement",
        text: "Aligned the Capacitor CLI with the @capacitor/* v8 runtime, pinned eslint-config-next to Next 14, and raised the minimum Node engine to 22 LTS so local and Vercel builds use the same toolchain.",
        translations: {
          es: "Se alineó el CLI de Capacitor con el runtime v8 de @capacitor/*, se fijó eslint-config-next a la serie de Next 14 y se elevó el motor Node mínimo a 22 LTS para que las compilaciones locales y en Vercel usen la misma cadena de herramientas.",
        },
      },
    ],
  },
  {
    version: "1.77.67",
    date: "2026-04-21",
    title: "Build reliability",
    titleTranslations: {
      es: "Fiabilidad de compilación",
    },
    changes: [
      {
        type: "feature",
        text: "The home dashboard now hides the portfolio chart and the asset-type breakdown cards by default, and loads them on demand via a 'Show deep dive graph' CTA — making the initial view faster and less busy.",
        translations: {
          es: "El panel principal ahora oculta el gráfico del portafolio y las tarjetas de desglose por tipo de activo de forma predeterminada, y los carga bajo demanda con un botón 'Mostrar gráfico detallado', para una vista inicial más rápida y menos cargada.",
        },
      },
      {
        type: "fix",
        text: "The device interest count API route is marked dynamic so production builds do not prerender it against the database.",
        translations: {
          es: "La ruta de recuento de interés en dispositivos se marca como dinámica para que las compilaciones de producción no la prerendericen contra la base de datos.",
        },
      },
      {
        type: "fix",
        text: "The public waitlist counter on the landing and Leaf pages now loads for signed-out visitors — the API route is no longer behind the auth gate.",
        translations: {
          es: "El contador público de la lista de espera en las páginas de inicio y Leaf ahora se carga para visitantes sin sesión — la ruta de API ya no requiere autenticación.",
        },
      },
      {
        type: "improvement",
        text: "Reconciled the cron registry with vercel.json: portfolio snapshots now correctly run every 5 minutes, and the compact-snapshots and feedback-pipeline jobs are registered with the admin cron view.",
        translations: {
          es: "Se reconcilió el registro de crons con vercel.json: los snapshots de portafolio corren cada 5 minutos y los jobs compact-snapshots y feedback-pipeline están registrados en la vista de administración.",
        },
      },
      {
        type: "improvement",
        text: "Accessibility and localization sweep on mobile: the dashboard refresh button now announces the correct action (not 'refreshing' when idle), hit targets are larger, bottom sheets have proper dialog semantics with Escape support, and the portfolio picker 'Default' label and count are fully translated.",
        translations: {
          es: "Mejora de accesibilidad y localización en móvil: el botón de actualizar del panel ahora anuncia la acción correcta (no dice 'actualizando' en reposo), las áreas de toque son más grandes, las hojas inferiores tienen semántica de diálogo con soporte de Escape y la etiqueta 'Predeterminado' del selector de portafolio está totalmente traducida.",
        },
      },
      {
        type: "improvement",
        text: "The Portfolio AI drawer now localizes its error messages and suggested questions, so non-English users see the chat in their own language.",
        translations: {
          es: "El panel de IA del portafolio ahora traduce sus mensajes de error y las preguntas sugeridas, para que los usuarios en otros idiomas vean el chat en su propio idioma.",
        },
      },
      {
        type: "improvement",
        text: "Adding a stock now shows a brief 'Holding added to your portfolio' confirmation — with a screen-reader announcement — before the modal closes.",
        translations: {
          es: "Al añadir una acción ahora aparece una confirmación breve 'Posición añadida a tu portafolio' — con anuncio para lectores de pantalla — antes de cerrarse el modal.",
        },
      },
      {
        type: "improvement",
        text: "Turnstile CAPTCHA is automatically skipped on localhost (both next dev and local npm start), and operators can opt out in any environment with TURNSTILE_DISABLED=1.",
        translations: {
          es: "El CAPTCHA de Turnstile ahora se omite automáticamente en localhost (tanto en next dev como en npm start local), y los operadores pueden desactivarlo en cualquier entorno con TURNSTILE_DISABLED=1.",
        },
      },
    ],
  },
  {
    version: "1.77.66",
    date: "2026-04-18",
    title: "Longer voice messages in chat",
    titleTranslations: {
      es: "Mensajes de voz más largos en el chat",
    },
    changes: [
      {
        type: "improvement",
        text: "Private chat voice recording and file uploads now allow up to 2 minutes instead of 1.",
        translations: {
          es: "La grabación de voz y los archivos adjuntos en el chat privado permiten hasta 2 minutos en lugar de 1.",
        },
      },
    ],
  },
  {
    version: "1.77.65",
    date: "2026-04-14",
    title: "Network chat full width on mobile",
    titleTranslations: {
      es: "Chat de red a ancho completo en móvil",
    },
    changes: [
      {
        type: "fix",
        text: "Opening a conversation under Network → Conversations on a phone now uses the full screen width; the chat card breaks out of the page gutters and drops default card padding so the thread isn’t squeezed on the right.",
        translations: {
          es: "Al abrir una conversación en Red → Conversaciones en el móvil, el chat usa ya todo el ancho de pantalla; la tarjeta sale de los márgenes de la página y sin el padding por defecto del card para que el hilo no quede estrecho a la derecha.",
        },
      },
      {
        type: "fix",
        text: "Private chat no longer leaves an empty strip on the right: Network conversations use the full app content width (no max-width column), standalone chat shells fill the viewport, and the native app shell paints the theme background in safe-area padding so body white doesn’t show beside the thread.",
        translations: {
          es: "El chat privado ya no deja una franja vacía a la derecha: las conversaciones de Red usan todo el ancho del contenido (sin columna max-width), las vistas de chat sueltas llenan el viewport y el shell nativo pinta el fondo del tema en el padding de las zonas seguras para que no se vea el blanco del body junto al hilo.",
        },
      },
      {
        type: "fix",
        text: "Outgoing chat bubbles align correctly: each message row is a horizontal flex container so your messages sit flush right instead of leaving a blank band beside short bubbles (self-end had no effect when the wrapper wasn’t a flex parent).",
        translations: {
          es: "Las burbujas propias se alinean bien: cada fila de mensaje es un flex horizontal para que tus mensajes queden pegados a la derecha sin una franja vacía junto a burbujas cortas (self-end no surtía efecto si el contenedor no era flex).",
        },
      },
    ],
  },
  {
    version: "1.77.64",
    date: "2026-04-14",
    title: "Custom voice player in chat",
    titleTranslations: {
      es: "Reproductor de voz personalizado en el chat",
    },
    changes: [
      {
        type: "fix",
        text: "Sent and preview voice messages use a custom play/pause bar (like the preview) instead of the native audio control, which broke on WebKit inside bubbles.",
        translations: {
          es: "Los mensajes de voz enviados y la vista previa usan una barra de reproducción personalizada (como la vista previa) en lugar del control de audio nativo, que fallaba en WebKit dentro de las burbujas.",
        },
      },
    ],
  },
  {
    version: "1.77.63",
    date: "2026-04-14",
    title: "Voice bubble layout",
    titleTranslations: {
      es: "Diseño de burbuja de voz",
    },
    changes: [
      {
        type: "fix",
        text: "Voice messages no longer render as a tall distorted strip: the bubble is shrink-wrapped and the audio bar has a fixed height so native controls layout correctly.",
        translations: {
          es: "Los mensajes de voz ya no se muestran como una franja alta distorsionada: la burbuja se ajusta al contenido y la barra de audio tiene altura fija para que los controles nativos se vean bien.",
        },
      },
    ],
  },
  {
    version: "1.77.62",
    date: "2026-04-14",
    title: "Voice message player visibility",
    titleTranslations: {
      es: "Visibilidad del reproductor de voz",
    },
    changes: [
      {
        type: "fix",
        text: "Sent voice messages now show the audio controls on a light chip inside the bubble so the native player is visible on colored message backgrounds.",
        translations: {
          es: "Los mensajes de voz enviados muestran los controles de audio sobre una franja clara dentro de la burbuja para que el reproductor nativo se vea sobre fondos de mensaje de color.",
        },
      },
    ],
  },
  {
    version: "1.77.61",
    date: "2026-04-14",
    title: "Blob upload errors",
    titleTranslations: {
      es: "Errores de subida a Blob",
    },
    changes: [
      {
        type: "fix",
        text: "Voice and image uploads now return clearer errors when Vercel Blob reports a missing store or invalid token (re-link Storage → Blob and redeploy).",
        translations: {
          es: "Las subidas de voz e imagen devuelven errores más claros cuando Vercel Blob indica que falta el almacén o el token no es válido (vuelve a vincular Storage → Blob y redespliega).",
        },
      },
    ],
  },
  {
    version: "1.77.60",
    date: "2026-04-14",
    title: "CSP: analytics, ads, and voice preview",
    titleTranslations: {
      es: "CSP: analítica, anuncios y vista previa de voz",
    },
    changes: [
      {
        type: "fix",
        text: "Relaxed Content-Security-Policy so Google Analytics regional collect endpoints and Google Ads measurement requests are not blocked, and so voice message previews can play blob: audio in the browser.",
        translations: {
          es: "Se ajustó la Política de seguridad de contenido para no bloquear los puntos de recogida regionales de Google Analytics ni las peticiones de medición de Google Ads, y para permitir la reproducción de audio blob: en la vista previa de mensajes de voz.",
        },
      },
    ],
  },
  {
    version: "1.77.59",
    date: "2026-04-14",
    title: "Private chat: voice messages",
    titleTranslations: {
      es: "Chat privado: mensajes de voz",
    },
    changes: [
      {
        type: "feature",
        text: "Send voice messages in private chats (up to 1 minute): record in the browser or attach an audio file; playback uses the standard audio controls.",
        translations: {
          es: "Envía mensajes de voz en chats privados (hasta 1 minuto): graba en el navegador o adjunta un archivo de audio; la reproducción usa los controles de audio habituales.",
        },
      },
    ],
  },
  {
    version: "1.77.58",
    date: "2026-04-13",
    title: "Private chat: readable reply previews",
    titleTranslations: {
      es: "Chat privado: vistas previas de respuesta legibles",
    },
    changes: [
      {
        type: "fix",
        text: "Reply quote chips on your own messages and the reply bar above the composer use higher-contrast colors so quoted text stays readable in light and dark themes.",
        translations: {
          es: "Las citas de respuesta en tus mensajes y la barra sobre el compositor usan colores con más contraste para que el texto citado se lea bien en tema claro y oscuro.",
        },
      },
    ],
  },
  {
    version: "1.77.57",
    date: "2026-04-13",
    title: "Independent scopes for dashboard, widget, and Leaf",
    titleTranslations: {
      es: "Ámbitos independientes para panel, widget y Leaf",
    },
    changes: [
      {
        type: "improvement",
        text: "The dashboard portfolio picker and the Device & Widget portfolio setting are independent again: each surface shows totals for its own scope. Use Profile to choose what the Scriptable widget and Leaf display; the home page follows the in-app picker.",
        translations: {
          es: "El selector de cartera del panel y la opción Dispositivo y widget vuelven a ser independientes: cada vista muestra totales para su propio ámbito. Usa Perfil para elegir qué muestran el widget de Scriptable y Leaf; la página principal sigue el selector en la app.",
        },
      },
    ],
  },
  {
    version: "1.77.56",
    date: "2026-04-13",
    title: "Widget scope matches dashboard portfolio",
    titleTranslations: {
      es: "El widget usa la misma cartera que el panel",
    },
    changes: [
      {
        type: "improvement",
        text: "Changing the active portfolio on the dashboard (including mobile) now updates the server preference used by the home screen widget and Leaf device, so totals match what you see on the home page.",
        translations: {
          es: "Al cambiar la cartera activa en el panel (incluido móvil) se actualiza la preferencia en el servidor que usa el widget de la pantalla de inicio y el dispositivo Leaf, de modo que los totales coincidan con la página principal.",
        },
      },
    ],
  },
  {
    version: "1.77.55",
    date: "2026-04-13",
    title: "Admin: raw DB snapshot includes cash and crypto",
    titleTranslations: {
      es: "Admin: instantánea cruda incluye efectivo y cripto",
    },
    changes: [
      {
        type: "improvement",
        text: "The admin raw DB JSON export now includes separate `cash` (`cash_entries` rows) and `crypto` (holdings with asset type crypto) nodes alongside holdings and transactions.",
        translations: {
          es: "La exportación JSON de instantánea cruda en Admin incluye nodos separados `cash` (filas de cash_entries) y `crypto` (posiciones con tipo cripto), además de posiciones y transacciones.",
        },
      },
    ],
  },
  {
    version: "1.77.54",
    date: "2026-04-13",
    title: "Dashboard: overflow shortcuts into More",
    titleTranslations: {
      es: "Panel: accesos que no caben van a Más",
    },
    changes: [
      {
        type: "improvement",
        text: "The dashboard shortcut bar no longer relies on horizontal scrolling: favorite tool chips, News, and Import move into the More ▸ menu when the row would not fit, with News and Import duplicated at the top of that menu when overflowed.",
        translations: {
          es: "La barra de accesos del panel ya no depende del desplazamiento horizontal: los accesos de herramientas favoritas, Noticias e Importar pasan al menú Más ▸ cuando no caben en la fila; Noticias e Importar se repiten arriba en ese menú cuando quedan fuera de la barra.",
        },
      },
    ],
  },
  {
    version: "1.77.53",
    date: "2026-04-13",
    title: "Admin: raw DB snapshot download",
    titleTranslations: {
      es: "Admin: descarga de instantánea cruda de la BD",
    },
    changes: [
      {
        type: "improvement",
        text: "Admin user detail page can download a JSON file of literal holdings, transactions, and transaction-portfolio map rows from the database (optional portfolio filter) for debugging, without merged holdings or read-time transaction fixes.",
        translations: {
          es: "La ficha de usuario en Admin permite descargar un JSON con filas literales de posiciones, transacciones y mapa transacción–cartera (filtro de cartera opcional) para depuración, sin fusionar posiciones ni autocorrecciones al leer transacciones.",
        },
      },
    ],
  },
  {
    version: "1.77.52",
    date: "2026-04-13",
    title: "Dashboard: Views before favorite tools",
    titleTranslations: {
      es: "Panel: Vistas antes de herramientas favoritas",
    },
    changes: [
      {
        type: "fix",
        text: "The Views menu (Portfolio, Diversification, Dividends, Metrics, Growth, Events) now sits right after Tools on the dashboard tab bar, before favorited tool shortcuts, so it stays visible when many tools are starred instead of scrolling off-screen.",
        translations: {
          es: "El menú Vistas (Cartera, Diversificación, Dividendos, Métricas, Crecimiento, Eventos) queda justo después de Herramientas en la barra del panel, antes de los accesos de herramientas favoritas, para que siga visible al marcar muchas herramientas y no quede fuera por el desplazamiento horizontal.",
        },
      },
    ],
  },
  {
    version: "1.77.51",
    date: "2026-04-13",
    title: "Dashboard: favorite tools in tab bar",
    titleTranslations: {
      es: "Panel: herramientas favoritas en la barra",
    },
    changes: [
      {
        type: "improvement",
        text: "Tool favorites from the Tools hub appear as quick links on the dashboard tab bar (after Tools), and the More ▸ tools menu lists favorites first in your saved order.",
        translations: {
          es: "Las herramientas marcadas como favoritas en el hub Herramientas aparecen como accesos rápidos en la barra del panel (después de Herramientas), y el menú Más ▸ herramientas muestra primero los favoritos en el orden guardado.",
        },
      },
    ],
  },
  {
    version: "1.77.50",
    date: "2026-04-13",
    title: "Feature flag: Weekly Portfolio Digest",
    titleTranslations: {
      es: "Feature flag: resumen semanal del portafolio",
    },
    changes: [
      {
        type: "feature",
        text: "Added platform feature flag `weekly_digest_enabled` (on by default): toggle the weekly digest card on the home dashboard and Monday digest emails from Admin → Feature flags, with optional per-user overrides.",
        translations: {
          es: "Nuevo flag de plataforma `weekly_digest_enabled` (activo por defecto): controla la tarjeta del resumen semanal en el inicio y los correos del lunes desde Admin → Feature flags, con anulaciones opcionales por usuario.",
        },
      },
    ],
  },
  {
    version: "1.77.49",
    date: "2026-04-13",
    title: "Weekly digest: clearer holdings delta and baseline",
    titleTranslations: {
      es: "Resumen semanal: delta de posiciones y línea base más claros",
    },
    changes: [
      {
        type: "fix",
        text: "Weekly portfolio digest no longer treats a very old snapshot as the week-start baseline: if the latest holdings snapshot is more than 14 days before the digest week, the headline delta is omitted. Baseline selection uses calendar dates so intraday snapshot rows on the week-start day count correctly. The email and AI prompt explain that the figure is holdings vs a saved snapshot (not realized profit), label the mover as session %, and include estimated net buy flow from ledger trades.",
        translations: {
          es: "El resumen semanal del portafolio ya no usa una instantánea demasiado antigua como línea base: si la última instantánea de posiciones es de más de 14 días antes de la semana del digest, se omite el delta del titular. La línea base usa fechas de calendario para incluir bien las filas intradía. El correo y el prompt de IA aclaran que la cifra es posiciones vs instantánea guardada (no beneficio realizado), etiquetan el movimiento como % de sesión e incluyen el flujo neto de compras estimado desde el libro de operaciones.",
        },
      },
    ],
  },
  {
    version: "1.77.48",
    date: "2026-04-13",
    title: "Mobile dashboard: horizontal shortcut strip",
    titleTranslations: {
      es: "Panel móvil: accesos en franja horizontal",
    },
    changes: [
      {
        type: "improvement",
        text: "Dashboard shortcuts (Holdings, Tools, News, Import, Views, More) stay on one row on small screens: swipe horizontally with a hidden scrollbar; Views and More menus open in a fixed overlay so they are not clipped.",
        translations: {
          es: "Los accesos del panel (Posiciones, Herramientas, Noticias, Importar, Vistas, Más) permanecen en una sola fila en pantallas estrechas: desliza horizontalmente con barra oculta; los menús Vistas y Más se abren en una capa fija para que no se recorten.",
        },
      },
    ],
  },
  {
    version: "1.77.47",
    date: "2026-04-12",
    title: "Header: no secondary nav pill row",
    titleTranslations: {
      es: "Cabecera: sin fila de accesos secundarios",
    },
    changes: [
      {
        type: "improvement",
        text: "Removed the scrollable pill row under the header search (Evolution, Explore, Daily digests, etc.); use the portfolio command strip, Tools, or the user menu to reach those destinations.",
        translations: {
          es: "Se quitó la fila de píldoras bajo la búsqueda del encabezado (Evolución, Explorar, Resúmenes diarios, etc.); usa la barra de cartera, Herramientas o el menú de usuario para ir a esas secciones.",
        },
      },
    ],
  },
  {
    version: "1.77.46",
    date: "2026-04-12",
    title: "Header nav pills without command-strip duplicates",
    titleTranslations: {
      es: "Píldoras de navegación sin duplicar la barra de cartera",
    },
    changes: [
      {
        type: "improvement",
        text: "The main nav pill row under the search bar no longer repeats Home, Tools, and Import — those routes are in the portfolio command strip — so the row lists only Evolution, Explore, Daily digests, Crypto, Indicators, and Network (when enabled).",
        translations: {
          es: "La fila de accesos bajo la búsqueda ya no repite Inicio, Herramientas e Importar (están en la barra de cartera); solo muestra Evolución, Explorar, Resúmenes diarios, Cripto, Indicadores y Red (si aplica).",
        },
      },
    ],
  },
  {
    version: "1.77.45",
    date: "2026-04-12",
    title: "Global portfolio command bar in the header",
    titleTranslations: {
      es: "Barra de cartera global en el encabezado",
    },
    changes: [
      {
        type: "improvement",
        text: "The portfolio strip (Holdings, Tools, News, Import, Views, More, Sync, Add) now lives in the main app header on every page, not only above the dashboard; tab highlights apply on Home and Demo, and choosing a view from other routes navigates to Home with the right tab.",
        translations: {
          es: "La franja de cartera (Posiciones, Herramientas, Noticias, Importar, Vistas, Más, Sincronizar, Añadir) está ahora en el encabezado principal en todas las páginas, no solo encima del panel; el resaltado de pestañas aplica en Inicio y Demo, y desde otras rutas se abre Inicio con la pestaña elegida.",
        },
      },
    ],
  },
  {
    version: "1.77.44",
    date: "2026-04-12",
    title: "Mobile dashboard: same shortcuts menu",
    titleTranslations: {
      es: "Panel móvil: mismos accesos",
    },
    changes: [
      {
        type: "improvement",
        text: "The mobile home and demo dashboards use the same Holdings / Tools / News / Import / Views / More strip as desktop (replacing the long tab row); the header portfolio picker is hidden on those routes to avoid duplication with the dashboard portfolio row.",
        translations: {
          es: "El inicio y la demo en móvil usan la misma franja Posiciones / Herramientas / Noticias / Importar / Vistas / Más que en escritorio (sustituye la fila larga de pestañas); el selector de cartera del encabezado se oculta ahí para no duplicar la fila de cartera del panel.",
        },
      },
    ],
  },
  {
    version: "1.77.43",
    date: "2026-04-12",
    title: "Portfolio switcher on the dashboard bar",
    titleTranslations: {
      es: "Selector de cartera en la barra del panel",
    },
    changes: [
      {
        type: "improvement",
        text: "On the home and demo dashboards (desktop), the active portfolio control moved from the header into the gray strip with Holdings / Sync / Add (Studio theme keeps the sidebar control only).",
        translations: {
          es: "En el inicio y la demo (escritorio), el selector de cartera pasó del encabezado a la franja gris con Posiciones / Sincronizar / Añadir (el tema Studio solo lo muestra en la barra lateral).",
        },
      },
    ],
  },
  {
    version: "1.77.42",
    date: "2026-04-12",
    title: "Header search: live asset suggestions",
    titleTranslations: {
      es: "Búsqueda en cabecera: sugerencias en vivo",
    },
    changes: [
      {
        type: "improvement",
        text: "The header ticker search now shows debounced suggestions (stocks, ETFs, crypto) from the same search API as Explore; pick one to open the asset page, or press Enter to run a full Explore search.",
        translations: {
          es: "La búsqueda de tickers en la cabecera muestra sugerencias con debounce (acciones, ETFs, crypto) con la misma API que Explorar; elige una para abrir el activo o pulsa Intro para buscar en Explorar.",
        },
      },
    ],
  },
  {
    version: "1.77.41",
    date: "2026-04-12",
    title: "Dashboard: shortcuts in the top bar",
    titleTranslations: {
      es: "Panel: accesos en la barra superior",
    },
    changes: [
      {
        type: "improvement",
        text: "Dashboard shortcuts (Holdings, Tools, News, Import, Views, More) now sit in the same strip as Sync and Add, below the header.",
        translations: {
          es: "Los accesos del panel (Posiciones, Herramientas, Noticias, Importar, Vistas, Más) están ahora en la misma franja que Sincronizar y Añadir, debajo del encabezado.",
        },
      },
    ],
  },
  {
    version: "1.77.40",
    date: "2026-04-12",
    title: "Dashboard: one navigation row",
    titleTranslations: {
      es: "Panel: una sola fila de navegación",
    },
    changes: [
      {
        type: "improvement",
        text: "Removed the duplicate portfolio tab strip; Diversification, Dividends, Performance, Growth, and Events are now under the “Views” menu next to Import, alongside Tools and More.",
        translations: {
          es: "Se eliminó la segunda fila de pestañas; Diversificación, Dividendos, Rendimiento, Crecimiento y Eventos están en el menú «Vistas» junto a Importar, con Herramientas y Más.",
        },
      },
    ],
  },
  {
    version: "1.77.39",
    date: "2026-04-12",
    title: "Dashboard: shortcuts to tools, import, and news",
    titleTranslations: {
      es: "Panel: accesos a herramientas, importación y noticias",
    },
    changes: [
      {
        type: "feature",
        text: "The dashboard adds quick shortcuts for Holdings, Tools, News, and Import above the Portfolio views tabs, plus a “More” menu listing every tool from the tools hub (respecting your settings).",
        translations: {
          es: "El panel incluye accesos rápidos a Posiciones, Herramientas, Noticias e Importar encima de las pestañas de vistas del portafolio, y un menú «Más» con todas las herramientas del hub (según tu configuración).",
        },
      },
    ],
  },
  {
    version: "1.77.38",
    date: "2026-04-12",
    title: "Dashboard: single pill row on home",
    titleTranslations: {
      es: "Panel: una sola franja de píldoras en inicio",
    },
    changes: [
      {
        type: "improvement",
        text: "The home and demo dashboard toolbar no longer repeats the global app destinations (Home, Tools, Explore, etc.); only the Portfolio views tab strip appears as the main pill navigation. Use search or the account menu to jump elsewhere.",
        translations: {
          es: "La barra de acciones del panel principal y la demo ya no repite los destinos globales de la app (Inicio, Herramientas, Explorar, etc.); solo la franja de pestañas «Vistas del portafolio» actúa como navegación principal en píldoras. Para ir a otras secciones, usa la búsqueda o el menú de cuenta.",
        },
      },
    ],
  },
  {
    version: "1.77.37",
    date: "2026-04-12",
    title: "Dashboard: one primary pill row on home",
    titleTranslations: {
      es: "Panel: una sola franja de enlaces principales en inicio",
    },
    changes: [
      {
        type: "improvement",
        text: "On the home and demo dashboards (desktop), app-wide navigation pills move to the toolbar row so the sticky header is not a second pill strip above the Portfolio views tabs.",
        translations: {
          es: "En el panel principal y la demo (escritorio), los enlaces de la app pasan a la barra de acciones para que la cabecera no duplique otra franja de píldoras encima de las pestañas «Vistas del portafolio».",
        },
      },
    ],
  },
  {
    version: "1.77.36",
    date: "2026-04-12",
    title: "Dashboard: nav in header, quote freshness by chart",
    titleTranslations: {
      es: "Panel: navegación en cabecera, frescura de cotizaciones junto al gráfico",
    },
    changes: [
      {
        type: "improvement",
        text: "Primary navigation pills live in the app header on every screen (including home and demo); the dashboard toolbar is only quick actions. Quote and holdings sync timestamps appear next to the portfolio value chart.",
        translations: {
          es: "Los enlaces principales de la app están siempre en la cabecera (también en inicio y demo); la barra del panel solo muestra acciones rápidas. Las marcas de cotizaciones y sincronización de posiciones aparecen junto al gráfico de valor del portafolio.",
        },
      },
    ],
  },
  {
    version: "1.77.35",
    date: "2026-04-12",
    title: "Dashboard: clearer navigation layers",
    titleTranslations: {
      es: "Panel: capas de navegación más claras",
    },
    changes: [
      {
        type: "improvement",
        text: "The portfolio tab bar is labeled “Portfolio views” for accessibility (same on mobile), and the app links in the dashboard toolbar use a distinct underline style so they read as site navigation rather than a second set of tabs.",
        translations: {
          es: "La barra de pestañas del portafolio usa la etiqueta accesible «Vistas del portafolio» (también en móvil), y los enlaces de la app en la barra del dashboard tienen un estilo distinto (subrayado) para distinguirlos de las pestañas del panel.",
        },
      },
    ],
  },
  {
    version: "1.77.34",
    date: "2026-04-12",
    title: "Command bar navigation",
    titleTranslations: {
      es: "Barra de navegación tipo command bar",
    },
    changes: [
      {
        type: "improvement",
        text: "The web app header uses a clearer command-bar layout: search and primary destinations as pills on desktop; on smaller screens you get a full-width search plus a horizontal strip of the same destinations. Studio layout matches with compact pills under search.",
        translations: {
          es: "La cabecera web usa un diseño tipo command bar: búsqueda y destinos principales en píldoras en escritorio; en pantallas pequeñas, búsqueda a ancho completo y una franja horizontal con los mismos enlaces. El modo Studio alinea la franja de búsqueda y muestra píldoras compactas debajo.",
        },
      },
      {
        type: "improvement",
        text: "On the home dashboard (and demo), primary navigation pills sit in the dashboard toolbar under the sticky header—next to quotes and sync—so the header stays compact; narrow mobile layouts still show pills in the header.",
        translations: {
          es: "En el panel principal (y en la demo), los enlaces de navegación en píldoras van en la barra del dashboard bajo la cabecera fija, junto a cotizaciones y sincronización, para que el encabezado ocupe menos; en móviles estrechos siguen en la cabecera.",
        },
      },
    ],
  },
  {
    version: "1.77.33",
    date: "2026-04-12",
    title: "Stock page: edit holding tags",
    titleTranslations: {
      es: "Ficha de acción: editar etiquetas de la posición",
    },
    changes: [
      {
        type: "improvement",
        text: "When you own a stock or ETF, you can add or edit portfolio tags directly on the stock detail page (same tags as in Diversification and the position drawer).",
        translations: {
          es: "Si tienes una acción o ETF en cartera, puedes añadir o editar las etiquetas del portafolio en la ficha del activo (las mismas que en Diversificación y en el panel de la posición).",
        },
      },
    ],
  },
  {
    version: "1.77.32",
    date: "2026-04-12",
    title: "Explore: search assets (Yahoo) and moat CTA on stocks",
    titleTranslations: {
      es: "Explorar: búsqueda de activos (Yahoo) y CTA de moat en acciones",
    },
    changes: [
      {
        type: "feature",
        text: "New Explore section in the sidebar: search stocks, ETFs, and (for Pro) crypto via Yahoo Finance-style results, then jump to the asset page. Unsupported crypto symbols show a clear message with a link to the crypto hub; /crypto accepts ?symbol= for supported coins. Pro stock detail pages include a prompt to run moat analysis.",
        translations: {
          es: "Nueva sección Explorar en la barra lateral: busca acciones, ETFs y (en Pro) cripto con resultados al estilo Yahoo Finance y salta a la ficha del activo. Los símbolos cripto no admitidos muestran un mensaje claro con enlace al hub de cripto; /crypto acepta ?symbol= para monedas admitidas. Las fichas de acciones Pro incluyen un acceso para ejecutar el análisis de moat.",
        },
      },
    ],
  },
  {
    version: "1.77.31",
    date: "2026-04-12",
    title: "Portfolio: custom tags and tag-based diversification",
    titleTranslations: {
      es: "Cartera: etiquetas personalizadas y diversificación por etiquetas",
    },
    changes: [
      {
        type: "feature",
        text: "Add optional custom tags to stocks and ETFs; see allocation by tag in Diversification (and the dashboard allocation card), with suggestions from tags you already use. Cash and crypto appear as fixed buckets without tagging.",
        translations: {
          es: "Añade etiquetas opcionales a acciones y ETFs; ve la asignación por etiqueta en Diversificación (y en la tarjeta de asignación del panel), con sugerencias a partir de etiquetas que ya usas. El efectivo y la cripto aparecen como bloques fijos sin etiquetar.",
        },
      },
    ],
  },
  {
    version: "1.77.30",
    date: "2026-04-12",
    title: "Feedback: Linear issue without email",
    titleTranslations: {
      es: "Feedback: issue en Linear sin correo",
    },
    changes: [
      {
        type: "improvement",
        text: "The feedback cron now creates the Linear issue (and marks the row processed) even when the account has no email, so triage is not skipped; acknowledgement email is only sent when an address exists.",
        translations: {
          es: "El cron de feedback ahora crea el issue en Linear (y marca la fila como procesada) aunque la cuenta no tenga correo, para no saltarse el triage; el acuse por correo solo se envía si hay dirección.",
        },
      },
    ],
  },
  {
    version: "1.77.29",
    date: "2026-04-12",
    title: "Dashboard: weekend 1D portfolio chart",
    titleTranslations: {
      es: "Panel: gráfico 1D del fin de semana",
    },
    changes: [
      {
        type: "fix",
        text: "1D portfolio value chart on weekends no longer strips all points when equity markets are closed — snapshot evolution stays visible (markets-closed banner unchanged).",
        translations: {
          es: "El gráfico de valor del portafolio 1D los fines de semana ya no elimina todos los puntos cuando los mercados de renta variable están cerrados: la evolución de las instantáneas sigue visible (el aviso de mercado cerrado se mantiene).",
        },
      },
    ],
  },
  {
    version: "1.77.28",
    date: "2026-04-12",
    title: "Tools: favorite tools synced to account",
    titleTranslations: {
      es: "Herramientas: favoritos sincronizados con la cuenta",
    },
    changes: [
      {
        type: "improvement",
        text: "Favorite tools are stored in the database (per user) so they follow you across devices; existing browser-only favorites migrate once on next visit.",
        translations: {
          es: "Las herramientas favoritas se guardan en la base de datos (por usuario) para que sigan disponibles en todos los dispositivos; los favoritos solo del navegador se migran una vez en la siguiente visita.",
        },
      },
    ],
  },
  {
    version: "1.77.27",
    date: "2026-04-12",
    title: "Tools: favorite tools",
    titleTranslations: {
      es: "Herramientas: favoritos",
    },
    changes: [
      {
        type: "feature",
        text: "Mark tools as favorites from the Tools hub (star control); favorites appear first in the grid and native tool chips stay in sync via local storage.",
        translations: {
          es: "Marca herramientas como favoritas en el hub de Herramientas (control de estrella); los favoritos aparecen primero en la cuadrícula y los chips nativos se sincronizan con almacenamiento local.",
        },
      },
    ],
  },
  {
    version: "1.77.26",
    date: "2026-04-11",
    title: "Build: React.cache shim and react-dom resolution",
    titleTranslations: {
      es: "Compilación: shim React.cache y resolución de react-dom",
    },
    changes: [
      {
        type: "fix",
        text: "Production build: webpack aliases bare `react` imports to a small shim that adds `React.cache` for Next 14.2 dedupe-fetch on React 18, and stops overriding `react-dom` so Next can provide `ReactDOM.preload` during prerender.",
        translations: {
          es: "Compilación de producción: alias de webpack para importaciones de `react` hacia un shim que añade `React.cache` (dedupe-fetch de Next 14.2 en React 18) y sin sobrescribir `react-dom` para que Next pueda exponer `ReactDOM.preload` en prerender.",
        },
      },
    ],
  },
  {
    version: "1.77.25",
    date: "2026-04-11",
    title: "Build: safe dynamic params for admin API routes",
    titleTranslations: {
      es: "Compilación: parámetros dinámicos seguros en rutas API admin",
    },
    changes: [
      {
        type: "fix",
        text: "Next.js build no longer fails collecting page data for dynamic API routes when `context.params` is missing — use `getAppRouteParam` with URL fallback (broker integration requests, refunds, email templates, market digests, support chat, passkeys).",
        translations: {
          es: "La compilación de Next.js ya no falla al recopilar datos cuando `context.params` falta en rutas API dinámicas: `getAppRouteParam` con respaldo por URL (solicitudes de bróker, reembolsos, plantillas, digests, chat de soporte, passkeys).",
        },
      },
    ],
  },
  {
    version: "1.77.24",
    date: "2026-04-11",
    title: "Build: Stripe API version and Tailwind v3 pin",
    titleTranslations: {
      es: "Compilación: versión de API de Stripe y Tailwind v3 fijado",
    },
    changes: [
      {
        type: "fix",
        text: "Align Stripe client apiVersion with stripe-node v22 (2026-03-25.dahlia). Pin tailwindcss to 3.4.x and ignore Dependabot major bumps until Tailwind v4 PostCSS migration.",
        translations: {
          es: "Alineada la apiVersion del cliente Stripe con stripe-node v22 (2026-03-25.dahlia). tailwindcss fijado en 3.4.x; Dependabot ignora major hasta migrar PostCSS a Tailwind v4.",
        },
      },
    ],
  },
  {
    version: "1.77.23",
    date: "2026-04-11",
    title: "Security: social HTML sanitization and cron hardening",
    titleTranslations: {
      es: "Seguridad: sanitización HTML en redes y refuerzo de cron",
    },
    changes: [
      {
        type: "improvement",
        text: "Social posts: rich-text HTML is sanitized on save to reduce stored XSS risk. Cron jobs on production and Vercel preview now require CRON_SECRET to be set (otherwise the endpoint returns an error). Added Dependabot, security audit notes, and optional API smoke tests.",
        translations: {
          es: "Publicaciones sociales: el HTML enriquecido se sanitiza al guardar para reducir riesgo de XSS persistente. Los cron en producción y en preview de Vercel exigen CRON_SECRET (si falta, el endpoint devuelve error). Añadidos Dependabot, notas de auditoría y pruebas de humo opcionales de API.",
        },
      },
    ],
  },
  {
    version: "1.77.22",
    date: "2026-04-11",
    title: "All portfolios: period returns instead of empty chart",
    titleTranslations: {
      es: "Todos los portafolios: rendimientos por periodo en lugar del gráfico vacío",
    },
    changes: [
      {
        type: "improvement",
        text: "When “All Portfolios” is selected, the dashboard shows Pro period returns (1W, 3M, 6M, YTD, 1Y) from combined holdings instead of a blank evolution chart; the snapshot-based chart remains when you pick one portfolio.",
        translations: {
          es: "Al elegir «Todos los portafolios», el panel muestra los rendimientos Pro por periodo (1S, 3M, 6M, YTD, 1A) a partir de las posiciones combinadas en lugar de un gráfico de evolución vacío; el gráfico basado en instantáneas sigue disponible al elegir un portafolio.",
        },
      },
    ],
  },
  {
    version: "1.77.21",
    date: "2026-04-11",
    title: "Daily digests in the app + optional digest email controls",
    titleTranslations: {
      es: "Resúmenes diarios en la app y control opcional del correo de digests",
    },
    changes: [
      {
        type: "feature",
        text: "Market digest reading moved to Daily digests (/daily-digests) with a teaser on the home dashboard; /market-insights redirects there. Mobile bottom nav includes Daily digests.",
        translations: {
          es: "La lectura del resumen de mercado pasa a Resúmenes diarios (/daily-digests) con un aviso en el inicio del panel; /market-insights redirige allí. La barra inferior móvil incluye Resúmenes diarios.",
        },
      },
      {
        type: "improvement",
        text: "Optional env flags: MARKET_DIGEST_EMAIL_BROADCAST_DISABLED blocks bulk market digest email to all users; WEEKLY_DIGEST_EMAIL_DISABLED skips the weekly portfolio digest email while keeping in-app digests. Documented in .env.local.example; admin Market Digests shows a banner when bulk send is off.",
        translations: {
          es: "Variables de entorno opcionales: MARKET_DIGEST_EMAIL_BROADCAST_DISABLED bloquea el envío masivo del resumen de mercado; WEEKLY_DIGEST_EMAIL_DISABLED omite el correo del resumen semanal del portafolio manteniendo los resúmenes en la app. Documentado en .env.local.example; el admin de Market Digests muestra un aviso si el envío masivo está desactivado.",
        },
      },
    ],
  },
  {
    version: "1.77.20",
    date: "2026-04-11",
    title: "Two subscription tiers: Folio + Trefolio",
    titleTranslations: {
      es: "Dos planes de suscripción: Folio y Trefolio",
    },
    changes: [
      {
        type: "improvement",
        text: "Subscriptions are simplified to Folio (free) and Trefolio (paid): one paid plan includes all premium features and limits. Legacy Bifolio subscriptions are treated as Trefolio in the app; Stripe starter price IDs still map to full paid access.",
        translations: {
          es: "Las suscripciones se simplifican a Folio (gratis) y Trefolio (de pago): un plan de pago incluye todas las funciones y límites premium. Las suscripciones antiguas de Bifolio se tratan como Trefolio en la app; los precios de Stripe «starter» siguen mapeando al acceso de pago completo.",
        },
      },
      {
        type: "improvement",
        text: "Removed the 7-day free trial bullet from the Trefolio pricing comparison on the landing page and dashboard upsell card.",
        translations: {
          es: "Se eliminó la viñeta de prueba gratuita de 7 días de la comparación de precios de Trefolio en la página de inicio y en la tarjeta de mejora del panel.",
        },
      },
    ],
  },
  {
    version: "1.77.19",
    date: "2026-04-10",
    title: "Alpha Vantage behind feature flag (FMP-only mode)",
    titleTranslations: {
      es: "Alpha Vantage tras bandera de función (solo FMP)",
    },
    changes: [
      {
        type: "improvement",
        text: "Admins can turn off the new “Alpha Vantage: allow fallback” flag so premium market data uses only Financial Modeling Prep (all surfaces), the event-sync cron skips AV earnings CSV, and no Alpha Vantage calls are made — ready for removing the integration when FMP covers your deployment.",
        translations: {
          es: "Los administradores pueden desactivar la nueva bandera «Alpha Vantage: permitir respaldo» para que los datos de mercado premium usen solo Financial Modeling Prep (todas las superficies), el cron de event-sync omita el CSV de resultados de AV y no se llame a Alpha Vantage — listo para retirar la integración cuando FMP cubra el despliegue.",
        },
      },
    ],
  },
  {
    version: "1.77.18",
    date: "2026-04-10",
    title: "Admin: grant membership by email with activation",
    titleTranslations: {
      es: "Admin: conceder membresía por correo con activación",
    },
    changes: [
      {
        type: "feature",
        text: "Admins can grant Bifolio or Trefolio for a number of days from the user detail page. The user receives a localized transactional email and must tap Activate before the period starts; users with an active Stripe subscription are blocked until billing is managed in Stripe.",
        translations: {
          es: "Los administradores pueden conceder Bifolio o Trefolio por un número de días desde la ficha del usuario. El usuario recibe un correo transaccional localizado y debe pulsar Activar antes de que empiece el periodo; quien tenga suscripción activa en Stripe queda bloqueado hasta gestionar la facturación en Stripe.",
        },
      },
    ],
  },
  {
    version: "1.77.17",
    date: "2026-04-10",
    title: "Respect email opt-out on all marketing sends",
    titleTranslations: {
      es: "Respeto del opt-out de email en todos los envíos de marketing",
    },
    changes: [
      {
        type: "fix",
        text: "Marketing and template emails (digests, trial invites, welcome/upgrade flows, Trustpilot follow-ups, and admin template sends) no longer go out after a user unsubscribes or disables email notifications. Transactional mail—verification, price alerts, refund/broker confirmations, and feedback acknowledgements—still delivers as before.",
        translations: {
          es: "Los correos de marketing y plantillas (digest, invitaciones de prueba, bienvenida/upsell, seguimiento Trustpilot y envíos desde plantillas de admin) ya no se envían si el usuario canceló la suscripción o desactivó las notificaciones por email. El correo transaccional (verificación, alertas de precio, confirmaciones de reembolso/broker y acuses de feedback) sigue igual.",
        },
      },
      {
        type: "fix",
        text: "Marketing opt-out is applied in sendEmail before the Resend API key check, so digest and other flows no longer skip unsubscribe when email is disabled in dev or when Resend is not configured. Market Insight digest sends skip opted-out users before portfolio stats.",
        translations: {
          es: "El opt-out de marketing se aplica en sendEmail antes de comprobar la clave de Resend, así que el digest y otros flujos ya no omiten la baja cuando el correo está desactivado en desarrollo o sin Resend. Los envíos de Market Insight omiten a quien se dio de baja antes de las estadísticas del portafolio.",
        },
      },
      {
        type: "improvement",
        text: "Marketing email suppression uses the same preference for every plan (free, starter, pro). If userId is omitted, the recipient is resolved by email so unsubscribe still applies.",
        translations: {
          es: "La supresión de correo de marketing usa la misma preferencia en todos los planes (gratis, starter, pro). Si falta userId, el destinatario se resuelve por email para que la baja siga aplicándose.",
        },
      },
    ],
  },
  {
    version: "1.77.16",
    date: "2026-04-10",
    title: "German, French, Portuguese & Dutch UI copy",
    titleTranslations: {
      es: "Textos de interfaz en alemán, francés, portugués y neerlandés",
    },
    changes: [
      {
        type: "improvement",
        text: "German, French, European Portuguese, and Dutch locale files now include full UI string tables (no English fallback from spread). A maintenance script can refresh gaps using OpenAI; several upsell, empty-state, and growth-tab strings were hand-polished.",
        translations: {
          es: "Los archivos de alemán, francés, portugués europeo y neerlandés incluyen tablas completas de cadenas de interfaz (sin respaldo en inglés vía spread). Un script de mantenimiento puede rellenar lagunas con OpenAI; varias cadenas de upsell, estado vacío y pestaña de crecimiento se revisaron a mano.",
        },
      },
    ],
  },
  {
    version: "1.77.15",
    date: "2026-04-10",
    title: "Feedback completion email: customer-only copy",
    titleTranslations: {
      es: "Correo de cierre de feedback: solo texto para el cliente",
    },
    changes: [
      {
        type: "improvement",
        text: "When a feedback-linked task is completed, the default completion email draft no longer mentions internal tools or ticket details; it thanks the user, explains we acted on their feedback, and invites them back to trefolio with a clear call to open the app.",
        translations: {
          es: "Cuando se completa una tarea vinculada a un comentario, el borrador de correo de cierre ya no menciona herramientas internas ni detalles de tickets; agradece, indica que actuamos sobre su feedback e invita a volver a trefolio con un botón claro para abrir la app.",
        },
      },
    ],
  },
  {
    version: "1.77.14",
    date: "2026-04-10",
    title: "Snapshot backfill NOT NULL fix",
    titleTranslations: {
      es: "Corrección NOT NULL en backfill de snapshots",
    },
    changes: [
      {
        type: "fix",
        text: "Portfolio snapshot backfill no longer fails with SQLITE_CONSTRAINT on total_invested_eur when intraday rows exist but no matching daily row was written (scalar subqueries now COALESCE). Live snapshot writes coerce non-finite totals to 0 so inserts never bind NULL.",
        translations: {
          es: "El backfill de snapshots del portafolio ya no falla con SQLITE_CONSTRAINT en total_invested_eur cuando hay filas intradía pero no hay fila diaria (las subconsultas usan COALESCE). Las escrituras de snapshot en vivo convierten totales no finitos a 0 para no insertar NULL.",
        },
      },
    ],
  },
  {
    version: "1.77.13",
    date: "2026-04-10",
    title: "AI import: position-only rows (e.g. bonds)",
    titleTranslations: {
      es: "Importación IA: filas solo de posición (p. ej. bonos)",
    },
    changes: [
      {
        type: "fix",
        text: "AI portfolio import now creates holdings from the holdings list even when transactions were also extracted, so bonds and other position-only rows (e.g. Italian BTP with ISIN) are no longer dropped. Extraction accepts ISIN as ticker when no symbol exists.",
        translations: {
          es: "La importación por IA ahora crea posiciones a partir de la lista de holdings aunque también haya transacciones, de modo que bonos y otras filas solo de posición (p. ej. BTP italiano con ISIN) ya no se descartan. La extracción acepta el ISIN como ticker si no hay símbolo.",
        },
      },
    ],
  },
  {
    version: "1.77.12",
    date: "2026-04-10",
    title: "Private chat invites and admin link limits",
    titleTranslations: {
      es: "Invitaciones al chat privado y límites en enlaces de admin",
    },
    changes: [
      {
        type: "feature",
        text: "Network direct messages now require the recipient to accept an invitation before they can read or send messages; opening a shared URL alone no longer adds you to a 1:1 social chat. Link-based admin chat rooms are capped at two participants, and admins can remove a participant from those rooms.",
        translations: {
          es: "Los mensajes directos en la red exigen que el destinatario acepte una invitación antes de leer o enviar; abrir solo un enlace ya no te une a un chat social 1:1. Las salas por enlace del administrador admiten como máximo dos participantes y el administrador puede expulsar a un participante.",
        },
      },
      {
        type: "improvement",
        text: "Sector diversification with ETF sector breakdown enabled now merges Yahoo fund sector keys (e.g. realestate) with stock sector names (e.g. Real Estate) so the same sector no longer appears twice.",
        translations: {
          es: "En la diversificación por sector con desglose sectorial de ETF activado, las claves de sector de los fondos de Yahoo (p. ej. realestate) se unifican con los nombres de sector de las acciones (p. ej. Real Estate) para que el mismo sector no aparezca duplicado.",
        },
      },
    ],
  },
  {
    version: "1.77.11",
    date: "2026-04-10",
    title: "Feedback pipeline and Linear integration",
    titleTranslations: {
      es: "Pipeline de feedback e integración con Linear",
    },
    changes: [
      {
        type: "feature",
        text: "User feedback left open for 6+ hours is automatically acknowledged by email, tracked as a structured Linear issue, and can be closed with a second email drafted when the issue moves to Done (admin reviews and sends from the Feedback admin tab).",
        translations: {
          es: "Los comentarios que siguen abiertos más de 6 horas reciben un acuse por correo, se registran como tarea en Linear con plantilla estructurada y pueden cerrarse con un segundo correo cuando el issue pasa a Hecho (el admin revisa y envía desde la pestaña Feedback).",
        },
      },
    ],
  },
  {
    version: "1.77.10",
    date: "2026-04-10",
    title: "Fix asset type for misclassified funds",
    titleTranslations: {
      es: "Corregir tipo de activo en fondos mal clasificados",
    },
    changes: [
      {
        type: "improvement",
        text: "When a holding is saved as a stock but market data or the name indicates an ETF, the stock drawer and stock detail page show a one-click “Set as ETF” action plus an explicit asset-type control so imports can be corrected without re-entering the full edit form.",
        translations: {
          es: "Si una posición está como acción pero los datos o el nombre indican un ETF, el panel del valor y la página de detalle muestran «Marcar como ETF» con un clic y un control de tipo de activo para corregir importaciones sin rellenar todo el formulario de edición.",
        },
      },
      {
        type: "improvement",
        text: "Portfolio tab: “Review types” opens a bulk editor (desktop holdings table, mobile portfolio, and /portfolio page) with suggested misclassified ETFs and per-row saves, plus “Set all suggested as ETF” for one pass.",
        translations: {
          es: "Pestaña Portafolio: «Revisar tipos» abre un editor por lotes (tabla en escritorio, portafolio móvil y página /portfolio) con ETF mal clasificados sugeridos y guardado por fila, además de «Marcar todos los sugeridos como ETF».",
        },
      },
    ],
  },
  {
    version: "1.77.9",
    date: "2026-04-10",
    title: "Full UI string coverage per language",
    titleTranslations: {
      es: "Cobertura completa de cadenas de interfaz por idioma",
    },
    changes: [
      {
        type: "improvement",
        text: "Every supported language now resolves all UI translation keys: partial locales merge with English as a base, and Spanish includes the latest landing and upsell strings. A parity test ensures new keys cannot ship only in English.",
        translations: {
          es: "Los idiomas soportados resuelven todas las claves de traducción de la interfaz: los locales parciales se fusionan con el inglés como base, y el español incluye las últimas cadenas de landing y upsell. Un test de paridad evita que nuevas claves solo lleguen en inglés.",
        },
      },
    ],
  },
  {
    version: "1.77.8",
    date: "2026-04-10",
    title: "Admin impersonation",
    titleTranslations: { es: "Suplantación de usuario para administradores" },
    changes: [
      {
        type: "feature",
        text: "Admins can open a real signed-in session as another user from the admin user detail page (non-admin accounts only), with a clear banner and one-click return to the admin panel. Impersonation is audited and does not update the user’s last-active timestamp.",
        translations: {
          es: "Los administradores pueden abrir una sesión real como otro usuario desde el detalle de usuario en admin (solo cuentas no administrador), con un banner visible y un clic para volver al panel. La suplantación queda registrada y no actualiza la marca de última actividad del usuario.",
        },
      },
    ],
  },
  {
    version: "1.77.7",
    date: "2026-04-10",
    title: "Event calendar FMP hydration",
    titleTranslations: { es: "Hidratación FMP del calendario de eventos" },
    changes: [
      {
        type: "fix",
        text: "Economic events, IPOs, and stock splits on the Event Calendar load reliably: when the database had no rows for the selected month, the app now pulls Financial Modeling Prep calendar data on demand (same source as the daily cron), and FMP JSON responses are parsed more defensively.",
        translations: {
          es: "Los eventos económicos, OPVs y splits en el calendario cargan de forma fiable: si la base no tenía filas para el mes elegido, la app obtiene ahora los datos del calendario de Financial Modeling Prep bajo demanda (misma fuente que el cron diario) y el JSON de FMP se analiza de forma más robusta.",
        },
      },
    ],
  },
  {
    version: "1.77.6",
    date: "2026-04-09",
    title: "ETF allocation and dividend calendar",
    titleTranslations: { es: "Asignación de ETF y calendario de dividendos" },
    changes: [
      {
        type: "improvement",
        text: "Sector allocation (Taxonomy and Rebalancing) can use ETF sector look-through from fund data: toggle “Use ETF sector breakdown” to split ETFs across underlying sectors instead of a single label per position.",
        translations: {
          es: "La asignación por sector (Taxonomía y Rebalanceo) puede usar el desglose sectorial del ETF: activa «Usar desglose sectorial del ETF» para repartir los fondos entre sectores subyacentes en lugar de una sola etiqueta por posición.",
        },
      },
      {
        type: "fix",
        text: "Ex-dividend calendar: tickers that Yahoo does not return now fall back to premium or Alpha Vantage per ticker, so ETFs are no longer skipped when other holdings already have Yahoo calendar events.",
        translations: {
          es: "Calendario ex-dividendos: los valores que Yahoo no devuelve usan ahora el respaldo premium o Alpha Vantage por ticker, de modo que los ETF no se omiten cuando otras posiciones ya tienen eventos de Yahoo.",
        },
      },
      {
        type: "improvement",
        text: "Playwright E2E: when the test runner starts the app (E2E=1), signup/login skip Redis rate limits and Turnstile so production-mode next start can run the full suite locally; disabled on Vercel production.",
        translations: {
          es: "Playwright E2E: si el runner arranca la app (E2E=1), registro e inicio omiten límites Redis y Turnstile para poder ejecutar la suite con next start en modo producción; desactivado en producción de Vercel.",
        },
      },
    ],
  },
  {
    version: "1.77.5",
    date: "2026-04-09",
    title: "Market data rollout",
    titleTranslations: { es: "Despliegue de datos de mercado" },
    changes: [
      {
        type: "improvement",
        text: "Premium market data can use Financial Modeling Prep (FMP) behind the scenes: admins enable per-surface rollout flags, the app no longer exposes a provider in search URLs, and settings show when FMP or Alpha Vantage is configured. Privacy Policy lists FMP as a processor.",
        translations: {
          es: "Los datos de mercado premium pueden usar Financial Modeling Prep (FMP) internamente: los administradores activan banderas por superficie, la app ya no expone el proveedor en las URLs de búsqueda y los ajustes indican si FMP o Alpha Vantage está configurado. La política de privacidad incluye a FMP como encargado del tratamiento.",
        },
      },
      {
        type: "fix",
        text: "Admin → Feature flags now shows the \"Market data (FMP)\" section so rollout toggles are visible.",
        translations: {
          es: "Administración → Banderas de función muestra la sección «Datos de mercado (FMP)» para que las opciones de despliegue sean visibles.",
        },
      },
    ],
  },
  {
    version: "1.77.4",
    date: "2026-04-09",
    title: "Saved strategies",
    titleTranslations: { es: "Estrategias guardadas" },
    changes: [
      {
        type: "feature",
        text: "Strategies you build in Tools → Strategies are now saved: purchase reference, target and stop prices, and links to the alerts you create—reload a ticker anytime from your saved list. Data is described in the Privacy Policy.",
        translations: {
          es: "Las estrategias que creas en Herramientas → Estrategias se guardan: precio de compra de referencia, objetivo y stop, y enlaces a las alertas creadas; puedes volver a abrir un valor desde la lista guardada. Los datos se describen en la Política de privacidad.",
        },
      },
    ],
  },
  {
    version: "1.77.3",
    date: "2026-04-09",
    title: "Strategies tool",
    titleTranslations: { es: "Herramienta Estrategias" },
    changes: [
      {
        type: "feature",
        text: "New Strategies tool under Tools: search a stock, see a live quote and moat valuation snapshot, set take-profit and optional stop-loss levels, and create matching price alerts (delivery uses your notification channels from Profile). A static design preview remains at /preview/strategies.",
        translations: {
          es: "Nueva herramienta Estrategias en Herramientas: busca un valor, cotización en vivo y resumen de moat, define toma de beneficios y stop-loss opcional, y crea alertas de precio (el envío usa tus canales en Perfil). Vista de diseño estática en /preview/strategies.",
        },
      },
      {
        type: "improvement",
        text: "Strategies: target price is explicit (with analyst consensus shown on the quote row when available); the target field prefills from analyst consensus when empty.",
        translations: {
          es: "Estrategias: el precio objetivo es explícito (consenso de analistas en la fila de cotización si hay datos); el campo se rellena con el consenso si está vacío.",
        },
      },
    ],
  },
  {
    version: "1.77.2",
    date: "2026-04-08",
    title: "Moat report tags",
    titleTranslations: { es: "Etiquetas en informes de moat" },
    changes: [
      {
        type: "feature",
        text: "Saved moat reports support optional tags: add labels when saving from the moat screener or the evaluation page, filter your saved list so reports must include every selected tag (AND), and edit tags on saved rows.",
        translations: {
          es: "Los informes de moat guardados admiten etiquetas opcionales: añade etiquetas al guardar desde el buscador de moat o la página de evaluación, filtra la lista guardada para que el informe incluya todas las etiquetas seleccionadas (Y), y edita etiquetas en cada fila.",
        },
      },
    ],
  },
  {
    version: "1.77.1",
    date: "2026-04-08",
    title: "Event calendar data coverage",
    titleTranslations: { es: "Cobertura de datos del calendario de eventos" },
    changes: [
      {
        type: "improvement",
        text: "Desktop header navigation: primary links (Home, Evolution, Import, Tools) stay in the top bar; Market Insights, Crypto, Indicators, and Network move under a More menu — matching the mobile overflow pattern, avoiding horizontal page scroll, with flex layout fixes (min-w-0) and an accessible disclosure control.",
        translations: {
          es: "Navegación de escritorio: enlaces principales (Inicio, Evolución, Importar, Herramientas) en la barra superior; Mercado, Cripto, Indicadores y Red van al menú Más — alineado con el desbordamiento móvil, sin scroll horizontal de página, con flex (min-w-0) y un control accesible.",
        },
      },
      {
        type: "improvement",
        text: "Clearer navigation between the app header and dashboard: Home in the top bar (was duplicated as Portfolio), Holdings as the first dashboard tab, a small Views label above the tab strip, Evolution (/portfolio) visible on desktop, and ?tab= deep links for dashboard sections (back/forward and sharing).",
        translations: {
          es: "Navegación más clara entre la cabecera y el panel: Inicio en la barra superior (antes duplicado como Portafolio), Posiciones como primera pestaña, una etiqueta Vistas sobre las pestañas, Evolución (/portfolio) visible en escritorio, y enlaces profundos ?tab= para las secciones (atrás/adelante y compartir).",
        },
      },
      {
        type: "improvement",
        text: "Navigation uses one shared config for the top bar, studio sidebar, and mobile tab bar — consistent section order (Insights before Crypto), a More menu on mobile for Market Insights, Indicators, Crypto, Network, and Profile, and clearer labels (Evolution vs return metrics in Tools).",
        translations: {
          es: "La navegación usa una configuración única para la barra superior, la barra lateral studio y la barra móvil — orden de secciones coherente (Insights antes que Cripto), menú Más en móvil para Mercado, Indicadores, Cripto, Red y Perfil, y etiquetas más claras (Evolución frente a métricas de rentabilidad en Herramientas).",
        },
      },
      {
        type: "improvement",
        text: "Tools hub: single tools registry drives routes, cards, and native tool lists; category headings inside each plan section; Planning translated; native app lists all non-interactive tools with links to open them in the app.",
        translations: {
          es: "Herramientas: un registro único define rutas, tarjetas y listas nativas; subtítulos por categoría en cada sección de plan; Planificación traducida; en la app nativa se listan todas las herramientas no interactivas con enlaces para abrirlas en la app.",
        },
      },
      {
        type: "improvement",
        text: "Event calendar sync now pulls economic, IPO, and stock split data for about 90 days ahead (and the past week), so the Events tab is more likely to show data for the month you are viewing.",
        translations: {
          es: "La sincronización del calendario de eventos ahora obtiene datos económicos, de OPV y divisiones de acciones para unos 90 días hacia adelante (y la semana pasada), para que la pestaña Eventos muestre mejor los datos del mes que ves.",
        },
      },
      {
        type: "improvement",
        text: "The admin email template library includes a Moat Screener introduction template (English, Spanish, and major EU languages) for manual sends from the user admin page.",
        translations: {
          es: "La biblioteca de plantillas de email de administración incluye una plantilla de presentación del buscador de moat (inglés, español e idiomas principales de la UE) para envíos manuales desde la página de administración de usuarios.",
        },
      },
    ],
  },
  {
    version: "1.77.0",
    date: "2026-04-07",
    title: "Stock Splits Calendar",
    titleTranslations: { es: "Calendario de Divisiones de Acciones" },
    changes: [
      {
        type: "feature",
        text: "Stock splits now appear in the event calendar — synced daily from FMP with reverse splits highlighted for opportunity screening. Available on Pro.",
        translations: {
          es: "Las divisiones de acciones ahora aparecen en el calendario de eventos — sincronizadas diariamente desde FMP con splits inversos destacados para búsqueda de oportunidades. Disponible en Pro.",
        },
      },
    ],
  },
  {
    version: "1.76.0",
    date: "2026-04-07",
    title: "Analyst Consensus & News Sentiment on Moat Page",
    titleTranslations: { es: "Consenso de Analistas y Sentimiento de Noticias en la Página de Moat" },
    changes: [
      {
        type: "feature",
        text: "Moat evaluation now shows analyst consensus: price target with upside/downside vs current price, rating distribution bar, and weighted consensus label.",
        translations: {
          es: "La evaluación de moat ahora muestra el consenso de analistas: precio objetivo con potencial alcista/bajista, barra de distribución de calificaciones y etiqueta de consenso ponderada.",
        },
      },
      {
        type: "feature",
        text: "News sentiment section on moat page: load on-demand to see aggregated sentiment score and recent headlines with per-article sentiment badges.",
        translations: {
          es: "Sección de sentimiento de noticias en la página de moat: carga bajo demanda para ver la puntuación de sentimiento agregada y titulares recientes con insignias de sentimiento por artículo.",
        },
      },
      {
        type: "feature",
        text: "Dividend yield, dividend per share, and a 5-year dividends vs buybacks breakdown now appear in the analyst consensus section of moat evaluations.",
        translations: {
          es: "Rentabilidad por dividendo, dividendo por acción y un desglose de 5 años de dividendos vs recompras ahora aparecen en la sección de consenso de analistas de las evaluaciones de moat.",
        },
      },
    ],
  },
  {
    version: "1.75.0",
    date: "2026-04-06",
    title: "Automatic Moat Generation & Admin Controls",
    titleTranslations: { es: "Generación Automática de Moat y Controles de Admin" },
    changes: [
      {
        type: "fix",
        text: "Fixed weekly portfolio digest showing inflated week change by incorrectly counting cash balance as a weekly gain.",
        translations: {
          es: "Corregido el resumen semanal del portafolio que mostraba un cambio semanal inflado al contar incorrectamente el saldo en efectivo como ganancia semanal.",
        },
      },
      {
        type: "feature",
        text: "Automatic moat generation: a background cron evaluates all 600+ screener-universe stocks on a rolling 7-day cycle, so the moat screener is always pre-populated with fresh scores.",
        translations: {
          es: "Generación automática de moat: un cron en segundo plano evalúa más de 600 acciones del universo del screener en un ciclo de 7 días, para que el buscador de moat siempre tenga puntuaciones actualizadas.",
        },
      },
      {
        type: "feature",
        text: "Admin moat controls: add custom tickers to the auto-generation queue, monitor coverage and staleness, and trigger manual sync runs from the admin settings panel.",
        translations: {
          es: "Controles admin de moat: añade tickers personalizados a la cola de generación automática, monitoriza cobertura y antigüedad, y activa ejecuciones manuales desde el panel de ajustes admin.",
        },
      },
    ],
  },
  {
    version: "1.74.0",
    date: "2026-04-06",
    title: "Shared Moat Cache & Moat Screener",
    titleTranslations: { es: "Caché Compartida de Moat y Buscador de Moat" },
    changes: [
      {
        type: "feature",
        text: "Moat evaluations are now globally cached — once any user evaluates a stock, the result is instantly available for everyone. No duplicate API calls, faster access for the whole community.",
        translations: {
          es: "Las evaluaciones de moat ahora se cachean globalmente — cuando cualquier usuario evalúa una acción, el resultado está disponible para todos. Sin llamadas API duplicadas, acceso más rápido para toda la comunidad.",
        },
      },
      {
        type: "feature",
        text: "New Moat Screener: filter and search all previously evaluated stocks by moat score, individual criteria (pass/warning/fail), and sector. Find high-moat stocks at a glance.",
        translations: {
          es: "Nuevo Buscador de Moat: filtra y busca todas las acciones evaluadas por puntuación de moat, criterios individuales (aprobado/advertencia/fallo) y sector. Encuentra acciones con alto moat de un vistazo.",
        },
      },
      {
        type: "improvement",
        text: "Cached evaluations show a 'Cached' badge with date. Use 'Regenerate Report' to force a fresh evaluation from Alpha Vantage.",
        translations: {
          es: "Las evaluaciones en caché muestran una insignia 'En caché' con fecha. Usa 'Regenerar Informe' para forzar una evaluación nueva de Alpha Vantage.",
        },
      },
    ],
  },
  {
    version: "1.73.0",
    date: "2026-04-06",
    title: "Moat Reports & Portfolio Evaluation",
    titleTranslations: { es: "Informes de Moat y Evaluación de Cartera" },
    changes: [
      {
        type: "feature",
        text: "Save moat evaluation reports so you can revisit them later like files — each report stores the full quantitative analysis and AI narrative. Open, regenerate, or delete saved reports from the evaluation picker.",
        translations: {
          es: "Guarda informes de evaluación de moat para revisarlos después como archivos — cada informe almacena el análisis cuantitativo completo y la narrativa IA. Abre, regenera o elimina informes guardados desde el selector de evaluación.",
        },
      },
      {
        type: "feature",
        text: "Evaluate My Portfolio: one-click CTA to run a Buffett-style moat evaluation on all your current holdings at once, with a progress bar tracking each stock.",
        translations: {
          es: "Evaluar Mi Cartera: un CTA para ejecutar una evaluación de moat al estilo Buffett en todas tus posiciones actuales, con una barra de progreso para cada acción.",
        },
      },
      {
        type: "improvement",
        text: "Each evaluation criterion card now has an info icon that reveals what the metric means and why Buffett considers it important.",
        translations: {
          es: "Cada tarjeta de criterio de evaluación ahora tiene un icono de información que explica qué significa la métrica y por qué Buffett la considera importante.",
        },
      },
      {
        type: "improvement",
        text: "Moat evaluation reports now show the live stock price, daily change, and percent change next to the company name.",
        translations: {
          es: "Los informes de evaluación de moat ahora muestran el precio de la acción en tiempo real, cambio diario y porcentaje junto al nombre de la empresa.",
        },
      },
    ],
  },
  {
    version: "1.72.0",
    date: "2026-04-06",
    title: "Competitive Moat Evaluation",
    titleTranslations: { es: "Evaluación de Ventaja Competitiva" },
    changes: [
      {
        type: "feature",
        text: "Buffett-style Competitive Moat Evaluation: select any stock and get a comprehensive assessment of its sustainable competitive advantage across 8 criteria (earnings consistency, gross margin, net margin, retained earnings, ROE, debt sustainability, CapEx efficiency, and product durability). Includes an AI-powered narrative assessment that explains the moat analysis in plain language. Pro tier only.",
        translations: {
          es: "Evaluación de Ventaja Competitiva al estilo Buffett: selecciona cualquier acción y obtén una evaluación integral de su ventaja competitiva sostenible en 8 criterios (consistencia de beneficios, margen bruto, margen neto, beneficios retenidos, ROE, sostenibilidad de deuda, eficiencia de CapEx y durabilidad del producto). Incluye una evaluación narrativa con IA que explica el análisis en lenguaje sencillo. Solo nivel Pro.",
        },
      },
    ],
  },
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
