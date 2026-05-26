import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        myanmar: [
          "Noto Sans Myanmar",
          "Pyidaungsu",
          "Myanmar Text",
          "Padauk",
          "serif",
        ],
      },
      colors: {
        obsidian: {
          50:  "#faf7f0",
          100: "#ede5d4",
          200: "#d5c4a0",
          300: "#b89a63",
          400: "#9a7530",
          500: "#7d5c18",
          600: "#634812",
          700: "#4a360e",
          800: "#31240a",
          900: "#1e1608",
          950: "#0e0b04",
        },
        gold: {
          200: "#fde89a",
          300: "#f9d45c",
          400: "#efbc28",
          500: "#d4960f",
          600: "#b07a0a",
        },
        ember: "#c27d22",
        parchment: "#f2e8d5",
        ash: "#6b5d48",
      },
      animation: {
        "fade-up":    "fadeUp 0.55s ease both",
        "fade-in":    "fadeIn 0.4s ease both",
        "wave-bar":   "waveBar 1s ease-in-out infinite",
        "spin-slow":  "spin 1.6s linear infinite",
        "glow-pulse": "glowPulse 2.4s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        waveBar: {
          "0%, 100%": { transform: "scaleY(0.25)" },
          "50%":      { transform: "scaleY(1)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 12px 2px rgba(212,150,15,0.25)" },
          "50%":      { boxShadow: "0 0 28px 6px rgba(212,150,15,0.55)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
