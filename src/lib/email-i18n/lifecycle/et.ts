import type { WelcomeNoStocksStrings, WelcomeFreeStocksStrings, BifolioUpgradeStrings, TrefolioUpgradeStrings } from "../template-types";

export const welcomeNoStocks: WelcomeNoStocksStrings = {
  heading: "Tere tulemast trefolio-sse!",
  paragraph: "Sinu konto on valmis. trefolio on lisaleht sinu portfellile &mdash; kõik, mida vajad oma investeeringute jälgimiseks, mõistmiseks ja kasvatamiseks ühes kohas.",
  features: [
    {
      title: "Reaalajas hindade kuvamine",
      desc: "Otse Yahoo Finance'ist üle 60 börsi kohta üle maailma. Vaata oma portfelli väärtust uuendumas terve päeva jooksul."
    },
    {
      title: "Dividendi jälgimine",
      desc: "Automaatne dividendide tuvastamine, aastatulu prognoosid, tootlus kulude pealt ja kuine maksekalender."
    },
    {
      title: "AI-põhine analüüs",
      desc: "Küsi meie AI-lt mis tahes aktsia kohta &mdash; saa tulemuste analüüsi, konkurentide võrdlusi ja riskihinnanguid. 5 tasuta kutsut/kuus."
    },
    {
      title: "Lihtne import",
      desc: "Too oma portfell üle 20 brókerilt CSV üleslaadimise, Broker Sync ühe klikiga või AI-abistatud impordi kaudu."
    },
    {
      title: "Hinnateavitused",
      desc: "Saa teavitus, kui aktsiad jõuavad sinu sihihinnani. E-maili ja push teavitused saadaval Bifolios."
    },
    {
      title: "Täpsemad mõõdikud",
      desc: "Sharpe suhe, maksimaalne langus, volatilsus ja täielik tulemuslikkuse ajalugu oma strateegia mõõtmiseks."
    },
    {
      title: "Fundamentaalsed ja intelligentsus",
      desc: "Ettevõtte rahandus, siseostud, institutsionaalsed omanikud ja uudiste sentiment &mdash; kõik ühes vaates."
    },
    {
      title: "Aktsiate filter",
      desc: "Filtreeri üle 600 aktsia 6 filtri ja 5 sisse ehitatud strateegiaga uute võimaluste avastamiseks."
    }
  ],
  ctaPrimary: "Lisa oma esimene aktsia",
  ctaSecondary: "Uuri dashboardit",
  tipText: "&#x1F4A1; <strong>Alustamine on lihtne:</strong> Lisa ainult üks aktsia, et näha oma dashboardi elustuvat reaalajas andmetega, graafikutega ja AI ülevaadetega."
};

export const welcomeFreeStocks: WelcomeFreeStocksStrings = {
  heading: "Alustasid suurepäraselt!",
  intro: "Oled lisandanud oma esimesed aktsiad — portfelli dashboard jälgib nüüd teie investeeringuid reaalajas. Siin on, mida trefolio võib teie heaks teha:",
  features: [
    {
      title: "Reaalajas dashboard",
      desc: "Portfelli väärtus, igapäevased muutused, allokatsiooni jaotus ja tulemuslikkuse graafikud — kõik uuendub otseülekanne."
    },
    {
      title: "Dividendi ülevaated",
      desc: "Aastatulu prognoosid, tootluse jälgimine ja kuine dividendide kalender teie positsioonide jaoks."
    },
    {
      title: "AI aktsia analüüs",
      desc: "Küsi meie AI-lt mis tahes teie aktsiate kohta. Saa tulemuste analüüsi, riskihinnanguid ja konkurentide ülevaateid."
    },
    {
      title: "Hinnateavitused",
      desc: "Ära jäta ühtegi hinnaliikumist vahele. Seadista teavitused ja saa teateid e-kirja või pushi kaudu."
    },
    {
      title: "Tulemuslikkuse mõõdikud",
      desc: "Sharpe suhe, maksimaalne langus, TTWROR ja täielik portfelli kasvu ajalugu mis tahes perioodi kohta."
    },
    {
      title: "Ettevõtte fundamentaalsed",
      desc: "Tulude aruanded, bilansid, rahavoog, siseostud ja institutsionaalsed omanikud."
    },
    {
      title: "Aktsiate filter ja simulaator",
      desc: "Filtreeri üle 600 aktsia ja testi portfelli strateegiaid meie what-if simulaatoriga."
    }
  ],
  voucherTitle: "Eksklusiivne pakkumine",
  voucherDiscountDisplay: "75% ALLAHINDLUS",
  voucherApply: "Kasuta koodi maksel:",
  voucherValid: "Kehtib Bifolio ja Trefolio — kuine või aastane",
  ctaPrimary: "Uuenda nüüd — 75% allahindlus",
  ctaSecondary: "Jätka Folio-ga",
  tipText: "&#x1F4A1; <strong>Sinu Folio plaan</strong> sisaldab kuni 15 positsiooni, 1 portfelli ja 5 AI kutsut kuus. Uuenda rohkem avamiseks."
};

export const bifolioUpgrade: BifolioUpgradeStrings = {
  heading: "Tere tulemast Bifolio-sse!",
  paragraph: "Sinu uuendus on aktiivne. Siin on k&#245;ik, mida sa just avasid:",
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
  ctaPrimary: "Seadista oma esimene teavitus",
  ctaSecondary: "Jaga oma portfelli",
  upsellText: "<strong>Tahad veel rohkem?</strong> Trefolio avab ettev&#245;tete fundamentaalsed andmed, aktsiate filtri, maksuaruanded, WhatsApp teavitused ja piiramatud positsioonid. <a href=\"{{base_url}}/profile?utm_source=email&utm_medium=lifecycle&utm_campaign=bifolio_upgrade\" style=\"color:#b45309;text-decoration:underline;font-weight:600;\">Loe rohkem</a>"
};

export const trefolioUpgrade: TrefolioUpgradeStrings = {
  heading: "Tere tulemast Trefolio Pro-sse!",
  paragraph: "Sul on n&#252;&#252;d t&#228;ielik juurdep&#228;&#228;s k&#245;igile trefolio funktsioonidele. Siin on sinu t&#228;ielik t&#246;&#246;riistakomplekt:",
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
  ctaPrimary: "Uuri AI &#252;levaateid",
  ctaSecondary: "Vaata fundamentaalseid",
  communityText: "&#x1F31F; <strong>Oled &#252;ks meie esimesest 500 Pro liikmest.</strong> T&#228;nan, et usud trefolio-sse. Sinu tagasiside kujundab seda, mida j&#228;rgmisena ehitame."
};
