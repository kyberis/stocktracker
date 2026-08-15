import type { WelcomeNoStocksStrings, WelcomeFreeStocksStrings, BifolioUpgradeStrings, TrefolioUpgradeStrings, TrialInvitationStrings, TrialExpiredStrings } from "../template-types";

export const welcomeNoStocks: WelcomeNoStocksStrings = {
  heading: "Bine ai venit la trefolio!",
  paragraph: "Contul t&#259;u este gata. trefolio este frunza suplimentar&#259; pentru portofoliul t&#259;u &mdash; tot ce ai nevoie pentru a urm&#259;ri, &#238;n&#539elege &#537;i dezvolta investi&#539;iile tale &#238;ntr-un singur loc.",
  features: [
    {
      title: "Cota&#539;ii în timp real",
      desc: "Pre&#539;uri live de la Yahoo Finance pe peste 60 de burse globale. Vezi valoarea portofoliului t&#259;u actualizat&#259; pe parcursul zilei."
    },
    {
      title: "Urm&#259;rire dividende",
      desc: "Detec&#539;ie automat&#259; a dividendelor, proiec&#539;ii de venit anual, randament pe cost &#537;i calendar de pl&#259;ți lunare."
    },
    {
      title: "Analiz&#259; cu IA",
      desc: "Întreab&#259;-ne pe IA despre orice ac&#539;iune &mdash; ob&#539;ine analiz&#259; de rezultate, compara&#539;ii cu concuren&#539;i &#537;i evalu&#259;ri de risc. 5 apeluri gratuite/lun&#259;."
    },
    {
      title: "Import u&#539;or",
      desc: "Adu portofoliul t&#259;u de la peste 20 de brokeri prin upload CSV, Broker Sync cu un clic sau import asistat de IA."
    },
    {
      title: "Alerte de pre&#539;",
      desc: "Fii notificat când ac&#539;iunile ating pre&#539;ul țint&#259;. Alerte email &#537;i push disponibile pe trefolio."
    },
    {
      title: "Metrici avansate",
      desc: "Raport Sharpe, drawdown maxim, volatilitate &#537;i istoric complet al performan&#539;ei pentru m&#259;surarea strategiei tale."
    },
    {
      title: "Fundamentale &#537;i inteligen&#539;&#259;",
      desc: "Date financiare ale companiilor, tranzac&#539;ii insider, de&#539;ineri institu&#539ionale &#537;i sentiment din știri &mdash; totul într-o singur&#259; vedere."
    },
    {
      title: "Filtru ac&#539;iuni",
      desc: "Filtreaz&#259; peste 600 de ac&#539;iuni cu 6 filtre &#537;i 5 strategii integrate pentru a descoperi noi oportunit&#259;ți."
    }
  ],
  ctaPrimary: "Adaug&#259; prima ta ac&#539;iune",
  ctaSecondary: "Exploreaz&#259; dashboard-ul",
  tipText: "&#x1F4A1; <strong>Începutul e u&#539;or:</strong> Adaug&#259; doar o ac&#539;iune pentru a vedea dashboard-ul t&#259;u prinde via&#539;&#259; cu date în timp real, grafice &#537;i insight-uri IA."
};

export const welcomeFreeStocks: WelcomeFreeStocksStrings = {
  heading: "Ai făcut un start excelent!",
  intro: "Ai adăugat primele tale ac&#539;iuni &mdash; dashboard-ul portofoliului urm&#259;re&#537;te acum investi&#539;iile tale în timp real. Iată ce poate face trefolio pentru tine:",
  features: [
    {
      title: "Dashboard în timp real",
      desc: "Valoarea portofoliului, schimb&#259;ri zilnice, repartizarea aloc&#259;rii &#537;i graficele performan&#539;ei &mdash; toate se actualizeaz&#259; live."
    },
    {
      title: "Insights dividende",
      desc: "Proiec&#539;ii de venit anual, urm&#259;rire randament &#537;i calendar lunar de dividende pentru pozi&#539;iile tale."
    },
    {
      title: "Analiz&#259; ac&#539;iuni cu IA",
      desc: "Întreab&#259;-ne pe IA orice despre ac&#539;iunile tale. Ob&#539;ine analiz&#259; de rezultate, evalu&#259;ri de risc &#537;i insight-uri competitive."
    },
    {
      title: "Alerte de pre&#539;",
      desc: "Nu rata nicio mi&#537;care de pre&#539;. Seteaz&#259; alerte &#537;i fii notificat prin email sau push."
    },
    {
      title: "Metrici de performan&#539;&#259;",
      desc: "Raport Sharpe, drawdown maxim, TTWROR &#537;i istoric complet al cre&#537;terii portofoliului pe orice perioad&#259;."
    },
    {
      title: "Fundamentale companie",
      desc: "Situa&#539;ii de rezultate, bilan&#539;uri, flux de numerar, tranzac&#539;ii insider &#537;i de&#539;ineri institu&#539ionale."
    },
    {
      title: "Filtru &#537;i simulator ac&#539;iuni",
      desc: "Filtreaz&#259; peste 600 de ac&#539;iuni &#537;i f&#259; backtest strategii de portofoliu cu simulatorul nostru what-if."
    }
  ],
  voucherTitle: "Ofert&#259; exclusiv&#259;",
  voucherDiscountDisplay: "75% REDUCERE",
  voucherApply: "Folose&#537;te codul la plat&#259;:",
  voucherValid: "lunar sau anual",
  ctaPrimary: "Actualizeaz&#259; acum &mdash; 75% reducere",
  ctaSecondary: "Exploreaz&#259; dashboard-ul",
  tipText: "&#x1F4A1; <strong>Începutul e u&#539;or:</strong> Adaug&#259; doar o ac&#539;iune pentru a vedea dashboard-ul t&#259;u prinde via&#539;&#259; cu date în timp real, grafice &#537;i insight-uri IA."
};

export const bifolioUpgrade: BifolioUpgradeStrings = {
  heading: "Bine ai venit la trefolio!",
  paragraph: "Actualizarea ta este activ&#259;. Iat&#259; tot ce tocmai ai deblocat:",
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
  ctaPrimary: "Configureaz&#259; prima ta alert&#259;",
  ctaSecondary: "Partajeaz&#259; portofoliul",
  upsellText: "<strong>Vrei și mai mult?</strong> trefolio deblocheaz&#259; fundamentale companii, filtru ac&#539;iuni, rapoarte fiscale, alerte WhatsApp și pozi&#539;ii nelimitate. <a href=\"{{base_url}}/profile?utm_source=email&utm_medium=lifecycle&utm_campaign=bifolio_upgrade\" style=\"color:#b45309;text-decoration:underline;font-weight:600;\">Afl&#259; mai multe</a>"
};

export const trefolioUpgrade: TrefolioUpgradeStrings = {
  heading: "Bine ai venit la trefolio!",
  paragraph: "Ai acum acces complet la toate func&#539;iile pe care trefolio le ofer&#259;. Iat&#259; toolkit-ul t&#259;u complet:",
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
  ctaPrimary: "Exploreaz&#259; analizele AI",
  ctaSecondary: "Vezi fundamentalele",
  communityText: "&#x1F31F; <strong>E&#537;ti unul dintre primii 500 de membri Pro.</strong> Mul&#539;umim c&#259; ai crezut în trefolio. Feedback-ul t&#259;u influen&#539;eaz&#259; ce construim în continuare."
};

export const trialInvitation: TrialInvitationStrings = {
  heading: "Perioada ta Pro de prob&#x103; te a&#x219;teapt&#x103;",
  paragraph:
    "Salut, {{display_name}}, &#xee;&#x21b;i construie&#x219;ti portofoliul &#xee;n trefolio &mdash; acum &#xee;ncearc&#x103; &#xee;ntregul set de instrumente timp de 7 zile, complet gratuit.",
  groups: [
    {
      label: "Date &amp; analiz&#x103;",
      items: [
        "Date premium Alpha Vantage",
        "Fundamentale: cont de profit &#x219;i pierdere, bilan&#x21b;, flux de trezorerie",
        "Tablou de bord cu indicatori economici",
      ],
    },
    {
      label: "Inteligen&#x21b;&#x103;",
      items: [
        "Flux de &#x219;tiri cu analiz&#x103; de sentiment",
        "Tranzac&#x21b;ii insider &amp; de&#x21b;ineri institu&#x21b;ionale",
        "Analiz&#x103; AI: 30 de apeluri/zi, nelimitat lunar",
      ],
    },
    {
      label: "Instrumente avansate",
      items: [
        "Raport Sharpe, drawdown maxim, volatilitate",
        "Istoric complet al performan&#x21b;ei portofoliului",
        "Filtru ac&#x21b;iuni: 600+ ac&#x21b;iuni, 6 filtre",
      ],
    },
    {
      label: "Alerte &amp; limite",
      items: [
        "Notific&#x103;ri WhatsApp &#x219;i pe dispozitiv",
        "Alerte de pre&#x21b; nelimitate &amp; pozi&#x21b;ii",
        "P&#xe2;n&#x103; la 5 portofolii",
      ],
    },
  ],
  ctaPrimary: "Activeaz&#x103; perioada gratuit&#x103; de prob&#x103;",
  ctaSecondary: "Vezi ce este inclus",
  disclaimer:
    "Nu este necesar card de credit. Dup&#x103; 7 zile, contul t&#x103;u revine la planul Free &mdash; f&#x103;r&#x103; surprize.",
  signoffIntro:
    "Am creat trefolio pentru c&#x103; voiam un mod mai bun de a-mi urm&#x103;ri propriul portofoliu. Sper s&#x103; te bucuri de experien&#x21b;a complet&#x103;.",
  signoffReply:
    "Spune-mi ce p&#x103;rere ai &mdash; r&#x103;spunde pur &#x219;i simplu la acest e-mail.",
};

export const trialExpired: TrialExpiredStrings = {
  heading: "Perioada ta Pro de prob&#x103; s-a &#xee;ncheiat",
  paragraph:
    "Salut, {{display_name}}, perioada ta de prob&#x103; trefolio de 7 zile s-a &#xee;ncheiat. Iat&#x103; ce vei rata:",
  features: [
    {
      title: "Analitic&#x103; avansat&#x103;",
      desc: "Raport Sharpe, drawdown maxim, volatilitate &#x219;i istoric complet al cre&#x219;terii",
    },
    {
      title: "Analiz&#x103; AI",
      desc: "30 de apeluri/zi cu perspective aprofundate despre ac&#x21b;iuni &#x219;i evalu&#x103;ri de portofoliu",
    },
    {
      title: "Fundamentale companie",
      desc: "Situa&#x21b;ii financiare, bilan&#x21b;uri, tranzac&#x21b;ii insider &#x219;i de&#x21b;ineri institu&#x21b;ionale",
    },
    {
      title: "Alerte premium",
      desc: "Notific&#x103;ri WhatsApp, alerte nelimitate &#x219;i p&#xe2;n&#x103; la 5 portofolii",
    },
  ],
  pricingNote: "Planurile &#xee;ncep de la &euro;4,99/lun&#x103;. Anulezi oric&#xe2;nd.",
  ctaPrimary: "Aboneaz&#x103;-te la trefolio",
  ctaSecondary: "Vezi pre&#x21b;urile",
  signoffIntro:
    "Sper c&#x103; perioada de prob&#x103; &#x21b;i-a oferit o idee real&#x103; despre ce poate face trefolio. Dac&#x103; ai feedback, chiar a&#x219; vrea s&#x103; &#xee;l aud.",
  growthTitle:
    "Portofoliul t&abreve;u a crescut cu {{growth_pct}}% &icirc;n perioada de prob&abreve;",
  growthDesc:
    "Cu Pro, po&tcedil;i continua s&abreve; urmăre&scedil;ti metrici detaliate de performan&tcedil;&abreve; &scedil;i s&abreve; ob&tcedil;ii analize AI despre urm&abreve;torii pa&scedil;i.",
  growthTitleDown: "Pie&tcedil;ele s-au schimbat &mdash; portofoliul t&abreve;u s-a mi&scedil;cat cu {{growth_pct}}% &icirc;n perioada de prob&abreve;",
  growthDescDown: "Cu Pro, ai avea alerte AI &scedil;i analize mai profunde pentru a reac&tcedil;iona mai rapid la mi&scedil;c&abreve;rile pie&tcedil;ei.",
};
