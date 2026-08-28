import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";

import { isCommerceEnabled } from "@/lib/commerce-server";

const DESCRIPTION_COMMERCE =
  "trefolio is the portfolio tracker for European investors with Clover, the default AI assistant that unifies investments (Warren) and personal-finance cashflow (Clara). EU tax reports (DE/FR/ES/NL/IT), stock screener, broker sync, AI analysis in 35 languages, and dividend projections. Free to start, Trefolio for €7.99/month.";
const DESCRIPTION_NO_COMMERCE =
  "trefolio is the portfolio tracker for European investors with Clover, the default AI assistant that unifies investments (Warren) and personal-finance cashflow (Clara). EU tax reports (DE/FR/ES/NL/IT), stock screener, broker sync, AI analysis in 35 languages, and dividend projections. Free to start.";

const OG_DESCRIPTION_COMMERCE =
  "The European investor's portfolio tracker with Clover AI — Warren for holdings, Clara for cashflow. EU tax reports, stock screener, and dividend projections. Free to start, Trefolio for €7.99/month.";
const OG_DESCRIPTION_NO_COMMERCE =
  "The European investor's portfolio tracker with Clover AI — Warren for holdings, Clara for cashflow. EU tax reports, stock screener, and dividend projections.";

export async function generateMetadata(): Promise<Metadata> {
  const commerceEnabled = await isCommerceEnabled();
  const description = commerceEnabled ? DESCRIPTION_COMMERCE : DESCRIPTION_NO_COMMERCE;
  const ogDescription = commerceEnabled ? OG_DESCRIPTION_COMMERCE : OG_DESCRIPTION_NO_COMMERCE;
  return {
    title: "trefolio — Clover AI, EU Tax Reports & Portfolio Tracking",
    description,
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
      title: "trefolio — Clover AI, EU Tax Reports & Portfolio Tracking",
      description: ogDescription,
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
      title: "trefolio — Clover AI, EU Tax Reports & Portfolio Tracking",
      description: ogDescription,
      images: ["/screenshots/dashboard-overview.png"],
    },
  };
}

const WEBSITE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "trefolio",
  url: "https://trefolio.com",
  description:
    "European portfolio tracker with Clover, the default AI assistant that orchestrates Warren (investments) and Clara (personal finance), plus EU tax reports, stock screener, and net worth tracking in 35 languages",
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
    "European portfolio tracker with Clover, the default AI assistant that orchestrates Warren (investments) and Clara (personal finance), plus EU tax reports, stock screener, and net worth tracking in 35 languages",
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

// Exported for testing only (see layout.jsonld.test.ts) — asserts this
// unconditionally- and conditionally-rendered structured data never regresses
// to describing the retired "Bifolio" mid-tier.
export const SOFTWARE_APP_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "trefolio",
  applicationCategory: "FinanceApplication",
  applicationSubCategory: "Portfolio Tracker",
  operatingSystem: "Web, iOS, Android",
  url: "https://trefolio.com",
  description:
    "Portfolio tracker with Clover, trefolio’s default AI assistant that orchestrates Warren (investments) and Clara (personal-finance cashflow snapshot). EU tax reports, stock screener, net worth tracking, broker imports, and dividend projections for European investors. Informational only — not investment advice.",
  screenshot: "https://trefolio.com/screenshots/dashboard-overview.png",
  featureList: [
    "European tax reports for Germany, France, Spain, Netherlands, and Italy with AI Tax Assistant",
    "Stock screener with 600+ stocks, 6 filter dimensions, and preset strategies",
    "Clover default AI assistant that orchestrates Warren (portfolio) and Clara (personal-finance snapshot — not line items; not investment advice)",
    "Holdings explorer to rank your own positions and ask Warren about a figure (AI-generated; not investment advice)",
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
    "Price alerts via email, push, Telegram, and trefolio Leaf device",
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
        "Every feature included — holdings, real-time quotes, charts, growth projection, broker import, EU tax reports, AI analysis, and more — with conservative monthly quotas for casual investors.",
    },
    {
      "@type": "Offer",
      price: "7.99",
      priceCurrency: "EUR",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "7.99",
        priceCurrency: "EUR",
        billingDuration: 1,
        unitCode: "MON",
      },
      name: "Trefolio",
      description:
        "Every feature Folio has, with monthly quotas multiplied roughly 20x for power users. €7.99/month, or €59.99/year billed annually.",
    },
  ],
};

export const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How do I import my portfolio?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Go to the /import page to access all import methods: 14 broker CSV formats (DEGIRO, IBKR, Trading 212, Revolut, Schwab, Fidelity, and more), AI Import for screenshots or unsupported formats, and manual entry. Each method has a built-in step-by-step guide. Trefolio subscribers can use Broker Sync to connect their brokerage directly and import automatically — privacy-first, read-only access via SnapTrade.",
      },
    },
    {
      "@type": "Question",
      name: "What CSV formats are supported?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "14 broker CSV formats: DEGIRO, Interactive Brokers, Trading 212, Revolut, Charles Schwab, Fidelity, Nordnet, Tastytrade, Freetrade, eToro, Wealthsimple, Questrade, Firstrade, plus a Simple CSV format. For any other format, use AI Import — upload a screenshot or paste your file and AI will parse it. Trefolio subscribers can also use Broker Sync for automatic one-click import from 20+ brokerages.",
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
        text: "Both plans get every feature — fundamentals, intelligence, screener, moat reports, EU tax reports, AI analysis, exports, share links, and more. Folio (Free) has conservative monthly quotas designed for casual investors: 100 holdings, 15 AI consultations, 30 stock-intelligence lookups, etc. Trefolio (from €7.99/month with launch discount) keeps all the same features but multiplies the quotas roughly 20× so power users never hit a wall. Try Trefolio free for 7 days — no credit card required.",
      },
    },
    {
      "@type": "Question",
      name: "Can I cancel anytime?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Trefolio can be billed monthly or annually — switch to annual billing using the toggle above to save up to 37%. Cancel anytime from the billing portal; your paid features remain active until the end of the billing period.",
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
    {
      "@type": "Question",
      name: "How do Clover, Warren, and Clara work together?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Clover is trefolio’s default AI assistant. You ask one question; Clover brings in Warren for holdings, dividends, and allocation, and Clara for spending, cashflow, and savings (an aggregated snapshot — not every receipt). If you do not have Clara yet, Clover can propose creating your Clara space with the same login. Informational only — not financial advice.",
      },
    },
  ],
};

export default async function LandingLayout({ children }: { children: React.ReactNode }) {
  const commerceEnabled = await isCommerceEnabled();
  const softwareSchema = commerceEnabled
    ? SOFTWARE_APP_SCHEMA
    : {
        ...SOFTWARE_APP_SCHEMA,
        offers: [SOFTWARE_APP_SCHEMA.offers[0]],
      };

  return (
    <>
      <JsonLd data={WEBSITE_SCHEMA} />
      <JsonLd data={ORGANIZATION_SCHEMA} />
      <JsonLd data={softwareSchema} />
      <JsonLd data={FAQ_SCHEMA} />
      {children}
    </>
  );
}
