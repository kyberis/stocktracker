/**
 * Optional Tavily web search for AID earnings digests (same pattern as Renata).
 * Requires TAVILY_API_KEY — skipped when unset.
 */

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
}

export async function searchTavilyForTicker(
  query: string,
  maxResults = 5,
): Promise<TavilySearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) return [];

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "basic",
      max_results: maxResults,
      include_answer: false,
    }),
  });

  if (!res.ok) return [];

  const data = (await res.json()) as {
    results?: Array<{ title?: string; url?: string; content?: string }>;
  };

  return (data.results ?? [])
    .filter((r) => r.title && r.url)
    .map((r) => ({
      title: String(r.title),
      url: String(r.url),
      content: String(r.content ?? "").slice(0, 1200),
    }));
}
