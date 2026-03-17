import type { WelcomeNoStocksStrings, WelcomeFreeStocksStrings, BifolioUpgradeStrings, TrefolioUpgradeStrings } from "../template-types";

export const welcomeNoStocks: WelcomeNoStocksStrings = {
  heading: "V&#228;lkommen till trefolio!",
  paragraph: "Ditt konto &#228;r redo. trefolio &#228;r det extra bladet f&#246;r din portf&#246;lj &mdash; allt du beh&#246;ver f&#246;r att sp&#229;ra, f&#246;rst&#229; och v&#228;xa dina investeringar p&#229; ett st&#228;lle.",
  features: [
    {
      title: "Realtidskurser",
      desc: "Livepriser fr&#229;n Yahoo Finance p&#229; fler &#228;n 60 globala b&#246;rser. Se din portf&#246;ljv&#228;rde uppdateras under dagen."
    },
    {
      title: "Utdelningssp&#229;rning",
      desc: "Automatisk utdelningsdetektering, &#229;rliga inkomstprognoser, avkastning p&#229; kostnad och m&#229;natlig betalningskalender."
    },
    {
      title: "AI-driven analys",
      desc: "Fr&#229;ga v&#229;r AI om vilken aktie som helst &mdash; f&#229; resultatanalys, konkurrentj&#228;mf&#246;relser och riskbed&#246;mningar. 5 gratis samtal/m&#229;nad."
    },
    {
      title: "Enkel import",
      desc: "Ta med din portf&#246;lj fr&#229;n fler &#228;n 20 m&#228;klare via CSV-uppladdning, Broker Sync med ett klick eller AI-assisterad import."
    },
    {
      title: "Prisaviseringar",
      desc: "Bli meddelad n&#228;r aktier n&#229;r ditt m&#229;lpris. E-post- och pushaviseringar tillg&#228;ngliga p&#229; Bifolio."
    },
    {
      title: "Avancerade m&#228;tningar",
      desc: "Sharpe-kvot, max drawdown, volatilitet och full prestandahistorik f&#246;r att m&#228;ta din strategi."
    },
    {
      title: "Fundamenta &amp; intelligens",
      desc: "F&#246;retagsfinansiering, insideraff&#228;rer, institutionella innehav och nyhetssentiment &mdash; allt i en vy."
    },
    {
      title: "Aktiescreener",
      desc: "Filtrera 600+ aktier med 6 filter och 5 inbyggda strategier f&#246;r att uppt&#228;cka nya m&#246;jligheter."
    }
  ],
  ctaPrimary: "L&#228;gg till din f&#246;rsta aktie",
  ctaSecondary: "Utforska dashboarden",
  tipText: "&#x1F4A1; <strong>Kom ig&#229;ng &#228;r enkelt:</strong> L&#228;gg bara till en aktie f&#246;r att se din dashboard komma till liv med realtidsdata, diagram och AI-insikter."
};

export const welcomeFreeStocks: WelcomeFreeStocksStrings = {
  heading: "Du har kommit ig&#229;ng bra!",
  intro: "Du har lagt till dina f&#246;rsta aktier &mdash; din portf&#246;ljdashboard f&#246;ljer nu dina investeringar i realtid. H&#228;r &#228;r vad trefolio kan g&#246;ra f&#246;r dig:",
  features: [
    {
      title: "Realtidsdashboard",
      desc: "Portf&#246;ljv&#228;rde, dagliga f&#246;r&#228;ndringar, allokeringsuppdelning och prestandadiagram &mdash; allt uppdateras live."
    },
    {
      title: "Utdelningsinsikter",
      desc: "&#197;rliga inkomstprognoser, avkastningssp&#229;rning och m&#229;natlig utdelningskalender f&#246;r dina innehav."
    },
    {
      title: "AI-aktieanalys",
      desc: "Fr&#229;ga v&#229;r AI vad som helst om dina aktier. F&#229; resultatanalys, riskbed&#246;mningar och konkurrentinsikter."
    },
    {
      title: "Prisaviseringar",
      desc: "Missa aldrig en prisr&#246;relse. St&#228;ll in aviseringar och bli meddelad via e-post eller push."
    },
    {
      title: "Prestandam&#228;tningar",
      desc: "Sharpe-kvot, max drawdown, TTWROR och full portf&#246;ljtillv&#228;xtshistorik &#246;ver valfri tidsperiod."
    },
    {
      title: "F&#246;retagsfundamenta",
      desc: "Resultatr&#228;kningar, balansr&#228;kningar, kassafl&#246;de, insideraff&#228;rer och institutionella innehav."
    },
    {
      title: "Aktiescreener &amp; simulator",
      desc: "Filtrera 600+ aktier och backtesta portf&#246;ljstrategier med v&#229;r what-if-simulator."
    }
  ],
  voucherTitle: "Exklusivt erbjudande",
  voucherDiscountDisplay: "75% RABATT",
  voucherApply: "Anv&#228;nd kod vid kassan:",
  voucherValid: "G&#228;ller f&#246;r Bifolio och Trefolio &mdash; m&#229;natligt eller &#229;rligen",
  ctaPrimary: "Uppgradera nu &mdash; 75% rabatt",
  ctaSecondary: "Forts&#228;tt med Folio",
  tipText: "&#x1F4A1; <strong>Din Folio-plan</strong> inkluderar upp till 15 innehav, 1 portf&#246;lj och 5 AI-anrop/m&#229;nad. Uppgradera f&#246;r mer."
};

export const bifolioUpgrade: BifolioUpgradeStrings = {
  heading: "V&#228;lkommen till Bifolio!",
  paragraph: "Din uppgradering &#228;r aktiv. H&#228;r &#228;r allt du precis l&#229;ste upp:",
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
  ctaPrimary: "St&#228;ll in din f&#246;rsta avisering",
  ctaSecondary: "Dela din portf&#246;lj",
  upsellText: "<strong>Vill du ha &#228;nnu mer?</strong> Trefolio l&#229;ser upp f&#246;retagsfundamenta, aktiescreener, skatterapporter, WhatsApp-aviseringar och obegr&#228;nsade innehav. <a href=\"{{base_url}}/profile?utm_source=email&utm_medium=lifecycle&utm_campaign=bifolio_upgrade\" style=\"color:#b45309;text-decoration:underline;font-weight:600;\">L&#228;s mer</a>"
};

export const trefolioUpgrade: TrefolioUpgradeStrings = {
  heading: "V&#228;lkommen till Trefolio Pro!",
  paragraph: "Du har nu full tillg&#229;ng till alla funktioner trefolio erbjuder. H&#228;r &#228;r ditt kompletta verktygsset:",
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
  ctaPrimary: "Utforska AI-insikter",
  ctaSecondary: "Visa fundamenta",
  communityText: "&#x1F31F; <strong>Du &#228;r en av v&#229;ra f&#246;rsta 500 Pro-medlemmar.</strong> Tack f&#246;r att du tror p&#229; trefolio. Din feedback formar vad vi bygger h&#228;rn&#228;st."
};
