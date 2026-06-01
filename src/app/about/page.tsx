import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#faf9f7] text-slate-600">
      <PublicNav />

      <section className="pt-20 pb-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
            The person behind trefolio
          </h1>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            Why I built this, and why it matters.
          </p>
        </div>
      </section>

      <main className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 leading-relaxed [&_p]:text-slate-600">
          <h2 className="text-2xl font-bold text-slate-900 !mb-6">Why I built trefolio</h2>

          <p>
            I&rsquo;m a systems engineer by trade, but markets and economics have always been a
            genuine passion. Over the past few years I went from casually following the markets to
            actively investing across stocks, ETFs, and other instruments &mdash; learning about
            valuations, cycles, and what really drives long-term returns.
          </p>

          <p>One book in particular changed the way I think about investing:</p>

          <blockquote className="border-l-[3px] border-emerald-500 pl-6 italic text-slate-500">
            <span className="text-emerald-600 font-medium not-italic">The Intelligent Investor</span>{" "}
            by Benjamin Graham reinforced many of the lessons I&rsquo;d been learning the hard way,
            and helped me build a more disciplined framework for understanding how markets actually
            work &mdash; or at least get closer to it.
          </blockquote>

          <p>
            To track my growing portfolio I tried everything &mdash; free tools, paid subscriptions,
            spreadsheets. None of them felt right. The data was often inaccurate, the information
            wasn&rsquo;t relevant to what I actually needed, and I&rsquo;d always end up going back
            to my broker to double-check the numbers.
          </p>

          <p>
            Then it got worse. I started using{" "}
            <span className="text-emerald-600 font-medium">
              different brokers for different instruments
            </span>{" "}
            &mdash; one for European equities, another for US stocks, another for ETFs &mdash; each
            chosen for convenience or fees. Suddenly I needed an aggregator, a single place to see
            everything. The tools that existed were either too basic, too expensive for the data they
            actually provided, or simply not built for investors like me.
          </p>

          <p>So I started building my own.</p>

          <p>
            What began as a personal side project kept growing. I added features I wished existed in
            other tools &mdash; multi-currency support done right, proper European broker imports,
            dividend tracking that actually makes sense. Eventually it reached a point where I
            thought:{" "}
            <span className="text-emerald-600 font-medium">
              this could help other people too
            </span>
            .
          </p>

          <p>
            The rise of AI in software development has been a game-changer. With AI-assisted
            development, the pace of progress accelerated dramatically &mdash; features that would
            have taken weeks shipped in days. That speed is what made it possible for a solo founder
            to build a product that can genuinely compete with established tools, at an affordable
            price.
          </p>

          <p>
            I&rsquo;m also building{" "}
            <span className="text-emerald-600 font-medium">trefolio Leaf</span> &mdash; a dedicated
            hardware device to track your portfolio at a glance, without picking up your phone and
            inevitably getting distracted by something else entirely. It&rsquo;s the tool I&rsquo;ve
            always wanted on my desk.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 !mt-16 !mb-6">Join the community</h2>

          <p>
            trefolio is built by an investor, for investors. Every feature comes from a real need,
            and every piece of feedback shapes what comes next.
          </p>

          <p>
            If you&rsquo;re looking for an affordable, transparent portfolio tracker that respects
            your data and your time &mdash; I&rsquo;d love for you to give it a try. And whatever
            your experience, your feedback will certainly be considered.
          </p>

          <div className="!mt-12 pt-8 border-t border-slate-200">
            <p className="text-slate-900 font-semibold text-lg !mb-0">Marcos C. Suarez</p>
            <p className="text-emerald-600 text-sm !mt-1">Founder of trefolio</p>
          </div>
        </div>
      </main>

      <section className="pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 text-center shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-3">
              Ready to take control of your portfolio?
            </h3>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
              Start tracking your investments today. Free to get started.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/25"
              >
                Get Started Free
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors border border-slate-200"
              >
                Get in Touch
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
