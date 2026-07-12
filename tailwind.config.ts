import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Editorial-luxury palette for 8th Street Construction
        bone: {
          DEFAULT: "#F5F1EA",
          50: "#FBF9F5",
          100: "#F5F1EA",
          200: "#EBE3D2",
          300: "#DDD1B8",
          400: "#C9B894",
          500: "#A8916C",
        },
        ink: {
          DEFAULT: "#0A0F14",
          50: "#6B7280",
          100: "#4B5563",
          200: "#374151",
          300: "#1F2937",
          400: "#111827",
          500: "#0A0F14",
        },
        navy: {
          DEFAULT: "#0B1620",
          50: "#1A2937",
          100: "#0F1E2D",
          200: "#0B1620",
          300: "#070F17",
        },
        copper: {
          DEFAULT: "#B86F3E",
          50: "#E8C7A8",
          100: "#D9A37C",
          200: "#C68957",
          300: "#B86F3E",
          400: "#9A5A2E",
          500: "#7C4622",
        },
        paper: "#E8E2D5",
        stone: {
          DEFAULT: "#A8A29A",
          50: "#E5E1D9",
          100: "#C9C3B9",
          200: "#A8A29A",
          300: "#7A746C",
        },
        "copper-glow": "#C8895E",
        "navy-deep": "#070D14",
        "slate-warm": "#9B9485",
        parchment: {
          DEFAULT: "#F2ECE0",
          50: "#FAF7F1",
          100: "#F2ECE0",
          200: "#E8E0D2",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "display-2xl": ["clamp(3.5rem, 8vw, 7rem)", { lineHeight: "0.95", letterSpacing: "-0.04em" }],
        "display-xl": ["clamp(2.75rem, 6vw, 5rem)", { lineHeight: "1", letterSpacing: "-0.03em" }],
        "display-lg": ["clamp(2.25rem, 4.5vw, 3.75rem)", { lineHeight: "1.05", letterSpacing: "-0.025em" }],
        "display-md": ["clamp(1.875rem, 3.5vw, 2.75rem)", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        eyebrow: ["0.75rem", { lineHeight: "1", letterSpacing: "0.18em" }],
      },
      letterSpacing: {
        widest: "0.2em",
      },
      maxWidth: {
        "8xl": "88rem",
        prose: "65ch",
      },
      transitionTimingFunction: {
        editorial: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      animation: {
        "fade-up": "fadeUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fadeIn 1.2s ease-out both",
        "subtle-pulse": "subtlePulse 4s ease-in-out infinite",
        "ken-burns": "kenBurns 20s ease-in-out infinite alternate",
        marquee: "marquee 40s linear infinite",
        "copper-pulse": "copperPulse 2.5s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        subtlePulse: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        kenBurns: {
          "0%": { transform: "scale(1) translate(0, 0)" },
          "100%": { transform: "scale(1.05) translate(0.5%, 0.25%)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        copperPulse: {
          "0%, 100%": { opacity: "0.45", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.2)" },
        },
      },
      backgroundImage: {
        grain:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3CfeColorMatrix values='0 0 0 0 0.04 0 0 0 0 0.06 0 0 0 0 0.08 0 0 0 0.6 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};

export default config;
