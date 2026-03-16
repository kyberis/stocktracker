# UX Writer Reference — Copy Examples by Persona Tier

## Welcome Email

### Beginner
**Subject:** Welcome to trefolio — let's get started
**Body:**
> Hi {name},
>
> Welcome to trefolio! You've taken a great first step toward understanding your investments.
>
> We've set up your portfolio space. You can add your stocks, ETFs, and funds in just a few taps — no financial expertise required.
>
> **What's next?**
> - Add your first investment (you can start with just one)
> - Watch your portfolio update in real time
> - Explore your performance over time
>
> If you ever feel lost, our help guides walk you through each step.

### Intermediate
**Subject:** Welcome to trefolio — your portfolio awaits
**Body:**
> Hi {name},
>
> Welcome to trefolio. Your portfolio is ready.
>
> Import your holdings from your broker or add them manually. Once your positions are in, you'll get real-time quotes, performance tracking, and dividend insights.
>
> **Get started:**
> - Import from your broker or add holdings manually
> - Review your allocation breakdown
> - Set price alerts for tickers you're watching

### Experienced
**Subject:** Welcome to trefolio
**Body:**
> Hi {name},
>
> Your trefolio account is live. Import your positions to start tracking performance, allocation, and dividends across all your portfolios.
>
> Key features: TTWROR performance, dividend yield tracking, multi-currency support, and broker sync.

### Professional
**Subject:** trefolio — account active
**Body:**
> {name},
>
> Account created. Import positions via broker API sync, CSV, or AI-assisted parsing. Multi-portfolio, multi-currency support with TTWROR, XIRR, and full dividend analytics available immediately.

---

## Price Alert Email

### Beginner
**Subject:** {ticker} just hit your price target
**Body:**
> Good news — {ticker} ({companyName}) has reached the price you were watching.
>
> It's now trading at {price} {currency}, which is {direction} your alert of {threshold} {currency}.
>
> This doesn't mean you need to do anything — it's just a heads-up so you can decide your next step.

### Intermediate
**Subject:** Price alert: {ticker} {direction} {threshold} {currency}
**Body:**
> {ticker} ({companyName}) is now at {price} {currency}, {direction} your {threshold} {currency} alert.
>
> Review your position and decide if any action is needed.

### Experienced / Professional
**Subject:** Alert: {ticker} {direction} {threshold}
**Body:**
> {ticker} at {price} {currency} ({direction} {threshold}). Review position.

---

## Upgrade Email (Starter / Bifolio)

### Beginner
**Subject:** You've upgraded — here's what's new
**Body:**
> Thanks for upgrading to Bifolio! Here's what you've just unlocked:
>
> - **Email alerts** — get notified when your stocks hit important prices
> - **Unlimited portfolios** — organize your investments however you like
> - **Detailed performance charts** — see how your portfolio is really doing over time
>
> Everything is already turned on in your account. Just keep using trefolio and you'll see the new features appear.

### Professional
**Subject:** Bifolio tier activated
**Body:**
> Your plan is now Bifolio. Active features: email/push alerts, unlimited portfolios, extended performance history, and priority data refresh.

---

## Error Messages

| Scenario | Beginner | Professional |
|----------|----------|-------------|
| Portfolio load failure | "We couldn't load your portfolio right now. This usually fixes itself — try refreshing the page." | "Portfolio load failed (timeout). Retry or check status." |
| Import parse error | "We had trouble reading your file. Make sure it's a CSV or Excel file from your broker, then try again." | "Import parse failed. Verify CSV format matches expected broker schema." |
| Quote fetch failure | "We can't get the latest prices right now. Your portfolio values may be a few minutes behind." | "Quote fetch unavailable. Displaying last cached values." |
| Rate limit | "You've made a lot of requests — please wait a moment and try again." | "Rate limit reached. Retry after cooldown." |

---

## Empty States

| Screen | Beginner | Professional |
|--------|----------|-------------|
| Portfolio (no holdings) | "Your portfolio is empty. Add your first investment to start tracking how it performs." | "No positions. Import or add holdings to begin." |
| Alerts (none set) | "You haven't set any alerts yet. Alerts let you know when a stock reaches a price you care about." | "No alerts configured." |
| Dividends (none) | "No dividend data yet. Once you add stocks that pay dividends, you'll see the details here." | "No dividend-paying positions in this portfolio." |

---

## Onboarding Steps

| Step | Beginner | Professional |
|------|----------|-------------|
| Experience selection | "How familiar are you with investing? This helps us tailor your experience." | "Select your experience level to customize the interface." |
| Currency | "Pick the currency you use most — we'll show your portfolio values in it." | "Set your default reporting currency." |
| Tax residency | "Which country do you pay taxes in? This helps us show relevant broker options." | "Select tax residency for withholding tax calculations." |
| Import | "Ready to add your investments? Pick how you'd like to get started." | "Choose your import method." |

---

## CTA Button Labels

| Action | Beginner | Intermediate+ |
|--------|----------|--------------|
| Add holding | "Add your first investment" | "Add holding" |
| Import | "Import your portfolio" | "Import" |
| View details | "See more details" | "View details" |
| Set alert | "Set a price alert" | "Create alert" |
| Upgrade | "See what's included" | "Upgrade plan" |
