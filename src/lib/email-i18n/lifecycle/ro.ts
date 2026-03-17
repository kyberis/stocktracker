import type { WelcomeNoStocksStrings, WelcomeFreeStocksStrings, BifolioUpgradeStrings, TrefolioUpgradeStrings } from "../template-types";

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
      desc: "Fii notificat când ac&#539;iunile ating pre&#539;ul țint&#259;. Alerte email &#537;i push disponibile pe Bifolio."
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
  voucherValid: "Valabil pe Bifolio &#537;i Trefolio &mdash; lunar sau anual",
  ctaPrimary: "Actualizeaz&#259; acum &mdash; 75% reducere",
  ctaSecondary: "Continu&#259; cu Folio",
  tipText: "&#x1F4A1; <strong>Planul t&#259;u Folio</strong> include p&#226;n&#259; la 15 pozi&#539;ii, 1 portofoliu &#537;i 5 apeluri IA/lun&#259;. Actualizeaz&#259; pentru a debloca mai mult."
};

export const bifolioUpgrade: BifolioUpgradeStrings = {
  heading: "Bine ai venit la Bifolio!",
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
  upsellText: "<strong>Vrei și mai mult?</strong> Trefolio deblocheaz&#259; fundamentale companii, filtru ac&#539;iuni, rapoarte fiscale, alerte WhatsApp și pozi&#539;ii nelimitate. <a href=\"{{base_url}}/profile?utm_source=email&utm_medium=lifecycle&utm_campaign=bifolio_upgrade\" style=\"color:#b45309;text-decoration:underline;font-weight:600;\">Afl&#259; mai multe</a>"
};

export const trefolioUpgrade: TrefolioUpgradeStrings = {
  heading: "Bine ai venit la Trefolio Pro!",
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
