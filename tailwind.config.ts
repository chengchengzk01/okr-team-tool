import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1664FF",
        "primary-hover": "#4080FF",
        "primary-light": "#E8F0FF",
        ink: "#1D2129",
        paper: "#F2F3F5",
        card: "#FFFFFF",
        steel: "#4E5969",
        muted: "#86909C",
        disabled: "#C9CDD4",
        line: "#E5E6EB",
        hover: "#F7F8FA",
        "status-green": "#00B42A",
        "status-green-bg": "#E8FFEA",
        "status-yellow": "#FF7D00",
        "status-yellow-bg": "#FFF3E8",
        "status-red": "#F53F3F",
        "status-red-bg": "#FFECE8",
        "status-gray": "#C9CDD4",
        "status-gray-bg": "#F2F3F5"
      },
      boxShadow: {
        panel: "0 1px 3px rgba(0,0,0,0.08)",
        "panel-hover": "0 4px 12px rgba(0,0,0,0.12)"
      }
    }
  },
  plugins: []
};

export default config;
