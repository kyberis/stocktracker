import type {
  WelcomeNoStocksStrings,
  WelcomeFreeStocksStrings,
  BifolioUpgradeStrings,
  TrefolioUpgradeStrings,
  TrialInvitationStrings,
  TrialExpiredStrings,
} from "../template-types";

export const welcomeNoStocks: WelcomeNoStocksStrings = {
  heading: "Welkom bij trefolio!",
  paragraph: "Je account is klaar. trefolio is het extra blaadje voor je portefeuille &mdash; alles wat je nodig hebt om je beleggingen te volgen, begrijpen en laten groeien op &eacute;&eacute;n plek.",
  features: [
    {
      title: "Realtime koersen",
      desc: "Live prijzen van Yahoo Finance op meer dan 60 wereldwijde beurzen. Zie je portefeuillewaarde gedurende de dag updaten."
    },
    {
      title: "Dividendtracking",
      desc: "Automatische dividenddetectie, jaarlijkse inkomensprojecties, rendement op kosten en maandelijks betalingskalender."
    },
    {
      title: "AI-analyse",
      desc: "Vraag onze AI alles over een aandeel &mdash; krijg resultatenanalyses, concurrentievergelijkingen en risicobeoordelingen. 5 gratis gesprekken/maand."
    },
    {
      title: "Eenvoudige import",
      desc: "Breng je portefeuille van meer dan 20 brokers via CSV-upload, een-klik Broker Sync of AI-ondersteunde import."
    },
    {
      title: "Prijsmeldingen",
      desc: "Word op de hoogte gesteld wanneer aandelen je streefprijs bereiken. E-mail- en pushmeldingen beschikbaar."
    },
    {
      title: "Geavanceerde metrics",
      desc: "Sharpe-ratio, maximale drawdown, volatiliteit en volledige prestatiesgeschiedenis om je strategie te meten."
    },
    {
      title: "Fundamentals &amp; intelligentie",
      desc: "Bedrijfsfinanci&euml;n, insidertransacties, institutionele participaties en nieuwssentiment &mdash; alles in &eacute;&eacute;n overzicht."
    },
    {
      title: "Aandelenfilter",
      desc: "Filter meer dan 600 aandelen met 6 filters en 5 ingebouwde strategie&euml;n om nieuwe kansen te ontdekken."
    }
  ],
  ctaPrimary: "Voeg je eerste aandeel toe",
  ctaSecondary: "Dashboard verkennen",
  tipText: "&#x1F4A1; <strong>Beginnen is eenvoudig:</strong> Voeg slechts &eacute;&eacute;n aandeel toe om je dashboard tot leven te zien komen met realtime data, grafieken en AI-inzichten."
};

export const welcomeFreeStocks: WelcomeFreeStocksStrings = {
  heading: "Je bent goed begonnen!",
  intro: "Je hebt je eerste aandelen toegevoegd &mdash; je portefeuille-dashboard volgt nu je beleggingen in realtime. Dit is wat trefolio voor je kan doen:",
  features: [
    {
      title: "Realtime dashboard",
      desc: "Portefeuillewaarde, dagelijkse wijzigingen, allocatie-opbouw en prestatiediagrammen &mdash; alles wordt live bijgewerkt."
    },
    {
      title: "Dividendinzichten",
      desc: "Jaarlijkse inkomensprojecties, rendementsopvolging en maandelijks dividendkalender voor je posities."
    },
    {
      title: "AI-aandelenanalyse",
      desc: "Vraag onze AI alles over je aandelen. Krijg resultatenanalyses, risicobeoordelingen en concurrentie-inzichten."
    },
    {
      title: "Prijsmeldingen",
      desc: "Mis geen prijsbeweging. Stel meldingen in en word op de hoogte gesteld per e-mail of push."
    },
    {
      title: "Prestatiemetrics",
      desc: "Sharpe-ratio, maximale drawdown, TTWROR en volledige portefeuillegroeihistorie over elke periode."
    },
    {
      title: "Bedrijfsfundamentals",
      desc: "Resultatenrekeningen, balansen, cashflow, insidertransacties en institutionele participaties."
    },
    {
      title: "Aandelenfilter &amp; simulator",
      desc: "Filter meer dan 600 aandelen en backtest portefeuillestrategie&euml;n met onze what-if simulator."
    }
  ],
  voucherTitle: "Exclusief aanbod",
  voucherDiscountDisplay: "75% KORTING",
  voucherApply: "Gebruik code bij checkout:",
  voucherValid: "maandelijks of jaarlijks",
  ctaPrimary: "Nu upgraden &mdash; 75% korting",
  ctaSecondary: "Dashboard verkennen",
  tipText: "&#x1F4A1; <strong>Beginnen is eenvoudig:</strong> Voeg slechts &eacute;&eacute;n aandeel toe om je dashboard tot leven te zien komen met realtime data, grafieken en AI-inzichten."
};

export const bifolioUpgrade: BifolioUpgradeStrings = {
  heading: "Welkom bij trefolio!",
  paragraph: "Je upgrade is actief. Dit is alles wat je net hebt ontgrendeld:",
  features: [
    {
      title: "Portefeuille delen",
      desc: "Genereer een openbare link om je portefeuilleprestaties met iedereen te delen &mdash; vrienden, familie of je community."
    },
    {
      title: "CSV-export",
      desc: "Download je posities en transacties als CSV-bestanden voor je eigen analyse of belastingdocumenten."
    },
    {
      title: "E-mail- &amp; pushmeldingen",
      desc: "Stel tot 10 prijsalarmen in. Word direct op de hoogte gesteld via e-mail of browser-push wanneer aandelen je doelen bereiken."
    },
    {
      title: "Geavanceerde metrics",
      desc: "Sharpe-ratio, maximale drawdown en volatiliteit &mdash; de metrics waar serieuze beleggers op vertrouwen."
    },
    {
      title: "Volledige groeigeschiedenis",
      desc: "Bekijk je complete portefeuilleprestaties over elke periode met gedetailleerde grafieken."
    },
    {
      title: "Nettovermogen-tracking",
      desc: "Volg onroerend goed, spaarrekeningen, pensioenen &mdash; tot 10 handmatige activa voor een compleet financieel beeld."
    },
    {
      title: "Broker Sync",
      desc: "Verbind je broker voor een-klick autosync van posities, contant en transacties."
    },
    {
      title: "20 AI-gesprekken/maand",
      desc: "4x meer AI-analysegesprekken om je posities te begrijpen, aandelen te vergelijken en portefeuillereviews te krijgen."
    },
    {
      title: "AI-ondersteuningsagent",
      desc: "Krijg directe hulp van onze AI-ondersteunde supportchat &mdash; 24/7 beschikbaar."
    }
  ],
  ctaPrimary: "Eerste alarm instellen",
  ctaSecondary: "Portefeuille delen",
  upsellText: "<strong>Nog meer willen?</strong> trefolio ontgrendelt bedrijfsfundamentals, aandelenfilter, belastingrapporten, WhatsApp-meldingen en onbeperkte posities. <a href=\"{{base_url}}/profile?utm_source=email&utm_medium=lifecycle&utm_campaign=bifolio_upgrade\" style=\"color:#b45309;text-decoration:underline;font-weight:600;\">Meer informatie</a>"
};

export const trefolioUpgrade: TrefolioUpgradeStrings = {
  heading: "Welkom bij trefolio!",
  paragraph: "Je hebt nu volledige toegang tot alle functies van trefolio. Hier is je complete toolkit:",
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
  ctaPrimary: "AI-inzichten verkennen",
  ctaSecondary: "Fundamentals bekijken",
  communityText: "&#x1F31F; <strong>Je bent een van onze eerste 500 Pro-leden.</strong> Bedankt dat je in trefolio gelooft. Je feedback vormt wat we hierna bouwen."
};

export const trialInvitation: TrialInvitationStrings = {
  heading: "Je Pro-proefperiode wacht op je",
  paragraph:
    "Hoi {{display_name}}, je bouwt je portefeuille al op met trefolio &mdash; ervaar nu 7 dagen lang de volledige toolkit, helemaal gratis.",
  groups: [
    {
      label: "Data &amp; analyse",
      items: [
        "Alpha Vantage premiumdata",
        "Fundamentals: resultatenrekening, balans, kasstroom",
        "Dashboard economische indicatoren",
      ],
    },
    {
      label: "Intelligentie",
      items: [
        "Nieuwsfeed met sentimentanalyse",
        "Insidertransacties &amp; institutionele posities",
        "AI-analyse: 30 gesprekken/dag, onbeperkt per maand",
      ],
    },
    {
      label: "Geavanceerde tools",
      items: [
        "Sharpe-ratio, maximale drawdown, volatiliteit",
        "Volledige portefeuilleprestatiegeschiedenis",
        "Aandelenfilter: 600+ aandelen, 6 filters",
      ],
    },
    {
      label: "Meldingen &amp; limieten",
      items: [
        "WhatsApp- &amp; apparaatmeldingen",
        "Onbeperkte prijs- &amp; positiemeldingen",
        "Tot 5 portefeuilles",
      ],
    },
  ],
  ctaPrimary: "Activeer je gratis proefperiode",
  ctaSecondary: "Bekijk wat erin zit",
  disclaimer:
    "Geen creditcard nodig. Na 7 dagen gaat je account terug naar het Free-plan &mdash; geen verrassingen.",
  signoffIntro:
    "Ik bouwde trefolio omdat ik een betere manier wilde om mijn eigen portefeuille te volgen. Ik hoop dat je van de volledige ervaring geniet.",
  signoffReply: "Laat me weten wat je ervan vindt &mdash; antwoord gewoon op deze e-mail.",
};

export const trialExpired: TrialExpiredStrings = {
  heading: "Je Pro-proefperiode is voorbij",
  paragraph:
    "Hoi {{display_name}}, je 7-daagse trefolio-proefperiode is afgelopen. Dit mis je:",
  features: [
    {
      title: "Geavanceerde analytics",
      desc: "Sharpe-ratio, maximale drawdown, volatiliteit en volledige groeigeschiedenis",
    },
    {
      title: "AI-analyse",
      desc: "30 gesprekken/dag met diepgaande aandeelinsights en portefeuillereviews",
    },
    {
      title: "Bedrijfsfundamentals",
      desc: "Resultatenrekeningen, balansen, insidertransacties en institutionele posities",
    },
    {
      title: "Premiummeldingen",
      desc: "WhatsApp-meldingen, onbeperkte meldingen en tot 5 portefeuilles",
    },
  ],
  pricingNote: "Abonnementen vanaf &euro;4,99 per maand. Altijd opzegbaar.",
  ctaPrimary: "Abonneer",
  ctaSecondary: "Bekijk prijzen",
  signoffIntro:
    "Ik hoop dat de proefperiode je een echte indruk gaf van wat trefolio kan. Als je feedback hebt, hoor ik het graag.",
  growthTitle: "Uw portefeuille groeide {{growth_pct}}% tijdens de proefperiode",
  growthDesc: "Met Pro kunt u gedetailleerde prestatiemetrieken blijven volgen en AI-inzichten krijgen over uw volgende stappen.",
  growthTitleDown: "Markten verschoven &mdash; uw portefeuille bewoog {{growth_pct}}% tijdens de proefperiode",
  growthDescDown: "Met Pro zou u AI-waarschuwingen en diepere analyses hebben om sneller te reageren op marktbewegingen.",
};
