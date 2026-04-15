import type { Metadata } from "next";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";

export const metadata: Metadata = {
  title: "Privacy Policy — trefolio",
  description:
    "trefolio is a GDPR-compliant portfolio tracker. Learn how we collect, process, and protect your personal data. Optional analytics with consent, no data selling.",
  alternates: { canonical: "https://trefolio.com/privacy" },
  openGraph: {
    title: "Privacy Policy — trefolio",
    description:
      "Learn how trefolio collects, processes, and protects your personal data. GDPR-compliant, no data selling, optional analytics.",
    url: "https://trefolio.com/privacy",
    siteName: "trefolio",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Privacy Policy — trefolio",
    description:
      "Learn how trefolio collects, processes, and protects your personal data. GDPR-compliant, no data selling.",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#faf9f7] text-slate-600">
      <PublicNav />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <header className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            Privacy Policy
          </h1>
          <p className="text-slate-500">
            Last updated: April 5, 2026
          </p>
        </header>

        <div className="prose prose-slate max-w-none space-y-10 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-slate-900 [&_h2]:mt-12 [&_h2]:mb-4 [&_h3]:text-lg [&_h3]:font-medium [&_h3]:text-slate-800 [&_h3]:mt-8 [&_h3]:mb-3 [&_p]:leading-relaxed [&_li]:leading-relaxed">
          <section>
            <h2>1. Who We Are</h2>
            <p>
              trefolio (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is a
              portfolio tracking service built for European investors. We
              provide tools to track stock portfolios, view market data,
              and access AI-powered analysis.
            </p>
            <p>
              For data protection inquiries, contact us at{" "}
              <a
                href="mailto:privacy@trefolio.com"
                className="text-emerald-600 hover:text-emerald-500 underline underline-offset-2"
              >
                privacy@trefolio.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2>2. Data We Collect</h2>
            <h3>Account Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-slate-800">Email address</strong> — used
                for authentication, account recovery, and essential service
                communications.
              </li>
              <li>
                <strong className="text-slate-800">Password</strong> — stored as
                a one-way bcrypt hash. We never store or have access to your
                plaintext password.
              </li>
              <li>
                <strong className="text-slate-800">Third-party sign-in (Google, Apple)</strong> — 
                if you sign in with Google, we receive and store your name, email
                address, and profile picture from your Google account. We do not
                receive or store your Google password. If you sign in with Apple,
                we receive and store your name and email address (which may be an
                Apple private relay address). We do not receive or store your
                Apple password.
              </li>
              <li>
                <strong className="text-slate-800">Passkeys (WebAuthn)</strong> — if
                you register a passkey for passwordless sign-in, we store the
                cryptographic public key and credential metadata (credential ID,
                device type, sign-in counter) associated with your account. The
                private key and any biometric data remain on your device and are
                never transmitted to or stored by us. You can remove passkeys at
                any time from your profile.
              </li>
            </ul>

            <h3>Referral Data</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-slate-800">Referral code</strong> — a unique
                8-character code is generated for each user to enable referral link
                sharing. This code is not derived from personal information.
              </li>
              <li>
                <strong className="text-slate-800">Referral relationships</strong> — when
                a new user signs up via a referral link, we store the connection
                between the referring user and the referred user to credit rewards.
                This data includes the referral status, timestamps, and any
                anti-abuse rejection reasons.
              </li>
            </ul>

            <h3>Portfolio Data</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Stock holdings, transactions, and cash balances you enter or
                import.
              </li>
              <li>
                <strong className="text-slate-800">Holding tags (optional)</strong> — if you add
                user-defined text labels to stock or ETF positions for your own organization, we store
                those labels with the position so diversification views can reflect them.
              </li>
              <li>
                User preferences (language, theme, display currency, selected
                benchmarks, product usage interests, and referral source
                selected during onboarding).
              </li>
              <li>
                <strong className="text-slate-800">Saved moat evaluation reports (optional labels)</strong> — if
                you save a competitive moat evaluation to your library, we store the evaluation
                content and scores. You may add optional text labels (&quot;tags&quot;) to organize reports;
                these tags are chosen by you and stored with the saved report.
              </li>
              <li>
                <strong className="text-slate-800">Saved investment strategies (Tools → Strategies)</strong> — if
                you create price alerts from the Strategies tool, we store your reference purchase price,
                target price, optional stop-loss level, ticker, exchange, and links to the associated
                threshold alerts so you can reopen your plan later. This data is for your convenience only
                and is not investment advice.
              </li>
              <li>
                <strong className="text-slate-800">Broker connection credentials (optional)</strong> —
                if you connect your Interactive Brokers account via the Flex Web
                Service API, your access token and query ID are encrypted with
                AES-256-GCM and stored so you can re-sync your portfolio on demand.
                If you connect brokerage accounts via SnapTrade (Trefolio plan), we store your
                SnapTrade userId and encrypted userSecret; your brokerage credentials
                are handled by SnapTrade via OAuth, not by us. We only request read-only access
                to your brokerage data. You can disconnect at
                any time, which permanently deletes these credentials.
              </li>
              <li>
                <strong className="text-slate-800">Widget access token (optional)</strong> —
                if you generate a widget token for home screen widget access, we
                store a one-way SHA-256 hash of the token. The plaintext token is
                shown once and never stored. You can revoke it at any time from
                your profile, which permanently deletes the hash.
              </li>
            </ul>

            <h3>Contact Form Data</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-slate-800">Name, email, subject, message</strong> —
                when you submit the contact form, we collect these fields for
                customer support purposes. Submissions are sent to support@trefolio.com
                via Resend and are subject to IP-based rate limiting (5 per hour).
              </li>
              <li>
                <strong className="text-slate-800">Broker integration requests</strong> —
                if you request support for a missing broker, we store your account
                identifier, requested broker name, optional notes, and request
                timestamp so our team can evaluate demand and notify you about your request.
              </li>
            </ul>

            <h3>Notification Data</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-slate-800">WhatsApp phone number</strong> — 
                if you opt in to WhatsApp alert notifications (Pro plan), we collect
                your phone number in E.164 format and verify it via Twilio Verify.
                The number is used solely for delivering price alert messages.
              </li>
              <li>
                <strong className="text-slate-800">Push notification subscription</strong> — 
                if you opt in to browser push notifications (paid plan), we store
                your browser push subscription endpoint and encryption keys. These
                are used only to deliver price alert notifications and are deleted
                when you unsubscribe.
              </li>
            </ul>

            <h3>Social Data (optional)</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-slate-800">Social profile data (optional)</strong> —
                If you enable social features, we collect and display: a public profile URL (slug),
                bio, headline, experience level, and your content posts. You control visibility
                (public or private) and can opt in to sharing aggregated portfolio value and
                holdings composition (allocation percentages only — exact share counts are never
                exposed). Connection relationships with other users are stored to enable network
                features and direct messaging.
              </li>
            </ul>

            <h3>Automatically Collected Data</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-slate-800">Session cookies</strong> — 
                essential httpOnly cookies for authentication.
              </li>
              <li>
                <strong className="text-slate-800">Basic analytics</strong> — 
                anonymous, aggregated page-view data via Vercel Analytics to
                understand product usage. No personal identifiers are stored.
              </li>
              <li>
                <strong className="text-slate-800">Attribution parameters (UTM/referrer)</strong> —
                when you first visit trefolio, we may store first-touch attribution
                fields such as <code className="text-xs text-slate-700 bg-slate-100 px-1 py-0.5 rounded">utm_source</code>,{" "}
                <code className="text-xs text-slate-700 bg-slate-100 px-1 py-0.5 rounded">utm_medium</code>,{" "}
                <code className="text-xs text-slate-700 bg-slate-100 px-1 py-0.5 rounded">utm_campaign</code>,
                referrer, and landing path. These fields are used to measure signup
                and subscription conversion by acquisition source.
              </li>
            </ul>
          </section>

          <section>
            <h2>3. How We Use Your Data</h2>
            <p>We process your data exclusively to provide and improve the trefolio service:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Authenticate your account and maintain your session.</li>
              <li>Display your portfolio, performance metrics, and market data.</li>
              <li>Process AI analysis requests (portfolio data is sent to OpenAI for analysis; see Section 5).</li>
              <li>
                Answer optional chart Q&amp;A (your question and the chart snapshot — values, invested capital, time range, and trade markers — are sent to OpenAI; see Section 5).
              </li>
              <li>Provide AI-powered support chat (your messages and optional portfolio summary are sent to OpenAI; see Section 5). Support chat conversations are stored for up to 90 days to enable admin review and improve support quality.</li>
              <li>
                Enable private chat rooms for direct communication between you and trefolio support, and between connected users. Messages (text, links, images, and voice) are stored in our database; voice audio files are stored in our Vercel Blob storage and are removed when the message expires. Non-persistent messages are automatically deleted 24 hours after being sent.
              </li>
              <li>Process subscription payments through Stripe (see Section 5).</li>
              <li>Send essential service communications (e.g., password resets, critical security notices).</li>
              <li>Respond to customer support inquiries submitted via the contact form.</li>
              <li>Evaluate and prioritize broker integration requests submitted by users.</li>
              <li>Process and review refund requests submitted by paid subscribers.</li>
              <li>Measure acquisition performance (signup and paid conversion rates by source).</li>
            </ul>
            <p>
              We do <strong className="text-slate-900">not</strong> sell, rent, or
              share your personal data with third parties for advertising or
              marketing purposes. If you grant optional cookie consent, we may
              send pseudonymous conversion signals (for example signup and
              checkout completion events) to analytics/advertising platforms to
              measure campaign performance.
            </p>
          </section>

          <section>
            <h2>4. Legal Basis for Processing (GDPR)</h2>
            <p>We process your data under the following legal bases:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-slate-800">Contract performance</strong>{" "}
                — processing necessary to provide the trefolio service you signed
                up for (Art. 6(1)(b) GDPR).
              </li>
              <li>
                <strong className="text-slate-800">Legitimate interest</strong>{" "}
                — anonymous analytics to improve the product, fraud prevention,
                and service security (Art. 6(1)(f) GDPR).
              </li>
              <li>
                <strong className="text-slate-800">Legal obligation</strong>{" "}
                — where required by applicable law (Art. 6(1)(c) GDPR).
              </li>
            </ul>
          </section>

          <section>
            <h2>5. Third-Party Services</h2>
            <p>
              We use the following third-party services to operate trefolio.
              Each acts as a data processor under GDPR:
            </p>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="py-3 pr-6 text-slate-800 font-medium">Service</th>
                    <th className="py-3 pr-6 text-slate-800 font-medium">Purpose</th>
                    <th className="py-3 text-slate-800 font-medium">Data Shared</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="py-3 pr-6">Vercel</td>
                    <td className="py-3 pr-6">Hosting &amp; deployment</td>
                    <td className="py-3">Request metadata, anonymous analytics</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6">Turso (libSQL)</td>
                    <td className="py-3 pr-6">Database</td>
                    <td className="py-3">All account and portfolio data (encrypted at rest)</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6">Stripe</td>
                    <td className="py-3 pr-6">Payment processing</td>
                    <td className="py-3">Email, subscription status, payment details</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6">OpenAI</td>
                    <td className="py-3 pr-6">AI-powered analysis, chart Q&amp;A, and support chat</td>
                    <td className="py-3 pr-6">
                      Portfolio data included in analysis prompts; chart assistant questions with chart snapshot (values, invested capital, range, trades); support chat messages and optional portfolio summary
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6">Yahoo Finance</td>
                    <td className="py-3 pr-6">Market data</td>
                    <td className="py-3">Stock ticker symbols requested</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6">Alpha Vantage</td>
                    <td className="py-3 pr-6">Market data (Trefolio)</td>
                    <td className="py-3">Stock ticker symbols requested</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6">Financial Modeling Prep (FMP)</td>
                    <td className="py-3 pr-6">Market data (Trefolio)</td>
                    <td className="py-3">Stock ticker symbols requested</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6">CoinLore</td>
                    <td className="py-3 pr-6">Cryptocurrency market data</td>
                    <td className="py-3">No user data sent — only public market data retrieved</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6">Finnhub</td>
                    <td className="py-3 pr-6">Market news (fallback)</td>
                    <td className="py-3">Stock ticker symbols requested</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6">Cloudflare Turnstile</td>
                    <td className="py-3 pr-6">Bot protection</td>
                    <td className="py-3">IP address and browser signals (used to distinguish humans from bots during signup, login, and contact form submissions)</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6">Resend</td>
                    <td className="py-3 pr-6">Transactional email</td>
                    <td className="py-3">Email address (for verification, password resets, service notifications, and contact form submissions)</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6">Linear</td>
                    <td className="py-3 pr-6">Issue tracking for in-app feedback</td>
                    <td className="py-3">Feedback subject, message, and type may be synced as issue content when our automated feedback pipeline creates a task (no portfolio or payment data)</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6">Interactive Brokers (Flex Web Service)</td>
                    <td className="py-3 pr-6">Portfolio import via API (Trefolio)</td>
                    <td className="py-3">User-provided Flex token and Query ID (encrypted at rest); IBKR returns portfolio data directly to our server</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6">SnapTrade (Passiv Financial Inc.)</td>
                    <td className="py-3 pr-6">Brokerage aggregation (Trefolio)</td>
                    <td className="py-3">Brokerage account data (positions, balances) via OAuth read-only; we store only SnapTrade userId and encrypted userSecret</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6">Twilio Inc.</td>
                    <td className="py-3 pr-6">WhatsApp alert notifications (Trefolio)</td>
                    <td className="py-3">Phone number (E.164 format) for WhatsApp message delivery and verification; messages contain stock ticker and price data only</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6">Google Analytics / Google Ads tags (Google LLC)</td>
                    <td className="py-3 pr-6">Consent-based analytics and conversion attribution</td>
                    <td className="py-3">Pseudonymous cookie identifiers, page events, and conversion events (signup/checkout milestones) only after consent</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6">Meta Pixel / Meta Conversions API (Meta Platforms, Inc.)</td>
                    <td className="py-3 pr-6">Optional consent-based conversion attribution (when enabled)</td>
                    <td className="py-3">Pseudonymous conversion events and hashed identifiers (e.g., hashed email) for signup/checkout attribution, only after consent</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6">Google AdSense (Google LLC)</td>
                    <td className="py-3 pr-6">Display advertising (free plan only)</td>
                    <td className="py-3">Advertising cookies and browser signals for ad personalization (only with user consent); paid plan users are never shown ads</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2>6. Data Security</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Passwords are hashed with bcrypt (one-way, non-reversible).</li>
              <li>Sessions use secure, httpOnly JWT cookies with SameSite protection.</li>
              <li>Sensitive API keys and broker connection tokens are encrypted with AES-256-GCM.</li>
              <li>Widget access tokens are stored as one-way SHA-256 hashes (non-reversible).</li>
              <li>Passkey credentials store only the public key; the private key and biometric data never leave your device.</li>
              <li>All connections use HTTPS/TLS encryption in transit.</li>
              <li>Database is encrypted at rest (Turso/libSQL).</li>
              <li>
                We follow the principle of least privilege for data access across
                all internal systems.
              </li>
            </ul>
          </section>

          <section>
            <h2>7. Data Retention</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-slate-800">Account data</strong> — retained
                for as long as your account is active.
              </li>
              <li>
                <strong className="text-slate-800">Portfolio data</strong> — retained
                for as long as your account is active. If your paid subscription
                lapses, your data is preserved and accessible when you resubscribe.
              </li>
              <li>
                <strong className="text-slate-800">Analytics events</strong> — 
                anonymous, aggregated usage events are automatically purged after
                90 days.
              </li>
              <li>
                <strong className="text-slate-800">Contact form submissions</strong> — 
                retained until the inquiry is resolved, then purged within 90 days.
              </li>
              <li>
                <strong className="text-slate-800">Broker integration requests</strong> —
                retained for product planning and support follow-up, then periodically reviewed and deleted when no longer needed.
              </li>
              <li>
                <strong className="text-slate-800">Support chat conversations</strong> — 
                retained for up to 90 days for quality review, then automatically purged.
              </li>
              <li>
                <strong className="text-slate-800">Private chat messages</strong> — 
                messages in private chat rooms (text, links, images, and voice) are automatically
                deleted 24 hours after being sent unless marked persistent. Message metadata and text
                are stored in our database; voice audio is stored in Vercel Blob object storage (same
                infrastructure provider as the rest of the service) and deleted when the message
                record is purged.
              </li>
              <li>
                <strong className="text-slate-800">After account deletion</strong>{" "}
                — all personal data is permanently deleted within 30 days. Backups
                containing your data are purged within 90 days.
              </li>
            </ul>
          </section>

          <section>
            <h2>7a. Public Portfolio Sharing</h2>
            <p>
              Trefolio subscribers may choose to generate a shareable link that allows anyone with the link to view a
              read-only snapshot of their portfolio holdings. This feature is <strong className="text-slate-800">opt-in</strong> and disabled by default.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-slate-800">What is shared:</strong> Ticker symbols, stock names, exchange, and optionally share counts (configurable by you). Financial values (prices, total values) are never exposed via shared links.
              </li>
              <li>
                <strong className="text-slate-800">Access control:</strong> Shared portfolio pages are accessible by anyone with the link but are not indexed by search engines (<code className="text-xs">noindex</code>). You can revoke access at any time from your profile settings.
              </li>
              <li>
                <strong className="text-slate-800">Visitor data:</strong> We log anonymized access events (no IP address, no personal data) to measure feature usage.
              </li>
              <li>
                <strong className="text-slate-800">Your responsibility:</strong> You are responsible for deciding what holdings to include in your shared portfolio. We recommend reviewing the excluded tickers option before sharing.
              </li>
              <li>
                <strong className="text-slate-800">User-generated social content:</strong> Posts,
                profiles, and connection data you create through social features are visible
                according to your visibility settings. Public posts and profiles are accessible
                to anyone, including search engines. Network-only posts are visible to your
                connections. You can delete your posts and profile data at any time.
              </li>
            </ul>
          </section>

          <section>
            <h2>8. Your Rights (GDPR)</h2>
            <p>As a user in the European Economic Area, you have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-slate-800">Access</strong> — request a
                copy of all personal data we hold about you.
              </li>
              <li>
                <strong className="text-slate-800">Rectification</strong> — 
                correct inaccurate personal data.
              </li>
              <li>
                <strong className="text-slate-800">Erasure</strong> — request
                deletion of your account and all associated data.
              </li>
              <li>
                <strong className="text-slate-800">Data portability</strong> — 
                export your portfolio data in CSV or JSON format from your
                profile settings.
              </li>
              <li>
                <strong className="text-slate-800">Restriction</strong> — 
                request restricted processing of your data.
              </li>
              <li>
                <strong className="text-slate-800">Object</strong> — object to
                processing based on legitimate interest.
              </li>
              <li>
                <strong className="text-slate-800">Lodge a complaint</strong> — 
                with your local data protection authority.
              </li>
            </ul>
            <p>
              To exercise any of these rights, email{" "}
              <a
                href="mailto:privacy@trefolio.com"
                className="text-emerald-600 hover:text-emerald-500 underline underline-offset-2"
              >
                privacy@trefolio.com
              </a>
              . We will respond within 30 days.
            </p>
          </section>

          <section id="cookies">
            <h2>9. Cookies</h2>
            <h3>Essential Cookies (always active)</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-slate-800">Session cookie</strong> — an
                httpOnly, secure cookie that maintains your authenticated session.
                Expires when you log out or after the session timeout period.
              </li>
              <li>
                <strong className="text-slate-800">Cloudflare Turnstile</strong> — 
                Turnstile may set a transient cookie (<code className="text-xs text-slate-700 bg-slate-100 px-1 py-0.5 rounded">cf_bm</code>)
                to complete its bot-detection challenge on signup, login, and contact forms.
                This cookie is classified as strictly necessary (bot protection)
                and contains no personal identifiers.
              </li>
            </ul>

            <h3>Analytics Cookies (optional, consent required)</h3>
            <p>
              If you choose &quot;Accept All&quot; in the cookie banner, we use{" "}
              <strong className="text-slate-900">Google Analytics 4</strong> to understand
              how visitors use trefolio. Google Analytics sets the following cookies:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-slate-800"><code className="text-xs text-slate-700 bg-slate-100 px-1 py-0.5 rounded">_ga</code></strong> — 
                distinguishes unique visitors. Expires after 2 years.
              </li>
              <li>
                <strong className="text-slate-800"><code className="text-xs text-slate-700 bg-slate-100 px-1 py-0.5 rounded">_ga_*</code></strong> — 
                maintains session state. Expires after 2 years.
              </li>
            </ul>
            <p>
              These cookies are only set after you give explicit consent.
              You can withdraw consent at any time by clearing your browser cookies
              and revisiting the site. We use Google Analytics with IP anonymization
              enabled. If consent is granted, we may also send conversion events
              (signup/checkout milestones) through Google tags for campaign
              attribution. Data collected by Google Analytics
              is processed by Google LLC under their{" "}
              <a
                href="https://privacy.google.com/businesses/processorterms/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 hover:text-emerald-500 underline underline-offset-2"
              >
                Data Processing Terms
              </a>.
            </p>
            <h3>Advertising Cookies (optional, consent required)</h3>
            <p>
              If you choose &quot;Accept All&quot; in the cookie banner and are on
              the free plan, we use{" "}
              <strong className="text-slate-900">Google AdSense</strong> to display
              relevant advertisements. Google AdSense may set cookies to serve
              ads based on your browsing history. Paid Trefolio subscribers
              are never shown ads and no advertising cookies are set.
            </p>
            <p>
              You can opt out of personalized advertising at{" "}
              <a
                href="https://adssettings.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 hover:text-emerald-500 underline"
              >
                Google Ads Settings
              </a>.
            </p>
          </section>

          <section>
            <h2>10. International Transfers</h2>
            <p>
              Your data may be processed outside the EEA by our third-party
              service providers (Vercel, OpenAI, Stripe, Cloudflare, Google Analytics, Google AdSense, Finnhub, Interactive Brokers, SnapTrade, Resend, Twilio, Linear). Where
              this occurs, we ensure appropriate safeguards are in place,
              including Standard Contractual Clauses (SCCs) approved by the
              European Commission.
            </p>
            <p>
              Cloudflare processes Turnstile bot-detection data as both a data
              processor (acting on our instructions to protect our forms) and
              an independent data controller (to improve its bot-detection
              models under legitimate interest). Cloudflare&apos;s Turnstile
              Privacy Addendum governs this processing.
            </p>
          </section>

          <section>
            <h2>11. Children</h2>
            <p>
              trefolio is not directed at individuals under 16 years of age. We
              do not knowingly collect personal data from children. If we become
              aware that a child has provided us with personal data, we will
              delete it promptly.
            </p>
          </section>

          <section>
            <h2>12. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy to reflect changes in our
              practices or legal requirements. We will notify registered users
              of material changes via email. The &quot;last updated&quot; date at
              the top of this page indicates when the policy was last revised.
            </p>
          </section>
        </div>

      </main>
      <PublicFooter />
    </div>
  );
}
