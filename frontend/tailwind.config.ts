import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        crm: {
          bg: "#0B0C10",
          surface: "#0F1117",
          card: "#141721",
          cardHover: "#1A1D2B",
          cardBorder: "rgba(255, 255, 255, 0.08)",
          border: "rgba(255, 255, 255, 0.08)",
          muted: "#12141D",
          primary: "#6366F1",
          primaryHover: "#4F46E5",
          accent: "#F59E0B",
          accentHover: "#D97706",
          success: "#10B981",
          warning: "#F59E0B",
          destructive: "#EF4444",
          kanbanBg: "#0B0C10",
          kanbanCol: "#0F1117",
          lightBg: "#FAF8F5",
          lightSurface: "#FFFFFF",
          lightCard: "#FFFFFF",
          lightBorder: "#E2E8F0",
          lightMuted: "#F4EFE9",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "Plus Jakarta Sans",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "var(--font-mono)",
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        glow: "0 0 20px -5px rgba(99, 102, 241, 0.25)",
        card: "0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3)",
      },
    },
  },
  plugins: [],
};
export default config;
