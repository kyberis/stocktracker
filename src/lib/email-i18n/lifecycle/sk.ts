import type { WelcomeNoStocksStrings, WelcomeFreeStocksStrings, BifolioUpgradeStrings, TrefolioUpgradeStrings } from "../template-types";

export const welcomeNoStocks: WelcomeNoStocksStrings = {
  heading: "Vitajte v trefolio!",
  paragraph: "V&aacute;&scaron; &uacute;čet je pripraven&yacute;. trefolio je ďal&scaron;&iacute; l&iacute;stok pre va&scaron;e portf&oacute;lio &mdash; v&scaron;etko, čo potrebujete na sledovanie, pochopenie a rast va&scaron;ich invest&iacute;ci&iacute; na jednom mieste.",
  features: [
    {
      title: "Kurzy v re&aacute;lnom &ccaron;ase",
      desc: "Živ&eacute; ceny z Yahoo Finance na viac ne&zcaron; 60 burz&aacute;ch po celom svete. Sledujte aktualiz&aacute;ciu hodnoty portf&oacute;lia počas dňa."
    },
    {
      title: "Sledovanie dividend",
      desc: "Automatick&aacute; detekcia dividend, ročn&eacute; projekcie pr&iacute;jmov, v&yacute;nos na n&aacute;klady a mesačn&yacute; kalend&aacute;r platieb."
    },
    {
      title: "Anal&yacute;za založen&aacute; na IA",
      desc: "Op&iacute;tajte sa na&scaron;ej IA na ak&uacute;koľvek akciu &mdash; z&iacute;skajte anal&yacute;zu v&yacute;sledkov, porovnania konkurencie a hodnotenia riz&iacute;k. 5 zadarmo volan&iacute;/mesiac."
    },
    {
      title: "Jednoduch&yacute; import",
      desc: "Prineste portf&oacute;lio z viac ne&zcaron; 20 brokerov cez nahr&aacute;vanie CSV, Broker Sync na jeden klik alebo import asistovan&yacute; IA."
    },
    {
      title: "Cenov&eacute; upozornenia",
      desc: "Buďte informovan&iacute;, keď akcie dosiahnu va&scaron;u cieľov&uacute; cenu. E-mailov&eacute; a push upozornenia dostupn&eacute; na Bifolio."
    },
    {
      title: "Pokročil&eacute; metriky",
      desc: "Sharpe pomer, maxim&aacute;lny drawdown, volatilita a pln&aacute; hist&oacute;ria v&yacute;konnosti na meranie va&scaron;ej strat&eacute;gie."
    },
    {
      title: "Fundament&aacute;ly &amp; inteligencia",
      desc: "Firemn&eacute; finančn&eacute; d&aacute;ta, insider obchody, inštit&uacute;cion&aacute;lne podiely a sentiment spr&aacute;v &mdash; v&scaron;etko v jednom prehľade."
    },
    {
      title: "Filtr akci&iacute;",
      desc: "Filtrujte viac ne&zcaron; 600 akci&iacute; so 6 filtrami a 5 vstavan&yacute;mi strat&eacute;giami na objavovanie nov&yacute;ch pr&iacute;ležitosť&iacute;."
    }
  ],
  ctaPrimary: "Pridajte svoju prv&uacute; akciu",
  ctaSecondary: "Presk&uacute;mať dashboard",
  tipText: "&#x1F4A1; <strong>Začať je jednoduch&eacute;:</strong> Pridajte len jednu akciu a uvid&iacute;te svoj dashboard ožiť s d&aacute;tami v re&aacute;lnom &ccaron;ase, grafmi a insightmi IA."
};

export const welcomeFreeStocks: WelcomeFreeStocksStrings = {
  heading: "M&aacute;te skvel&yacute; za&ccedil;iato&ccedil;!",
  intro: "Pridali ste svoje prv&eacute; akcie &mdash; dashboard portf&oacute;lia teraz sleduje va&scaron;e invest&iacute;cie v re&aacute;lnom &ccaron;ase. Tu je, čo pre v&aacute;s trefolio m&ocirc;&zcaron;e urobiť:",
  features: [
    {
      title: "Dashboard v re&aacute;lnom &ccaron;ase",
      desc: "Hodnota portf&oacute;lia, denn&eacute; zmeny, rozlo&zcaron;enie alok&aacute;cie a grafy v&yacute;konnosti &mdash; v&scaron;etko sa aktualizuje na &zcaron;ivo."
    },
    {
      title: "Insighty dividend",
      desc: "Ročn&eacute; projekcie pr&iacute;jmov, sledovanie v&yacute;nosu a mesačn&yacute; kalend&aacute;r dividend pre va&scaron;e poz&iacute;cie."
    },
    {
      title: "AI anal&yacute;za akci&iacute;",
      desc: "Op&iacute;tajte sa na&scaron;ej IA na čokoľvek ohľadom va&scaron;ich akci&iacute;. Z&iacute;skajte anal&yacute;zu v&yacute;sledkov, hodnotenia riz&iacute;k a konkurenčn&eacute; insighty."
    },
    {
      title: "Cenov&eacute; upozornenia",
      desc: "Nepreme&scaron;kajte žiadny cenov&yacute; pohyb. Nastavte upozornenia a buďte informovan&iacute; e-mailom alebo push."
    },
    {
      title: "Metriky v&yacute;konnosti",
      desc: "Sharpe pomer, maxim&aacute;lny drawdown, TTWROR a pln&aacute; hist&oacute;ria rastu portf&oacute;lia za ak&eacute;koľvek obdobie."
    },
    {
      title: "Firemn&eacute; fundament&aacute;ly",
      desc: "V&yacute;sledovky, rozvahy, cash flow, insider obchody a inštit&uacute;cion&aacute;lne podiely."
    },
    {
      title: "Filtr &amp; simul&aacute;tor akci&iacute;",
      desc: "Filtrujte viac ne&zcaron; 600 akci&iacute; a backtestujte strat&eacute;gie portf&oacute;lia s na&scaron;&iacute;m what-if simul&aacute;torom."
    }
  ],
  voucherTitle: "Exkluz&iacute;vna ponuka",
  voucherDiscountDisplay: "75% ZĽAVA",
  voucherApply: "Použite k&oacute;d pri platbe:",
  voucherValid: "Platn&eacute; na Bifolio a Trefolio &mdash; mesačne alebo ročne",
  ctaPrimary: "Upgradovať teraz &mdash; 75% zľava",
  ctaSecondary: "Pokračovať s Folio",
  tipText: "&#x1F4A1; <strong>V&aacute;&scaron; pl&aacute;n Folio</strong> zahŕňa a&zcaron; 15 poz&iacute;ci&iacute;, 1 portfolio a 5 volan&iacute; IA/mesiac. Upgradujte pre odomknutie viac."
};

export const bifolioUpgrade: BifolioUpgradeStrings = {
  heading: "Vitajte v Bifolio!",
  paragraph: "V&aacute;&scaron; upgrade je akt&iacute;vny. Tu je v&scaron;etko, čo ste pr&aacute;ve odomkli:",
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
  ctaPrimary: "Nastaviť prvé upozornenie",
  ctaSecondary: "Zdieľať portf&oacute;lio",
  upsellText: "<strong>Chcete e&scaron;te viac?</strong> Trefolio odomkne firemn&eacute; fundament&aacute;ly, filtr akci&iacute;, daňov&eacute; v&yacute;kazy, WhatsApp upozornenia a neobmedzen&eacute; poz&iacute;cie. <a href=\"{{base_url}}/profile?utm_source=email&utm_medium=lifecycle&utm_campaign=bifolio_upgrade\" style=\"color:#b45309;text-decoration:underline;font-weight:600;\">Zistiť viac</a>"
};

export const trefolioUpgrade: TrefolioUpgradeStrings = {
  heading: "Vitajte v Trefolio Pro!",
  paragraph: "Teraz m&aacute;te pln&yacute; pr&iacute;stup ku v&scaron;etk&yacute;m funkci&aacute;m trefolio. Tu je v&aacute;&scaron; kompletn&yacute; n&aacute;strojov&yacute; set:",
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
  ctaPrimary: "Presk&uacute;mať IA anal&yacute;zy",
  ctaSecondary: "Zobraziť fundament&aacute;ly",
  communityText: "&#x1F31F; <strong>Ste jedn&yacute;m z našich prv&yacute;ch 500 Pro členov.</strong> Ďakujeme, že ste v trefolio verili. Va&scaron;a sp&aacute;tn&aacute; v&aacute;zba utv&aacute;ri to, čo budujeme ďalej."
};
