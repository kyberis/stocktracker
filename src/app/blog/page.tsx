import Link from "next/link";
import { getAllPosts } from "@/lib/blog";
import PublicFooter from "@/components/PublicFooter";
import "@/lib/blog-posts";

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
          <Link href="/" className="text-emerald-400 font-semibold text-lg hover:text-emerald-300 transition-colors">
            trefolio
          </Link>
          <Link
            href="/signup"
            className="text-sm bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-lg transition-colors font-medium"
          >
            Sign Up Free
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-3">Blog</h1>
        <p className="text-gray-400 mb-12 text-lg">
          Guides, tutorials, and insights for European investors.
        </p>

        {posts.length === 0 ? (
          <p className="text-gray-500">No posts yet. Check back soon.</p>
        ) : (
          <div className="space-y-10">
            {posts.map((post) => (
              <article key={post.slug} className="group">
                <Link href={`/blog/${post.slug}`} className="block">
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
  );
}
