/** Open the SnapTrade Connection Portal in a popup and resolve on close or postMessage. */
export function openSnapTradePortalPopup(
  url: string,
  onSuccess: () => void,
  onError: (msg: string) => void,
): void {
  const popup = window.open(url, "snaptrade-connect", "width=800,height=700");
  let resolved = false;

  const cleanup = () => {
    resolved = true;
    clearInterval(pollInterval);
    window.removeEventListener("message", handleMessage);
  };

  const handleMessage = (e: MessageEvent) => {
    if (resolved) return;
    const data = e.data;
    if (data?.status === "SUCCESS") {
      cleanup();
      popup?.close();
      onSuccess();
    } else if (data?.status === "ERROR") {
      cleanup();
      popup?.close();
      onError(data.detail || "Connection failed.");
    } else if (data === "ABANDONED") {
      cleanup();
      popup?.close();
      onSuccess();
    }
  };

  window.addEventListener("message", handleMessage);

  const pollInterval = setInterval(() => {
    if (resolved) return;
    if (!popup || popup.closed) {
      cleanup();
      onSuccess();
    }
  }, 1000);
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as Record<string, unknown>).standalone === true)
  );
}
