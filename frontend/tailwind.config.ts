import type { Config } from "tailwindcss";

// AgriGuard theme tokens. Values live as CSS variables in app/globals.css;
// see DESIGN.md ("AgriGuard overrides") for roles and contrast notes.
const v = (name: string) => `rgb(var(--ag-${name}) / <alpha-value>)`;

// Legacy palette families (green, emerald, teal, blue…) are remapped onto the
// AgriGuard greens so any older class still lands on-brand. Prefer the semantic
// names (primary, leaf, ink, muted, accent…) in new code.
const green = {
  50: "#F1F7EE", 100: "#E6EFE0", 200: "#C9DEC0", 300: "#9CC58F", 400: "#5FA357",
  500: "#3D8B40", 600: "#2E7D32", 700: "#256628", 800: "#1D4F20", 900: "#163D19", 950: "#0E2710",
};
const neutral = {
  50: "#F7F5EE", 100: "#EEEBE2", 200: "#D5DCCF", 300: "#B4BFB1", 400: "#8C9A8D",
  500: "#6B7A6C", 600: "#4F5E51", 700: "#3A483C", 800: "#2A372C", 900: "#1C2A1E", 950: "#121C14",
};
const amber = {
  50: "#FDF6EA", 100: "#FBEBD2", 200: "#F6D7A4", 300: "#F0BE6E", 400: "#EBAD4F",
  500: "#E9A23B", 600: "#C7852A", 700: "#8A5300", 800: "#6E4200", 900: "#573400", 950: "#3A2300",
};

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-body)", "Georgia", "serif"],
      },
      colors: {
        ink: v("ink"),
        muted: v("muted"),
        canvas: v("canvas"),
        surface: v("surface"),
        leaf: v("leaf"),
        primary: { DEFAULT: v("primary"), strong: v("primary-strong") },
        accent: { DEFAULT: v("accent"), ink: v("accent-ink"), soft: v("accent-soft") },
        danger: { DEFAULT: v("danger"), soft: v("danger-soft") },
        line: { DEFAULT: v("line"), strong: v("line-strong") },

        brand: green, emerald: green, green, teal: green, lime: green,
        blue: green, sky: green, cyan: green, indigo: green, violet: green, purple: green,
        gray: neutral, slate: neutral,
        amber, yellow: amber, orange: amber,
      },
      fontSize: {
        // DESIGN.md scale, one step larger for outdoor reading
        "body-sm": ["15px", { lineHeight: "1.5" }],
        body: ["17px", { lineHeight: "1.6" }],
        "body-lg": ["19px", { lineHeight: "1.55" }],
      },
      boxShadow: {
        // DESIGN.md's single elevation tier
        float: "0 0 0 1px rgba(28,42,30,0.04), 0 2px 6px rgba(28,42,30,0.06), 0 4px 8px rgba(28,42,30,0.08)",
      },
      minHeight: { tap: "48px" },
      minWidth: { tap: "48px" },
      keyframes: {
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
      animation: { shimmer: "shimmer 1.5s infinite" },
    },
  },
  plugins: [],
};

export default config;
