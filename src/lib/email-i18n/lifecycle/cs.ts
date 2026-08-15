import type { WelcomeNoStocksStrings, WelcomeFreeStocksStrings, BifolioUpgradeStrings, TrefolioUpgradeStrings, TrialInvitationStrings, TrialExpiredStrings } from "../template-types";

export const welcomeNoStocks: WelcomeNoStocksStrings = {
  heading: "V&iacute;tejte v trefolio!",
  paragraph: "V&aacute;&scaron; &uacute;čet je p&rcaron;&iacute;praven. trefolio je dal&scaron;&iacute; l&iacute;stek pro va&scaron;e portfolio &mdash; v&scaron;e, co pot&rcaron;ebujete ke sledov&aacute;n&iacute;, pochopen&iacute; a r&uacute;stu va&scaron;ich investic na jednom m&iacute;stě.",
  features: [
    {
      title: "Kurzy v re&aacute;ln&eacute;m &ccaron;ase",
      desc: "&Zcaron;iv&eacute; ceny z Yahoo Finance na v&iacute;ce ne&zcaron; 60 burz&aacute;ch po cel&eacute;m sv&ecaron;tě. Sledujte aktualizaci hodnoty portf&oacute;lia během dne."
    },
    {
      title: "Sledov&aacute;n&iacute; dividend",
      desc: "Automatick&aacute; detekce dividend, ročn&iacute; projekce p&rcaron;&iacute;jmů, v&yacute;nos na n&aacute;klady a m&ecirc;s&iacute;čn&iacute; kalend&aacute;&rcaron; plateb."
    },
    {
      title: "Anal&yacute;za založen&aacute; na IA",
      desc: "Zeptejte se na&scaron;e IA na jakoukoli akcii &mdash; z&iacute;skejte anal&yacute;zu v&yacute;sledků, srovn&aacute;n&iacute; konkurence a hodnocen&iacute; rizik. 5 zdarma vol&aacute;n&iacute;/měs&iacute;c."
    },
    {
      title: "Snadn&yacute; import",
      desc: "Přineste portf&oacute;lio z v&iacute;ce ne&zcaron; 20 brokerů přes nahr&aacute;v&aacute;n&iacute; CSV, Broker Sync na jeden klik nebo import asistovan&yacute; IA."
    },
    {
      title: "Cenov&aacute; upozornění",
      desc: "Buďte informov&aacute;ni, kdy akcie dos&aacute;hnou va&scaron;eho c&iacute;lov&eacute;ho ceny. E-mailov&aacute; a push upozornění dostupn&aacute; na trefolio."
    },
    {
      title: "Pokročil&eacute; metriky",
      desc: "Sharpe poměr, maxim&aacute;ln&iacute; drawdown, volatilita a pln&aacute; historie v&yacute;konnosti pro měřen&iacute; va&scaron;e strategie."
    },
    {
      title: "Fundament&aacute;ly &amp; inteligence",
      desc: "Firemn&iacute; financn&iacute; data, insider obchody, institucion&aacute;ln&iacute; pod&iacute;ly a sentiment zpr&aacute;v &mdash; vše v jednom p&rcaron;ehledu."
    },
    {
      title: "Filtr akci&iacute;",
      desc: "Filtrujte v&iacute;ce ne&zcaron; 600 akci&iacute; se 6 filtry a 5 vestavěnými strategiemi pro objevov&aacute;n&iacute; nov&yacute;ch příležitost&iacute;."
    }
  ],
  ctaPrimary: "Přidejte svou prvn&iacute; akcii",
  ctaSecondary: "Prozkoumat dashboard",
  tipText: "&#x1F4A1; <strong>Zač&iacute;t je snadn&eacute;:</strong> Přidejte jen jednu akcii a uvid&iacute;te svůj dashboard ož&iacute;t s daty v re&aacute;ln&eacute;m &ccaron;ase, grafy a insighty IA."
};

export const welcomeFreeStocks: WelcomeFreeStocksStrings = {
  heading: "M&aacute;te skvěl&yacute; za&ccedil;&aacute;tek!",
  intro: "Přidali jste sv&eacute; prvn&iacute; akcie &mdash; dashboard portf&oacute;lia nyn&iacute; sleduje va&scaron;e investice v re&aacute;ln&eacute;m &ccaron;ase. Zde je, co pro v&aacute;s trefolio může ud&ecaron;lat:",
  features: [
    {
      title: "Dashboard v re&aacute;ln&eacute;m &ccaron;ase",
      desc: "Hodnota portf&oacute;lia, denn&iacute; zm&ecaron;ny, rozlo&zcaron;en&iacute; alokace a grafy v&yacute;konnosti &mdash; v&scaron;e se aktualizuje na &zcaron;ivo."
    },
    {
      title: "Insighty dividend",
      desc: "Ročn&iacute; projekce p&rcaron;&iacute;jmů, sledov&aacute;n&iacute; v&yacute;nosu a m&ecirc;s&iacute;čn&iacute; kalend&aacute;&rcaron; dividend pro va&scaron;e pozice."
    },
    {
      title: "AI anal&yacute;za akci&iacute;",
      desc: "Zeptejte se na&scaron;e IA na cokoli ohledně va&scaron;ich akci&iacute;. Z&iacute;skejte anal&yacute;zu v&yacute;sledků, hodnocen&iacute; rizik a konkurenčn&iacute; insighty."
    },
    {
      title: "Cenov&aacute; upozornění",
      desc: "Neprome&scaron;kajte žádný cenov&yacute; pohyb. Nastavte upozornění a buďte informov&aacute;ni e-mailem nebo push."
    },
    {
      title: "Metry v&yacute;konnosti",
      desc: "Sharpe poměr, maxim&aacute;ln&iacute; drawdown, TTWROR a pln&aacute; historie r&uacute;stu portf&oacute;lia za jak&eacute;koli obdob&iacute;."
    },
    {
      title: "Firemn&iacute; fundament&aacute;ly",
      desc: "V&yacute;sledovky, rozvahy, cash flow, insider obchody a institucion&aacute;ln&iacute; pod&iacute;ly."
    },
    {
      title: "Filtr &amp; simul&aacute;tor akci&iacute;",
      desc: "Filtrujte v&iacute;ce ne&zcaron; 600 akci&iacute; a backtestujte strategie portf&oacute;lia s na&scaron;&iacute;m what-if simul&aacute;torem."
    }
  ],
  voucherTitle: "Exkluzivn&iacute; nab&iacute;dka",
  voucherDiscountDisplay: "75% SLEVA",
  voucherApply: "Použijte k&oacute;d při platbě:",
  voucherValid: "m&ecirc;s&iacute;čně nebo ročn&iacute;",
  ctaPrimary: "Upgradovat nyn&iacute; &mdash; 75% sleva",
  ctaSecondary: "Prozkoumat dashboard",
  tipText: "&#x1F4A1; <strong>Zač&iacute;t je snadn&eacute;:</strong> Přidejte jen jednu akcii a uvid&iacute;te svůj dashboard ož&iacute;t s daty v re&aacute;ln&eacute;m &ccaron;ase, grafy a insighty IA."
};

export const bifolioUpgrade: BifolioUpgradeStrings = {
  heading: "V&iacute;tejte v trefolio!",
  paragraph: "V&aacute;&scaron; upgrade je aktivn&iacute;. Zde je v&scaron;echno, co jste pr&aacute;vě odemkli:",
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
  ctaPrimary: "Nastavit první upozornění",
  ctaSecondary: "Sd&iacute;let portf&oacute;lio",
  upsellText: "<strong>Chcete je&scaron;tě v&iacute;ce?</strong> trefolio odemkne firemn&iacute; fundament&aacute;ly, filtr akci&iacute;, daňov&eacute; v&yacute;kazy, WhatsApp upozornění a neomezen&eacute; pozice. <a href=\"{{base_url}}/profile?utm_source=email&utm_medium=lifecycle&utm_campaign=bifolio_upgrade\" style=\"color:#b45309;text-decoration:underline;font-weight:600;\">Zjistit v&iacute;ce</a>"
};

export const trefolioUpgrade: TrefolioUpgradeStrings = {
  heading: "V&iacute;tejte v trefolio!",
  paragraph: "Nyn&iacute; m&aacute;te pln&yacute; př&iacute;stup ke v&scaron;em funkc&iacute;m trefolio. Zde je v&aacute;&scaron; kompletn&iacute; n&aacute;strojov&yacute; set:",
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
  ctaPrimary: "Prozkoumat IA anal&yacute;zy",
  ctaSecondary: "Zobrazit fundament&aacute;ly",
  communityText: "&#x1F31F; <strong>Jste jedním z našich prvních 500 Pro členů.</strong> Děkujeme, že jste v trefolio věřili. Va&scaron;e zpětn&aacute; vazba utv&aacute;ř&iacute; to, co budujeme d&aacute;le."
};

export const trialInvitation: TrialInvitationStrings = {
  heading: "Va&#x161;e zku&#x161;ebn&#xed; verze Pro &#x10d;ek&#xe1;",
  paragraph:
    "Ahoj, {{display_name}}, budujete sv&#xe9; portfolio v trefolio &mdash; vyzkou&#x161;ejte celou sadu n&#xe1;stroj&#x16f; na 7 dn&#xed; zcela zdarma.",
  groups: [
    {
      label: "Data &amp; anal&#xfd;za",
      items: [
        "Pr&#xe9;miov&#xe1; data Alpha Vantage",
        "Fundament&#xe1;ly: v&#xfd;sledovka, rozvaha, cash flow",
        "P&#x159;ehled ekonomick&#xfd;ch indik&#xe1;tor&#x16f;",
      ],
    },
    {
      label: "Inteligence",
      items: [
        "Zpr&#xe1;vy s anal&#xfd;zou sentimentu",
        "Insider obchody &amp; institucion&#xe1;ln&#xed; pod&#xed;ly",
        "Anal&#xfd;za AI: 30 vol&#xe1;n&#xed;/den, neomezen&#x11b; m&#x11b;s&#xed;&#x10d;n&#x11b;",
      ],
    },
    {
      label: "Pokro&#x10d;il&#xe9; n&#xe1;stroje",
      items: [
        "Sharpe&#x16f;v pom&#x11b;r, maxim&#xe1;ln&#xed; drawdown, volatilita",
        "Pln&#xe1; historie v&#xfd;konnosti portfolia",
        "Filtr akci&#xed;: 600+ akci&#xed;, 6 filtr&#x16f;",
      ],
    },
    {
      label: "Upozorn&#x11b;n&#xed; &amp; limity",
      items: [
        "Ozn&#xe1;men&#xed; WhatsApp a za&#x159;&#xed;zen&#xed;",
        "Neomezen&#xe9; cenov&#xe9; alerty &amp; pozice",
        "A&#x17e; 5 portfoli&#xed;",
      ],
    },
  ],
  ctaPrimary: "Aktivovat zku&#x161;ebn&#xed; verzi zdarma",
  ctaSecondary: "Co je sou&#x10d;&#xe1;st&#xed;",
  disclaimer:
    "Nen&#xed; pot&#x159;eba kreditn&#xed; karta. Po 7 dnech se v&#xe1;&#x161; &#xfa;&#x10d;et vr&#xe1;t&#xed; na pl&#xe1;n Free &mdash; bez p&#x159;ekvapen&#xed;.",
  signoffIntro:
    "trefolio jsem vytvo&#x159;il, proto&#x17e;e jsem cht&#x11b;l lep&#x161;&#xed; zp&#x16f;sob, jak sledovat vlastn&#xed; portfolio. Douf&#xe1;m, &#x17e;e si u&#x17e;ijete pln&#xfd; z&#xe1;&#x17e;itek.",
  signoffReply:
    "Dejte mi v&#x11b;d&#x11b;t, co si mysl&#xed;te &mdash; sta&#x10d;&#xed; odpov&#x11b;d&#x11b;t na tento e-mail.",
};

export const trialExpired: TrialExpiredStrings = {
  heading: "Va&#x161;e zku&#x161;ebn&#xed; verze Pro skon&#x10d;ila",
  paragraph:
    "Ahoj, {{display_name}}, va&#x161;e 7denn&#xed; zku&#x161;ebn&#xed; verze trefolio skon&#x10d;ila. O to p&#x159;ijdete:",
  features: [
    {
      title: "Pokro&#x10d;il&#xe1; analytika",
      desc: "Sharpe&#x16f;v pom&#x11b;r, maxim&#xe1;ln&#xed; drawdown, volatilita a pln&#xe1; historie r&#x16f;stu",
    },
    {
      title: "Anal&#xfd;za AI",
      desc: "30 vol&#xe1;n&#xed; denn&#x11b; s hlubok&#xfd;mi insighty k akci&#xed;m a hodnocen&#xed;m portfolia",
    },
    {
      title: "Firemn&#xed; fundament&#xe1;ly",
      desc: "V&#xfd;sledovky, rozvahy, insider obchody a institucion&#xe1;ln&#xed; pod&#xed;ly",
    },
    {
      title: "Pr&#xe9;miov&#xe1; upozorn&#x11b;n&#xed;",
      desc: "Ozn&#xe1;men&#xed; WhatsApp, neomezen&#xe9; alerty a a&#x17e; 5 portfoli&#xed;",
    },
  ],
  pricingNote: "Pl&#xe1;ny za&#x10d;&#xed;naj&#xed; na &euro;4,99/m&#x11b;s&#xed;c. Zru&#x161;it m&#x16f;&#x17e;ete kdykoli.",
  ctaPrimary: "P&#x159;edplatit trefolio",
  ctaSecondary: "Zobrazit ceny",
  signoffIntro:
    "Douf&#xe1;m, &#x17e;e zku&#x161;ebn&#xed; verze v&#xe1;m dala opravdovou p&#x159;edstavu o tom, co trefolio um&#xed;. Pokud m&#xe1;te zp&#x11b;tnou vazbu, r&#xe1;d ji usly&#x161;&#xed;m.",
  growthTitle:
    "Va&scaron;e portfolio vzrostlo o {{growth_pct}}% b&ecaron;hem zku&scaron;ebn&iacute;ho obdob&iacute;",
  growthDesc:
    "S Pro m&uring;&zcaron;ete nad&aacute;le sledovat podrobn&eacute; metriky v&yacute;konnosti a z&iacute;sk&aacute;vat AI anal&yacute;zy va&scaron;ich dal&scaron;&iacute;ch krok&uring;.",
  growthTitleDown: "Trhy se zm&ecaron;nily &mdash; va&scaron;e portfolio se posunulo o {{growth_pct}}% b&ecaron;hem zku&scaron;ebn&iacute;ho obdob&iacute;",
  growthDescDown: "S Pro byste m&ecaron;li AI upozorn&ecaron;n&iacute; a hlub&scaron;&iacute; anal&yacute;zy pro rychlej&scaron;&iacute; reakci na pohyby trhu.",
};
