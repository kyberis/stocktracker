import type { WelcomeNoStocksStrings, WelcomeFreeStocksStrings, BifolioUpgradeStrings, TrefolioUpgradeStrings } from "../template-types";

export const welcomeNoStocks: WelcomeNoStocksStrings = {
  heading: "Welcome to trefolio!",
  paragraph: "Your account is ready. trefolio is the extra leaf for your portfolio — everything you need to track, understand, and grow your investments in one place.",
  features: [
    {
      title: "Real-time Quotes",
      desc: "Live prices from Yahoo Finance across 60+ global exchanges. See your portfolio value update throughout the day."
    },
    {
      title: "Dividend Tracking",
      desc: "Automatic dividend detection, annual income projections, yield-on-cost, and monthly payment calendar."
    },
    {
      title: "AI-Powered Analysis",
      desc: "Ask our AI about any stock — get earnings analysis, competitor comparisons, and risk assessments. 5 free calls/month."
    },
    {
      title: "Easy Import",
      desc: "Bring your portfolio from 20+ brokers via CSV upload, one-click Broker Sync, or AI-assisted import."
    },
    {
      title: "Price Alerts",
      desc: "Get notified when stocks hit your target price. Email and push alerts are available."
    },
    {
      title: "Advanced Metrics",
      desc: "Sharpe ratio, max drawdown, volatility, and full performance history to measure your strategy."
    },
    {
      title: "Fundamentals & Intelligence",
      desc: "Company financials, insider trades, institutional holdings, and news sentiment — all in one view."
    },
    {
      title: "Stock Screener",
      desc: "Screen 600+ stocks with 6 filters and 5 built-in strategies to discover new opportunities."
    }
  ],
  ctaPrimary: "Add Your First Stock",
  ctaSecondary: "Explore the Dashboard",
  tipText: "&#x1F4A1; <strong>Getting started is easy:</strong> Add just one stock to see your dashboard come alive with real-time data, charts, and AI insights."
};

export const welcomeFreeStocks: WelcomeFreeStocksStrings = {
  heading: "You're off to a great start!",
  intro: "You've added your first stocks — your portfolio dashboard is now tracking your investments in real time. Here's what trefolio can do for you:",
  features: [
    {
      title: "Real-time Dashboard",
      desc: "Your portfolio value, daily changes, allocation breakdown, and performance charts — all updating live."
    },
    {
      title: "Dividend Insights",
      desc: "Annual income projections, yield tracking, and a monthly dividend calendar for your holdings."
    },
    {
      title: "AI Stock Analysis",
      desc: "Ask our AI anything about your stocks. Get earnings analysis, risk assessments, and competitive insights."
    },
    {
      title: "Price Alerts",
      desc: "Never miss a price movement. Set alerts and get notified by email or push notification."
    },
    {
      title: "Performance Metrics",
      desc: "Sharpe ratio, max drawdown, TTWROR, and full portfolio growth history over any time period."
    },
    {
      title: "Company Fundamentals",
      desc: "Income statements, balance sheets, cash flow, insider trades, and institutional holdings."
    },
    {
      title: "Stock Screener & Simulator",
      desc: "Screen 600+ stocks and backtest portfolio strategies with our what-if simulator."
    }
  ],
  voucherTitle: "Exclusive offer",
  voucherDiscountDisplay: "75% OFF",
  voucherApply: "Use code at checkout:",
  voucherValid: "Valid monthly or annual",
  ctaPrimary: "Upgrade Now — 75% Off",
  ctaSecondary: "Explore the Dashboard",
  tipText: "&#x1F4A1; <strong>Getting started is easy:</strong> Add just one stock to see your dashboard come alive with real-time data, charts, and AI insights."
};

export const bifolioUpgrade: BifolioUpgradeStrings = {
  heading: "Welcome to trefolio!",
  paragraph: "Your upgrade is active. Here's everything you just unlocked:",
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
  ctaPrimary: "Set Up Your First Alert",
  ctaSecondary: "Share Your Portfolio",
  upsellText: "<strong>Want even more?</strong> Explore company fundamentals, the stock screener, tax reports, and WhatsApp alerts in your dashboard. <a href=\"{{base_url}}/profile?utm_source=email&utm_medium=lifecycle&utm_campaign=bifolio_upgrade\" style=\"color:#b45309;text-decoration:underline;font-weight:600;\">Learn more</a>"
};

export const trefolioUpgrade: TrefolioUpgradeStrings = {
  heading: "Welcome to trefolio!",
  paragraph: "You now have full access to every feature trefolio offers. Here's your complete toolkit:",
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
  ctaPrimary: "Explore AI Insights",
  ctaSecondary: "View Fundamentals",
  communityText: "&#x1F31F; <strong>You're one of our first 500 Pro members.</strong> Thank you for believing in trefolio. Your feedback shapes what we build next."
};
