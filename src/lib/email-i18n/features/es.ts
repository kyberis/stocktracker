import type { FeatureTemplateStrings, TemplateFooterStrings } from "../template-types";

export const footer: TemplateFooterStrings = {
  receivedText: "Recibiste este email de trefolio.",
  unsubscribeLabel: "Cancelar suscripci&oacute;n"
};

export const features: Record<string, FeatureTemplateStrings> = {
  "feature-real-time-quotes": {
    heading: "Cotizaciones en tiempo real",
    intro: "Tu panel de cartera actualiza los precios en vivo durante el d&iacute;a de negociaci&oacute;n — sin recarga manual.",
    sectionLabel: "Qu&eacute; obtienes:",
    features: [
      {
        title: "60+ bolsas",
        desc: "Precios de NYSE, NASDAQ, Euronext, Londres, Fr&aacute;ncfort y m&aacute;s — con Yahoo Finance."
      },
      {
        title: "Auto-actualizaci&oacute;n",
        desc: "Las cotizaciones se actualizan cada 15 segundos (configurable a 30s o 60s en ajustes)."
      },
      {
        title: "Multi-moneda",
        desc: "Ve valores en tu moneda local. Soportamos 21 monedas con conversi&oacute;n autom&aacute;tica."
      }
    ],
    tierText: "Disponible en todos los planes",
    ctaLabel: "Abrir tu panel"
  },
  "feature-dividend-tracking": {
    heading: "Seguimiento de dividendos",
    intro: "trefolio detecta autom&aacute;ticamente los dividendos de tus posiciones y construye una imagen completa de ingresos.",
    sectionLabel: "Qu&eacute; obtienes:",
    features: [
      {
        title: "Calendario de dividendos",
        desc: "Ve los pagos pr&oacute;ximos mes a mes. Sabr&aacute;s exactamente cu&aacute;ndo llegan los dividendos a tu cuenta."
      },
      {
        title: "Ingresos anuales",
        desc: "Ingresos totales proyectados por dividendos en toda tu cartera con desglose por acci&oacute;n."
      },
      {
        title: "Rendimiento sobre coste",
        desc: "Sigue tu rendimiento real basado en el precio de compra — no solo la tasa actual de dividendos."
      },
      {
        title: "Simulaci&oacute;n DRIP",
        desc: "Ve c&oacute;mo reinvertir dividendos podr&iacute;a hacer crecer tus rendimientos en 5, 10 o 20 a&ntilde;os."
      }
    ],
    tierText: "Disponible en todos los planes",
    ctaLabel: "Ver tus dividendos"
  },
  "feature-ai-analysis": {
    heading: "An&aacute;lisis de acciones con IA",
    intro: "Pregunta a nuestra IA sobre cualquier acci&oacute;n en tu cartera o cualquier ticker que consideres. Obt&eacute;n an&aacute;lisis de calidad institucional en segundos.",
    sectionLabel: "Qu&eacute; puedes preguntar:",
    features: [
      {
        title: "An&aacute;lisis de resultados",
        desc: "\"¿C&oacute;mo fueron los &uacute;ltimos resultados de AAPL?\" — resumen de resultados, gu&iacute;a y reacci&oacute;n del mercado."
      },
      {
        title: "Evaluaci&oacute;n de riesgos",
        desc: "\"¿Cu&aacute;les son los riesgos de tener TSLA?\" — amenazas competitivas, valoraci&oacute;n y factores macro."
      },
      {
        title: "Comparaci&oacute;n de competidores",
        desc: "\"Compara MSFT vs GOOG\" — an&aacute;lisis lado a lado de finanzas, crecimiento y valoraci&oacute;n."
      },
      {
        title: "Revisi&oacute;n de cartera",
        desc: "\"Revisa mi cartera\" — la IA analiza tu asignaci&oacute;n, riesgo y sugiere mejoras."
      }
    ],
    tierText: "Folio: 5 llamadas/mes | Bifolio: 20/mes | Trefolio: Ilimitado",
    ctaLabel: "Probar an&aacute;lisis IA ahora"
  },
  "feature-price-alerts": {
    heading: "Alertas de precio",
    intro: "No te pierdas ning&uacute;n movimiento de precio importante. Establece precios objetivo y recibe notificaciones cuando una acci&oacute;n cruce tu umbral.",
    sectionLabel: "C&oacute;mo funciona:",
    features: [
      {
        title: "Alertas de umbral",
        desc: "Establece objetivos de precio \"por encima\" o \"por debajo\". Recibe notificaciones cuando cualquier acci&oacute;n cruce tu l&iacute;nea."
      },
      {
        title: "Alertas de cambio porcentual",
        desc: "Rastrea cambios porcentuales diarios o desde la compra. Detecta ca&iacute;das o subidas temprano."
      },
      {
        title: "Multi-canal",
        desc: "Alertas por email y push en Bifolio. A&ntilde;ade WhatsApp y alertas de dispositivo en Trefolio."
      },
      {
        title: "Impulsado por cron",
        desc: "Nuestro sistema comprueba precios cada minuto durante el horario de mercado. Nunca necesitas vigilar la pantalla."
      }
    ],
    tierText: "Bifolio: Hasta 10 alertas | Trefolio: Alertas ilimitadas",
    ctaLabel: "Crear tu primera alerta"
  },
  "feature-broker-import": {
    heading: "Importaci&oacute;n de cartera",
    intro: "&iquest;A&ntilde;adiendo acciones manualmente una por una? Hay una forma m&aacute;s r&aacute;pida. trefolio soporta tres m&eacute;todos de importaci&oacute;n para tener tu cartera completa en segundos.",
    sectionLabel: "Elige tu m&eacute;todo:",
    features: [
      {
        title: "Sincronizaci&oacute;n con broker",
        desc: "Conecta tu br&oacute;ker y sincronizamos autom&aacute;ticamente tus posiciones, efectivo y transacciones. Configuraci&oacute;n con un clic, siempre actualizado."
      },
      {
        title: "Subida CSV",
        desc: "Exporta un CSV de tu br&oacute;ker y s&uacute;belo. Soportamos m&aacute;s de 20 formatos incluyendo DEGIRO, Interactive Brokers, Trade Republic y m&aacute;s."
      },
      {
        title: "Importaci&oacute;n IA",
        desc: "Sube cualquier archivo — CSV, PDF o captura — y nuestra IA lo parsear&aacute; a tu cartera. Funciona incluso con formatos inusuales."
      }
    ],
    tierText: "Folio: CSV y Manual | Bifolio: + Broker Sync | Trefolio: + AI Import",
    ctaLabel: "Importar tu cartera"
  },
  "feature-fundamentals": {
    heading: "Fundamentales de empresa",
    intro: "Ve m&aacute;s all&aacute; de los precios. trefolio te da acceso a las finanzas completas de la empresa — los mismos datos que usan los analistas profesionales.",
    sectionLabel: "Qu&eacute; obtienes:",
    features: [
      {
        title: "Estado de resultados",
        desc: "Ingresos, beneficio neto, m&aacute;rgenes y beneficio por acci&oacute;n — trimestral y anual."
      },
      {
        title: "Balance",
        desc: "Activos, pasivos, niveles de deuda y valor contable de un vistazo."
      },
      {
        title: "Flujo de caja",
        desc: "Flujos de caja operativos, de inversi&oacute;n y financieros. Ve si la empresa genera caja real."
      },
      {
        title: "Operaciones de insiders",
        desc: "Ve qu&eacute; compran y venden ejecutivos y directores."
      },
      {
        title: "Tenencia institucional",
        desc: "Rastrea qu&eacute; poseen los grandes fondos — Vanguard, BlackRock, Fidelity y m&aacute;s."
      }
    ],
    tierText: "Exclusivo Trefolio Pro",
    ctaLabel: "Explorar fundamentales"
  },
  "feature-stock-screener": {
    heading: "Filtro de acciones",
    intro: "Descubre acciones que coincidan con tus criterios de inversi&oacute;n. Filtra m&aacute;s de 600 acciones en m&uacute;ltiples dimensiones y aplica estrategias probadas.",
    sectionLabel: "Filtrar por:",
    features: [
      {
        title: "6 dimensiones de filtro",
        desc: "Capitalizaci&oacute;n, ratio P/E, rendimiento por dividendo, sector, pa&iacute;s y bolsa. Combina las que quieras."
      },
      {
        title: "5 estrategias integradas",
        desc: "Inversi&oacute;n en valor, crecimiento de dividendos, momentum, calidad y peque&ntilde;a capitalizaci&oacute;n — presets con un clic."
      },
      {
        title: "Datos ricos",
        desc: "Precio, cambio %, capitalizaci&oacute;n, P/E, rendimiento por dividendo y sector para cada resultado."
      },
      {
        title: "A&ntilde;adir r&aacute;pido",
        desc: "¿Encontraste algo interesante? A&ntilde;&aacute;delo a tu cartera o lista de seguimiento directamente desde los resultados."
      }
    ],
    tierText: "Exclusivo Trefolio Pro",
    ctaLabel: "Abrir el filtro"
  },
  "feature-tax-reports": {
    heading: "Informes fiscales",
    intro: "Los informes fiscales no tienen por qu&eacute; ser dolorosos. trefolio genera informes fiscales por pa&iacute;s e incluye un Asistente Fiscal IA para tus preguntas.",
    sectionLabel: "Qu&eacute; obtienes:",
    features: [
      {
        title: "5 pa&iacute;ses UE",
        desc: "Informes espec&iacute;ficos por pa&iacute;s para Alemania, Francia, Espa&ntilde;a, Pa&iacute;ses Bajos e Italia."
      },
      {
        title: "Ganancias y p&eacute;rdidas",
        desc: "Ganancias de capital, p&eacute;rdidas y per&iacute;odo de tenencia calculados para cada posici&oacute;n."
      },
      {
        title: "Ingresos por dividendos",
        desc: "Dividendos brutos, retenci&oacute;n fiscal e ingresos netos por pa&iacute;s de origen."
      },
      {
        title: "Asistente Fiscal IA",
        desc: "Pregunta cosas como \"¿Cu&aacute;nta retenci&oacute;n pagu&eacute; en dividendos estadounidenses?\" y obt&eacute;n respuestas instant&aacute;neas."
      }
    ],
    tierText: "Exclusivo Trefolio Pro",
    ctaLabel: "Generar tu informe fiscal"
  },
  "feature-portfolio-simulator": {
    heading: "Simulador de cartera",
    intro: "Prueba tus ideas de inversi&oacute;n antes de comprometer dinero real. El simulador te permite hacer backtest, pruebas de estr&eacute;s y explorar escenarios what-if.",
    sectionLabel: "Tres modos:",
    features: [
      {
        title: "Backtest",
        desc: "Ve c&oacute;mo habr&iacute;a funcionado un portafolio hist&oacute;ricamente. Compara con S&P 500, MSCI World o un benchmark personalizado."
      },
      {
        title: "Pruebas de estr&eacute;s",
        desc: "¿Y si el mercado cae un 30%? ¿Y si suben los tipos? Ve c&oacute;mo resiste tu cartera en diferentes escenarios."
      },
      {
        title: "An&aacute;lisis what-if",
        desc: "A&ntilde;ade o quita posiciones, cambia asignaciones y ve al instante el impacto en riesgo y rendimiento."
      }
    ],
    tierText: "Exclusivo Trefolio Pro",
    ctaLabel: "Abrir el simulador"
  },
  "feature-net-worth": {
    heading: "Seguimiento del patrimonio neto",
    intro: "Tus inversiones son solo una parte de tus finanzas. Rastrea todo — inmuebles, ahorros, pensiones y m&aacute;s — en un solo lugar.",
    sectionLabel: "Qu&eacute; puedes rastrear:",
    features: [
      {
        title: "Inmuebles",
        desc: "A&ntilde;ade propiedades con valor actual. Actualiza cuando cambien las condiciones del mercado."
      },
      {
        title: "Cuentas de ahorro",
        desc: "Rastrea efectivo en bancos en diferentes monedas."
      },
      {
        title: "Pensiones y seguros",
        desc: "Incluye fondos de pensiones y p&oacute;lizas de seguro de vida en tu patrimonio neto."
      },
      {
        title: "Patrimonio neto total",
        desc: "Ve todo combinado: acciones + ETFs + cripto + inmuebles + ahorros + pensiones = tu imagen completa."
      }
    ],
    tierText: "Bifolio: Hasta 10 activos | Trefolio: Hasta 999 activos",
    ctaLabel: "A&ntilde;adir activos manuales"
  },
  "feature-crypto": {
    heading: "Cartera cripto",
    intro: "Rastrea cripto junto con tus acciones y ETFs. Obt&eacute;n el mismo nivel de an&aacute;lisis e insights para tus tenencias cripto.",
    sectionLabel: "Qu&eacute; obtienes:",
    features: [
      {
        title: "Panel cripto",
        desc: "Precios, cambios 24h, volumen y capitalizaci&oacute;n de mercado de las principales criptomonedas."
      },
      {
        title: "Seguimiento de cartera",
        desc: "A&ntilde;ade posiciones cripto junto con acciones. Ve el valor y asignaci&oacute;n unificados del portafolio."
      },
      {
        title: "Gr&aacute;ficos e historial",
        desc: "Gr&aacute;ficos de precios con m&uacute;ltiples marcos temporales y superposici&oacute;n de tipos de cambio."
      },
      {
        title: "An&aacute;lisis cripto IA",
        desc: "Pregunta a nuestra IA sobre cualquier cripto — fundamentales, tendencias y an&aacute;lisis de mercado."
      }
    ],
    tierText: "Folio: Visi&oacute;n de mercado | Trefolio: Seguimiento completo y IA",
    ctaLabel: "Explorar cripto"
  }
};
