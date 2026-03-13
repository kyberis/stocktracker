export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  readingTime: string;
  keywords: string[];
  image?: string;
  content: string;
  lang?: string;
  alternates?: Record<string, string>;
}

const posts: BlogPost[] = [];

export function getAllPosts(): BlogPost[] {
  return posts
    .filter((p) => !p.lang || p.lang === "en")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug && (!p.lang || p.lang === "en"));
}

export function getAllSlugs(): string[] {
  return posts.filter((p) => !p.lang || p.lang === "en").map((p) => p.slug);
}

export function getPostsByLang(lang: string): BlogPost[] {
  return posts.filter((p) => p.lang === lang).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostByLangAndSlug(lang: string, slug: string): BlogPost | undefined {
  return posts.find((p) => p.lang === lang && p.slug === slug);
}

export function getAllLocalizedSlugs(): { lang: string; slug: string }[] {
  return posts.filter((p) => p.lang && p.lang !== "en").map((p) => ({ lang: p.lang!, slug: p.slug }));
}

export function registerPost(post: BlogPost) {
  posts.push(post);
}
