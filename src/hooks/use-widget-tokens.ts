"use client";

import { useCallback, useEffect, useState } from "react";

export type WidgetTokenEntry = {
  id: string;
  prefix: string;
  createdAt: string;
  copyable: boolean;
};

type WidgetTokenResponse = {
  hasToken?: boolean;
  latestToken?: string | null;
  tokens?: WidgetTokenEntry[];
};

export function useWidgetTokens(initialTokenFromUrl?: string | null) {
  const [tokens, setTokens] = useState<WidgetTokenEntry[]>([]);
  const [latestToken, setLatestToken] = useState(initialTokenFromUrl ?? "");
  const [hasToken, setHasToken] = useState(!!initialTokenFromUrl);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/widget-token");
    if (!res.ok) return;
    const data = (await res.json()) as WidgetTokenResponse;
    setHasToken(!!data.hasToken);
    setTokens(data.tokens ?? []);
    if (data.latestToken) {
      setLatestToken(data.latestToken);
    } else if (!data.hasToken) {
      setLatestToken("");
    }
  }, []);

  useEffect(() => {
    if (initialTokenFromUrl) {
      setLatestToken(initialTokenFromUrl);
      setHasToken(true);
    }
    refresh().catch(() => {});
  }, [initialTokenFromUrl, refresh]);

  const generate = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/widget-token", { method: "POST" });
      const data = (await res.json()) as { token?: string };
      if (data.token) {
        setLatestToken(data.token);
        setHasToken(true);
        await refresh();
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const revoke = useCallback(
    async (tokenId?: string) => {
      setLoading(true);
      try {
        await fetch("/api/widget-token", {
          method: "DELETE",
          headers: tokenId ? { "Content-Type": "application/json" } : undefined,
          body: tokenId ? JSON.stringify({ id: tokenId }) : undefined,
        });
        await refresh();
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    },
    [refresh],
  );

  return {
    tokens,
    latestToken,
    hasToken,
    loading,
    generate,
    revoke,
    refresh,
  };
}
