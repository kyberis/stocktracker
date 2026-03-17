import type { WelcomeNoStocksStrings, WelcomeFreeStocksStrings, BifolioUpgradeStrings, TrefolioUpgradeStrings } from "../template-types";

export const welcomeNoStocks: WelcomeNoStocksStrings = {
  heading: "Mir&euml; se erdhe n&euml; trefolio!",
  paragraph: "Llogaria juaj &euml;sht&euml; gati. trefolio &euml;sht&euml; gjetheja shtes&euml; p&euml;r portofolin tuaj &mdash; gjith&ccedil;ka q&euml; ju nevojitet p&euml;r t&euml; ndjekur, kuptuar dhe rritur investimet tuaja n&euml; nj&euml; vend.",
  features: [
    {
      title: "Kuotat n&euml; koh&euml; reale",
      desc: "&Ccedil;mime t&euml; drejtp&euml;rdrejta nga Yahoo Finance n&euml; mbi 60 bursa n&euml; mbar&euml; bot&euml;n. Shikoni vler&euml;n e portofolit tuaj t&euml; p&euml;rdit&euml;suar gjat&euml; dit&euml;s."
    },
    {
      title: "Ndjekja e divident&euml;ve",
      desc: "Zbulim automatik i divident&euml;ve, parashikime t&euml; ardhurash vjetore, rendiment mbi koston dhe kalendar mujor i pagesave."
    },
    {
      title: "Analiz&euml; e fuqizuara nga AI",
      desc: "Pyetni AI-n&euml; ton&euml; p&euml;r &ccedil;far&euml;do aksioni &mdash; merrni analiz&euml; rezultatesh, krahasime konkurrent&euml;sh dhe vler&euml;sime rreziku. 5 thirrje falas/muaj."
    },
    {
      title: "Import i leht&euml;",
      desc: "Sillni portofolin tuaj nga 20+ nd&euml;rmarr&euml;s p&euml;rmes ngarkimit CSV, Broker Sync me nj&euml; klik ose import me ndihm&euml; AI."
    },
    {
      title: "Njoftime &ccedil;mimesh",
      desc: "Merrni njoftim kur aksionet arrijn&euml; &ccedil;mimin tuaj t&euml; synuar. Njoftime me email dhe push t&euml; disponueshme n&euml; Bifolio."
    },
    {
      title: "Metrika t&euml; avancuara",
      desc: "Raporti Sharpe, humbja maksimale, volatiliteti dhe historia e plot&euml; e performanc&euml;s p&euml;r matjen e strategjis&euml; tuaj."
    },
    {
      title: "Fundamentet &amp; inteligjenca",
      desc: "Financat e kompanis&euml;, tregti brendshme, aksione institucionale dhe sentimenti i lajmeve &mdash; gjith&ccedil;ka n&euml; nj&euml; pamje."
    },
    {
      title: "Filtri i aksioneve",
      desc: "Filtroni 600+ aksione me 6 filtra dhe 5 strategji t&euml; integruara p&euml;r t&euml; zbuluar mund&euml;sira t&euml; reja."
    }
  ],
  ctaPrimary: "Shtoni aksionin tuaj t&euml; par&euml;",
  ctaSecondary: "Eksploroni panelin",
  tipText: "&#x1F4A1; <strong>Fillimi &euml;sht&euml; i leht&euml;:</strong> Shtoni vet&euml;m nj&euml; aksion p&euml;r t&euml; par&euml; panelin tuaj t&euml; vij&euml; n&euml; jet&euml; me t&euml; dh&euml;na n&euml; koh&euml; reale, grafik&euml; dhe njohuri AI."
};

export const welcomeFreeStocks: WelcomeFreeStocksStrings = {
  heading: "Keni filluar shum&euml; mir&euml;!",
  intro: "Keni shtuar aksionet tuaja t&euml; par&euml; &mdash; dashboard-i i portofolit tani ndjek investimet tuaja n&euml; koh&euml; reale. Ja &ccedilfar&euml; mund t&euml; b&euml;j&euml; trefolio p&euml;r ju:",
  features: [
    {
      title: "Dashboard n&euml; koh&euml; reale",
      desc: "Vlera e portofolit, ndryshimet ditore, ndarja e alokimit dhe grafik&euml;t e performanc&euml;s &mdash; gjith&ccedil;ka p&euml;rdit&euml;sohet drejtp&euml;rdrejt."
    },
    {
      title: "Njohuri p&euml;r divident&euml;t",
      desc: "Parashikime t&euml; ardhurash vjetore, ndjekje rendimenti dhe kalendar mujor i divident&euml;ve p&euml;r pozicionet tuaja."
    },
    {
      title: "Analiz&euml; AI e aksioneve",
      desc: "Pyetni AI-n&euml; ton&euml; &ccedilfar&euml;do p&euml;r aksionet tuaja. Merrni analiz&euml; rezultatesh, vler&euml;sime rreziku dhe njohuri konkurruese."
    },
    {
      title: "Njoftime &ccedil;mimesh",
      desc: "Mos humbni asnj&euml; l&euml;vizje &ccedil;mimi. Vendosni njoftime dhe merrni njoftime me email ose push."
    },
    {
      title: "Metrika performanc&euml;s",
      desc: "Raporti Sharpe, humbja maksimale, TTWROR dhe historia e plot&euml; e rritjes s&euml; portofolit p&euml;r &ccedilfar&euml;do periudhe."
    },
    {
      title: "Fundamentet e kompanis&euml;",
      desc: "Deklarata t&euml; ardhurave, bilancet, fluksi i parasht&euml;, tregti brendshme dhe aksione institucionale."
    },
    {
      title: "Filtri dhe simuluesi i aksioneve",
      desc: "Filtroni 600+ aksione dhe testoni strategjit&euml; e portofolit me simuluesin ton&euml; what-if."
    }
  ],
  voucherTitle: "Oferta ekskluzive",
  voucherDiscountDisplay: "75% ZBRITJE",
  voucherApply: "P&euml;rdorni kodin n&euml; checkout:",
  voucherValid: "E vlefshme p&euml;r Bifolio dhe Trefolio &mdash; mujore ose vjetore",
  ctaPrimary: "P&euml;rmir&euml;soni tani &mdash; 75% zbritje",
  ctaSecondary: "Vazhdoni me Folio",
  tipText: "&#x1F4A1; <strong>Plani juaj Folio</strong> p&euml;rfshin deri n&euml; 15 aksione, 1 portofol dhe 5 thirrje AI/muaj. P&euml;rmir&euml;soni p&euml;r m&euml; shum&euml;."
};

export const bifolioUpgrade: BifolioUpgradeStrings = {
  heading: "Mir&euml; se erdhe n&euml; Bifolio!",
  paragraph: "P&euml;rmir&euml;simi juaj &euml;sht&euml; aktiv. Ja &ccedil;far&euml; sapo hap&euml;t:",
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
  ctaPrimary: "Vendosni alarmin tuaj t&euml; par&euml;",
  ctaSecondary: "Ndani portofolin tuaj",
  upsellText: "<strong>Doni edhe m&euml; shum&euml;?</strong> Trefolio hap fundamentet e kompanis&euml;, filtrin e aksioneve, raportet tatimore, njoftimet WhatsApp dhe aksione t&euml; pakufizuara. <a href=\"{{base_url}}/profile?utm_source=email&utm_medium=lifecycle&utm_campaign=bifolio_upgrade\" style=\"color:#b45309;text-decoration:underline;font-weight:600;\">M&euml;so m&euml; shum&euml;</a>"
};

export const trefolioUpgrade: TrefolioUpgradeStrings = {
  heading: "Mir&euml; se erdhe n&euml; Trefolio Pro!",
  paragraph: "Tani keni akses t&euml; plot&euml; n&euml; t&euml; gjitha veçorit&euml; q&euml; ofron trefolio. Ja kompletet e mjetit tuaj:",
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
  ctaPrimary: "Eksploroni njohurit&euml; AI",
  ctaSecondary: "Shikoni fundamentet",
  communityText: "&#x1F31F; <strong>Jeni nj&euml; nga 500 an&euml;tar&euml;t e par&euml; Pro.</strong> Faleminderit q&euml; besuat n&euml; trefolio. Feedback-u juaj formon at&euml; q&euml; nd&euml;rtojm&euml; m&euml; pas."
};
