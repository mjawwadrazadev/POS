import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[color-scheme="dark"]'],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--_font-default)", "Manrope", "sans-serif"],
        accent: ["var(--_font-accent)", "JetBrains Mono", "monospace"],
        mono: ["var(--_font-accent)", "JetBrains Mono", "monospace"],
      },
      colors: {
        base: "var(--base)",
        "base-tint": "var(--base-tint)",
        "base-bright": "var(--base-bright)",
        "base-opp": "var(--base-opp)",
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          subtle: "var(--accent-subtle)",
        },
        highlight: "var(--highlight)",
        text: {
          bright: "var(--t-bright)",
          medium: "var(--t-medium)",
          muted: "var(--t-muted)",
        },
        stroke: {
          muted: "var(--st-muted)",
          medium: "var(--st-medium)",
        },
        status: {
          success: "var(--success)",
          error: "var(--error)",
          warning: "var(--warning)",
        },
      },
      borderRadius: {
        DEFAULT: "0px",
        sm: "0px",
        md: "0px",
        lg: "0px",
        xl: "0px",
        full: "9999px", // reserved for avatars
      },
    },
  },
  plugins: [],
};

export default config;
