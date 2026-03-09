import type { Metadata } from "next";
import Link from "next/link";
import PublicFooter from "@/components/PublicFooter";

export const metadata: Metadata = {
  title: "Terms of Service — trefolio",
  description:
    "trefolio Terms of Service. Subscription terms, acceptable use, financial disclaimers, and liability limitations for our portfolio tracking service.",
  alternates: { canonical: "https://trefolio.com/terms" },
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      <nav className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href="/landing"
            className="text-lg font-bold text-white hover:text-emerald-400 transition-colors"
          >
            trefolio
          </Link>
          <Link
            href="/privacy"
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Privacy Policy
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <header className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">
            Terms of Service
          </h1>
          <p className="text-slate-400">
            Last updated: March 8, 2026
          </p>
        </header>

        <div className="prose prose-invert prose-slate max-w-none space-y-10 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mt-12 [&_h2]:mb-4 [&_h3]:text-lg [&_h3]:font-medium [&_h3]:text-slate-200 [&_h3]:mt-8 [&_h3]:mb-3 [&_p]:leading-relaxed [&_li]:leading-relaxed">
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
              <li>Track stock and ETF holdings with real-time market data.</li>
              <li>View portfolio performance, historical charts, and benchmark comparisons.</li>
              <li>Access AI-powered stock analysis and insights (subject to tier limits).</li>
              <li>Import portfolio data from broker statements or connect brokerage accounts via third-party aggregators (Trefolio).</li>
              <li>Track cash balances and dividend projections.</li>
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

            <h3>Folio (Free Tier)</h3>
            <p>
              The Folio tier provides core portfolio tracking functionality,
              including Yahoo Finance market data, historical charts, cash
              balance tracking, benchmark comparisons, and limited AI analysis
              (5 requests per month).
            </p>

            <h3>Bifolio Tier</h3>
            <p>
              The Bifolio tier is available for a monthly subscription fee
              (currently €2.99/month, inclusive of applicable VAT). Bifolio
              includes everything in Folio, plus up to 50 holdings, 20 AI
              analysis calls per month, portfolio sharing, CSV export, and
              1-year portfolio growth history.
            </p>

            <h3>Trefolio Tier</h3>
            <p>
              The Trefolio tier is available for a monthly subscription fee (currently
              €7.99/month, inclusive of applicable VAT). Trefolio includes everything
              in Bifolio, plus:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Alpha Vantage real-time market data.</li>
              <li>SnapTrade brokerage aggregation (connect 20+ brokerages via OAuth for portfolio import).</li>
              <li>Company fundamentals (income statements, balance sheets, cash flow).</li>
              <li>Stock Intelligence (news sentiment, insider trades, institutional holdings).</li>
              <li>Economic Indicators dashboard.</li>
              <li>Unlimited AI analysis.</li>
              <li>CSV export of portfolio data.</li>
            </ul>

            <h3>Price Changes</h3>
            <p>
              We reserve the right to change subscription pricing. Existing
              subscribers will be given at least 30 days&apos; notice before any
              price increase takes effect on their subscription.
            </p>
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
                  className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
                >
                  Stripe
                </a>
                . We do not store your credit card details.
              </li>
              <li>
                Paid subscriptions (Bifolio and Trefolio) renew automatically each billing cycle unless
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
              we will issue a full refund. Contact{" "}
              <a
                href="mailto:support@trefolio.com"
                className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
              >
                support@trefolio.com
              </a>{" "}
              to request a refund.
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
          </section>

          <section>
            <h2>8. Financial Disclaimer</h2>
            <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-6 mt-4">
              <p className="text-slate-200 font-medium mb-3">
                trefolio is NOT a financial advisor.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  All information provided through the Service, including AI
                  analysis, market data, charts, projections, and indicators, is
                  for <strong className="text-white">informational purposes only</strong>.
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
                  <strong className="text-white">Shared portfolios</strong> — when you share your portfolio via a public link, the shared view is for informational purposes only. It does not constitute financial advice. You are solely responsible for the content you choose to share publicly.
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
                The Service is provided <strong className="text-white">&quot;as is&quot;</strong>{" "}
                and <strong className="text-white">&quot;as available&quot;</strong>{" "}
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
                data feeds, AI analysis, and third-party integrations (including
                SnapTrade brokerage connections) may experience downtime.
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
                className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
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
                  className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
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
                className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
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
