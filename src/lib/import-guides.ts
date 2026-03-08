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
  {
    id: "charles_schwab",
    titleEn: "Charles Schwab — Brokerage History CSV",
    titleEs: "Charles Schwab — Historial CSV de corretaje",
    stepsEn: [
      "Sign in to your Charles Schwab account.",
      "Select the 'Account' dropdown and navigate to your trading account.",
      "Select 'History' from the dropdown menu.",
      "Optionally filter by Brokerage Account and Date Range.",
      "Click 'Export' in the top-right to download the CSV.",
      "Upload the downloaded file here.",
    ],
    stepsEs: [
      "Inicia sesión en tu cuenta de Charles Schwab.",
      "Selecciona el menú 'Account' y navega a tu cuenta de trading.",
      "Selecciona 'History' en el menú desplegable.",
      "Opcionalmente filtra por cuenta y rango de fechas.",
      "Haz clic en 'Export' en la parte superior derecha para descargar el CSV.",
      "Sube el archivo descargado aquí.",
    ],
    noteEn: "Upload yearly files from oldest to newest if your history spans more than one year.",
    noteEs: "Sube archivos anuales del más antiguo al más reciente si tu historial abarca más de un año.",
  },
  {
    id: "fidelity",
    titleEn: "Fidelity — Activity & Orders CSV",
    titleEs: "Fidelity — CSV de actividad y órdenes",
    stepsEn: [
      "Log in to Fidelity.",
      "Go to 'Activity & Orders'.",
      "Change the date filter to 'Custom' and set your desired date range (up to 366 days).",
      "Click the download icon in the upper right and select 'Download as CSV'.",
      "Upload the downloaded file here.",
    ],
    stepsEs: [
      "Inicia sesión en Fidelity.",
      "Ve a 'Activity & Orders'.",
      "Cambia el filtro de fechas a 'Custom' y establece el rango deseado (hasta 366 días).",
      "Haz clic en el icono de descarga en la parte superior derecha y selecciona 'Download as CSV'.",
      "Sube el archivo descargado aquí.",
    ],
    noteEn: "Upload one file per year (max 366 days), oldest to newest.",
    noteEs: "Sube un archivo por año (máx. 366 días), del más antiguo al más reciente.",
  },
  {
    id: "nordnet",
    titleEn: "Nordnet — Transactions CSV export",
    titleEs: "Nordnet — Exportar transacciones CSV",
    stepsEn: [
      "Log in to Nordnet (nordnet.no / nordnet.se / nordnet.dk / nordnet.fi).",
      "Go to the 'Transactions' tab.",
      "Select the required date range (from your account opening date for a new portfolio).",
      "Click the 'Export CSV' button.",
      "Upload the downloaded file here.",
    ],
    stepsEs: [
      "Inicia sesión en Nordnet.",
      "Ve a la pestaña 'Transactions' (Transacciones).",
      "Selecciona el rango de fechas requerido (desde la apertura de tu cuenta para un portafolio nuevo).",
      "Haz clic en el botón 'Export CSV'.",
      "Sube el archivo descargado aquí.",
    ],
  },
  {
    id: "tastytrade",
    titleEn: "Tastytrade — Transaction History CSV",
    titleEs: "Tastytrade — Historial de transacciones CSV",
    stepsEn: [
      "Download and install the Tastytrade desktop platform from tastytrade.com/trading-platforms.",
      "Sign in, then click the clock icon on the left column to access your account history.",
      "In the 'History' tab, filter by dates if necessary.",
      "Click the 'CSV' button in the top-right corner to download.",
      "Upload the downloaded file here.",
    ],
    stepsEs: [
      "Descarga e instala la plataforma de escritorio de Tastytrade desde tastytrade.com/trading-platforms.",
      "Inicia sesión y haz clic en el icono de reloj en la columna izquierda para acceder al historial.",
      "En la pestaña 'History', filtra por fechas si es necesario.",
      "Haz clic en el botón 'CSV' en la esquina superior derecha para descargar.",
      "Sube el archivo descargado aquí.",
    ],
    noteEn: "Only equity trades and dividends are imported. Options and futures are skipped.",
    noteEs: "Solo se importan operaciones de acciones y dividendos. Las opciones y futuros se omiten.",
  },
  {
    id: "freetrade",
    titleEn: "Freetrade — Activity CSV export",
    titleEs: "Freetrade — Exportar actividad CSV",
    stepsEn: [
      "Open the Freetrade app and go to the Activity page.",
      "Tap the export button in the top-right corner.",
      "Save the CSV file to your device.",
      "Upload the downloaded file here.",
    ],
    stepsEs: [
      "Abre la app de Freetrade y ve a la página de Actividad.",
      "Toca el botón de exportar en la esquina superior derecha.",
      "Guarda el archivo CSV en tu dispositivo.",
      "Sube el archivo descargado aquí.",
    ],
  },
  {
    id: "etoro",
    titleEn: "eToro — Account Statement XLS/CSV",
    titleEs: "eToro — Extracto de cuenta XLS/CSV",
    stepsEn: [
      "Go to your eToro account and click 'Settings' in the left menu.",
      "Click 'Account'.",
      "Scroll down to the 'Documents' section → 'Account Statement' → click 'View'.",
      "Select the time frame you want to export and click 'Create'.",
      "Click the 'XLS' button in the top-right corner to download the statement.",
      "Open the XLS file in Excel/Google Sheets, export the relevant sheet as CSV, and upload here.",
    ],
    stepsEs: [
      "Ve a tu cuenta de eToro y haz clic en 'Settings' en el menú de la izquierda.",
      "Haz clic en 'Account'.",
      "Desplázate hasta la sección 'Documents' → 'Account Statement' → haz clic en 'View'.",
      "Selecciona el período de tiempo y haz clic en 'Create'.",
      "Haz clic en el botón 'XLS' en la esquina superior derecha para descargar.",
      "Abre el XLS en Excel/Google Sheets, exporta la hoja relevante como CSV y súbela aquí.",
    ],
    noteEn: "Only stock positions are imported. CFD and crypto positions are skipped.",
    noteEs: "Solo se importan posiciones de acciones. Las posiciones de CFD y criptomonedas se omiten.",
  },
  {
    id: "wealthsimple",
    titleEn: "Wealthsimple — Activities Export CSV",
    titleEs: "Wealthsimple — Exportar actividades CSV",
    stepsEn: [
      "Log in to Wealthsimple on desktop (not the mobile app).",
      "Click the profile icon in the top right.",
      "Click 'Documents'.",
      "Click 'Request Documents' in the top-right corner.",
      "For Document type select 'Activities Export (CSV)' and choose your desired period.",
      "Select the accounts you want to export and click 'Download CSV'.",
      "Upload the downloaded file here.",
    ],
    stepsEs: [
      "Inicia sesión en Wealthsimple en escritorio (no en la app móvil).",
      "Haz clic en el icono de perfil en la parte superior derecha.",
      "Haz clic en 'Documents'.",
      "Haz clic en 'Request Documents' en la esquina superior derecha.",
      "Para el tipo de documento, selecciona 'Activities Export (CSV)' y elige el período deseado.",
      "Selecciona las cuentas que quieres exportar y haz clic en 'Download CSV'.",
      "Sube el archivo descargado aquí.",
    ],
  },
  {
    id: "questrade",
    titleEn: "Questrade — Account Activity CSV",
    titleEs: "Questrade — CSV de actividad de cuenta",
    stepsEn: [
      "Log in to Questrade and go to the 'Accounts' menu.",
      "Select your account.",
      "Go to 'Account Activity'.",
      "Select the desired date range.",
      "Download the file (save the Excel export as CSV).",
      "Upload the downloaded file here.",
    ],
    stepsEs: [
      "Inicia sesión en Questrade y ve al menú 'Accounts'.",
      "Selecciona tu cuenta.",
      "Ve a 'Account Activity'.",
      "Selecciona el rango de fechas deseado.",
      "Descarga el archivo (guarda el export de Excel como CSV).",
      "Sube el archivo descargado aquí.",
    ],
  },
  {
    id: "firstrade",
    titleEn: "Firstrade — Account History CSV",
    titleEs: "Firstrade — Historial de cuenta CSV",
    stepsEn: [
      "Log in to Firstrade and select 'Accounts' from the main dashboard.",
      "Go to 'Tax Center'.",
      "Scroll down to 'Download account information'.",
      "Select start date and end date.",
      "Select 'Excel CSV Files' and download.",
      "Upload the downloaded file here.",
    ],
    stepsEs: [
      "Inicia sesión en Firstrade y selecciona 'Accounts' en el panel principal.",
      "Ve a 'Tax Center'.",
      "Desplázate hacia abajo hasta 'Download account information'.",
      "Selecciona la fecha de inicio y fin.",
      "Selecciona 'Excel CSV Files' y descarga.",
      "Sube el archivo descargado aquí.",
    ],
  },
  {
    id: "snaptrade_api",
    titleEn: "Broker Sync — Automatic Import (Pro)",
    titleEs: "Sincronización de Bróker — Importación Automática (Pro)",
    stepsEn: [
      "Click \"Connect Brokerage\" below.",
      "Select your brokerage from the list (supports 20+ brokerages).",
      "Log in to your brokerage and authorize the connection.",
      "Your holdings will be automatically imported — review and confirm.",
    ],
    stepsEs: [
      "Haz clic en \"Conectar Bróker\" abajo.",
      "Selecciona tu bróker de la lista (compatible con más de 20 brókers).",
      "Inicia sesión en tu bróker y autoriza la conexión.",
      "Tus posiciones se importarán automáticamente — revisa y confirma.",
    ],
    noteEn: "Your brokerage credentials are never shared with trefolio. The connection uses secure OAuth authentication.",
    noteEs: "Tus credenciales del bróker nunca se comparten con trefolio. La conexión usa autenticación OAuth segura.",
  },
];

export function getGuide(id: string): ImportGuide | undefined {
  return IMPORT_GUIDES.find((g) => g.id === id);
}
