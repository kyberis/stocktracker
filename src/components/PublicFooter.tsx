import Link from "next/link";

function FooterLogo() {
  return (
    <svg className="w-8 h-8 rounded-xl shadow-lg shadow-emerald-500/25" viewBox="0 0 32 32">
      <defs>
        <linearGradient id="pf-a" x1=".5" y1="0" x2=".5" y2="1"><stop offset="0%" stopColor="#6ee7b7"/><stop offset="100%" stopColor="#10b981"/></linearGradient>
        <linearGradient id="pf-b" x1="0" y1=".3" x2="1" y2=".7"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#059669"/></linearGradient>
        <linearGradient id="pf-c" x1=".5" y1="1" x2=".5" y2="0"><stop offset="0%" stopColor="#10b981"/><stop offset="100%" stopColor="#047857"/></linearGradient>
        <linearGradient id="pf-d" x1="1" y1=".3" x2="0" y2=".7"><stop offset="0%" stopColor="#a7f3d0"/><stop offset="100%" stopColor="#34d399"/></linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill="#0f172a"/>
      <g transform="translate(16,16) rotate(45)">
        <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#pf-a)"/>
        <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#pf-b)" transform="rotate(90)"/>
        <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#pf-c)" transform="rotate(180)"/>
        <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#pf-d)" transform="rotate(270)"/>
        <circle cx="0" cy="0" r="1.2" fill="#0f172a" opacity=".35"/>
      </g>
    </svg>
  );
}

const PRODUCT_LINKS = [
  { label: "Features", href: "/landing#features" },
  { label: "Pricing", href: "/landing#pricing" },
  { label: "FAQ", href: "/landing#faq" },
  { label: "Blog", href: "/blog" },
  { label: "Contact Us", href: "/contact" },
];

const ACCOUNT_LINKS = [
  { label: "Sign Up", href: "/signup" },
  { label: "Log In", href: "/login" },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
];

export default function PublicFooter() {
  return (
    <footer className="bg-slate-950 border-t border-slate-800/50 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <FooterLogo />
              <span className="text-lg font-bold text-white">trefolio</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              The simplest way to manage your stock portfolio. Built for European investors.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-3">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-slate-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Account</h4>
            <ul className="space-y-3">
              {ACCOUNT_LINKS.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-slate-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-3">
              {LEGAL_LINKS.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-slate-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800/50 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} trefolio. Made in Europe.
          </p>
          <p className="text-xs text-slate-600">
            Market data provided by Yahoo Finance and Alpha Vantage. Not financial advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
