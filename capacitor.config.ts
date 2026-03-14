import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.trefolio.portfolio",
  appName: "trefolio",
  webDir: "public",
  server: {
    url: process.env.CAPACITOR_SERVER_URL || "https://trefolio.com",
    cleartext: process.env.CAPACITOR_SERVER_URL?.startsWith("http://") ?? false,
    allowNavigation: [
      "trefolio.com",
      "*.trefolio.com",
      "localhost",
      "accounts.google.com",
      "appleid.apple.com",
      "*.google.com",
      "*.apple.com",
      "checkout.stripe.com",
      "billing.stripe.com",
    ],
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      launchShowDuration: 0,
      backgroundColor: "#020617",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0f172a",
    },
  },
  ios: {
    scheme: "trefolio",
    contentInset: "automatic",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#020617",
  },
};

export default config;
