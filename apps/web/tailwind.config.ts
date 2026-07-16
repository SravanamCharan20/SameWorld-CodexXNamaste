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
        background: "#0E0E10",
        now: "#22C55E",
        open: "#F5B822",
        "ai-match": "#818CF8",
        resolved: "#8B8CA0",
        "text-primary": "#F2F2F5",
        "text-secondary": "#9A9BAA",
        surface: "#17171A",
        border: "#26262B",
      },
      fontFamily: {
        heading: ["var(--font-heading)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      fontSize: {
        xs: "11px",
        sm: "13px",
        base: "16px",
        lg: "21px",
        xl: "28px",
        "2xl": "40px",
      },
      spacing: {
        1: "4px",
        2: "8px",
        3: "12px",
        4: "16px",
        6: "24px",
        8: "32px",
        12: "48px",
      },
      borderRadius: {
        card: "8px",
        pill: "20px",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      transitionDuration: {
        micro: "150ms",
        panel: "300ms",
        hero: "700ms",
      },
    },
  },
  plugins: [],
};
export default config;
