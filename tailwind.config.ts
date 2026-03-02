import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gain: "#22c55e",
        loss: "#ef4444",
        card: "#1e293b",
        surface: "#0f172a",
      },
    },
  },
  plugins: [],
};

export default config;
