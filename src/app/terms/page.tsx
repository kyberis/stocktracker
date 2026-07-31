import type { Metadata } from "next";
import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";

export const metadata: Metadata = {
  title: "Terms of Service — trefolio",
  description:
    "trefolio Terms of Service. Subscription terms, acceptable use, financial disclaimers, and liability limitations for our portfolio tracking service.",
  alternates: { canonical: "https://trefolio.com/terms" },
  openGraph: {
    title: "Terms of Service — trefolio",
    description:
      "trefolio Terms of Service. Subscription terms, acceptable use, financial disclaimers, and liability limitations.",
    url: "https://trefolio.com/terms",
    siteName: "trefolio",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Terms of Service — trefolio",
    description:
      "trefolio Terms of Service. Subscription terms, acceptable use, financial disclaimers, and liability limitations.",
  },
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#faf9f7] text-slate-600">
      <PublicNav />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <header className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            Terms of Service
          </h1>
          <p className="text-slate-500">
            Last updated: May 9, 2026
          </p>
        </header>

        <div className="prose prose-slate max-w-none space-y-10 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-slate-900 [&_h2]:mt-12 [&_h2]:mb-4 [&_h3]:text-lg [&_h3]:font-medium [&_h3]:text-slate-800 [&_h3]:mt-8 [&_h3]:mb-3 [&_p]:leading-relaxed [&_li]:leading-relaxed">
          <section>
            <h2>1. Agreement to Terms</h2>
            <p>
              By accessing or using trefolio (&quot;the Service&quot;), you agree
              to be bound by these Terms of Service (&quot;Terms&quot;). If you
              do not agree to these Terms, you may not use the Service.
            </p>
            <p>
              These Terms constitute a legally binding agreement between you and
              trefolio (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;). We may
              update these Terms from time to time, and we will notify registered
              users of material changes via email.
            </p>
          </section>

          <section>
            <h2>2. Description of Service</h2>
            <p>
              trefolio is a portfolio tracking and analysis platform that allows
              you to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Track stock, ETF, and crypto holdings with real-time market data.</li>
              <li>View portfolio performance, historical charts, and benchmark comparisons.</li>
              <li>Access AI-powered stock analysis, portfolio review, and tax optimization insights (subject to tier limits).</li>
              <li>Import portfolio data from 14 broker CSV formats, connect brokerage accounts via SnapTrade auto-sync, or use AI-powered import.</li>
              <li>Generate country-specific European tax reports (Germany, France, Spain, Netherlands, Italy) with AI Tax Assistant (Trefolio).</li>
              <li>Filter and discover stocks using the stock screener with fundamental filters (Trefolio).</li>
              <li>Track net worth with manual entries for real estate, savings, and pension assets.</li>
              <li>Track cash balances, dividend projections, and event calendars (earnings, economic events, IPOs).</li>
            </ul>
          </section>

          <section>
            <h2>3. Account Registration</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must provide a valid email address and create a secure password, or sign in using a supported third-party provider (e.g., Google, Apple).</li>
              <li>You are responsible for maintaining the security of your account credentials and any linked third-party account.</li>
              <li>You must be at least 16 years of age to create an account.</li>
              <li>You may not create multiple accounts or share account access.</li>
              <li>
                You are responsible for all activity that occurs under your
                account.
              </li>
            </ul>
          </section>

          <section>
            <h2>4. Subscription Tiers</h2>

            <h3>Universal Access with Quotas</h3>
            <p>
              From version 2.0.0 onwards (April 2026), every feature in the
              Service is available on both the Folio (Free) and Trefolio (Paid)
              tiers. Tiers differ in the <strong>per-feature monthly, daily, or
              yearly quota</strong> applied to cost-bearing endpoints (AI
              consultations, premium market-data lookups, AI-assisted imports,
              tax reports, exports, and support chat). The current quotas for
              each tier are published in the in-app pricing page and may be
              adjusted from time to time at our discretion.
            </p>

            <h3>Folio (Free Tier)</h3>
            <p>
              The Folio tier provides full access to every feature of the
              Service, subject to the published Free-tier quotas and to soft
              storage caps (e.g. number of holdings, portfolios, alerts, share
              links, manual assets, and brokerage connections). The free tier
              is ad-supported: Google AdSense advertisements may be displayed
              if you have consented to advertising cookies. The paid Trefolio
              tier is completely ad-free.
            </p>

            <h3>Trefolio (Paid Tier)</h3>
            <p>
              The Trefolio tier is available for a subscription fee (currently
              from €7.99/month for new subscribers during promotional periods,
              or €9.99/month at the regular rate, inclusive of applicable VAT;
              annual plans may be offered at a discount). Trefolio includes
              every feature in the Service with substantially higher quotas than
              Folio (typically ~20× the Free-tier monthly limits for AI and
              premium-data features, and significantly higher soft caps for
              storage entities). Trefolio is also ad-free.
            </p>
            <p>
              Exact limits per feature and per tier may change; the in-app
              subscription and pricing pages at the time of purchase prevail for
              your account. Existing Trefolio subscribers retain their plan and
              are not affected by the v2.0 model change in any negative way.
            </p>

            <h3>Price Changes</h3>
            <p>
              We reserve the right to change subscription pricing. Existing
              subscribers will be given at least 30 days&apos; notice before any
              price increase takes effect on their subscription.
            </p>

            <h3>Promotional Trials</h3>
            <p>
              From time to time, we may offer promotional trials of paid tiers (e.g., a 7-day Trefolio Pro trial).
              Promotional trials are subject to the following terms:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Trials do not require payment information. No charge is made during the trial period.</li>
              <li>Each account is eligible for one promotional trial only.</li>
              <li>At the end of the trial period, your account automatically reverts to the Folio (Free) tier. All your data is preserved.</li>
              <li>Trial eligibility is determined at our sole discretion and may be withdrawn at any time.</li>
              <li>Promotional trials may not be combined with other offers, referral rewards, or promotional codes.</li>
            </ul>
          </section>

          <section>
            <h2>5. Payment and Billing</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Payments are processed securely by{" "}
                <a
                  href="https://stripe.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:text-emerald-500 underline underline-offset-2"
                >
                  Stripe
                </a>
                . We do not store your credit card details.
              </li>
              <li>
                Paid Trefolio subscriptions renew automatically each billing cycle unless
                cancelled.
              </li>
              <li>
                VAT is calculated and applied automatically based on your
                location, as required by EU regulations.
              </li>
              <li>
                You can manage your subscription (update payment method, view
                invoices, cancel) through the billing portal accessible from your
                profile settings.
              </li>
            </ul>
          </section>

          <section>
            <h2>6. Cancellation and Refunds</h2>

            <h3>Cancellation</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                You may cancel your paid subscription at any time through your
                profile settings or the Stripe billing portal.
              </li>
              <li>
                Upon cancellation, you retain your current tier access until the end of your
                current billing period.
              </li>
              <li>
                After your subscription expires, your account reverts to the Folio
                tier. All your data (holdings, transactions, settings) is
                preserved — you do not lose any data.
              </li>
            </ul>

            <h3>EU Right of Withdrawal</h3>
            <p>
              Under EU consumer protection law, you have a 14-day right of
              withdrawal from the date of purchase. If you request a refund
              within this period and have not substantially used paid tier features,
              we will issue a full refund. You can submit a refund request
              from your profile settings or contact{" "}
              <a
                href="mailto:support@trefolio.com"
                className="text-emerald-600 hover:text-emerald-500 underline underline-offset-2"
              >
                support@trefolio.com
              </a>
              . Refund requests are typically reviewed within 1–3 business days.
            </p>
          </section>

          <section>
            <h2>7. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the Service for any unlawful purpose.</li>
              <li>Attempt to gain unauthorized access to our systems or other user accounts.</li>
              <li>
                Use automated tools (bots, scrapers) to access the Service
                beyond normal usage patterns.
              </li>
              <li>
                Reverse-engineer, decompile, or attempt to extract the source
                code of the Service (except where permitted by applicable law).
              </li>
              <li>
                Resell, redistribute, or sublicense access to the Service.
              </li>
              <li>
                Use the Service to manipulate markets or engage in any form of
                market abuse.
              </li>
            </ul>
            <p>
              We reserve the right to suspend or terminate accounts that violate
              these terms.
            </p>

            <h3>Social Features &amp; Content</h3>
            <p className="mb-4">
              trefolio provides optional social networking features including public profiles,
              content posts, and user connections. By using these features, you agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>
                Not post content that constitutes personal financial advice. All posts
                containing investment analysis must be understood as personal opinions,
                not professional recommendations.
              </li>
              <li>
                Not use social features to harass, spam, or deceive other users.
              </li>
              <li>
                Accept that content you mark as &quot;public&quot; will be visible to anyone,
                including search engines.
              </li>
              <li>
                Accept that shared portfolio data (when you opt in) shows aggregated
                values and allocation percentages only. trefolio never exposes exact
                share counts to other users.
              </li>
              <li>
                Respect other users&apos; privacy settings and not attempt to circumvent
                visibility controls.
              </li>
            </ul>
            <p className="mb-8">
              trefolio reserves the right to remove content or restrict social features
              for users who violate these terms. Posts mentioning specific securities
              will display an automated financial disclaimer.
            </p>
          </section>

          <section>
            <h2>8. Financial Disclaimer</h2>
            <div className="bg-white border border-slate-200 rounded-2xl p-6 mt-4 shadow-sm">
              <p className="text-slate-800 font-medium mb-3">
                trefolio is NOT a financial advisor.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  All information provided through the Service, including AI
                  analysis, market data, charts, projections, and indicators, is
                  for <strong className="text-slate-900">informational purposes only</strong>.
                </li>
                <li>
                  Nothing on trefolio constitutes financial advice, investment
                  advice, trading advice, or any other form of professional
                  advice.
                </li>
                <li>
                  AI-generated analysis may contain errors, hallucinations, or
                  outdated information. Always verify with qualified financial
                  professionals before making investment decisions.
                </li>
                <li>
                  Market data is provided by Yahoo Finance and Alpha Vantage and
                  may be delayed. We do not guarantee its accuracy, completeness,
                  or timeliness.
                </li>
                <li>
                  Past performance does not guarantee future results. Investment
                  in stocks and ETFs carries risk, including the risk of total
                  loss.
                </li>
                <li>
                  <strong className="text-slate-900">Shared portfolios</strong> — when you share your portfolio via a public link, the shared view is for informational purposes only. It does not constitute financial advice. You are solely responsible for the content you choose to share publicly.
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2>9. Intellectual Property</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                The trefolio name, logo, and visual design are our property.
              </li>
              <li>
                Your portfolio data belongs to you. We claim no ownership over
                data you enter into the Service.
              </li>
              <li>
                Market data is provided by and remains the property of its
                respective sources (Yahoo Finance, Alpha Vantage).
              </li>
            </ul>
          </section>

          <section>
            <h2>10. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by applicable law:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                The Service is provided <strong className="text-slate-900">&quot;as is&quot;</strong>{" "}
                and <strong className="text-slate-900">&quot;as available&quot;</strong>{" "}
                without warranties of any kind, express or implied.
              </li>
              <li>
                We are not liable for any indirect, incidental, special, or
                consequential damages arising from your use of the Service,
                including but not limited to financial losses from investment
                decisions.
              </li>
              <li>
                Our total liability for any claim arising from or related to the
                Service is limited to the amount you paid us in the 12 months
                preceding the claim.
              </li>
              <li>
                We do not guarantee uninterrupted or error-free service. Market
                data feeds, AI analysis, third-party integrations (including
                SnapTrade brokerage connections and optional Financial Modeling Prep
                data accessed via MCP), and optional MCP access may experience downtime.
                Market data obtained through MCP is for informational purposes only and
                is not investment advice.
              </li>
            </ul>
          </section>

          <section>
            <h2>11. Account Termination</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                You may delete your account at any time from your profile
                settings. All personal data will be permanently deleted within
                30 days.
              </li>
              <li>
                We may suspend or terminate your account if you violate these
                Terms, with reasonable notice where possible.
              </li>
              <li>
                Upon termination for any reason, your right to use the Service
                ceases immediately.
              </li>
            </ul>
          </section>

          <section>
            <h2>12. Data Protection</h2>
            <p>
              Your privacy is important to us. Please review our{" "}
              <Link
                href="/privacy"
                className="text-emerald-600 hover:text-emerald-500 underline underline-offset-2"
              >
                Privacy Policy
              </Link>{" "}
              for detailed information about how we collect, process, and
              protect your personal data in compliance with the General Data
              Protection Regulation (GDPR).
            </p>
          </section>

          <section>
            <h2>13. Governing Law and Disputes</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                These Terms are governed by the laws of the European Union and
                the member state in which we are established.
              </li>
              <li>
                If you are an EU consumer, you benefit from mandatory consumer
                protection provisions of your country of residence.
              </li>
              <li>
                Disputes will be resolved through the competent courts of our
                place of establishment, except where consumer law provides
                otherwise.
              </li>
              <li>
                You may also use the EU Online Dispute Resolution platform at{" "}
                <a
                  href="https://ec.europa.eu/consumers/odr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:text-emerald-500 underline underline-offset-2"
                >
                  ec.europa.eu/consumers/odr
                </a>
                .
              </li>
            </ul>
          </section>

          <section>
            <h2>14. Severability</h2>
            <p>
              If any provision of these Terms is found to be unenforceable, the
              remaining provisions will continue in full force and effect.
            </p>
          </section>

          <section>
            <h2>15. Contact</h2>
            <p>
              For questions about these Terms, contact us at{" "}
              <a
                href="mailto:support@trefolio.com"
                className="text-emerald-600 hover:text-emerald-500 underline underline-offset-2"
              >
                support@trefolio.com
              </a>
              .
            </p>
          </section>
        </div>

      </main>
      <PublicFooter />
    </div>
  );
}
