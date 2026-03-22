import Link from "next/link";
import { getAllPosts } from "@/lib/blog";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";
import "@/lib/blog-posts";

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="min-h-screen bg-[#faf9f7] text-slate-600">
      <PublicNav />

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-3">Blog</h1>
        <p className="text-slate-500 mb-12 text-lg">
          Guides, tutorials, and insights for European investors.
        </p>

        {posts.length === 0 ? (
          <p className="text-slate-400">No posts yet. Check back soon.</p>
        ) : (
          <div className="space-y-10">
            {posts.map((post) => (
              <article key={post.slug} className="group">
                <Link href={`/blog/${post.slug}`} className="block">
                  <time className="text-sm text-slate-400">{post.date}</time>
                  <h2 className="text-xl font-semibold text-slate-900 mt-1 mb-2 group-hover:text-emerald-600 transition-colors">
                    {post.title}
                  </h2>
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
  );
}
