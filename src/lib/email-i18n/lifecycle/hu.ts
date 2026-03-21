import type { WelcomeNoStocksStrings, WelcomeFreeStocksStrings, BifolioUpgradeStrings, TrefolioUpgradeStrings, TrialInvitationStrings, TrialExpiredStrings } from "../template-types";

export const welcomeNoStocks: WelcomeNoStocksStrings = {
  heading: "&Uuml;dv&ouml;z&ouml;l a trefoli&oacute;ban!",
  paragraph: "A fiókod k&eacute;sz. A trefolio a portf&oacute;li&oacute;d extra levele &mdash; minden, amire sz&uuml;ks&eacute;ged van a befektet&eacute;seid nyomon k&ouml;vet&eacute;s&eacute;hez, meg&eacute;rt&eacute;s&eacute;hez &eacute;s n&ouml;vel&eacute;s&eacute;hez egy helyen.",
  features: [
    {
      title: "Val&oacute;s idejű &aacute;rfolyamok",
      desc: "&Eacute;lő &aacute;rak a Yahoo Finance-t&oacute;l 60+ vil&aacute;gbeli tőzsd&eacute;n. L&aacute;sd a portf&oacute;li&oacute;d &eacute;rt&eacute;k&eacute;nek friss&uuml;l&eacute;s&eacute;t eg&eacute;sz nap."
    },
    {
      title: "Osztal&eacute;k k&ouml;vet&eacute;s",
      desc: "Automatikus osztal&eacute;k felismer&eacute;s, &eacute;ves bev&eacute;tel vet&uuml;letek, hozam a k&ouml;lts&eacute;gre &eacute;s havi fizet&eacute;si napt&aacute;r."
    },
    {
      title: "IA-alap&uacute; elemz&eacute;s",
      desc: "K&eacute;rd meg az IA-nkat b&aacute;rmely r&eacute;szv&eacute;nyről &mdash; kapj eredm&eacute;nyelemz&eacute;st, versenyt&aacute;rs-&ouml;sszehasonl&iacute;t&aacute;st &eacute;s kock&aacute;zatbecsl&eacute;st. 5 ingyenes h&iacute;v&aacute;s/h&oacute;nap."
    },
    {
      title: "Egyszerű import",
      desc: "Hozd be a portf&oacute;li&oacute;dat 20+ br&oacute;kertől CSV felt&ouml;lt&eacute;ssel, egykattint&aacute;sos Broker Sync-kel vagy IA-assziszt&aacute;lt importtal."
    },
    {
      title: "&Aacute;rfigyelő riaszt&aacute;sok",
      desc: "Kapj &eacute;rtes&iacute;t&eacute;st, amikor a r&eacute;szv&eacute;nyek el&eacute;rik a c&eacute;l&aacute;rat. E-mail &eacute;s push riaszt&aacute;sok el&eacute;rhetők a Bifolio-n."
    },
    {
      title: "Fejlett m&eacute;rősz&aacute;mok",
      desc: "Sharpe-ar&aacuteny, maxim&aacute;lis drawdown, volatilit&aacute;s &eacute;s teljes teljes&iacute;tm&eacute;nyt&ouml;rt&eacute;net a strat&eacute;gi&aacute;d m&eacute;r&eacute;s&eacute;hez."
    },
    {
      title: "Fundamentumok &amp; intelligencia",
      desc: "V&aacute;llalati p&eacute;nz&uuml;gyek, insider tranzakci&oacute;k, int&eacute;zm&eacute;nyi r&eacute;sztulajdonl&aacute;s &eacute;s h&iacute;r sentiment &mdash; mind egy n&eacute;zetben."
    },
    {
      title: "R&eacute;szv&eacute;ny szűrő",
      desc: "Szűrj 600+ r&eacute;szv&eacute;nyt 6 szűrővel &eacute;s 5 be&eacute;p&iacute;tett strat&eacute;gi&aacute;val az &uacute;j lehetős&eacute;gek felfedez&eacute;s&eacute;hez."
    }
  ],
  ctaPrimary: "Add hozz&aacute; az első r&eacute;szv&eacute;nyed",
  ctaSecondary: "Dashboard felfedez&eacute;se",
  tipText: "&#x1F4A1; <strong>Kezd&eacute;s egyszerű:</strong> Adj hozz&aacute; csak egy r&eacute;szv&eacute;nyt, hogy a dashboardod &eacute;ljen val&oacute;s idejű adatokkal, grafikonokkal &eacute;s IA insightokkal."
};

export const welcomeFreeStocks: WelcomeFreeStocksStrings = {
  heading: "Nagyszerű kezd&eacute;s!",
  intro: "Hozz&aacute;adtad az első r&eacute;szv&eacute;nyeidet &mdash; a portf&oacute;li&oacute; dashboard most val&oacute;s id&otilde;ben k&ouml;veti a befektet&eacute;seidet. Itt van, amit a trefolio tehet &eacute;rted:",
  features: [
    {
      title: "Val&oacute;s idejű dashboard",
      desc: "Portf&oacute;li&oacute; &eacute;rt&eacute;k, napi v&aacute;ltoz&aacute;sok, allok&aacute;ci&oacute; bont&aacute;s &eacute;s teljes&iacute;tm&eacute;ny grafikonok &mdash; minden &eacute;lőben frissül."
    },
    {
      title: "Osztal&eacute;k insightok",
      desc: "&Eacute;ves bev&eacute;tel vet&uuml;letek, hozam k&ouml;vet&eacute;s &eacute;s havi osztal&eacute;k napt&aacute;r a poz&iacute;ci&oacute;idhoz."
    },
    {
      title: "IA r&eacute;szv&eacute;ny elemz&eacute;s",
      desc: "K&eacute;rd meg az IA-nkat b&aacute;rmit a r&eacute;szv&eacute;nyeidről. Kapj eredm&eacute;nyelemz&eacute;st, kock&aacute;zatbecsl&eacute;st &eacute;s versenyt&aacute;rs insightokat."
    },
    {
      title: "&Aacute;rfigyelő riaszt&aacute;sok",
      desc: "Ne maradj le egyetlen &aacute;rmozdul&aacute;sról sem. &Aacute;ll&iacute;ts be riaszt&aacute;sokat &eacute;s kapj &eacute;rtes&iacute;t&eacute;st e-mailben vagy push-k&eacute;nt."
    },
    {
      title: "Teljes&iacute;tm&eacute;ny m&eacute;rősz&aacute;mok",
      desc: "Sharpe-ar&aacuteny, maxim&aacute;lis drawdown, TTWROR &eacute;s teljes portf&oacute;li&oacute; n&ouml;veked&eacute;st&ouml;rt&eacute;net b&aacute;rmely id&otilde;szakra."
    },
    {
      title: "V&aacute;llalati fundamentumok",
      desc: "Eredménykimutat&aacute;sok, m&eacute;rlegek, p&eacute;nzforgalmi kimutat&aacute;s, insider tranzakci&oacute;k &eacute;s int&eacute;zm&eacute;nyi r&eacute;sztulajdonl&aacute;s."
    },
    {
      title: "R&eacute;szv&eacute;ny szűrő &amp; szimul&aacute;tor",
      desc: "Szűrj 600+ r&eacute;szv&eacute;nyt &eacute;s backtestelj portf&oacute;li&oacute; strat&eacute;gi&aacute;kat a what-if szimul&aacute;torunkkal."
    }
  ],
  voucherTitle: "Exkluz&iacute;v aj&aacute;nlat",
  voucherDiscountDisplay: "75% KEDVEZM&Eacute;NY",
  voucherApply: "Haszn&aacute;ld a k&oacute;dot fizet&eacute;skor:",
  voucherValid: "&Eacute;rv&eacute;nyes Bifolio &amp; Trefolio &mdash; havi vagy &eacuteves",
  ctaPrimary: "Friss&iacute;ts most &mdash; 75% kedvezm&eacute;ny",
  ctaSecondary: "Folytat&aacute;s Folio-val",
  tipText: "&#x1F4A1; <strong>A Folio csomagod</strong> legfeljebb 15 poz&iacute;ci&oacute;t, 1 portf&oacute;li&oacute;t &eacute;s 5 IA h&iacute;v&aacute;st/h&oacute;nap tartalmaz. Friss&iacute;ts t&ouml;bb felold&aacute;s&aacute;hoz."
};

export const bifolioUpgrade: BifolioUpgradeStrings = {
  heading: "&Uuml;dv&ouml;z&ouml;l a Bifolio-ban!",
  paragraph: "A friss&iacute;t&eacute;s akt&iacute;v. Itt van minden, amit most nyitott&aacute;l ki:",
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
  ctaPrimary: "Első riaszt&aacute;s be&aacute;ll&iacute;t&aacute;sa",
  ctaSecondary: "Portf&oacute;li&oacute; megoszt&aacute;sa",
  upsellText: "<strong>M&eacute;g t&ouml;bbre v&aacute;gy?</strong> A Trefolio kinyitja a v&aacute;llalati fundamentumokat, r&eacute;szv&eacute;ny szűrőt, ad&oacute;jelent&eacute;seket, WhatsApp riaszt&aacute;sokat &eacute;s korl&aacute;tlan poz&iacute;ci&oacute;kat. <a href=\"{{base_url}}/profile?utm_source=email&utm_medium=lifecycle&utm_campaign=bifolio_upgrade\" style=\"color:#b45309;text-decoration:underline;font-weight:600;\">Tudj meg t&ouml;bbet</a>"
};

export const trefolioUpgrade: TrefolioUpgradeStrings = {
  heading: "&Uuml;dv&ouml;z&ouml;l a Trefolio Pro-ban!",
  paragraph: "Most teljes hozz&aacute;f&eacute;r&eacute;sed van a trefolio minden funkci&oacute;j&aacute;hoz. Itt a teljes eszk&ouml;zkészleted:",
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
  ctaPrimary: "IA elemz&eacute;sek felfedez&eacute;se",
  ctaSecondary: "Fundamentumok megtekint&eacute;se",
  communityText: "&#x1F31F; <strong>Az első 500 Pro tagunk egyike vagy.</strong> K&ouml;sz&ouml;nj&uuml;k, hogy hitt&eacute;l a trefoli&oacute;ban. A visszajelz&eacute;sed alak&iacute;tja, amit ezut&aacute;n ép&iacute;t&uuml;nk."
};

export const trialInvitation: TrialInvitationStrings = {
  heading: "A Pro pr&oacute;b&aacute;id&otilde;d v&aacute;r",
  paragraph:
    "Szia {{display_name}}, a trefoli&oacute;ban &eacute;p&iacute;ted a portf&oacute;li&oacute;dat &mdash; most 7 napig teljesen ingyen kipr&oacute;b&aacute;lhatod a teljes eszk&ouml;zt&aacute;rat.",
  groups: [
    {
      label: "Adatok &amp; elemz&eacute;s",
      items: [
        "Alpha Vantage pr&eacute;mium adatok",
        "Fundamentumok: eredm&eacute;nykimutat&aacute;s, m&eacute;rleg, p&eacute;nz&aacute;raml&aacute;s",
        "Gazdas&aacute;gi mutat&oacute;k ir&aacute;ny&iacute;t&oacute;pultja",
      ],
    },
    {
      label: "Intelligencia",
      items: [
        "H&iacute;rfolyam hangulatelemz&eacute;ssel",
        "Insider tranzakci&oacute;k &amp; int&eacute;zm&eacute;nyi r&eacute;sztulajdonl&aacute;s",
        "AI elemz&eacute;s: 30 h&iacute;v&aacute;s/nap, korl&aacute;tlan havi",
      ],
    },
    {
      label: "Halad&oacute; eszk&ouml;z&ouml;k",
      items: [
        "Sharpe-ar&aacuteny, maxim&aacute;lis drawdown, volatilit&aacute;s",
        "Teljes portf&oacute;li&oacute; teljes&iacute;tm&eacute;nyt&ouml;rt&eacute;net",
        "R&eacute;szv&eacute;ny sz&uuml;rő: 600+ r&eacute;szv&eacute;ny, 6 sz&uuml;rő",
      ],
    },
    {
      label: "Riaszt&aacute;sok &amp; korl&aacute;tok",
      items: [
        "WhatsApp &amp; eszk&ouml;z &eacute;rtes&iacute;t&eacute;sek",
        "Korl&aacute;tlan &aacute;rriaszt&aacute;s &amp; poz&iacute;ci&oacute;k",
        "Ak&aacute;r 5 portf&oacute;li&oacute;",
      ],
    },
  ],
  ctaPrimary: "Aktiv&aacute;ld az ingyenes pr&oacute;b&aacute;id&otilde;t",
  ctaSecondary: "N&eacute;zd meg, mi tartozik bele",
  disclaimer:
    "Bankk&aacute;rtya nem sz&uuml;ks&eacute;ges. 7 nap ut&aacute;n a fi&oacute;kod visszav&aacute;lt az Ingyenes csomagra &mdash; meglepet&eacute;sek n&eacute;lk&uuml;l.",
  signoffIntro:
    "Az&eacute;rt &eacute;p&iacute;tettem a trefoli&oacute;t, mert jobb m&oacute;dot kerestem a saj&aacute;t portf&oacute;li&oacute;m k&ouml;vet&eacute;s&eacute;re. Rem&eacute;lem, te is &eacute;lvezed a teljes &eacute;lm&eacute;nyt.",
  signoffReply: "&Iacute;rd meg, mit gondolsz &mdash; egyszer&uuml;en v&aacute;laszolj erre az e-mailre.",
};

export const trialExpired: TrialExpiredStrings = {
  heading: "A Pro pr&oacute;b&aacute;id&otilde;d v&eacute;get &eacute;rt",
  paragraph:
    "Szia {{display_name}}, a 7 napos Trefolio Pro pr&oacute;b&aacute;id&otilde;d lej&aacute;rt. Ezt fogod hi&aacute;nyozni:",
  features: [
    {
      title: "Fejlett analitika",
      desc: "Sharpe-ar&aacuteny, maxim&aacute;lis drawdown, volatilit&aacute;s &eacute;s teljes n&ouml;veked&eacute;st&ouml;rt&eacute;net",
    },
    {
      title: "AI elemz&eacute;s",
      desc: "30 h&iacute;v&aacute;s/nap m&eacute;ly r&eacute;szv&eacute;ny betekint&eacute;sekkel &eacute;s portf&oacute;li&oacute; &eacute;rt&eacute;kel&eacute;sekkel",
    },
    {
      title: "V&aacute;llalati fundamentumok",
      desc: "Eredm&eacute;nykimutat&aacute;sok, m&eacute;rlegek, insider tranzakci&oacute;k &eacute;s int&eacute;zm&eacute;nyi r&eacute;sztulajdonl&aacute;s",
    },
    {
      title: "Pr&eacute;mium riaszt&aacute;sok",
      desc: "WhatsApp &eacute;rtes&iacute;t&eacute;sek, korl&aacute;tlan riaszt&aacute;s &eacute;s ak&aacute;r 5 portf&oacute;li&oacute;",
    },
  ],
  pricingNote: "A csomagok &euro;4.99/h&oacute;-t&oacute;l kezd&otilde;dnek. B&aacute;rmikor lemondhat&oacute;.",
  ctaPrimary: "Feliratkozom a Trefolio Pro-ra",
  ctaSecondary: "Megn&eacute;zem az &aacute;rakat",
  signoffIntro:
    "Rem&eacute;lem, a pr&oacute;b&aacute;id&otilde; val&oacute;di &iacute;zel&iacute;t&otilde;t adott abb&oacute;l, mit tud a trefolio. Ha van visszajelz&eacute;sed, &otilde;szint&eacute;n sz&iacute;vesen hallan&aacute;m.",
  growthTitle:
    "A portf&oacute;li&oacute;d {{growth_pct}}%-ot n&odblac;tt a pr&oacute;baid&odblac;szak alatt",
  growthDesc:
    "A Pro-val tov&aacute;bbra is k&ouml;vetheted a r&eacute;szletes teljes&iacute;tm&eacute;nymutat&oacute;kat, &eacute;s AI-elemz&eacute;seket kaphatsz a k&ouml;vetkez&odblac; l&eacute;p&eacute;seidre.",
  growthTitleDown: "A piacok v&aacute;ltoztak &mdash; a portf&oacute;li&oacute;d {{growth_pct}}%-ot mozdult a pr&oacute;baid&odblac;szak alatt",
  growthDescDown: "A Pro-val AI-figyelmeztet&eacute;seket &eacute;s m&eacute;lyebb elemz&eacute;seket kapn&aacute;l, hogy gyorsabban reag&aacute;lj a piaci mozg&aacute;sokra.",
};
