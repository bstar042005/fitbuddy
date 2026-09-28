import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0F172A",
        foreground: "#F8FAFC",
        neon: {
          DEFAULT: "#39FF14",
          dim: "#28b50e",
          glow: "rgba(57, 255, 20, 0.4)",
          subtle: "rgba(57, 255, 20, 0.12)",
        },
        alert: {
          red: "#ef4444",
          orange: "#f97316",
          redGlow: "rgba(239, 68, 68, 0.4)",
          orangeGlow: "rgba(249, 115, 22, 0.4)",
        },
        cyber: {
          950: "#090d16",
          900: "#0F172A",
          850: "#131e36",
          800: "#1E293B",
          700: "#334155",
          600: "#475569",
          border: "#1E293B",
          borderLight: "#2e3f5c",
          cyan: "#06b6d4",
          blue: "#3b82f6",
        },
      },
      fontFamily: {
        mono: ["GeistMono", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      boxShadow: {
        "neon": "0 0 15px rgba(57, 255, 20, 0.45)",
        "neon-sm": "0 0 8px rgba(57, 255, 20, 0.3)",
        "neon-lg": "0 0 25px rgba(57, 255, 20, 0.5)",
        "alert": "0 0 15px rgba(239, 68, 68, 0.45)",
        "alert-orange": "0 0 15px rgba(249, 115, 22, 0.45)",
        "cyber-card": "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      },
      animation: {
        "pulse-fast": "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow-slow": "glow 3s ease-in-out infinite",
        "scanline": "scanline 8s linear infinite",
      },
      keyframes: {
        glow: {
          "0%, 100%": { opacity: "1", filter: "drop-shadow(0 0 10px rgba(57,255,20,0.6))" },
          "50%": { opacity: "0.6", filter: "drop-shadow(0 0 4px rgba(57,255,20,0.2))" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
