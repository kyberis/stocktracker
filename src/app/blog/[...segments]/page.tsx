import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getPostBySlug, getAllSlugs, getPostsByLang, getPostByLangAndSlug, getAllLocalizedSlugs } from "@/lib/blog";
import { JsonLd } from "@/components/JsonLd";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";
import ShareBar from "../share-bar";
import "@/lib/blog-posts";
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

const POST_UI: Record<string, { allPosts: string; signUp: string; disclaimer: string; ctaTitle: string; ctaBody: string; ctaButton: string }> = {
  en: { allPosts: "All posts", signUp: "Sign Up Free", disclaimer: "trefolio is not a financial advisor. The information in this article is for informational purposes only and does not constitute investment advice. AI analysis may contain errors. Past performance does not guarantee future results. Always do your own research before making investment decisions.", ctaTitle: "Ready to track your portfolio?", ctaBody: "Import from DEGIRO, IBKR, Trading 212, or Revolut in seconds. Free to start.", ctaButton: "Create Free Account" },
  es: { allPosts: "Todos los artículos", signUp: "Regístrate gratis", disclaimer: "trefolio no es un asesor financiero ni fiscal. La información de este artículo es solo informativa y no constituye asesoramiento de inversión ni fiscal. El análisis con IA puede contener errores. Consulta siempre a un profesional cualificado.", ctaTitle: "¿Listo para controlar tu cartera?", ctaBody: "Importa desde DEGIRO, IBKR, Trading 212 o Revolut en segundos. Gratis para empezar.", ctaButton: "Crear cuenta gratuita" },
  fr: { allPosts: "Tous les articles", signUp: "Inscription gratuite", disclaimer: "trefolio n'est ni un conseiller financier ni un conseiller fiscal. Les informations contenues dans cet article sont fournies à titre informatif uniquement et ne constituent pas des conseils en investissement ou en fiscalité. L'analyse IA peut contenir des erreurs. Consultez toujours un professionnel qualifié.", ctaTitle: "Prêt à suivre votre portefeuille ?", ctaBody: "Importez depuis DEGIRO, IBKR, Trading 212 ou Revolut en quelques secondes. Gratuit pour commencer.", ctaButton: "Créer un compte gratuit" },
  de: { allPosts: "Alle Beiträge", signUp: "Kostenlos registrieren", disclaimer: "trefolio ist kein Finanz- oder Steuerberater. Die Informationen in diesem Artikel dienen nur zu Informationszwecken und stellen keine Anlage- oder Steuerberatung dar. KI-Analysen können Fehler enthalten. Konsultieren Sie immer einen qualifizierten Fachmann.", ctaTitle: "Bereit, Ihr Portfolio zu verfolgen?", ctaBody: "Import von DEGIRO, IBKR, Trading 212 oder Revolut in Sekunden. Kostenlos starten.", ctaButton: "Kostenloses Konto erstellen" },
  it: { allPosts: "Tutti gli articoli", signUp: "Registrati gratis", disclaimer: "trefolio non è un consulente finanziario né fiscale. Le informazioni contenute in questo articolo sono fornite a solo scopo informativo e non costituiscono consulenza in materia di investimenti o fiscale. L'analisi IA può contenere errori. Consultare sempre un professionista qualificato.", ctaTitle: "Pronto a monitorare il tuo portafoglio?", ctaBody: "Importa da DEGIRO, IBKR, Trading 212 o Revolut in pochi secondi. Gratuito per iniziare.", ctaButton: "Crea un account gratuito" },
  pt: { allPosts: "Todos os artigos", signUp: "Registe-se grátis", disclaimer: "trefolio não é um consultor financeiro nem fiscal. As informações neste artigo são apenas informativas e não constituem aconselhamento de investimento ou fiscal. A análise de IA pode conter erros. Consulte sempre um profissional qualificado.", ctaTitle: "Pronto para acompanhar a sua carteira?", ctaBody: "Importe do DEGIRO, IBKR, Trading 212 ou Revolut em segundos. Grátis para começar.", ctaButton: "Criar conta gratuita" },
  nl: { allPosts: "Alle artikelen", signUp: "Gratis registreren", disclaimer: "trefolio is geen financieel of fiscaal adviseur. De informatie in dit artikel is uitsluitend informatief en vormt geen beleggings- of belastingadvies. AI-analyse kan fouten bevatten. Raadpleeg altijd een gekwalificeerde professional.", ctaTitle: "Klaar om uw portefeuille te volgen?", ctaBody: "Importeer vanuit DEGIRO, IBKR, Trading 212 of Revolut in seconden. Gratis om te beginnen.", ctaButton: "Gratis account aanmaken" },
  pl: { allPosts: "Wszystkie artykuły", signUp: "Zarejestruj się za darmo", disclaimer: "trefolio nie jest doradcą finansowym ani podatkowym. Informacje w tym artykule mają charakter wyłącznie informacyjny i nie stanowią porady inwestycyjnej ani podatkowej. Analiza AI może zawierać błędy. Zawsze konsultuj się z wykwalifikowanym specjalistą.", ctaTitle: "Gotowy do śledzenia swojego portfela?", ctaBody: "Importuj z DEGIRO, IBKR, Trading 212 lub Revolut w kilka sekund. Za darmo na start.", ctaButton: "Utwórz darmowe konto" },
  sv: { allPosts: "Alla artiklar", signUp: "Registrera dig gratis", disclaimer: "trefolio är inte en finansiell eller skatterådgivare. Informationen i denna artikel är endast i informationssyfte och utgör inte investerings- eller skatterådgivning. AI-analys kan innehålla fel. Rådfråga alltid en kvalificerad expert.", ctaTitle: "Redo att följa din portfölj?", ctaBody: "Importera från Nordnet, DEGIRO, IBKR eller Trading 212 på sekunder. Gratis att börja.", ctaButton: "Skapa gratis konto" },
  da: { allPosts: "Alle artikler", signUp: "Tilmeld dig gratis", disclaimer: "trefolio er ikke en finansiel eller skattemæssig rådgiver. Oplysningerne i denne artikel er kun til informationsformål og udgør ikke investerings- eller skatterådgivning. AI-analyse kan indeholde fejl. Kontakt altid en kvalificeret rådgiver.", ctaTitle: "Klar til at følge din portefølje?", ctaBody: "Importér fra Nordnet, DEGIRO, IBKR eller Trading 212 på sekunder. Gratis at starte.", ctaButton: "Opret gratis konto" },
  fi: { allPosts: "Kaikki artikkelit", signUp: "Rekisteröidy ilmaiseksi", disclaimer: "trefolio ei ole talous- tai veroneuvoja. Tämän artikkelin tiedot ovat vain tiedoksi eivätkä ole sijoitus- tai veroneuvontaa. Tekoälyanalyysi voi sisältää virheitä. Ota aina yhteyttä pätevään asiantuntijaan.", ctaTitle: "Valmis seuraamaan salkkuasi?", ctaBody: "Tuo Nordnetistä, DEGIROsta, IBKR:stä tai Trading 212:sta sekunneissa. Ilmainen aloitus.", ctaButton: "Luo ilmainen tili" },
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

type RouteKind = { kind: "en-post"; slug: string } | { kind: "lang-index"; lang: string } | { kind: "lang-post"; lang: string; slug: string };

function resolveRoute(segments: string[]): RouteKind | null {
  if (segments.length === 1) {
    if (SUPPORTED_LANGS.has(segments[0])) return { kind: "lang-index", lang: segments[0] };
    return { kind: "en-post", slug: segments[0] };
  }
  if (segments.length === 2 && SUPPORTED_LANGS.has(segments[0])) {
    return { kind: "lang-post", lang: segments[0], slug: segments[1] };
  }
  return null;
}

interface Props {
  params: { segments: string[] };
}

export async function generateStaticParams() {
  const enSlugs = getAllSlugs().map((slug) => ({ segments: [slug] }));
  const langIndexes = Array.from(SUPPORTED_LANGS).map((lang) => ({ segments: [lang] }));
  const langPosts = getAllLocalizedSlugs().map(({ lang, slug }) => ({ segments: [lang, slug] }));
  return [...enSlugs, ...langIndexes, ...langPosts];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const route = resolveRoute(params.segments);
  if (!route) return {};

  if (route.kind === "en-post") {
    const post = getPostBySlug(route.slug);
    if (!post) return {};

    const languages: Record<string, string> = {};
    if (post.alternates) {
      for (const [code, altSlug] of Object.entries(post.alternates)) {
        languages[code] = code === "en" ? `https://trefolio.com/blog/${altSlug}` : `https://trefolio.com/blog/${code}/${altSlug}`;
      }
      languages["x-default"] = `https://trefolio.com/blog/${post.slug}`;
    }

    return {
      title: post.title,
      description: post.description,
      keywords: post.keywords,
      alternates: { canonical: `https://trefolio.com/blog/${post.slug}`, ...(Object.keys(languages).length > 0 && { languages }) },
      openGraph: {
        title: `${post.title} — trefolio blog`,
        description: post.description,
        url: `https://trefolio.com/blog/${post.slug}`,
        siteName: "trefolio",
        locale: "en_US",
        type: "article",
        publishedTime: post.date,
        images: [{ url: post.image || "/screenshots/dashboard-overview.png", width: 1280, height: 800, alt: post.title }],
      },
      twitter: {
        card: "summary_large_image",
        title: `${post.title} — trefolio blog`,
        description: post.description,
        images: [post.image || "/screenshots/dashboard-overview.png"],
      },
    };
  }

  if (route.kind === "lang-index") {
    const ui = INDEX_UI[route.lang];
    if (!ui) return {};
    const ogLocale = OG_LOCALES[route.lang] || "en_US";
    return {
      title: `${ui.title} — trefolio`,
      description: ui.subtitle,
      alternates: { canonical: `https://trefolio.com/blog/${route.lang}` },
      openGraph: {
        title: `${ui.title} — trefolio`,
        description: ui.subtitle,
        url: `https://trefolio.com/blog/${route.lang}`,
        siteName: "trefolio",
        locale: ogLocale,
        type: "website",
        images: [{ url: "/screenshots/dashboard-overview.png", width: 1280, height: 800, alt: "trefolio portfolio dashboard" }],
      },
      twitter: { card: "summary_large_image", title: `${ui.title} — trefolio`, description: ui.subtitle, images: ["/screenshots/dashboard-overview.png"] },
    };
  }

  if (route.kind === "lang-post") {
    const post = getPostByLangAndSlug(route.lang, route.slug);
    if (!post) return {};

    const langUrl = `https://trefolio.com/blog/${route.lang}/${post.slug}`;
    const ogLocale = OG_LOCALES[route.lang] || "en_US";
    const languages: Record<string, string> = { "x-default": `https://trefolio.com/blog/${post.alternates?.en || post.slug}` };
    if (post.alternates) {
      for (const [code, altSlug] of Object.entries(post.alternates)) {
        languages[code] = code === "en" ? `https://trefolio.com/blog/${altSlug}` : `https://trefolio.com/blog/${code}/${altSlug}`;
      }
    }

    return {
      title: post.title,
      description: post.description,
      keywords: post.keywords,
      alternates: { canonical: langUrl, languages },
      openGraph: {
        title: `${post.title} — trefolio blog`,
        description: post.description,
        url: langUrl,
        siteName: "trefolio",
        locale: ogLocale,
        type: "article",
        publishedTime: post.date,
        images: [{ url: post.image || "/screenshots/dashboard-overview.png", width: 1280, height: 800, alt: post.title }],
      },
      twitter: {
        card: "summary_large_image",
        title: `${post.title} — trefolio blog`,
        description: post.description,
        images: [post.image || "/screenshots/dashboard-overview.png"],
      },
    };
  }

  return {};
}

function EnglishPostView({ slug }: { slug: string }) {
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const ui = POST_UI.en;
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { "@type": "Organization", name: "trefolio", url: "https://trefolio.com" },
    publisher: { "@type": "Organization", name: "trefolio", url: "https://trefolio.com", logo: { "@type": "ImageObject", url: "https://trefolio.com/icon.svg" } },
    mainEntityOfPage: `https://trefolio.com/blog/${post.slug}`,
    keywords: post.keywords.join(", "),
  };

  return (
    <>
      <JsonLd data={articleSchema} />
      <div className="min-h-screen bg-[#faf9f7] text-slate-600">
        <PublicNav />
        <main className="max-w-3xl mx-auto px-6 py-16">
          <Link href="/blog" className="text-sm text-emerald-600 hover:text-emerald-500 transition-colors mb-8 inline-block">
            &larr; {ui.allPosts}
          </Link>
          <PostArticle post={post} shareBarLang={undefined} />
          <Disclaimer text={ui.disclaimer} />
          <CtaBox title={ui.ctaTitle} body={ui.ctaBody} button={ui.ctaButton} />
        </main>
        <PublicFooter />
      </div>
    </>
  );
}

function LangIndexView({ lang }: { lang: string }) {
  const posts = getPostsByLang(lang);
  const ui = INDEX_UI[lang];
  if (!ui) notFound();

  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `trefolio ${ui.title}`,
    url: `https://trefolio.com/blog/${lang}`,
    description: ui.subtitle,
    inLanguage: lang,
    publisher: { "@type": "Organization", name: "trefolio", url: "https://trefolio.com", logo: "https://trefolio.com/icon.svg" },
  };

  return (
    <>
      <JsonLd data={blogSchema} />
      <div className="min-h-screen bg-[#faf9f7] text-slate-600" lang={lang}>
        <PublicNav />
        <main className="max-w-3xl mx-auto px-6 py-16">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">{ui.title}</h1>
          <p className="text-slate-500 mb-12 text-lg">{ui.subtitle}</p>
          {posts.length === 0 ? (
            <p className="text-slate-400">No posts yet.</p>
          ) : (
            <div className="space-y-10">
              {posts.map((post) => (
                <article key={post.slug} className="group">
                  <Link href={`/blog/${lang}/${post.slug}`} className="block">
                    <time className="text-sm text-slate-400">{post.date}</time>
                    <h2 className="text-xl font-semibold text-slate-900 mt-1 mb-2 group-hover:text-emerald-600 transition-colors">{post.title}</h2>
                    <p className="text-slate-500 leading-relaxed">{post.description}</p>
                    <span className="text-sm text-emerald-600 mt-2 inline-block">{post.readingTime}</span>
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

function LangPostView({ lang, slug }: { lang: string; slug: string }) {
  const post = getPostByLangAndSlug(lang, slug);
  if (!post) notFound();

  const ui = POST_UI[lang] || POST_UI.es;
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    inLanguage: lang,
    author: { "@type": "Organization", name: "trefolio", url: "https://trefolio.com" },
    publisher: { "@type": "Organization", name: "trefolio", url: "https://trefolio.com", logo: { "@type": "ImageObject", url: "https://trefolio.com/icon.svg" } },
    mainEntityOfPage: `https://trefolio.com/blog/${lang}/${post.slug}`,
    keywords: post.keywords.join(", "),
  };

  return (
    <>
      <JsonLd data={articleSchema} />
      <div className="min-h-screen bg-[#faf9f7] text-slate-600" lang={lang}>
        <PublicNav />
        <main className="max-w-3xl mx-auto px-6 py-16">
          <Link href={`/blog/${lang}`} className="text-sm text-emerald-600 hover:text-emerald-500 transition-colors mb-8 inline-block">
            &larr; {ui.allPosts}
          </Link>
          <PostArticle post={post} shareBarLang={lang} />
          <Disclaimer text={ui.disclaimer} />
          <CtaBox title={ui.ctaTitle} body={ui.ctaBody} button={ui.ctaButton} />
        </main>
        <PublicFooter />
      </div>
    </>
  );
}

function PostArticle({ post, shareBarLang }: { post: { title: string; date: string; description: string; readingTime: string; slug: string; content: string }; shareBarLang: string | undefined }) {
  return (
    <article>
      <header className="mb-10">
        <time className="text-sm text-slate-400">{post.date}</time>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mt-2 mb-3">{post.title}</h1>
        <p className="text-slate-500 text-lg leading-relaxed">{post.description}</p>
        <div className="flex items-center gap-3 mt-3">
          <span className="text-sm text-slate-400">{post.readingTime}</span>
          <ShareBar title={post.title} slug={post.slug} lang={shareBarLang} />
        </div>
      </header>
      <div
        className="prose prose-slate prose-emerald max-w-none prose-headings:font-semibold prose-headings:text-slate-900 prose-p:text-slate-600 prose-p:leading-relaxed prose-a:text-emerald-600 prose-a:no-underline hover:prose-a:text-emerald-500 prose-strong:text-slate-900 prose-li:text-slate-600 prose-th:text-slate-800 prose-td:text-slate-600 prose-table:border-slate-200 prose-th:border-slate-200 prose-td:border-slate-200"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  );
}

function Disclaimer({ text }: { text: string }) {
  return (
    <aside className="mt-12 p-4 rounded-lg border border-slate-200 bg-white text-xs text-slate-500 leading-relaxed shadow-sm">
      <strong className="text-slate-600">Disclaimer:</strong> {text}
    </aside>
  );
}

function CtaBox({ title, body, button }: { title: string; body: string; button: string }) {
  return (
    <aside className="mt-8 p-8 rounded-xl bg-white border border-slate-200 text-center shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900 mb-2">{title}</h2>
      <p className="text-slate-500 mb-4">{body}</p>
      <Link href="/signup" className="inline-block bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3 rounded-lg transition-colors font-medium shadow-md shadow-emerald-500/20">{button}</Link>
    </aside>
  );
}

export default function BlogCatchAllPage({ params }: Props) {
  const route = resolveRoute(params.segments);
  if (!route) notFound();

  switch (route.kind) {
    case "en-post":
      return <EnglishPostView slug={route.slug} />;
    case "lang-index":
      return <LangIndexView lang={route.lang} />;
    case "lang-post":
      return <LangPostView lang={route.lang} slug={route.slug} />;
  }
}
