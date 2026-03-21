import type {
  WelcomeNoStocksStrings,
  WelcomeFreeStocksStrings,
  BifolioUpgradeStrings,
  TrefolioUpgradeStrings,
  TrialInvitationStrings,
  TrialExpiredStrings,
} from "../template-types";

export const welcomeNoStocks: WelcomeNoStocksStrings = {
  heading: "Добре дошли в trefolio!",
  paragraph: "Вашият акаунт е готов. trefolio е допълнителният лист за вашето портфолио — всичко необходимо за проследяване, разбиране и растеж на инвестициите ви на едно място.",
  features: [
    {
      title: "Котировки в реално време",
      desc: "На живо цени от Yahoo Finance на над 60 глобални борси. Вижте стойността на портфолиото си да се актуализира през целия ден."
    },
    {
      title: "Проследяване на дивиденти",
      desc: "Автоматично откриване на дивиденти, годишни проекции за доход, доходност на себестойност и месечен календар на плащанията."
    },
    {
      title: "Анализ с AI",
      desc: "Питайте нашия AI за всяка акция — получавайте анализ на резултатите, сравнения с конкуренти и оценки на риска. 5 безплатни обаждания/месец."
    },
    {
      title: "Лесен импорт",
      desc: "Донесете портфолиото си от над 20 брокери чрез CSV качване, Broker Sync с едно кликване или импорт, подпомогнат от AI."
    },
    {
      title: "Ценови известия",
      desc: "Получавайте известия, когато акциите достигнат целевата ви цена. Имейл и push известия налични в Bifolio."
    },
    {
      title: "Разширени метрики",
      desc: "Коефициент на Шарп, максимално падане, волатилност и пълна история на представянето за измерване на стратегията ви."
    },
    {
      title: "Фундаментали и интелигентност",
      desc: "Корпоративни финанси, инсайдерски сделки, институционални притежатели и настроение от новини — всичко в един изглед."
    },
    {
      title: "Филтър за акции",
      desc: "Филтрирайте над 600 акции с 6 филтри и 5 вградени стратегии за откриване на нови възможности."
    }
  ],
  ctaPrimary: "Добавете първата си акция",
  ctaSecondary: "Разгледай dashboard-а",
  tipText: "&#x1F4A1; <strong>Започването е лесно:</strong> Добавете само една акция, за да видите dashboard-а си да оживее с данни в реално време, графики и AI прозрения."
};

export const welcomeFreeStocks: WelcomeFreeStocksStrings = {
  heading: "Започнахте отлично!",
  intro: "Добавихте първите си акции — dashboard-ът на портфолиото вече проследява инвестициите ви в реално време. Ето какво може trefolio да направи за вас:",
  features: [
    {
      title: "Dashboard в реално време",
      desc: "Стойност на портфолиото, дневни промени, разбивка на разпределението и графики на представянето — всичко се актуализира на живо."
    },
    {
      title: "Прозрения за дивиденти",
      desc: "Годишни проекции за доход, проследяване на доходност и месечен календар на дивиденти за вашите позиции."
    },
    {
      title: "AI анализ на акции",
      desc: "Питайте нашия AI каквото и да е за вашите акции. Получавайте анализ на резултатите, оценки на риска и конкурентни прозрения."
    },
    {
      title: "Ценови известия",
      desc: "Не пропускайте нито едно ценово движение. Настройте известия и получавайте уведомления по имейл или push."
    },
    {
      title: "Метрики на представянето",
      desc: "Коефициент на Шарп, максимално падане, TTWROR и пълна история на растежа на портфолиото за всеки период."
    },
    {
      title: "Фундаментали на компаниите",
      desc: "Отчети за приходите, баланси, паричен поток, инсайдерски сделки и институционални притежатели."
    },
    {
      title: "Филтър и симулатор за акции",
      desc: "Филтрирайте над 600 акции и тествайте стратегии на портфолио с нашия what-if симулатор."
    }
  ],
  voucherTitle: "Ексклузивна оферта",
  voucherDiscountDisplay: "75% ОТСТЪПКА",
  voucherApply: "Използвайте кода при плащане:",
  voucherValid: "Валидно за Bifolio и Trefolio — месечно или годишно",
  ctaPrimary: "Надградете сега — 75% отстъпка",
  ctaSecondary: "Продължете с Folio",
  tipText: "&#x1F4A1; <strong>Планът ви Folio</strong> включва до 15 позиции, 1 портфолио и 5 AI обаждания/месец. Надградете за повече."
};

export const bifolioUpgrade: BifolioUpgradeStrings = {
  heading: "Добре дошли в Bifolio!",
  paragraph: "Надграждането ви е активно. Ето всичко, което току-що отключихте:",
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
  ctaPrimary: "Настройте първото си известие",
  ctaSecondary: "Споделете портфолиото си",
  upsellText: "<strong>Искате още повече?</strong> Trefolio отключва фундаментали на компании, филтър за акции, данъчни отчети, WhatsApp известия и неограничени позиции. <a href=\"{{base_url}}/profile?utm_source=email&utm_medium=lifecycle&utm_campaign=bifolio_upgrade\" style=\"color:#b45309;text-decoration:underline;font-weight:600;\">Научете повече</a>"
};

export const trefolioUpgrade: TrefolioUpgradeStrings = {
  heading: "Добре дошли в Trefolio Pro!",
  paragraph: "Сега имате пълен достъп до всички функции на trefolio. Ето пълния ви инструментариум:",
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
  ctaPrimary: "Разгледай AI анализите",
  ctaSecondary: "Виж фундаменталите",
  communityText: "&#x1F31F; <strong>Вие сте един от първите ни 500 Pro членове.</strong> Благодарим ви, че повярвахте в trefolio. Вашето мнение оформя какво ще изграждаме следващо."
};

export const trialInvitation: TrialInvitationStrings = {
  heading: "Пробният ти Pro период те очаква",
  paragraph:
    "Здравей, {{display_name}}, изграждаш портфолиото си в trefolio — сега изпитай пълния инструментариум за 7 дни, напълно безплатно.",
  groups: [
    {
      label: "Данни и анализ",
      items: [
        "Премиум данни от Alpha Vantage",
        "Фундаментали: отчет за приходите, баланс, паричен поток",
        "Табло с икономически индикатори",
      ],
    },
    {
      label: "Интелигентност",
      items: [
        "Новинарен поток с анализ на настроението",
        "Инсайдерски сделки и институционални притежания",
        "AI анализ: 30 заявки на ден, неограничени на месечна база",
      ],
    },
    {
      label: "Разширени инструменти",
      items: [
        "Коефициент на Шарп, максимално падане, волатилност",
        "Пълна история на представянето на портфолиото",
        "Филтър за акции: над 600 акции, 6 филтъра",
      ],
    },
    {
      label: "Известия и лимити",
      items: [
        "Известия в WhatsApp и на устройството",
        "Неограничени ценови известия и позиции",
        "До 5 портфолиа",
      ],
    },
  ],
  ctaPrimary: "Активирай безплатния пробен период",
  ctaSecondary: "Виж какво е включено",
  disclaimer:
    "Не е нужна кредитна карта. След 7 дни акаунтът ти се връща към безплатния план — без изненади.",
  signoffIntro:
    "Създадох trefolio, защото исках по-добър начин да следя собственото си портфолио. Надявам се и ти да се насладиш на пълното изживяване.",
  signoffReply: "Сподели какво мислиш — просто отговори на този имейл.",
};

export const trialExpired: TrialExpiredStrings = {
  heading: "Пробният ти Pro период приключи",
  paragraph:
    "Здравей, {{display_name}}, 7-дневният ти пробен период на Trefolio Pro приключи. Ето какво ще пропуснеш:",
  features: [
    {
      title: "Разширена аналитика",
      desc: "Коефициент на Шарп, максимално падане, волатилност и пълна история на растежа",
    },
    {
      title: "AI анализ",
      desc: "30 заявки на ден с дълбоки прозрения за акции и прегледи на портфолиото",
    },
    {
      title: "Фундаментали на компаниите",
      desc: "Отчети за приходите, баланси, инсайдерски сделки и институционални притежания",
    },
    {
      title: "Премиум известия",
      desc: "Известия в WhatsApp, неограничени известия и до 5 портфолиа",
    },
  ],
  pricingNote: "Плановете започват от &euro;4.99/месец. Отказ по всяко време.",
  ctaPrimary: "Абонирай се за Trefolio Pro",
  ctaSecondary: "Виж цените",
  signoffIntro:
    "Надявам се пробният период да ти даде истински вкус на това какво може trefolio. Ако имаш обратна връзка, честно бих искал да я чуя.",
  growthTitle:
    "&ETH;&Iuml;&ETH;&frac34;&Ntilde;&ETH;&sup3;&Ntilde;&ETH;&frac12;&ETH;&deg;&Ntilde;&ETH;&frac14;&ETH;&frac12;&ETH;&deg;&Ntilde;&Ntilde;&Ntilde; &ETH;&micro; &Ntilde;&ETH;&deg;&Ntilde;&ETH;&frac12;&ETH;&deg;&ETH;&raquo; &Ntilde; {{growth_pct}}% &ETH;&frac34;&ETH;&frac12;&ETH;&raquo;&ETH;&deg;&ETH;&sup1;&ETH;&frac12; &ETH;&frac34;&ETH; &ETH;&frac14;&ETH;&frac34;&ETH;&frac14;&ETH;&micro;&ETH;&frac12;&Ntilde;&ETH;&deg; &ETH;&frac12;&ETH;&deg; &ETH;&frac34;&ETH;&plusmn;&Ntilde;&ETH;&micro;&ETH;&frac14;&ETH;&micro;&ETH;&frac12;&ETH;&frac12;&ETH;&frac34;&ETH;&micro; &ETH;&cedil;&ETH;&middot;&ETH;&frac14;&ETH;&micro;&ETH;&frac12;&ETH;&micro;&ETH;&frac12;&ETH;&cedil;&ETH;&micro;",
  growthDesc:
    "&ETH;&iexcl; Pro &ETH;&frac34;&ETH;&frac38;&ETH;&micro;&Ntilde;&ETH;&micro; &ETH;&frac12;&ETH;&deg;&ETH;&frac14;&ETH;&deg;&Ntilde;&ETH;&cedil;&Ntilde;&ETH;&micro; &ETH;&frac14;&ETH;&frac34;&ETH;&frac38;&ETH;&frac12;&ETH;&frac34;&Ntilde;&Ntilde; &ETH;&cedil;&ETH;&middot;&ETH;&frac14;&ETH;&micro;&Ntilde;&ETH;&micro;&ETH;&frac12;&ETH;&cedil;&Ntilde; &ETH;&frac12;&ETH;&deg; &ETH;&plusmn;&ETH;&deg;&ETH;&middot;&ETH;&frac34;&ETH;&sup2;&ETH;&micro; &ETH;&frac14;&ETH;&micro;&Ntilde;&Ntilde;&ETH;&cedil;&ETH;&ordm;&ETH;&cedil; &ETH;&cedil; &ETH;&frac14;&ETH;&frac34;&ETH;&frac38;&ETH;&micro;&Ntilde;&ETH;&micro; &ETH;&frac14;&ETH;&frac34;&ETH;&frac38;&ETH;&frac12;&ETH;&frac34;&Ntilde;&Ntilde; &ETH;&deg;&ETH;&frac12;&ETH;&deg;&ETH;&raquo;&ETH;&cedil;&ETH;&middot;&ETH;&cedil; AI &ETH;&middot;&ETH;&deg; &ETH;&middot;&ETH;&deg;&ETH;&frac14;&ETH;&frac34;&ETH;&frac38;&ETH;&frac12;&ETH;&frac34;&Ntilde;&Ntilde; &Ntilde;&ETH;&micro;&ETH;&frac14;&ETH;&micro;&ETH;&frac12;&ETH;&cedil;&Ntilde; &Ntilde;&ETH;&deg;&ETH;&middot;&ETH;&micro;&ETH;&frac12;&ETH;&cedil;&Ntilde;.",
  growthTitleDown: "&ETH;&Iuml;&ETH;&deg;&ETH;&middot;&ETH;&cedil;&Ntilde;&ETH;&micro; &Ntilde;&ETH;&micro; &ETH;&frac14;&ETH;&frac34;&ETH;&middot;&ETH;&cedil;&Ntilde;&ETH;&deg; &mdash; &ETH;&frac12;&ETH;&deg;&Ntilde;&ETH;&frac12;&ETH;&frac34;&Ntilde;&Ntilde; &ETH;&frac14;&ETH;&micro;&ETH;&frac12;&Ntilde;&ETH;&frac12;&ETH;&frac34;&Ntilde;&Ntilde; &ETH;&frac12;&ETH;&deg; {{growth_pct}}% &ETH;&middot;&ETH;&deg; &ETH;&frac14;&ETH;&frac34;&ETH;&frac14;&ETH;&micro;&ETH;&frac12;&Ntilde;&ETH;&deg; &ETH;&frac12;&ETH;&deg; &ETH;&frac34;&ETH;&plusmn;&Ntilde;&ETH;&micro;&ETH;&frac14;&ETH;&micro;&ETH;&frac12;&ETH;&frac12;&ETH;&frac34;&ETH;&micro; &ETH;&cedil;&ETH;&middot;&ETH;&frac14;&ETH;&micro;&ETH;&frac12;&ETH;&micro;&ETH;&frac12;&ETH;&cedil;&ETH;&micro;",
  growthDescDown: "&ETH;&iexcl; Pro &ETH;&plusmn;&ETH;&cedil;&Ntilde;&Ntilde;&ETH;&micro; &ETH;&cedil;&ETH;&frac14;&ETH;&deg;&ETH;&raquo;&ETH;&cedil; AI &ETH;&cedil;&ETH;&middot;&ETH;&frac12;&ETH;&frac34;&ETH;&frac14;&ETH;&middot;&ETH;&deg;&ETH;&frac34;&ETH;&frac12;&ETH;&cedil;&Ntilde; &ETH;&cedil; &ETH;&frac14;&ETH;&frac34;&ETH;&para;&ETH;&frac12;&ETH;&frac34;&Ntilde;&Ntilde; &ETH;&deg;&ETH;&frac12;&ETH;&deg;&ETH;&raquo;&ETH;&cedil;&ETH;&middot;&ETH;&cedil; &ETH;&middot;&ETH;&deg; &ETH;&frac14;&ETH;&frac34;&ETH;&para;&ETH;&frac12;&ETH;&frac34;&Ntilde;&Ntilde; &Ntilde;&ETH;&micro;&ETH;&deg;&ETH;&ordm;&Ntilde;&ETH;&cedil;&Ntilde; &ETH;&frac12;&ETH;&deg; &ETH;&frac14;&ETH;&frac34;&ETH;&frac14;&ETH;&micro;&ETH;&frac12;&Ntilde;&ETH;&deg; &ETH;&frac12;&ETH;&deg; &ETH;&frac34;&ETH;&plusmn;&Ntilde;&ETH;&micro;&ETH;&frac14;&ETH;&micro;&ETH;&frac12;&ETH;&frac12;&ETH;&frac34;&ETH;&micro; &ETH;&cedil;&ETH;&middot;&ETH;&frac14;&ETH;&micro;&ETH;&frac12;&ETH;&micro;&ETH;&frac12;&ETH;&cedil;&ETH;&micro; &ETH;&frac12;&ETH;&deg; &ETH;&frac14;&ETH;&deg;&Ntilde;&ETH;&frac34;&ETH;&middot;&ETH;&deg;&Ntilde;&ETH;&cedil;&Ntilde;&ETH;&micro;.",
};
