import type {
  WelcomeNoStocksStrings,
  WelcomeFreeStocksStrings,
  BifolioUpgradeStrings,
  TrefolioUpgradeStrings,
  TrialInvitationStrings,
  TrialExpiredStrings,
} from "../template-types";

export const welcomeNoStocks: WelcomeNoStocksStrings = {
  heading: "Velkommen til trefolio!",
  paragraph: "Din konto er klar. trefolio er det ekstra blad til din portef&#248;lje &mdash; alt hvad du beh&#248;ver for at spore, forst&#229; og vokse dine investeringer p&#229; &#233;t sted.",
  features: [
    {
      title: "Realtidskurser",
      desc: "Livepriser fra Yahoo Finance p&#229; mere end 60 globale b&#248;rser. Se din portef&#248;ljv&#230;rdi opdatere i l&#248;bet af dagen."
    },
    {
      title: "Udbyttesporing",
      desc: "Automatisk udbyttedetektering, &#229;rlige indt&#230;gtsprognoser, afkast p&#229; omkostninger og m&#229;nedlig betalingskalender."
    },
    {
      title: "AI-drevet analyse",
      desc: "Sp&#248;rg vores AI om enhver aktie &mdash; f&#229; resultatanalyse, konkurrentsammenligninger og risikovurderinger. 5 gratis opkald/m&#229;ned."
    },
    {
      title: "Nem import",
      desc: "Bring din portef&#248;lje fra mere end 20 m&#230;glere via CSV-upload, Broker Sync med et klik eller AI-assisteret import."
    },
    {
      title: "Prisadvarsler",
      desc: "Bliv underrettet n&#229;r aktier n&#229;r din m&#229;lpris. E-mail- og pushadvarsler tilg&#230;ngelige p&#229; Bifolio."
    },
    {
      title: "Avancerede m&#229;linger",
      desc: "Sharpe-forhold, maksimal drawdown, volatilitet og fuld pr&#230;stationshistorik til at m&#229;le din strategi."
    },
    {
      title: "Fundamentale &amp; intelligens",
      desc: "Virksomhedsfinansiering, insiderhandler, institutionelle beholdninger og nyhedssentiment &mdash; alt i &#233;t overblik."
    },
    {
      title: "Aktiescreener",
      desc: "Filtrer 600+ aktier med 6 filtre og 5 indbyggede strategier for at opdage nye muligheder."
    }
  ],
  ctaPrimary: "Tilf&#248;j din f&#248;rste aktie",
  ctaSecondary: "Udforsk dashboardet",
  tipText: "&#x1F4A1; <strong>Kom i gang er nemt:</strong> Tilf&#248;j bare &#233;n aktie for at se dit dashboard komme til live med realtidsdata, diagrammer og AI-indsigter."
};

export const welcomeFreeStocks: WelcomeFreeStocksStrings = {
  heading: "Du er kommet godt i gang!",
  intro: "Du har tilf&#248;jet dine f&#248;rste aktier &mdash; din portef&#248;ljedashboard f&#248;lger nu dine investeringer i realtid. Her er hvad trefolio kan g&#248;re for dig:",
  features: [
    {
      title: "Realtidsdashboard",
      desc: "Portef&#248;ljv&#230;rdi, daglige &#230;ndringer, allokeringsopdeling og pr&#230;stationsdiagrammer &mdash; alt opdateres live."
    },
    {
      title: "Udbytteindsigter",
      desc: "&#197;rlige indt&#230;gtsprognoser, afkastsporing og m&#229;nedlig udbyttekalender for dine beholdninger."
    },
    {
      title: "AI-aktieanalyse",
      desc: "Sp&#248;rg vores AI om hvad som helst om dine aktier. F&#229; resultatanalyse, risikovurderinger og konkurrentindsigter."
    },
    {
      title: "Prisadvarsler",
      desc: "G&#229; aldrig glip af en prisbev&#230;gelse. Ops&#230;t advarsler og bliv underrettet via e-mail eller push."
    },
    {
      title: "Pr&#230;stationsm&#229;linger",
      desc: "Sharpe-forhold, maksimal drawdown, TTWROR og fuld portef&#248;ljv&#230;ksthistorik over enhver tidsperiode."
    },
    {
      title: "Virksomhedsfundamentale",
      desc: "Resultatopg&#248;relser, balancer, pengestr&#248;m, insiderhandler og institutionelle beholdninger."
    },
    {
      title: "Aktiescreener &amp; simulator",
      desc: "Filtrer 600+ aktier og backtest portef&#248;ljstrategier med vores what-if-simulator."
    }
  ],
  voucherTitle: "Eksklusivt tilbud",
  voucherDiscountDisplay: "75% RABAT",
  voucherApply: "Brug kode ved betaling:",
  voucherValid: "G&#230;lder for Bifolio og Trefolio &mdash; m&#229;nedligt eller &#229;rligt",
  ctaPrimary: "Opgrader nu &mdash; 75% rabat",
  ctaSecondary: "Forts&#230;t med Folio",
  tipText: "&#x1F4A1; <strong>Din Folio-plan</strong> inkluderer op til 15 beholdninger, 1 portef&#248;lje og 5 AI-opkald/m&#229;ned. Opgrader for mere."
};

export const bifolioUpgrade: BifolioUpgradeStrings = {
  heading: "Velkommen til Bifolio!",
  paragraph: "Din opgradering er aktiv. Her er alt hvad du lige har l&#229;st op:",
  features: [
    {
      title: "Portfolio Sharing",
      desc: "Generate a public link to share your portfolio performance with anyone — friends, family, or your community."
    },
    {
      title: "CSV Export",
      desc: "Download your holdings and transactions as CSV files for your own analysis or tax records."
    },
    {
      title: "Email & Push Alerts",
      desc: "Set up to 10 price alerts. Get notified instantly by email or browser push when stocks hit your targets."
    },
    {
      title: "Advanced Metrics",
      desc: "Sharpe ratio, max drawdown, and volatility — the metrics serious investors rely on."
    },
    {
      title: "Full Growth History",
      desc: "See your complete portfolio performance over any time period with detailed charts."
    },
    {
      title: "Net Worth Tracking",
      desc: "Track real estate, savings accounts, pensions — up to 10 manual assets for a complete financial picture."
    },
    {
      title: "Broker Sync",
      desc: "Connect your brokerage for one-click auto-sync of holdings, cash, and transactions."
    },
    {
      title: "20 AI Calls/Month",
      desc: "4x more AI analysis calls to understand your holdings, compare stocks, and get portfolio reviews."
    },
    {
      title: "AI Support Agent",
      desc: "Get instant help from our AI-powered support chat — available 24/7."
    }
  ],
  ctaPrimary: "Ops&#230;t din f&#248;rste advarsel",
  ctaSecondary: "Del din portef&#248;lje",
  upsellText: "<strong>Vil du have endnu mere?</strong> Trefolio l&#229;ser op for virksomhedsfundamentale, aktiescreener, skatterapporter, WhatsApp-advarsler og ubegr&#230;nsede beholdninger. <a href=\"{{base_url}}/profile?utm_source=email&utm_medium=lifecycle&utm_campaign=bifolio_upgrade\" style=\"color:#b45309;text-decoration:underline;font-weight:600;\">L&#230;s mere</a>"
};

export const trefolioUpgrade: TrefolioUpgradeStrings = {
  heading: "Velkommen til Trefolio Pro!",
  paragraph: "Du har nu fuld adgang til alle funktioner trefolio tilbyder. Her er dit komplette v&#230;rkt&#248;jss&#230;t:",
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
  ctaPrimary: "Udforsk AI-indsigter",
  ctaSecondary: "Se fundamentale",
  communityText: "&#x1F31F; <strong>Du er en af vores f&#248;rste 500 Pro-medlemmer.</strong> Tak fordi du tror p&#229; trefolio. Din feedback former hvad vi bygger n&#230;ste gang."
};

export const trialInvitation: TrialInvitationStrings = {
  heading: "Din Pro-pr&#248;veperiode venter",
  paragraph:
    "Hej {{display_name}}, du har opbygget din portef&#248;lje i trefolio &mdash; oplev nu hele v&#230;rkt&#248;jss&#230;ttet i 7 dage, helt gratis.",
  groups: [
    {
      label: "Data &amp; analyse",
      items: [
        "Alpha Vantage premiumdata",
        "Fundamentaldata: resultatopg&#248;relse, balance, pengestr&#248;m",
        "Dashboard for &#248;konomiske indikatorer",
      ],
    },
    {
      label: "Intelligens",
      items: [
        "Nyhedsflow med sentimentanalyse",
        "Insiderhandler &amp; institutionelle beholdninger",
        "AI-analyse: 30 opkald/dag, ubegr&#230;nset pr. m&#229;ned",
      ],
    },
    {
      label: "Avancerede v&#230;rkt&#248;jer",
      items: [
        "Sharpe-forhold, maksimal drawdown, volatilitet",
        "Fuld portef&#248;ljepr&#230;stationshistorik",
        "Aktiescreener: 600+ aktier, 6 filtre",
      ],
    },
    {
      label: "Advarsler &amp; gr&#230;nser",
      items: [
        "WhatsApp- &amp; enhedsadvarsler",
        "Ubegr&#230;nsede prisadvarsler &amp; beholdninger",
        "Op til 5 portef&#248;ljer",
      ],
    },
  ],
  ctaPrimary: "Aktiv&#233;r din gratis pr&#248;veperiode",
  ctaSecondary: "Se hvad der indg&#229;r",
  disclaimer:
    "Intet kreditkort p&#229;kr&#230;vet. Efter 7 dage g&#229;r din konto tilbage til Free-planen &mdash; ingen overraskelser.",
  signoffIntro:
    "Jeg byggede trefolio, fordi jeg ville have en bedre m&#229;de at f&#248;lge min egen portef&#248;lje p&#229;. Jeg h&#229;ber, du nyder den fulde oplevelse.",
  signoffReply: "Sig endelig til, hvad du synes &mdash; svar bare p&#229; denne e-mail.",
};

export const trialExpired: TrialExpiredStrings = {
  heading: "Din Pro-pr&#248;veperiode er slut",
  paragraph:
    "Hej {{display_name}}, din 7-dages Trefolio Pro-pr&#248;veperiode er forbi. Her er, hvad du g&#229;r glip af:",
  features: [
    {
      title: "Avanceret analyse",
      desc: "Sharpe-forhold, maksimal drawdown, volatilitet og fuld v&#230;ksthistorik",
    },
    {
      title: "AI-analyse",
      desc: "30 opkald/dag med dybdeg&#229;ende aktieindsigter og portef&#248;ljeanmeldelser",
    },
    {
      title: "Virksomhedsfundamentaler",
      desc: "Resultatopg&#248;relser, balancer, insiderhandler og institutionelle beholdninger",
    },
    {
      title: "Premiumadvarsler",
      desc: "WhatsApp-advarsler, ubegr&#230;nsede advarsler og op til 5 portef&#248;ljer",
    },
  ],
  pricingNote: "Planer fra &euro;4,99/m&#229;ned. Opsig n&#229;r som helst.",
  ctaPrimary: "Abonn&#233;r p&#229; Trefolio Pro",
  ctaSecondary: "Se priser",
  signoffIntro:
    "Jeg h&#229;ber, pr&#248;veperioden gav dig en rigtig fornemmelse af, hvad trefolio kan. Hvis du har feedback, vil jeg meget gerne h&#248;re den.",
  growthTitle: "Din portefølje voksede {{growth_pct}}% i pr&oslash;veperioden",
  growthDesc: "Med Pro kan du forts&aelig;tte med at f&oslash;lge detaljerede pr&aelig;stationsm&aring;l og f&aring; AI-indsigter om dine n&aelig;ste tr&aelig;k.",
  growthTitleDown: "Markederne skiftede &mdash; din portefølje bevægede sig {{growth_pct}}% i pr&oslash;veperioden",
  growthDescDown: "Med Pro ville du f&aring; AI-advarsler og dybere analyser til at reagere hurtigere p&aring; markedsbev&aelig;gelser.",
};
