import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getPostByLangAndSlug, getAllLocalizedSlugs } from "@/lib/blog";
import { JsonLd } from "@/components/JsonLd";
import PublicFooter from "@/components/PublicFooter";
import ShareBar from "../../[slug]/share-bar";
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

const OG_LOCALES: Record<string, string> = {
  es: "es_ES", fr: "fr_FR", de: "de_DE", it: "it_IT", pt: "pt_PT",
  nl: "nl_NL", pl: "pl_PL", sv: "sv_SE", da: "da_DK", fi: "fi_FI",
};

const UI: Record<string, { allPosts: string; signUp: string; disclaimer: string; ctaTitle: string; ctaBody: string; ctaButton: string }> = {
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

interface Props {
  params: { lang: string; slug: string };
}

export async function generateStaticParams() {
  return getAllLocalizedSlugs();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getPostByLangAndSlug(params.lang, params.slug);
  if (!post) return {};

  const langUrl = `https://trefolio.com/blog/${params.lang}/${post.slug}`;
  const ogLocale = OG_LOCALES[params.lang] || "en_US";

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

export default function LocalizedBlogPostPage({ params }: Props) {
  const post = getPostByLangAndSlug(params.lang, params.slug);
  if (!post) notFound();

  const ui = UI[params.lang] || UI.es;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    inLanguage: params.lang,
    author: { "@type": "Organization", name: "trefolio", url: "https://trefolio.com" },
    publisher: {
      "@type": "Organization",
      name: "trefolio",
      url: "https://trefolio.com",
      logo: { "@type": "ImageObject", url: "https://trefolio.com/icon.svg" },
    },
    mainEntityOfPage: `https://trefolio.com/blog/${params.lang}/${post.slug}`,
    keywords: post.keywords.join(", "),
  };

  return (
    <>
      <JsonLd data={articleSchema} />
      <div className="min-h-screen bg-gray-950 text-gray-100" lang={params.lang}>
        <header className="border-b border-gray-800">
          <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
            <Link href="/" className="text-emerald-400 font-semibold text-lg hover:text-emerald-300 transition-colors">
              trefolio
            </Link>
            <div className="flex items-center gap-4">
              <Link href={`/blog/${params.lang}`} className="text-sm text-gray-400 hover:text-gray-200 transition-colors">
                Blog
              </Link>
              <Link
                href="/signup"
                className="text-sm bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                {ui.signUp}
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-6 py-16">
          <Link href={`/blog/${params.lang}`} className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors mb-8 inline-block">
            &larr; {ui.allPosts}
          </Link>

          <article>
            <header className="mb-10">
              <time className="text-sm text-gray-500">{post.date}</time>
              <h1 className="text-3xl sm:text-4xl font-bold mt-2 mb-3">{post.title}</h1>
              <p className="text-gray-400 text-lg leading-relaxed">{post.description}</p>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-sm text-gray-500">{post.readingTime}</span>
                <ShareBar title={post.title} slug={post.slug} lang={params.lang} />
              </div>
            </header>

            <div
              className="prose prose-invert prose-emerald max-w-none
                prose-headings:font-semibold prose-headings:text-gray-100
                prose-p:text-gray-300 prose-p:leading-relaxed
                prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:text-emerald-300
                prose-strong:text-gray-100
                prose-li:text-gray-300
                prose-th:text-gray-200 prose-td:text-gray-300
                prose-table:border-gray-700 prose-th:border-gray-700 prose-td:border-gray-700"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </article>

          <aside className="mt-12 p-4 rounded-lg border border-gray-800 text-xs text-gray-500 leading-relaxed">
            <strong className="text-gray-400">Disclaimer:</strong> {ui.disclaimer}
          </aside>

          <aside className="mt-8 p-8 rounded-xl bg-gray-900 border border-gray-800 text-center">
            <h2 className="text-xl font-semibold mb-2">{ui.ctaTitle}</h2>
            <p className="text-gray-400 mb-4">{ui.ctaBody}</p>
            <Link
              href="/signup"
              className="inline-block bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3 rounded-lg transition-colors font-medium"
            >
              {ui.ctaButton}
            </Link>
          </aside>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
