import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getPostBySlug, getAllSlugs } from "@/lib/blog";
import { JsonLd } from "@/components/JsonLd";
import PublicFooter from "@/components/PublicFooter";
import "@/lib/blog-posts";

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getPostBySlug(params.slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: `https://trefolio.com/blog/${post.slug}` },
    openGraph: {
      title: `${post.title} — trefolio blog`,
      description: post.description,
      url: `https://trefolio.com/blog/${post.slug}`,
      siteName: "trefolio",
      locale: "en_US",
      type: "article",
      publishedTime: post.date,
      images: [
        {
          url: "/screenshots/dashboard-overview.png",
          width: 1280,
          height: 800,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} — trefolio blog`,
      description: post.description,
      images: ["/screenshots/dashboard-overview.png"],
    },
  };
}

export default function BlogPostPage({ params }: Props) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: {
      "@type": "Organization",
      name: "trefolio",
      url: "https://trefolio.com",
    },
    publisher: {
      "@type": "Organization",
      name: "trefolio",
      url: "https://trefolio.com",
      logo: { "@type": "ImageObject", url: "https://trefolio.com/icon.svg" },
    },
    mainEntityOfPage: `https://trefolio.com/blog/${post.slug}`,
    keywords: post.keywords.join(", "),
  };

  return (
    <>
      <JsonLd data={articleSchema} />
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <header className="border-b border-gray-800">
          <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
            <Link href="/" className="text-emerald-400 font-semibold text-lg hover:text-emerald-300 transition-colors">
              trefolio
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/blog" className="text-sm text-gray-400 hover:text-gray-200 transition-colors">
                Blog
              </Link>
              <Link
                href="/signup"
                className="text-sm bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                Sign Up Free
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-6 py-16">
          <Link href="/blog" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors mb-8 inline-block">
            &larr; All posts
          </Link>

          <article>
            <header className="mb-10">
              <time className="text-sm text-gray-500">{post.date}</time>
              <h1 className="text-3xl sm:text-4xl font-bold mt-2 mb-3">{post.title}</h1>
              <p className="text-gray-400 text-lg leading-relaxed">{post.description}</p>
              <span className="text-sm text-gray-500 mt-2 inline-block">{post.readingTime}</span>
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
            <strong className="text-gray-400">Disclaimer:</strong> trefolio is not a financial advisor.
            The information in this article is for informational purposes only and does not constitute
            investment advice. AI analysis may contain errors. Past performance does not guarantee future
            results. Always do your own research before making investment decisions.
          </aside>

          <aside className="mt-8 p-8 rounded-xl bg-gray-900 border border-gray-800 text-center">
            <h2 className="text-xl font-semibold mb-2">Ready to track your portfolio?</h2>
            <p className="text-gray-400 mb-4">
              Import from DEGIRO, IBKR, Trading 212, or Revolut in seconds. Free to start.
            </p>
            <Link
              href="/signup"
              className="inline-block bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3 rounded-lg transition-colors font-medium"
            >
              Create Free Account
            </Link>
          </aside>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
