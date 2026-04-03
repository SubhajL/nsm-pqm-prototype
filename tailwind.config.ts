import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1E3A5F",
        "accent-teal": "#00B894",
        info: "#2D6BFF",
        warning: "#F39C12",
        danger: "#E74C3C",
        success: "#27AE60",
        "bg-layout": "#F5F7FA",
        "text-dark": "#2C3E50",
        "border-light": "#E8ECF1",
        "sidebar-dark": "#14181e",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "var(--font-thai)", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 10px rgba(0, 0, 0, 0.08)",
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  },
};

export default config;
