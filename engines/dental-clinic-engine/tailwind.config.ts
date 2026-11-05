import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // From client-8 (Warm)
        plum: {
          50: "#FAF5FF", 100: "#F3E8FF", 200: "#E9D5FF", 300: "#D8B4FE",
          400: "#C084FC", 500: "#A855F7", 600: "#9333EA", 700: "#7E22CE",
          800: "#581C87", 900: "#4C1D95", 950: "#1E1B4B", DEFAULT: "#4C1D95",
          dark: "#1E1B4B",
        },
        rose: {
          50: "#FFF1F2", 100: "#FFE4E6", 200: "#FECDD3", 300: "#FDA4AF",
          400: "#FB7185", 500: "#F43F5E", 600: "#E11D48", 700: "#BE185D",
          800: "#9F1239", 900: "#881337", DEFAULT: "#FFF1F2",
        },
        cream: {
          50: "#FAF8F5", 100: "#F5F0EB", 200: "#EFE8DF", DEFAULT: "#FAF8F5",
          dark: "#EFE8DF",
        },
        ink: {
          DEFAULT: "#1E1B4B", muted: "#475569", light: "#64748B",
        },

        // From client-9 (Modern)
        charcoal: {
          DEFAULT: "#0F172A", 950: "#080C15", 900: "#0F172A", 850: "#172033",
          800: "#1E293B", 700: "#334155", 600: "#475569", 500: "#64748B",
        },
        ice: {
          50: "#F8FAFC", 100: "#F1F5F9", 200: "#E2E8F0", 300: "#CBD5E1",
          400: "#94A3B8",
        },
        gold: {
          50: "#FDFBF7", 100: "#F9F3E5", 200: "#F3E6C4", 300: "#E8D394",
          400: "#DFBF62", DEFAULT: "#D4AF37", 600: "#B89223", 700: "#947217",
          800: "#755714", 900: "#5E4413",
        },

        // From client-15 (Premium)
        aesthetic: {
          50: "#fffbeb", 100: "#fef3c7", 200: "#fde68a", 300: "#fcd34d",
          400: "#fbbf24", 500: "#f59e0b", 600: "#d97706", 700: "#b45309",
          800: "#92400e", 900: "#78350f", 950: "#451a03",
        },
        onyx: {
          950: "#09090b", 900: "#121215", 800: "#18181b", 700: "#27272a",
          600: "#3f3f46", 500: "#52525b", 400: "#71717a", 300: "#a1a1aa",
          200: "#e4e4e7", 100: "#f4f4f5", 50: "#fafafa",
        },
      },
      boxShadow: {
        'gold-glow': '0 0 25px -5px rgba(212, 175, 55, 0.25)',
        'luxury': '0 12px 35px -8px rgba(15, 23, 42, 0.08)',
        'elevated': '0 20px 45px -12px rgba(15, 23, 42, 0.12)',
        'card': "0 4px 25px -4px rgba(217, 119, 6, 0.08)",
        'hover': "0 12px 35px -6px rgba(217, 119, 6, 0.16)",
        'goldGlow': "0 0 25px rgba(217, 119, 6, 0.25)",
        'goldSubtle': "0 0 15px rgba(245, 158, 11, 0.12)",
        'darkElevated': "0 20px 40px -15px rgba(0, 0, 0, 0.7)",
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #D4AF37 0%, #F3E6C4 50%, #B89223 100%)',
        'charcoal-gradient': 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)',
        'subtle-radial': 'radial-gradient(circle at 50% 0%, rgba(212, 175, 55, 0.08) 0%, rgba(255, 255, 255, 0) 70%)',
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-subtle": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.85", transform: "scale(0.98)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.5s ease-out both",
        "pulse-subtle": "pulse-subtle 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
