import { registerPost } from "./blog";

registerPost({
  slug: "mejor-tracker-inversiones-degiro",
  title: "Mejor tracker de inversiones para DEGIRO",
  description:
    "Por qué los usuarios de DEGIRO necesitan un tracker dedicado, cómo trefolio te ayuda con importación CSV, análisis IA, informes fiscales para España y más. Guía paso a paso.",
  date: "2026-03-13",
  readingTime: "8 min read",
  keywords: [
    "mejor tracker inversiones DEGIRO",
    "tracker cartera DEGIRO España",
    "importar cartera DEGIRO",
    "seguimiento portfolio DEGIRO",
    "tracker gratuito DEGIRO",
    "alternativa DEGIRO portfolio",
    "gestión cartera DEGIRO",
    "tracker bolsa DEGIRO",
  ],
  lang: "es",
  alternates: {
    en: "how-to-import-degiro-portfolio",
    es: "mejor-tracker-inversiones-degiro",
    fr: "meilleur-suivi-portefeuille-degiro",
    de: "beste-portfolio-tracker-degiro",
    it: "miglior-tracker-portafoglio-degiro",
    pt: "melhor-tracker-carteira-degiro",
    nl: "beste-portfolio-tracker-degiro-nl",
    pl: "najlepszy-tracker-portfela-degiro",
    sv: "basta-portfoljtracker-degiro",
    da: "bedste-portefolje-tracker-degiro",
    fi: "paras-salkkuseuranta-degiro",
  },
  content: /* html */ `
<h1>Mejor tracker de inversiones para DEGIRO</h1>
<p>DEGIRO es uno de los brokers más populares en Europa. Ofrece comisiones bajas y acceso a mercados globales, pero su interfaz de cartera tiene limitaciones claras: ves tus posiciones, pero no métricas de rendimiento, proyecciones de dividendos ni análisis agregado si combinas varias cuentas o brokers. Por eso muchos inversores buscan un tracker dedicado que complemente DEGIRO.</p>

<h2>Por qué necesitas un tracker si usas DEGIRO</h2>
<p>La app de DEGIRO te muestra el valor actual de tus posiciones y poco más. Si quieres saber tu rentabilidad real (TTWROR, IRR), compararte con el S&P 500 o Euro Stoxx 50, proyectar dividendos a 5 años o tener un informe fiscal listo para la declaración de la renta, necesitas herramientas adicionales.</p>
<p>Un tracker como trefolio centraliza todo: importas tu historial de DEGIRO en segundos, obtienes métricas de rendimiento calculadas desde tus operaciones reales, y puedes añadir posiciones de otros brokers para ver tu cartera global en un solo sitio.</p>

<h2>Qué ofrece trefolio a los usuarios de DEGIRO</h2>
<p>trefolio está pensado para inversores europeos. Estas son las funciones más útiles si operas con DEGIRO:</p>

<h3>Importación CSV de 14 brokers</h3>
<p>trefolio soporta importación directa de CSV de DEGIRO, Interactive Brokers, Trading 212, Revolut y otros 10 brokers. Exportas tu archivo Account.csv desde DEGIRO, lo subes a trefolio, y en menos de 2 minutos tienes toda tu cartera importada con compras, ventas, dividendos y comisiones.</p>

<h3>Sincronización automática con SnapTrade</h3>
<p>Si prefieres no exportar CSV cada vez que operas, puedes conectar tu broker mediante SnapTrade. La cartera se actualiza automáticamente cada 6 horas. DEGIRO no está aún en la lista de SnapTrade, pero IBKR y otros brokers sí — útil si combinas varias cuentas.</p>

<h3>Análisis IA de tu cartera</h3>
<p>Puedes preguntar a la IA sobre cualquier valor de tu cartera: fundamentales, riesgos, sostenibilidad de dividendos, concentración sectorial. El análisis está disponible en 35 idiomas, incluido español.</p>

<h3>Multi-moneda (EUR, USD, GBP)</h3>
<p>Si tienes posiciones en dólares, libras o euros, trefolio convierte todo a tu moneda base con tipos de cambio en tiempo real. No hace falta calcular manualmente.</p>

<h3>Simulador de cartera</h3>
<p>Backtest de estrategias DCA hasta 30 años, escenarios what-if y pruebas de estrés contra crisis históricas (2008, COVID, dot-com). Ideal para planificar antes de cambiar tu asignación.</p>

<h3>Stock screener y seguimiento de patrimonio</h3>
<p>Filtra más de 600 acciones europeas por yield, P/E, sector y bolsa. Añade inmuebles, ahorros y pensiones para ver tu patrimonio neto completo.</p>

<h3>Informes fiscales para España</h3>
<p>trefolio genera informes fiscales adaptados a España: Modelo 100, Modelo 720, regla de los 2 meses para wash sales, base de coste FIFO. Los dividendos y retenciones se calculan automáticamente.</p>

<h2>Cómo importar tu cartera de DEGIRO paso a paso</h2>
<ol>
<li>Entra en tu cuenta DEGIRO en <strong>trader.degiro.nl</strong> (o tu dominio regional).</li>
<li>Ve a <strong>Actividad</strong> → <strong>Cuenta</strong>.</li>
<li>Selecciona el rango de fechas que cubra todas tus operaciones (recomendable: desde la apertura de la cuenta).</li>
<li>Haz clic en <strong>Exportar</strong> y elige <strong>CSV</strong>.</li>
<li>Guarda el archivo (por ejemplo, <code>Account.csv</code>).</li>
<li>En trefolio, ve a <strong>Importar</strong>, selecciona <strong>DEGIRO</strong> y arrastra el CSV.</li>
<li>Revisa la vista previa y haz clic en <strong>Importar todo</strong>.</li>
</ol>
<p>Tu cartera aparecerá en el dashboard con precios en tiempo real, valor total, variación diaria y métricas de rendimiento.</p>

<h2>Comparación con hojas de cálculo y otras herramientas</h2>
<table>
<thead>
<tr><th>Característica</th><th>trefolio</th><th>Excel/Google Sheets</th><th>Otros trackers</th></tr>
</thead>
<tbody>
<tr><td>Importación DEGIRO</td><td>CSV directo</td><td>Manual</td><td>Variable</td></tr>
<tr><td>Métricas TTWROR/IRR</td><td>Automáticas</td><td>Fórmulas complejas</td><td>Algunos sí</td></tr>
<tr><td>Informes fiscales España</td><td>Sí (Modelo 100)</td><td>Manual</td><td>Pocos</td></tr>
<tr><td>Análisis IA</td><td>Sí</td><td>No</td><td>Pocos</td></tr>
<tr><td>Multi-moneda</td><td>Automático</td><td>Manual</td><td>Variable</td></tr>
<tr><td>Idiomas</td><td>35</td><td>—</td><td>Limitado</td></tr>
</tbody>
</table>

<h2>Precios de trefolio</h2>
<ul>
<li><strong>Folio (gratis):</strong> hasta 15 posiciones, cotizaciones en tiempo real, 5 consultas IA al mes, informes fiscales básicos.</li>
<li><strong>Bifolio (€2,99/mes):</strong> más posiciones, alertas por WhatsApp y push.</li>
<li><strong>Trefolio (€7,99/mes):</strong> posiciones ilimitadas, IA ilimitada, fundamentales, screener completo, exportación CSV.</li>
</ul>

<h2>Conclusión</h2>
<p>Si usas DEGIRO y quieres un seguimiento serio de tu cartera — rendimiento real, dividendos, fiscalidad española y análisis IA — trefolio es una opción sólida. La importación por CSV es rápida y no requiere tarjeta de crédito para probar.</p>
<p><a href="https://trefolio.com/signup">Crear cuenta gratuita en trefolio</a> y prueba con tu cartera real de DEGIRO.</p>
`,
});

registerPost({
  slug: "degiro-impuestos-espana-modelo-100",
  title: "DEGIRO impuestos España — Cómo hacer la declaración con trefolio",
  description:
    "Guía para declarar tus inversiones en DEGIRO en España: Modelo 100, Modelo 720, regla de los 2 meses, dividendos y retenciones. trefolio genera el informe fiscal automáticamente.",
  date: "2026-03-13",
  readingTime: "9 min read",
  keywords: [
    "DEGIRO impuestos España",
    "DEGIRO declaración renta",
    "DEGIRO Modelo 100",
    "impuestos bolsa España DEGIRO",
    "plusvalías DEGIRO declarar",
    "dividendos DEGIRO impuestos",
    "Modelo 720 DEGIRO",
    "declarar inversiones DEGIRO España",
  ],
  lang: "es",
  content: /* html */ `
<h1>DEGIRO impuestos España — Cómo hacer la declaración con trefolio</h1>
<p>Declarar las inversiones en DEGIRO en la renta española puede ser tedioso. Plusvalías, minusvalías, dividendos, retenciones en origen, regla de los 2 meses para wash sales, Modelo 720 si superas umbrales… Todo ello requiere ordenar datos de múltiples operaciones y asegurarse de que cuadran con Hacienda. trefolio simplifica el proceso generando un informe fiscal listo para trasladar al Modelo 100.</p>

<h2>El problema de declarar DEGIRO en España</h2>
<p>Cuando operas con DEGIRO desde España, debes declarar:</p>
<ul>
<li><strong>Plusvalías y minusvalías</strong> de la venta de acciones y ETFs en la base imponible del ahorro (19 %, 21 % o 23 % según tramos).</li>
<li><strong>Dividendos</strong> como rendimientos del capital mobiliario, con las retenciones en origen ya aplicadas (por ejemplo, 15 % o 30 % en dividendos de EE. UU.).</li>
<li><strong>Regla de los 2 meses</strong> (wash sale): si vendes con pérdida y recompras el mismo valor en los 2 meses anteriores o posteriores, la minusvalía no se puede deducir hasta la venta definitiva.</li>
<li><strong>Modelo 720</strong> si el valor de tus activos en el extranjero supera 50.000 € (por cuenta o en conjunto).</li>
</ul>
<p>Hacer esto a mano con un CSV de DEGIRO implica calcular bases de coste (FIFO), identificar wash sales y cuadrar retenciones. Un error puede generar inspecciones o recargos.</p>

<h2>Qué hace trefolio por ti en materia fiscal</h2>
<p>trefolio genera informes fiscales específicos para España a partir de tu cartera importada. Estas son las funciones clave:</p>

<h3>Mapeo al Modelo 100</h3>
<p>trefolio organiza tus ganancias y pérdidas de capital, dividendos y retenciones en los campos que necesitas para rellenar el Modelo 100. No tienes que interpretar el borrador de la AEAT a ciegas: el informe te indica qué va en cada casilla.</p>

<h3>Detección del umbral del Modelo 720</h3>
<p>Si el valor de tus activos en el extranjero (incluida la cuenta DEGIRO) supera 50.000 €, debes presentar el Modelo 720. trefolio te avisa cuando te acercas o superas ese umbral, para que no se te pase la obligación.</p>

<h3>Regla de los 2 meses (wash sales)</h3>
<p>trefolio detecta automáticamente las operaciones que entran en la regla de los 2 meses y ajusta las minusvalías deducibles. Así evitas declarar pérdidas que Hacienda no aceptaría.</p>

<h3>Base de coste FIFO</h3>
<p>En España se usa el método FIFO (primera entrada, primera salida) para calcular la base de coste de las ventas. trefolio aplica FIFO automáticamente a partir de tu historial de compras y ventas importado de DEGIRO.</p>

<h3>Dividendos y retenciones</h3>
<p>Los dividendos se clasifican correctamente y se tienen en cuenta las retenciones en origen. Puedes ver el bruto, la retención y el neto, y trasladar las cifras al Modelo 100 sin cálculos manuales.</p>

<h3>Asistente fiscal con IA</h3>
<p>Si tienes dudas sobre wash sales, doble imposición o cómo declarar un tipo concreto de operación, el asistente fiscal de trefolio responde en lenguaje claro y adaptado a la normativa española.</p>

<h2>Guía paso a paso: de DEGIRO al informe fiscal</h2>
<ol>
<li><strong>Importa tu CSV de DEGIRO</strong> en trefolio (Actividad → Cuenta → Exportar CSV). Sube el archivo en la sección Importar y selecciona DEGIRO.</li>
<li><strong>Genera el informe fiscal</strong> desde Herramientas → Informe fiscal. Elige España y el ejercicio fiscal correspondiente.</li>
<li><strong>Revisa el resumen</strong>: plusvalías, minusvalías, dividendos, retenciones y ajustes por wash sales.</li>
<li><strong>Usa el asistente IA</strong> si algo no te queda claro: preguntas sobre coste de adquisición, compensación de pérdidas o Modelo 720.</li>
<li><strong>Descarga el informe</strong> en PDF o CSV para tu asesor o para rellenar el Modelo 100.</li>
</ol>

<h2>Dividendos y retenciones: cómo los trata trefolio</h2>
<p>Los dividendos de acciones estadounidenses suelen tener una retención del 15 % (con tratado) o 30 % (sin tratado). Los de empresas europeas pueden tener retenciones distintas según el país. trefolio extrae estos datos de tu CSV de DEGIRO y los incluye en el informe fiscal, de modo que puedas declarar correctamente el rendimiento neto y las retenciones soportadas.</p>

<h2>Conclusión</h2>
<p>Declarar DEGIRO en España no tiene por qué ser un quebradero de cabeza. Con trefolio importas tu historial, generas el informe fiscal adaptado al Modelo 100 y revisas las dudas con el asistente IA. Todo en unos minutos.</p>
<p><a href="https://trefolio.com/signup">Crear cuenta gratuita en trefolio</a> — sin tarjeta de crédito. El plan Folio incluye informes fiscales para hasta 15 posiciones.</p>
`,
});

registerPost({
  slug: "mejor-tracker-trade-republic",
  title: "Mejor tracker de cartera para Trade Republic en 2026",
  description:
    "Trade Republic no ofrece un tracker avanzado. Descubre cómo trefolio te ayuda a seguir tu cartera con importación manual, análisis IA, multi-moneda y comparativas de rendimiento.",
  date: "2026-03-13",
  readingTime: "7 min read",
  keywords: [
    "mejor tracker Trade Republic",
    "tracker cartera Trade Republic",
    "seguimiento portfolio Trade Republic",
    "Trade Republic portfolio tracker",
    "alternativa Trade Republic inversiones",
    "tracker bolsa Trade Republic España",
  ],
  lang: "es",
  content: /* html */ `
<h1>Mejor tracker de cartera para Trade Republic en 2026</h1>
<p>Trade Republic se ha convertido en una de las apps de inversión más usadas en Europa: comisiones bajas, ahorro programado y una interfaz sencilla. Pero la app muestra básicamente el valor actual de tus posiciones. Si quieres métricas de rendimiento real (TTWROR, IRR), proyecciones de dividendos, comparación con índices o un informe fiscal para España, necesitas un tracker externo. trefolio puede ayudarte.</p>

<h2>Por qué los usuarios de Trade Republic necesitan un tracker</h2>
<p>Trade Republic te dice cuánto valen tus acciones hoy. No te dice:</p>
<ul>
<li>Cuál ha sido tu rentabilidad real considerando el momento de tus aportaciones (IRR).</li>
<li>Cómo te has comportado frente al S&P 500 o al Euro Stoxx 50.</li>
<li>Qué dividendos puedes esperar en los próximos años.</li>
<li>Cómo preparar los datos para la declaración de la renta en España.</li>
</ul>
<p>Un tracker dedicado como trefolio cubre todo esto. La limitación actual es que Trade Republic no tiene un parser CSV específico en trefolio, así que la importación requiere un paso manual. Aun así, el resultado merece la pena.</p>

<h2>Cómo importar tu cartera de Trade Republic</h2>
<p>Trade Republic permite exportar tu historial de operaciones. Aunque trefolio no tiene aún un importador nativo para Trade Republic, puedes usar estas opciones:</p>

<h3>Formato CSV simple</h3>
<p>trefolio acepta un formato CSV genérico con columnas estándar: fecha, símbolo, cantidad, precio, tipo de operación (compra/venta), etc. Si Trade Republic exporta un CSV, puedes adaptarlo a este formato o usar la plantilla de ejemplo que trefolio proporciona en la sección de importación.</p>

<h3>Importación con IA</h3>
<p>trefolio ofrece importación asistida por IA: subes tu archivo (CSV o similar) y la IA intenta detectar las columnas y mapear los datos correctamente. Es especialmente útil cuando el formato del broker no es estándar.</p>

<h3>Entrada manual</h3>
<p>Si tienes pocas posiciones, puedes añadirlas manualmente. Indicas ticker, cantidad, precio de compra y fecha. trefolio calculará el rendimiento y los dividendos a partir de esos datos.</p>

<h2>Qué obtienes con trefolio una vez importada tu cartera</h2>
<ul>
<li><strong>Métricas de rendimiento</strong> — TTWROR, IRR, ratio de Sharpe, drawdown máximo.</li>
<li><strong>Comparación con benchmarks</strong> — S&P 500, Nasdaq, Euro Stoxx 50.</li>
<li><strong>Multi-moneda</strong> — conversión automática EUR, USD, GBP.</li>
<li><strong>Análisis IA</strong> — preguntas sobre cualquier valor o sobre tu cartera completa.</li>
<li><strong>Proyecciones de dividendos</strong> — estimación a 5 años.</li>
<li><strong>Informes fiscales para España</strong> — Modelo 100, wash sales, dividendos.</li>
<li><strong>Stock screener</strong> — filtrado por yield, P/E, sector en más de 600 acciones europeas.</li>
</ul>

<h2>Comparación: Trade Republic vs trefolio</h2>
<table>
<thead>
<tr><th>Función</th><th>Trade Republic</th><th>trefolio</th></tr>
</thead>
<tbody>
<tr><td>Valor de cartera</td><td>Sí</td><td>Sí</td></tr>
<tr><td>TTWROR / IRR</td><td>No</td><td>Sí</td></tr>
<tr><td>Comparación con índices</td><td>No</td><td>Sí</td></tr>
<tr><td>Proyección dividendos</td><td>No</td><td>Sí</td></tr>
<tr><td>Análisis IA</td><td>No</td><td>Sí</td></tr>
<tr><td>Informe fiscal España</td><td>No</td><td>Sí</td></tr>
<tr><td>Multi-broker</td><td>No</td><td>Sí</td></tr>
</tbody>
</table>

<h2>Conclusión</h2>
<p>Trade Republic es excelente para operar, pero su seguimiento de cartera es limitado. trefolio complementa la app con métricas de rendimiento, análisis IA, informes fiscales y soporte multi-moneda. La importación requiere un paso manual (CSV simple o IA) hasta que exista un parser nativo para Trade Republic, pero el esfuerzo inicial se compensa con el control y la información que obtienes.</p>
<p><a href="https://trefolio.com/signup">Crear cuenta gratuita en trefolio</a> — sin tarjeta de crédito. Prueba con tu cartera de Trade Republic y valora si el tracker te aporta lo que necesitas.</p>
`,
});
