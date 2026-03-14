# trefolio — App Store & Google Play Submission Guide

> Goal: **#1 in Finance category** on both stores.

---

## Table of Contents

1. [Pre-Submission Checklist](#1-pre-submission-checklist)
2. [App Icons](#2-app-icons)
3. [Screenshots & Preview Video](#3-screenshots--preview-video)
4. [Store Listing Copy — Apple App Store](#4-store-listing-copy--apple-app-store)
5. [Store Listing Copy — Google Play](#5-store-listing-copy--google-play)
6. [Build & Sign — iOS](#6-build--sign--ios)
7. [Build & Sign — Android](#7-build--sign--android)
8. [Upload to App Store Connect](#8-upload-to-app-store-connect)
9. [Upload to Google Play Console](#9-upload-to-google-play-console)
10. [In-App Purchases / Subscriptions](#10-in-app-purchases--subscriptions)
11. [Review Notes & Compliance](#11-review-notes--compliance)
12. [ASO — App Store Optimization](#12-aso--app-store-optimization)
13. [Launch Day Playbook](#13-launch-day-playbook)

---

## 1. Pre-Submission Checklist

### Accounts

| Item | Status | Action |
|------|--------|--------|
| Apple Developer Program ($99/yr) | ◻️ | [Enroll](https://developer.apple.com/programs/) |
| Google Play Developer ($25 one-time) | ◻️ | [Register](https://play.google.com/console/signup) |
| D-U-N-S Number (if org account) | ◻️ | [Lookup](https://developer.apple.com/enroll/duns-lookup/) |
| Stripe production keys in Vercel | ◻️ | Verify `STRIPE_SECRET_KEY` is live mode |
| Privacy Policy live at `https://trefolio.com/privacy` | ◻️ | Verify |
| Terms of Service live at `https://trefolio.com/terms` | ◻️ | Verify |
| Support URL | ◻️ | `https://trefolio.com/support` or email |
| Marketing URL | ◻️ | `https://trefolio.com` |
| Contact email for review team | ◻️ | e.g. `support@trefolio.com` |

### Technical

| Item | Status | Action |
|------|--------|--------|
| Production URL working (`https://trefolio.com`) | ◻️ | Verify all routes |
| `capacitor.config.ts` server URL → `https://trefolio.com` | ◻️ | Already set |
| App icon (1024×1024 PNG, no alpha) | ◻️ | See Section 2 |
| Splash screen configured | ◻️ | Already done (`#020617` bg) |
| All API keys are production | ◻️ | Yahoo Finance, OpenAI, Stripe |
| Analytics working | ◻️ | GA4 events firing |
| Push notifications cert (APNs) | ◻️ | Generate in Apple Dev Portal |
| Firebase Cloud Messaging key | ◻️ | For Android push |

---

## 2. App Icons

### Requirements

| Platform | Size | Format |
|----------|------|--------|
| iOS | 1024×1024 | PNG, no transparency, no rounded corners |
| Android | 512×512 (Play Store) | PNG, 32-bit with alpha |
| Android adaptive icon | 108×108dp foreground + background | Vector drawable or PNG |

### Current State

- iOS: `ios/App/App/Assets.xcassets/AppIcon.appiconset/` — Contents.json configured, PNG files referenced
- Android: `android/app/src/main/res/` — vector drawable icons

### Action Items

1. **Export the trefolio logo at 1024×1024** — dark navy background (`#0f172a`), four-leaf clover in emerald gradients, rounded corners only for Android (iOS rounds automatically)
2. Generate all iOS sizes from the 1024px master:

```bash
# From the 1024×1024 master icon
sips -z 40 40 icon-1024.png --out icon-40.png
sips -z 60 60 icon-1024.png --out icon-60.png
sips -z 58 58 icon-1024.png --out icon-58.png
sips -z 87 87 icon-1024.png --out icon-87.png
sips -z 80 80 icon-1024.png --out icon-80.png
sips -z 120 120 icon-1024.png --out icon-120.png
sips -z 180 180 icon-1024.png --out icon-180.png
sips -z 76 76 icon-1024.png --out icon-76.png
sips -z 152 152 icon-1024.png --out icon-152.png
sips -z 167 167 icon-1024.png --out icon-167.png
```

3. Place them in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
4. For Android, update `ic_launcher_foreground.xml` or generate PNGs for `mipmap-*` directories

---

## 3. Screenshots & Preview Video

### Apple App Store Requirements

| Device | Size (px) | Required |
|--------|-----------|----------|
| iPhone 6.9" (16 Pro Max) | 1320×2868 | Yes (required for latest) |
| iPhone 6.7" (15 Pro Max) | 1290×2796 | Yes |
| iPhone 6.5" (14 Plus) | 1284×2778 | Yes |
| iPhone 5.5" (SE/8 Plus) | 1242×2208 | Optional |
| iPad Pro 13" | 2048×2732 | If supporting iPad |

**Up to 10 screenshots per device size. First 3 are critical — they show in search results.**

### Google Play Requirements

| Type | Size | Required |
|------|------|----------|
| Phone screenshots | 1080×1920 (min 320px, max 3840px) | 2–8 required |
| 7" tablet | 1200×1920 | Recommended |
| 10" tablet | 1600×2560 | Recommended |
| Feature graphic | 1024×500 | Required (Play Store header) |

### Screenshot Strategy (10 screens — ordered for maximum conversion)

| # | Screen | Headline (EN) | Headline (ES) |
|---|--------|---------------|---------------|
| 1 | Portfolio dashboard with holdings cards | **All Your Investments in One Place** | **Todas tus inversiones en un solo lugar** |
| 2 | Portfolio value chart + P&L summary | **Know Your Real Performance** | **Conoce tu rendimiento real** |
| 3 | Diversification pie charts | **Visualize Your Diversification** | **Visualiza tu diversificación** |
| 4 | Dividend income calendar | **Track & Project Dividend Income** | **Sigue y proyecta tus dividendos** |
| 5 | AI analysis / News feed | **AI-Powered Insights in 35 Languages** | **Análisis con IA en 35 idiomas** |
| 6 | Stock screener (Pro) | **Discover Stocks with Smart Screener** | **Descubre acciones con el screener** |
| 7 | EU Tax Reports | **EU Tax Reports — 17 Countries** | **Informes fiscales — 17 países** |
| 8 | Price Alerts + Watchlist | **Never Miss a Price Move** | **No pierdas ningún movimiento** |
| 9 | Portfolio simulator / growth projection | **Simulate Your Portfolio's Future** | **Simula el futuro de tu portafolio** |
| 10 | Multi-portfolio + themes | **Multiple Portfolios, Beautiful Themes** | **Varios portafolios, temas elegantes** |

### Screenshot Design Specs

- **Background**: gradient from `#0f172a` (top) → `#020617` (bottom)
- **Device frame**: iPhone 15 Pro / Pixel 8 mockup (use `mockuphone.com` or Figma)
- **Headline**: white, bold, 48–56pt, centered above device frame
- **Subheadline** (optional): `#94a3b8` (slate-400), 24pt
- **Trefolio logo watermark**: bottom-right corner, 20% opacity
- **Font**: SF Pro Display (iOS) / Google Sans (Android)

### App Preview Video (Optional, Highly Recommended)

- **Duration**: 15–30 seconds
- **Resolution**: 1080×1920 (portrait)
- **Content flow**:
  1. Logo animation (2s)
  2. Portfolio overview → swipe tabs (5s)
  3. Add stock → see it in cards (4s)
  4. Dividend calendar → income projection (4s)
  5. AI analysis highlight (3s)
  6. Tax report generation (3s)
  7. "Free to Start" CTA with App Store badge (4s)

---

## 4. Store Listing Copy — Apple App Store

### App Name (30 chars max)

```
trefolio — Portfolio Tracker
```

### Subtitle (30 chars max)

```
EU Taxes, Dividends & AI
```

### Promotional Text (170 chars, can be updated without review)

```
🚀 Launch special: Trefolio Pro at €5/mo (annual). EU tax reports for 17 countries, stock screener, AI insights in 35 languages. Start free — no card required.
```

### Description (4000 chars max)

```
trefolio is the portfolio tracker built for European investors. Track all your investments in one place with real-time prices, AI-powered insights, and the only EU tax report tool that covers 17 countries.

▸ ALL YOUR INVESTMENTS IN ONE PLACE
Track stocks, ETFs, crypto, and cash across multiple portfolios. Real-time quotes from 70+ exchanges worldwide. See your total portfolio value in EUR, USD, GBP, CHF, or any of 21 supported currencies.

▸ KNOW YOUR REAL PERFORMANCE
True Time-Weighted Rate of Return (TTWROR) and XIRR calculations — the same methods used by professional fund managers. Benchmark against S&P 500, MSCI World, EURO STOXX 50, and more.

▸ DIVIDEND TRACKING & PROJECTIONS
See your annual dividend income, yields, payout ratios, and ex-dividend dates. Monthly income chart shows when you get paid. Project future income based on your current holdings.

▸ AI-POWERED INSIGHTS
AI analyzes your portfolio and delivers personalized recommendations. Stay informed with curated financial news. Earnings calendar keeps you ahead of market moves.

▸ EU TAX REPORTS — 17 COUNTRIES
Generate tax reports for Germany (Anlage KAP), Spain (Modelo 100), France, Netherlands, Italy, Belgium, Austria, Portugal, Ireland, Sweden, Denmark, Norway, Finland, Poland, Switzerland, UK, and USA. FIFO, LIFO, and average cost basis methods.

▸ STOCK SCREENER
Filter 10,000+ stocks by P/E, dividend yield, market cap, sector, and dozens more criteria. Save custom screens and get alerts.

▸ SMART IMPORT
Import from 14 brokers (DEGIRO, Interactive Brokers, Trade Republic, Scalable Capital, and more). AI Import reads any CSV. SnapTrade auto-syncs your broker account.

▸ NET WORTH TRACKING
Track your complete financial picture: investments, real estate, cash, pension, and liabilities. See net worth growth over time.

▸ 35 LANGUAGES
Full interface and AI insights in English, Spanish, German, French, Dutch, Italian, Portuguese, and 28 more languages.

▸ PRIVACY FIRST
Your data is encrypted and never sold. We don't show ads. You own your data — export or delete anytime.

PRICING
• Folio (Free): 15 holdings, 1 portfolio, core dashboard, dividends, diversification
• Bifolio (Starter): €2.99/mo — unlimited holdings, 5 portfolios, price alerts, performance metrics
• Trefolio (Pro): €7.99/mo — everything unlimited, EU tax reports, stock screener, AI insights, simulator

Start free. Upgrade when you're ready.

Questions? support@trefolio.com
```

### Keywords (100 chars max, comma-separated)

```
portfolio tracker,dividend,stock,investment,EU tax,DEGIRO,broker,ETF,crypto,performance,screener,AI
```

### Category

- **Primary**: Finance
- **Secondary**: Productivity

### Age Rating

- **Rating**: 4+ (no objectionable content)

### Copyright

```
© 2026 trefolio
```

---

## 5. Store Listing Copy — Google Play

### App Name (30 chars max)

```
trefolio — Portfolio Tracker
```

### Short Description (80 chars max)

```
Track stocks, dividends & crypto. EU tax reports. AI insights in 35 languages.
```

### Full Description (4000 chars max)

```
trefolio is the portfolio tracker built for European investors. Track all your investments in one place with real-time prices, AI-powered insights, and the only EU tax report tool that covers 17 countries.

★ ALL YOUR INVESTMENTS IN ONE PLACE
Track stocks, ETFs, crypto, and cash across multiple portfolios. Real-time quotes from 70+ exchanges worldwide. See your total portfolio value in EUR, USD, GBP, CHF, or any of 21 supported currencies.

★ KNOW YOUR REAL PERFORMANCE
True Time-Weighted Rate of Return (TTWROR) and XIRR calculations — the same methods used by professional fund managers. Benchmark against S&P 500, MSCI World, EURO STOXX 50, and more.

★ DIVIDEND TRACKING & PROJECTIONS
See your annual dividend income, yields, payout ratios, and ex-dividend dates. Monthly income chart shows when you get paid. Project future income based on your current holdings.

★ AI-POWERED INSIGHTS
AI analyzes your portfolio and delivers personalized recommendations. Stay informed with curated financial news. Earnings calendar keeps you ahead of market moves.

★ EU TAX REPORTS — 17 COUNTRIES
Generate tax reports for Germany (Anlage KAP), Spain (Modelo 100), France, Netherlands, Italy, Belgium, Austria, Portugal, Ireland, Sweden, Denmark, Norway, Finland, Poland, Switzerland, UK, and USA. FIFO, LIFO, and average cost basis methods.

★ STOCK SCREENER
Filter 10,000+ stocks by P/E, dividend yield, market cap, sector, and dozens more criteria. Save custom screens and get alerts.

★ SMART IMPORT
Import from 14 brokers (DEGIRO, Interactive Brokers, Trade Republic, Scalable Capital, and more). AI Import reads any CSV. SnapTrade auto-syncs your broker account.

★ NET WORTH TRACKING
Track your complete financial picture — investments, real estate, cash, pension, and liabilities.

★ 35 LANGUAGES
Full interface and AI insights in English, Spanish, German, French, Dutch, Italian, Portuguese, and 28 more languages.

★ PRIVACY FIRST
Your data is encrypted and never sold. No ads. Export or delete your data anytime.

PRICING
• Folio (Free): 15 holdings, 1 portfolio, core dashboard, dividends, diversification
• Bifolio: €2.99/mo — unlimited holdings, 5 portfolios, price alerts
• Trefolio Pro: €7.99/mo — everything, EU tax reports, screener, AI, simulator

Start free. No credit card required.

Questions? support@trefolio.com
```

### Category

- **Application type**: Finance
- **Tags**: `Portfolio Tracker`, `Stock Tracker`, `Dividend Tracker`, `Investment`, `Tax Report`

### Content Rating

- IARC: **Everyone** (no violence, no adult content)

### Feature Graphic (1024×500)

- Dark gradient background (`#0f172a` → `#020617`)
- trefolio logo left-center
- Right side: iPhone/Pixel mockup showing portfolio dashboard
- Tagline: **"Your portfolio. Understood."**

---

## 6. Build & Sign — iOS

### Step 1: Certificates & Provisioning

```bash
# 1. Open Apple Developer portal → Certificates, IDs & Profiles
# 2. Create an App ID:
#    - Platform: iOS
#    - Bundle ID: app.trefolio.portfolio (Explicit)
#    - Capabilities: Push Notifications, Associated Domains
#
# 3. Create a Distribution Certificate:
#    - Type: Apple Distribution
#    - Generate CSR from Keychain Access → Certificate Assistant → Request from CA
#    - Upload CSR, download .cer, double-click to install
#
# 4. Create a Provisioning Profile:
#    - Type: App Store Connect
#    - App ID: app.trefolio.portfolio
#    - Certificate: the one you just created
#    - Download and double-click to install
```

### Step 2: Configure Xcode Project

```bash
cd /Users/mcsuarez/stocktracker

# Ensure production URL
npx cap sync ios
```

Open in Xcode:

```bash
open ios/App/App.xcworkspace
```

In Xcode:
1. Select the **App** target
2. **General** tab:
   - Display Name: `trefolio`
   - Bundle Identifier: `app.trefolio.portfolio`
   - Version: `1.0.0`
   - Build: `1`
3. **Signing & Capabilities** tab:
   - Team: your Apple Developer team
   - Signing Certificate: Apple Distribution
   - Provisioning Profile: the one from Step 1
   - ✅ Automatically manage signing (or manual)
4. **Capabilities**:
   - ✅ Push Notifications
   - ✅ Associated Domains → `applinks:trefolio.com`

### Step 3: Set Version Numbers

Edit `ios/App/App.xcodeproj/project.pbxproj` or use Xcode:
- `MARKETING_VERSION` = `1.0.0`
- `CURRENT_PROJECT_VERSION` = `1`

### Step 4: Build Archive

```bash
# In Xcode:
# 1. Select "Any iOS Device (arm64)" as destination
# 2. Product → Archive
# 3. Wait for build to complete
# 4. Organizer window opens automatically

# OR from command line:
xcodebuild -workspace ios/App/App.xcworkspace \
  -scheme App \
  -configuration Release \
  -archivePath build/trefolio.xcarchive \
  archive

xcodebuild -exportArchive \
  -archivePath build/trefolio.xcarchive \
  -exportOptionsPlist ios/ExportOptions.plist \
  -exportPath build/ios-release
```

### Step 5: Create ExportOptions.plist

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store-connect</string>
  <key>teamID</key>
  <string>YOUR_TEAM_ID</string>
  <key>signingStyle</key>
  <string>automatic</string>
  <key>uploadBitcode</key>
  <false/>
  <key>uploadSymbols</key>
  <true/>
</dict>
</plist>
```

---

## 7. Build & Sign — Android

### Step 1: Create Signing Key

```bash
# Generate a release keystore (do this ONCE, keep it safe!)
keytool -genkey -v \
  -keystore trefolio-release.keystore \
  -alias trefolio \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Store the keystore file OUTSIDE the repo
# Never commit it to git
mv trefolio-release.keystore ~/trefolio-keys/
```

### Step 2: Configure Signing in Gradle

Edit `android/app/build.gradle`:

```groovy
android {
    // ... existing config ...

    signingConfigs {
        release {
            storeFile file(System.getenv("TREFOLIO_KEYSTORE_PATH") ?: "${System.getProperty('user.home')}/trefolio-keys/trefolio-release.keystore")
            storePassword System.getenv("TREFOLIO_KEYSTORE_PASSWORD") ?: ""
            keyAlias "trefolio"
            keyPassword System.getenv("TREFOLIO_KEY_PASSWORD") ?: ""
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Step 3: Set Version Numbers

Edit `android/app/build.gradle`:

```groovy
android {
    defaultConfig {
        applicationId "app.trefolio.portfolio"
        versionCode 1        // Increment for every upload
        versionName "1.0.0"  // User-visible version
    }
}
```

### Step 4: Build Release Bundle

```bash
cd /Users/mcsuarez/stocktracker

# Sync Capacitor with production URL
npx cap sync android

# Set JAVA_HOME
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"

# Build AAB (Android App Bundle — required by Play Store)
cd android
./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### Step 5: Verify the Bundle

```bash
# Install bundletool
brew install bundletool

# Verify
bundletool validate --bundle=app/build/outputs/bundle/release/app-release.aab
```

---

## 8. Upload to App Store Connect

### Step 1: Create App Record

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. **My Apps** → **+** → **New App**
3. Fill in:
   - **Platform**: iOS
   - **Name**: `trefolio — Portfolio Tracker`
   - **Primary Language**: English (U.S.)
   - **Bundle ID**: `app.trefolio.portfolio`
   - **SKU**: `trefolio-portfolio-001`

### Step 2: Upload Build

**Option A — Xcode (recommended)**:
1. After archiving, in the Organizer window click **Distribute App**
2. Select **App Store Connect** → **Upload**
3. Follow the prompts

**Option B — Command line**:
```bash
xcrun altool --upload-app \
  --file build/ios-release/App.ipa \
  --type ios \
  --apiKey YOUR_API_KEY \
  --apiIssuer YOUR_ISSUER_ID
```

**Option C — Transporter app**:
1. Download [Transporter](https://apps.apple.com/app/transporter/id1450874784) from Mac App Store
2. Drag the `.ipa` file into Transporter
3. Click **Deliver**

### Step 3: Fill App Store Listing

In App Store Connect → Your App → **App Store** tab:

| Field | Value |
|-------|-------|
| Screenshots | Upload per device size (see Section 3) |
| Promotional Text | See Section 4 |
| Description | See Section 4 |
| Keywords | See Section 4 |
| Support URL | `https://trefolio.com/support` |
| Marketing URL | `https://trefolio.com` |
| Version | `1.0.0` |
| Copyright | `© 2026 trefolio` |
| Category | Finance (primary), Productivity (secondary) |
| Age Rating | 4+ |
| Price | Free (with in-app purchases) |

### Step 4: App Privacy

In App Store Connect → **App Privacy**:

| Data Type | Collected | Linked to User | Tracking |
|-----------|-----------|----------------|----------|
| Email Address | ✅ | ✅ | No |
| Name | ✅ | ✅ | No |
| Purchases | ✅ | ✅ | No |
| Financial Info (portfolios) | ✅ | ✅ | No |
| Usage Data | ✅ | No | No |
| Diagnostics | ✅ | No | No |

**Purpose**: App Functionality

### Step 5: Submit for Review

1. Select the build you uploaded
2. Fill in **Review Notes** (see Section 11)
3. Click **Submit for Review**
4. Expected review time: 24–48 hours

---

## 9. Upload to Google Play Console

### Step 1: Create App

1. Go to [Google Play Console](https://play.google.com/console)
2. **All apps** → **Create app**
3. Fill in:
   - **App name**: `trefolio — Portfolio Tracker`
   - **Default language**: English (United States)
   - **App or game**: App
   - **Free or paid**: Free

### Step 2: Store Listing

Go to **Main store listing**:

| Field | Value |
|-------|-------|
| App name | `trefolio — Portfolio Tracker` |
| Short description | See Section 5 (80 chars) |
| Full description | See Section 5 |
| App icon | 512×512 PNG |
| Feature graphic | 1024×500 PNG |
| Phone screenshots | See Section 3 (min 2, max 8) |
| Tablet screenshots | Recommended |
| Category | Finance |
| Tags | Portfolio Tracker, Stock Tracker, Investment |
| Contact email | `support@trefolio.com` |
| Privacy policy URL | `https://trefolio.com/privacy` |

### Step 3: Content Rating

1. Go to **Policy** → **App content** → **Content rating**
2. Fill the IARC questionnaire:
   - Violence: No
   - Sexuality: No
   - Language: No
   - Controlled substances: No
   - Gambling: No (investment tracking ≠ gambling)
   - User-generated content: No
3. Result: **Everyone**

### Step 4: Target Audience

- **Target age group**: 18+ (financial app)
- **Not designed for children**: Yes

### Step 5: Data Safety

| Question | Answer |
|----------|--------|
| Does your app collect or share data? | Yes |
| Is all data encrypted in transit? | Yes |
| Can users request data deletion? | Yes |
| **Data types collected**: | |
| - Email address | Collected, not shared, required |
| - Name | Collected, not shared, required |
| - Purchase history | Collected, not shared, required |
| - Financial info | Collected, not shared, required |
| - App interactions | Collected, not shared, optional |
| - Crash logs | Collected, not shared, optional |

### Step 6: Upload AAB

1. Go to **Release** → **Production** → **Create new release**
2. Upload `app-release.aab`
3. Release name: `1.0.0`
4. Release notes:

```
trefolio — the portfolio tracker for European investors.

What's new in 1.0.0:
• Track stocks, ETFs, crypto, and cash across multiple portfolios
• Real-time prices from 70+ exchanges in 21 currencies
• Dividend tracking with income projections
• AI-powered portfolio analysis in 35 languages
• EU tax reports for 17 countries
• Smart import from 14 brokers
• Stock screener with 50+ filters
• Beautiful dark and light themes

Free to start. No credit card required.
```

### Step 7: Submit for Review

1. **Review and release** → **Start rollout to Production**
2. Expected review time: hours to 3 days (first submission may take longer)

---

## 10. In-App Purchases / Subscriptions

### Apple App Store — Subscriptions

Go to App Store Connect → Your App → **Subscriptions**:

1. **Create Subscription Group**: `trefolio Premium`
2. **Add Subscriptions**:

| Reference Name | Product ID | Duration | Price |
|----------------|-----------|----------|-------|
| Bifolio Monthly | `bifolio.monthly` | 1 Month | €2.99 |
| Bifolio Annual | `bifolio.annual` | 1 Year | €23.99 |
| Trefolio Monthly | `trefolio.monthly` | 1 Month | €7.99 |
| Trefolio Annual | `trefolio.annual` | 1 Year | €59.99 |

3. Set **Subscription Group** localization:
   - Display Name: `trefolio Premium`
   - Description: `Unlock all features with trefolio Pro`

> **Note**: Since trefolio uses Stripe for web subscriptions, the App Store subscriptions
> need a server-side receipt validation flow OR you use Stripe's approach where mobile
> users are directed to the web checkout. Apple requires that if you offer subscriptions
> in-app, you MUST use Apple's IAP. If you redirect to web for payment, do NOT mention
> pricing in the app (Apple guideline 3.1.1). The current implementation redirects to
> Stripe checkout, so do NOT include price text in the native app.

### Google Play — Subscriptions

Go to Google Play Console → **Monetization** → **Subscriptions**:

1. Create subscription products with the same IDs and pricing
2. Google Play also requires IAP for in-app purchases, same rules as Apple

### Recommended Strategy

Since trefolio uses **Stripe web checkout** (not native IAP):
- Remove all price mentions from the native app's paywall
- Use wording like "Upgrade on trefolio.com" or "Manage subscription"
- Link to `https://trefolio.com/pricing` for checkout
- This avoids the 15–30% Apple/Google commission
- **Risk**: Apple may reject if they consider it steering users away from IAP. Alternative: implement native IAP and absorb the commission.

---

## 11. Review Notes & Compliance

### Apple Review Notes

Provide this in the "Notes for Review" field:

```
Demo Account for Review:
Email: review@trefolio.com
Password: [create a dedicated account]

This app is a portfolio tracker for investors. It displays financial
data (stock prices, dividends, portfolio performance) for informational
purposes only. It does not provide investment advice, execute trades,
or handle real money transactions.

The app uses a WebView connected to our web application at
https://trefolio.com. This is a hosted web app approach using
Capacitor — the native shell provides push notifications, haptic
feedback, and native navigation while the web app provides the
full feature set.

Subscriptions are managed via our website (Stripe). The app does
not currently offer in-app purchases.

Key features to test:
1. Sign up with email or Google
2. Add stocks manually (search "AAPL" or "MSFT")
3. View portfolio dashboard with 8 tabs
4. Try the Tools section (Watchlist, Dividends, Transactions)
5. View Profile page

The app requires an internet connection to function.
```

### Google Review Notes

```
This app is a portfolio tracker. It does not provide investment
advice or execute trades. Financial data is for informational
purposes only.

Test account:
Email: review@trefolio.com
Password: [create a dedicated account]
```

### Compliance Checklist

| Guideline | Status | Notes |
|-----------|--------|-------|
| Apple 3.1.1 (IAP) | ⚠️ | If showing prices, must use IAP. If redirecting to web, don't show prices. |
| Apple 4.2 (Minimum Functionality) | ✅ | Full app with 8 dashboard tabs, tools, profile |
| Apple 5.1 (Privacy) | ✅ | Privacy policy linked, App Privacy labels filled |
| Apple 5.1.1 (Data Collection) | ✅ | Only essential data collected |
| Apple 5.1.2 (Data Use) | ✅ | No third-party data sharing for advertising |
| Google Data Safety | ✅ | All data types declared |
| Google Deceptive Behavior | ✅ | No misleading claims |
| Financial disclaimer | ✅ | "Not investment advice" in terms/app |
| GDPR compliance | ✅ | Delete account, export data, privacy policy |

---

## 12. ASO — App Store Optimization

### Keyword Research Strategy

**Primary keywords** (high volume, high competition):
- `portfolio tracker` — target #1
- `stock tracker` — target top 5
- `dividend tracker` — target #1
- `investment tracker` — target top 3

**Secondary keywords** (medium volume, lower competition):
- `EU tax report` — target #1 (niche, unique)
- `DEGIRO portfolio` — target #1 (broker-specific)
- `European investor` — target #1
- `stock screener` — target top 10

**Long-tail keywords** (low volume, very low competition):
- `portfolio tracker 35 languages`
- `anlage kap report`
- `dividend income projection`
- `TTWROR calculator`

### Title & Subtitle Optimization

**Apple** (title 30 chars + subtitle 30 chars = 60 chars of keyword real estate):
- Title: `trefolio — Portfolio Tracker` (28 chars)
- Subtitle: `EU Taxes, Dividends & AI` (24 chars)

**Google** (title 30 chars + short description 80 chars):
- Title: `trefolio — Portfolio Tracker` (28 chars)
- Short: `Track stocks, dividends & crypto. EU tax reports. AI insights in 35 languages.` (79 chars)

### Localization Strategy (Top Priority Markets)

| Language | Title | Subtitle/Short |
|----------|-------|----------------|
| **German** | `trefolio — Portfolio Tracker` | `Steuerbericht, Dividenden & KI` |
| **Spanish** | `trefolio — Gestor de Cartera` | `Impuestos UE, Dividendos e IA` |
| **French** | `trefolio — Suivi de Portfolio` | `Fiscalité UE, Dividendes & IA` |
| **Dutch** | `trefolio — Portfolio Tracker` | `EU Belasting, Dividenden & AI` |
| **Italian** | `trefolio — Gestore Portafoglio` | `Tasse UE, Dividendi & IA` |
| **Portuguese** | `trefolio — Gestor de Carteira` | `Impostos UE, Dividendos & IA` |
| **Swedish** | `trefolio — Portföljspårare` | `EU-skatt, Utdelningar & AI` |
| **Polish** | `trefolio — Śledzenie Portfela` | `Podatki UE, Dywidendy & AI` |

### Rating & Review Strategy

1. **In-app review prompt**: Trigger after 3rd session + positive action (adding 5th stock, viewing P&L gain). Use `SKStoreReviewController` (iOS) / `ReviewManager` (Android).
2. **Support responses**: Always respond to negative reviews within 24h with a fix plan.
3. **Email campaign**: After 14 days of usage, email asking satisfied users to rate.
4. **Target**: 4.7+ stars within first month.

### Competitor Analysis

| App | Rating | Downloads | Price | Weakness |
|-----|--------|-----------|-------|----------|
| Yahoo Finance | 4.5 | 50M+ | Free (ads) | No EU tax reports, ad-heavy |
| Stock Events | 4.7 | 1M+ | Freemium | Limited languages, no AI |
| Delta | 4.5 | 5M+ | Freemium | No EU tax reports |
| Portfolio Performance | 4.3 | 100K+ | Free | Desktop-only, no mobile |
| Getquin | 4.2 | 100K+ | Freemium | Germany-focused |

**trefolio differentiators to emphasize**:
1. EU tax reports (17 countries) — **nobody else has this on mobile**
2. 35 languages — broadest language support
3. AI-powered insights — differentiates from spreadsheet-like trackers
4. Privacy-first, no ads — counter to Yahoo Finance
5. €5/mo Pro (annual) — undercuts most competitors

---

## 13. Launch Day Playbook

### T-7 Days (One Week Before)

- [ ] Final QA pass on both iOS and Android production builds
- [ ] All screenshots uploaded and approved
- [ ] Store listings proofread in all languages
- [ ] Set release date in App Store Connect (schedule release)
- [ ] Prepare Product Hunt launch post
- [ ] Draft announcement email for existing web users
- [ ] Create social media assets (Twitter/X, LinkedIn, Reddit)
- [ ] Prepare press kit: logo, screenshots, one-pager PDF

### T-1 Day

- [ ] Verify both apps are "Ready for Sale" / "Published"
- [ ] Pre-schedule social media posts
- [ ] Notify beta testers to leave reviews
- [ ] Final check: all links work (deep links, store links, website)

### Launch Day

- [ ] **06:00** — Publish on Product Hunt
- [ ] **07:00** — Post on Twitter/X, LinkedIn, r/investing, r/dividends, r/eupersonalfinance
- [ ] **08:00** — Send email blast to existing users
- [ ] **09:00** — Post on Hacker News (Show HN)
- [ ] **10:00** — Submit to BetaList, SaaSHub, AlternativeTo
- [ ] Monitor reviews and respond within 1 hour
- [ ] Track downloads hourly via App Store Connect / Play Console

### T+7 Days (One Week After)

- [ ] Analyze download numbers, conversion rates, retention
- [ ] Respond to ALL reviews (positive and negative)
- [ ] Submit update fixing any reported bugs
- [ ] Evaluate ASO performance — adjust keywords if needed
- [ ] Write blog post: "trefolio is now on iOS and Android"

### KPI Targets — First 30 Days

| Metric | Target |
|--------|--------|
| App Store rating | ≥ 4.7 |
| Total downloads | 10,000+ |
| Day-1 retention | ≥ 40% |
| Day-7 retention | ≥ 25% |
| Free → Paid conversion | ≥ 5% |
| Organic search installs | ≥ 30% of total |
| Crash-free rate | ≥ 99.5% |
| Avg. review response time | < 4 hours |

---

## Quick Reference — Commands

```bash
# ─── iOS ───

# Sync + build for simulator (dev)
CAPACITOR_SERVER_URL=http://localhost:3000 npx cap run ios --target <SIMULATOR_ID> --scheme App

# Sync for production
npx cap sync ios

# Open in Xcode for Archive
open ios/App/App.xcworkspace

# Archive from CLI
xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Release \
  -archivePath build/trefolio.xcarchive archive

# ─── Android ───

# Sync + build for emulator (dev)
CAPACITOR_SERVER_URL=http://10.0.2.2:3000 npx cap run android --target emulator-5554

# Sync for production
npx cap sync android

# Build release AAB
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
cd android && ./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab

# ─── Version Bumps ───

# iOS: Update in Xcode or project.pbxproj
# MARKETING_VERSION = "1.0.0"
# CURRENT_PROJECT_VERSION = 1

# Android: Update in android/app/build.gradle
# versionCode 1 (increment each upload)
# versionName "1.0.0"
```
