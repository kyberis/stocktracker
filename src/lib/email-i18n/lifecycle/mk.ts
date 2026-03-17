import type { WelcomeNoStocksStrings, WelcomeFreeStocksStrings, BifolioUpgradeStrings, TrefolioUpgradeStrings } from "../template-types";

export const welcomeNoStocks: WelcomeNoStocksStrings = {
  heading: "Добредојдовте во trefolio!",
  paragraph: "Вашата сметка е подготвена. trefolio е дополнителниот лист за вашиот портфолио — сè што ви треба за следење, разбирање и раст на вашите инвестиции на едно место.",
  features: [
    {
      title: "Котирања во реално време",
      desc: "Директни цени од Yahoo Finance на преку 60 берзи ширум светот. Погледнете ја вредноста на портфолиото како се ажурира во текот на денот."
    },
    {
      title: "Следење на дивиденди",
      desc: "Автоматско откривање дивиденди, годишни проекции за приход, принос на трошок и месечен календар на плаќања."
    },
    {
      title: "AI-потпомогнута анализа",
      desc: "Прашајте го нашиот AI за било која акција — добијте анализа на резултати, споредби со конкуренцијата и проценки на ризикот. 5 бесплатни повици/месец."
    },
    {
      title: "Лесен увоз",
      desc: "Донесете го вашиот портфолио од преку 20 брокери преку CSV подигнување, Broker Sync со еден клик или AI-помогнат увоз."
    },
    {
      title: "Ценовни известувања",
      desc: "Добијте известување кога акциите ќе ја достигнат вашата целна цена. Имејл и push известувања достапни на Bifolio."
    },
    {
      title: "Напредни метрики",
      desc: "Шарпов сооднос, максимален пад, волатилност и целосна историја на перформанси за мерење на вашата стратегија."
    },
    {
      title: "Основи и интелигенција",
      desc: "Корпоративни финансии, инсајдерски трговии, институционални удели и сентимент на вести — сè во еден преглед."
    },
    {
      title: "Филтер за акции",
      desc: "Филтрирајте преку 600 акции со 6 филтри и 5 вградени стратегии за откривање нови можности."
    }
  ],
  ctaPrimary: "Додајте ја вашата прва акција",
  ctaSecondary: "Истражете ја контролната табла",
  tipText: "&#x1F4A1; <strong>Почетокот е лесен:</strong> Додајте само една акција за да ја видите својата контролна табла да оживее со податоци во реално време, графикони и AI увиди."
};

export const welcomeFreeStocks: WelcomeFreeStocksStrings = {
  heading: "Одлично почнавте!",
  intro: "Ги додадовте вашите први акции — dashboard-от на портфолиото сега ги следи вашите инвестиции во реално време. Еве што trefolio може да направи за вас:",
  features: [
    {
      title: "Dashboard во реално време",
      desc: "Вредност на портфолиото, дневни промени, расподелба на алокацијата и графици на перформанси — сè се ажурира во живо."
    },
    {
      title: "Увиди за дивиденди",
      desc: "Годишни проекции за приход, следење на принос и месечен календар на дивиденди за вашите позиции."
    },
    {
      title: "AI анализа на акции",
      desc: "Прашајте го нашиот AI било што за вашите акции. Добијте анализа на резултати, проценки на ризикот и конкурентски увиди."
    },
    {
      title: "Ценовни известувања",
      desc: "Не пропуштете ниту едно ценовно движење. Поставете известувања и добијте известувања преку имејл или push."
    },
    {
      title: "Метрики на перформанси",
      desc: "Шарпов сооднос, максимален пад, TTWROR и целосна историја на раст на портфолио за било кој период."
    },
    {
      title: "Фундаментали на компанијата",
      desc: "Извештаи за приходи, биланси, паричен тек, инсајдерски трговии и институционални удели."
    },
    {
      title: "Филтер и симулатор за акции",
      desc: "Филтрирајте преку 600 акции и тестирајте стратегии на портфолио со нашиот what-if симулатор."
    }
  ],
  voucherTitle: "Ексклузивна понуда",
  voucherDiscountDisplay: "75% ПОПУСТ",
  voucherApply: "Користете го кодот при плаќање:",
  voucherValid: "Валидно за Bifolio и Trefolio — месечно или годишно",
  ctaPrimary: "Надградете сега — 75% попуст",
  ctaSecondary: "Продолжете со Folio",
  tipText: "&#x1F4A1; <strong>Вашиот Folio план</strong> вклучува до 15 позиции, 1 портфолио и 5 AI повици/месец. Надградете за повеќе."
};

export const bifolioUpgrade: BifolioUpgradeStrings = {
  heading: "Добредојдовте во Bifolio!",
  paragraph: "Вашата надградба е активна. Еве сè што штотуку отклучивте:",
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
  ctaPrimary: "Поставете ја вашата прва аларма",
  ctaSecondary: "Споделете го вашиот портфолио",
  upsellText: "<strong>Сакате уште повеќе?</strong> Trefolio отклучува фундаментали на компании, филтер за акции, даночни извештаи, WhatsApp известувања и неограничени позиции. <a href=\"{{base_url}}/profile?utm_source=email&utm_medium=lifecycle&utm_campaign=bifolio_upgrade\" style=\"color:#b45309;text-decoration:underline;font-weight:600;\">Дознајте повеќе</a>"
};

export const trefolioUpgrade: TrefolioUpgradeStrings = {
  heading: "Добредојдовте во Trefolio Pro!",
  paragraph: "Сега имате целосен пристап до сите функции што trefolio нуди. Еве го вашиот целосен алат:",
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
  ctaPrimary: "Истражете ги AI увидите",
  ctaSecondary: "Погледнете ги основните",
  communityText: "&#x1F31F; <strong>Вие сте еден од првите 500 Pro членови.</strong> Ви благодариме што верувате во trefolio. Вашата повратна информација обликува што ќе градиме следно."
};
