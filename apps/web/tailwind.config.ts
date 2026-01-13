import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // ChatGPT-like typography (Söhne where available, Inter as shipped, then system).
        sans: [
          "var(--font-sans)",
          "Söhne",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          '"Noto Sans"',
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
        ],
      },
      colors: {
        zc: {
          bg: "rgb(var(--zc-bg) / <alpha-value>)",
          panel: "rgb(var(--zc-panel) / <alpha-value>)",
          card: "rgb(var(--zc-card) / <alpha-value>)",
          border: "rgb(var(--zc-border) / <alpha-value>)",
          text: "rgb(var(--zc-text) / <alpha-value>)",
          muted: "rgb(var(--zc-muted) / <alpha-value>)",
          accent: "rgb(var(--zc-accent) / <alpha-value>)",
          accent2: "rgb(var(--zc-accent2) / <alpha-value>)",
          ring: "rgb(var(--zc-ring) / <alpha-value>)",
          danger: "rgb(var(--zc-danger) / <alpha-value>)",
          warn: "rgb(var(--zc-warn) / <alpha-value>)",
          ok: "rgb(var(--zc-ok) / <alpha-value>)",
        },
      },
      boxShadow: {
        "elev-1": "0 1px 2px rgb(0 0 0 / 0.12)",
        "elev-2": "0 12px 40px rgb(0 0 0 / 0.28)",
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
      },
    },
  },
  plugins: [],
} satisfies Config;
