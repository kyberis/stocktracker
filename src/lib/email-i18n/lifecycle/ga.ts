import type { WelcomeNoStocksStrings, WelcomeFreeStocksStrings, BifolioUpgradeStrings, TrefolioUpgradeStrings } from "../template-types";

export const welcomeNoStocks: WelcomeNoStocksStrings = {
  heading: "F&aacute;ilte go trefolio!",
  paragraph: "T&aacute; do chuntas r&eacute;idh. Is &eacute; trefolio an duilleog bhreise do do phortaf&oacute;il &mdash; gach rud at&aacute; de dh&iacute;th ort chun do infheist&iacute;ochta&iacute; a rian&uacute;, a thuiscint agus a fh&aacute;s in aon &aacute;it amh&aacute;in.",
  features: [
    {
      title: "Luachanna F&iacute;or-ama",
      desc: "Praghsanna beo &oacute; Yahoo Finance ar n&iacute;os m&oacute; n&aacute; 60 malart&aacute;n ar fud an domhain. F&eacute;ach ar luach do phortaf&oacute;il ag nuashonr&uacute; i rith an lae."
    },
    {
      title: "Rian&uacute; Cuidithe",
      desc: "Braitheadh uathoibr&iacute;och ar chuidithe, r&eacute;amh-mheastach&aacute;in ioncaim bliant&uacute;il, toradh ar chostas agus f&eacute;ilire &iacute;oca&iacute;ochta&iacute; m&iacute;os&uacute;la."
    },
    {
      title: "Anail&iacute;s AI",
      desc: "Fiafraigh d&aacute;r AI faoi aon stoc &mdash; faigh anail&iacute;s ar thortha&iacute;, compar&aacute;id&iacute; iomaitheoir&iacute; agus meas&uacute;nuithe riosca. 5 ghlaoch saor in aisce/m&iacute;."
    },
    {
      title: "Iomp&oacute;rt&aacute;il &Eacute;asca",
      desc: "Tabhair do phortaf&oacute;il isteach &oacute; 20+ br&oacute;ic&eacute;ir tr&iacute; uasl&oacute;d&aacute;il CSV, Broker Sync le c&eacute;ad chlice&aacute;il n&oacute; iomp&oacute;rt&aacute;il le c&uacute;namh AI."
    },
    {
      title: "Fol&aacute;ireamh Praghsanna",
      desc: "Faigh f&oacute;gra nuair a bhaineann stoic amach do phraghas sprice. Fol&aacute;ireamh r&iacute;omhphoist agus push ar f&aacute;il ar Bifolio."
    },
    {
      title: "M&eacute;adair Chasta",
      desc: "C&oacute;imheas Sharpe, &iacute;sli&uacute; m&aacute;x, luaineacht agus stair ioml&aacute;n feidhm&iacute;ochta chun do strait&eacute;ise a thomhas."
    },
    {
      title: "Bunfhadhbanna &amp; Faisn&eacute;iseacht",
      desc: "Airgeada&iacute;s chuideachta, idirbhearta insider, sealbhuithe institi&uacute;ideacha agus moth&uacute;ch&aacute;in nuachta &mdash; uile in aon amharc."
    },
    {
      title: "Scagaire Stoc",
      desc: "Scag 600+ stoc le 6 scagair&iacute; agus 5 strait&eacute;is&iacute; ionch&uacute;laithe chun deiseanna nua a fhionnachtain."
    }
  ],
  ctaPrimary: "Cuir do Ch&eacute;ad Stoc leis",
  ctaSecondary: "Ini&uacute;ch an Deais",
  tipText: "&#x1F4A1; <strong>T&aacute; t&uacute;s r&eacute;idh:</strong> Cuir ach stoc amh&aacute;in leis chun do dheais a fheice&aacute;il ag teacht beo le sonra&iacute; f&iacute;or-ama, cairteacha agus l&eacute;argas AI."
};

export const welcomeFreeStocks: WelcomeFreeStocksStrings = {
  heading: "T&aacute; t&uacute; ag tos go maith!",
  intro: "T&aacute; do ch&eacute;ad stoic curtha agat leis &mdash; t&aacute; deais do phortaf&oacute;il ag rian&uacute; do infheist&iacute;ochta&iacute; anois i bhf&iacute;or-am. Seo a d&eacute;anann trefolio duit:",
  features: [
    {
      title: "Deais F&iacute;or-ama",
      desc: "Luach portaf&oacute;il, athruithe laeth&uacute;la, briseadh s&iacute;ni&uacute; agus cairteacha feidhm&iacute;ochta &mdash; uile ag nuashonr&uacute; beo."
    },
    {
      title: "L&eacute;argas ar Chuidithe",
      desc: "R&eacute;amh-mheastach&aacute;in ioncaim bliant&uacute;il, rian&uacute; toradh agus f&eacute;ilire cuidithe m&iacute;os&uacute;il do do shealbhuithe."
    },
    {
      title: "Anail&iacute;s Stoc AI",
      desc: "Fiafraigh d&aacute;r AI faoi aon rud faoi do stoic. Faigh anail&iacute;s ar thortha&iacute;, meas&uacute;nuithe riosca agus l&eacute;argas ioma&iacute;och."
    },
    {
      title: "Fol&aacute;ireamh Praghsanna",
      desc: "N&aacute; caill gluaiseacht praghais. Socraigh fol&aacute;ireamh agus faigh f&oacute;gra&iacute;ochta&iacute; r&iacute;omhphoist n&oacute; push."
    },
    {
      title: "M&eacute;adair Feidhm&iacute;ochta",
      desc: "C&oacute;imheas Sharpe, &iacute;sli&uacute; m&aacute;x, TTWROR agus stair ioml&aacute;n f&aacute;s portaf&oacute;il thar aon thr&eacute;imhse."
    },
    {
      title: "Bunfhadhbanna Cuideachta",
      desc: "R&aacute;itis ioncaim, cothromais, sreabhadh airgid, idirbhearta insider agus sealbhuithe institi&uacute;ideacha."
    },
    {
      title: "Scagaire Stoc &amp; Insamhl&oacute;ir",
      desc: "Scag 600+ stoc agus backtest strait&eacute;is&iacute; portaf&oacute;il len &aacute;r insamhl&oacute;ir what-if."
    }
  ],
  voucherTitle: "Tairiscint eisiach",
  voucherDiscountDisplay: "75% LAC&Aacute;ID",
  voucherApply: "Bain &uacute;s&aacute;id as an gc&oacute;d ag an seice&aacute;il amach:",
  voucherValid: "Bail&iacute; ar Bifolio &amp; Trefolio &mdash; m&iacute;os&uacute;il n&oacute; bliant&uacute;il",
  ctaPrimary: "Uascthaigh anois &mdash; 75% lac&aacute;id",
  ctaSecondary: "Lean ar aghaidh le Folio",
  tipText: "&#x1F4A1; <strong>Do phlean Folio</strong> cuims&iacute;onn suas le 15 sealbh&uacute;, 1 phortaf&oacute;il agus 5 ghlaoch AI/m&iacute;. Uascthaigh chun n&iacute;os m&oacute; a oscailt."
};

export const bifolioUpgrade: BifolioUpgradeStrings = {
  heading: "F&aacute;ilte go Bifolio!",
  paragraph: "T&aacute; do uasctha gn&iacute;omhach. Seo gach rud a d&#x27;oscail t&uacute; d&iacute;reach:",
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
  ctaPrimary: "Socraigh do Ch&eacute;ad Fhol&aacute;ireamh",
  ctaSecondary: "Roinnt do Phortaf&oacute;il",
  upsellText: "<strong>Ba mhaith leat n&iacute;os m&oacute;?</strong> Oscla&iacute;onn Trefolio bunfhadhbanna cuideachta, scagaire stoc, tuarasc&aacute;la&iacute; c&aacute;naigh, fol&aacute;ireamh WhatsApp agus sealbhuithe gan teorainn. <a href=\"{{base_url}}/profile?utm_source=email&utm_medium=lifecycle&utm_campaign=bifolio_upgrade\" style=\"color:#b45309;text-decoration:underline;font-weight:600;\">Foghlaim n&iacute;os m&oacute;</a>"
};

export const trefolioUpgrade: TrefolioUpgradeStrings = {
  heading: "F&aacute;ilte go Trefolio Pro!",
  paragraph: "T&aacute; rochtain ioml&aacute;n agat anois ar gach gn&eacute; de trefolio. Seo do threalamh ioml&aacute;n:",
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
  ctaPrimary: "Ini&uacute;ch L&eacute;argas AI",
  ctaSecondary: "F&eacute;ach ar Bhunfhadhbanna",
  communityText: "&#x1F31F; <strong>T&aacute; t&uacute; ar cheann de na ch&eacute;ad 500 ball Pro againn.</strong> Go raibh maith agat as creidi&uacute;int i trefolio. Crutha&iacute;onn do chuid aiseolais an ch&eacute;ad rud eile a th&oacute;g&aacute;ilimid."
};
