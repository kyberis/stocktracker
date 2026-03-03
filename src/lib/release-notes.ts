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

export const CURRENT_VERSION = "0.9.2";

export const releaseNotes: ReleaseEntry[] = [
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
