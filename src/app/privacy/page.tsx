import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — trefolio",
  description:
    "trefolio is a GDPR-compliant portfolio tracker. Learn how we collect, process, and protect your personal data. No tracking cookies, no data selling.",
  alternates: { canonical: "https://trefolio.com/privacy" },
};

export default function PrivacyPolicyPage() {
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
            href="/terms"
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Terms of Service
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <header className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">
            Privacy Policy
          </h1>
          <p className="text-slate-400">
            Last updated: March 6, 2026
          </p>
        </header>

        <div className="prose prose-invert prose-slate max-w-none space-y-10 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mt-12 [&_h2]:mb-4 [&_h3]:text-lg [&_h3]:font-medium [&_h3]:text-slate-200 [&_h3]:mt-8 [&_h3]:mb-3 [&_p]:leading-relaxed [&_li]:leading-relaxed">
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
                className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
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
                <strong className="text-slate-200">Email address</strong> — used
                for authentication, account recovery, and essential service
                communications.
              </li>
              <li>
                <strong className="text-slate-200">Password</strong> — stored as
                a one-way bcrypt hash. We never store or have access to your
                plaintext password.
              </li>
              <li>
                <strong className="text-slate-200">Third-party sign-in (Google)</strong> — 
                if you sign in with Google, we receive and store your name, email
                address, and profile picture from your Google account. We do not
                receive or store your Google password.
              </li>
            </ul>

            <h3>Portfolio Data</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Stock holdings, transactions, and cash balances you enter or
                import.
              </li>
              <li>
                User preferences (language, theme, display currency, selected
                benchmarks).
              </li>
              <li>
                <strong className="text-slate-200">Broker connection credentials (optional)</strong> —
                if you connect your Interactive Brokers account via the Flex Web
                Service API, your access token and query ID are encrypted with
                AES-256-GCM and stored so you can re-sync your portfolio on demand.
                You can disconnect at any time, which permanently deletes these credentials.
              </li>
            </ul>

            <h3>Automatically Collected Data</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-slate-200">Session cookies</strong> — 
                essential httpOnly cookies for authentication. No tracking or
                advertising cookies.
              </li>
              <li>
                <strong className="text-slate-200">Basic analytics</strong> — 
                anonymous, aggregated page-view data via Vercel Analytics to
                understand product usage. No personal identifiers are stored.
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
              <li>Process subscription payments through Stripe (see Section 5).</li>
              <li>Send essential service communications (e.g., password resets, critical security notices).</li>
            </ul>
            <p>
              We do <strong className="text-white">not</strong> sell, rent, or
              share your personal data with third parties for advertising or
              marketing purposes.
            </p>
          </section>

          <section>
            <h2>4. Legal Basis for Processing (GDPR)</h2>
            <p>We process your data under the following legal bases:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-slate-200">Contract performance</strong>{" "}
                — processing necessary to provide the trefolio service you signed
                up for (Art. 6(1)(b) GDPR).
              </li>
              <li>
                <strong className="text-slate-200">Legitimate interest</strong>{" "}
                — anonymous analytics to improve the product, fraud prevention,
                and service security (Art. 6(1)(f) GDPR).
              </li>
              <li>
                <strong className="text-slate-200">Legal obligation</strong>{" "}
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
                  <tr className="border-b border-slate-700 text-left">
                    <th className="py-3 pr-6 text-slate-200 font-medium">Service</th>
                    <th className="py-3 pr-6 text-slate-200 font-medium">Purpose</th>
                    <th className="py-3 text-slate-200 font-medium">Data Shared</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
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
                    <td className="py-3 pr-6">AI-powered analysis</td>
                    <td className="py-3">Portfolio data included in analysis prompts</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6">Yahoo Finance</td>
                    <td className="py-3 pr-6">Market data</td>
                    <td className="py-3">Stock ticker symbols requested</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6">Alpha Vantage</td>
                    <td className="py-3 pr-6">Market data (Pro)</td>
                    <td className="py-3">Stock ticker symbols requested</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6">Finnhub</td>
                    <td className="py-3 pr-6">Market news (fallback)</td>
                    <td className="py-3">Stock ticker symbols requested</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6">Cloudflare Turnstile</td>
                    <td className="py-3 pr-6">Bot protection</td>
                    <td className="py-3">IP address and browser signals (used to distinguish humans from bots during signup and login)</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6">Resend</td>
                    <td className="py-3 pr-6">Transactional email</td>
                    <td className="py-3">Email address (for verification, password resets, and service notifications)</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6">Interactive Brokers (Flex Web Service)</td>
                    <td className="py-3 pr-6">Portfolio import via API (Pro)</td>
                    <td className="py-3">User-provided Flex token and Query ID (encrypted at rest); IBKR returns portfolio data directly to our server</td>
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
                <strong className="text-slate-200">Account data</strong> — retained
                for as long as your account is active.
              </li>
              <li>
                <strong className="text-slate-200">Portfolio data</strong> — retained
                for as long as your account is active. If your Pro subscription
                lapses, your data is preserved and accessible when you resubscribe.
              </li>
              <li>
                <strong className="text-slate-200">Analytics events</strong> — 
                anonymous, aggregated usage events are automatically purged after
                90 days.
              </li>
              <li>
                <strong className="text-slate-200">After account deletion</strong>{" "}
                — all personal data is permanently deleted within 30 days. Backups
                containing your data are purged within 90 days.
              </li>
            </ul>
          </section>

          <section>
            <h2>8. Your Rights (GDPR)</h2>
            <p>As a user in the European Economic Area, you have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-slate-200">Access</strong> — request a
                copy of all personal data we hold about you.
              </li>
              <li>
                <strong className="text-slate-200">Rectification</strong> — 
                correct inaccurate personal data.
              </li>
              <li>
                <strong className="text-slate-200">Erasure</strong> — request
                deletion of your account and all associated data.
              </li>
              <li>
                <strong className="text-slate-200">Data portability</strong> — 
                export your portfolio data in CSV or JSON format from your
                profile settings.
              </li>
              <li>
                <strong className="text-slate-200">Restriction</strong> — 
                request restricted processing of your data.
              </li>
              <li>
                <strong className="text-slate-200">Object</strong> — object to
                processing based on legitimate interest.
              </li>
              <li>
                <strong className="text-slate-200">Lodge a complaint</strong> — 
                with your local data protection authority.
              </li>
            </ul>
            <p>
              To exercise any of these rights, email{" "}
              <a
                href="mailto:privacy@trefolio.com"
                className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
              >
                privacy@trefolio.com
              </a>
              . We will respond within 30 days.
            </p>
          </section>

          <section id="cookies">
            <h2>9. Cookies</h2>
            <p>
              trefolio uses only <strong className="text-white">essential cookies</strong>{" "}
              required for the service to function:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-slate-200">Session cookie</strong> — an
                httpOnly, secure cookie that maintains your authenticated session.
                Expires when you log out or after the session timeout period.
              </li>
              <li>
                <strong className="text-slate-200">Cloudflare Turnstile</strong> — 
                Turnstile may set a transient cookie (<code className="text-xs text-slate-300 bg-slate-800 px-1 py-0.5 rounded">cf_bm</code>)
                to complete its bot-detection challenge on signup and login forms.
                This cookie is classified as strictly necessary (bot protection)
                and contains no personal identifiers.
              </li>
            </ul>
            <p>
              We do not use advertising, tracking, or third-party cookies. Because
              we only use strictly necessary cookies, no cookie consent banner is
              required under EU ePrivacy regulations.
            </p>
          </section>

          <section>
            <h2>10. International Transfers</h2>
            <p>
              Your data may be processed outside the EEA by our third-party
              service providers (Vercel, OpenAI, Stripe, Cloudflare, Finnhub, Interactive Brokers). Where
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

        <footer className="mt-16 pt-8 border-t border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} trefolio. Made in Europe.
          </p>
          <div className="flex gap-6">
            <Link
              href="/terms"
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/landing"
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
