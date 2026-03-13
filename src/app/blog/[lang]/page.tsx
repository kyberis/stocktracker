import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPostsByLang } from "@/lib/blog";
import { JsonLd } from "@/components/JsonLd";
import PublicFooter from "@/components/PublicFooter";
import "@/lib/blog-posts-es";
import "@/lib/blog-posts-fr";
import "@/lib/blog-posts-de";
import "@/lib/blog-posts-it";
import "@/lib/blog-posts-pt";
import "@/lib/blog-posts-nl";
import "@/lib/blog-posts-pl";
import "@/lib/blog-posts-sv";
import "@/lib/blog-posts-da";
import "@/lib/blog-posts-fi";

const SUPPORTED_LANGS = new Set(["es", "fr", "de", "it", "pt", "nl", "pl", "sv", "da", "fi"]);

const OG_LOCALES: Record<string, string> = {
  es: "es_ES", fr: "fr_FR", de: "de_DE", it: "it_IT", pt: "pt_PT",
  nl: "nl_NL", pl: "pl_PL", sv: "sv_SE", da: "da_DK", fi: "fi_FI",
};

const INDEX_UI: Record<string, { title: string; subtitle: string; signUp: string }> = {
  es: { title: "Blog", subtitle: "Guías, tutoriales e información para inversores europeos.", signUp: "Regístrate gratis" },
  fr: { title: "Blog", subtitle: "Guides, tutoriels et informations pour les investisseurs européens.", signUp: "Inscription gratuite" },
  de: { title: "Blog", subtitle: "Anleitungen, Tutorials und Einblicke für europäische Anleger.", signUp: "Kostenlos registrieren" },
  it: { title: "Blog", subtitle: "Guide, tutorial e approfondimenti per investitori europei.", signUp: "Registrati gratis" },
  pt: { title: "Blog", subtitle: "Guias, tutoriais e informações para investidores europeus.", signUp: "Registe-se grátis" },
  nl: { title: "Blog", subtitle: "Gidsen, tutorials en inzichten voor Europese beleggers.", signUp: "Gratis registreren" },
  pl: { title: "Blog", subtitle: "Poradniki, tutoriale i informacje dla europejskich inwestorów.", signUp: "Zarejestruj się za darmo" },
  sv: { title: "Blogg", subtitle: "Guider, handledningar och insikter för europeiska investerare.", signUp: "Registrera dig gratis" },
  da: { title: "Blog", subtitle: "Guides, vejledninger og indsigt for europæiske investorer.", signUp: "Tilmeld dig gratis" },
  fi: { title: "Blogi", subtitle: "Oppaat, tutoriaalit ja tietoa eurooppalaisille sijoittajille.", signUp: "Rekisteröidy ilmaiseksi" },
};

interface Props {
  params: { lang: string };
}

export function generateStaticParams() {
  return Array.from(SUPPORTED_LANGS).map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!SUPPORTED_LANGS.has(params.lang)) return {};
  const ui = INDEX_UI[params.lang];
  const ogLocale = OG_LOCALES[params.lang] || "en_US";
  return {
    title: `${ui.title} — trefolio`,
    description: ui.subtitle,
    alternates: { canonical: `https://trefolio.com/blog/${params.lang}` },
    openGraph: {
      title: `${ui.title} — trefolio`,
      description: ui.subtitle,
      url: `https://trefolio.com/blog/${params.lang}`,
      siteName: "trefolio",
      locale: ogLocale,
      type: "website",
      images: [{ url: "/screenshots/dashboard-overview.png", width: 1280, height: 800, alt: "trefolio portfolio dashboard" }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${ui.title} — trefolio`,
      description: ui.subtitle,
      images: ["/screenshots/dashboard-overview.png"],
    },
  };
}

export default function LocalizedBlogIndexPage({ params }: Props) {
  if (!SUPPORTED_LANGS.has(params.lang)) notFound();

  const posts = getPostsByLang(params.lang);
  const ui = INDEX_UI[params.lang];

  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `trefolio ${ui.title}`,
    url: `https://trefolio.com/blog/${params.lang}`,
    description: ui.subtitle,
    inLanguage: params.lang,
    publisher: { "@type": "Organization", name: "trefolio", url: "https://trefolio.com", logo: "https://trefolio.com/icon.svg" },
  };

  return (
    <>
      <JsonLd data={blogSchema} />
      <div className="min-h-screen bg-gray-950 text-gray-100" lang={params.lang}>
        <header className="border-b border-gray-800">
          <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
            <Link href="/" className="text-emerald-400 font-semibold text-lg hover:text-emerald-300 transition-colors">
              trefolio
            </Link>
            <Link
              href="/signup"
              className="text-sm bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
              {ui.signUp}
            </Link>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-6 py-16">
          <h1 className="text-4xl font-bold mb-3">{ui.title}</h1>
          <p className="text-gray-400 mb-12 text-lg">{ui.subtitle}</p>

          {posts.length === 0 ? (
            <p className="text-gray-500">No posts yet.</p>
          ) : (
            <div className="space-y-10">
              {posts.map((post) => (
                <article key={post.slug} className="group">
                  <Link href={`/blog/${params.lang}/${post.slug}`} className="block">
                    <time className="text-sm text-gray-500">{post.date}</time>
                    <h2 className="text-xl font-semibold mt-1 mb-2 group-hover:text-emerald-400 transition-colors">
                      {post.title}
                    </h2>
                    <p className="text-gray-400 leading-relaxed">{post.description}</p>
                    <span className="text-sm text-emerald-400 mt-2 inline-block">{post.readingTime}</span>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
