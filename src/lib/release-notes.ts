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
    version: "2.5.259",
    date: "2026-08-28",
    title: "Alerts always in the notification center",
    titleTranslations: {
      es: "Las alertas siempre en el centro de notificaciones",
    },
    changes: [
      {
        type: "feature",
        text: "Fired price alerts always appear in the in-app notification center (bell), in addition to any email, push, Telegram, or device channels you enable. Optional channel prefs no longer gate the in-app copy.",
        translations: {
          es: "Las alertas de precio activadas siempre aparecen en el centro de notificaciones (campana), además de los canales de email, push, Telegram o dispositivo que tengas activados. Las preferencias de canal opcionales ya no bloquean la copia in-app.",
        },
      },
    ],
  },
  {
    version: "2.5.258",
    date: "2026-08-28",
    title: "Agent board (Pizarra)",
    titleTranslations: {
      es: "Pizarra de agentes",
    },
    changes: [
      {
        type: "feature",
        text: "New opt-in Home Pizarra widget: Warren and Clara post AI-picked updates from your portfolio news, movers, catalysts, alerts, FinPulse, recommendations, market digests, and Clara savings — with history so messages do not repeat. Runs on a cron only when the board is enabled. Not financial advice.",
        translations: {
          es: "Nueva Pizarra opt-in en Home: Warren y Clara publican avisos elegidos por IA a partir de noticias de tu cartera, movimientos, catalizadores, alertas, FinPulse, recomendaciones, resúmenes de mercado y ahorros en Clara — con historial para no repetir mensajes. Solo corre en cron si la pizarra está activada. No es asesoramiento financiero.",
        },
      },
      {
        type: "improvement",
        text: "Pizarra cron piggybacks on check-alerts (every 15 minutes) instead of a separate Vercel cron; the standalone route remains for manual runs.",
        translations: {
          es: "El cron de Pizarra se ejecuta junto a check-alerts (cada 15 minutos) en lugar de un cron Vercel aparte; la ruta independiente sigue disponible para ejecuciones manuales.",
        },
      },
    ],
  },
  {
    version: "2.5.257",
    date: "2026-08-28",
    title: "Clara month balance on Home",
    titleTranslations: {
      es: "Balance del mes de Clara en Home",
    },
    changes: [
      {
        type: "improvement",
        text: "The Home money desk Clara pulse now shows month balance (income minus planned expenses) instead of emergency-fund surplus. Setup and on-track states replace ambiguous €0.00. Safe surplus still powers the Warren handoff.",
        translations: {
          es: "El pulso de Clara en la mesa de dinero de Home muestra el balance del mes (ingresos menos gastos planificados) en lugar del superávit del colchón. Los estados de configuración y en equilibrio sustituyen el €0,00 ambiguo. El superávit seguro sigue alimentando el handoff de Warren.",
        },
      },
    ],
  },
  {
    version: "2.5.256",
    date: "2026-08-28",
    title: "Money desk behind a flag",
    titleTranslations: {
      es: "Mesa de dinero detrás de un flag",
    },
    changes: [
      {
        type: "feature",
        text: "The Home Warren × Clara money desk is gated by feature flag home_money_desk (off by default). When off, separate Warren and Clara cards stay on Home.",
        translations: {
          es: "La mesa de dinero Warren × Clara en Home queda detrás del feature flag home_money_desk (apagado por defecto). Si está off, Home sigue con las tarjetas separadas de Warren y Clara.",
        },
      },
    ],
  },
  {
    version: "2.5.255",
    date: "2026-08-28",
    title: "Clover talks to Clara",
    titleTranslations: {
      es: "Clover habla con Clara",
    },
    changes: [
      {
        type: "feature",
        text: "Clover and Warren can now ask Clara in chat — spending, cashflow, and savings detail — the same way Clara already asks Warren about your portfolio. If you don’t have Clara yet, they still offer to create your space. Counts against trefolio AI consults, not Clara’s daily cap. Not financial advice.",
        translations: {
          es: "Clover y Warren ya pueden preguntar a Clara en el chat — gastos, caja y ahorros — igual que Clara ya pregunta a Warren por tu cartera. Si aún no tienes Clara, te proponen crear tu espacio. Cuenta contra las consultas IA de trefolio, no contra el tope diario de Clara. No es asesoramiento financiero.",
        },
      },
    ],
  },
  {
    version: "2.5.254",
    date: "2026-08-28",
    title: "Home money desk",
    titleTranslations: {
      es: "Mesa de dinero en Home",
    },
    changes: [
      {
        type: "feature",
        text: "Home now opens with a Warren × Clara money desk: markets today next to month surplus, Clara account onboarding, and empty-portfolio states. On mobile the desk is first. Not financial advice.",
        translations: {
          es: "Home abre con una mesa de dinero Warren × Clara: mercados de hoy junto al superávit del mes, alta de Clara y estados sin cartera. En móvil la mesa va primero. No es asesoramiento financiero.",
        },
      },
    ],
  },
  {
    version: "2.5.253",
    date: "2026-08-28",
    title: "Clover — one assistant",
    titleTranslations: {
      es: "Clover — un solo asistente",
    },
    changes: [
      {
        type: "feature",
        text: "Meet Clover, trefolio’s default AI assistant: one chat that orchestrates Warren (portfolio) and Clara (personal finance) behind the scenes. New users see only Clover; if you already used Warren, both stay available. Connect @cloveraiassistant_bot from Profile when configured — Telegram is Warren + Clara through Clover. If you don’t have Clara yet, Clover proposes creating your Clara space. Not financial advice.",
        translations: {
          es: "Conoce a Clover, el asistente IA por defecto de trefolio: un solo chat que orquesta a Warren (cartera) y Clara (finanzas personales) por detrás. Los usuarios nuevos solo ven Clover; si ya usabas Warren, siguen ambos. Conecta @cloveraiassistant_bot desde Perfil cuando esté configurado — en Telegram tienes Warren y Clara a través de Clover. Si aún no tienes Clara, Clover te propone crear tu espacio. No es asesoramiento financiero.",
        },
      },
    ],
  },
  {
    version: "2.5.252",
    date: "2026-08-28",
    title: "Jobs navigation (flagged)",
    titleTranslations: {
      es: "Navegación por objetivo (con flag)",
    },
    changes: [
      {
        type: "feature",
        text: "Optional command-strip navigation by goal (Add / Review / Discover) with shortcuts for import, alerts, screener, and moat. Off by default behind jobs_nav. Not financial advice.",
        translations: {
          es: "Navegación opcional del command strip por objetivo (Alta / Evaluar / Descubrir) con accesos a importar, alertas, screener y moat. Desactivada por defecto detrás de jobs_nav. No es asesoramiento financiero.",
        },
      },
    ],
  },
  {
    version: "2.5.251",
    date: "2026-08-28",
    title: "Global agent dock",
    titleTranslations: {
      es: "Dock global de agentes",
    },
    changes: [
      {
        type: "feature",
        text: "Warren and Clara follow you in a bottom-right dock (always open on desktop; a compact W·C button on mobile that expands on tap). Market alerts, Feedback, and Pro AI Support share that same control so they no longer overlap. Not financial advice.",
        translations: {
          es: "Warren y Clara te siguen en un dock inferior derecho (siempre abierto en escritorio; en móvil un botón W·C que se expande al tocarlo). Las alertas de mercado, Feedback y el soporte IA Pro comparten ese control y ya no se solapan. No es asesoramiento financiero.",
        },
      },
    ],
  },
  {
    version: "2.5.250",
    date: "2026-08-28",
    title: "Warren import chooser + once-a-day agent intro",
    titleTranslations: {
      es: "Selector de importación de Warren e intro de agentes una vez al día",
    },
    changes: [
      {
        type: "feature",
        text: "Asking Warren to import your portfolio now shows the same broker search as /import (CSV or add manually if the provider is missing). Picking a broker opens SnapTrade and the live import wizard, including how many holdings will be imported and a portfolio recalculation. Empty-home / first-stock Warren opens on the right like Home. Not financial advice.",
        translations: {
          es: "Pedirle a Warren que importe tu cartera ahora muestra el mismo buscador de brókers que /import (CSV o añadir a mano si no está el proveedor). Elegir un bróker abre SnapTrade y el asistente de importación real, con cuántas posiciones se importarán y el recálculo de la cartera. Warren en el empty / primera acción se abre a la derecha, como en Home. No es asesoramiento financiero.",
        },
      },
      {
        type: "improvement",
        text: "The Warren + Clara home intro plays once per local calendar day. Navigating around the app no longer replays the splash the same day.",
        translations: {
          es: "La intro de Warren y Clara en Home se muestra una vez por día local. Navegar por la app ya no vuelve a reproducir el splash el mismo día.",
        },
      },
    ],
  },
  {
    version: "2.5.249",
    date: "2026-08-27",
    title: "First-stock activation experiment",
    titleTranslations: {
      es: "Experimento de activación de la primera acción",
    },
    changes: [
      {
        type: "fix",
        text: "Onboarding no longer skips the import chooser after setup completes (race between session refresh and the import step).",
        translations: {
          es: "El onboarding ya no salta el selector de importación al terminar el setup (carrera entre refrescar la sesión y el paso de importar).",
        },
      },
      {
        type: "feature",
        text: "New A/B experiment warren_first_stock (draft until Launch): control keeps the empty import/add home; treatment opens Warren on the left with a prefilled “add 7 shares of Apple” example after onboarding skip. Warren may ask which market, then saves the holding. Not financial advice. The previous empty_activation A/B/C is paused. Users with no holdings ~48h after signup now receive the welcome-no-stocks email.",
        translations: {
          es: "Nuevo experimento A/B warren_first_stock (borrador hasta Launch): el control mantiene el empty de importar/añadir; el treatment abre Warren a la izquierda con un ejemplo de “añade 7 acciones de Apple” tras saltar el import. Warren puede preguntar el mercado y luego guarda la posición. No es asesoramiento financiero. El A/B/C empty_activation queda en pausa. Quien no tenga holdings ~48h después del alta recibe el email welcome-no-stocks.",
        },
      },
    ],
  },
  {
    version: "2.5.248",
    date: "2026-08-27",
    title: "Analyst targets in your currency",
    titleTranslations: {
      es: "Objetivos de analistas en tu moneda",
    },
    changes: [
      {
        type: "fix",
        text: "Home holdings list shows analyst target prices converted to your portfolio currency (still cached in the instrument's native currency).",
        translations: {
          es: "El listado de acciones muestra el precio objetivo de analistas convertido a la moneda de tu portafolio (se sigue cacheando en la moneda original del instrumento).",
        },
      },
    ],
  },
  {
    version: "2.5.247",
    date: "2026-08-27",
    title: "ETF analysis landings",
    titleTranslations: {
      es: "Fichas de análisis para ETF",
    },
    changes: [
      {
        type: "feature",
        text: "/analisis shows a fund profile for ETFs and ETPs (facts, TER when Yahoo has it, holdings and weights) instead of company EPS, insiders, and Congress. Same URL as stocks. Informational only — not investment advice.",
        translations: {
          es: "/analisis muestra un perfil de fondo para ETF y ETP (datos, TER si Yahoo lo tiene, participaciones y pesos) en lugar de BPA, insiders y Congreso. Misma URL que las acciones. Solo informativo — no es asesoramiento de inversión.",
        },
      },
    ],
  },
  {
    version: "2.5.246",
    date: "2026-08-27",
    title: "Warren: price moves + earnings catalysts",
    titleTranslations: {
      es: "Warren: movimientos de precio + catalizadores de resultados",
    },
    changes: [
      {
        type: "fix",
        text: "Warren no longer reports a stock price of 0 with a fabricated 52-week range when Yahoo has no valid quote, and for “why did X drop?” questions it resolves portfolio listings (e.g. Serabi → SRB.L), checks the earnings calendar / next report date, and grounds the answer in quote + news + catalysts.",
        translations: {
          es: "Warren ya no reporta precio 0 con un rango de 52 semanas inventado cuando Yahoo no tiene cotización válida, y ante “¿por qué bajó X?” resuelve el ticker del portfolio (p. ej. Serabi → SRB.L), consulta el calendario de resultados / próxima fecha de earnings y basa la respuesta en cotización + noticias + catalizadores.",
        },
      },
    ],
  },
  {
    version: "2.5.245",
    date: "2026-08-27",
    title: "Analyst target on home holdings",
    titleTranslations: {
      es: "Precio objetivo en holdings de la home",
    },
    changes: [
      {
        type: "feature",
        text: "Home holdings list now shows the shared analyst consensus target price next to each stock or ETF, sourced from the global fundamentals cache.",
        translations: {
          es: "La lista de holdings en la home muestra ahora el precio objetivo de consenso de analistas junto a cada acción o ETF, desde la caché global de fundamentals.",
        },
      },
    ],
  },
  {
    version: "2.5.244",
    date: "2026-08-27",
    title: "Analysis page: CoinShares BITC, not NYSE Bitwise",
    titleTranslations: {
      es: "Análisis: BITC de CoinShares, no Bitwise de NYSE",
    },
    changes: [
      {
        type: "fix",
        text: "Public /analisis/BITC now opens CoinShares Physical Bitcoin (Xetra / ISIN GB00BLD4ZL17, around €65), not the NYSE Bitwise ETF that Yahoo quotes for unsuffixed BITC (~$40).",
        translations: {
          es: "La ficha pública /analisis/BITC abre ahora CoinShares Physical Bitcoin (Xetra / ISIN GB00BLD4ZL17, unos 65 €), no el ETF Bitwise de NYSE que Yahoo cotiza para BITC sin sufijo (~40 $).",
        },
      },
    ],
  },
  {
    version: "2.5.243",
    date: "2026-08-27",
    title: "Portugal real-estate zone screening (beta)",
    titleTranslations: {
      es: "Cribado inmobiliario por zona en Portugal (beta)",
    },
    changes: [
      {
        type: "feature",
        text: "Behind the real_estate_screening_enabled flag: pick Portugal zones from the official INE catalogue, set budget, down payment, size and mortgage term, and run an async cash-flow report. Informational only — not investment advice. Listing portals stay stubbed until a data-source ADR is approved.",
        translations: {
          es: "Detrás del flag real_estate_screening_enabled: elige zonas de Portugal del catálogo oficial del INE, fija presupuesto, entrada, superficie y plazo, y lanza un informe de caja asíncrono. Solo informativo — no es consejo de inversión. Los portales de anuncios siguen en stub hasta aprobar el ADR de fuente de datos.",
        },
      },
    ],
  },
  {
    version: "2.5.242",
    date: "2026-08-27",
    title: "Investor Briefing portfolio total parity",
    titleTranslations: {
      es: "Paridad del total del portfolio en Investor Briefing",
    },
    changes: [
      {
        type: "fix",
        text: "Investor Briefing (/aid) portfolio total now includes fixed-return cash positions, matching the home dashboard total.",
        translations: {
          es: "El total del portfolio en Investor Briefing (/aid) incluye ahora posiciones de renta fija en efectivo, igual que en la home.",
        },
      },
    ],
  },
  {
    version: "2.5.241",
    date: "2026-08-27",
    title: "Broker sync: map European namesakes by last price",
    titleTranslations: {
      es: "Sync de bróker: mapear homónimos europeos por último precio",
    },
    changes: [
      {
        type: "fix",
        text: "When a broker last matches a European listing but Yahoo would quote a same-ticker US namesake (for example IBKR BITC / CoinShares vs NYSE Bitwise), trefolio stores that listing’s ISIN and keeps using the market last — not the broker last — for portfolio value.",
        translations: {
          es: "Si el último del bróker coincide con una cotización europea pero Yahoo cotizaría un homónimo USA con el mismo ticker (por ejemplo BITC de IBKR / CoinShares vs Bitwise de NYSE), trefolio guarda la ISIN de esa cotización y sigue usando el último de mercado — no el del bróker — para el valor de la cartera.",
        },
      },
    ],
  },
  {
    version: "2.5.240",
    date: "2026-08-26",
    title: "Home: invested vs cash, and broker vs market marks",
    titleTranslations: {
      es: "Inicio: invertido vs efectivo, y marcas del bróker vs mercado",
    },
    changes: [
      {
        type: "improvement",
        text: "Broker sync now preserves average purchase price for gain/loss: SnapTrade cost basis is kept when the broker omits it on a later sync, and open P/L is used as a fallback when average_purchase_price is missing.",
        translations: {
          es: "La sincronización con el bróker conserva el precio medio de compra para calcular ganancias/pérdidas: se mantiene el coste si el bróker no lo envía en una sync posterior, y se usa el P/L abierto como respaldo cuando falta average_purchase_price.",
        },
      },
      {
        type: "feature",
        text: "When a connected broker’s last price differs from the live market last (for example an illiquid ETF), trefolio keeps using market prices and tells you — in-app notification plus a dismissible Home banner. Informational only, not investment advice.",
        translations: {
          es: "Si el último precio del bróker conectado no coincide con el último de mercado (por ejemplo un ETF ilíquido), trefolio sigue usando precios de mercado y te lo indica: aviso in-app y un banner en Inicio. Solo informativo, no es un consejo de inversión.",
        },
      },
      {
        type: "fix",
        text: "When a holding has a non-US ISIN and an unsuffixed ticker, quotes use the ISIN so Yahoo does not pick a same-ticker US namesake (for example IBKR BITC / CoinShares vs NYSE Bitwise).",
        translations: {
          es: "Si una posición tiene ISIN no estadounidense y un ticker sin sufijo, las cotizaciones usan la ISIN para que Yahoo no elija un homónimo USA (por ejemplo BITC de IBKR / CoinShares vs Bitwise de NYSE).",
        },
      },
      {
        type: "improvement",
        text: "Home now shows invested assets and liquid cash on the compact total card, without opening Advanced.",
        translations: {
          es: "Inicio ahora muestra invertido y efectivo líquido en la tarjeta compacta, sin abrir Avanzado.",
        },
      },
    ],
  },
  {
    version: "2.5.239",
    date: "2026-08-26",
    title: "Broker sync: smoother first IBKR import",
    titleTranslations: {
      es: "Sync de bróker: primera importación IBKR más fluida",
    },
    changes: [
      {
        type: "improvement",
        text: "Broker Sync now auto-fetches after OAuth (with a 30s retry when SnapTrade is still pulling broker data), refreshes the dashboard immediately, shows how many positions were imported even when transaction history is empty, and sends email, in-app, and push notifications the first time holdings appear — including via the hourly auto-sync cron.",
        translations: {
          es: "Sincronizar bróker ahora importa solo tras OAuth (con reintento a los 30 s si SnapTrade aún tira datos), refresca el dashboard al instante, muestra cuántas posiciones se importaron aunque no haya transacciones, y envía email, aviso in-app y push la primera vez que aparecen posiciones — también vía el cron horario.",
        },
      },
    ],
  },
  {
    version: "2.5.238",
    date: "2026-08-26",
    title: "Broker picker and Trade Republic CSV",
    titleTranslations: {
      es: "Selector de brókers e importación CSV de Trade Republic",
    },
    changes: [
      {
        type: "feature",
        text: "Broker Sync can show a searchable broker list with logos: SnapTrade connections open on that broker, Trade Republic uses a guided CSV export, and unknown brokers fall back to CSV. Rolling out behind a feature flag.",
        translations: {
          es: "Sincronizar bróker puede mostrar una lista con logos y búsqueda: SnapTrade abre ese bróker, Trade Republic usa un CSV guiado, y si no aparece puedes importar CSV. Se activa con un feature flag.",
        },
      },
    ],
  },
  {
    version: "2.5.237",
    date: "2026-08-26",
    title: "Warren uses Clara cashflow when answering from Clara",
    titleTranslations: {
      es: "Warren usa la caja de Clara al responder desde Clara",
    },
    changes: [
      {
        type: "feature",
        text: "When Clara asks Warren about investments, Warren gets an aggregated snapshot of this month’s cash (income, spend, surplus, day of month) plus the portfolio, talks capacity not what to buy, and states he is not a licensed advisor.",
        translations: {
          es: "Cuando Clara le pregunta a Warren por inversiones, Warren recibe un resumen de la caja del mes (ingresos, gastos, sobrante, día) más la cartera, habla de capacidad y no de qué comprar, y aclara que no es un asesor autorizado.",
        },
      },
    ],
  },
  {
    version: "2.5.236",
    date: "2026-08-26",
    title: "Clara can consult Warren",
    titleTranslations: {
      es: "Clara puede consultar a Warren",
    },
    changes: [
      {
        type: "feature",
        text: "Clara can ask Warren about a linked trefolio portfolio (and get a signup link if there is no account). That consult uses Clara’s daily quota, not Warren’s monthly ai_consult.",
        translations: {
          es: "Clara puede preguntarle a Warren por una cartera de trefolio vinculada (y te pasa el alta si no hay cuenta). Cuenta contra el cupo diario de Clara, no contra el ai_consult mensual de Warren.",
        },
      },
    ],
  },
  {
    version: "2.5.235",
    date: "2026-08-25",
    title: "Readable engagement report tables",
    titleTranslations: {
      es: "Tablas del informe de engagement legibles",
    },
    changes: [
      {
        type: "fix",
        text: "Engagement report HTML now forces light document colors so tables and cards stay readable in dark-mode admin (no more near-invisible light text on white boxes).",
        translations: {
          es: "El HTML del informe de engagement fuerza colores claros para que tablas y tarjetas se lean bien en el admin en modo oscuro (ya no hay texto claro casi invisible sobre cajas blancas).",
        },
      },
      {
        type: "improvement",
        text: "Reduced Turso row reads: cached platform settings (60s), batched quota lookups on /api/auth/me, slower feature-flag and notification polling, and one fewer /api/user-settings fetch on app load.",
        translations: {
          es: "Menos lecturas en Turso: caché de platform settings (60s), quotas en batch en /api/auth/me, polling más lento de flags y notificaciones, y un fetch menos de /api/user-settings al cargar la app.",
        },
      },
    ],
  },
  {
    version: "2.5.234",
    date: "2026-08-25",
    title: "Admin engagement report & survey campaigns",
    titleTranslations: {
      es: "Informe de engagement y campañas de encuesta (admin)",
    },
    changes: [
      {
        type: "feature",
        text: "Admins can generate an HTML engagement report (KPIs, AI narrative, named cohorts, CSAT/feedback crossover) and confirm one-click email surveys (winback, missing tool, NPS) with AI-drafted questions in each user’s language.",
        translations: {
          es: "Los admins pueden generar un informe HTML de engagement (KPIs, narrativa IA, cohortes con nombres, cruce CSAT/feedback) y confirmar encuestas por email en un clic (winback, herramienta faltante, NPS) con preguntas redactadas por IA en el idioma de cada usuario.",
        },
      },
    ],
  },
  {
    version: "2.5.233",
    date: "2026-08-25",
    title: "Readable Clara and AID modals on mobile",
    titleTranslations: {
      es: "Modales de Clara y AID legibles en móvil",
    },
    changes: [
      {
        type: "fix",
        text: "Clara and AID bottom-sheet modals now use the solid glass-overlay surface so body text, bullets, and fine print stay readable on mobile instead of showing through a transparent panel.",
        translations: {
          es: "Los modales de Clara y AID en móvil usan ahora la superficie glass-overlay opaca para que el texto, las viñetas y las notas pequeñas se lean bien, sin que se vea el contenido de detrás.",
        },
      },
    ],
  },
  {
    version: "2.5.232",
    date: "2026-08-24",
    title: "Import your portfolio with Warren",
    titleTranslations: {
      es: "Importa tu cartera con Warren",
    },
    changes: [
      {
        type: "feature",
        text: "Ask Warren to import your portfolio: choose broker CSV/Excel, SnapTrade broker sync, or AI from a screenshot. Warren shows a preview and only saves after you confirm — the same pipelines as /import.",
        translations: {
          es: "Pídele a Warren importar tu cartera: CSV/Excel del bróker, sincronización SnapTrade o IA desde una captura. Warren enseña una vista previa y solo guarda cuando confirmas — las mismas rutas que /import.",
        },
      },
    ],
  },
  {
    version: "2.5.231",
    date: "2026-08-24",
    title: "Safer SnapTrade empty-position sync",
    titleTranslations: {
      es: "Sincronización SnapTrade más segura con posiciones vacías",
    },
    changes: [
      {
        type: "fix",
        text: "Auto-sync no longer deletes all broker holdings when SnapTrade transiently returns an empty positions list. Full exits are still cleaned up on the next non-empty snapshot or via sell reconciliation.",
        translations: {
          es: "La auto-sincronización ya no borra todos los holdings del broker cuando SnapTrade devuelve momentáneamente una lista de posiciones vacía. Las salidas totales se limpian en el siguiente snapshot con datos o vía reconciliación de ventas.",
        },
      },
    ],
  },
  {
    version: "2.5.230",
    date: "2026-08-24",
    title: "Clara beside Warren",
    titleTranslations: {
      es: "Clara al lado de Warren",
    },
    changes: [
      {
        type: "feature",
        text: "A Clara card now sits next to Warren on Home, Classic, and mobile. Open a short intro, create your Clara space with the same trefolio login, and jump to Clara chat in a new tab.",
        translations: {
          es: "Una tarjeta de Clara aparece junto a Warren en Home, Classic y móvil. Abre una intro breve, crea tu espacio en Clara con el mismo login de trefolio y salta al chat de Clara en una pestaña nueva.",
        },
      },
    ],
  },
  {
    version: "2.5.229",
    date: "2026-08-24",
    title: "Transaction deduplication",
    titleTranslations: {
      es: "Deduplicación de transacciones",
    },
    changes: [
      {
        type: "fix",
        text: "Broker import and auto-sync now skip duplicate transactions when date, type, quantity, and amount match — even from different sources. Existing duplicates are cleaned up on deploy.",
        translations: {
          es: "La importación de broker y la auto-sincronización omiten transacciones duplicadas cuando coinciden fecha, tipo, cantidad e importe — aunque vengan de fuentes distintas. Los duplicados existentes se limpian al desplegar.",
        },
      },
    ],
  },
  {
    version: "2.5.228",
    date: "2026-08-24",
    title: "SnapTrade sell sync fixes holdings",
    titleTranslations: {
      es: "Las ventas de SnapTrade actualizan los holdings",
    },
    changes: [
      {
        type: "fix",
        text: "Re-importing a SnapTrade sell (common on DEGIRO when positions lag activities) now updates or removes the matching holding instead of leaving stale share counts. Full exits also clear snaptrade holdings when the broker returns zero stock positions.",
        translations: {
          es: "Al reimportar una venta de SnapTrade (frecuente en DEGIRO cuando las posiciones van detrás de las activities) ahora se actualiza o elimina el holding correspondiente en lugar de dejar acciones obsoletas. Las salidas totales también limpian holdings de snaptrade cuando el broker devuelve cero posiciones.",
        },
      },
    ],
  },
  {
    version: "2.5.227",
    date: "2026-08-24",
    title: "Safer SnapTrade broker disconnect",
    titleTranslations: {
      es: "Desconexión de broker SnapTrade más segura",
    },
    changes: [
      {
        type: "fix",
        text: "Disconnecting one SnapTrade broker now detaches only that broker’s holdings and cash, instead of re-tagging every SnapTrade position. SnapTrade 404 on remove/delete is treated as already disconnected.",
        translations: {
          es: "Al desconectar un broker de SnapTrade solo se despegan las posiciones y el cash de ese broker, no todas las de SnapTrade. Un 404 al borrar en SnapTrade se trata como ya desconectado.",
        },
      },
    ],
  },
  {
    version: "2.5.226",
    date: "2026-08-24",
    title: "Historical fallback hardening",
    titleTranslations: {
      es: "Fallback más robusto para históricos",
    },
    changes: [
      {
        type: "fix",
        text: "Home and chart surfaces no longer fail when Yahoo returns an invalid historical payload for a symbol; `/api/historical` now degrades to empty data, the Yahoo chart call skips strict schema validation, and ProdOps alerts staff when this payload breakage appears.",
        translations: {
          es: "Home y las superficies de gráficos ya no fallan cuando Yahoo devuelve un payload histórico inválido para un símbolo; `/api/historical` ahora degrada a datos vacíos, la llamada chart de Yahoo omite la validación estricta del esquema y ProdOps avisa al equipo cuando aparece esta rotura de payload.",
        },
      },
    ],
  },
  {
    version: "2.5.225",
    date: "2026-08-24",
    title: "Faster Home first paint",
    titleTranslations: {
      es: "Home carga más rápido",
    },
    changes: [
      {
        type: "improvement",
        text: "Home bootstrap now splits into a fast core phase (holdings, cash, quotes, FX) and a deferred sections phase so the portfolio total can render sooner on large books.",
        translations: {
          es: "El bootstrap de Home ahora se divide en una fase core rápida (posiciones, efectivo, cotizaciones, FX) y otra de secciones diferida para que el total de cartera aparezca antes en carteras grandes.",
        },
      },
      {
        type: "improvement",
        text: "Home seeds holdings from bootstrap core, restores the active portfolio from localStorage on first paint, defers duplicate init quote fetches while bootstrap is pending, and shows skeletons instead of a blank screen.",
        translations: {
          es: "Home hidrata posiciones desde el core del bootstrap, restaura la cartera activa desde localStorage en el primer render, aplaza cotizaciones duplicadas del init mientras el bootstrap está en curso y muestra skeletons en lugar de pantalla en blanco.",
        },
      },
    ],
  },
  {
    version: "2.5.224",
    date: "2026-08-24",
    title: "Fewer lifecycle crons",
    titleTranslations: {
      es: "Menos crons de ciclo de vida",
    },
    changes: [
      {
        type: "feature",
        text: "Trial invites, activation, and winback emails now run in one daily lifecycle-emails job. Trial expiration is a daily backup plus a check on login. The paused digest-email Gmail pipeline is archived to a no-op stub.",
        translations: {
          es: "Las invitaciones a trial, la activación y el winback ahora corren en un único cron diario lifecycle-emails. La caducidad del trial es un respaldo diario más un chequeo al iniciar sesión. El pipeline Gmail de digest-email queda archivado como un stub sin trabajo.",
        },
      },
      {
        type: "fix",
        text: "Production builds no longer time out statically generating /api/auth/apple (force-dynamic).",
        translations: {
          es: "El build de producción ya no se agota generando estáticamente /api/auth/apple (force-dynamic).",
        },
      },
    ],
  },
  {
    version: "2.5.223",
    date: "2026-08-23",
    title: "Leaner cache-warm crons",
    titleTranslations: {
      es: "Crons de caché menos frecuentes",
    },
    changes: [
      {
        type: "improvement",
        text: "Nightly screener sync now refreshes holdings and hot mega-caps instead of the full 687-ticker universe; missing rows fill on demand in holdings research.",
        translations: {
          es: "El sync nocturno del screener ahora refresca posiciones y mega-caps calientes en vez del universo de 687 tickers; las filas que faltan se rellenan bajo demanda en holdings research.",
        },
      },
      {
        type: "improvement",
        text: "AID digest warms daily (skips a still-fresh 24h cache). FinPulse cron dropped from every 30 minutes to every 6 hours and skips Tavily when the 24h cache is fresh; on-read also warms. Moat sync is daily; quote-coverage reconcile is a weekly backup after refresh-holdings FIGI heal.",
        translations: {
          es: "AID digest se precalienta a diario (omite caché de 24h aún válida). El cron de FinPulse pasa de cada 30 minutos a cada 6 horas y no llama a Tavily si la caché de 24h sigue fresca; también se calienta al leer. Moat sync es diario; coverage-reconcile es respaldo semanal tras el heal FIGI de refresh-holdings.",
        },
      },
      {
        type: "improvement",
        text: "Home portfolio tips prefetch only users active in the last 7 days; a cache miss on Home computes the queue live from the bootstrap quote pass instead of staying empty until the next weekly cron.",
        translations: {
          es: "Los tips de Home se precalculan solo para usuarios activos en 7 días; si falta caché en Home, la cola se calcula en vivo con el pase de cotizaciones del bootstrap en vez de quedarse vacía hasta el cron semanal.",
        },
      },
    ],
  },
  {
    version: "2.5.222",
    date: "2026-08-23",
    title: "Leaner cron quotes and queue kicks",
    titleTranslations: {
      es: "Crons de cotizaciones unificados y colas por evento",
    },
    changes: [
      {
        type: "improvement",
        text: "Portfolio snapshots, holding refresh, and price alerts now share one Redis-backed Yahoo quote/FX pass and skip the fetch when no relevant market is open.",
        translations: {
          es: "Los snapshots de cartera, el refresco de posiciones y las alertas de precio comparten un único pase Yahoo/FX en Redis y no llaman al proveedor si no hay mercado abierto.",
        },
      },
      {
        type: "improvement",
        text: "ProdOps and feedback queues dispatch on write instead of polling every few minutes; return-watch and screening-recover backup crons run less often.",
        translations: {
          es: "Las colas de ProdOps y feedback se disparan al escribir en vez de sondear cada pocos minutos; los crons de respaldo de return-watch y screening-recover corren con menos frecuencia.",
        },
      },
    ],
  },
  {
    version: "2.5.221",
    date: "2026-08-23",
    title: "Home skips duplicate quote fetches",
    titleTranslations: {
      es: "Home evita cotizaciones duplicadas",
    },
    changes: [
      {
        type: "improvement",
        text: "Home bootstrap now seeds PortfolioProvider quotes and FX in parallel with init (without blocking manual refresh), keeps recommendations cache-only on mount, idle-batches name enrichment, defers Advanced hero history on entry, and exposes Server-Timing hit/miss counts.",
        translations: {
          es: "El bootstrap de Home ahora hidrata cotizaciones y FX en PortfolioProvider en paralelo al init (sin bloquear el refresh manual), mantiene recomendaciones solo en caché al montar, enriquece nombres en lotes idle, aplaza el historial del hero Advanced al entrar, y expone Server-Timing con hits/misses.",
        },
      },
    ],
  },
  {
    version: "2.5.220",
    date: "2026-08-23",
    title: "Faster Home for large portfolios",
    titleTranslations: {
      es: "Home más rápida en carteras grandes",
    },
    changes: [
      {
        type: "feature",
        text: "Home loads with a single bootstrap quote pass for day highlights and AID status, defers the AI briefing and below-the-fold feeds, shares the market ticker-bar fetch, and routes quote requests through in-flight coalescing — cutting duplicate Yahoo work on large portfolios.",
        translations: {
          es: "Home carga con un único pase de cotizaciones (bootstrap) para highlights y estado AID, aplaza el briefing de IA y los feeds bajo el pliegue, unifica el ticker-bar y enruta las cotizaciones con coalescing in-flight — menos trabajo duplicado de Yahoo en carteras grandes.",
        },
      },
    ],
  },
  {
    version: "2.5.219",
    date: "2026-08-23",
    title: "iOS widgets load for large portfolios",
    titleTranslations: {
      es: "Widgets iOS cargan en carteras grandes",
    },
    changes: [
      {
        type: "fix",
        text: "Home-screen Scriptable widgets no longer hang on large portfolios when the Redis quote cache is cold or over quota — the summary API caps Yahoo concurrency, returns within a deadline (falling back to stored values), and scripts wait up to 25s with clearer CDN-challenge errors.",
        translations: {
          es: "Los widgets Scriptable de la pantalla de inicio ya no se cuelgan en carteras grandes cuando la caché Redis de cotizaciones está fría o sin cuota: la API de resumen limita la concurrencia de Yahoo, responde dentro de un deadline (con valores guardados) y los scripts esperan hasta 25s con errores más claros si hay challenge del CDN.",
        },
      },
    ],
  },
  {
    version: "2.5.218",
    date: "2026-08-23",
    title: "Rate limits survive Redis outages",
    titleTranslations: {
      es: "Los rate limits sobreviven caídas de Redis",
    },
    changes: [
      {
        type: "fix",
        text: "When Upstash Redis is over quota or unreachable, rate limiting falls back to Turso instead of failing login, signup, and portfolio APIs with 500/504 errors.",
        translations: {
          es: "Si Upstash Redis está sin cuota o inaccesible, el rate limiting cae a Turso en lugar de fallar login, alta y APIs de cartera con errores 500/504.",
        },
      },
    ],
  },
  {
    version: "2.5.217",
    date: "2026-08-23",
    title: "Agent intro splash first",
    titleTranslations: {
      es: "Splash de intro primero",
    },
    changes: [
      {
        type: "improvement",
        text: "Warren + Clara home intro now shows the branded splash immediately on dashboard entry (before portfolio data paints), then plays the animation — app-like launch instead of dashboard-then-splash.",
        translations: {
          es: "La intro de Warren y Clara en el home muestra el splash con marca al entrar al dashboard (antes de que pinte la cartera) y luego la animación — arranque tipo app en vez de dashboard y después splash.",
        },
      },
      {
        type: "fix",
        text: "Admin traffic graph visualization is temporarily disabled so Redis is not scanned for edge aggregates.",
        translations: {
          es: "La visualización del grafo de tráfico en admin está desactivada temporalmente para no escanear Redis por agregados de edges.",
        },
      },
    ],
  },
  {
    version: "2.5.216",
    date: "2026-08-23",
    title: "Admin plan override vs IdP sync",
    titleTranslations: {
      es: "Override de plan admin vs sincronización IdP",
    },
    changes: [
      {
        type: "fix",
        text: "Admin plan changes (e.g. Folio → Trefolio Pro) now sync to the unified IdP and are no longer overwritten when the user opens Profile or refreshes the session.",
        translations: {
          es: "Los cambios de plan desde admin (p. ej. Folio → Trefolio Pro) se sincronizan con el IdP unificado y ya no se revierten al abrir Perfil o refrescar la sesión.",
        },
      },
    ],
  },
  {
    version: "2.5.215",
    date: "2026-08-23",
    title: "Warren chat history persists",
    titleTranslations: {
      es: "Warren recuerda el chat",
    },
    changes: [
      {
        type: "improvement",
        text: "Warren web chat now resumes your last conversation when you close and reopen the drawer, switch pages, or refresh — scoped per portfolio.",
        translations: {
          es: "El chat web de Warren retoma la última conversación al cerrar y abrir el panel, cambiar de página o refrescar — por cartera.",
        },
      },
    ],
  },
  {
    version: "2.5.214",
    date: "2026-08-23",
    title: "Warren trade guidance cards",
    titleTranslations: {
      es: "Warren — guía de compra/venta",
    },
    changes: [
      {
        type: "fix",
        text: "Warren no longer proposes “Add cash” with €0 when you ask about selling or trimming a position. Buy/sell/trim questions now show an informational guidance card grounded in price, valuation, and position size — trefolio does not execute trades.",
        translations: {
          es: "Warren ya no propone «Añadir efectivo» con 0 € cuando preguntas por vender o reducir una posición. Las preguntas de compra/venta/recorte muestran una tarjeta informativa basada en precio, valoración y tamaño de posición — trefolio no ejecuta operaciones.",
        },
      },
    ],
  },
  {
    version: "2.5.213",
    date: "2026-08-23",
    title: "Warren valuation P/E fix",
    titleTranslations: {
      es: "Corrección P/E en valoración Warren",
    },
    changes: [
      {
        type: "fix",
        text: "Warren valuation no longer labels stocks expensive by comparing forward P/E to trailing P/E as “historical average” — fetches FMP multi-year annual P/E when available (e.g. GOOGL fair vs ~22x history, not expensive at ~17x trailing). Drops absurd forward P/E spikes from Yahoo on LSE GBp tickers (e.g. Serabi Gold SRB.L ~5x trailing, not 216x forward). Analyst target upside stays separate from the cheap/fair/expensive label.",
        translations: {
          es: "La valoración en Warren ya no marca acciones como caras comparando PER forward con PER trailing como «media histórica» — obtiene la media anual multi-año de FMP cuando está disponible (p. ej. GOOGL justa vs ~22x histórico, no cara a ~17x trailing). Elimina picos absurdos de PER forward de Yahoo en tickers LSE en GBp (p. ej. Serabi Gold SRB.L ~5x trailing, no 216x forward). El upside al objetivo de analistas sigue separado del etiquetado barata/justa/cara.",
        },
      },
    ],
  },
  {
    version: "2.5.212",
    date: "2026-08-22",
    title: "Admin traffic graph — external providers",
    titleTranslations: {
      es: "Grafo de tráfico admin — proveedores externos",
    },
    changes: [
      {
        type: "improvement",
        text: "Warren + Clara home intro centers the trefolio logo on the final splash frame and holds the reveal longer so the tagline is easier to read before the dashboard appears.",
        translations: {
          es: "La intro de Warren y Clara en el home centra el logo de trefolio en el splash final y mantiene la revelación más tiempo para que el tagline sea más fácil de leer antes de mostrar el dashboard.",
        },
      },
      {
        type: "improvement",
        text: "Admin Traffic graph now shows a third column for external services (Yahoo, FMP, AI Gateway, Stripe, Resend, SnapTrade, Clara, Will, ProdOps, Tavily) linked to the API routes that call them.",
        translations: {
          es: "El grafo Traffic en admin ahora muestra una tercera columna de servicios externos (Yahoo, FMP, AI Gateway, Stripe, Resend, SnapTrade, Clara, Will, ProdOps, Tavily) vinculados a las rutas API que los invocan.",
        },
      },
    ],
  },
  {
    version: "2.5.211",
    date: "2026-08-22",
    title: "Warren Telegram on Profile for OneLogin users",
    titleTranslations: {
      es: "Warren en Telegram en Perfil para usuarios OneLogin",
    },
    changes: [
      {
        type: "fix",
        text: "Profile → Account now shows the Warren on Telegram connect card for unified OneLogin users (it was hidden behind the IdP account redirect).",
        translations: {
          es: "Perfil → Cuenta ahora muestra la tarjeta para vincular Warren en Telegram a usuarios unificados con OneLogin (antes quedaba oculta tras el redireccionamiento a la cuenta IdP).",
        },
      },
    ],
  },
  {
    version: "2.5.210",
    date: "2026-08-22",
    title: "Admin AI prompts catalog",
    titleTranslations: {
      es: "Catálogo de prompts IA en admin",
    },
    changes: [
      {
        type: "fix",
        text: "Warren investor-relations research now resolves cross-listing aliases (NOVO-B.CO → NVO / Novo Nordisk) and falls back to public web plus earnings excerpts when the IR extract is empty, instead of a generic company story.",
        translations: {
          es: "La investigación de investor relations de Warren ahora resuelve alias de cotización (NOVO-B.CO → NVO / Novo Nordisk) y, si el extracto IR viene vacío, usa web pública y earnings en el mismo turno en vez de un relato genérico de la empresa.",
        },
      },
      {
        type: "improvement",
        text: "Admin panel adds an AI Prompts page listing canonical system prompts for Warren, screening agents, portfolio tools, digests, and sister agents Clara and Will.",
        translations: {
          es: "El panel de admin incluye una página AI Prompts con los system prompts canónicos de Warren, los agentes de screening, herramientas de cartera, digests y los agentes hermanos Clara y Will.",
        },
      },
    ],
  },
  {
    version: "2.5.209",
    date: "2026-08-22",
    title: "Admin traffic graph",
    titleTranslations: {
      es: "Grafo de tráfico en admin",
    },
    changes: [
      {
        type: "improvement",
        text: "New admin Traffic panel shows an interactive graph of which screens and origins call which internal API groups, with line thickness proportional to request volume (Redis counters, no per-request DB writes).",
        translations: {
          es: "Nuevo panel Traffic en admin: grafo interactivo de qué pantallas y orígenes llaman a qué grupos de API internas, con grosor de línea proporcional al volumen (contadores Redis, sin escrituras DB por request).",
        },
      },
    ],
  },
  {
    version: "2.5.208",
    date: "2026-08-22",
    title: "Warren valuation Yahoo fallback",
    titleTranslations: {
      es: "Fallback Yahoo en valoración Warren",
    },
    changes: [
      {
        type: "feature",
        text: "Warren now advances the conversation instead of repeating the same valuation recap: follow-ups like “yes, rank by least upside” get a ranking and a new next step, not the same expensive/fair grouping again.",
        translations: {
          es: "Warren ahora avanza la conversación en vez de repetir el mismo resumen de valoración: si dices “sí, ordénalas por menor margen de subida”, responde con un ranking y un paso extra, no con el mismo agrupado de caras/justas.",
        },
      },
      {
        type: "fix",
        text: "Warren portfolio valuation now falls back to Yahoo (not FMP again) when FMP returns sparse overviews without P/E, and ignores cached overviews that lack valuation multiples — fixes missing ratios for GOOGL, UBER, and other liquid tickers on Folio.",
        translations: {
          es: "La valoración de cartera en Warren ahora recurre a Yahoo (no otra vez a FMP) cuando FMP devuelve overviews sin P/E, e ignora cachés sin múltiplos de valoración — corrige ratios ausentes en GOOGL, UBER y otros tickers líquidos en Folio.",
        },
      },
    ],
  },
  {
    version: "2.5.207",
    date: "2026-08-22",
    title: "Agent intro full-screen overlay",
    titleTranslations: {
      es: "Overlay a pantalla completa en intro de agentes",
    },
    changes: [
      {
        type: "fix",
        text: "Agent intro overlay is truly full-screen (fixed shell no longer overridden by absolute positioning), hides the home dashboard while visible, and no longer flashes the empty-portfolio state for users who already have holdings.",
        translations: {
          es: "El overlay de la intro de agentes cubre toda la pantalla (el contenedor fixed ya no queda anulado por position absolute), oculta el dashboard mientras está visible y deja de mostrar el empty state a usuarios que ya tienen posiciones.",
        },
      },
    ],
  },
  {
    version: "2.5.206",
    date: "2026-08-22",
    title: "Agent intro splash timing",
    titleTranslations: {
      es: "Timing del splash de intro de agentes",
    },
    changes: [
      {
        type: "improvement",
        text: "Warren + Clara home intro now shows on every visit and stays full-screen until the dashboard finishes loading (instead of once per session on a fixed timer). If the animation finishes first, a loading indicator appears until portfolio data arrives.",
        translations: {
          es: "La intro de Warren y Clara en el home se muestra en cada visita y permanece a pantalla completa hasta que el dashboard termina de cargar (en lugar de una vez por sesión con un temporizador fijo). Si la animación termina antes, aparece un indicador de carga hasta que lleguen los datos de la cartera.",
        },
      },
    ],
  },
  {
    version: "2.5.205",
    date: "2026-08-22",
    title: "Warren valuation stream stability",
    titleTranslations: {
      es: "Estabilidad del stream de valoración en Warren",
    },
    changes: [
      {
        type: "fix",
        text: "Warren portfolio valuation skips crypto, caps batch size, and times out slow fundamental fetches — fixes browser “Load failed” when comparing many holdings.",
        translations: {
          es: "La valoración de cartera en Warren omite cripto, limita el lote y corta fetchs lentos de fundamentales — corrige el «Load failed» del navegador al comparar muchas posiciones.",
        },
      },
    ],
  },
  {
    version: "2.5.204",
    date: "2026-08-22",
    title: "Warren and Clara home intro A/B test",
    titleTranslations: {
      es: "A/B test de intro Warren y Clara en el home",
    },
    changes: [
      {
        type: "improvement",
        text: "Signed-in users on trefolio.com can see a Warren + Clara intro animation (A/B test: Convergence vs Briefing vs control). After the intro, users with holdings land on the dashboard; users without holdings see the existing import/add empty state. Live stats track post-splash actions via agent_intro_post_action.",
        translations: {
          es: "Los usuarios logueados en trefolio.com pueden ver una intro animada de Warren y Clara (A/B: Convergencia vs Briefing vs control). Tras la intro, quien tiene posiciones va al dashboard; quien no, al empty state de importar/añadir. Las métricas en vivo registran acciones post-splash con agent_intro_post_action.",
        },
      },
    ],
  },
  {
    version: "2.5.203",
    date: "2026-08-22",
    title: "Warren valuation fundamentals data",
    titleTranslations: {
      es: "Datos de fundamentales para valoración en Warren",
    },
    changes: [
      {
        type: "fix",
        text: "Warren portfolio valuation now resolves Yahoo cross-listing aliases (e.g. NOVO-B.CO → NVO), merges FMP/Yahoo overview data, ignores sparse cached overviews without P/E, and skips crypto when scoring expensive vs cheap.",
        translations: {
          es: "La valoración de cartera en Warren ahora resuelve alias de cotización en Yahoo (p. ej. NOVO-B.CO → NVO), combina overview de FMP/Yahoo, ignora cachés sin P/E y excluye cripto al clasificar caro vs barato.",
        },
      },
    ],
  },
  {
    version: "2.5.202",
    date: "2026-08-22",
    title: "Warren portfolio valuation performance",
    titleTranslations: {
      es: "Rendimiento de valoración de cartera en Warren",
    },
    changes: [
      {
        type: "fix",
        text: "Warren portfolio valuation now fetches overview-only metrics (not full financial statements) and skips blocking server prefetch — fixes timeouts and “Load failed” when asking which holdings look expensive.",
        translations: {
          es: "La valoración de cartera en Warren ahora obtiene solo métricas de overview (no estados financieros completos) y evita prefetch bloqueante — corrige timeouts y «Load failed» al preguntar qué posiciones parecen caras.",
        },
      },
    ],
  },
  {
    version: "2.5.201",
    date: "2026-08-22",
    title: "Warren valuation routing fix",
    titleTranslations: {
      es: "Corrección de enrutado de valoración en Warren",
    },
    changes: [
      {
        type: "fix",
        text: "Warren now routes 'which stocks look expensive/cheap' to portfolio valuation (analyzeValuation) instead of the global moat screener, with server-side prefetch and safer error handling when data cannot load.",
        translations: {
          es: "Warren enruta «qué acciones parecen caras/baratas» a la valoración de cartera (analyzeValuation) en lugar del screener moat global, con prefetch en servidor y mejor manejo de errores cuando no puede cargar datos.",
        },
      },
    ],
  },
  {
    version: "2.5.200",
    date: "2026-08-22",
    title: "Relink Warren on Telegram from Profile",
    titleTranslations: {
      es: "Volver a vincular Warren en Telegram desde Perfil",
    },
    changes: [
      {
        type: "improvement",
        text: "Profile → Warren on Telegram now lets you relink without disconnecting first — useful after changing phones or Telegram accounts.",
        translations: {
          es: "Perfil → Warren en Telegram ahora permite volver a vincular sin desconectar primero — útil tras cambiar de móvil o de cuenta de Telegram.",
        },
      },
    ],
  },
  {
    version: "2.5.199",
    date: "2026-08-22",
    title: "Warren shared fundamentals and valuation",
    titleTranslations: {
      es: "Warren: fundamentales compartidos y valoración",
    },
    changes: [
      {
        type: "feature",
        text: "Warren can fetch share-level fundamentals (FMP or Yahoo, cached for all users) and say whether a stock looks cheap, fair, or expensive — for one ticker or your portfolio. Still AI-generated, not investment advice.",
        translations: {
          es: "Warren puede obtener fundamentales compartidos por acción (FMP o Yahoo, en caché para todos) y decir si una acción parece barata, justa o cara — para un ticker o tu cartera. Sigue siendo IA, no es consejo de inversión.",
        },
      },
    ],
  },
  {
    version: "2.5.198",
    date: "2026-08-22",
    title: "Home screen widget by asset type",
    titleTranslations: {
      es: "Widget de inicio por tipo de activo",
    },
    changes: [
      {
        type: "improvement",
        text: "Widget tokens are now reusable — you can keep multiple active tokens, revoke them individually, and copy Scriptable scripts with the latest valid token automatically embedded.",
        translations: {
          es: "Los tokens de widget ahora son reutilizables: puedes mantener varios tokens activos, revocarlos individualmente y copiar scripts de Scriptable con el último token válido incluido automáticamente.",
        },
      },
      {
        type: "feature",
        text: "A new Scriptable home-screen widget shows portfolio value and day change per asset type — Stocks, ETFs, Crypto, Funds, and Fixed return — with Small, Medium, and Large layouts. Copy it from Widget setup. Informational only — not investment advice.",
        translations: {
          es: "Un nuevo widget Scriptable para la pantalla de inicio muestra valor y variación diaria por tipo de activo — acciones, ETFs, cripto, fondos y renta fija — con tamaños Pequeño, Mediano y Grande. Cópialo desde Configurar widget. Solo informativo, no es consejo de inversión.",
        },
      },
    ],
  },
  {
    version: "2.5.197",
    date: "2026-08-22",
    title: "Holdings explorer and Warren on the landing page",
    titleTranslations: {
      es: "Explorador de posiciones y Warren en la landing",
    },
    changes: [
      {
        type: "feature",
        text: "The landing page now showcases Holdings explorer and asking Warren about a highlighted figure — including public IR and earnings-call research. Copy stays informational: AI-generated, not investment advice.",
        translations: {
          es: "La landing ahora destaca el explorador de posiciones y preguntar a Warren por una cifra — incluida la consulta de IR y earnings calls. El texto sigue siendo informativo: generado por IA, no es consejo de inversión.",
        },
      },
    ],
  },
  {
    version: "2.5.196",
    date: "2026-08-22",
    title: "Warren full screen and public-company research",
    titleTranslations: {
      es: "Warren a pantalla completa e investigación pública de compañías",
    },
    changes: [
      {
        type: "feature",
        text: "Warren can open full screen from the floating chat (and the dashboard drawer). He can search the public web, official investor-relations pages and PDFs, and earnings-call transcripts to ground answers — still AI-generated and not financial advice.",
        translations: {
          es: "Warren se puede abrir a pantalla completa desde el chat flotante (y el panel del dashboard). Puede buscar en la web pública, páginas y PDFs de investor relations y transcripciones de earnings calls para fundamentar las respuestas — sigue siendo IA y no es consejo financiero.",
        },
      },
      {
        type: "improvement",
        text: "Home holdings list now links to Holdings explorer so you can rank the same positions by P/E, yield, and weight.",
        translations: {
          es: "La lista de acciones en Home enlaza al explorador de posiciones para ordenarlas por PER, dividendos y peso.",
        },
      },
    ],
  },
  {
    version: "2.5.195",
    date: "2026-08-22",
    title: "Fix doubled holdings from broker venue aliases",
    titleTranslations: {
      es: "Corregidos holdings duplicados por alias de bolsa del bróker",
    },
    changes: [
      {
        type: "fix",
        text: "Broker venue aliases (CPH ↔ OMK for Copenhagen, NYSEAM ↔ NYSE, padded Hong Kong tickers) are now treated as the same lot — stopping doubled share counts/values and empty transaction history on the stock detail page. Existing duplicates are auto-detected and collapsed by the portfolio anomaly repair path; new SnapTrade/CSV/manual imports canonicalize the venue on write.",
        translations: {
          es: "Los alias de bolsa del bróker (CPH ↔ OMK en Copenhague, NYSEAM ↔ NYSE, tickers de Hong Kong con ceros) se tratan como la misma posición — ya no duplican acciones/valor ni dejan vacío el historial en el detalle. Los duplicados existentes se detectan y colapsan automáticamente; las importaciones nuevas (SnapTrade/CSV/manual) canonizan la sede al guardar.",
        },
      },
    ],
  },
  {
    version: "2.5.194",
    date: "2026-08-22",
    title: "Ask Warren about a holdings-explorer cell",
    titleTranslations: {
      es: "Pregúntale a Warren por una celda del explorador de posiciones",
    },
    changes: [
      {
        type: "feature",
        text: "On Holdings explorer, turn on Ask Warren, click a cell (for example a P/E), and ask about that figure for that holding. Warren sees the selected metric and the rest of the row. AI-generated — informational only, not investment advice.",
        translations: {
          es: "En el explorador de posiciones, activa Preguntar a Warren, pulsa una celda (por ejemplo el PER) y pregunta por esa cifra de esa posición. Warren ve la métrica y el resto de la fila. Generado por IA — solo informativo, no es asesoramiento de inversión.",
        },
      },
    ],
  },
  {
    version: "2.5.193",
    date: "2026-08-21",
    title: "Large top-movers widget shows 4 up and 3 down",
    titleTranslations: {
      es: "El widget grande de movimientos muestra 4 subidas y 3 bajadas",
    },
    changes: [
      {
        type: "feature",
        text: "The Large Scriptable top-movers widget now prefers four gainers and three losers (seven rows). If one side is short, remaining slots fill from the other side. Informational only — not investment advice.",
        translations: {
          es: "El widget Scriptable grande de mayores movimientos ahora prioriza cuatro subidas y tres bajadas (siete filas). Si falta un lado, rellena con el otro. Solo informativo, no asesoramiento de inversión.",
        },
      },
    ],
  },
  {
    version: "2.5.192",
    date: "2026-08-21",
    title: "Scriptable widget auth no longer false-401s under load",
    titleTranslations: {
      es: "La autenticación del widget Scriptable ya no da 401 falsos bajo carga",
    },
    changes: [
      {
        type: "fix",
        text: "Home-screen widget and Leaf device Bearer auth no longer return HTTP 401 when the per-IP rate limit is hit — you get 429 instead — and the limit is higher so valid tokens keep working while you set up or refresh. Informational only — not investment advice.",
        translations: {
          es: "La autenticación Bearer del widget de inicio y del Leaf ya no responde HTTP 401 cuando se alcanza el límite por IP — ahora es 429 — y el límite es más alto para que los tokens válidos sigan funcionando al configurar o actualizar. Solo informativo, no asesoramiento de inversión.",
        },
      },
    ],
  },
  {
    version: "2.5.191",
    date: "2026-08-21",
    title: "Top-movers Scriptable widget adapts to Small, Medium, and Large",
    titleTranslations: {
      es: "El widget Scriptable de movimientos se adapta a Pequeño, Mediano y Grande",
    },
    changes: [
      {
        type: "feature",
        text: "The Top movers home-screen widget now scales fonts, sparklines, and row count for Small / Medium / Large Scriptable sizes so content is no longer clipped. Informational only — not investment advice.",
        translations: {
          es: "El widget de mayores movimientos ahora ajusta tipografía, sparklines y número de filas en tamaños Pequeño / Mediano / Grande de Scriptable para que el contenido no se corte. Solo informativo, no asesoramiento de inversión.",
        },
      },
    ],
  },
  {
    version: "2.5.190",
    date: "2026-08-21",
    title: "Home screen widget setup is easier to find",
    titleTranslations: {
      es: "Configurar el widget de inicio es más fácil de encontrar",
    },
    changes: [
      {
        type: "feature",
        text: "Set up your Scriptable home screen widget from Profile → Widget & devices, the More menu, and mobile navigation — no Leaf device flag required. Informational only — not investment advice.",
        translations: {
          es: "Configura el widget Scriptable desde Perfil → Widget y dispositivos, el menú Más y la navegación móvil — sin necesitar el flag del dispositivo Leaf. Solo informativo, no asesoramiento de inversión.",
        },
      },
    ],
  },
  {
    version: "2.5.189",
    date: "2026-08-21",
    title: "Scriptable top-movers widget (two up, one down)",
    titleTranslations: {
      es: "Widget Scriptable de mayores movimientos (dos subidas, una bajada)",
    },
    changes: [
      {
        type: "feature",
        text: "Widget Setup now offers a second Scriptable script: today’s biggest movers with two gainers and one loser, prices, and sparklines. Informational only — not investment advice.",
        translations: {
          es: "La configuración del widget ofrece un segundo script de Scriptable: los mayores movimientos del día con dos subidas y una bajada, precios y sparklines. Solo informativo, no asesoramiento de inversión.",
        },
      },
    ],
  },
  {
    version: "2.5.188",
    date: "2026-08-20",
    title: "Thesis numbers carry a unit, a period, and a sanity check",
    titleTranslations: {
      es: "Los números de la tesis llevan unidad, periodo y un chequeo de cordura",
    },
    changes: [
      {
        type: "feature",
        text: "Holdings explorer under Tools ranks your own positions by P/E, forward P/E, dividend yield, weight, sector, and more — with decision metrics on stocks and ETFs. Informational only, not investment advice.",
        translations: {
          es: "El explorador de posiciones en Herramientas ordena lo que ya tienes por PER, PER forward, dividendos, peso, sector y más — con métricas de decisión en acciones y ETF. Solo informativo, no es asesoramiento de inversión.",
        },
      },
      {
        type: "improvement",
        text: "Thesis notes no longer describe a raw ratio. Interest coverage, leverage and cash conversion are computed from filings, stamped (e.g. FY2025), and rejected when they are impossible (negative coverage with positive EBIT). Informational only — not investment advice.",
        translations: {
          es: "Las tesis ya no adjetivan un ratio suelto. La cobertura de intereses, el apalancamiento y la conversión de caja se calculan con las cuentas, llevan sello (p. ej. FY2025) y se rechazan si son imposibles (cobertura negativa con EBIT positivo). Solo informativo, no asesoramiento de inversión.",
        },
      },
    ],
  },
  {
    version: "2.5.187",
    date: "2026-08-20",
    title: "Thesis reports read as a research note, not a checklist of codes",
    titleTranslations: {
      es: "Las tesis se leen como una nota de investigación, no como códigos",
    },
    changes: [
      {
        type: "improvement",
        text: "Thesis screening now opens with the business, what looks solid, what to watch, and a three-year outlook in plain language. Internal codes (EQ:A1) and “a gate failed” are gone. Informational only — not investment advice.",
        translations: {
          es: "El cribado de tesis ahora abre con el negocio, lo que encaja, lo que hay que vigilar y una mirada a tres años, en lenguaje claro. Se acaban los códigos internos (EQ:A1) y “falló una puerta”. Solo informativo, no asesoramiento de inversión.",
        },
      },
    ],
  },
  {
    version: "2.5.186",
    date: "2026-08-20",
    title: "Thesis screening uses FMP, IR and news instead of empty evidence",
    titleTranslations: {
      es: "El cribado de tesis usa FMP, IR y noticias en vez de evidencia vacía",
    },
    changes: [
      {
        type: "improvement",
        text: "Thesis drafts now write from published FMP facts, IR pages, earnings excerpts and news. Street targets stay labeled as consensus, not company guidance. Reports remain informational, not investment advice.",
        translations: {
          es: "Las tesis ahora se redactan con hechos FMP publicados, páginas de IR, extractos de resultados y noticias. Los precios objetivo se etiquetan como consenso, no como guidance de la empresa. Los informes son informativos, no asesoramiento de inversión.",
        },
      },
    ],
  },
  {
    version: "2.5.185",
    date: "2026-08-20",
    title: "Spanish thesis drafts no longer vanish on “mantener”",
    titleTranslations: {
      es: "Las tesis en español ya no desaparecen por la palabra “mantener”",
    },
    changes: [
      {
        type: "fix",
        text: "Thesis screening in Spanish now keeps a fallback draft. The word “mantener” (hold) was blocking the whole write-up even when Uber and other names had facts and gates. Reports remain informational, not investment advice.",
        translations: {
          es: "El cribado de tesis en español ahora conserva un borrador de respaldo. La palabra “mantener” bloqueaba todo el texto aunque Uber y otros nombres tuvieran hechos y puertas. Los informes son informativos, no asesoramiento de inversión.",
        },
      },
    ],
  },
  {
    version: "2.5.184",
    date: "2026-08-20",
    title: "Mobile add crypto, SOL-EUR, Warren on home",
    titleTranslations: {
      es: "Añadir cripto en móvil, SOL-EUR y Warren en inicio",
    },
    changes: [
      {
        type: "fix",
        text: "Add Crypto on mobile is a full-screen page with a sticky footer so Add to portfolio stays above the browser chrome instead of a clipped centered modal.",
        translations: {
          es: "Añadir Cripto en móvil es una página a pantalla completa con pie fijo para que Agregar al portafolio quede por encima de la barra del navegador, no un modal centrado recortado.",
        },
      },
      {
        type: "fix",
        text: "Crypto search now lists euro pairs such as SOL-EUR alongside USD quotes so Solana in euros is selectable.",
        translations: {
          es: "La búsqueda de cripto ahora lista pares en euros como SOL-EUR junto a las cotizaciones en USD para poder elegir Solana en euros.",
        },
      },
      {
        type: "fix",
        text: "Warren’s chat trigger appears on the mobile home feed again (it was only in the desktop rail).",
        translations: {
          es: "El acceso al chat de Warren vuelve a aparecer en el inicio móvil (antes solo estaba en la columna de escritorio).",
        },
      },
    ],
  },
  {
    version: "2.5.183",
    date: "2026-08-20",
    title: "Checklist vs Thesis is on in screening",
    titleTranslations: {
      es: "Cribado vs Tesis está activo en el cribado",
    },
    changes: [
      {
        type: "feature",
        text: "Screening now shows Checklist vs Thesis before you run. Thesis writes a falsifiable draft with gates and kill criteria. Both reports are informational research notes, not investment advice.",
        translations: {
          es: "El cribado ahora muestra Cribado vs Tesis antes de lanzar. Tesis redacta un borrador falsable con puertas y criterios de muerte. Ambos informes son notas de investigación, no asesoramiento de inversión.",
        },
      },
    ],
  },
  {
    version: "2.5.182",
    date: "2026-08-20",
    title: "Moat scores ROIC, not buyback-inflated ROE",
    titleTranslations: {
      es: "El moat puntúa ROIC, no un ROE inflado por recompras",
    },
    changes: [
      {
        type: "fix",
        text: "The economic-moat engine now scores return on invested capital instead of ROE, and no longer treats declining retained earnings under share buybacks as a second quality failure. High ROE after shrinking equity is an accounting artifact, not proof of a moat. This is research information, not investment advice.",
        translations: {
          es: "El motor de foso económico ahora puntúa el retorno sobre el capital invertido en lugar del ROE, y ya no trata las ganancias retenidas decrecientes bajo recompras como un segundo fallo de calidad. Un ROE alto tras reducir el patrimonio es un artefacto contable, no prueba de foso. Es información de investigación, no asesoramiento de inversión.",
        },
      },
    ],
  },
  {
    version: "2.5.181",
    date: "2026-08-20",
    title: "Screening thesis pipeline bake-off",
    titleTranslations: {
      es: "Bake-off del pipeline de tesis en cribado",
    },
    changes: [
      {
        type: "feature",
        text: "When enabled, screening lets you choose Checklist or Thesis before a run. Thesis writes a falsifiable draft with gates and kill criteria. Both reports are informational research notes, not investment advice.",
        translations: {
          es: "Cuando está activado, el cribado te deja elegir Cribado o Tesis antes de lanzar. Tesis redacta un borrador falsable con puertas y criterios de muerte. Ambos informes son notas de investigación, no asesoramiento de inversión.",
        },
      },
    ],
  },
  {
    version: "2.5.180",
    date: "2026-08-17",
    title: "One email per price alert, with recent headlines",
    titleTranslations: {
      es: "Un email por alerta de precio, con titulares recientes",
    },
    changes: [
      {
        type: "fix",
        text: "Threshold price alerts now send only once: the cron claims and deactivates the alert before emailing, so overlapping 15-minute runs cannot repeat the same message.",
        translations: {
          es: "Las alertas de umbral ahora se envían una sola vez: el cron reclama y desactiva la alerta antes de enviar el email, así que ejecuciones solapadas cada 15 minutos no pueden repetir el mismo mensaje.",
        },
      },
      {
        type: "improvement",
        text: "Alert emails can include up to three recent headlines from our news cache for context. Telegram, push, and device alerts include the top headline. Headlines are informational only and are not investment advice.",
        translations: {
          es: "Los emails de alerta pueden incluir hasta tres titulares recientes de nuestra caché de noticias como contexto. Telegram, push y el dispositivo incluyen el titular principal. Los titulares son solo informativos y no son asesoramiento de inversión.",
        },
      },
      {
        type: "fix",
        text: "Portfolio-wide percent alerts now notify once per ticker per day, so a later holding can still fire without repeating an earlier one on the next cron run.",
        translations: {
          es: "Las alertas porcentuales de toda la cartera ahora avisan una vez por ticker al día, así que una posición posterior puede dispararse sin repetir una anterior en la siguiente ejecución del cron.",
        },
      },
    ],
  },
  {
    version: "2.5.179",
    date: "2026-08-17",
    title: "Daily move shows last market update",
    titleTranslations: {
      es: "El movimiento diario muestra la última actualización de mercado",
    },
    changes: [
      {
        type: "feature",
        text: "The dashboard daily G/L now shows when prices last traded (for example Friday close on Monday morning), so weekend and Monday moves are easier to read.",
        translations: {
          es: "La G/L diaria del panel ahora muestra cuándo cotizaron los precios por última vez (por ejemplo el cierre del viernes el lunes por la mañana), para que los movimientos del fin de semana y del lunes se entiendan mejor.",
        },
      },
    ],
  },
  {
    version: "2.5.178",
    date: "2026-08-16",
    title: "Studio theme behind feature flag",
    titleTranslations: {
      es: "Tema Studio tras feature flag",
    },
    changes: [
      {
        type: "fix",
        text: "Logged-in visitors on /analisis no longer see a login wall on US Congress trading. The report API was reusable from an anonymous cache of the same URL.",
        translations: {
          es: "Quien ya tiene sesión en /analisis ya no ve un muro de login en el trading del Congreso. La API reutilizaba una respuesta anónima cacheada de la misma URL.",
        },
      },
      {
        type: "improvement",
        text: "The Studio dashboard theme is hidden by default behind the theme_studio_enabled feature flag (Admin → Feature Flags). Code remains; enable the flag to show Studio again in Settings.",
        translations: {
          es: "El tema Studio del panel queda oculto por defecto tras el feature flag theme_studio_enabled (Admin → Feature Flags). El código permanece; activa el flag para volver a mostrar Studio en Ajustes.",
        },
      },
      {
        type: "improvement",
        text: "Settings no longer shows the current-plan badge or Upgrade to Trefolio link while commerce_enabled is off (everyone is on complimentary Trefolio Pro).",
        translations: {
          es: "En Ajustes ya no aparecen el plan actual ni el enlace Pasar a Trefolio mientras commerce_enabled está desactivado (todos están en Trefolio Pro complimentary).",
        },
      },
      {
        type: "improvement",
        text: "The public landing page now highlights AI investment screening (Cheap / Fit / Solidity scores, Analyze a ticker, QA Verified reports) and clarifies the fundamentals stock screener versus AI research.",
        translations: {
          es: "La landing pública destaca el cribado de inversión con IA (puntuaciones Barata / Encaje / Solidez, Analizar un ticker, informes Verificados) y aclara el filtro de fundamentales frente a la investigación con IA.",
        },
      },
      {
        type: "improvement",
        text: "While commerce is off, the landing value card says Free instead of a monthly Pro price.",
        translations: {
          es: "Mientras commerce está desactivado, la tarjeta de valor de la landing dice Gratis en lugar de un precio Pro mensual.",
        },
      },
    ],
  },
  {
    version: "2.5.177",
    date: "2026-08-15",
    title: "Reliable price alerts + admin dispatch log",
    titleTranslations: {
      es: "Alertas de precio fiables + registro en admin",
    },
    changes: [
      {
        type: "fix",
        text: "Price alerts no longer false-fire on bad/zero quotes, compare thresholds with FX when currencies differ, and only deactivate after delivery (or permanent channel skips) so transient send failures can retry.",
        translations: {
          es: "Las alertas de precio ya no se disparan con cotizaciones erróneas o a cero, comparan umbrales con FX si las divisas difieren, y solo se desactivan tras el envío (o saltos permanentes de canal) para reintentar fallos transitorios.",
        },
      },
      {
        type: "fix",
        text: "Percent and portfolio-wide alerts can coexist: uniqueness is keyed by percent basis/value (not the old threshold-only key that blocked multiple % alerts).",
        translations: {
          es: "Las alertas porcentuales y de cartera pueden coexistir: la unicidad usa base/valor porcentual (no la clave antigua solo de umbral que bloqueaba varias alertas %).",
        },
      },
      {
        type: "improvement",
        text: "Alerts dispatch only to the channels the user selected (email and/or Telegram; push/device when enabled). WhatsApp is not a delivery path. Admins can verify firings and per-channel outcomes under Admin → Price Alerts.",
        translations: {
          es: "Las alertas se envían solo por los canales que el usuario eligió (email y/o Telegram; push/dispositivo si están activos). WhatsApp no es un canal. Los admins verifican disparos y resultados por canal en Admin → Price Alerts.",
        },
      },
    ],
  },
  {
    version: "2.5.176",
    date: "2026-08-15",
    title: "Email copy without plan names",
    titleTranslations: {
      es: "Emails sin nombres de plan",
    },
    changes: [
      {
        type: "improvement",
        text: "Outbound emails no longer mention Folio, Bifolio, or Trefolio as plan names. The product is just trefolio until paid tiers are turned back on.",
        translations: {
          es: "Los emails salientes ya no mencionan Folio, Bifolio ni Trefolio como nombres de plan. El producto es solo trefolio hasta que se reactiven los planes de pago.",
        },
      },
      {
        type: "improvement",
        text: "Admins can turn an email on or off from the right-hand detail panel on the Email Flows map, including emails reached from a condition.",
        translations: {
          es: "Los admins pueden activar o desactivar un email desde el panel derecho del mapa de Email Flows, también cuando el email cuelga de una condición.",
        },
      },
    ],
  },
  {
    version: "2.5.175",
    date: "2026-08-15",
    title: "Toggle emails from the admin flow map",
    titleTranslations: {
      es: "Activar emails desde el mapa de flujos",
    },
    changes: [
      {
        type: "improvement",
        text: "Admin Email Flows can turn each email on or off on the same page, lists every template with why it exists, and previews code-owned bodies such as signup confirmation.",
        translations: {
          es: "Admin Email Flows permite prender o apagar cada email en la misma página, lista todas las plantillas con su propósito y muestra el cuerpo de emails en código como la confirmación de alta.",
        },
      },
    ],
  },
  {
    version: "2.5.174",
    date: "2026-08-15",
    title: "Admin email flow map",
    titleTranslations: {
      es: "Mapa de flujos de email en admin",
    },
    changes: [
      {
        type: "improvement",
        text: "Admin Messaging now includes a read-only Email Flows map of signup, lifecycle, digest, trial, and alert automations with template preview and send stats.",
        translations: {
          es: "Admin → Messaging ahora incluye un mapa de solo lectura de Email Flows (alta, ciclo de vida, digest, trial y alertas) con vista previa de plantillas y estadísticas de envío.",
        },
      },
    ],
  },
  {
    version: "2.5.173",
    date: "2026-08-15",
    title: "ProdOps alert when restored users return",
    titleTranslations: {
      es: "Alerta ProdOps cuando vuelven usuarios restaurados",
    },
    changes: [
      {
        type: "improvement",
        text: "Staff get a Telegram ProdOps alert the first time a holdings-restore email recipient returns to the app.",
        translations: {
          es: "El equipo recibe una alerta Telegram vía ProdOps la primera vez que un destinatario del email de restauración de posiciones vuelve a la app.",
        },
      },
    ],
  },
  {
    version: "2.5.172",
    date: "2026-08-14",
    title: "Portfolio reset recovery and empty-ledger alerts",
    titleTranslations: {
      es: "Recuperación tras reset y alertas de ledger vacío",
    },
    changes: [
      {
        type: "fix",
        text: "Portfolio reset now archives holdings, transactions, and cash before wiping so support can restore accidental resets.",
        translations: {
          es: "El reinicio de cartera ahora archiva posiciones, transacciones y cash antes de borrar, para poder restaurar resets accidentales.",
        },
      },
      {
        type: "improvement",
        text: "Portfolio anomaly scan alerts when a live ledger is empty but snapshot history shows a real portfolio (empty_ledger_with_history).",
        translations: {
          es: "El escaneo de anomalías alerta cuando el ledger está vacío pero el historial de snapshots muestra una cartera real (empty_ledger_with_history).",
        },
      },
    ],
  },
  {
    version: "2.5.171",
    date: "2026-08-14",
    title: "Holdings visibility after import",
    titleTranslations: {
      es: "Visibilidad de posiciones tras importar",
    },
    changes: [
      {
        type: "fix",
        text: "Holdings and transactions left with a blank portfolio id (invisible under the default portfolio filter) are reattached to the default portfolio on list and via migration.",
        translations: {
          es: "Las posiciones y transacciones con portfolio id vacío (invisibles al filtrar por la cartera por defecto) se reasignan a la cartera por defecto al listar y vía migración.",
        },
      },
      {
        type: "fix",
        text: "CSV/AI bulk import no longer rejects rows when the extractor labels a position as REIT or another non-standard asset type — those map to stock.",
        translations: {
          es: "La importación masiva CSV/IA ya no rechaza filas cuando el extractor etiqueta una posición como REIT u otro tipo no estándar — se mapean a stock.",
        },
      },
      {
        type: "improvement",
        text: "Portfolio reset and successful import commit are tracked in analytics; import failures show the server error instead of a generic message.",
        translations: {
          es: "El reinicio de cartera y el commit de importación exitoso se registran en analytics; los fallos de importación muestran el error del servidor en lugar de un mensaje genérico.",
        },
      },
    ],
  },
  {
    version: "2.5.170",
    date: "2026-08-14",
    title: "Screening report references",
    titleTranslations: {
      es: "Referencias en el informe de cribado",
    },
    changes: [
      {
        type: "feature",
        text: "Portfolio news on Home and Brief now mixes holdings instead of repeating one ticker, and each item shows when the article was published.",
        translations: {
          es: "Las noticias de cartera en Inicio y Brief mezclan holdings en vez de repetir un solo ticker, y cada ítem muestra cuándo se publicó el artículo.",
        },
      },
      {
        type: "improvement",
        text: "Screening reports now list public investor-relations pages, documents, and news links (with short excerpts) as clickable references.",
        translations: {
          es: "Los informes de cribado ahora listan páginas de relación con inversores, documentos y noticias públicas (con extractos cortos) como referencias clicables.",
        },
      },
      {
        type: "feature",
        text: "When a screening provider hits quota, new screens pause automatically (existing reports stay available) and ops is alerted on Telegram. Admins resume from Screening Costs.",
        translations: {
          es: "Si un proveedor de cribado llega a su cuota, los cribados nuevos se pausan solos (los informes existentes siguen disponibles) y ops recibe una alerta en Telegram. El admin los reactiva desde Screening Costs.",
        },
      },
    ],
  },
  {
    version: "2.5.169",
    date: "2026-08-14",
    title: "Admin feature-flag toggles persist",
    titleTranslations: {
      es: "Los toggles de feature flags del admin persisten",
    },
    changes: [
      {
        type: "fix",
        text: "Admin Feature Flags now shows and saves every registered flag, including Portfolio anomaly agent and Display value invariants.",
        translations: {
          es: "Admin Feature Flags ahora muestra y guarda todos los flags registrados, incluido Portfolio anomaly agent y Display value invariants.",
        },
      },
      {
        type: "improvement",
        text: "Admin Screening Analyze shows the IR URLs and extracted text downloaded for each run, not only credit counts.",
        translations: {
          es: "Admin Screening Analyze muestra las URLs de IR y el texto extraído de cada corrida, no solo los recuentos de créditos.",
        },
      },
    ],
  },
  {
    version: "2.5.168",
    date: "2026-08-14",
    title: "Force Serper/Jina on Analyze",
    titleTranslations: {
      es: "Forzar Serper/Jina en Analyze",
    },
    changes: [
      {
        type: "improvement",
        text: "New flag screening_analyze_force_serper_jina_enabled makes Analyze IR use Serper search and Jina EU extract only, with no Tavily fallback.",
        translations: {
          es: "El flag screening_analyze_force_serper_jina_enabled hace que el IR de Analyze use solo búsqueda Serper y extracto Jina UE, sin respaldo de Tavily.",
        },
      },
      {
        type: "feature",
        text: "Admin Screening Analyze lists who requested each single-company analysis and which resources it used (LLM, Tavily, Serper, Jina).",
        translations: {
          es: "El admin Screening Analyze lista quién pidió cada análisis de una empresa y qué recursos usó (LLM, Tavily, Serper, Jina).",
        },
      },
    ],
  },
  {
    version: "2.5.167",
    date: "2026-08-13",
    title: "Screening IR Serper/Jina prototype",
    titleTranslations: {
      es: "Prototipo IR de cribado con Serper/Jina",
    },
    changes: [
      {
        type: "improvement",
        text: "Investment screening no longer calls live Tavily Research (cache only). IR document discovery can use Serper search and Jina EU extract behind a flag, with Tavily Search/Extract as fallback.",
        translations: {
          es: "El cribado ya no llama a Tavily Research en vivo (solo caché). El descubrimiento de documentos IR puede usar búsqueda Serper y extracto Jina UE detrás de un flag, con Tavily Search/Extract como respaldo.",
        },
      },
    ],
  },
  {
    version: "2.5.166",
    date: "2026-08-13",
    title: "Screening IR PDFs and secondary listings",
    titleTranslations: {
      es: "Cribado IR: PDFs y listings secundarios",
    },
    changes: [
      {
        type: "improvement",
        text: "Investment screening now extracts official IR PDFs (shareholder reports, MD&A, earnings releases) as primary evidence, and maps secondary quotes (e.g. Munich W9C.MU) to the primary FMP symbol for transcripts and IR search without changing the ticker on the card.",
        translations: {
          es: "El cribado ahora extrae PDFs oficiales de IR (informes a accionistas, MD&A, resultados) como evidencia principal, y mapea cotizaciones secundarias (p. ej. Múnich W9C.MU) al símbolo primario de FMP para transcripts y búsqueda IR, sin cambiar el ticker de la ficha.",
        },
      },
    ],
  },
  {
    version: "2.5.165",
    date: "2026-08-13",
    title: "Staff ops Telegram natural language",
    titleTranslations: {
      es: "Telegram de ops en lenguaje natural",
    },
    changes: [
      {
        type: "feature",
        text: "Ask @trefoliobot in natural language (or /experiments) how many people are on each experiment and treatment. Counts come from the database; AI only chooses which query to run.",
        translations: {
          es: "Preguntá a @trefoliobot en lenguaje natural (o /experiments) cuánta gente hay en cada experimento y tratamiento. Los números salen de la base; la IA solo elige qué consulta correr.",
        },
      },
    ],
  },
  {
    version: "2.5.164",
    date: "2026-08-13",
    title: "One staff ops Telegram bot",
    titleTranslations: {
      es: "Un solo bot de ops en Telegram",
    },
    changes: [
      {
        type: "improvement",
        text: "Staff ops Telegram is a single bot (@trefoliobot via ProdOps). user.trefolio.com/agents and trefolio admin mint the same recipient link; IdP signups, billing, and /snapshot use that chat.",
        translations: {
          es: "El Telegram de ops de staff es un solo bot (@trefoliobot vía ProdOps). user.trefolio.com/agents y el admin de trefolio generan el mismo enlace de destinatario; altas del IdP, billing y /snapshot usan ese chat.",
        },
      },
    ],
  },
  {
    version: "2.5.163",
    date: "2026-08-13",
    title: "Home totals share one calculation path",
    titleTranslations: {
      es: "Los totales de inicio comparten un solo cálculo",
    },
    changes: [
      {
        type: "improvement",
        text: "Home stats now use the same totals and day-change as the hero, with optional sampled consistency checks (codes only, no amounts) behind a staff flag.",
        translations: {
          es: "Las estadísticas de inicio usan los mismos totales y el mismo cambio del día que el hero, con comprobaciones de consistencia opcionales y muestreadas (solo códigos, sin importes) detrás de un flag interno.",
        },
      },
    ],
  },
  {
    version: "2.5.162",
    date: "2026-08-12",
    title: "Explain any performance-matrix cell",
    titleTranslations: {
      es: "Explicar cualquier celda de la matriz de rendimiento",
    },
    changes: [
      {
        type: "feature",
        text: "Each performance-matrix cell has a ? that shows the deterministic formula (current − past − net flows), attributed transactions, a contrast vs purchase cost, and an optional AI plain-language narrative (not investment advice).",
        translations: {
          es: "Cada celda de la matriz tiene un ? con la fórmula determinista (actual − pasado − flujos netos), las operaciones atribuidas, el contraste vs coste de compra y una narrativa opcional en lenguaje claro generada por IA (no es consejo de inversión).",
        },
      },
    ],
  },
  {
    version: "2.5.161",
    date: "2026-08-12",
    title: "Matrix € mode shows period P/L; remove All column",
    titleTranslations: {
      es: "Modo € de la matriz muestra P/L del periodo; se quita Todo",
    },
    changes: [
      {
        type: "fix",
        text: "Performance matrix currency mode now shows flow-adjusted period gain/loss (not portfolio size), fixed-return start-day principal no longer inflates All Assets “today” €, and the All-time (TODO) column is removed.",
        translations: {
          es: "El modo divisa de la matriz muestra la ganancia/pérdida del periodo ajustada por flujos (no el tamaño de la cartera), el principal del retorno fijo el día de inicio ya no infla el “hoy” en € de Todos los activos, y se elimina la columna Todo.",
        },
      },
    ],
  },
  {
    version: "2.5.160",
    date: "2026-08-12",
    title: "Portfolio anomaly agent for staff ops",
    titleTranslations: {
      es: "Agente de anomalías de cartera para ops",
    },
    changes: [
      {
        type: "feature",
        text: "Admin anomaly triage (/admin/anomalies) plus daily scan of portfolios with holdings; LLM explains findings and ProdOps Telegram buttons can ack, apply safe fixes, or dismiss.",
        translations: {
          es: "Triage de anomalías en /admin/anomalies y escaneo diario de carteras con holdings; el LLM explica hallazgos y los botones de Telegram ProdOps permiten acusar, aplicar fixes seguros o descartar.",
        },
      },
    ],
  },
  {
    version: "2.5.159",
    date: "2026-08-12",
    title: "Matrix period cells no longer blank when Dietz fails",
    titleTranslations: {
      es: "La matriz ya no deja en blanco periodos si falla Dietz",
    },
    changes: [
      {
        type: "fix",
        text: "Performance matrix Acciones/1S (and other period cells) fall back to the simple period return when Modified Dietz is unavailable or rejected, and fixed-return rows show 0% instead of “—” when snapshots lack that bucket.",
        translations: {
          es: "En la matriz, Acciones/1S (y otras celdas de periodo) usan el retorno simple si Modified Dietz no está disponible o se rechaza, y Retorno fijo muestra 0% en lugar de “—” cuando no hay bucket en el snapshot.",
        },
      },
    ],
  },
  {
    version: "2.5.158",
    date: "2026-08-12",
    title: "One day-change calculator for hero and matrix",
    titleTranslations: {
      es: "Un solo cálculo de cambio del día para titular y matriz",
    },
    changes: [
      {
        type: "fix",
        text: "Invested-assets headline, asset pills, and performance matrix now share one computeDayChangeByType result (All Assets = weighted sleeves), so the top €/% can no longer disagree with Todos los activos.",
        translations: {
          es: "El titular de activos invertidos, las pastillas y la matriz comparten un solo computeDayChangeByType (Todos los activos = mangas ponderadas), así el €/% de arriba ya no puede discrepar de Todos los activos.",
        },
      },
    ],
  },
  {
    version: "2.5.157",
    date: "2026-08-12",
    title: "All Assets today matches class rows",
    titleTranslations: {
      es: "Hoy de Todos los activos coincide con las clases",
    },
    changes: [
      {
        type: "fix",
        text: "All Assets “today” is now forced to the value-weighted combination of Acciones/Cripto/etc., so it can no longer show a small green gain while stocks are down ~2%.",
        translations: {
          es: "El “hoy” de Todos los activos se fuerza a la media ponderada de Acciones/Cripto/etc., así ya no puede mostrar una pequeña subida en verde mientras las acciones caen ~2%.",
        },
      },
    ],
  },
  {
    version: "2.5.156",
    date: "2026-08-12",
    title: "Warren looks up news on price moves",
    titleTranslations: {
      es: "Warren busca noticias cuando pregunta por caídas",
    },
    changes: [
      {
        type: "fix",
        text: "Warren now calls getTickerNews (and getQuote) for questions like “why did Uber drop?” instead of giving a generic factor list or asking permission to search; holdings news can refresh a stale cache when a provider is configured.",
        translations: {
          es: "Warren ahora usa getTickerNews (y getQuote) ante preguntas como “¿por qué bajó Uber?” en lugar de una lista genérica de factores o pedir permiso para buscar; las noticias de cartera pueden refrescar la caché cuando hay proveedor configurado.",
        },
      },
    ],
  },
  {
    version: "2.5.155",
    date: "2026-08-12",
    title: "All Assets day change matches headline",
    titleTranslations: {
      es: "El cambio diario de Todos los activos coincide con el titular",
    },
    changes: [
      {
        type: "fix",
        text: "All Assets day % is computed in one pass with each asset class and wired to the invested-assets headline, so the matrix can no longer show a small green gain while the headline shows a large daily loss.",
        translations: {
          es: "El % de hoy de Todos los activos se calcula en una sola pasada con cada clase y alimenta el titular de activos invertidos, para que la matriz ya no pueda mostrar una pequeña subida en verde mientras el titular muestra una pérdida fuerte del día.",
        },
      },
    ],
  },
  {
    version: "2.5.154",
    date: "2026-08-12",
    title: "portfolio_first empty state layout fix",
    titleTranslations: {
      es: "Corrección de layout portfolio_first",
    },
    changes: [
      {
        type: "improvement",
        text: "Admin Docs: NVIDIA company pitch deck available under Company & Pitch (docs/company).",
        translations: {
          es: "Admin Docs: pitch deck NVIDIA disponible en Company & Pitch (docs/company).",
        },
      },
      {
        type: "fix",
        text: "Empty activation portfolio_first: Import and Add sit in an equal two-column grid again; Import keeps a Recommended badge instead of a full-width + narrow stacked layout.",
        translations: {
          es: "Empty activation portfolio_first: Importar y Agregar vuelven a una cuadrícula de dos columnas iguales; Importar mantiene la insignia Recomendado en lugar del layout ancho + estrecho apilado.",
        },
      },
    ],
  },
  {
    version: "2.5.153",
    date: "2026-08-12",
    title: "Experiment metrics catalog",
    titleTranslations: {
      es: "Catálogo de métricas de experimentos",
    },
    changes: [
      {
        type: "feature",
        text: "Admin Experiments includes a metrics catalog (/admin/experiments/metrics) documenting analytics_events usable as conversion metrics — where they fire, source, and recommended experiments.",
        translations: {
          es: "Admin Experiments incluye un catálogo de métricas (/admin/experiments/metrics) que documenta los analytics_events usables como métricas de conversión — dónde se disparan, origen y experimentos recomendados.",
        },
      },
    ],
  },
  {
    version: "2.5.152",
    date: "2026-08-12",
    title: "Empty activation treatments polished",
    titleTranslations: {
      es: "Treatments de empty activation mejorados",
    },
    changes: [
      {
        type: "improvement",
        text: "Empty activation experiment: fixed broken moat link (/tools/evaluation), direct screener URL, and differentiated control / portfolio_first / job_chooser welcome layouts with clearer copy.",
        translations: {
          es: "Experimento empty activation: enlace de moat corregido (/tools/evaluation), URL directa al screener y layouts diferenciados control / portfolio_first / job_chooser con copy más claro.",
        },
      },
    ],
  },
  {
    version: "2.5.151",
    date: "2026-08-12",
    title: "Admin experiment treatment preview",
    titleTranslations: {
      es: "Preview de treatments de experimentos desde admin",
    },
    changes: [
      {
        type: "feature",
        text: "Admins can Preview each experiment variant from /admin/experiments (dedicated preview page for empty_activation) without writing sticky assignments or conversion metrics.",
        translations: {
          es: "Los admins pueden previsualizar cada variant de experimento desde /admin/experiments (página dedicada para empty_activation) sin escribir assignments sticky ni métricas de conversión.",
        },
      },
    ],
  },
  {
    version: "2.5.150",
    date: "2026-08-12",
    title: "Performance matrix long periods unlocked",
    titleTranslations: {
      es: "Periodos largos de la matriz sin candado Pro",
    },
    changes: [
      {
        type: "fix",
        text: "Removed leftover Pro locks on 3Y / 5Y / 10Y / All in the performance-by-period matrix (and chart range PRO badges). Long horizons follow the universal-access model.",
        translations: {
          es: "Eliminados los candados Pro residuales en 3A / 5A / 10A / Todo de la matriz de rendimiento por periodo (y las etiquetas PRO del selector de rango). Los horizontes largos siguen el modelo de acceso universal.",
        },
      },
    ],
  },
  {
    version: "2.5.149",
    date: "2026-08-12",
    title: "Edit fixed-return schedule",
    titleTranslations: {
      es: "Editar calendario de retorno fijo",
    },
    changes: [
      {
        type: "feature",
        text: "Edit fixed-return investments (e.g. Civislend) from Assets & Accounts — change start date, term, total return %, principal, and name in the same modal used to add them.",
        translations: {
          es: "Edita inversiones de retorno fijo (p. ej. Civislend) desde Activos y cuentas: cambia fecha de inicio, plazo, retorno total %, capital y nombre en el mismo modal de alta.",
        },
      },
    ],
  },
  {
    version: "2.5.148",
    date: "2026-08-12",
    title: "Fixed-return in asset breakdown cards",
    titleTranslations: {
      es: "Retorno fijo en las tarjetas de desglose",
    },
    changes: [
      {
        type: "improvement",
        text: "Fixed-return investments now appear as their own card in the All Assets / Stocks / Crypto breakdown strip (and in All Assets totals), not only under Assets & Accounts.",
        translations: {
          es: "Las inversiones de retorno fijo aparecen como tarjeta propia en el desglose Todos los activos / Acciones / Cripto (y en el total de Todos), no solo en Activos y cuentas.",
        },
      },
    ],
  },
  {
    version: "2.5.147",
    date: "2026-08-12",
    title: "Fixed-return counts as invested, not cash",
    titleTranslations: {
      es: "El retorno fijo cuenta como invertido, no como efectivo",
    },
    changes: [
      {
        type: "fix",
        text: "Fixed-return investments (e.g. Civislend) are no longer labeled “Cash available for investment” — they roll into Invested assets while staying listed under Assets & Accounts and the Fixed return allocation slice.",
        translations: {
          es: "Las inversiones de retorno fijo (p. ej. Civislend) ya no aparecen como “Efectivo disponible para invertir”: pasan a Activos invertidos y siguen en Activos y cuentas y en la asignación de Retorno fijo.",
        },
      },
    ],
  },
  {
    version: "2.5.146",
    date: "2026-08-12",
    title: "First-party A/B/C experiments",
    titleTranslations: {
      es: "Experimentos A/B/C propios",
    },
    changes: [
      {
        type: "feature",
        text: "Admin Experiments: create draft multi-variant tests, launch/pause/reset sticky assignments, and view live conversion stats. Empty welcome dashboard can run control / portfolio-first / job-chooser layouts.",
        translations: {
          es: "Admin Experiments: crea tests multi-variante en borrador, lanza/pausa/resetea asignaciones sticky y ve métricas de conversión en vivo. La portada vacía puede probar layouts control / portfolio-first / job-chooser.",
        },
      },
    ],
  },
  {
    version: "2.5.145",
    date: "2026-08-12",
    title: "Fixed-return assets visible on Home",
    titleTranslations: {
      es: "Activos de retorno fijo visibles en Home",
    },
    changes: [
      {
        type: "fix",
        text: "Fixed-return investments (e.g. Civislend) now appear under Assets & Accounts on the home dashboard, and their accrued value uses your local calendar date so they are not stuck at €0 around midnight UTC.",
        translations: {
          es: "Las inversiones de retorno fijo (p. ej. Civislend) aparecen en Activos y cuentas en el home, y el valor acumulado usa tu fecha local para no quedar en €0 alrededor de medianoche UTC.",
        },
      },
    ],
  },
  {
    version: "2.5.144",
    date: "2026-08-12",
    title: "Notification panel no longer covered by header",
    titleTranslations: {
      es: "El panel de notificaciones ya no queda tapado por el header",
    },
    changes: [
      {
        type: "fix",
        text: "The notifications drawer now opens above the market ticker and nav instead of rendering underneath them.",
        translations: {
          es: "El panel de notificaciones se abre por encima del ticker y la navegación en lugar de quedar debajo.",
        },
      },
    ],
  },
  {
    version: "2.5.143",
    date: "2026-08-12",
    title: "Show Calculating while first quotes load",
    titleTranslations: {
      es: "Mostrar Calculando mientras cargan las cotizaciones",
    },
    changes: [
      {
        type: "fix",
        text: "After you add your first stock, the dashboard shows “Calculating…” instead of €0 while live prices are fetched.",
        translations: {
          es: "Al añadir tu primera acción, el dashboard muestra “Calculando…” en lugar de €0 mientras se obtienen los precios en vivo.",
        },
      },
    ],
  },
  {
    version: "2.5.142",
    date: "2026-08-11",
    title: "One portfolio per account",
    titleTranslations: {
      es: "Una sola cartera por cuenta",
    },
    changes: [
      {
        type: "improvement",
        text: "trefolio now uses a single portfolio per account (Free and Pro). Extra portfolios are merged into your main one (holdings and cash kept; empty portfolios removed), and creating or moving between portfolios is disabled.",
        translations: {
          es: "trefolio usa ahora una sola cartera por cuenta (Free y Pro). Las carteras extra se fusionan en la principal (se conservan acciones y efectivo; se eliminan las vacías), y ya no se pueden crear ni mover entre carteras.",
        },
      },
    ],
  },
  {
    version: "2.5.141",
    date: "2026-08-11",
    title: "Show cash-only portfolios on the dashboard",
    titleTranslations: {
      es: "Mostrar carteras solo con efectivo en el dashboard",
    },
    changes: [
      {
        type: "fix",
        text: "Portfolios that only have cash or fixed-return assets (no stocks) no longer show the empty-portfolio screen — Civislend-style fixed-return positions and other Assets & Accounts entries appear as expected.",
        translations: {
          es: "Las carteras que solo tienen efectivo o activos de retorno fijo (sin acciones) ya no muestran la pantalla de cartera vacía — posiciones de retorno fijo tipo Civislend y otros activos de Activos y Cuentas aparecen correctamente.",
        },
      },
    ],
  },
  {
    version: "2.5.140",
    date: "2026-08-11",
    title: "Warren: add-stock only on empty portfolios",
    titleTranslations: {
      es: "Warren: solo añadir acciones en carteras vacías",
    },
    changes: [
      {
        type: "feature",
        text: "When your portfolio is empty, Warren only helps add stocks (not general chat). After 10 add-stock messages, there is a 15-minute break before you can use him again — so onboarding stays focused and AI costs stay predictable.",
        translations: {
          es: "Cuando tu cartera está vacía, Warren solo ayuda a añadir acciones (no chat general). Tras 10 mensajes para añadir, hay un descanso de 15 minutos antes de poder usarlo de nuevo — así el onboarding sigue enfocado y el coste de IA se mantiene predecible.",
        },
      },
    ],
  },
  {
    version: "2.5.139",
    date: "2026-08-11",
    title: "Market ticker: always scroll",
    titleTranslations: {
      es: "Ticker de mercado: scroll continuo",
    },
    changes: [
      {
        type: "fix",
        text: "The header market tape scrolls continuously again on wide screens (it previously stayed still when the strip fit the viewport).",
        translations: {
          es: "La cinta de mercado del header vuelve a desplazarse de forma continua en pantallas anchas (antes se quedaba quieta si el contenido cabía en el viewport).",
        },
      },
    ],
  },
  {
    version: "2.5.138",
    date: "2026-08-11",
    title: "Company analysis: show sector in header",
    titleTranslations: {
      es: "Análisis: sector visible en la cabecera",
    },
    changes: [
      {
        type: "improvement",
        text: "The /analisis page header now shows the stock’s sector and industry under the company name.",
        translations: {
          es: "La cabecera de /analisis muestra ahora el sector y la industria de la acción bajo el nombre de la empresa.",
        },
      },
    ],
  },
  {
    version: "2.5.137",
    date: "2026-08-11",
    title: "SnapTrade: import recent orders when activities lag",
    titleTranslations: {
      es: "SnapTrade: importar órdenes recientes cuando las activities van con retraso",
    },
    changes: [
      {
        type: "fix",
        text: "After a broker reconnect, SnapTrade activities can be empty for up to a day while positions and EXECUTED orders are already available. Sync now merges those orders into the transaction ledger (with fingerprint dedupe), and no longer advances last_imported_at when the first activity fetch returns nothing — so buys like ZTS and sells like ICGA.DE appear in Transactions instead of only as orphan positions. Open DEGIRO limit orders mislabeled EXECUTED (null fill/price while the position is unchanged) are ignored. SnapTrade imports now set exchange, link holding_id to existing positions, and blank-exchange txs still match on /analisis.",
        translations: {
          es: "Tras reconectar un broker, las activities de SnapTrade pueden estar vacías hasta un día mientras posiciones y órdenes EXECUTED ya están disponibles. El sync ahora fusiona esas órdenes en el ledger de transacciones (con dedupe por huella), y ya no avanza last_imported_at cuando el primer fetch de activities no devuelve nada — así compras como ZTS y ventas como ICGA.DE aparecen en Transacciones en lugar de solo como posiciones huérfanas. Se ignoran órdenes límite abiertas de DEGIRO mal etiquetadas como EXECUTED (sin fill/precio y con la posición intacta). Los imports de SnapTrade ahora rellenan exchange, enlazan holding_id a la posición existente, y las txs sin exchange siguen emparejando en /analisis.",
        },
      },
    ],
  },
  {
    version: "2.5.136",
    date: "2026-08-10",
    title: "Screening: trefolio-only evaluation branding",
    titleTranslations: {
      es: "Cribado: evaluación solo con marca trefolio",
    },
    changes: [
      {
        type: "improvement",
        text: "Screening evaluation copy, progress labels, and agent prompts now say trefolio only — no third-party author or fund names in the product UI or model instructions.",
        translations: {
          es: "El copy de evaluación del cribado, las etiquetas de progreso y los prompts de agentes hablan solo de trefolio — sin nombres de autores o fondos de terceros en la UI ni en las instrucciones del modelo.",
        },
      },
    ],
  },
  {
    version: "2.5.135",
    date: "2026-08-10",
    title: "Screening: stop zombie shortlist stalls",
    titleTranslations: {
      es: "Cribado: menos bloqueos en research de shortlist",
    },
    changes: [
      {
        type: "fix",
        text: "Screening runs no longer die mid–shortlist research because create-run’s background drain was capped at 60s. Resume now force-expires zombie leases, shortlist research heartbeats and budgets Tavily time, and the recover cron runs every 2 minutes.",
        translations: {
          es: "Los cribados ya no mueren a mitad del research de shortlist porque el drain en segundo plano al crear el run estaba limitado a 60s. Reanudar fuerza la caducidad de leases zombie, el research hace heartbeat y limita el tiempo de Tavily, y el cron de recuperación corre cada 2 minutos.",
        },
      },
    ],
  },
  {
    version: "2.5.134",
    date: "2026-08-10",
    title: "Screening: price chart inside Technicals",
    titleTranslations: {
      es: "Cribado: gráfico de precio dentro de Técnico",
    },
    changes: [
      {
        type: "improvement",
        text: "The screening price history chart now lives inside the Technicals section of each candidate card, not as a separate block below it.",
        translations: {
          es: "El gráfico de evolución del precio del cribado queda dentro de la sección Técnico de cada ficha, no como un bloque aparte debajo.",
        },
      },
    ],
  },
  {
    version: "2.5.133",
    date: "2026-08-10",
    title: "Screening: price history on candidate cards",
    titleTranslations: {
      es: "Cribado: evolución del precio en las fichas",
    },
    changes: [
      {
        type: "feature",
        text: "Screening candidate cards now include an interactive price chart with 1W, 1M, 3M, 6M, 1Y and 5Y ranges. The 52-week range bar also works on older reports that only stored distance percentages.",
        translations: {
          es: "Las fichas del cribado incluyen un gráfico de evolución del precio con rangos 1S, 1M, 3M, 6M, 1A y 5A. La barra de rango 52 semanas también funciona en informes antiguos que solo tenían porcentajes de distancia.",
        },
      },
    ],
  },
  {
    version: "2.5.132",
    date: "2026-08-10",
    title: "Screening: 52-week range on candidate cards",
    titleTranslations: {
      es: "Cribado: rango 52 semanas en las fichas de candidatos",
    },
    changes: [
      {
        type: "improvement",
        text: "Each screening candidate now shows a DEGIRO-style 52-week range bar — where today’s price sits between the 12-month low and high, with dates and 1-year price change.",
        translations: {
          es: "Cada candidato del cribado muestra una barra de rango 52 semanas al estilo DEGIRO: dónde está el precio de hoy entre el mínimo y el máximo de 12 meses, con fechas y la variación a 1 año.",
        },
      },
    ],
  },
  {
    version: "2.5.131",
    date: "2026-08-10",
    title: "Screening: clearer verification notes",
    titleTranslations: {
      es: "Cribado: notas de verificación más claras",
    },
    changes: [
      {
        type: "fix",
        text: "QA no longer treats a recent guidance date as “in the future”, and verification notes use plain language instead of internal rule codes like R6.",
        translations: {
          es: "El QA ya no trata una fecha de guidance reciente como “futura”, y las notas de verificación usan lenguaje claro en lugar de códigos internos como R6.",
        },
      },
    ],
  },
  {
    version: "2.5.130",
    date: "2026-08-10",
    title: "Screening: resume no longer strands research",
    titleTranslations: {
      es: "Cribado: reanudar ya no deja el research a medias",
    },
    changes: [
      {
        type: "fix",
        text: "Resume now reclaims expired step leases and continues heavy shortlist research in the background with a longer timeout, so a stalled Tavily/LLM step can finish instead of looking permanently stuck.",
        translations: {
          es: "Reanudar ahora recupera leases caducados y continúa el research pesado de shortlist en segundo plano con más tiempo, para que un paso Tavily/LLM parado pueda terminar en lugar de quedar bloqueado.",
        },
      },
    ],
  },
  {
    version: "2.5.129",
    date: "2026-08-10",
    title: "Screening: trefolio framework evaluation",
    titleTranslations: {
      es: "Cribado: evaluación con marco trefolio",
    },
    changes: [
      {
        type: "feature",
        text: "When framework evaluation is enabled, screening runs a Compiler evaluate step after shortlist research that applies the trefolio value-investing checklist to each shortlisted company — filter verdict, moat, management, financials, valuation, catalysts, risks/pre-mortem, gaps and conviction — with explicit “data not available” when figures are missing. Upstream Hard Data, IR, Web and Tavily research collect the evidence; cards show the structured evaluation with the usual not-advice disclaimer.",
        translations: {
          es: "Con la evaluación de marco activada, el cribado ejecuta un paso Compiler evaluate tras el research de shortlist que aplica el checklist de inversión de trefolio a cada empresa — veredicto de filtro, moat, directiva, números, valoración, catalizadores, riesgos/pre-mortem, lagunas y convicción — marcando “dato no disponible” si falta evidencia. Hard Data, IR, Web y Tavily aportan los datos; las fichas muestran la evaluación estructurada con el disclaimer habitual de no asesoramiento.",
        },
      },
    ],
  },
  {
    version: "2.5.128",
    date: "2026-08-10",
    title: "Screening: clearer cheap / fit / solidity chips",
    titleTranslations: {
      es: "Cribado: fichas barata / fit / solidez más claras",
    },
    changes: [
      {
        type: "improvement",
        text: "Detailed cards explain Cheap / Portfolio fit / Solidity with clearer labels and short hints. Solidity uses MOAT when available (generating and caching it on shortlist miss) and always shows ND/EBITDA or net cash alongside. Red on “expensive” means little valuation margin — not a bad business.",
        translations: {
          es: "Las fichas detalladas aclaran ¿Barata? / Fit / Solidez con etiquetas más claras y ayudas cortas. Solidez usa MOAT si existe (lo genera y cachea si falta en el shortlist) y siempre muestra ND/EBITDA o caja neta. El rojo en “cara” significa poco margen de valoración — no un mal negocio.",
        },
      },
    ],
  },
  {
    version: "2.5.127",
    date: "2026-08-09",
    title: "Screening: View report opens the report",
    titleTranslations: {
      es: "Cribado: Ver informe abre el informe",
    },
    changes: [
      {
        type: "fix",
        text: "From the screening entry list, “View report” now opens the finished report instead of the agent timeline. In-progress screens still open the agents progress view.",
        translations: {
          es: "Desde la lista de cribados, “Ver informe” abre el informe terminado en lugar de la línea de agentes. Los cribados en curso siguen abriendo el progreso de agentes.",
        },
      },
    ],
  },
  {
    version: "2.5.126",
    date: "2026-08-09",
    title: "Screening: cheap / fit / solidity categories",
    titleTranslations: {
      es: "Cribado: categorías barata / fit / solidez",
    },
    changes: [
      {
        type: "feature",
        text: "Investment screening no longer shows a single score/8 or Strong/Watch verdict. Each candidate is assessed on three independent axes: Cheap? (current vs historical P/E), Portfolio fit?, and Solidity (trefolio MOAT). Legacy reports are backfilled on read; the methodology checklist is collapsed supporting detail. A solid, well-fitting name can still read as expensive with little margin of safety.",
        translations: {
          es: "El cribado de inversión ya no muestra un score/8 ni el veredicto Strong/Watch. Cada candidato se evalúa en tres ejes independientes: ¿Está barata? (PER actual vs histórico), ¿Fit en portfolio? y Solidez (MOAT de trefolio). Los informes antiguos se completan al leerlos; la checklist de metodología queda como detalle colapsable. Una empresa puede ser sólida y encajar bien y seguir leyéndose como cara, sin margen de seguridad.",
        },
      },
    ],
  },
  {
    version: "2.5.125",
    date: "2026-08-09",
    title: "Admin: screening cost leaderboard",
    titleTranslations: {
      es: "Admin: ranking de coste de cribado",
    },
    changes: [
      {
        type: "feature",
        text: "Admins can open Screening Costs to see every screening report ranked from most to least expensive, with LLM and Tavily breakdown. Ops cost also appears on the report itself for admins.",
        translations: {
          es: "Los admins pueden abrir Screening Costs para ver cada informe de cribado ordenado de más a menos costoso, con desglose LLM y Tavily. El coste de ops también aparece en el propio informe para admins.",
        },
      },
    ],
  },
  {
    version: "2.5.124",
    date: "2026-08-09",
    title: "Screening IR: official IR pages and documents",
    titleTranslations: {
      es: "Cribado IR: páginas y documentos oficiales de IR",
    },
    changes: [
      {
        type: "improvement",
        text: "The IR / Business screening agent now finds the company’s Investor Relations page, extracts recent HTML earnings and IR documents, and uses those excerpts as primary evidence. Tavily Research is only a fallback when FMP and IR extract are both thin.",
        translations: {
          es: "El agente IR / Negocio del cribado ahora encuentra la página de Investor Relations, extrae comunicados y documentos HTML recientes y los usa como evidencia principal. Tavily Research solo actúa como respaldo si FMP y el extract de IR son insuficientes.",
        },
      },
    ],
  },
  {
    version: "2.5.123",
    date: "2026-08-09",
    title: "Screening beta on home + weekly limit",
    titleTranslations: {
      es: "Cribado beta en inicio + límite semanal",
    },
    changes: [
      {
        type: "feature",
        text: "Home shows a beta banner for investment screening when the feature flag is on.",
        translations: {
          es: "La página de inicio muestra un banner beta del cribado de inversión cuando el feature flag está activo.",
        },
      },
      {
        type: "improvement",
        text: "Each user can run up to 3 investment screens per week (admins unlimited). Entry preview switchers and mock/demo badges are removed from the screening UI.",
        translations: {
          es: "Cada usuario puede lanzar hasta 3 cribados de inversión por semana (admins ilimitados). Se quitan el selector de estados de vista previa y las etiquetas mock/demo de la UI de cribado.",
        },
      },
    ],
  },
  {
    version: "2.5.122",
    date: "2026-08-09",
    title: "Screening: harder checklist scoring",
    titleTranslations: {
      es: "Cribado: checklist de puntuación más exigente",
    },
    changes: [
      {
        type: "fix",
        text: "Screening no longer treats a depressed TTM P/E as cheap when earnings look inflated vs the latest fiscal year, and ND/EBITDA ≥ 2.5x now fails the balance criterion instead of showing “not enough data”.",
        translations: {
          es: "El cribado ya no trata un PER TTM deprimido como barato si el beneficio parece inflado frente al último ejercicio, y un ND/EBITDA ≥ 2,5x falla el criterio de balance en vez de mostrar “datos insuficientes”.",
        },
      },
      {
        type: "improvement",
        text: "Price–fundamentals divergence now requires a weak 1y price plus improving revenue — not consensus upside alone. Strong candidate requires 6/8 (was 5/8). Merger catalysts add an explicit deal-structure risk note in the educational thesis.",
        translations: {
          es: "La divergencia precio-fundamentales exige cotización débil a 1 año y ingresos en mejora — no solo el upside de consenso. Candidato fuerte exige 6/8 (antes 5/8). Los catalizadores de fusión añaden una nota explícita de riesgo de estructura del acuerdo en la tesis educativa.",
        },
      },
    ],
  },
  {
    version: "2.5.121",
    date: "2026-08-09",
    title: "Screening: admin-configurable agent models",
    titleTranslations: {
      es: "Cribado: modelos de agentes configurables en admin",
    },
    changes: [
      {
        type: "improvement",
        text: "Investment screening LLM agents (Intake through QA) are selectable in Admin → Settings → AI Model Configuration. Compiler and QA default to GPT-4.1; other agents default to GPT-4o Mini.",
        translations: {
          es: "Los agentes LLM del cribado (desde Intake hasta QA) se eligen en Admin → Ajustes → Configuración de modelos IA. Compiler y QA usan GPT-4.1 por defecto; el resto, GPT-4o Mini.",
        },
      },
    ],
  },
  {
    version: "2.5.120",
    date: "2026-08-09",
    title: "Screening: show report when QA flags the only name",
    titleTranslations: {
      es: "Cribado: mostrar informe si QA marca el único nombre",
    },
    changes: [
      {
        type: "fix",
        text: "Analyze (and other) reports no longer fail to open when verification flags every candidate — the card stays with caveats instead of an empty-report error.",
        translations: {
          es: "Los informes de Analizar (y otros) ya no fallan al abrir si la verificación marca todos los candidatos: la ficha se muestra con reservas en lugar de un error de informe vacío.",
        },
      },
    ],
  },
  {
    version: "2.5.119",
    date: "2026-08-09",
    title: "Screening: keep research moving after Hard Data",
    titleTranslations: {
      es: "Cribado: seguir investigando tras Hard Data",
    },
    changes: [
      {
        type: "fix",
        text: "After Hard Data fans out research steps, a sibling worker keeps IR/Web/Technicals moving if one step hangs. Progress credits in-flight agents so the bar no longer looks stuck at ~11%, and stuck detection resumes sooner.",
        translations: {
          es: "Tras el fan-out de Hard Data, un worker hermano sigue con IR/Web/Técnico si un paso se cuelga. El progreso cuenta agentes en curso para no quedarse en ~11%, y la detección de atasco reanuda antes.",
        },
      },
    ],
  },
  {
    version: "2.5.118",
    date: "2026-08-08",
    title: "Screening: analyze one company",
    titleTranslations: {
      es: "Cribado: analizar una empresa",
    },
    changes: [
      {
        type: "feature",
        text: "New Analyze intent: type a ticker or company name, confirm the listing/exchange when needed, then run the research pipeline on that single name.",
        translations: {
          es: "Nuevo modo Analizar: escribe un ticker o nombre, confirma la cotización/exchange si hace falta, y el pipeline investiga solo esa empresa.",
        },
      },
    ],
  },
  {
    version: "2.5.117",
    date: "2026-08-08",
    title: "Screening progress: liveness + resume",
    titleTranslations: {
      es: "Progreso de cribado: actividad y reanudar",
    },
    changes: [
      {
        type: "improvement",
        text: "Screening run progress shows ticker sub-counts, last activity time, and stale/stuck warnings when the worker goes quiet — with a Resume action (and one automatic kick when stuck).",
        translations: {
          es: "El progreso del cribado muestra contadores por ticker, la última actividad y avisos si el worker se queda en silencio — con acción Reanudar (y un reintento automático si está atascado).",
        },
      },
    ],
  },
  {
    version: "2.5.116",
    date: "2026-08-08",
    title: "Screening intake: metric guide",
    titleTranslations: {
      es: "Cribado intake: guía de métricas",
    },
    changes: [
      {
        type: "improvement",
        text: "Intake chat shows a left-hand metric guide and ⓘ tips on each brief filter — what the number means and whether higher or lower is usually stricter — so it is easier to choose.",
        translations: {
          es: "El chat de intake muestra una guía de métricas a la izquierda y tips ⓘ en cada filtro del brief — qué significa el dato y si más alto o más bajo suele ser más estricto — para elegir con más claridad.",
        },
      },
    ],
  },
  {
    version: "2.5.115",
    date: "2026-08-08",
    title: "Screening: company research + per-report cost",
    titleTranslations: {
      es: "Cribado: research de compañía y coste por informe",
    },
    changes: [
      {
        type: "feature",
        text: "Optional Tavily Company Research enriches thin IR evidence and deep-dives the shortlist after the Compiler, with a shared 7-day ticker cache reused by /analisis. Web Search still covers news sentiment; analyst Search is skipped when research is already cached.",
        translations: {
          es: "El research opcional de Tavily refuerza el IR cuando FMP va corto y profundiza la shortlist tras el Compiler, con caché de ticker compartida (7 días) reutilizada por /analisis. La búsqueda web sigue cubriendo el sentimiento de noticias; se omite la búsqueda de ratings si ya hay research en caché.",
        },
      },
      {
        type: "improvement",
        text: "Each screening report now carries a variable ops cost (LLM tokens + Tavily Search/Research). FMP is excluded as a fixed plan cost. Cost breakdown is returned on the report API for ops.",
        translations: {
          es: "Cada informe de cribado incluye un coste variable de ops (tokens LLM + búsquedas/research de Tavily). FMP no se imputa (coste fijo del plan). El desglose se expone en la API del informe para ops.",
        },
      },
    ],
  },
  {
    version: "2.5.114",
    date: "2026-08-08",
    title: "Screening intake: centered composer",
    titleTranslations: {
      es: "Cribado intake: compositor centrado",
    },
    changes: [
      {
        type: "improvement",
        text: "On /screening/intake, the reply field sits with the conversation in the vertical center and eases downward as turns arrive, keeping the latest message visible.",
        translations: {
          es: "En /screening/intake, el campo de respuesta queda con la conversación en el centro vertical y baja conforme llegan turnos, manteniendo visible el último mensaje.",
        },
      },
    ],
  },
  {
    version: "2.5.113",
    date: "2026-08-08",
    title: "Screening: educational candidate theses",
    titleTranslations: {
      es: "Cribado: tesis educativas por candidato",
    },
    changes: [
      {
        type: "improvement",
        text: "Candidate theses now explain valuation, technicals, catalysts, fit and checklist scores in plain language for beginners and experienced readers. The Compiler also drafts richer multi-paragraph theses using full research context including technicals.",
        translations: {
          es: "Las tesis por candidato ahora explican valoración, técnico, catalizadores, encaje y checklist en lenguaje claro para principiantes y expertos. El Compiler también redacta tesis multipárrafo más ricas usando todo el contexto de investigación, incluido el técnico.",
        },
      },
    ],
  },
  {
    version: "2.5.112",
    date: "2026-08-08",
    title: "Screening: quieter progress feed and wider report",
    titleTranslations: {
      es: "Cribado: feed de progreso más limpio e informe más ancho",
    },
    changes: [
      {
        type: "improvement",
        text: "Run progress now shows Claude-style activity paragraphs without ticker counts. The research report uses the full home-page width with a clearer layout, and candidate/removal counts are hidden from the header and verification banner.",
        translations: {
          es: "El progreso del run muestra párrafos de actividad estilo Claude sin conteos de tickers. El informe usa el ancho completo de la home con mejor distribución, y se ocultan los conteos de candidatos/eliminados en cabecera y verificación.",
        },
      },
    ],
  },
  {
    version: "2.5.111",
    date: "2026-08-08",
    title: "Screening: centered intake, agent feed, late top-5 selection",
    titleTranslations: {
      es: "Cribado: intake centrado, feed de agentes y selección final de 5",
    },
    changes: [
      {
        type: "improvement",
        text: "Intake is a centered chat; run progress reveals agent titles as each step starts. Research fans out over ~20 equities and the Compiler selects the final 5 with full evidence. QA no longer shows as “coming soon”, and ticker substeps say “Investigating N…” instead of “0/N”.",
        translations: {
          es: "El intake es un chat centrado; el progreso del run revela títulos de agentes al arrancar. La investigación se hace sobre ~20 acciones y el Compiler elige las 5 finales con toda la evidencia. QA ya no aparece como “próximamente”, y los subpasos dicen “Investigando N…” en lugar de “0/N”.",
        },
      },
    ],
  },
  {
    version: "2.5.110",
    date: "2026-08-08",
    title: "Screening: rank ~20 equities, shortlist 5, coarser filters",
    titleTranslations: {
      es: "Cribado: rankea ~20 empresas, shortlist de 5, filtros menos granulares",
    },
    changes: [
      {
        type: "improvement",
        text: "Hard Data now ranks about 20 equities (funds filtered out) and always shortlists up to 5 — no candidate-count question. Intake focuses on sector, size, P/E, ROIC/leverage and region. Cards that miss the majority of brief filters list the unmet expectations.",
        translations: {
          es: "Hard Data ahora rankea unas 20 acciones (sin fondos) y siempre deja como máximo 5 — ya no se pregunta cuántos candidatos. El intake se centra en sector, tamaño, PER, ROIC/apalancamiento y región. Las tarjetas que no cumplen la mayoría de filtros del brief listan las expectativas no cumplidas.",
        },
      },
    ],
  },
  {
    version: "2.5.109",
    date: "2026-08-08",
    title: "Screening QA: fix directed retries and guidance freshness",
    titleTranslations: {
      es: "QA de cribado: corrige reintentos dirigidos y frescura de guidance",
    },
    changes: [
      {
        type: "fix",
        text: "QA Layer B aliases like ir/web now map to ir_business/web_sentiment so failed verification actually re-runs the flagged agents instead of skipping straight to ticker degradation. Guidance freshness (R6) is checked deterministically so recent past dates are not treated as “future”.",
        translations: {
          es: "Los alias de QA Layer B (ir/web) se mapean a ir_business/web_sentiment para que la verificación fallida reintente de verdad los agentes marcados en lugar de degradar tickers. La frescura de guidance (R6) se valida de forma determinista para no tratar fechas recientes como “futuro”.",
        },
      },
    ],
  },
  {
    version: "2.5.108",
    date: "2026-08-08",
    title: "Screening intake: sample conversation pilot",
    titleTranslations: {
      es: "Intake de cribado: piloto de conversación de ejemplo",
    },
    changes: [
      {
        type: "feature",
        text: "On /screening/intake, “Watch a sample conversation” plays curated user replies through the real Intake agent so you can see the brief fill in; when it finishes you review and press Run the screen yourself.",
        translations: {
          es: "En /screening/intake, “Ver una conversación de ejemplo” envía respuestas curadas al agente de Intake real para ver cómo se arma el brief; al terminar tú revisas y pulsas Ejecutar el cribado.",
        },
      },
    ],
  },
  {
    version: "2.5.107",
    date: "2026-08-08",
    title: "Screening: verified reports gate delivery and retry flagged agents",
    titleTranslations: {
      es: "Cribado: informes verificados bloquean la entrega y reintentan agentes marcados",
    },
    changes: [
      {
        type: "feature",
        text: "When Screening QA is enabled, reports only unlock after a passing verification. On fail the pipeline re-runs only the flagged agents (up to 2 rounds) with a correction hint; stubborn tickers are dropped from the report. Verified / Flagged banners and Prometheus QA counters ship with this release.",
        translations: {
          es: "Con el QA de cribado activado, los informes solo se desbloquean tras una verificación aprobada. Si falla, el pipeline reintenta solo los agentes marcados (hasta 2 rondas) con una pista de corrección; los tickers que siguen fallando se eliminan del informe. Incluye banners Verificado/Marcado y contadores Prometheus de QA.",
        },
      },
    ],
  },
  {
    version: "2.5.106",
    date: "2026-08-08",
    title: "Screening: QA agent qualitative judge",
    titleTranslations: {
      es: "Cribado: juez cualitativo del agente QA",
    },
    changes: [
      {
        type: "improvement",
        text: "The QA agent now runs an LLM qualitative judge (Layer B) on top of the deterministic rules, catching R3 (insider directional context), R6 (guidance freshness), R7 (price-drop causality) and R8 (M&A vs organic growth) — still shadow-mode until Phase 3 gates delivery on the verdict.",
        translations: {
          es: "El agente QA ejecuta ahora un juez cualitativo LLM (capa B) por encima de las reglas deterministas, cubriendo R3 (contexto direccional de insiders), R6 (frescura de guidance), R7 (causalidad de caídas de precio) y R8 (M&A vs crecimiento orgánico) — todavía en modo sombra hasta que la fase 3 bloquee la entrega según el veredicto.",
        },
      },
    ],
  },
  {
    version: "2.5.105",
    date: "2026-08-08",
    title: "Screening: QA agent shadow mode",
    titleTranslations: {
      es: "Cribado: agente QA en modo sombra",
    },
    changes: [
      {
        type: "improvement",
        text: "Screening runs can now enable a QA agent that runs deterministic verification (R1/R2/R4/R5/R9/R10) over the compiled report. In this phase the verdict is shown as a Verified/Flagged banner without blocking delivery, so we can measure false positives before gating reports.",
        translations: {
          es: "Las corridas de cribado pueden habilitar un agente QA que ejecuta verificación determinista (R1/R2/R4/R5/R9/R10) sobre el informe compilado. En esta fase el veredicto se muestra como un banner Verificado/Marcado sin bloquear la entrega, para medir falsos positivos antes de exigir aprobación.",
        },
      },
    ],
  },
  {
    version: "2.5.104",
    date: "2026-08-08",
    title: "Screening: technicals block on every candidate card",
    titleTranslations: {
      es: "Cribado: bloque técnico en cada ficha de candidato",
    },
    changes: [
      {
        type: "feature",
        text: "Screening reports now show a Technicals section per candidate — distance from 52w highs and lows, 200-day moving average trend, support/resistance, 3m/1y return and annualised volatility — derived from real FMP price history, and criterion 9 (market signal) now uses these when available. Older runs backfill on first read.",
        translations: {
          es: "Los informes de cribado ahora muestran un bloque Técnico por candidato — distancia a máximos y mínimos de 52 semanas, tendencia frente a la MM200, soporte/resistencia, rentabilidad 3m/1a y volatilidad anualizada — desde el histórico real de FMP, y el criterio 9 (señal de mercado) los usa cuando existen. Los runs antiguos se completan al abrir el informe.",
        },
      },
    ],
  },
  {
    version: "2.5.103",
    date: "2026-08-08",
    title: "Screening: score more methodology criteria from hard data",
    titleTranslations: {
      es: "Cribado: puntuar más criterios de metodología con datos duros",
    },
    changes: [
      {
        type: "improvement",
        text: "Screening reports now score criterion 3 (dated catalyst) from the IR agent, criterion 6 (insider alignment) from the Web/Sentiment agent, and criterion 4 (earnings resilience) from 5 years of revenue growth — no more “Not enough data” placeholders when the evidence is already in the run.",
        translations: {
          es: "Los informes de cribado ahora puntúan el criterio 3 (catalizador con fecha) desde el agente de IR, el criterio 6 (alineación de insiders) desde el agente Web/Sentimiento, y el criterio 4 (resiliencia de beneficios) desde 5 años de crecimiento de ingresos — se acabó el “Datos insuficientes” cuando la evidencia ya está en el run.",
        },
      },
    ],
  },
  {
    version: "2.5.102",
    date: "2026-08-08",
    title: "Screening: stop stalling before Risk / Compiler",
    titleTranslations: {
      es: "Cribado: evitar bloqueo antes de Riesgo / Compiler",
    },
    changes: [
      {
        type: "fix",
        text: "The screening worker now drains more steps inline and awaits the next worker hop instead of relying on waitUntil, so runs no longer stall with Risk still pending after Portfolio Context.",
        translations: {
          es: "El worker de cribado drena más pasos en la misma petición y espera el siguiente hop en lugar de depender de waitUntil, para que los runs no se queden con Riesgo pendiente tras Contexto de cartera.",
        },
      },
    ],
  },
  {
    version: "2.5.101",
    date: "2026-08-08",
    title: "Screening: restore PE, EV/EBITDA and growth on reports",
    titleTranslations: {
      es: "Cribado: restaurar PER, EV/EBITDA y crecimiento en informes",
    },
    changes: [
      {
        type: "fix",
        text: "Screening report multiples map FMP’s current stable field names (TTM P/E, EV/EBITDA), pull revenue growth and price targets when available, and re-enrich older Hard Data rows so valuation/growth columns are no longer blank dashes.",
        translations: {
          es: "Los múltiplos del informe de cribado usan los nombres actuales de FMP stable (PER TTM, EV/EBITDA), obtienen crecimiento de ingresos y objetivos de precio cuando existen, y re-enriquecen filas Hard Data antiguas para que valoración/crecimiento dejen de ser guiones.",
        },
      },
    ],
  },
  {
    version: "2.5.100",
    date: "2026-08-08",
    title: "Screening: fix report load when IR one-liner is missing",
    titleTranslations: {
      es: "Cribado: corregir carga del informe sin one-liner de IR",
    },
    changes: [
      {
        type: "fix",
        text: "Screening reports load again when a candidate has no IR business one-liner: the Hard Data analysis summary is clipped to the card schema limit instead of failing the whole report.",
        translations: {
          es: "Los informes de cribado vuelven a cargar cuando un candidato no tiene one-liner de IR: el resumen de Hard Data se recorta al límite del esquema de la ficha en lugar de fallar todo el informe.",
        },
      },
    ],
  },
  {
    version: "2.5.99",
    date: "2026-08-08",
    title: "Screening: show step errors on the agent timeline",
    titleTranslations: {
      es: "Cribado: errores de paso en la línea de agentes",
    },
    changes: [
      {
        type: "fix",
        text: "Failed screening runs keep the agent timeline visible and mark the failed step with ✕ and its error message, instead of replacing the whole page with a generic failure notice.",
        translations: {
          es: "Si un cribado falla, la línea de agentes sigue visible y el paso fallido se marca con ✕ y su mensaje de error, en lugar de sustituir toda la página por un aviso genérico.",
        },
      },
      {
        type: "fix",
        text: "Screening worker timeout and step leases are longer so Web & Sentiment steps are less likely to get stuck mid-run after a Vercel function kill.",
        translations: {
          es: "El timeout del worker de cribado y los leases de los pasos son más largos para que Web & Sentimiento no se queden a medias tras un kill de la función en Vercel.",
        },
      },
    ],
  },
  {
    version: "2.5.98",
    date: "2026-08-08",
    title: "Screening report blur preview toggle",
    titleTranslations: {
      es: "Toggle de vista bloqueada en el informe de cribado",
    },
    changes: [
      {
        type: "improvement",
        text: "Screening reports have a temporary “Preview locked” toggle that blurs tickers #2–N and actionable research (thesis, multiples, fit/risk) so we can validate the paywall teaser before credits.",
        translations: {
          es: "Los informes de cribado tienen un toggle temporal “Vista previa bloqueada” que difumina tickers #2–N y la investigación accionable (tesis, múltiplos, encaje/riesgo) para validar el teaser de paywall antes de los créditos.",
        },
      },
    ],
  },
  {
    version: "2.5.97",
    date: "2026-08-08",
    title: "Screening reports fill valuation metrics and MOAT",
    titleTranslations: {
      es: "Informes de cribado con métricas de valoración y MOAT",
    },
    changes: [
      {
        type: "fix",
        text: "Screening candidate cards and the comparison table now fill forward P/E, EV/EBITDA, ND/EBITDA, dividend, target/upside, net cash, score, and verdict from FMP fundamentals instead of leaving dashes.",
        translations: {
          es: "Las fichas del cribado y la tabla comparativa rellenan PER forward, EV/EBITDA, ND/EBITDA, dividendo, objetivo/upside, caja neta, score y veredicto con fundamentales FMP en lugar de dejar guiones.",
        },
      },
      {
        type: "improvement",
        text: "Hard Data ranking now uses cached trefolio MOAT scores and /analisis summaries when available, and report cards surface moatScore from that cache.",
        translations: {
          es: "El ranking de Hard Data usa puntuaciones MOAT y resúmenes de /analisis en caché de trefolio cuando existen, y las fichas muestran moatScore desde esa caché.",
        },
      },
    ],
  },
  {
    version: "2.5.96",
    date: "2026-08-07",
    title: "Screening: Web, portfolio fit, and risk agents",
    titleTranslations: {
      es: "Cribado: agentes web, encaje de cartera y riesgo",
    },
    changes: [
      {
        type: "feature",
        text: "Investment Screening can run Web & Sentiment, Portfolio Context, and Risk agents (flag `screening_agents_v2_enabled`). Intake asks for a risk profile; report cards can show sentiment, fit, and suitability when those agents finish.",
        translations: {
          es: "El cribado de inversiones puede ejecutar los agentes Web y sentimiento, Contexto de cartera y Riesgo (flag `screening_agents_v2_enabled`). El intake pregunta el perfil de riesgo; las tarjetas pueden mostrar sentimiento, encaje y idoneidad cuando esos agentes terminan.",
        },
      },
      {
        type: "improvement",
        text: "Web research uses FMP news/insiders plus optional Tavily search (ticker and company name only). Missing Tavily keys fall back to FMP-only evidence.",
        translations: {
          es: "La investigación web usa noticias e insiders de FMP más búsqueda opcional en Tavily (solo ticker y nombre). Sin clave de Tavily se usa solo evidencia FMP.",
        },
      },
    ],
  },
  {
    version: "2.5.95",
    date: "2026-08-07",
    title: "Screening: watch agents, then open the report",
    titleTranslations: {
      es: "Cribado: ver agentes y luego abrir el informe",
    },
    changes: [
      {
        type: "improvement",
        text: "Launching a screen opens the agent timeline immediately. When the run finishes you choose “See report” instead of jumping straight to the report. The Dev agent log on a run page shows sources consulted and each agent’s result.",
        translations: {
          es: "Al lanzar un cribado se abre de inmediato la línea de agentes. Cuando termina eliges “Ver informe” en lugar de saltar al informe. El log Dev en la página del run muestra las fuentes consultadas y el resultado de cada agente.",
        },
      },
      {
        type: "fix",
        text: "Hard Data no longer returns an empty shortlist when the model declines every ticker — it falls back to a market-cap ranking from the FMP universe so IR and the report still have candidates.",
        translations: {
          es: "Hard Data ya no deja la shortlist vacía si el modelo rechaza todos los tickers: hace fallback a un ranking por capitalización del universo FMP para que IR y el informe sigan teniendo candidatos.",
        },
      },
    ],
  },
  {
    version: "2.5.94",
    date: "2026-08-07",
    title: "Screening starts in-process + Dev log on all screens",
    titleTranslations: {
      es: "Cribado arranca en proceso + log Dev en todas las pantallas",
    },
    changes: [
      {
        type: "fix",
        text: "Launching a screen now runs Hard Data in-process (no HTTP self-call to the worker), so agent steps stop getting stuck on “pending”. The temporary Dev agent-log button is available on every /screening page.",
        translations: {
          es: "Al lanzar un cribado, Hard Data corre en proceso (sin auto-llamada HTTP al worker), así que los agentes dejan de quedarse en “pendiente”. El botón temporal Dev del log de agentes está en todas las páginas de /screening.",
        },
      },
    ],
  },
  {
    version: "2.5.93",
    date: "2026-08-07",
    title: "Screening worker kick reliability",
    titleTranslations: {
      es: "Fiabilidad del arranque del worker de cribado",
    },
    changes: [
      {
        type: "fix",
        text: "Screening runs no longer stick on Hard Data “pending”: launching a run now awaits the first worker hop, the worker drains up to 3 steps per request, and the recover cron processes orphaned steps inline instead of relying on waitUntil alone. Empty briefs show a clear “no candidates” report instead of a load error, and IR shows as pending (not “coming soon”) while Hard Data is still running.",
        translations: {
          es: "Los cribados ya no se quedan en Hard Data “pendiente”: al lanzar un run se espera el primer hop del worker, el worker drena hasta 3 pasos por request, y el cron de recuperación procesa steps huérfanos en línea en lugar de depender solo de waitUntil. Los briefs vacíos muestran un informe claro de “sin candidatos” en vez de un error de carga, y IR aparece como pendiente (no “próximamente”) mientras Hard Data sigue en curso.",
        },
      },
    ],
  },
  {
    version: "2.5.92",
    date: "2026-08-07",
    title: "Screening IR agent + recent screens history",
    titleTranslations: {
      es: "Agente IR de cribado + historial de screens",
    },
    changes: [
      {
        type: "feature",
        text: "Investment screening Agent 2 (IR / Business) researches each Hard Data candidate one ticker at a time (opt-in via screening_ir_agent_enabled): FMP transcript/news/insider evidence, LLM structured output, aggregate barrier, then Compiler. Run progress shows “X/N tickers”.",
        translations: {
          es: "El Agente 2 de cribado (IR / Negocio) investiga cada candidato de Hard Data un ticker a la vez (opt-in con screening_ir_agent_enabled): evidencia FMP (transcript/noticias/insiders), salida estructurada del LLM, barrera de agregación y luego el Compiler. El progreso muestra “X/N tickers”.",
        },
      },
      {
        type: "feature",
        text: "The /screening entry page now lists every screen you started, with status and deep links into progress or the finished report.",
        translations: {
          es: "La página de entrada /screening ahora lista todos los cribados que empezaste, con estado y enlaces al progreso o al informe terminado.",
        },
      },
      {
        type: "improvement",
        text: "New Prometheus metrics for IR: screening_ir_ticker_duration_ms, screening_ir_gaps_total, screening_ir_contradictions_total, screening_fmp_ir_requests_total. Per-run concurrency capped at 3 running steps.",
        translations: {
          es: "Nuevas métricas Prometheus para IR: screening_ir_ticker_duration_ms, screening_ir_gaps_total, screening_ir_contradictions_total, screening_fmp_ir_requests_total. Concurrencia por run limitada a 3 steps en ejecución.",
        },
      },
    ],
  },
  {
    version: "2.5.91",
    date: "2026-08-07",
    title: "Screening pipeline goes live (Hard Data + Compiler, beta)",
    titleTranslations: {
      es: "Pipeline de cribado real (Hard Data + Compiler, beta)",
    },
    changes: [
      {
        type: "feature",
        text: "Screening reports now run on the real event-driven pipeline (opt-in via screening_pipeline_real_enabled): a Hard Data agent screens the FMP universe against your brief, then a Compiler agent writes the executive summary. Steps live in a durable queue with a worker + recovery cron, and the run id stops being a fixture.",
        translations: {
          es: "Los informes de cribado corren ahora sobre el pipeline real dirigido por eventos (opt-in con screening_pipeline_real_enabled): un agente Hard Data filtra el universo de FMP con tu brief y un Compiler redacta el resumen ejecutivo. Los pasos viven en una cola durable con un worker + cron de recuperación, y el runId deja de ser fixture.",
        },
      },
      {
        type: "improvement",
        text: "Run progress now surfaces IR / Web / Portfolio Context / Risk / QA agents as 'coming soon' skipped steps so the timeline stays honest while those agents ship. Mock notice hides automatically when the run is real.",
        translations: {
          es: "El progreso de la ejecución muestra IR / Web / Contexto de cartera / Riesgo / QA como pasos 'próximamente' saltados, para que la línea de tiempo sea honesta mientras esos agentes llegan. El aviso de mock se oculta automáticamente cuando la ejecución es real.",
        },
      },
      {
        type: "improvement",
        text: "New Prometheus metrics for the screening pipeline: screening_step_duration_ms, screening_step_failures_total, screening_fmp_requests_total, screening_hard_data_universe_size.",
        translations: {
          es: "Nuevas métricas Prometheus para el pipeline de cribado: screening_step_duration_ms, screening_step_failures_total, screening_fmp_requests_total y screening_hard_data_universe_size.",
        },
      },
      {
        type: "fix",
        text: "Screening Hard Data no longer sticks on “pending”: the worker kick now survives the HTTP response (waitUntil), screening-recover is reachable by Vercel Cron, and the recover job also wakes orphaned pending steps — not only expired leases.",
        translations: {
          es: "Hard Data de cribado ya no se queda en “pendiente”: el kick del worker sobrevive a la respuesta HTTP (waitUntil), screening-recover es alcanzable por Vercel Cron, y el recover también despierta pasos pending huérfanos — no solo leases expirados.",
        },
      },
    ],
  },
  {
    version: "2.5.90",
    date: "2026-08-06",
    title: "Screening Intake agent (real LLM) with Dev log",
    titleTranslations: {
      es: "Agente Intake de cribado (LLM real) con log de dev",
    },
    changes: [
      {
        type: "feature",
        text: "The screening intake chat at /screening/intake now runs a real Intake agent through the AI Gateway: free-text input, sanity checks on impossible ranges, and a merged brief bubble that reflects what the agent actually parsed instead of a scripted patch.",
        translations: {
          es: "El chat de intake de cribado en /screening/intake ahora usa un agente Intake real vía el AI Gateway: entrada libre, control de rangos imposibles y un brief que refleja lo que el agente ha entendido, no un patch guionizado.",
        },
      },
      {
        type: "improvement",
        text: "Every launched screening now persists the brief in screening_runs (mocked_pipeline=1) and every Intake turn is stored in screening_agent_outputs for audit and future replay.",
        translations: {
          es: "Cada cribado lanzado guarda el brief en screening_runs (mocked_pipeline=1) y cada turno del Intake se registra en screening_agent_outputs para auditoría y replay futuro.",
        },
      },
      {
        type: "improvement",
        text: "Temporary Dev button on /screening/intake for admins, dev environments, or users with screening_dev_lab_enabled, showing the last 20 Intake agent outputs with latency and raw JSON.",
        translations: {
          es: "Botón Dev temporal en /screening/intake para admins, entornos de desarrollo o usuarios con screening_dev_lab_enabled, que muestra las últimas 20 salidas del agente Intake con latencia y JSON crudo.",
        },
      },
      {
        type: "improvement",
        text: "The screening entry and intake screens no longer show the 'mock data' banner — those two screens work with real portfolio weights and a real agent; the banner stays on the run progress and report until the research pipeline is real too.",
        translations: {
          es: "La entrada y el intake del cribado dejan de mostrar el banner de 'datos de ejemplo': ambas pantallas ya usan datos reales; el banner sigue en la pantalla de progreso y en el informe hasta que la investigación también sea real.",
        },
      },
      {
        type: "fix",
        text: "Fixed a false “agent did not respond” message on the screening intake chat: chip shortcuts no longer inject the next scripted question after a failed or successful LLM turn.",
        translations: {
          es: "Corregido el falso mensaje “el agente no respondió” en el chat de intake: los chips ya no inyectan la siguiente pregunta del script tras un turno del LLM (falle o no).",
        },
      },
      {
        type: "improvement",
        text: "Screening run/report Back returns to the Intake agent (with the same intent and sectors). Intake keeps the chat open to edit any brief row, and the agent recommends defaults with suggestion chips while asking.",
        translations: {
          es: "Volver desde el run/informe de cribado regresa al agente Intake (con el mismo intent y sectores). El intake deja el chat abierto para editar cualquier fila del brief, y el agente recomienda valores con chips mientras pregunta.",
        },
      },
      {
        type: "fix",
        text: "Fixed screening Intake parse failures (“could not parse the agent's response”): coerce messy LLM JSON, repair truncated replies, raise max tokens, and use a single system message.",
        translations: {
          es: "Corregidos los fallos de parseo del Intake de cribado (“no pude leer la respuesta”): se toleran JSON imperfectos del modelo, se reparan respuestas truncadas, más tokens y un solo mensaje de sistema.",
        },
      },
      {
        type: "improvement",
        text: "Screening Intake chat now shows a “What do these terms mean?” disclosure on every agent bubble that mentions financial metrics (Market cap, ROIC, ndEbitda, Forward P/E, and more) — click to reveal a short definition.",
        translations: {
          es: "El chat del Intake muestra un desplegable “¿Qué significan estos términos?” en cada mensaje del agente que menciona métricas financieras (Capitalización, ROIC, ndEbitda, PER forward, etc.); pulsa para ver una definición breve.",
        },
      },
      {
        type: "fix",
        text: "Screening Intake now uses OpenAI tool calling (submit_brief function) so the model returns a validated JSON payload every turn — no more “could not read my own reply” after the first message.",
        translations: {
          es: "El Intake de cribado usa ahora tool calling de OpenAI (función submit_brief); el modelo devuelve JSON validado en cada turno, así que ya no aparece “no pude leer mi respuesta” tras el primer mensaje.",
        },
      },
    ],
  },
  {
    version: "2.5.89",
    date: "2026-08-06",
    title: "Investment screening flow (beta, mock data)",
    titleTranslations: {
      es: "Flujo de cribado de inversiones (beta, datos de ejemplo)",
    },
    changes: [
      {
        type: "feature",
        text: "New screening flow at /screening behind the investment_screening_enabled flag: sector entry from your real portfolio (overexposed vs balanced messaging), a scripted intake chat that explains every metric, a brief you confirm before running, run progress per agent step, and an HTML research report with named methodology criteria, business context and sourced links.",
        translations: {
          es: "Nuevo flujo de cribado en /screening detrás del flag investment_screening_enabled: entrada por sectores de tu cartera real (mensaje de sobreexposición o cartera equilibrada), chat de intake que explica cada métrica, brief que confirmas antes de ejecutar, progreso por paso de agente e informe HTML con los criterios de la metodología nombrados, contexto de negocio y enlaces con fuente.",
        },
      },
      {
        type: "improvement",
        text: "When no sector is overexposed, the screening entry screen says the portfolio looks balanced and leads with exploration instead of rebalance.",
        translations: {
          es: "Cuando ningún sector está sobreexpuesto, la pantalla de entrada del cribado dice que la cartera está equilibrada y prioriza la exploración frente al rebalanceo.",
        },
      },
      {
        type: "feature",
        text: "Screening entry analytics: Google Analytics plus first-party events and Prometheus counters for discovery opens, entry views (empty / overexposed / balanced), CTA clicks, and back-home — visible in Admin → Analytics.",
        translations: {
          es: "Analytics de la entrada de cribado: Google Analytics más eventos first-party y contadores Prometheus para discovery, vistas (vacío / sobreexpuesto / equilibrado), clics en CTA y volver al inicio — visibles en Admin → Analytics.",
        },
      },
      {
        type: "fix",
        text: "Sector overexposure for screening and home recommendations now triggers at 25% (was 35%), matching Portfolio Score’s healthy sector ceiling — e.g. Technology at ~30% is treated as overexposed.",
        translations: {
          es: "La sobreexposición sectorial en cribado y recomendaciones del home se dispara al 25% (antes 35%), alineada con el techo sano del Portfolio Score — p. ej. Technology al ~30% se trata como sobreexpuesto.",
        },
      },
      {
        type: "improvement",
        text: "The report shows methodology criteria by name with what each one measures and a score counter, instead of numbered steps that meant nothing to the reader.",
        translations: {
          es: "El informe muestra los criterios de la metodología con nombre, qué mide cada uno y un contador de score, en lugar de pasos numerados que no decían nada.",
        },
      },
      {
        type: "improvement",
        text: "The candidates, report content and run progress come from a typed fixture in this stage, and every screen says so — real market data and agents arrive one at a time in the next stages.",
        translations: {
          es: "Los candidatos, el contenido del informe y el progreso vienen de un fixture tipado en esta etapa, y todas las pantallas lo indican — los datos reales y los agentes llegan uno a uno en las siguientes etapas.",
        },
      },
    ],
  },
  {
    version: "2.5.88",
    date: "2026-08-03",
    title: "Quote resolution for European & HK tickers",
    titleTranslations: {
      es: "Resolución de cotizaciones para tickers europeos y HK",
    },
    changes: [
      {
        type: "fix",
        text: "Server-side quote cache now applies Hong Kong padding, exchange fallbacks, and Yahoo aliases (W9C, NOVO-B, NA9, 215.HK) so AID and Home day highlights stop failing on cross-listed symbols.",
        translations: {
          es: "La caché de cotizaciones en servidor aplica padding de Hong Kong, fallbacks de bolsa y aliases de Yahoo (W9C, NOVO-B, NA9, 215.HK) para que AID y los highlights del Home no fallen en símbolos cross-listed.",
        },
      },
      {
        type: "fix",
        text: "AID and Home quote lookups use each holding’s market-data symbol and re-key by ticker, instead of stripped news bases.",
        translations: {
          es: "AID y Home buscan cotizaciones con el símbolo de market data de cada holding y las re-indexan por ticker, en lugar de bases de noticias sin sufijo.",
        },
      },
      {
        type: "fix",
        text: "Missing quote currency no longer crashes Home recommendations via toUpperCase on undefined.",
        translations: {
          es: "Una moneda de cotización ausente ya no provoca un crash en las recomendaciones del Home por toUpperCase sobre undefined.",
        },
      },
      {
        type: "improvement",
        text: "Dashboard quick-nav supports free-text search across Holdings, Tools, Views, and all tools while keeping the chip list.",
        translations: {
          es: "El menú rápido del panel permite buscar por texto libre entre Holdings, Tools, Views y todas las herramientas, manteniendo el listado de chips.",
        },
      },
    ],
  },
  {
    version: "2.5.87",
    date: "2026-08-03",
    title: "REQ P1 follow-up: cross-listings, alerts, metrics",
    titleTranslations: {
      es: "REQ P1 follow-up: cross-listings, alertas, métricas",
    },
    changes: [
      {
        type: "fix",
        text: "Dividend views group the same issuer across ISIN/cross-listings (e.g. NVO + NOVO-B.CO); yields above 15% show — with an explanatory tooltip.",
        translations: {
          es: "Dividendos agrupan el mismo emisor por ISIN/cross-listing (p. ej. NVO + NOVO-B.CO); yields >15% muestran — con tooltip.",
        },
      },
      {
        type: "fix",
        text: "Creating a duplicate price alert tells the user it already exists; moat reports get a unique DB index per symbol/day.",
        translations: {
          es: "Crear una alerta duplicada avisa al usuario; los informes moat tienen índice único por símbolo/día.",
        },
      },
      {
        type: "improvement",
        text: "Portfolio Score and Dividends consume the shared metrics module (totals, yield, sector breakdown, day change).",
        translations: {
          es: "Portfolio Score y Dividendos consumen el módulo compartido de métricas (totales, yield, sectores, day change).",
        },
      },
    ],
  },
  {
    version: "2.5.86",
    date: "2026-08-03",
    title: "REQ open items: Views, metrics, news, charts, and polish",
    titleTranslations: {
      es: "REQ abiertos: Views, métricas, noticias, gráficos y pulido",
    },
    changes: [
      {
        type: "fix",
        text: "Views menu items are real links to Taxonomy, Dividends, Performance, Goal Planner, and a new Events tool — no more dead Home tabs.",
        translations: {
          es: "Los ítems del menú Views son enlaces reales a Taxonomía, Dividendos, Performance, Goal Planner y un nuevo tool Events — sin pestañas muertas en Home.",
        },
      },
      {
        type: "fix",
        text: "Day-change € and % share one calculator (prior-close basis); dividend yield and portfolio totals come from a shared metrics module.",
        translations: {
          es: "El day-change € y % comparten una calculadora (base prior-close); yield y totales de cartera salen de un módulo compartido de métricas.",
        },
      },
      {
        type: "fix",
        text: "Portfolio news no longer attributes market-wide articles to unrelated tickers; chips only show for holdings with real headline matches.",
        translations: { es: "Las noticias ya no atribuyen artículos de mercado general a tickers no relacionados; los chips solo muestran acciones en cartera con coincidencia real en el titular." },
      },
      {
        type: "fix",
        text: "Dividend yield above 15% now shows an em dash instead of a clamped unreliable value.",
        translations: { es: "La rentabilidad por dividendo superior al 15% ahora muestra un guion en lugar de un valor poco fiable." },
      },
      {
        type: "improvement",
        text: "Company analysis notes when fundamentals come from a cross-listing alias (e.g. W9C.DE → CSU.TO).",
        translations: { es: "El análisis de empresa indica cuando los fundamentales vienen de un alias de cotización cruzada." },
      },
      {
        type: "improvement",
        text: "Price alerts show Live / Active / Triggered badges; moat reports dedupe by symbol/day with search and pagination.",
        translations: { es: "Las alertas muestran badges Live / Active / Triggered; los informes moat se deduplican por símbolo/día con búsqueda y paginación." },
      },
      {
        type: "fix",
        text: "Goal Planner chart paints on first load; Monthly Cash Flow uses one bar scale; transaction table adds base-currency column.",
        translations: {
          es: "El gráfico del Goal Planner pinta al cargar; Monthly Cash Flow usa una sola escala; transacciones añaden columna en moneda base.",
        },
      },
      {
        type: "improvement",
        text: "Reset Portfolio moved to Settings with type-to-confirm; overnight coverage-reconcile cron flags holdings without quotes.",
        translations: {
          es: "Reset Portfolio se mueve a Ajustes con confirmación por nombre; el cron coverage-reconcile marca holdings sin cotización.",
        },
      },
      {
        type: "fix",
        text: "Rebalancing total labeled excl. cash; crypto excluded from sector breakdown; US-only insider/congress widgets hidden for non-US tickers.",
        translations: {
          es: "Total de rebalanceo etiquetado excl. caja; crypto fuera del desglose sectorial; widgets US de insiders/congreso ocultos en tickers no-US.",
        },
      },
      {
        type: "fix",
        text: "Portfolio Score no longer claims an unverified percentile; scores older than 14 days show a regenerate warning.",
        translations: {
          es: "Portfolio Score ya no muestra un percentil no verificado; puntuaciones de más de 14 días avisan para regenerar.",
        },
      },
      {
        type: "improvement",
        text: "Watchlist venues show country · exchange code; Performance hub copy no longer promises benchmarks that are not on that page.",
        translations: {
          es: "La watchlist muestra país · código de mercado; la descripción de Performance ya no promete benchmarks que no están en esa página.",
        },
      },
    ],
  },
  {
    version: "2.5.85",
    date: "2026-08-03",
    title: "Sprint 3 UX polish: charts, currency, filters",
    titleTranslations: {
      es: "Sprint 3 pulido UX: gráficos, divisa, filtros",
    },
    changes: [
      {
        type: "fix",
        text: "Goal Planner chart no longer paints blank on first load; goal-beyond-horizon shows estimated years with ~ prefix and a clear hint.",
        translations: {
          es: "El gráfico del Goal Planner ya no aparece en blanco al cargar; metas fuera del horizonte muestran años estimados con ~ y un mensaje claro.",
        },
      },
      {
        type: "improvement",
        text: "Monthly Cash Flow card uses a single shared scale for dividend and sales bars, making amounts visually comparable.",
        translations: {
          es: "La tarjeta de Flujo de Caja Mensual usa una escala común para las barras de dividendos y ventas.",
        },
      },
      {
        type: "improvement",
        text: "Semantic color tokens (--price-up/down, --over/under-target, --quality-*) added to the design system and wired through drift indicators.",
        translations: {
          es: "Tokens semánticos de color (--price-up/down, --over/under-target, --quality-*) añadidos al sistema de diseño y conectados a los indicadores de drift.",
        },
      },
      {
        type: "fix",
        text: "Transaction history shows a base-currency equivalent column when holdings span multiple currencies.",
        translations: {
          es: "El historial de transacciones muestra columna equivalente en moneda base cuando hay tenencias en múltiples divisas.",
        },
      },
      {
        type: "fix",
        text: "Moat screener and Strategies tool parse European-style decimal numbers (comma as separator) correctly.",
        translations: {
          es: "El Moat Screener y la herramienta de Estrategias parsean correctamente números decimales europeos (coma como separador).",
        },
      },
      {
        type: "fix",
        text: "Moat screener filter inputs no longer overflow or get clipped at 1280 px viewport.",
        translations: {
          es: "Los inputs de filtro del Moat Screener ya no desbordan ni se cortan en viewports de 1280 px.",
        },
      },
    ],
  },
  {
    version: "2.5.84",
    date: "2026-08-03",
    title: "QA reliability fixes across tools and home",
    titleTranslations: {
      es: "Correcciones de fiabilidad QA en tools y home",
    },
    changes: [
      {
        type: "fix",
        text: "Removed fabricated Tax Report teaser numbers; Tax/Simulator/Planning are gated behind feature flags until ready.",
        translations: {
          es: "Eliminados números ficticios del teaser de Tax Report; Tax/Simulator/Planning quedan detrás de feature flags hasta estar listos.",
        },
      },
      {
        type: "fix",
        text: "Views menu now opens classic dashboard tabs; /tools hub cards are real links; deep-links wait for settings before redirecting.",
        translations: {
          es: "El menú Views abre las pestañas del dashboard classic; las tarjetas de /tools son enlaces reales; los deep-links esperan a settings antes de redirigir.",
        },
      },
      {
        type: "fix",
        text: "Ex-dividend amounts use the upcoming payment (not annual dividend rate); day change and yields share consistent calculators; formatPercent no longer shows ++.",
        translations: {
          es: "Los importes de ex-dividendo usan el próximo pago (no el dividendo anual); day change y yields comparten calculadoras; formatPercent ya no muestra ++.",
        },
      },
      {
        type: "fix",
        text: "Company analysis tries Yahoo cross-listing aliases (e.g. W9C.DE); portfolio news no longer attributes every story to the fetch ticker; stale weekly digests are hidden.",
        translations: {
          es: "El análisis de compañía prueba alias cross-listing de Yahoo (p. ej. W9C.DE); las noticias ya no atribuyen cada historia al ticker de fetch; se ocultan digests semanales caducados.",
        },
      },
      {
        type: "improvement",
        text: "Rebalancing exposure tiles follow drift legend colors; market-cap formatting supports trillions; shared 404 page with back links.",
        translations: {
          es: "Los tiles de exposición de rebalanceo siguen los colores de la leyenda de drift; el market cap soporta billones (T); página 404 compartida con enlaces de vuelta.",
        },
      },
    ],
  },
  {
    version: "2.5.83",
    date: "2026-08-03",
    title: "Readable earnings details in digests",
    titleTranslations: {
      es: "Detalles de earnings legibles en digests",
    },
    changes: [
      {
        type: "fix",
        text: "AID digests and earnings recaps no longer show raw calendar JSON; EPS and revenue estimates are formatted as readable bullets.",
        translations: {
          es: "Los digests AID y los recaps de earnings ya no muestran JSON crudo del calendario; EPS e ingresos estimados se formatean en bullets legibles.",
        },
      },
    ],
  },
  {
    version: "2.5.82",
    date: "2026-08-03",
    title: "Bitcoin search and crypto charts",
    titleTranslations: {
      es: "Búsqueda de Bitcoin y gráficos cripto",
    },
    changes: [
      {
        type: "fix",
        text: "Asset search finds Bitcoin and other cryptos for all users again (no longer Pro-only), and the crypto page always loads charts with a Yahoo fallback when FMP crypto history is unavailable.",
        translations: {
          es: "La búsqueda vuelve a encontrar Bitcoin y otras criptos para todos los usuarios (ya no solo Pro), y la página de cripto siempre carga gráficos con fallback a Yahoo si el historial FMP no está disponible.",
        },
      },
    ],
  },
  {
    version: "2.5.81",
    date: "2026-08-03",
    title: "Exchange suggestions when adding holdings",
    titleTranslations: {
      es: "Sugerencias de exchange al añadir posiciones",
    },
    changes: [
      {
        type: "improvement",
        text: "Add Fund / Add Stock and edit holding now suggest known exchange codes (Xetra, LSE, Nasdaq, FUND, and more) so you pick a valid venue without guessing.",
        translations: {
          es: "Al añadir fondos/acciones y al editar una posición se sugieren códigos de exchange conocidos (Xetra, LSE, Nasdaq, FUND y más) para elegir el mercado correcto sin equivocarte.",
        },
      },
    ],
  },
  {
    version: "2.5.80",
    date: "2026-08-03",
    title: "Diversify tip for unclassified holdings",
    titleTranslations: {
      es: "Tip de diversificación por posiciones sin clasificar",
    },
    changes: [
      {
        type: "fix",
        text: "Home tips no longer claim a portfolio is balanced when Unclassified is high; ≥15% unclassified triggers a diversify tip, empty copy is honest, and empty weekly cache is recomputed on load.",
        translations: {
          es: "Los tips de Home ya no dicen que la cartera está equilibrada si hay mucho Unclassified; ≥15% sin clasificar dispara diversificación, el copy vacío es honesto y la cache semanal vacía se recalcula al cargar.",
        },
      },
    ],
  },
  {
    version: "2.5.79",
    date: "2026-08-03",
    title: "One manual tip analysis per week",
    titleTranslations: {
      es: "Un análisis manual de tips por semana",
    },
    changes: [
      {
        type: "improvement",
        text: "Manual Run analysis on Home is limited to once every 7 days, enforced on the API (429) via last_manual_at — separate from the weekly cron.",
        translations: {
          es: "Ejecutar análisis en Home está limitado a una vez cada 7 días, con enforcement en la API (429) vía last_manual_at — independiente del cron semanal.",
        },
      },
    ],
  },
  {
    version: "2.5.78",
    date: "2026-08-03",
    title: "Skip inactive and test users in tip cron",
    titleTranslations: {
      es: "El cron de tips omite inactivos y cuentas de test",
    },
    changes: [
      {
        type: "improvement",
        text: "Weekly portfolio tip cron skips test emails and users inactive for 30+ days (or never active).",
        translations: {
          es: "El cron semanal de tips omite emails de test y usuarios inactivos 30+ días (o sin actividad registrada).",
        },
      },
    ],
  },
  {
    version: "2.5.77",
    date: "2026-08-03",
    title: "Manual portfolio tip analysis on Home",
    titleTranslations: {
      es: "Análisis manual de tips de cartera en Home",
    },
    changes: [
      {
        type: "feature",
        text: "Home has a Run analysis CTA to recompute portfolio tips on demand (1-minute cooldown), including when the tip queue is empty.",
        translations: {
          es: "Home incluye el CTA Ejecutar análisis para recalcular tips de cartera al momento (cooldown de 1 minuto), también cuando no hay tips.",
        },
      },
    ],
  },
  {
    version: "2.5.76",
    date: "2026-08-03",
    title: "Weekly portfolio tip analysis cron",
    titleTranslations: {
      es: "Cron semanal de análisis de tips de cartera",
    },
    changes: [
      {
        type: "feature",
        text: "Portfolio tips are precomputed every Monday for all active portfolios (≥1 holding) and cached for Home; skipped tips reset each week.",
        translations: {
          es: "Los tips de cartera se precalculan cada lunes para todas las carteras activas (≥1 holding) y se cachean en Home; los tips omitidos se reinician cada semana.",
        },
      },
    ],
  },
  {
    version: "2.5.75",
    date: "2026-08-03",
    title: "Fix home recommendation sector percentages",
    titleTranslations: {
      es: "Corrección de porcentajes de sectores en recomendaciones",
    },
    changes: [
      {
        type: "fix",
        text: "Home portfolio tips no longer show 0% for sectors that actually have allocation when FX rates are missing on the server.",
        translations: {
          es: "Los tips de cartera en Home ya no muestran 0% en sectores con exposición real cuando faltan tipos de cambio en el servidor.",
        },
      },
    ],
  },
  {
    version: "2.5.74",
    date: "2026-08-03",
    title: "Home portfolio recommendations",
    titleTranslations: {
      es: "Recomendaciones de cartera en Home",
    },
    changes: [
      {
        type: "feature",
        text: "Home shows a portfolio tip card (diversification, concentration, idle cash, FX) with Take action / Next, plus a diversify research page with underweight sector candidates.",
        translations: {
          es: "Home muestra una tarjeta de tip de cartera (diversificación, concentración, cash parado, FX) con Tomé acción / Siguiente, y una página de research de sectores infraponderados.",
        },
      },
    ],
  },
  {
    version: "2.5.73",
    date: "2026-08-02",
    title: "Crypto transactions + Constellation quotes",
    titleTranslations: {
      es: "Transacciones crypto y cotizaciones de Constellation",
    },
    changes: [
      {
        type: "fix",
        text: "Crypto holdings open the portfolio drawer with a full transaction list to edit buys; BTC-EUR/ETH-EUR use EUR (not USD) from the pair ticker; Constellation (W9C.DE) falls back to Frankfurt/Toronto Yahoo symbols when Tradegate has no quote.",
        translations: {
          es: "Las posiciones crypto abren el panel con el listado de transacciones para editar compras; BTC-EUR/ETH-EUR usan EUR (no USD) según el par; Constellation (W9C.DE) prueba símbolos Yahoo de Frankfurt/Toronto si Tradegate no cotiza.",
        },
      },
    ],
  },
  {
    version: "2.5.72",
    date: "2026-08-02",
    title: "Import data quality auditor",
    titleTranslations: {
      es: "Auditor de calidad de datos al importar",
    },
    changes: [
      {
        type: "feature",
        text: "Import and portfolio repair now cross-check data against live market quotes: missing FX, GBX/GBP unit errors, currency mismatches, and unresolved tickers. Safe issues are auto-fixed; an AI summary explains what changed. Missing FX rates no longer inflate foreign holdings as euros.",
        translations: {
          es: "La importación y la reparación de cartera cruzan los datos con cotizaciones en vivo: FX faltante, errores de unidad GBX/GBP, divisas incorrectas y tickers sin resolver. Los problemas seguros se corrigen solos; un resumen IA explica los cambios. Si falta el tipo de cambio, las posiciones en divisa ya no se inflan como si fueran euros.",
        },
      },
    ],
  },
  {
    version: "2.5.71",
    date: "2026-08-02",
    title: "Crypto asset page routing",
    titleTranslations: {
      es: "Enlace correcto a la página de crypto",
    },
    changes: [
      {
        type: "fix",
        text: "Opening Bitcoin or other crypto from your portfolio now opens the crypto market page with live price and data, instead of the stock analysis page showing $0 and empty results.",
        translations: {
          es: "Abrir Bitcoin u otra cripto desde tu cartera ahora abre la página de mercado crypto con precio y datos en vivo, en lugar de la página de análisis de acciones con precio 0 y sin resultados.",
        },
      },
    ],
  },
  {
    version: "2.5.70",
    date: "2026-08-02",
    title: "Public stock analysis SEO",
    titleTranslations: {
      es: "SEO del análisis público de acciones",
    },
    changes: [
      {
        type: "improvement",
        text: "Public /analisis pages are indexable (robots, sitemap, metadata, JSON-LD, llms.txt). Live quotes refresh on each visit; company reports cache for one day and rebuild when you open an expired ticker.",
        translations: {
          es: "Las páginas públicas /analisis son indexables (robots, sitemap, metadata, JSON-LD, llms.txt). El precio se actualiza en vivo en cada visita; el informe de la empresa se cachea un día y se regenera al abrir un ticker caducado.",
        },
      },
    ],
  },
  {
    version: "2.5.69",
    date: "2026-08-02",
    title: "Unified classification labels",
    titleTranslations: {
      es: "Etiquetas de clasificación unificadas",
    },
    changes: [
      {
        type: "improvement",
        text: "Classification merges duplicate sector names (e.g. Information Technology and Technology) in charts and can rewrite saved labels to a single canonical set.",
        translations: {
          es: "Clasificación fusiona nombres de sector duplicados (p. ej. Information Technology y Technology) en los gráficos y puede reescribir las etiquetas guardadas a un conjunto canónico.",
        },
      },
    ],
  },
  {
    version: "2.5.68",
    date: "2026-08-02",
    title: "Classification Auto-fix with AI",
    titleTranslations: {
      es: "Auto-corregir clasificación con IA",
    },
    changes: [
      {
        type: "improvement",
        text: "Edit Classification on Tools → Classification shows each holding’s name and an Auto-fix action that uses AI to set sector, region, and asset class.",
        translations: {
          es: "Editar clasificación en Herramientas → Clasificación muestra el nombre de cada acción y un Auto-corregir que usa IA para definir sector, región y clase de activo.",
        },
      },
    ],
  },
  {
    version: "2.5.67",
    date: "2026-08-02",
    title: "Home portfolio total + Advanced",
    titleTranslations: {
      es: "Portfolio total en Home + Avanzado",
    },
    changes: [
      {
        type: "improvement",
        text: "Home leads with a compact Portfolio total card (day P&L and key metrics). Advanced opens the full hero with performance matrix in the same place; Summary returns to the compact view.",
        translations: {
          es: "Home arranca con una tarjeta compacta de Portfolio total (P&L del día y métricas clave). Avanzado abre el hero completo con la matriz de rendimiento en el mismo sitio; Resumen vuelve a la vista compacta.",
        },
      },
      {
        type: "fix",
        text: "On Home Advanced view, the Summary control sits inside the portfolio hero card, aligned with the Advanced CTA.",
        translations: {
          es: "En la vista Avanzado del Home, el control Resumen queda dentro de la tarjeta del hero, alineado con el CTA Avanzado.",
        },
      },
    ],
  },
  {
    version: "2.5.66",
    date: "2026-08-02",
    title: "Allocation CTA to Classification",
    titleTranslations: {
      es: "CTA de Allocation a Clasificación",
    },
    changes: [
      {
        type: "improvement",
        text: "The Home Allocation card links to Classification (/tools/taxonomy) so you can fix unclassified holdings; the CTA is emphasized when any position lacks sector, region, or asset class.",
        translations: {
          es: "La tarjeta Allocation del Home enlaza a Clasificación (/tools/taxonomy) para corregir posiciones sin clasificar; el CTA se enfatiza cuando falta sector, región o clase de activo.",
        },
      },
    ],
  },
  {
    version: "2.5.65",
    date: "2026-08-02",
    title: "Home Allocation in the right rail",
    titleTranslations: {
      es: "Allocation del Home en la columna derecha",
    },
    changes: [
      {
        type: "improvement",
        text: "On desktop Home, Allocation sits in the right rail so the main column stays focused on the daily check-in and holdings.",
        translations: {
          es: "En el Home de escritorio, Allocation pasa a la columna derecha para que la columna principal se centre en el check-in diario y las posiciones.",
        },
      },
    ],
  },
  {
    version: "2.5.64",
    date: "2026-08-02",
    title: "Daily digests behind feature flag",
    titleTranslations: {
      es: "Resúmenes diarios detrás de feature flag",
    },
    changes: [
      {
        type: "improvement",
        text: "Daily digests (nav, /daily-digests, and home teaser) are gated by daily_digests_enabled and off by default until the feature is used again.",
        translations: {
          es: "Los resúmenes diarios (nav, /daily-digests y teaser del home) quedan detrás de daily_digests_enabled y desactivados por defecto hasta que se vuelva a usar la función.",
        },
      },
    ],
  },
  {
    version: "2.5.63",
    date: "2026-08-02",
    title: "New Home is the default dashboard",
    titleTranslations: {
      es: "La nueva Home es el dashboard por defecto",
    },
    changes: [
      {
        type: "feature",
        text: "The daily Home (brief, movers, catalysts, highlights) is now the default at /. Classic dashboard moves to /classic behind the classic_home feature flag.",
        translations: {
          es: "La Home diaria (brief, movimientos, catalizadores, highlights) es ahora el default en /. El dashboard clásico pasa a /classic detrás del feature flag classic_home.",
        },
      },
    ],
  },
  {
    version: "2.5.62",
    date: "2026-08-02",
    title: "Home v2 Portfolio News and classic empty state",
    titleTranslations: {
      es: "Home v2 con Portfolio News y empty state clásico",
    },
    changes: [
      {
        type: "improvement",
        text: "Home v2 lists Portfolio News at the bottom of the main column, matching Classic home.",
        translations: {
          es: "Home v2 lista Portfolio News al final de la columna principal, como la home clásica.",
        },
      },
      {
        type: "fix",
        text: "Home v2 empty state (no holdings) now uses the same import/add CTA as Classic `/`.",
        translations: {
          es: "El empty state de Home v2 (sin posiciones) usa el mismo CTA de importar/añadir que Classic `/`.",
        },
      },
    ],
  },
  {
    version: "2.5.61",
    date: "2026-08-02",
    title: "Home brief bullets and analysis as stock home",
    titleTranslations: {
      es: "Briefing en bullets y análisis como página de stock",
    },
    changes: [
      {
        type: "fix",
        text: "Morning brief no longer repeats “Morning brief(ing)” — shows short highlight bullets instead of a duplicated sentence.",
        translations: {
          es: "El morning brief ya no repite “Morning brief(ing)” — muestra bullets cortos en lugar de una frase duplicada.",
        },
      },
      {
        type: "improvement",
        text: "/analisis is the canonical stock page: Home v2 and other links go there; legacy /stock/* redirects with the right tab.",
        translations: {
          es: "/analisis es la página canónica de la acción: Home v2 y otros enlaces van allí; /stock/* redirige con la pestaña correcta.",
        },
      },
      {
        type: "fix",
        text: "Logged-in holders see Transaction History on the analysis Summary tab.",
        translations: {
          es: "Los usuarios con la posición ven el historial de transacciones en la pestaña Resumen de análisis.",
        },
      },
    ],
  },
  {
    version: "2.5.60",
    date: "2026-08-02",
    title: "Custom fixed-return investments",
    titleTranslations: {
      es: "Inversiones personalizadas de retorno fijo",
    },
    changes: [
      {
        type: "feature",
        text: "Track fixed-return investments (e.g. peer-to-peer or term products): set principal, start date, term, and total return — value accrues linearly into portfolio totals and charts until maturity, then locks.",
        translations: {
          es: "Registra inversiones de retorno fijo (p. ej. P2P o productos a plazo): define capital, fecha de inicio, plazo y retorno total — el valor crece linealmente en totales y gráficos hasta el vencimiento, y luego se bloquea.",
        },
      },
    ],
  },
  {
    version: "2.5.59",
    date: "2026-08-02",
    title: "Home v2 daily check-in preview",
    titleTranslations: {
      es: "Preview Home v2 de check-in diario",
    },
    changes: [
      {
        type: "feature",
        text: "Home v2 preview at /home-v2 (feature flag home_v2): morning brief, portfolio hero, movers, catalysts, day highlights, and a Claude MCP CTA — without replacing the classic dashboard.",
        translations: {
          es: "Preview Home v2 en /home-v2 (flag home_v2): briefing matutino, hero de cartera, movimientos, catalizadores, highlights del día y CTA MCP de Claude — sin reemplazar el dashboard clásico.",
        },
      },
    ],
  },
  {
    version: "2.5.58",
    date: "2026-08-02",
    title: "Add Fund in + Add and Add Transaction menus",
    titleTranslations: {
      es: "Agregar Fondo en los menús + Agregar y Agregar transacción",
    },
    changes: [
      {
        type: "improvement",
        text: "Add Fund is now a first-class option in the + Add menu (desktop and mobile) and under Add Transaction on the holdings table.",
        translations: {
          es: "Agregar Fondo es ahora una opción de primer nivel en el menú + Agregar (escritorio y móvil) y en Agregar transacción de la tabla de posiciones.",
        },
      },
      {
        type: "improvement",
        text: "Opening Add Fund preselects the fund asset type and uses an ISIN-friendly search placeholder.",
        translations: {
          es: "Abrir Agregar Fondo preselecciona el tipo fondo y usa un placeholder de búsqueda orientado a ISIN.",
        },
      },
    ],
  },
  {
    version: "2.5.57",
    date: "2026-08-02",
    title: "Cleaner portfolio chart, OneLogin naming, Yahoo Finance MCP",
    titleTranslations: {
      es: "Gráfico de cartera más limpio, nombre OneLogin y Yahoo Finance MCP",
    },
    changes: [
      {
        type: "improvement",
        text: "Portfolio evolution chart keeps Recharts NAV with a cleaner analysis-style area (no grid, weekend bands, or session overlays).",
        translations: {
          es: "El gráfico de evolución de la cartera mantiene el NAV en Recharts con un área más limpia al estilo análisis (sin rejilla, bandas de fin de semana ni overlays de sesión).",
        },
      },
      {
        type: "improvement",
        text: "User-facing copy now calls the shared identity “OneLogin” instead of “unified account”.",
        translations: {
          es: "El texto visible para usuarios llama “OneLogin” a la identidad compartida en lugar de “cuenta unificada”.",
        },
      },
      {
        type: "improvement",
        text: "Profile → AI & MCP includes copy-paste snippets for the third-party Yahoo Finance MCP (yahoo-finance2) for Cursor and Claude Desktop.",
        translations: {
          es: "Perfil → IA y MCP incluye fragmentos listos para pegar del MCP de terceros Yahoo Finance (yahoo-finance2) para Cursor y Claude Desktop.",
        },
      },
    ],
  },
  {
    version: "2.5.56",
    date: "2026-08-02",
    title: "Mutual fund (fondos) support",
    titleTranslations: {
      es: "Soporte para fondos de inversión",
    },
    changes: [
      {
        type: "feature",
        text: "Track mutual funds as a first-class asset type: Yahoo search includes MUTUALFUND, add/import flows recognize fondos and SICAVs, portfolio filters and snapshots split fund value, and ISIN search works when adding positions.",
        translations: {
          es: "Seguimiento de fondos de inversión como tipo de activo de primera clase: la búsqueda de Yahoo incluye MUTUALFUND, los flujos de alta e importación reconocen fondos y SICAV, los filtros y snapshots del portafolio separan el valor en fondos, y la búsqueda por ISIN funciona al añadir posiciones.",
        },
      },
    ],
  },
  {
    version: "2.5.55",
    date: "2026-08-02",
    title: "TradingView and Yahoo Finance on analysis header",
    titleTranslations: {
      es: "TradingView y Yahoo Finance en el encabezado de análisis",
    },
    changes: [
      {
        type: "improvement",
        text: "Company analysis pages now show clear TradingView and Yahoo Finance buttons in the header (not only under the chart).",
        translations: {
          es: "Las páginas de análisis de empresa ahora muestran botones claros de TradingView y Yahoo Finance en el encabezado (no solo debajo del gráfico).",
        },
      },
    ],
  },
  {
    version: "2.5.54",
    date: "2026-08-02",
    title: "Market ticker on the public landing",
    titleTranslations: {
      es: "Marquisina de mercados en la landing pública",
    },
    changes: [
      {
        type: "feature",
        text: "The public landing now shows the live market ticker bar (EUR/USD, BTC, gold, silver, S&P 500, oil, and exchange open/closed status).",
        translations: {
          es: "La landing pública ahora muestra la marquisina de mercados en vivo (EUR/USD, BTC, oro, plata, S&P 500, petróleo y estado abierto/cerrado de bolsas).",
        },
      },
    ],
  },
  {
    version: "2.5.53",
    date: "2026-08-01",
    title: "Yahoo Finance link on company analysis chart",
    titleTranslations: {
      es: "Enlace a Yahoo Finance en el gráfico de análisis",
    },
    changes: [
      {
        type: "improvement",
        text: "Company analysis chart fallback now links to both TradingView and Yahoo Finance for the ticker.",
        translations: {
          es: "Si el gráfico de análisis no carga, ahora puedes abrirlo en TradingView o en Yahoo Finance para ese ticker.",
        },
      },
    ],
  },
  {
    version: "2.5.52",
    date: "2026-08-01",
    title: "Analysis tabs and back navigation polish",
    titleTranslations: {
      es: "Pestañas de análisis y navegación atrás más claras",
    },
    changes: [
      {
        type: "feature",
        text: "Company analysis tabs are a horizontal segmented control (better contrast on the public cream page). Back always returns to home (`/`) based on session — no spoofable `?from=` query.",
        translations: {
          es: "Las pestañas de análisis de empresa son un control segmentado horizontal (mejor contraste en la página pública). Atrás vuelve siempre a la home (`/`) según la sesión — sin un `?from=` manipulable.",
        },
      },
    ],
  },
  {
    version: "2.5.51",
    date: "2026-08-01",
    title: "Stock search in landing header",
    titleTranslations: {
      es: "Búsqueda de acciones en el header de la landing",
    },
    changes: [
      {
        type: "feature",
        text: "The public landing now has the same asset search in the header as the logged-in home. Opening a stock from there (or from the app header) returns you to that home on Back, and anonymous analysis pages use landing-style chrome.",
        translations: {
          es: "La landing pública ahora tiene el mismo buscador de activos en el header que la home logueada. Abrir una acción desde ahí (o desde el header de la app) vuelve a esa home al pulsar Atrás, y las páginas de análisis anónimas usan el chrome estilo landing.",
        },
      },
    ],
  },
  {
    version: "2.5.50",
    date: "2026-08-01",
    title: "Delete account visible on Profile for non-admins",
    titleTranslations: {
      es: "Eliminar cuenta visible en Perfil para no-admins",
    },
    changes: [
      {
        type: "fix",
        text: "Profile → Account now always shows the Danger zone; non-admins get a Delete my account CTA (including a shortcut on the unified-account card). Admin accounts see an explanation instead of a hidden section.",
        translations: {
          es: "Perfil → Cuenta siempre muestra la zona de peligro; los no-admins ven el CTA Eliminar mi cuenta (también un acceso en la tarjeta de cuenta unificada). Las cuentas admin ven una explicación en lugar de una sección oculta.",
        },
      },
    ],
  },
  {
    version: "2.5.49",
    date: "2026-08-01",
    title: "Company analysis pages gain fundamentals, intelligence & valuation tabs",
    titleTranslations: {
      es: "Las páginas de análisis de empresa suman pestañas de fundamentales, inteligencia y valoración",
    },
    changes: [
      {
        type: "feature",
        text: "Analysis pages at /analisis/<ticker> now support your exchange and portfolio position, and organize everything into tabs: Summary, Fundamentals, Intelligence, and Valuation & Moat — the first step toward one unified stock page for the whole site.",
        translations: {
          es: "Las páginas de análisis en /analisis/<ticker> ahora reconocen tu bolsa y tu posición en cartera, y organizan todo en pestañas: Resumen, Fundamentales, Inteligencia y Valoración y moat — el primer paso hacia una única página de acción para todo el sitio.",
        },
      },
    ],
  },
  {
    version: "2.5.48",
    date: "2026-08-01",
    title: "Delete account on unified Accounts",
    titleTranslations: {
      es: "Eliminar cuenta en Accounts unificada",
    },
    changes: [
      {
        type: "feature",
        text: "Delete your unified account from Profile on trefolio.com (same confirmation flow on user.trefolio.com) or directly on Accounts; deletions are tracked in analytics.",
        translations: {
          es: "Elimina tu cuenta unificada desde Perfil en trefolio.com (mismo flujo de confirmación en user.trefolio.com) o directamente en Accounts; las eliminaciones se registran en analytics.",
        },
      },
    ],
  },
  {
    version: "2.5.47",
    date: "2026-08-01",
    title: "Widget total matches dashboard",
    titleTranslations: {
      es: "El total del widget coincide con el panel",
    },
    changes: [
      {
        type: "fix",
        text: "Home screen widget and Leaf now use the same net-worth total as the dashboard: investment cash only (not savings/pension/real estate) and Yahoo symbols normalized like the web (e.g. Hong Kong tickers).",
        translations: {
          es: "El widget de inicio y Leaf ahora usan el mismo patrimonio neto que el panel: solo cash de inversión (no ahorro/pensión/inmuebles) y símbolos de Yahoo normalizados como en la web (p. ej. tickers de Hong Kong).",
        },
      },
    ],
  },
  {
    version: "2.5.46",
    date: "2026-08-01",
    title: "Richer MCP usage analytics",
    titleTranslations: {
      es: "Analíticas MCP más detalladas",
    },
    changes: [
      {
        type: "improvement",
        text: "Admin MCP Analytics now shows which users call MCP, data domains (scopes), tools, and privacy-safe resource identifiers (tickers, FMP paths, portfolios) plus a recent access feed.",
        translations: {
          es: "Admin MCP Analytics ahora muestra qué usuarios usan MCP, dominios de datos (scopes), tools e identificadores de recursos seguros (tickers, rutas FMP, carteras), más un feed de acceso reciente.",
        },
      },
    ],
  },
  {
    version: "2.5.45",
    date: "2026-07-31",
    title: "FMP market data via MCP",
    titleTranslations: {
      es: "Datos de mercado FMP vía MCP",
    },
    changes: [
      {
        type: "feature",
        text: "Pro users can call Financial Modeling Prep’s stable API through MCP tools `listFmpEndpoints` and `fmpRequest` with the opt-in PAT scope `market:fmp` (feature flag `mcp_fmp_proxy`, rate limited). Informational only — not investment advice.",
        translations: {
          es: "Los usuarios Pro pueden consultar la API estable de Financial Modeling Prep mediante las herramientas MCP `listFmpEndpoints` y `fmpRequest` con el scope PAT opcional `market:fmp` (feature flag `mcp_fmp_proxy`, con límite de tasa). Solo informativo — no es consejo de inversión.",
        },
      },
      {
        type: "improvement",
        text: "Company analysis (`/analisis`) shows a clearer loading skeleton, pulses AI sections while they generate, and hides empty optional rows (such as company revenue guidance without a cited source) instead of “Data unavailable”.",
        translations: {
          es: "El análisis de empresa (`/analisis`) muestra un esqueleto de carga más claro, anima las secciones de IA mientras se generan y oculta filas opcionales vacías (como la guía de ingresos sin fuente citada) en lugar de “Dato no disponible”.",
        },
      },
    ],
  },
  {
    version: "2.5.44",
    date: "2026-07-31",
    title: "Multi-currency FX conversion",
    titleTranslations: {
      es: "Conversión multi-divisa",
    },
    changes: [
      {
        type: "fix",
        text: "Foreign holdings (HKD, JPY, SEK, CHF, SGD, and others) now always fetch the right FX rates and convert into your portfolio’s main currency — values are no longer treated as euros when the rate was missing.",
        translations: {
          es: "Las posiciones en divisas extranjeras (HKD, JPY, SEK, CHF, SGD y otras) ahora obtienen el tipo de cambio correcto y se convierten a la divisa principal de tu cartera — ya no se tratan como euros cuando faltaba el tipo de cambio.",
        },
      },
    ],
  },
  {
    version: "2.5.43",
    date: "2026-07-31",
    title: "Hong Kong market data",
    titleTranslations: {
      es: "Datos de mercado de Hong Kong",
    },
    changes: [
      {
        type: "fix",
        text: "Hong Kong stocks (for example Hutchison Tele / 215.HK from DeGiro) now load prices and charts by using Yahoo’s 4-digit ticker format (0215.HK).",
        translations: {
          es: "Las acciones de Hong Kong (por ejemplo Hutchison Tele / 215.HK desde DeGiro) ahora cargan precios y gráficos usando el formato de 4 dígitos de Yahoo (0215.HK).",
        },
      },
    ],
  },
  {
    version: "2.5.42",
    date: "2026-07-25",
    title: "Shared agent platform",
    titleTranslations: {
      es: "Plataforma compartida de agentes",
    },
    changes: [
      {
        type: "improvement",
        text: "Warren now shares its AI Gateway routing, Telegram message formatting and confirmation buttons with the other trefolio agents through a common platform, so fixes and safety checks land everywhere at once.",
        translations: {
          es: "Warren ahora comparte el enrutado de AI Gateway, el formato de mensajes de Telegram y los botones de confirmación con los demás agentes de trefolio a través de una plataforma común, así las correcciones y comprobaciones de seguridad llegan a todos a la vez.",
        },
      },
    ],
  },
  {
    version: "2.5.41",
    date: "2026-07-25",
    title: "trefolio Studio hub",
    titleTranslations: {
      es: "Hub trefolio Studio",
    },
    changes: [
      {
        type: "feature",
        text: "New public /studio page presents all five AI agents (Warren, Clara, Will, Renata, Roxana) and the shared platform, linked from the homepage nav and footer.",
        translations: {
          es: "Nueva página pública /studio presenta los cinco agentes de IA (Warren, Clara, Will, Renata, Roxana) y la plataforma compartida, enlazada desde el menú y el pie de la homepage.",
        },
      },
    ],
  },
  {
    version: "2.5.40",
    date: "2026-07-21",
    title: "Analysis and Moat from holdings",
    titleTranslations: {
      es: "Análisis y Moat desde posiciones",
    },
    changes: [
      {
        type: "improvement",
        text: "Each portfolio holding on the home dashboard links to company analysis and Moat evaluation for that ticker.",
        translations: {
          es: "Cada posición de la cartera en la home enlaza al análisis de empresa y a la evaluación Moat de ese ticker.",
        },
      },
    ],
  },
  {
    version: "2.5.39",
    date: "2026-07-21",
    title: "Regenerate company analysis",
    titleTranslations: {
      es: "Regenerar análisis de empresa",
    },
    changes: [
      {
        type: "improvement",
        text: "Company analysis pages include a Regenerate button that clears the week cache for that ticker and rebuilds report + AI narrative from live data.",
        translations: {
          es: "Las páginas de análisis de empresa incluyen un botón Regenerar que borra la caché semanal de ese ticker y reconstruye informe + narrativa AI con datos en vivo.",
        },
      },
    ],
  },
  {
    version: "2.5.38",
    date: "2026-07-21",
    title: "Company analysis narrative AI fix",
    titleTranslations: {
      es: "Corrección de narrativa AI del análisis de empresa",
    },
    changes: [
      {
        type: "fix",
        text: "Company analysis competitive position and sector outlook now generate again: the narrative endpoint no longer sends JSON response_format, which gpt-4.1-nano rejects via the AI Gateway.",
        translations: {
          es: "La posición competitiva y el outlook de sector del análisis de empresa vuelven a generarse: el endpoint de narrativa ya no envía response_format JSON, que gpt-4.1-nano rechaza en el AI Gateway.",
        },
      },
    ],
  },
  {
    version: "2.5.37",
    date: "2026-07-21",
    title: "Company analysis week cache",
    titleTranslations: {
      es: "Caché semanal del análisis de empresa",
    },
    changes: [
      {
        type: "improvement",
        text: "Company analysis reports and AI narratives are stored for 7 days and loaded from cache; the UI shows when the analysis was generated. Missing/unavailable sections are retried without rebuilding the whole report.",
        translations: {
          es: "Los informes y narrativas de análisis de empresa se guardan 7 días y se cargan desde caché; la UI muestra cuándo se generó el análisis. Solo se reintentan las secciones faltantes o no disponibles.",
        },
      },
      {
        type: "fix",
        text: "Paused the market digest-email cron (Gmail poll every 15 minutes) so expired Gmail tokens no longer spam production errors.",
        translations: {
          es: "Pausado el cron digest-email del market digest (Gmail cada 15 minutos) para que tokens de Gmail caducados dejen de llenar de errores la producción.",
        },
      },
    ],
  },
  {
    version: "2.5.36",
    date: "2026-07-21",
    title: "Company analysis web enrichment",
    titleTranslations: {
      es: "Enriquecimiento web del análisis de empresa",
    },
    changes: [
      {
        type: "improvement",
        text: "Company analysis narratives can use Tavily web search (with citations) for sector outlook and risks; last EPS falls back to FMP earnings when Yahoo history is empty; company guidance appears only with a citable source URL.",
        translations: {
          es: "Las narrativas de análisis de empresa pueden usar búsqueda web Tavily (con citas) para outlook y riesgos; el EPS reciente usa FMP si Yahoo no lo trae; el guidance de la compañía solo aparece con URL fuente citable.",
        },
      },
    ],
  },
  {
    version: "2.5.35",
    date: "2026-07-20",
    title: "Company analysis section",
    titleTranslations: {
      es: "Sección de análisis de empresa",
    },
    changes: [
      {
        type: "feature",
        text: "New /analisis section: search a ticker and get a fundamentals + technicals report with news, Form 4 insider trades, US Congress trading (FMP), and a momentum-based sector alternative — with clear “data unavailable” states and editorial disclaimers.",
        translations: {
          es: "Nueva sección /analisis: busca un ticker y obtén un informe de fundamentales y técnico con noticias, insider Form 4, trading del Congreso EE. UU. (FMP) y una alternativa de sector por momentum — con estados “dato no disponible” y disclaimers editoriales claros.",
        },
      },
      {
        type: "improvement",
        text: "Next-quarter forecast now shows analyst consensus revenue and EPS (Yahoo earnings outlook + FMP unreported earnings when available), without treating consensus as company guidance.",
        translations: {
          es: "La previsión del próximo trimestre ahora muestra el consenso de analistas de ventas y EPS (outlook Yahoo + earnings FMP no reportados cuando hay datos), sin presentar el consenso como guidance de la compañía.",
        },
      },
      {
        type: "improvement",
        text: "Company analysis chart uses an interactive TradingView embed (weekly candles, 24-month range) matching the analysis report template, with CSP allowlisting and a fallback link.",
        translations: {
          es: "El gráfico de análisis de empresa usa un embed interactivo de TradingView (velas semanales, rango 24 meses) como en la plantilla del informe, con CSP permitido y enlace de respaldo.",
        },
      },
    ],
  },
  {
    version: "2.5.34",
    date: "2026-07-17",
    title: "DEGIRO corporate-action import fix",
    titleTranslations: {
      es: "Corrección de importación de acciones corporativas DEGIRO",
    },
    changes: [
      {
        type: "fix",
        text: "DEGIRO CSV import now treats OPA/delisting/merger share removals (DELISTING, Fusión, WIJZIGING ISIN, etc.) as sells and attaches Corporate Action Cash Settlement proceeds, so positions no longer stay as ghost holdings after cash is credited.",
        translations: {
          es: "La importación CSV de DEGIRO ahora trata las salidas por OPA/exclusión/fusión (DELISTING, Fusión, WIJZIGING ISIN, etc.) como ventas y asocia el efectivo de Corporate Action Cash Settlement, evitando posiciones fantasma cuando el cash ya se ha acreditado.",
        },
      },
    ],
  },
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
        text: "MCP ecosystem Phase 4: Clara getSavingsSummary and Will createNote with finance:read/write and notes:read/write PAT scopes; agent routing table in IdP docs.",
        translations: {
          es: "MCP ecosistema Fase 4: getSavingsSummary en Clara y createNote en Will con scopes PAT finance:* y notes:*; tabla de enrutamiento para agentes en docs IdP.",
        },
      },
      {
        type: "feature",
        text: "MCP tax and portfolio score: getTaxReport and getPortfolioScore tools with granular PAT scopes (tax:read, tools:read) enforced per tool.",
        translations: {
          es: "MCP fiscal y portfolio score: herramientas getTaxReport y getPortfolioScore con scopes PAT granulares (tax:read, tools:read) aplicados por herramienta.",
        },
      },
      {
        type: "feature",
        text: "MCP expansion: external agents can read portfolio summary, quotes, transactions, dividends, stock screener, alerts, watchlist, and portfolio news via PAT — plus runMoatEvaluation alias for fresh MOAT runs.",
        translations: {
          es: "Ampliación MCP: agentes externos pueden leer resumen de cartera, cotizaciones, transacciones, dividendos, screener, alertas, watchlist y noticias vía PAT — más alias runMoatEvaluation para MOAT en vivo.",
        },
      },
      {
        type: "feature",
        text: "Admin MCP Analytics dashboard: adoption funnel, tool calls, recurrence, and per-user usage at /admin/mcp-analytics.",
        translations: {
          es: "Panel Admin MCP Analytics: funnel de adopción, llamadas a tools, recurrencia y uso por usuario en /admin/mcp-analytics.",
        },
      },
      {
        type: "feature",
        text: "MCP personal access tokens: new Profile → Developer · MCP tab with inline create, list, and revoke — no redirect to user.trefolio.com.",
        translations: {
          es: "Tokens MCP: nueva pestaña Perfil → Developer · MCP con creación, listado y revocación integrados — sin redirigir a user.trefolio.com.",
        },
      },
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
