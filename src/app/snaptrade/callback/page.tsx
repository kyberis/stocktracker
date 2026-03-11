import { redirect } from "next/navigation";

/**
 * SnapTrade redirects here after the user completes the connection/reconnect
 * flow in PWA standalone mode (where popups don't work). We simply bounce the
 * user back to the import page on the broker-sync tab.
 */
export default function SnapTradeCallbackPage() {
  redirect("/import?method=snaptrade_api");
}
