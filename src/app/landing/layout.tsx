import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "trefolio — Simple Portfolio Tracking with AI Insights",
  description:
    "trefolio is a portfolio tracker for European investors. Real-time quotes, broker imports (DEGIRO, IBKR, T212, Revolut), AI analysis, and dividend projections. Start with Folio for free, Trefolio for €7.99/month.",
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
    title: "trefolio — Simple Portfolio Tracking with AI Insights",
    description:
      "The simplest way to manage your stock portfolio. Real-time quotes, dividend tracking, growth projections, and AI analysis — plans from €2.99/month.",
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
    title: "trefolio — Simple Portfolio Tracking with AI Insights",
    description:
      "The simplest way to manage your stock portfolio. Real-time quotes, dividend tracking, growth projections, and AI analysis — plans from €2.99/month.",
    images: ["/screenshots/dashboard-overview.png"],
  },
};

const WEBSITE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "trefolio",
  url: "https://trefolio.com",
  description:
    "Simple portfolio tracking with AI insights for European investors",
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
    "Simple portfolio tracking with AI insights for European investors",
  email: "support@trefolio.com",
  foundingDate: "2025",
  contactPoint: {
    "@type": "ContactPoint",
    email: "support@trefolio.com",
    contactType: "customer support",
    availableLanguage: ["English", "Spanish"],
  },
};

const SOFTWARE_APP_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "trefolio",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  url: "https://trefolio.com",
  description:
    "Portfolio tracker with real-time quotes, broker imports, AI analysis, and dividend projections for European investors.",
  offers: [
    {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      name: "Folio",
      description:
        "Up to 15 holdings, real-time quotes, charts, broker import, 5 AI calls/month",
    },
    {
      "@type": "Offer",
      price: "2.99",
      priceCurrency: "EUR",
      name: "Bifolio",
      description:
        "Up to 50 holdings, 20 AI calls/month, portfolio sharing, CSV export, 1-year growth history",
    },
    {
      "@type": "Offer",
      price: "7.99",
      priceCurrency: "EUR",
      name: "Trefolio",
      description:
        "Unlimited holdings, unlimited AI analysis, fundamentals, stock intelligence, economic indicators",
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
        text: "Go to the unified /import page to access all 7 import methods in one place: DEGIRO, IBKR CSV, IBKR API, Trading 212, Revolut, Simple CSV, and AI Import. Each method has a built-in step-by-step guide. For CSV or AI import: choose your method, drag & drop your file (or paste for AI), review the parsed transactions, and click Import. Trefolio users can connect via IBKR API with a guided 3-step wizard that takes under 2 minutes.",
      },
    },
    {
      "@type": "Question",
      name: "What CSV formats are supported?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Six CSV formats plus AI Import: (1) DEGIRO Account.csv, (2) IBKR CSV (Activity Statement or Flex Query), (3) Trading 212 History CSV, (4) Revolut Account Statement (Excel/CSV), (5) Simple CSV with columns: ticker, type, price, amount, currency. For any other format, use AI Import — upload or paste your file and AI will parse it. Trefolio users get IBKR API for direct sync — connect once, re-sync anytime with one click.",
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
        text: "trefolio supports NYSE, NASDAQ, XETRA, LSE, Amsterdam (AMS), Madrid (MAD), Copenhagen (OMK), and more. Multi-currency conversion between EUR, USD, GBP, DKK, and CAD is handled automatically.",
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
        text: "Folio (free) includes up to 15 holdings, real-time quotes, charts, broker import, and 5 AI calls/month. Bifolio (€2.99/month) adds 50 holdings, 20 AI calls, portfolio sharing, and CSV export. Trefolio (€7.99/month) adds unlimited holdings, unlimited AI analysis, company fundamentals, stock intelligence, economic indicators, and Alpha Vantage premium data.",
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
