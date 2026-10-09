import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        inter: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["Fraunces", "Georgia", "serif"],
        tamil: ["var(--font-noto-tamil)", "system-ui", "sans-serif"],
      },
      colors: {
        brand: { 50:"#f0fdf4",100:"#dcfce7",200:"#bbf7d0",300:"#86efac",400:"#4ade80",500:"#22c55e",600:"#16a34a",700:"#15803d",800:"#166534",900:"#14532d" },
        ink: "#14151D", paper: "#EAE8E8",
        gray: { 50:"#F4F3F3",100:"#EAE8E8",200:"#D6D8DF",300:"#BFC3CE",400:"#A4A8B6",500:"#7E8294",600:"#555A6E",700:"#383C50",800:"#262A3B",900:"#1D2030",950:"#14151D" },
        emerald: { 50:"#EFFAF8",100:"#D5F1EC",200:"#AEE3DB",300:"#84D3C8",400:"#5CC2B4",500:"#3EA094",600:"#2F8A7F",700:"#1F6F65",800:"#175750",900:"#12403B",950:"#0B2623" },
        green: { 50:"#EFFAF8",100:"#D5F1EC",200:"#AEE3DB",300:"#84D3C8",400:"#5CC2B4",500:"#3EA094",600:"#2F8A7F",700:"#1F6F65",800:"#175750",900:"#12403B",950:"#0B2623" },
        blue: { 50:"#EFFAF8",100:"#D5F1EC",200:"#AEE3DB",300:"#84D3C8",400:"#5CC2B4",500:"#3EA094",600:"#2F8A7F",700:"#1F6F65",800:"#175750",900:"#12403B",950:"#0B2623" },
        indigo: { 50:"#EFFAF8",100:"#D5F1EC",200:"#AEE3DB",300:"#84D3C8",400:"#5CC2B4",500:"#3EA094",600:"#2F8A7F",700:"#1F6F65",800:"#175750",900:"#12403B",950:"#0B2623" },
        purple: { 50:"#EFFAF8",100:"#D5F1EC",200:"#AEE3DB",300:"#84D3C8",400:"#5CC2B4",500:"#3EA094",600:"#2F8A7F",700:"#1F6F65",800:"#175750",900:"#12403B",950:"#0B2623" },
        violet: { 50:"#EFFAF8",100:"#D5F1EC",200:"#AEE3DB",300:"#84D3C8",400:"#5CC2B4",500:"#3EA094",600:"#2F8A7F",700:"#1F6F65",800:"#175750",900:"#12403B",950:"#0B2623" },
        cyan: { 50:"#EFFAF8",100:"#D5F1EC",200:"#AEE3DB",300:"#84D3C8",400:"#5CC2B4",500:"#3EA094",600:"#2F8A7F",700:"#1F6F65",800:"#175750",900:"#12403B",950:"#0B2623" },
        sky: { 50:"#EFFAF8",100:"#D5F1EC",200:"#AEE3DB",300:"#84D3C8",400:"#5CC2B4",500:"#3EA094",600:"#2F8A7F",700:"#1F6F65",800:"#175750",900:"#12403B",950:"#0B2623" },
        teal: { 300:"#84D3C8",400:"#5CC2B4",500:"#3EA094",600:"#2F8A7F",700:"#1F6F65",800:"#175750",900:"#12403B",950:"#0B2623" },
      },
      animation: {
        "shimmer": "shimmer 1.5s infinite",
        "pulse-glow": "pulse-glow 2s infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(74, 222, 128, 0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(74, 222, 128, 0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
