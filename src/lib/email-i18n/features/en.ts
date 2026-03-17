import type { FeatureTemplateStrings, TemplateFooterStrings } from "../template-types";

export const footer: TemplateFooterStrings = {
  receivedText: "You received this email from trefolio.",
  unsubscribeLabel: "Unsubscribe"
};

export const features: Record<string, FeatureTemplateStrings> = {
  "feature-real-time-quotes": {
    heading: "Real-time Quotes",
    intro: "Your portfolio dashboard updates prices live throughout the trading day — no manual refresh needed.",
    sectionLabel: "What you get:",
    features: [
      {
        title: "60+ Exchanges",
        desc: "Prices from NYSE, NASDAQ, Euronext, London, Frankfurt, and more — powered by Yahoo Finance."
      },
      {
        title: "Auto-refresh",
        desc: "Quotes refresh every 15 seconds (configurable to 30s or 60s in your settings)."
      },
      {
        title: "Multi-currency",
        desc: "See values in your local currency. We support 21 currencies with automatic conversion."
      }
    ],
    tierText: "Available on all plans",
    ctaLabel: "Open Your Dashboard"
  },
  "feature-dividend-tracking": {
    heading: "Dividend Tracking",
    intro: "trefolio automatically detects dividends from your holdings and builds a complete income picture.",
    sectionLabel: "What you get:",
    features: [
      {
        title: "Dividend Calendar",
        desc: "See upcoming payments month by month. Know exactly when dividends land in your account."
      },
      {
        title: "Annual Income",
        desc: "Total projected dividend income across your entire portfolio with per-stock breakdowns."
      },
      {
        title: "Yield-on-Cost",
        desc: "Track your real yield based on purchase price — not just the current dividend rate."
      },
      {
        title: "DRIP Simulation",
        desc: "See how reinvesting dividends could compound your returns over 5, 10, or 20 years."
      }
    ],
    tierText: "Available on all plans",
    ctaLabel: "View Your Dividends"
  },
  "feature-ai-analysis": {
    heading: "AI Stock Analysis",
    intro: "Ask our AI about any stock in your portfolio or any ticker you're considering. Get institutional-quality analysis in seconds.",
    sectionLabel: "What you can ask:",
    features: [
      {
        title: "Earnings Analysis",
        desc: "\"How were AAPL's last earnings?\" — get a summary of results, guidance, and market reaction."
      },
      {
        title: "Risk Assessment",
        desc: "\"What are the risks of holding TSLA?\" — competitive threats, valuation, and macro factors."
      },
      {
        title: "Competitor Comparison",
        desc: "\"Compare MSFT vs GOOG\" — side-by-side analysis of financials, growth, and valuation."
      },
      {
        title: "Portfolio Review",
        desc: "\"Review my portfolio\" — AI analyzes your allocation, risk, and suggests improvements."
      }
    ],
    tierText: "Folio: 5 calls/month | Bifolio: 20/month | Trefolio: Unlimited",
    ctaLabel: "Try AI Analysis Now"
  },
  "feature-price-alerts": {
    heading: "Price Alerts",
    intro: "Never miss a price movement that matters. Set target prices and get notified the moment a stock crosses your threshold.",
    sectionLabel: "How it works:",
    features: [
      {
        title: "Threshold Alerts",
        desc: "Set \"above\" or \"below\" price targets. Get notified when any stock crosses your line."
      },
      {
        title: "Percent Change Alerts",
        desc: "Track daily or from-purchase percent changes. Catch drops or rallies early."
      },
      {
        title: "Multi-channel",
        desc: "Email and push alerts on Bifolio. Add WhatsApp and device alerts on Trefolio."
      },
      {
        title: "Cron-powered",
        desc: "Our system checks prices every minute during market hours. You never need to watch the screen."
      }
    ],
    tierText: "Bifolio: Up to 10 alerts | Trefolio: Unlimited alerts",
    ctaLabel: "Create Your First Alert"
  },
  "feature-broker-import": {
    heading: "Portfolio Import",
    intro: "Manually adding stocks one by one? There's a faster way. trefolio supports three import methods to get your full portfolio in seconds.",
    sectionLabel: "Choose your method:",
    features: [
      {
        title: "Broker Sync",
        desc: "Connect your brokerage and we auto-sync your holdings, cash, and transactions. One-click setup, always up to date."
      },
      {
        title: "CSV Upload",
        desc: "Export a CSV from your broker and upload it. We support 20+ broker formats including DEGIRO, Interactive Brokers, Trade Republic, and more."
      },
      {
        title: "AI Import",
        desc: "Upload any file — CSV, PDF, or screenshot — and our AI will parse it into your portfolio. Works even with unusual formats."
      }
    ],
    tierText: "Folio: CSV & Manual | Bifolio: + Broker Sync | Trefolio: + AI Import",
    ctaLabel: "Import Your Portfolio"
  },
  "feature-fundamentals": {
    heading: "Company Fundamentals",
    intro: "Go beyond stock prices. trefolio gives you access to complete company financials — the same data professional analysts use.",
    sectionLabel: "What you get:",
    features: [
      {
        title: "Income Statement",
        desc: "Revenue, net income, margins, and earnings per share — quarterly and annual."
      },
      {
        title: "Balance Sheet",
        desc: "Assets, liabilities, debt levels, and book value at a glance."
      },
      {
        title: "Cash Flow",
        desc: "Operating, investing, and financing cash flows. See if the company generates real cash."
      },
      {
        title: "Insider Trades",
        desc: "See what executives and directors are buying and selling."
      },
      {
        title: "Institutional Holdings",
        desc: "Track what the big funds own — Vanguard, BlackRock, Fidelity, and more."
      }
    ],
    tierText: "Trefolio Pro exclusive",
    ctaLabel: "Explore Fundamentals"
  },
  "feature-stock-screener": {
    heading: "Stock Screener",
    intro: "Discover stocks that match your investment criteria. Filter 600+ stocks across multiple dimensions and apply proven strategies.",
    sectionLabel: "Filter by:",
    features: [
      {
        title: "6 Filter Dimensions",
        desc: "Market cap, P/E ratio, dividend yield, sector, country, and exchange. Combine as many as you want."
      },
      {
        title: "5 Built-in Strategies",
        desc: "Value investing, dividend growth, momentum, quality, and small-cap strategies — one-click presets."
      },
      {
        title: "Rich Data",
        desc: "Price, change %, market cap, P/E, dividend yield, and sector for every result."
      },
      {
        title: "Quick Add",
        desc: "Found something interesting? Add it to your portfolio or watchlist directly from results."
      }
    ],
    tierText: "Trefolio Pro exclusive",
    ctaLabel: "Open the Screener"
  },
  "feature-tax-reports": {
    heading: "Tax Reports",
    intro: "Tax reporting doesn't have to be painful. trefolio generates country-specific tax reports and includes an AI Tax Assistant for your questions.",
    sectionLabel: "What you get:",
    features: [
      {
        title: "5 EU Countries",
        desc: "Country-specific reports for Germany, France, Spain, Netherlands, and Italy."
      },
      {
        title: "Gains & Losses",
        desc: "Calculated capital gains, losses, and holding period for each position."
      },
      {
        title: "Dividend Income",
        desc: "Gross dividends, withholding tax, and net income by country of origin."
      },
      {
        title: "AI Tax Assistant",
        desc: "Ask questions like \"How much withholding tax did I pay on US dividends?\" and get instant answers."
      }
    ],
    tierText: "Trefolio Pro exclusive",
    ctaLabel: "Generate Your Tax Report"
  },
  "feature-portfolio-simulator": {
    heading: "Portfolio Simulator",
    intro: "Test your investment ideas before committing real money. The portfolio simulator lets you backtest, stress-test, and explore what-if scenarios.",
    sectionLabel: "Three modes:",
    features: [
      {
        title: "Backtest",
        desc: "See how a portfolio would have performed historically. Compare against S&P 500, MSCI World, or a custom benchmark."
      },
      {
        title: "Stress Testing",
        desc: "What if the market drops 30%? What about rising rates? See how your portfolio holds up under different scenarios."
      },
      {
        title: "What-if Analysis",
        desc: "Add or remove positions, change allocations, and instantly see the impact on risk and return."
      }
    ],
    tierText: "Trefolio Pro exclusive",
    ctaLabel: "Open the Simulator"
  },
  "feature-net-worth": {
    heading: "Net Worth Tracking",
    intro: "Your investments are just one part of your finances. Track everything — real estate, savings, pensions, and more — in one place.",
    sectionLabel: "What you can track:",
    features: [
      {
        title: "Real Estate",
        desc: "Add properties with current value. Update when market conditions change."
      },
      {
        title: "Savings Accounts",
        desc: "Track cash in banks across different currencies."
      },
      {
        title: "Pensions & Insurance",
        desc: "Include pension funds and life insurance policies in your net worth."
      },
      {
        title: "Total Net Worth",
        desc: "See everything combined: stocks + ETFs + crypto + real estate + savings + pensions = your complete picture."
      }
    ],
    tierText: "Bifolio: Up to 10 assets | Trefolio: Up to 999 assets",
    ctaLabel: "Add Manual Assets"
  },
  "feature-crypto": {
    heading: "Crypto Portfolio",
    intro: "Track crypto alongside your stocks and ETFs. Get the same level of analysis and insights for your crypto holdings.",
    sectionLabel: "What you get:",
    features: [
      {
        title: "Crypto Dashboard",
        desc: "Prices, 24h changes, volume, and market cap for top cryptocurrencies."
      },
      {
        title: "Portfolio Tracking",
        desc: "Add crypto positions alongside stocks. See unified portfolio value and allocation."
      },
      {
        title: "Charts & History",
        desc: "Price charts with multiple timeframes and exchange rate overlays."
      },
      {
        title: "AI Crypto Analysis",
        desc: "Ask our AI about any crypto — fundamentals, trends, and market analysis."
      }
    ],
    tierText: "Folio: Market overview | Trefolio: Full portfolio tracking & AI",
    ctaLabel: "Explore Crypto"
  }
};
