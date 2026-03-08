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

export const CURRENT_VERSION = "1.0.0";

export const releaseNotes: ReleaseEntry[] = [
  {
    version: "1.0.0",
    date: "2026-03-08",
    title: "trefolio 1.0",
    titleTranslations: { es: "trefolio 1.0" },
    changes: [
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
