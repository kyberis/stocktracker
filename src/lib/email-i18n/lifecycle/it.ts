import type { WelcomeNoStocksStrings, WelcomeFreeStocksStrings, BifolioUpgradeStrings, TrefolioUpgradeStrings, TrialInvitationStrings, TrialExpiredStrings } from "../template-types";

export const welcomeNoStocks: WelcomeNoStocksStrings = {
  heading: "Benvenuto su trefolio!",
  paragraph: "Il tuo account &egrave; pronto. trefolio &egrave; la foglia in pi&ugrave; per il tuo portafoglio &mdash; tutto ci&ograve; che ti serve per seguire, capire e far crescere i tuoi investimenti in un solo posto.",
  features: [
    {
      title: "Quotazioni in tempo reale",
      desc: "Prezzi in diretta da Yahoo Finance su oltre 60 borse mondiali. Vedi il valore del tuo portafoglio aggiornarsi durante la giornata."
    },
    {
      title: "Tracciamento dividendi",
      desc: "Rilevamento automatico dei dividendi, proiezioni di reddito annuale, rendimento sul costo e calendario dei pagamenti mensili."
    },
    {
      title: "Analisi con IA",
      desc: "Chiedi alla nostra IA qualsiasi informazione su un titolo &mdash; analisi degli utili, confronti con i concorrenti e valutazioni del rischio. 5 chiamate gratuite/mese."
    },
    {
      title: "Import facile",
      desc: "Importa il tuo portafoglio da oltre 20 broker tramite caricamento CSV, Broker Sync con un clic o import assistito da IA."
    },
    {
      title: "Alert sui prezzi",
      desc: "Ricevi notifiche quando le azioni raggiungono il prezzo target. Alert email e push disponibili su Bifolio."
    },
    {
      title: "Metriche avanzate",
      desc: "Rapporto di Sharpe, drawdown massimo, volatilit&agrave; e storico completo delle performance per misurare la tua strategia."
    },
    {
      title: "Fondamentali &amp; intelligenza",
      desc: "Dati finanziari aziendali, operazioni insider, partecipazioni istituzionali e sentiment delle notizie &mdash; tutto in una vista."
    },
    {
      title: "Screener azionario",
      desc: "Filtra oltre 600 azioni con 6 filtri e 5 strategie integrate per scoprire nuove opportunit&agrave;."
    }
  ],
  ctaPrimary: "Aggiungi la tua prima azione",
  ctaSecondary: "Esplora la dashboard",
  tipText: "&#x1F4A1; <strong>Iniziare &egrave; facile:</strong> Aggiungi solo un&rsquo;azione per vedere la tua dashboard animarsi con dati in tempo reale, grafici e insight IA."
};

export const welcomeFreeStocks: WelcomeFreeStocksStrings = {
  heading: "Hai fatto un ottimo inizio!",
  intro: "Hai aggiunto le tue prime azioni &mdash; la dashboard del tuo portafoglio sta ora seguendo i tuoi investimenti in tempo reale. Ecco cosa pu&ograve; fare trefolio per te:",
  features: [
    {
      title: "Dashboard in tempo reale",
      desc: "Valore del portafoglio, variazioni giornaliere, ripartizione dell&rsquo;allocazione e grafici delle performance &mdash; tutto si aggiorna in diretta."
    },
    {
      title: "Insight sui dividendi",
      desc: "Proiezioni di reddito annuale, tracciamento del rendimento e calendario mensile dei dividendi per le tue posizioni."
    },
    {
      title: "Analisi azionaria con IA",
      desc: "Chiedi alla nostra IA qualsiasi cosa sulle tue azioni. Ottieni analisi degli utili, valutazioni del rischio e insight competitivi."
    },
    {
      title: "Alert sui prezzi",
      desc: "Non perdere mai un movimento di prezzo. Imposta alert e ricevi notifiche via email o push."
    },
    {
      title: "Metriche di performance",
      desc: "Rapporto di Sharpe, drawdown massimo, TTWROR e storico completo della crescita del portafoglio su qualsiasi periodo."
    },
    {
      title: "Fondamentali aziendali",
      desc: "Conti economici, bilanci, flussi di cassa, operazioni insider e partecipazioni istituzionali."
    },
    {
      title: "Screener &amp; simulatore azionario",
      desc: "Filtra oltre 600 azioni e fai backtest delle strategie di portafoglio con il nostro simulatore what-if."
    }
  ],
  voucherTitle: "Offerta esclusiva",
  voucherDiscountDisplay: "75% DI SCONTO",
  voucherApply: "Usa il codice al checkout:",
  voucherValid: "Valido su Bifolio e Trefolio &mdash; mensile o annuale",
  ctaPrimary: "Aggiorna ora &mdash; 75% di sconto",
  ctaSecondary: "Continua con Folio",
  tipText: "&#x1F4A1; <strong>Il tuo piano Folio</strong> include fino a 15 posizioni, 1 portafoglio e 5 chiamate IA/mese. Aggiorna per sbloccare di pi&ugrave;."
};

export const bifolioUpgrade: BifolioUpgradeStrings = {
  heading: "Benvenuto su Bifolio!",
  paragraph: "Il tuo upgrade &egrave; attivo. Ecco tutto ci&ograve; che hai appena sbloccato:",
  features: [
    {
      title: "Condivisione portfolio",
      desc: "Genera un link pubblico per condividere le performance del tuo portafoglio con chiunque &mdash; amici, famiglia o la tua community."
    },
    {
      title: "Export CSV",
      desc: "Scarica le tue posizioni e transazioni come file CSV per la tua analisi o per i documenti fiscali."
    },
    {
      title: "Alert e-mail &amp; push",
      desc: "Configura fino a 10 alert sui prezzi. Ricevi notifiche istantanee via e-mail o push del browser quando le azioni raggiungono i tuoi obiettivi."
    },
    {
      title: "Metriche avanzate",
      desc: "Rapporto di Sharpe, drawdown massimo e volatilit&agrave; &mdash; le metriche su cui si affidano gli investitori seri."
    },
    {
      title: "Storico completo di crescita",
      desc: "Vedi le performance complete del tuo portafoglio su qualsiasi periodo con grafici dettagliati."
    },
    {
      title: "Tracking del patrimonio netto",
      desc: "Traccia immobili, conti di risparmio, pensioni &mdash; fino a 10 asset manuali per un quadro finanziario completo."
    },
    {
      title: "Broker Sync",
      desc: "Collega la tua brokerage per la sincronizzazione automatica con un clic di posizioni, liquidit&agrave; e transazioni."
    },
    {
      title: "20 chiamate IA/mese",
      desc: "4x pi&ugrave; chiamate di analisi IA per capire le tue posizioni, confrontare azioni e ottenere revisioni del portafoglio."
    },
    {
      title: "Agente di supporto IA",
      desc: "Ottieni aiuto istantaneo dalla nostra chat di supporto con IA &mdash; disponibile 24/7."
    }
  ],
  ctaPrimary: "Configura il tuo primo alert",
  ctaSecondary: "Condividi il tuo portafoglio",
  upsellText: "<strong>Vuoi ancora di pi&ugrave;?</strong> Trefolio sblocca i fondamentali aziendali, lo screener azionario, i report fiscali, gli alert WhatsApp e le posizioni illimitate. <a href=\"{{base_url}}/profile?utm_source=email&utm_medium=lifecycle&utm_campaign=bifolio_upgrade\" style=\"color:#b45309;text-decoration:underline;font-weight:600;\">Scopri di pi&ugrave;</a>"
};

export const trefolioUpgrade: TrefolioUpgradeStrings = {
  heading: "Benvenuto su Trefolio Pro!",
  paragraph: "Ora hai accesso completo a tutte le funzionalit&agrave; di trefolio. Ecco il tuo toolkit completo:",
  groups: [
    {
      label: "Data & Analysis",
      items: [
        "Alpha Vantage premium data",
        "Company fundamentals: income, balance sheet, cash flow",
        "Economic indicators dashboard"
      ]
    },
    {
      label: "Intelligence",
      items: [
        "News feed with sentiment analysis",
        "Insider trades & institutional holdings",
        "AI analysis: 30 calls/day, unlimited monthly"
      ]
    },
    {
      label: "Advanced Tools",
      items: [
        "Sharpe ratio, max drawdown, volatility metrics",
        "Full portfolio performance history",
        "Stock screener: 600+ stocks, 6 filters, 5 strategies"
      ]
    },
    {
      label: "Crypto Pro",
      items: [
        "Crypto charts, exchange rates, AI analysis",
        "Dedicated crypto portfolio tab"
      ]
    },
    {
      label: "Tax & Planning",
      items: [
        "EU tax reports (DE, FR, ES, NL, IT) with AI Tax Assistant",
        "Portfolio simulator: backtest, what-if, stress testing",
        "Financial planning: FIRE, retirement projections"
      ]
    },
    {
      label: "Alerts & Limits",
      items: [
        "WhatsApp & device notifications",
        "Unlimited price alerts & holdings",
        "Up to 5 portfolios",
        "999 manual assets for full net worth tracking"
      ]
    }
  ],
  ctaPrimary: "Esplora le analisi IA",
  ctaSecondary: "Visualizza i fondamentali",
  communityText: "&#x1F31F; <strong>Sei uno dei nostri primi 500 membri Pro.</strong> Grazie per aver creduto in trefolio. Il tuo feedback plasma ci&ograve; che costruiamo in futuro."
};

export const trialInvitation: TrialInvitationStrings = {
  heading: "La tua prova Pro ti aspetta",
  paragraph: "Ciao {{display_name}}, stai costruendo il tuo portafoglio su trefolio &mdash; ora prova il toolkit completo per 7 giorni, completamente gratuito.",
  groups: [
    {
      label: "Dati &amp; analisi",
      items: [
        "Dati premium Alpha Vantage",
        "Fondamentali: conto economico, stato patrimoniale, flusso di cassa",
        "Dashboard degli indicatori economici"
      ]
    },
    {
      label: "Intelligence",
      items: [
        "Feed notizie con analisi del sentiment",
        "Operazioni insider &amp; partecipazioni istituzionali",
        "Analisi IA: 30 chiamate/giorno, illimitate al mese"
      ]
    },
    {
      label: "Strumenti avanzati",
      items: [
        "Rapporto di Sharpe, drawdown massimo, volatilit&agrave;",
        "Storico completo delle performance del portafoglio",
        "Screener azionario: oltre 600 titoli, 6 filtri"
      ]
    },
    {
      label: "Avvisi &amp; limiti",
      items: [
        "Notifiche WhatsApp e sul dispositivo",
        "Alert sui prezzi e posizioni illimitati",
        "Fino a 5 portafogli"
      ]
    }
  ],
  ctaPrimary: "Attiva la prova gratuita",
  ctaSecondary: "Scopri cosa &egrave; incluso",
  disclaimer: "Nessuna carta di credito richiesta. Dopo 7 giorni il tuo account torna al piano Gratuito &mdash; nessuna sorpresa.",
  signoffIntro: "Ho creato trefolio perch&eacute; volevo un modo migliore per seguire il mio portafoglio. Spero che apprezzerai l&rsquo;esperienza completa.",
  signoffReply: "Fammi sapere cosa ne pensi &mdash; rispondi a questa email."
};

export const trialExpired: TrialExpiredStrings = {
  heading: "La tua prova Pro &egrave; terminata",
  paragraph: "Ciao {{display_name}}, la tua prova Trefolio Pro di 7 giorni &egrave; finita. Ecco cosa perderai:",
  features: [
    {
      title: "Analisi avanzate",
      desc: "Rapporto di Sharpe, drawdown massimo, volatilit&agrave; e storico completo di crescita"
    },
    {
      title: "Analisi IA",
      desc: "30 chiamate/giorno con insight approfonditi sulle azioni e revisioni del portafoglio"
    },
    {
      title: "Fondamentali aziendali",
      desc: "Conti economici, bilanci, operazioni insider e partecipazioni istituzionali"
    },
    {
      title: "Alert premium",
      desc: "Notifiche WhatsApp, alert illimitati e fino a 5 portafogli"
    }
  ],
  pricingNote: "I piani partono da &euro;4,99/mese. Disdici in qualsiasi momento.",
  ctaPrimary: "Abbonati a Trefolio Pro",
  ctaSecondary: "Vedi i prezzi",
  signoffIntro: "Spero che la prova ti abbia dato un assaggio reale di cosa pu&ograve; fare trefolio. Se hai feedback, mi farebbe davvero piacere leggerlo.",
  growthTitle: "Il tuo portafoglio &egrave; cresciuto del {{growth_pct}}% durante la prova",
  growthDesc: "Con Pro, potresti continuare a monitorare metriche di performance dettagliate e ottenere analisi IA sulle tue prossime mosse.",
  growthTitleDown: "I mercati si sono mossi &mdash; il tuo portafoglio ha registrato un {{growth_pct}}% durante la prova",
  growthDescDown: "Con Pro, avresti avvisi IA e analisi pi&ugrave; approfondite per reagire pi&ugrave; velocemente ai movimenti del mercato.",
};
