import type { WelcomeNoStocksStrings, WelcomeFreeStocksStrings, BifolioUpgradeStrings, TrefolioUpgradeStrings, TrialInvitationStrings, TrialExpiredStrings } from "../template-types";

export const welcomeNoStocks: WelcomeNoStocksStrings = {
  heading: "Tervetuloa trefolioon!",
  paragraph: "Tilisi on valmis. trefolio on lis&#228;lehti salkkuusi &mdash; kaikki mit&#228; tarvitset sijoituksiesi seuraamiseen, ymm&#228;rt&#228;miseen ja kasvattamiseen yhdess&#228; paikassa.",
  features: [
    {
      title: "Reaaliaikaiset kurssit",
      desc: "Liven hinnat Yahoo Financesta yli 60 p&#246;rssist&#228; maailmanlaajuisesti. N&#228;e salkkusi arvon p&#228;ivittyv&#228;n p&#228;iv&#228;n aikana."
    },
    {
      title: "Osinkojen seuranta",
      desc: "Automaattinen osinkojen tunnistus, vuositulojen ennusteet, tuotto kustannuksille ja kuukausittainen maksukalenteri."
    },
    {
      title: "AI-pohjainen analyysi",
      desc: "Kysy AI:ltamme mit&#228; tahansa osakkeesta &mdash; saa tulosanalyysi, kilpailijavertailut ja riskinarvioinnit. 5 ilmaista puhelua/kk."
    },
    {
      title: "Helppo tuonti",
      desc: "Tuo salkkusi yli 20 v&#228;litt&#228;j&#228;lt&#228; CSV-latauksen, Broker Sync yhdell&#228; klikkauksella tai AI-avustetun tuonnin kautta."
    },
    {
      title: "Hinnoitteluh&#228;lytykset",
      desc: "Saa ilmoitus, kun osakkeet saavuttavat tavoitehintasi. S&#228;hk&#246;posti- ja push-h&#228;lytykset saatavilla trefoliossa."
    },
    {
      title: "Edistyneet mittarit",
      desc: "Sharpe-suhde, maksimipoisto, volatiliteetti ja t&#228;ysi suorituskyvyn historia strategiasi mittaamiseen."
    },
    {
      title: "Fundamentaaliset &amp; &#228;lykkyys",
      desc: "Yritysrahoitus, sis&#228;piirikaupat, institutionaaliset omistajat ja uutisten sentimentti &mdash; kaikki yhdess&#228; n&#228;kym&#228;ss&#228;."
    },
    {
      title: "Osakesuodatin",
      desc: "Suodata 600+ osaketta 6 suodattimella ja 5 sis&#228;rakennetulla strategialla uusien mahdollisuuksien l&#246;yt&#228;miseksi."
    }
  ],
  ctaPrimary: "Lis&#228;&#228; ensimm&#228;inen osakkeesi",
  ctaSecondary: "Tutustu dashboardiin",
  tipText: "&#x1F4A1; <strong>Aloittaminen on helppoa:</strong> Lis&#228;&#228; vain yksi osake n&#228;d&#228;ksesi dashboardisi her&#228;&#228;v&#228;n eloon reaaliaikaisilla tiedoilla, kaavioilla ja AI-n&#228;kemyksill&#228;."
};

export const welcomeFreeStocks: WelcomeFreeStocksStrings = {
  heading: "Olet aloittanut loistavasti!",
  intro: "Olet lis&#228;nnyt ensimm&#228;iset osakkeesi &mdash; salkkusi dashboard seuraa nyt sijoituksiasi reaaliaikaisesti. T&#228;ss&#228; mit&#228; trefolio voi tehd&#228; puolestasi:",
  features: [
    {
      title: "Reaaliaikainen dashboard",
      desc: "Salkun arvo, p&#228;ivitt&#228;iset muutokset, allokaation jakautuminen ja suorituskyvyn kaaviot &mdash; kaikki p&#228;ivittyy liven&#228;."
    },
    {
      title: "Osinko-oivallukset",
      desc: "Vuositulojen ennusteet, tuoton seuranta ja kuukausittainen osinkokalenteri omistuksillesi."
    },
    {
      title: "AI-osakeanalyysi",
      desc: "Kysy AI:ltamme mit&#228; tahansa osakkeistasi. Saa tulosanalyysi, riskinarvioinnit ja kilpailija-oivallukset."
    },
    {
      title: "Hinnoitteluh&#228;lytykset",
      desc: "&#196;l&#228; missaa yht&#228;&#228;n hinnan liikett&#228;. Aseta h&#228;lytykset ja saa ilmoituksia s&#228;hk&#246;postilla tai pushilla."
    },
    {
      title: "Suorituskyvyn mittarit",
      desc: "Sharpe-suhde, maksimipoisto, TTWROR ja t&#228;ysi salkun kasvuhistoria mille tahansa ajanjaksolle."
    },
    {
      title: "Yrityksen fundamentaaliset",
      desc: "Tuloslaskelmat, taseet, kassavirta, sis&#228;piirikaupat ja institutionaaliset omistajat."
    },
    {
      title: "Osakesuodatin ja simulattori",
      desc: "Suodata 600+ osaketta ja testaa salkkustrategioita what-if-simulaattorillamme."
    }
  ],
  voucherTitle: "Eksklusiivinen tarjous",
  voucherDiscountDisplay: "75% ALE",
  voucherApply: "K&#228;yt&#228; koodia maksun yhteydess&#228;:",
  voucherValid: "kuukausittain tai vuosittain",
  ctaPrimary: "P&#228;ivit&#228; nyt &mdash; 75% alennus",
  ctaSecondary: "Tutustu dashboardiin",
  tipText: "&#x1F4A1; <strong>Aloittaminen on helppoa:</strong> Lis&#228;&#228; vain yksi osake n&#228;d&#228;ksesi dashboardisi her&#228;&#228;v&#228;n eloon reaaliaikaisilla tiedoilla, kaavioilla ja AI-n&#228;kemyksill&#228;."
};

export const bifolioUpgrade: BifolioUpgradeStrings = {
  heading: "Tervetuloa trefolioon!",
  paragraph: "P&#228;ivityksesi on aktiivinen. T&#228;ss&#228; kaikki mit&#228; juuri avasit:",
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
  ctaPrimary: "Asenna ensimm&#228;inen h&#228;lytyksesi",
  ctaSecondary: "Jaa salkkusi",
  upsellText: "<strong>Haluatko viel&#228; enemm&#228;n?</strong> trefolio avaa yritysten fundamentaalidatan, osakesuodattimen, veroraportit, WhatsApp-h&#228;lytykset ja rajattomat omistukset. <a href=\"{{base_url}}/profile?utm_source=email&utm_medium=lifecycle&utm_campaign=bifolio_upgrade\" style=\"color:#b45309;text-decoration:underline;font-weight:600;\">Lue lis&#228;&#228;</a>"
};

export const trefolioUpgrade: TrefolioUpgradeStrings = {
  heading: "Tervetuloa trefolio -palveluun!",
  paragraph: "Sinulla on nyt t&#228;ysi p&#228;&#228;sy kaikkiin trefolion tarjoamiin ominaisuuksiin. T&#228;ss&#228; koko ty&#246;kalupakkisi:",
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
  ctaPrimary: "Tutustu AI-analyysiin",
  ctaSecondary: "N&#228;yt&#228; fundamentaaliset",
  communityText: "&#x1F31F; <strong>Olet yksi ensimm&#228;isist&#228; 500 Pro-j&#228;senest&#228;mme.</strong> Kiitos, ett&#228; uskot trefolioon. Palautteesi vaikuttaa siihen, mit&#228; rakennamme seuraavaksi."
};

export const trialInvitation: TrialInvitationStrings = {
  heading: "Pro-kokeilusi odottaa",
  paragraph:
    "Hei {{display_name}}, olet rakentanut salkkuasi trefoliossa &mdash; kokeile nyt koko ty&#246;kalupakkia 7 p&#228;iv&#228;&#228;n, t&#228;ysin ilmaiseksi.",
  groups: [
    {
      label: "Data &amp; analyysi",
      items: [
        "Alpha Vantage -premiumdata",
        "Fundamentaalit: tuloslaskelma, tase, kassavirta",
        "Talouden indikaattorit -dashboard",
      ],
    },
    {
      label: "&#196;lykkyys",
      items: [
        "Uutissy&#246;te sentimenttianalyysill&#228;",
        "Sis&#228;piirikaupat &amp; institutionaaliset omistukset",
        "AI-analyysi: 30 puhelua/p&#228;iv&#228;, rajaton kuukaudessa",
      ],
    },
    {
      label: "Edistyneet ty&#246;kalut",
      items: [
        "Sharpe-suhde, maksimipoisto, volatiliteetti",
        "Koko salkun suorituskykyhistoria",
        "Osakesuodatin: 600+ osaketta, 6 suodatinta",
      ],
    },
    {
      label: "H&#228;lytykset &amp; rajat",
      items: [
        "WhatsApp- ja laiteilmoitukset",
        "Rajattomat hintah&#228;lytykset &amp; omistukset",
        "Enint&#228;&#228;n 5 salkkua",
      ],
    },
  ],
  ctaPrimary: "Aktivoi ilmainen kokeilusi",
  ctaSecondary: "Katso mit&#228; sis&#228;ltyy",
  disclaimer:
    "Luottokorttia ei tarvita. 7 p&#228;iv&#228;n j&#228;lkeen tilisi palaa Free-suunnitelmaan &mdash; ei yll&#228;tyksi&#228;.",
  signoffIntro:
    "Rakensin trefolion, koska halusin paremman tavan seurata omaa salkkuani. Toivon, ett&#228; nautit t&#228;ydest&#228; kokemuksesta.",
  signoffReply: "Kerro mit&#228; mielt&#228; olet &mdash; vastaa vain t&#228;h&#228;n s&#228;hk&#246;postiin.",
};

export const trialExpired: TrialExpiredStrings = {
  heading: "Pro-kokeilusi on p&#228;&#228;ttynyt",
  paragraph:
    "Hei {{display_name}}, 7 p&#228;iv&#228;n trefolio -kokeilusi on ohi. T&#228;ss&#228; mit&#228; tulet kaipaamaan:",
  features: [
    {
      title: "Edistynyt analytiikka",
      desc: "Sharpe-suhde, maksimipoisto, volatiliteetti ja t&#228;ysi kasvuhistoria",
    },
    {
      title: "AI-analyysi",
      desc: "30 puhelua/p&#228;iv&#228; syv&#228;ll&#228; osakeanalyysill&#228; ja salkun arvioinneilla",
    },
    {
      title: "Yrityksen fundamentaalit",
      desc: "Tuloslaskelmat, taseet, sis&#228;piirikaupat ja institutionaaliset omistukset",
    },
    {
      title: "Premium-h&#228;lytykset",
      desc: "WhatsApp-ilmoitukset, rajattomat h&#228;lytykset ja enint&#228;&#228;n 5 salkkua",
    },
  ],
  pricingNote: "Suunnitelmat alkavat &euro;4,99/kk. Voit peruuttaa milloin tahansa.",
  ctaPrimary: "Tilaa trefolio",
  ctaSecondary: "Katso hinnoittelu",
  signoffIntro:
    "Toivon, ett&#228; kokeilu antoi oikean maun siit&#228;, mit&#228; trefolio voi tehd&#228;. Jos sinulla on palautetta, haluaisin aidosti kuulla sen.",
  growthTitle: "Salkkusi kasvoi {{growth_pct}}% kokeilujakson aikana",
  growthDesc:
    "Pro-versiolla voit jatkaa yksityiskohtaisten suorituskykymittareiden seurantaa ja saada teko&auml;lyanalyysej&auml; seuraavista siirroistasi.",
  growthTitleDown: "Markkinat muuttuivat &mdash; salkkusi liikkui {{growth_pct}}% kokeilujakson aikana",
  growthDescDown: "Pro-versiolla saisit teko&auml;lyh&auml;lytyksi&auml; ja syvempi&auml; analyysej&auml; reagoidaksesi nopeammin markkinaliikkeisiin.",
};
