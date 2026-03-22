import Link from "next/link";

function Logo() {
  return (
    <svg className="w-9 h-9 rounded-xl shadow-lg shadow-emerald-500/25" viewBox="0 0 32 32">
      <defs>
        <linearGradient id="pn-a" x1=".5" y1="0" x2=".5" y2="1"><stop offset="0%" stopColor="#6ee7b7"/><stop offset="100%" stopColor="#10b981"/></linearGradient>
        <linearGradient id="pn-b" x1="0" y1=".3" x2="1" y2=".7"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#059669"/></linearGradient>
        <linearGradient id="pn-c" x1=".5" y1="1" x2=".5" y2="0"><stop offset="0%" stopColor="#10b981"/><stop offset="100%" stopColor="#047857"/></linearGradient>
        <linearGradient id="pn-d" x1="1" y1=".3" x2="0" y2=".7"><stop offset="0%" stopColor="#a7f3d0"/><stop offset="100%" stopColor="#34d399"/></linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill="#0f172a"/>
      <g transform="translate(16,16) rotate(45)">
        <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#pn-a)"/>
        <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#pn-b)" transform="rotate(90)"/>
        <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#pn-c)" transform="rotate(180)"/>
        <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#pn-d)" transform="rotate(270)"/>
        <circle cx="0" cy="0" r="1.2" fill="#0f172a" opacity=".35"/>
      </g>
    </svg>
  );
}

export default function PublicNav() {
  return (
    <nav className="sticky top-0 z-50 bg-[#faf9f7]/90 backdrop-blur-xl border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/landing" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <Logo />
          <span className="text-xl font-bold text-slate-900 tracking-tight">trefolio</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors px-4 py-2"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-lg transition-all shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/30"
          >
            Sign Up Free
          </Link>
        </div>
      </div>
    </nav>
  );
}
