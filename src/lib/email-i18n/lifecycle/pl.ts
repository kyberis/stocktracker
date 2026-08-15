import type {
  WelcomeNoStocksStrings,
  WelcomeFreeStocksStrings,
  BifolioUpgradeStrings,
  TrefolioUpgradeStrings,
  TrialInvitationStrings,
  TrialExpiredStrings,
} from "../template-types";

export const welcomeNoStocks: WelcomeNoStocksStrings = {
  heading: "Witaj w trefolio!",
  paragraph: "Twoje konto jest gotowe. trefolio to dodatkowy liść dla Twojego portfela &mdash; wszystko, czego potrzebujesz, by śledzić, rozumieć i rozwijać swoje inwestycje w jednym miejscu.",
  features: [
    {
      title: "Kursy w czasie rzeczywistym",
      desc: "Na żywo ceny z Yahoo Finance na ponad 60 giełdach na całym świecie. Zobacz wartość portfela aktualizowaną przez cały dzień."
    },
    {
      title: "Śledzenie dywidend",
      desc: "Automatyczna detekcja dywidend, roczne prognozy dochodu, rentowność na koszt i miesięczny kalendarz płatności."
    },
    {
      title: "Analiza oparta na IA",
      desc: "Zapytaj naszą IA o dowolną akcję &mdash; uzyskaj analizę wyników, porównania konkurencji i oceny ryzyka. 5 darmowych wywołań/miesiąc."
    },
    {
      title: "Łatwy import",
      desc: "Przenieś portfel z ponad 20 brokerów przez upload CSV, Broker Sync jednym kliknięciem lub import wspomagany przez IA."
    },
    {
      title: "Alerty cenowe",
      desc: "Otrzymuj powiadomienia, gdy akcje osiągną docelową cenę. Alerty e-mail i push dostępne w trefolio."
    },
    {
      title: "Zaawansowane metryki",
      desc: "Współczynnik Sharpe'a, maksymalny drawdown, zmienność i pełna historia wyników do pomiaru strategii."
    },
    {
      title: "Fundamenty i inteligencja",
      desc: "Finanse firm, transakcje insiderów, udziały instytucjonalne i sentyment wiadomości &mdash; wszystko w jednym widoku."
    },
    {
      title: "Filtr akcji",
      desc: "Przeszukuj ponad 600 akcji z 6 filtrami i 5 wbudowanymi strategiami, by odkrywać nowe możliwości."
    }
  ],
  ctaPrimary: "Dodaj pierwszą akcję",
  ctaSecondary: "Poznaj dashboard",
  tipText: "&#x1F4A1; <strong>Rozpoczęcie jest proste:</strong> Dodaj tylko jedną akcję, by zobaczyć dashboard ożywiony danymi w czasie rzeczywistym, wykresami i insightami IA."
};

export const welcomeFreeStocks: WelcomeFreeStocksStrings = {
  heading: "Świetny pocz&#261;tek!",
  intro: "Dodałeś swoje pierwsze akcje &mdash; panel portfela śledzi teraz Twoje inwestycje w czasie rzeczywistym. Oto co trefolio może dla Ciebie zrobić:",
  features: [
    {
      title: "Panel w czasie rzeczywistym",
      desc: "Wartość portfela, zmiany dzienne, podział alokacji i wykresy wyników &mdash; wszystko aktualizuje się na żywo."
    },
    {
      title: "Insights dywidend",
      desc: "Roczne prognozy dochodu, śledzenie rentowności i miesięczny kalendarz dywidend dla Twoich pozycji."
    },
    {
      title: "Analiza akcji z IA",
      desc: "Zapytaj naszą IA o cokolwiek dotyczącego Twoich akcji. Uzyskaj analizę wyników, oceny ryzyka i insighty konkurencyjne."
    },
    {
      title: "Alerty cenowe",
      desc: "Nie przegap żadnego ruchu cenowego. Ustaw alerty i otrzymuj powiadomienia e-mail lub push."
    },
    {
      title: "Metryki wydajności",
      desc: "Współczynnik Sharpe'a, maksymalny drawdown, TTWROR i pełna historia wzrostu portfela w dowolnym okresie."
    },
    {
      title: "Fundamenty firm",
      desc: "Rachunki zysków i strat, bilanse, przepływy pieniężne, transakcje insiderów i udziały instytucjonalne."
    },
    {
      title: "Filtr i symulator akcji",
      desc: "Przeszukuj ponad 600 akcji i testuj strategie portfela z naszym symulatorem what-if."
    }
  ],
  voucherTitle: "Oferta ekskluzywna",
  voucherDiscountDisplay: "75% ZNIŻKI",
  voucherApply: "Użyj kodu przy płatności:",
  voucherValid: "miesięcznie lub rocznie",
  ctaPrimary: "Ulepsz teraz &mdash; 75% zniżki",
  ctaSecondary: "Poznaj dashboard",
  tipText: "&#x1F4A1; <strong>Rozpoczęcie jest proste:</strong> Dodaj tylko jedną akcję, by zobaczyć dashboard ożywiony danymi w czasie rzeczywistym, wykresami i insightami IA."
};

export const bifolioUpgrade: BifolioUpgradeStrings = {
  heading: "Witaj w trefolio!",
  paragraph: "Twoja aktualizacja jest aktywna. Oto wszystko, co właśnie odblokowałeś:",
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
  ctaPrimary: "Skonfiguruj pierwszy alert",
  ctaSecondary: "Udostępnij swój portfel",
  upsellText: "<strong>Chcesz jeszcze więcej?</strong> trefolio odblokowuje fundamenty firm, filtr akcji, raporty podatkowe, alerty WhatsApp i nieograniczone pozycje. <a href=\"{{base_url}}/profile?utm_source=email&utm_medium=lifecycle&utm_campaign=bifolio_upgrade\" style=\"color:#b45309;text-decoration:underline;font-weight:600;\">Dowiedz się więcej</a>"
};

export const trefolioUpgrade: TrefolioUpgradeStrings = {
  heading: "Witaj w trefolio!",
  paragraph: "Masz teraz pełny dostęp do wszystkich funkcji trefolio. Oto Twój kompletny zestaw narzędzi:",
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
  ctaPrimary: "Poznaj analizy IA",
  ctaSecondary: "Zobacz fundamenty",
  communityText: "&#x1F31F; <strong>Jesteś jednym z naszych pierwszych 500 członków Pro.</strong> Dziękujemy za wiarę w trefolio. Twoja opinia kształtuje to, co budujemy dalej."
};

export const trialInvitation: TrialInvitationStrings = {
  heading: "Tw&#243;j okres pr&#243;bny Pro czeka",
  paragraph:
    "Cze&#347;&#263; {{display_name}}, budujesz ju&#380; sw&#243;j portfel w trefolio &mdash; teraz poznaj pe&#322;ny zestaw narz&#281;dzi przez 7 dni, ca&#322;kowicie za darmo.",
  groups: [
    {
      label: "Dane &amp; analiza",
      items: [
        "Dane premium Alpha Vantage",
        "Fundamenty: rachunek zysk&#243;w i strat, bilans, przep&#322;yw pieni&#281;&#380;ny",
        "Panel wska&#378;nik&#243;w ekonomicznych",
      ],
    },
    {
      label: "Inteligencja",
      items: [
        "Kana&#322; wiadomo&#347;ci z analiz&#261; sentymentu",
        "Transakcje insider&#243;w i udzia&#322;y instytucjonalne",
        "Analiza AI: 30 wywo&#322;a&#324;/dzie&#324;, bez limitu miesi&#281;cznie",
      ],
    },
    {
      label: "Zaawansowane narz&#281;dzia",
      items: [
        "Wsp&#243;&#322;czynnik Sharpe&rsquo;a, maksymalny drawdown, zmienno&#347;&#263;",
        "Pe&#322;na historia wynik&#243;w portfela",
        "Filtr akcji: 600+ sp&#243;&#322;ek, 6 filtr&#243;w",
      ],
    },
    {
      label: "Alerty i limity",
      items: [
        "Powiadomienia WhatsApp i na urz&#261;dzeniu",
        "Nieograniczone alerty cenowe i pozycje",
        "Do 5 portfeli",
      ],
    },
  ],
  ctaPrimary: "Aktywuj bezp&#322;atn&#261; wersj&#281; pr&#243;bn&#261;",
  ctaSecondary: "Zobacz, co jest w zestawie",
  disclaimer:
    "Bez karty kredytowej. Po 7 dniach konto wraca do planu Free &mdash; bez niespodzianek.",
  signoffIntro:
    "Stworzy&#322;em trefolio, bo chcia&#322;em lepiej &#347;ledzi&#263; w&#322;asny portfel. Mam nadziej&#281;, &#380;e spodoba Ci si&#281; pe&#322;ne do&#347;wiadczenie.",
  signoffReply: "Daj zna&#263;, co s&#261;dzisz &mdash; wystarczy odpowiedzie&#263; na tego maila.",
};

export const trialExpired: TrialExpiredStrings = {
  heading: "Tw&#243;j okres pr&#243;bny Pro dobieg&#322; ko&#324;ca",
  paragraph:
    "Cze&#347;&#263; {{display_name}}, tw&#243;j 7-dniowy trial trefolio si&#281; sko&#324;czy&#322;. Tego zabraknie:",
  features: [
    {
      title: "Zaawansowana analityka",
      desc: "Wsp&#243;&#322;czynnik Sharpe&rsquo;a, maksymalny drawdown, zmienno&#347;&#263; i pe&#322;na historia wzrostu",
    },
    {
      title: "Analiza AI",
      desc: "30 wywo&#322;a&#324; dziennie z g&#322;&#281;bokimi insightami o akcjach i recenzjami portfela",
    },
    {
      title: "Fundamenty sp&#243;&#322;ek",
      desc: "Rachunki zysk&#243;w i strat, bilanse, transakcje insider&#243;w i udzia&#322;y instytucjonalne",
    },
    {
      title: "Alerty premium",
      desc: "Powiadomienia WhatsApp, nieograniczone alerty i do 5 portfeli",
    },
  ],
  pricingNote: "Plany od &euro;4,99/mies. Anuluj w dowolnym momencie.",
  ctaPrimary: "Wykup subskrypcj&#281; trefolio",
  ctaSecondary: "Zobacz cennik",
  signoffIntro:
    "Mam nadziej&#281;, &#380;e trial da&#322; Ci prawdziwy smak tego, co potrafi trefolio. Je&#347;li masz opini&#281;, ch&#281;tnie j&#261; przeczytam.",
  growthTitle: "Tw&oacute;j portfel wzr&oacute;s&lstrok; o {{growth_pct}}% podczas okresu pr&oacute;bnego",
  growthDesc: "Z Pro mo&zdot;esz nadal &sacute;ledzi&cacute; szczeg&oacute;&lstrok;owe metryki wydajno&sacute;ci i otrzymywa&cacute; analizy AI na temat kolejnych ruch&oacute;w.",
  growthTitleDown: "Rynki si&eogon; zmieni&lstrok;y &mdash; Tw&oacute;j portfel zmieni&lstrok; si&eogon; o {{growth_pct}}% podczas okresu pr&oacute;bnego",
  growthDescDown: "Z Pro mia&lstrok;by&sacute; alerty AI i g&lstrok;&eogon;bsze analizy, by szybciej reagowa&cacute; na ruchy rynkowe.",
};
