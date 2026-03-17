import type { WelcomeNoStocksStrings, WelcomeFreeStocksStrings, BifolioUpgradeStrings, TrefolioUpgradeStrings } from "../template-types";

export const welcomeNoStocks: WelcomeNoStocksStrings = {
  heading: "Сардэчна запрашаем у trefolio!",
  paragraph: "Ваш акаўнт гатоў. trefolio — гэта дадатковы ліст для вашага партфеля. Усё неабходнае для адсочвання, разумення і росту вашых інвестыцый у адным месцы.",
  features: [
    {
      title: "Каціроўкі ў рэальным часе",
      desc: "Прамыя цэны з Yahoo Finance на больш чым 60 біржах па ўсім свеце. Бачце абнаўленне вартасці партфеля на працягу дня."
    },
    {
      title: "Адсочванне дывідэндаў",
      desc: "Аўтаматычнае выяўленне дывідэндаў, гадавыя прагнозы даходу, даходнасць на сабекошт і месячны каляндар выплат."
    },
    {
      title: "Аналіз на аснове AI",
      desc: "Пытайце наш AI пра любую акцыю — атрымайце аналіз вынікаў, параўнанні з канкурэнтамі і ацэнкі рызыкі. 5 бясплатных званкоў/месяц."
    },
    {
      title: "Лёгкі імпорт",
      desc: "Прыносіце партфель з больш чым 20 брокераў праз CSV-загрузку, Broker Sync адным клікам або імпорт з падтрымкай AI."
    },
    {
      title: "Цэнавыя апавяшчэнні",
      desc: "Атрымлівайце апавяшчэнні, калі акцыі дасягаюць цэлевай цэны. Апавяшчэнні email і push даступны ў Bifolio."
    },
    {
      title: "Прасунутыя метрыкі",
      desc: "Каэфіцыент Шарпа, максімальны прапад, волатыльнасць і поўная гісторыя эфектыўнасці для вымярэння вашай стратэгіі."
    },
    {
      title: "Асновы і інтэлект",
      desc: "Карпаратыўныя фінансы, інсайдарскія здзелкі, інстытуцыйныя пазіцыі і сентымент навін — усё ў адным аглядзе."
    },
    {
      title: "Фільтр акцый",
      desc: "Фільтруйце больш чым 600 акцый з 6 фільтрамі і 5 убудаванымі стратэгіямі для выяўлення новых магчымасцей."
    }
  ],
  ctaPrimary: "Дадайце першую акцыю",
  ctaSecondary: "Праглядзіце панэль кіравання",
  tipText: "&#x1F4A1; <strong>Пачаць лёгка:</strong> Дадайце толькі адну акцыю, каб убачыць панэль кіравання з данымі ў рэальным часе, графікамі і іnsights AI."
};

export const welcomeFreeStocks: WelcomeFreeStocksStrings = {
  heading: "Вы выдатна пачалі!",
  intro: "Вы дадалі першыя акцыі — панэль партфеля цяпер адсочвае вашыя інвестыцыі ў рэальным часе. Вось што trefolio можа зрабіць для вас:",
  features: [
    {
      title: "Панэль у рэальным часе",
      desc: "Вартасць партфеля, штодзённыя змены, размеркаванне алокацыі і графікі эфектыўнасці — усё абнаўляецца ў прамым эфіры."
    },
    {
      title: "Інсайты па дывідэндах",
      desc: "Гадавыя прагнозы даходу, адсочванне даходнасці і месячны каляндар дывідэндаў для вашых пазіцый."
    },
    {
      title: "AI-аналіз акцый",
      desc: "Пытайце наш AI што заўгодна пра вашыя акцыі. Атрымайце аналіз вынікаў, ацэнкі рызыкі і канкурэнтныя інсайты."
    },
    {
      title: "Цэнавыя апавяшчэнні",
      desc: "Не прапусціце ніводнага руху цэны. Наладзьце апавяшчэнні і атрымлівайце іх па электроннай пошце або push."
    },
    {
      title: "Метрыкі эфектыўнасці",
      desc: "Каэфіцыент Шарпа, максімальны прапад, TTWROR і поўная гісторыя росту партфеля за любы перыяд."
    },
    {
      title: "Фундаменталы кампаній",
      desc: "Справаздачы аб даходах, балансы, грашовы паток, інсайдарскія здзелкі і інстытуцыйныя пазіцыі."
    },
    {
      title: "Фільтр і сімулятар акцый",
      desc: "Фільтруйце больш за 600 акцый і тэстуйце стратэгіі партфеля з нашым сімулятарам what-if."
    }
  ],
  voucherTitle: "Эксклюзіўная прапанова",
  voucherDiscountDisplay: "75% ЗНІЖКА",
  voucherApply: "Выкарыстоўвайце код пры аплаце:",
  voucherValid: "Дзейнічае для Bifolio і Trefolio — штомесяц або штогод",
  ctaPrimary: "Абнавіць зараз — 75% зніжка",
  ctaSecondary: "Працягнуць з Folio",
  tipText: "&#x1F4A1; <strong>Ваш план Folio</strong> уключае да 15 пазіцый, 1 партфель і 5 AI выклікаў/месяц. Абнавіце для больш."
};

export const bifolioUpgrade: BifolioUpgradeStrings = {
  heading: "Сардэчна запрашаем у Bifolio!",
  paragraph: "Ваша абнаўленне актыўнае. Вось усё, што вы толькі што разблакіравалі:",
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
  ctaPrimary: "Наладзьце першае апавяшчэнне",
  ctaSecondary: "Абагульце партфель",
  upsellText: "<strong>Хочаце яшчэ больш?</strong> Trefolio разблакіроўвае асновы кампаній, фільтр акцый, падатковыя справаздачы, апавяшчэнні WhatsApp і неабмежаваныя пазіцыі. <a href=\"{{base_url}}/profile?utm_source=email&utm_medium=lifecycle&utm_campaign=bifolio_upgrade\" style=\"color:#b45309;text-decoration:underline;font-weight:600;\">Даведацца больш</a>"
};

export const trefolioUpgrade: TrefolioUpgradeStrings = {
  heading: "Сардэчна запрашаем у Trefolio Pro!",
  paragraph: "Вы цяпер маеце поўны доступ да ўсіх функцый, якія прапануе trefolio. Вось ваш поўны набор інструментаў:",
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
  ctaPrimary: "Дасьледуйце AI інсайты",
  ctaSecondary: "Праглядзіце асновы",
  communityText: "&#x1F31F; <strong>Вы адзін з першых 500 Pro членаў.</strong> Дзякуй, што паверылі trefolio. Ваша зваротная сувязь фармуе тое, што мы будуем далей."
};
