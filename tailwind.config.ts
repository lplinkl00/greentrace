import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Lucid Sunset — warm orange primary
        sunset: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
          950: "#431407",
        },
        // Forest green — for success / certified states
        forest: {
          50: "#f0fdf4",
          100: "#dcfce7",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
        },
        // Dark sidebar palette
        sidebar: {
          bg: "#1c1c1e",
          hover: "#2c2c2e",
          active: "#3a2010",
          border: "#2c2c2e",
          muted: "#71717a",
          text: "#a1a1aa",
          heading: "#f4f4f5",
        },
        // Content / surface palette
        surface: {
          DEFAULT: "#f5f5f5",
          card: "#ffffff",
          border: "#e4e4e7",
        },
        // Semantic status colours
        status: {
          verified: "#16a34a",
          pending: "#d97706",
          flagged: "#dc2626",
          draft: "#6b7280",
          scheduled: "#2563eb",
        },
      },
      backgroundImage: {
        "sunset-gradient":
          "linear-gradient(135deg, #f97316 0%, #ef4444 50%, #e11d48 100%)",
        "sunset-gradient-soft":
          "linear-gradient(135deg, #fb923c 0%, #f43f5e 100%)",
        "sidebar-gradient":
          "linear-gradient(180deg, #1c1c1e 0%, #141414 100%)",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        "card-hover":
          "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
      },
      fontFamily: {
        sans: [
          "var(--font-geist-sans)",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
