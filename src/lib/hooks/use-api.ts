"use client";

import useSWR, { type SWRConfiguration } from "swr";
import type { Transaction, WatchlistItem, Account, RebalanceTarget, PriceAlert } from "@/lib/types";
import { fetchWithAuthRedirect } from "@/lib/auth/client-redirect";

const fetcher = async (url: string) => {
  const res = await fetchWithAuthRedirect(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

type SWROptions<T> = SWRConfiguration<T>;

export function useTransactions(holdingId?: string, options?: SWROptions<Transaction[]>) {
  const url = holdingId
    ? `/api/transactions?holdingId=${holdingId}`
    : "/api/transactions";
  return useSWR<Transaction[]>(url, fetcher, {
    revalidateOnFocus: false,
    ...options,
  });
}

export function useWatchlist(options?: SWROptions<WatchlistItem[]>) {
  return useSWR<WatchlistItem[]>("/api/watchlist", fetcher, {
    revalidateOnFocus: false,
    ...options,
  });
}

export function useAccounts(options?: SWROptions<Account[]>) {
  return useSWR<Account[]>("/api/accounts", fetcher, {
    revalidateOnFocus: false,
    ...options,
  });
}

export function useRebalanceTargets(options?: SWROptions<RebalanceTarget[]>) {
  return useSWR<RebalanceTarget[]>("/api/rebalance-targets", fetcher, {
    revalidateOnFocus: false,
    ...options,
  });
}

export type AlertsResponse = {
  alerts: PriceAlert[];
  activeCount: number;
  limit: number | null;
  isPro: boolean;
};

export function useAlerts(options?: SWROptions<AlertsResponse>) {
  return useSWR<AlertsResponse>("/api/alerts", fetcher, {
    revalidateOnFocus: false,
    ...options,
  });
}

export type AlertedTickersResponse = {
  tickers: string[];
};

export function useAlertedTickers(options?: SWROptions<AlertedTickersResponse>) {
  return useSWR<AlertedTickersResponse>("/api/alerts/tickers", fetcher, {
    revalidateOnFocus: false,
    ...options,
  });
}

export function useFeedback(options?: SWROptions<unknown[]>) {
  return useSWR<unknown[]>("/api/feedback", fetcher, {
    revalidateOnFocus: false,
    ...options,
  });
}
