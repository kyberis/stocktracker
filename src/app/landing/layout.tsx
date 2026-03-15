import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "trefolio — Portfolio Tracking, EU Tax Reports & AI Insights",
  description:
    "trefolio is the portfolio tracker built for European investors. EU tax reports (DE/FR/ES/NL/IT), stock screener, net worth tracking, broker sync, AI analysis in 35 languages, and dividend projections. Free to start, Trefolio for €7.99/month.",
  alternates: {
    canonical: "https://trefolio.com",
    languages: {
      "en": "https://trefolio.com",
      "es": "https://trefolio.com",
      "fr": "https://trefolio.com",
      "de": "https://trefolio.com",
      "it": "https://trefolio.com",
      "pt": "https://trefolio.com",
      "nl": "https://trefolio.com",
      "pl": "https://trefolio.com",
      "cs": "https://trefolio.com",
      "sk": "https://trefolio.com",
      "hu": "https://trefolio.com",
      "ro": "https://trefolio.com",
      "bg": "https://trefolio.com",
      "hr": "https://trefolio.com",
      "sl": "https://trefolio.com",
      "el": "https://trefolio.com",
      "sv": "https://trefolio.com",
      "da": "https://trefolio.com",
      "fi": "https://trefolio.com",
      "et": "https://trefolio.com",
      "lv": "https://trefolio.com",
      "lt": "https://trefolio.com",
      "ga": "https://trefolio.com",
      "mt": "https://trefolio.com",
      "nb": "https://trefolio.com",
      "uk": "https://trefolio.com",
      "tr": "https://trefolio.com",
      "sr": "https://trefolio.com",
      "is": "https://trefolio.com",
      "sq": "https://trefolio.com",
      "bs": "https://trefolio.com",
      "mk": "https://trefolio.com",
      "be": "https://trefolio.com",
      "ca": "https://trefolio.com",
      "cy": "https://trefolio.com",
      "x-default": "https://trefolio.com",
    },
  },
  openGraph: {
    title: "trefolio — Portfolio Tracking, EU Tax Reports & AI Insights",
    description:
      "The European investor's portfolio tracker. EU tax reports, stock screener, net worth tracking, AI analysis in 35 languages, and dividend projections — plans from €2.99/month.",
    url: "https://trefolio.com",
    siteName: "trefolio",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/screenshots/dashboard-overview.png",
        width: 1280,
        height: 800,
        alt: "trefolio portfolio dashboard showing holdings, performance metrics, and growth projection",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "trefolio — Portfolio Tracking, EU Tax Reports & AI Insights",
    description:
      "The European investor's portfolio tracker. EU tax reports, stock screener, net worth tracking, AI analysis in 35 languages, and dividend projections — plans from €2.99/month.",
    images: ["/screenshots/dashboard-overview.png"],
  },
};

const WEBSITE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "trefolio",
  url: "https://trefolio.com",
  description:
    "Portfolio tracking with EU tax reports, stock screener, AI insights, and net worth tracking for European investors in 35 languages",
  inLanguage: [
    "en", "es", "fr", "de", "it", "pt", "nl", "pl", "cs", "sk",
    "hu", "ro", "bg", "hr", "sl", "el", "sv", "da", "fi", "et",
    "lv", "lt", "ga", "mt", "nb", "uk", "tr", "sr", "is", "sq",
    "bs", "mk", "be", "ca", "cy",
  ],
  potentialAction: {
    "@type": "SearchAction",
    target: "https://trefolio.com/signup?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "trefolio",
  url: "https://trefolio.com",
  logo: "https://trefolio.com/icon.svg",
  description:
    "Portfolio tracking with EU tax reports, stock screener, AI insights, and net worth tracking for European investors in 35 languages",
  email: "support@trefolio.com",
  foundingDate: "2025",
  contactPoint: [
    {
      "@type": "ContactPoint",
      email: "support@trefolio.com",
      contactType: "customer support",
      availableLanguage: ["English", "Spanish"],
      url: "https://trefolio.com/contact",
    },
    {
      "@type": "ContactPoint",
      email: "privacy@trefolio.com",
      contactType: "privacy",
      availableLanguage: ["English"],
    },
  ],
  address: {
    "@type": "PostalAddress",
    addressCountry: "PT",
  },
  areaServed: {
    "@type": "Place",
    name: "Europe",
  },
  knowsLanguage: [
    "en", "es", "fr", "de", "it", "pt", "nl", "pl", "cs", "sk",
    "hu", "ro", "bg", "hr", "sl", "el", "sv", "da", "fi", "et",
    "lv", "lt", "ga", "mt", "nb", "uk", "tr", "sr", "is", "sq",
    "bs", "mk", "be", "ca", "cy",
  ],
};

const SOFTWARE_APP_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "trefolio",
  applicationCategory: "FinanceApplication",
  applicationSubCategory: "Portfolio Tracker",
  operatingSystem: "Web, iOS, Android",
  url: "https://trefolio.com",
  description:
    "Portfolio tracker with EU tax reports, stock screener, net worth tracking, broker imports, AI analysis, and dividend projections for European investors.",
  screenshot: "https://trefolio.com/screenshots/dashboard-overview.png",
  featureList: [
    "European tax reports for Germany, France, Spain, Netherlands, and Italy with AI Tax Assistant",
    "Stock screener with 600+ stocks, 6 filter dimensions, and preset strategies",
    "Net worth tracking for real estate, savings, and pension assets",
    "Real-time stock quotes from NYSE, NASDAQ, XETRA, LSE, and more",
    "Broker import and auto-sync from 20+ brokerages via SnapTrade",
    "AI-powered stock analysis, portfolio review, and AI Tax Assistant",
    "Dividend tracking, calendars, and 5-year projections",
    "Performance metrics (TTWROR, XIRR, Sharpe, Max Drawdown)",
    "Multi-currency support with 21 currencies and FX impact tracking",
    "35 European languages with AI insights in your native language",
    "4 dashboard themes (Default, Canvas, Terminal, Studio)",
    "Event calendars for earnings, economic events, and IPOs",
    "Price alerts via email, push, WhatsApp, and trefolio Leaf device",
    "Guided onboarding wizard with country-aware broker suggestions",
    "In-app notification center for updates and alerts",
  ],
  inLanguage: [
    "en", "es", "fr", "de", "it", "pt", "nl", "pl", "cs", "sk",
    "hu", "ro", "bg", "hr", "sl", "el", "sv", "da", "fi", "et",
    "lv", "lt", "ga", "mt", "nb", "uk", "tr", "sr", "is", "sq",
    "bs", "mk", "be", "ca", "cy",
  ],
  offers: [
    {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      name: "Folio",
      description:
        "Up to 15 holdings, real-time quotes, charts, growth projection, broker import, earnings calendar, 5 AI calls/month",
    },
    {
      "@type": "Offer",
      price: "2.99",
      priceCurrency: "EUR",
      name: "Bifolio",
      description:
        "Up to 50 holdings, 20 AI calls/month, full portfolio history, advanced metrics, portfolio sharing, CSV export, 1 broker sync, Canvas theme",
    },
    {
      "@type": "Offer",
      price: "7.99",
      priceCurrency: "EUR",
      name: "Trefolio",
      description:
        "Unlimited holdings, unlimited AI, EU tax reports, stock screener, net worth tracking, fundamentals, all 4 themes, unlimited broker sync",
    },
  ],
};

const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How do I import my portfolio?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Go to the unified /import page to access all import methods in one place: 14 broker CSV formats (DEGIRO, IBKR, Trading 212, Revolut, Schwab, Fidelity, Nordnet, and more), SnapTrade auto-sync with 20+ brokerages, and AI Import from screenshots or any file. Each method has a built-in guide. Bifolio users get 1 broker sync connection, Trefolio gets unlimited.",
      },
    },
    {
      "@type": "Question",
      name: "What CSV formats are supported?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "14 broker CSV formats: DEGIRO, IBKR, Trading 212, Revolut, Schwab, Fidelity, Nordnet, Tastytrade, Freetrade, eToro, Wealthsimple, Questrade, Firstrade, and Simple CSV. For any other format, use AI Import — upload or paste your file and AI will parse it. Bifolio and Trefolio users can also connect 20+ brokerages via SnapTrade for automatic syncing every hour.",
      },
    },
    {
      "@type": "Question",
      name: "Is my data secure?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. All data is encrypted at rest, passwords are hashed with bcrypt, and sessions use secure HTTP-only cookies. We never sell or share your data with third parties.",
      },
    },
    {
      "@type": "Question",
      name: "What exchanges are supported?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "trefolio supports NYSE, NASDAQ, XETRA, LSE, Amsterdam (AMS), Madrid (MAD), Copenhagen (OMK), and more. Multi-currency conversion between 21 currencies (EUR, USD, GBP, CHF, SEK, NOK, DKK, CAD, AUD, NZD, JPY, and more) is handled automatically.",
      },
    },
    {
      "@type": "Question",
      name: "How are performance metrics calculated?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "TTWROR uses the Modified Dietz method, which weights each cash flow by the fraction of the period remaining — so returns reflect market performance only, not deposit timing. IRR (XIRR) finds the annualized rate that makes the net present value of all dated cash flows equal zero.",
      },
    },
    {
      "@type": "Question",
      name: "What's the difference between the plans?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Folio (free) includes up to 15 holdings, real-time quotes, charts, growth projection, broker import, earnings calendar, and 5 AI calls/month. Bifolio (€2.99/month) adds 50 holdings, 20 AI calls, full portfolio history, advanced metrics, portfolio sharing, CSV export, 1 broker sync, and Canvas theme. Trefolio (€7.99/month) adds unlimited holdings, unlimited AI, EU tax reports for 5 countries, stock screener, net worth tracking, fundamentals, all 4 dashboard themes, unlimited broker sync, and IPO calendar.",
      },
    },
    {
      "@type": "Question",
      name: "Can I cancel anytime?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Bifolio and Trefolio are billed monthly or annually (save ~37%). You can cancel anytime from the billing portal — your paid features remain active until the end of the billing period.",
      },
    },
    {
      "@type": "Question",
      name: "How do dividends and fees get tracked?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "When you import a broker CSV (DEGIRO, IBKR, Trading 212, or Revolut), dividends, withholding taxes, and broker fees are parsed automatically. For Simple CSV imports, use the type column with 'dividend' or 'fee' values. All transactions are stored in your ledger and reflected in performance metrics.",
      },
    },
  ],
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={WEBSITE_SCHEMA} />
      <JsonLd data={ORGANIZATION_SCHEMA} />
      <JsonLd data={SOFTWARE_APP_SCHEMA} />
      <JsonLd data={FAQ_SCHEMA} />
      {children}
    </>
  );
}
