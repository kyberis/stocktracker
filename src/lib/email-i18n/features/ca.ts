import type { FeatureTemplateStrings, TemplateFooterStrings } from "../template-types";

export const footer: TemplateFooterStrings = {
  receivedText: "Has rebut aquest correu de trefolio.",
  unsubscribeLabel: "Cancel&middot;lar subscripci&oacute;"
};

export const features: Record<string, FeatureTemplateStrings> = {
  "feature-real-time-quotes": {
    heading: "Cotitzacions en temps real",
    intro: "El teu tauler de cartera actualitza els preus en directe durant tot el dia de negociaci&oacute; — sense necessitat d'actualitzar manualment.",
    sectionLabel: "Qu&egrave; obtens:",
    features: [
      {
        title: "60+ borses",
        desc: "Preus de NYSE, NASDAQ, Euronext, Londres, Frankfurt i m&eacute;s — powered by Yahoo Finance."
      },
      {
        title: "Actualitzaci&oacute; autom&agrave;tica",
        desc: "Les cotitzacions s'actualitzen cada 15 segons (configurable a 30s o 60s a la configuraci&oacute;)."
      },
      {
        title: "Multi-moneda",
        desc: "Veure els valors en la teva moneda local. Suportem 21 monedes amb conversi&oacute; autom&agrave;tica."
      }
    ],
    tierText: "Disponible en tots els plans",
    ctaLabel: "Obrir el tauler"
  },
  "feature-dividend-tracking": {
    heading: "Seguiment de dividends",
    intro: "trefolio detecta autom&agrave;ticament els dividends de les teves posicions i construeix una imatge completa dels ingressos.",
    sectionLabel: "Qu&egrave; obtens:",
    features: [
      {
        title: "Calendari de dividends",
        desc: "Veure els pagaments properes mes a mes. Sap exactament quan els dividends arriben al teu compte."
      },
      {
        title: "Ingressos anuals",
        desc: "Ingressos totals projectats de dividends a tot el portafoli amb desglossament per acci&oacute;."
      },
      {
        title: "Rendiment sobre cost",
        desc: "Segueix el teu rendiment real basat en el preu de compra — no nom&eacute;s la taxa actual de dividends."
      },
      {
        title: "Simulaci&oacute; DRIP",
        desc: "Veure com reinvertir dividends podria fer créixer els teus rendiments en 5, 10 o 20 anys."
      }
    ],
    tierText: "Disponible en tots els plans",
    ctaLabel: "Veure els teus dividends"
  },
  "feature-ai-analysis": {
    heading: "An&agrave;lisi d'accions amb IA",
    intro: "Pregunta a la nostra IA sobre qualsevol acci&oacute; del teu portafoli o qualsevol ticker que estiguis considerant. Obt&eacute;n an&agrave;lisi de qualitat institucional en segons.",
    sectionLabel: "Qu&egrave; pots preguntar:",
    features: [
      {
        title: "An&agrave;lisi de resultats",
        desc: "\"Com van ser els &uacute;ltims resultats d'AAPL?\" — resum de resultats, orientaci&oacute; i reacci&oacute; del mercat."
      },
      {
        title: "Avaluaci&oacute; de risc",
        desc: "\"Quins s&oacute;n els riscos de tenir TSLA?\" — amenaces competitives, valoraci&oacute; i factors macro."
      },
      {
        title: "Comparaci&oacute; de competidors",
        desc: "\"Compara MSFT vs GOOG\" — an&agrave;lisi costat a costat de finances, creixement i valoraci&oacute;."
      },
      {
        title: "Revisi&oacute; de portafoli",
        desc: "\"Revisa el meu portafoli\" — la IA analitza l'allocaci&oacute;, el risc i suggereix millores."
      }
    ],
    tierText: "Folio: 5 trucades/mes | Bifolio: 20/mes | Trefolio: Il&middot;limitat",
    ctaLabel: "Prova l'an&agrave;lisi IA ara"
  },
  "feature-price-alerts": {
    heading: "Alertes de preu",
    intro: "No et perdis mai un moviment de preu important. Estableix preus objectiu i rep notificacions quan una acció creua el teu llindar.",
    sectionLabel: "Com funciona:",
    features: [
      {
        title: "Alertes de llindar",
        desc: "Estableix objectius de preu \"per sobre\" o \"per sota\". Rep notificacions quan una acció creua la teva línia."
      },
      {
        title: "Alertes de canvi %",
        desc: "Segueix canvis percentuals diaris o des de la compra. Atrapa caigudes o pujades aviat."
      },
      {
        title: "Multi-canal",
        desc: "Alertes per email i push al Bifolio. Afegeix WhatsApp i alertes de dispositiu al Trefolio."
      },
      {
        title: "Impulsat per cron",
        desc: "El nostre sistema comprova els preus cada minut durant les hores de mercat. Mai cal que miris la pantalla."
      }
    ],
    tierText: "Bifolio: Fins a 10 alertes | Trefolio: Alertes il·limitades",
    ctaLabel: "Crea la teva primera alerta"
  },
  "feature-broker-import": {
    heading: "Import de cartera",
    intro: "Afegint accions manualment una per una? Hi ha una manera m&eacute;s r&agrave;pida. trefolio suporta tres m&eacute;todes d'import per obtenir la cartera completa en segons.",
    sectionLabel: "Tria el teu m&eacute;tod:",
    features: [
      {
        title: "Sincronitzaci&oacute; amb broker",
        desc: "Connecta el teu broker i sincronitzem autom&agrave;ticament posicions, efectiu i transaccions. Configuraci&oacute; amb un clic, sempre actualitzat."
      },
      {
        title: "Pujada CSV",
        desc: "Exporta un CSV del teu broker i puja'l. Suportem 20+ formats incloent DEGIRO, Interactive Brokers, Trade Republic i m&eacute;s."
      },
      {
        title: "Import IA",
        desc: "Puja qualsevol fitxer — CSV, PDF o captura — i la nostra IA el transformar&agrave; en cartera. Funciona fins i tot amb formats inusual."
      }
    ],
    tierText: "Folio: CSV i Manual | Bifolio: + Broker Sync | Trefolio: + AI Import",
    ctaLabel: "Importar la teva cartera"
  },
  "feature-fundamentals": {
    heading: "Fonamentals d'empresa",
    intro: "Aneu m&eacute;s enll&agrave; dels preus. trefolio us d&oacute;na acc&eacute;s a les finances completes de l'empresa — les mateixes dades que fan servir els analistes professionals.",
    sectionLabel: "Qu&egrave; obtens:",
    features: [
      {
        title: "Compte de resultats",
        desc: "Ingressos, benefici net, m&agrave;rgens i benefici per acci&oacute; — trimestral i anual."
      },
      {
        title: "Balan&ccedil;",
        desc: "Actius, passius, nivells de deute i valor comptable d'un cop d'ull."
      },
      {
        title: "Flux de caixa",
        desc: "Fluxos operatius, d'inversi&oacute; i financers. Veieu si l'empresa genera caixa real."
      },
      {
        title: "Operacions d'insiders",
        desc: "Veieu qu&egrave; compren i venen els executius i directors."
      },
      {
        title: "Participacions institucionals",
        desc: "Segueix qu&egrave; posseeixen els grans fons — Vanguard, BlackRock, Fidelity i m&eacute;s."
      }
    ],
    tierText: "Exclusiu Trefolio Pro",
    ctaLabel: "Explorar els fonamentals"
  },
  "feature-stock-screener": {
    heading: "Filtre d'accions",
    intro: "Descobriu accions que coincideixen amb els vostres criteris d'inversi&oacute;. Filtreu 600+ accions en m&uacute;ltiples dimensions i apliqueu estrat&egrave;gies provades.",
    sectionLabel: "Filtrar per:",
    features: [
      {
        title: "6 dimensions de filtre",
        desc: "Capitalitzaci&oacute; de mercat, r&agrave;tio P/E, rendiment de dividends, sector, pa&iacute;s i borsa. Combineu tantes com vulgueu."
      },
      {
        title: "5 estrat&egrave;gies integrades",
        desc: "Inversi&oacute; en valor, creixement de dividends, momentum, qualitat i small-cap — predefinits amb un clic."
      },
      {
        title: "Dades riques",
        desc: "Preu, canvi %, capitalitzaci&oacute;, P/E, rendiment de dividends i sector per a cada resultat."
      },
      {
        title: "Afegir r&agrave;pid",
        desc: "Heu trobat alguna cosa interessant? Afegiu-la al portafoli o llista de seguiment directament des dels resultats."
      }
    ],
    tierText: "Exclusiu Trefolio Pro",
    ctaLabel: "Obrir el filtre"
  },
  "feature-tax-reports": {
    heading: "Informes fiscals",
    intro: "Les declaracions fiscals no han de ser doloroses. trefolio genera informes fiscals espec&iacute;fics per pa&iacute;s i inclou un Assistents Fiscal IA per a les teves preguntes.",
    sectionLabel: "Qu&egrave; obtens:",
    features: [
      {
        title: "5 pa&iacute;sos UE",
        desc: "Informes espec&iacute;fics per pa&iacute;s per a Alemanya, França, Espanya, Pa&iacute;sos Baixos i It&agrave;lia."
      },
      {
        title: "Guanys i p&egrave;rdues",
        desc: "Guanys de capital calculats, p&egrave;rdues i per&iacute;ode de tenen&ccedil;a per a cada posici&oacute;."
      },
      {
        title: "Ingressos per dividends",
        desc: "Dividends bruts, retenci&oacute; a la font i ingressos nets per pa&iacute;s d'origen."
      },
      {
        title: "Assistent Fiscal IA",
        desc: "Feu preguntes com \"Quant he pagat de retenci&oacute; en dividends americans?\" i obteniu respostes instant&agrave;nies."
      }
    ],
    tierText: "Exclusiu Trefolio Pro",
    ctaLabel: "Generar el teu informe fiscal"
  },
  "feature-portfolio-simulator": {
    heading: "Simulador de cartera",
    intro: "Prova les teves idees d'inversi&oacute; abans de comprometre diners reals. El simulador et permet fer backtest, proves d'estr&eacute;s i explorar escenaris what-if.",
    sectionLabel: "Tres modes:",
    features: [
      {
        title: "Backtest",
        desc: "Veure com una cartera hauria funcionat hist&ograve;ricament. Comparar amb S&P 500, MSCI World o un benchmark personalitzat."
      },
      {
        title: "Proves d'estr&eacute;s",
        desc: "I si el mercat cau un 30%? I si pugen els tipus? Veure com la teva cartera resisteix en diferents escenaris."
      },
      {
        title: "An&agrave;lisi what-if",
        desc: "Afegeix o treu posicions, canvia les allocacions i veu a l'instant l'impacte en risc i rendiment."
      }
    ],
    tierText: "Exclusiu Trefolio Pro",
    ctaLabel: "Obrir el simulador"
  },
  "feature-net-worth": {
    heading: "Seguiment del patrimoni net",
    intro: "Les teves inversions són només una part de les teves finances. Segueix tot — immobles, estalvis, pensions i més — en un sol lloc.",
    sectionLabel: "Què pots seguir:",
    features: [
      {
        title: "Immobles",
        desc: "Afegeix propietats amb valor actual. Actualitza quan les condicions del mercat canviïn."
      },
      {
        title: "Comptes d'estalvi",
        desc: "Segueix efectiu en bancs en diferents monedes."
      },
      {
        title: "Pensions i assegurances",
        desc: "Inclou fons de pensions i pòlisses d'assegurança de vida al teu patrimoni net."
      },
      {
        title: "Patrimoni net total",
        desc: "Veure tot combinat: accions + ETFs + cripto + immobles + estalvis + pensions = la teva imatge completa."
      }
    ],
    tierText: "Bifolio: Fins a 10 actius | Trefolio: Fins a 999 actius",
    ctaLabel: "Afegir actius manuals"
  },
  "feature-crypto": {
    heading: "Portafoli cripto",
    intro: "Segueix cripto juntament amb les teves accions i ETFs. Obt&eacute;n el mateix nivell d'an&agrave;lisi i insights per a les teves posicions cripto.",
    sectionLabel: "Qu&egrave; obtens:",
    features: [
      {
        title: "Tauler cripto",
        desc: "Preus, canvis 24h, volum i capitalitzaci&oacute; de mercat de les principals criptomonedes."
      },
      {
        title: "Seguiment de cartera",
        desc: "Afegeix posicions cripto juntament amb accions. Veure valor i allocaci&oacute; unificats del portafoli."
      },
      {
        title: "Gr&agrave;fics i historial",
        desc: "Gr&agrave;fics de preus amb m&uacute;ltiples marcs temporals i superposici&oacute; de tipus de canvi."
      },
      {
        title: "An&agrave;lisi cripto IA",
        desc: "Pregunta a la nostra IA sobre qualsevol cripto — fonamentals, tend&egrave;ncies i an&agrave;lisi de mercat."
      }
    ],
    tierText: "Folio: Visi&oacute; de mercat | Trefolio: Seguiment complet i IA",
    ctaLabel: "Explorar cripto"
  }
};
