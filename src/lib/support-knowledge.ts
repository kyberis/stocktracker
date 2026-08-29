/**
 * Static knowledge base for the AI support chatbot.
 * Kept centralized so it can be updated without modifying the API route.
 */

export const SUPPORT_KNOWLEDGE = `
# trefolio — Product Knowledge Base

## About trefolio
trefolio is a portfolio tracker for European investors. It tracks stocks, ETFs, cryptocurrencies, and manual assets (real estate, savings, pensions). All prices are shown in EUR by default, but users can choose other display currencies. Market data comes from Yahoo Finance (free) and Alpha Vantage (Pro).

## Subscription Tiers

Four plans: **Free**, **Basic** (€4.99/mo or €49/yr), **Pro** (€9.99/mo or €89/yr), and **Wealth · Ultra** (€24.99/mo or €199/yr). One Stripe subscription. Upgrading a paid plan updates the existing subscription and credits unused time on the same invoice.

### Free
- Load data and a short monthly AI burst (Lite model)
- Tight quotas (see in-app table)
- One portfolio
- Yahoo-backed quotes, charts, benchmarks, crypto overview, earnings calendar for your holdings
- No multi-agent screenings

### Basic
- Daily Clara × Warren habit (Standard model)
- Higher monthly consultations than Free
- Still no multi-agent screenings

### Pro
- Scale: higher quotas, Will at volume, Standard+ models
- 2 multi-agent screenings / month
- Broker Sync and premium market-data headroom (see in-app limits)

### Wealth · Ultra
- Lab tier: Advanced models
- 12 multi-agent screenings / month plus packs
- Highest published quotas

Confirm current prices and quotas on the pricing page or in-app billing. AI is informational and may contain errors — not financial advice.

## Common Tasks

### Adding Holdings
1. Click the "+" button on the dashboard or use the toolbar
2. Search by ticker symbol or company name
3. Enter shares, price, and date
4. The holding appears in your portfolio immediately

### Setting Up Price Alerts
1. Go to the Alerts section (bell icon)
2. Click "New Alert"
3. Choose a ticker, condition (above/below), and threshold price
4. Select notification channels (email, push, WhatsApp for Pro)
5. Alerts check every 15 minutes during market hours

### Importing from a Broker
- **File import:** CSV, Excel, PDF, or screenshot — the AI parser auto-detects your broker format
- **Broker Sync (Trefolio):** Connect your brokerage via SnapTrade for automatic sync with many supported brokerages
- Supported brokers include Interactive Brokers, Degiro, Trade Republic, Scalable Capital, eToro, and many more

### Managing Subscriptions
- Upgrade: Go to Settings > Subscription > "Upgrade"
- Downgrade: Settings > Subscription > "Manage Billing" to access the Stripe billing portal
- Cancel: Through the Stripe billing portal — you keep access until the end of your billing period
- Change plan: Monthly ↔ Annual through the billing portal

### Dashboard Themes
- **Default:** Clean, modern light/dark theme (all users)
- **Canvas, Terminal, Studio (Trefolio):** Additional premium themes
- Change in Settings > Appearance

### Exporting Data
- **CSV Export (Trefolio):** Dashboard toolbar > Export button
- Exports holdings, transactions, and cash balances as separate CSV files

## Troubleshooting

### "My prices aren't updating"
- Yahoo Finance data has a 15-minute delay for most exchanges
- Some tickers (especially small caps or foreign exchanges) may update less frequently
- Try refreshing the page or check if the market is currently open
- If a specific ticker consistently fails, it may need a different Yahoo symbol format

### "My import didn't work"
- Ensure the file is a supported format (CSV, XLSX, PDF, or image)
- For CSV files, check that the delimiter is comma or semicolon
- Broker-specific formats are auto-detected — if yours fails, try the AI-powered import
- Maximum file size is 5MB

### "Alerts aren't triggering"
- Verify the alert is enabled (toggle is on)
- Check that the threshold hasn't already been passed (one-time trigger)
- Email alerts require a verified email address
- WhatsApp alerts require phone verification in Settings
- Alerts check every 15 minutes — there may be a short delay

### "Broker Sync not working"
- SnapTrade connections may expire — try reconnecting
- Some brokerages require re-authentication periodically
- If you see "needs attention," click it to re-authorize
- Contact support@trefolio.com for persistent sync issues

### "Data looks wrong"
- Check the display currency — values convert at current exchange rates
- Dividend data comes from Yahoo Finance and may be delayed
- For stocks listed in GBX (British pence), trefolio auto-converts to GBP
- Manual transactions override automatic calculations — verify your entries

## Financial Disclaimer
trefolio is an informational tool only. It does NOT provide financial advice, investment recommendations, or tax advice. All AI analyses are for educational purposes. Users should consult qualified financial advisors before making investment decisions. Past performance does not guarantee future results.

## Contact
- Email: support@trefolio.com
- Contact form: https://trefolio.com/contact
- In-app feedback button on the dashboard
`;

export function buildSupportSystemPrompt(
  language: string,
  customInstructions: string,
  portfolioContext?: { holdingsCount: number; totalValue: number; currency: string; plan: string },
): string {
  let prompt = `You are a friendly, knowledgeable support agent for trefolio, a portfolio tracking app for European investors. Your goal is to help users with questions about the platform, troubleshoot issues, and guide them through features.

Rules:
- Write in ${language}.
- Be concise but thorough. Use short paragraphs.
- Use a warm, helpful tone — imagine talking to a friend who is new to investing.
- ONLY answer questions related to trefolio and its features. For investment advice, politely decline and mention the financial disclaimer.
- If you cannot resolve an issue, suggest the user contact human support via the feedback button or at support@trefolio.com.
- When describing navigation, use specific UI element names (e.g., "click the bell icon in the toolbar").
- Format responses with markdown for readability (bold key terms, use bullet points for steps).
- Keep responses under 400 words.
- Never fabricate features that don't exist in the knowledge base.

${SUPPORT_KNOWLEDGE}`;

  if (portfolioContext) {
    prompt += `\n\n## Current User Context
- Plan: ${portfolioContext.plan}
- Holdings count: ${portfolioContext.holdingsCount}
- Portfolio value: ${portfolioContext.totalValue.toFixed(2)} ${portfolioContext.currency}
`;
  }

  if (customInstructions) {
    prompt += `\n\n## Additional Instructions from Admin\n${customInstructions}`;
  }

  return prompt;
}
