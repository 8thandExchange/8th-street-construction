import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Brand palette — Elevation lockup
        parchment: {
          DEFAULT: "#f2ece0",
          50: "#f8f5ee",
          100: "#f2ece0",
          200: "#e8dfd0",
          300: "#d9cdb8",
        },
        bone: {
          DEFAULT: "#f2ece0",
          50: "#f8f5ee",
          100: "#f2ece0",
          200: "#e8dfd0",
          300: "#d9cdb8",
          400: "#c9b894",
          500: "#a8916c",
        },
        ink: {
          DEFAULT: "#1a1a18",
          50: "#6b645a",
          100: "#4a4540",
          200: "#2e2b28",
          300: "#242220",
          400: "#1a1a18",
          500: "#121110",
        },
        navy: {
          DEFAULT: "#101c2a",
          50: "#3a4a5c",
          100: "#1b2838",
          200: "#101c2a",
          300: "#0a121c",
        },
        rust: {
          DEFAULT: "#b5451b",
          50: "#e8c4b0",
          100: "#d48962",
          200: "#c25f33",
          300: "#b5451b",
          400: "#943a16",
          500: "#762e11",
        },
        copper: {
          DEFAULT: "#b5451b",
          50: "#e8c4b0",
          100: "#d48962",
          200: "#c25f33",
          300: "#b5451b",
          400: "#943a16",
          500: "#762e11",
        },
        paper: "#e8dfd0",
        pencil: {
          DEFAULT: "#6b645a",
          50: "#a8a29a",
          100: "#8a8478",
          200: "#6b645a",
          300: "#524d45",
        },
        stone: {
          DEFAULT: "#6b645a",
          50: "#e5e1d9",
          100: "#a8a29a",
          200: "#6b645a",
          300: "#524d45",
        },
        gold: {
          DEFAULT: "#b89b5e",
          50: "#e8dcc4",
          100: "#d4c49a",
          200: "#b89b5e",
          300: "#9a8250",
        },
        "warm-white": "#f8f5ee",
        slate: {
          DEFAULT: "#3a4a5c",
          100: "#3a4a5c",
          200: "#2e3d4d",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "display-2xl": ["clamp(2.5rem, 7vw, 7rem)", { lineHeight: "0.95", letterSpacing: "-0.04em" }],
        "display-xl": ["clamp(2.125rem, 5.5vw, 5rem)", { lineHeight: "1", letterSpacing: "-0.03em" }],
        "display-lg": ["clamp(1.875rem, 4vw, 3.75rem)", { lineHeight: "1.05", letterSpacing: "-0.025em" }],
        "display-md": ["clamp(1.625rem, 3.25vw, 2.75rem)", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        eyebrow: ["0.6875rem", { lineHeight: "1.2", letterSpacing: "0.18em" }],
      },
      spacing: {
        "safe-top": "max(1rem, env(safe-area-inset-top))",
        "safe-bottom": "max(1rem, env(safe-area-inset-bottom))",
        "section-y": "clamp(4rem, 12vw, 10rem)",
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
        "fade-up": "fadeUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fadeIn 1.2s ease-out both",
        "subtle-pulse": "subtlePulse 4s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(24px)" },
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
      },
      backgroundImage: {
        "grain":
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3CfeColorMatrix values='0 0 0 0 0.04 0 0 0 0 0.06 0 0 0 0 0.08 0 0 0 0.6 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};

export default config;
