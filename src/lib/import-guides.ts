export interface ImportGuide {
  id: string;
  titleEn: string;
  titleEs: string;
  stepsEn: string[];
  stepsEs: string[];
  noteEn?: string;
  noteEs?: string;
}

export const IMPORT_GUIDES: ImportGuide[] = [
  {
    id: "degiro",
    titleEn: "DEGIRO — Account.csv",
    titleEs: "DEGIRO — Account.csv",
    stepsEn: [
      "Log in to DEGIRO web platform.",
      "Go to Activity → Account.",
      "Set the date range from your account opening date until today.",
      'Click "Export" (CSV format).',
      "Upload the downloaded Account.csv file here.",
    ],
    stepsEs: [
      "Inicia sesión en la plataforma web de DEGIRO.",
      "Ve a Actividad → Cuenta.",
      "Establece el rango de fechas desde la apertura de tu cuenta hasta hoy.",
      'Haz clic en "Exportar" (formato CSV).',
      "Sube el archivo Account.csv descargado aquí.",
    ],
    noteEn:
      "Only Account.csv is supported. The Transactions export uses a different format.",
    noteEs:
      "Solo se admite Account.csv. La exportación de Transacciones usa un formato diferente.",
  },
  {
    id: "interactive_brokers_csv",
    titleEn: "Interactive Brokers — Activity Statement CSV",
    titleEs: "Interactive Brokers — Extracto de Actividad CSV",
    stepsEn: [
      "Log in to IBKR Client Portal.",
      "Go to Performance & Reports → Statements.",
      'Select "Activity" statement type.',
      "Choose CSV format and your desired date range.",
      "Download and upload the file here.",
    ],
    stepsEs: [
      "Inicia sesión en el Portal de IBKR.",
      "Ve a Performance & Reports → Statements.",
      'Selecciona el tipo "Activity".',
      "Elige formato CSV y el rango de fechas deseado.",
      "Descarga y sube el archivo aquí.",
    ],
    noteEn:
      "Both Activity Statement and Flex Query CSV exports are supported.",
    noteEs:
      "Se soportan tanto el Extracto de Actividad como las exportaciones CSV de Flex Query.",
  },
  {
    id: "interactive_brokers_api",
    titleEn: "Interactive Brokers — API Sync (Pro)",
    titleEs: "Interactive Brokers — Sincronización API (Pro)",
    stepsEn: [
      "In IBKR Client Portal, go to Settings → Reporting → Flex Queries.",
      "Create a new Flex Query that includes Trades, Dividends, and Fees.",
      "Go to Settings → API → Enable API access. Copy your API token.",
      'Paste your token and Flex Query ID below, then click "Fetch Portfolio."',
    ],
    stepsEs: [
      "En el Portal de IBKR, ve a Settings → Reporting → Flex Queries.",
      "Crea una nueva Flex Query que incluya Trades, Dividends y Fees.",
      "Ve a Settings → API → Habilitar acceso API. Copia tu token.",
      'Pega tu token y Query ID abajo, luego haz clic en "Obtener Portafolio".',
    ],
    noteEn: "Save your connection to re-sync with one click in the future.",
    noteEs: "Guarda tu conexión para re-sincronizar con un clic en el futuro.",
  },
  {
    id: "trading_212",
    titleEn: "Trading 212 — History CSV",
    titleEs: "Trading 212 — Historial CSV",
    stepsEn: [
      "Open Trading 212 (web or app).",
      "Go to Menu → History.",
      'Click "Export" to download as CSV.',
      "Upload the downloaded file here.",
    ],
    stepsEs: [
      "Abre Trading 212 (web o app).",
      "Ve a Menú → Historial.",
      'Haz clic en "Exportar" para descargar como CSV.',
      "Sube el archivo descargado aquí.",
    ],
  },
  {
    id: "revolut",
    titleEn: "Revolut — Account Statement",
    titleEs: "Revolut — Extracto de Cuenta",
    stepsEn: [
      "Open Revolut app or web.",
      "Go to Invest → More (three dots).",
      "Select Statements → Account statement.",
      "Choose Excel or CSV format and download.",
      "Upload the downloaded file here.",
    ],
    stepsEs: [
      "Abre la app o web de Revolut.",
      "Ve a Invest → Más (tres puntos).",
      "Selecciona Extractos → Extracto de cuenta.",
      "Elige formato Excel o CSV y descarga.",
      "Sube el archivo descargado aquí.",
    ],
  },
  {
    id: "simple_csv",
    titleEn: "Simple CSV — Custom Format",
    titleEs: "CSV Simple — Formato Personalizado",
    stepsEn: [
      "Create a spreadsheet with columns: ticker, type (buy/sell/dividend/fee), price, amount, currency.",
      "Optional columns: date (YYYY-MM-DD), name.",
      "Fill in your transactions — one row per transaction.",
      "Save as CSV and upload here.",
    ],
    stepsEs: [
      "Crea una hoja de cálculo con columnas: ticker, type (buy/sell/dividend/fee), price, amount, currency.",
      "Columnas opcionales: date (YYYY-MM-DD), name.",
      "Rellena tus transacciones — una fila por transacción.",
      "Guarda como CSV y sube aquí.",
    ],
    noteEn: "Or download our template to get started quickly.",
    noteEs: "O descarga nuestra plantilla para empezar rápidamente.",
  },
  {
    id: "ai_import",
    titleEn: "AI-Powered Import",
    titleEs: "Importación con IA",
    stepsEn: [
      "Take a screenshot of your portfolio in any broker platform.",
      "Or export a CSV file that doesn't match the formats above.",
      "Drop the file here — AI will extract holdings and transactions automatically.",
      "Review the extracted data and confirm the import.",
    ],
    stepsEs: [
      "Haz una captura de pantalla de tu cartera en cualquier plataforma.",
      "O exporta un CSV que no coincida con los formatos anteriores.",
      "Suelta el archivo aquí — la IA extraerá posiciones y transacciones automáticamente.",
      "Revisa los datos extraídos y confirma la importación.",
    ],
    noteEn:
      "AI extraction has daily usage limits. Results should always be reviewed before importing.",
    noteEs:
      "La extracción con IA tiene límites diarios. Los resultados deben revisarse siempre antes de importar.",
  },
];

export function getGuide(id: string): ImportGuide | undefined {
  return IMPORT_GUIDES.find((g) => g.id === id);
}
