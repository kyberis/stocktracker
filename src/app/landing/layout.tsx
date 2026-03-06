import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "trefolio — Simple Portfolio Tracking with AI Insights",
  description:
    "trefolio is a portfolio tracker for European investors. Real-time quotes, broker imports (DEGIRO, IBKR, T212, Revolut), AI analysis, and dividend projections. Free to start, Pro for €4.99/month.",
  alternates: { canonical: "https://trefolio.com" },
  openGraph: {
    title: "trefolio — Simple Portfolio Tracking with AI Insights",
    description:
      "The simplest way to manage your stock portfolio. Real-time quotes, dividend tracking, growth projections, and AI analysis — for just €4.99/month.",
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
      "The simplest way to manage your stock portfolio. Real-time quotes, dividend tracking, growth projections, and AI analysis — for just €4.99/month.",
    images: ["/screenshots/dashboard-overview.png"],
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
      name: "Free",
      description:
        "Up to 15 holdings, real-time quotes, charts, broker import, 5 AI calls/month",
    },
    {
      "@type": "Offer",
      price: "4.99",
      priceCurrency: "EUR",
      name: "Pro",
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
        text: "Go to your Dashboard and click the upload icon in the header. Choose your broker (DEGIRO, Interactive Brokers, Trading 212, Revolut, or Simple CSV), drag & drop your file, review the parsed transactions, and click Import All. Your holdings will appear on the dashboard immediately.",
      },
    },
    {
      "@type": "Question",
      name: "What CSV formats are supported?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Five formats: (1) DEGIRO Account.csv, (2) Interactive Brokers Activity Statement or Flex Query CSV, (3) Trading 212 History CSV export, (4) Revolut Account Statement (Excel/CSV), and (5) Simple CSV with columns: ticker, type, price, amount, currency.",
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
      name: "What's the difference between Free and Pro?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Free includes up to 15 holdings, real-time quotes, charts, broker import, and 5 AI calls/month. Pro (€4.99/month) adds unlimited holdings, unlimited AI analysis, company fundamentals, stock intelligence, economic indicators, and Alpha Vantage premium data.",
      },
    },
    {
      "@type": "Question",
      name: "Can I cancel Pro anytime?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Pro is billed monthly (€4.99) or annually (€39.99/year, save 33%). You can cancel anytime from the billing portal — your Pro features remain active until the end of the billing period.",
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
      <JsonLd data={ORGANIZATION_SCHEMA} />
      <JsonLd data={SOFTWARE_APP_SCHEMA} />
      <JsonLd data={FAQ_SCHEMA} />
      {children}
    </>
  );
}
