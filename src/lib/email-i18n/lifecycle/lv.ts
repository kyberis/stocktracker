import type { WelcomeNoStocksStrings, WelcomeFreeStocksStrings, BifolioUpgradeStrings, TrefolioUpgradeStrings } from "../template-types";

export const welcomeNoStocks: WelcomeNoStocksStrings = {
  heading: "Laipni lūdzam trefolio!",
  paragraph: "Jūsu konts ir gatavs. trefolio ir papildu lapa jūsu portfelim &mdash; viss, kas nepieciešams jūsu ieguldījumu izsekošanai, sapratnei un augšanai vienā vietā.",
  features: [
    {
      title: "Reāllaika kotācijas",
      desc: "Tiešraides cenas no Yahoo Finance vairāk nekā 60 biržās visā pasaulē. Skatiet portfeļa vērtības atjaunināšanos visu dienu."
    },
    {
      title: "Dividenžu uzskaite",
      desc: "Automātiska dividenžu noteikšana, gada ienākumu prognozes, ienesīgums uz izmaksām un ikmēneša maksājumu kalendārs."
    },
    {
      title: "AI balstīta analīze",
      desc: "Jautājiet mūsu AI par jebkuru akciju &mdash; iegūstiet rezultātu analīzi, konkurentu salīdzinājumus un riska novērtējumus. 5 bezmaksas zvanu/mēnesī."
    },
    {
      title: "Vienkāršs imports",
      desc: "Atnesiet portfeli no vairāk nekā 20 brokeru, izmantojot CSV augšupielādi, Broker Sync ar vienu klikšķi vai AI palīdzētu importu."
    },
    {
      title: "Cenu brīdinājumi",
      desc: "Saņemiet paziņojumu, kad akcijas sasniedz jūsu mērķa cenu. E-pasta un push brīdinājumi pieejami Bifolio."
    },
    {
      title: "Uzlabotas metrikas",
      desc: "Sharpe koeficients, maksimālais kritums, volatilitāte un pilna veiktspējas vēsture stratēģijas mērīšanai."
    },
    {
      title: "Fundamentālie dati &amp; inteliģence",
      desc: "Uzņēmuma finanšu dati, insider darījumi, institucionālie turējumi un ziņu sentiment &mdash; viss vienā skatījumā."
    },
    {
      title: "Akciju filtrs",
      desc: "Filtrējiet vairāk nekā 600 akciju ar 6 filtriem un 5 iebūvētām stratēģijām jaunu iespēju atklāšanai."
    }
  ],
  ctaPrimary: "Pievienojiet savu pirmo akciju",
  ctaSecondary: "Izpētiet paneli",
  tipText: "&#x1F4A1; <strong>Sākt ir viegli:</strong> Pievienojiet tikai vienu akciju, lai redzētu savu paneli atdzīvoties ar reāllaika datiem, diagrammām un AI ieskatiem."
};

export const welcomeFreeStocks: WelcomeFreeStocksStrings = {
  heading: "Esat lieliski sācis!",
  intro: "Esat pievienojis savas pirmās akcijas — portfeļa panelis tagad seko jūsu ieguldījumiem reāllaikā. Lūk, ko trefolio var darīt jūsu labā:",
  features: [
    {
      title: "Reāllaika panelis",
      desc: "Portfeļa vērtība, dienas izmaiņas, alokācijas sadalījums un veiktspējas diagrammas — viss atjauninās tiešraides."
    },
    {
      title: "Dividenžu ieskati",
      desc: "Gada ienākumu prognozes, ienesīguma izsekošana un ikmēneša dividenžu kalendārs jūsu pozīcijām."
    },
    {
      title: "AI akciju analīze",
      desc: "Jautājiet mūsu AI jebko par jūsu akcijām. Iegūstiet rezultātu analīzi, riska novērtējumus un konkurentu ieskatus."
    },
    {
      title: "Cenu brīdinājumi",
      desc: "Nepalaidiet garām nevienu cenu kustību. Iestatiet brīdinājumus un saņemiet paziņojumus e-pastā vai push."
    },
    {
      title: "Veiktspējas metrikas",
      desc: "Sharpe koeficients, maksimālais kritums, TTWROR un pilna portfeļa augšanas vēsture jebkuram periodam."
    },
    {
      title: "Uzņēmuma fundamentālie dati",
      desc: "Ienākumu pārskati, bilances, naudas plūsma, insider darījumi un institucionālie turējumi."
    },
    {
      title: "Akciju filtrs un simulators",
      desc: "Filtrējiet vairāk nekā 600 akciju un testējiet portfeļa stratēģijas ar mūsu what-if simulatoru."
    }
  ],
  voucherTitle: "Ekskluzīvs piedāvājums",
  voucherDiscountDisplay: "75% ATLAIDE",
  voucherApply: "Izmantojiet kodu maksājot:",
  voucherValid: "Derīgs Bifolio un Trefolio — ikmēneša vai gada",
  ctaPrimary: "Jauniniet tagad — 75% atlaide",
  ctaSecondary: "Turpināt ar Folio",
  tipText: "&#x1F4A1; <strong>Jūsu Folio plāns</strong> ietver līdz 15 pozīcijām, 1 portfeli un 5 AI zvanus/mēnesī. Jauniniet, lai atbloķētu vairāk."
};

export const bifolioUpgrade: BifolioUpgradeStrings = {
  heading: "Laipni lūdzam Bifolio!",
  paragraph: "Jūsu jauninājums ir aktīvs. Lūk, ko jūs tikko atbloķējāt:",
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
  ctaPrimary: "Iestatiet pirmo brīdinājumu",
  ctaSecondary: "Kopīgojiet savu portfeli",
  upsellText: "<strong>Vēlaties vēl vairāk?</strong> Trefolio atbloķē uzņēmumu fundamentālos datus, akciju filtru, nodokļu pārskatus, WhatsApp brīdinājumus un neierobežotus turējumus. <a href=\"{{base_url}}/profile?utm_source=email&utm_medium=lifecycle&utm_campaign=bifolio_upgrade\" style=\"color:#b45309;text-decoration:underline;font-weight:600;\">Uzziniet vairāk</a>"
};

export const trefolioUpgrade: TrefolioUpgradeStrings = {
  heading: "Laipni lūdzam Trefolio Pro!",
  paragraph: "Tagad jums ir pilna piekļuve visām trefolio funkcijām. Lūk jūsu pilnais rīku komplekts:",
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
  ctaPrimary: "Izpētiet AI ieskatus",
  ctaSecondary: "Skatīt fundamentālos datus",
  communityText: "&#x1F31F; <strong>Jūs esat viens no mūsu pirmajiem 500 Pro dalībniekiem.</strong> Paldies, ka ticējāt trefolio. Jūsu atgriezeniskā saite veido to, ko mēs būvējam tālāk."
};
