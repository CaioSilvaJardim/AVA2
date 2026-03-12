import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["JetBrains Mono", "Courier New", "monospace"],
      },
      colors: {
        "bg-primary": "#08080c",
        "bg-secondary": "#12121a",
        "bg-card": "#0e0e16",
        cyan: "#00ffff",
        magenta: "#ff00ff",
        yellow: "#ffff00",
        purple: "#bf5af2",
        "text-primary": "#e4e4e7",
        "text-secondary": "#a1a1aa",
        "text-muted": "#52525b",
        border: "#27272a",
      },
      animation: {
        blink: "blink 1.2s step-end infinite",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        flicker: "flicker 0.15s infinite linear",
        scanline: "scanline 8s linear infinite",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        flicker: {
          "0%": { opacity: "0.97" },
          "5%": { opacity: "0.92" },
          "10%": { opacity: "0.98" },
          "15%": { opacity: "0.91" },
          "20%": { opacity: "0.97" },
          "100%": { opacity: "0.99" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
