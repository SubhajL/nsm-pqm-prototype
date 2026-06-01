import type { Config } from "tailwindcss";

/**
 * Tailwind theme — mirrors `src/theme/scales.ts` and `src/theme/antd-theme.ts`
 * so any class-based styling stays aligned with the antd token system.
 * Token sources of truth:
 *   - colors:   src/theme/antd-theme.ts → `COLORS`
 *   - type:     src/theme/scales.ts     → `TYPE_SCALE`
 *   - spacing:  src/theme/scales.ts     → `SPACING`
 * If you change either Tailwind here, mirror the change in the source
 * module — `palette-contrast.test.ts` only audits COLORS, not Tailwind.
 */
const config: Config = {
  // Sprint 4 (E1) — `class` strategy: dark variants activate when the
  // root `<html>` element gets a `.dark` class. `useThemePreference`
  // toggles it in sync with the AntD ConfigProvider algorithm swap.
  darkMode: 'class',
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
        // AA-compliant text variants of the brand status colors.
        // Use these whenever the color renders normal body text on
        // white/light backgrounds (see src/theme/palette-contrast.test.ts).
        "accent-teal-text": "#00755C",
        "warning-text": "#A05E00",
        "success-text": "#1B7A45",
        "error-text": "#B7341C",
        info: "#1D5EE6",
        warning: "#F39C12",
        danger: "#E74C3C",
        success: "#27AE60",
        "bg-layout": "#F5F7FA",
        "text-dark": "#2C3E50",
        // Bumped from #8C8C8C (≈ 3.36:1 on white) → #595959 (≈ 6.69:1)
        // in PR-A1 to satisfy WCAG-AA SC 1.4.3 for normal body text.
        "text-muted": "#595959",
        "border-light": "#E8ECF1",
        "sidebar-dark": "#14181e",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "var(--font-thai)", "-apple-system", "sans-serif"],
      },
      // Mirrors TYPE_SCALE in src/theme/scales.ts. Each entry is
      // [size, { lineHeight }] per Tailwind's tuple form.
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }], //       12 / 16 — captions
        sm: ["0.8125rem", { lineHeight: "1.125rem" }], // 13 / 18 — secondary
        base: ["0.875rem", { lineHeight: "1.375rem" }], // 14 / 22 — body (Thai floor)
        lg: ["1rem", { lineHeight: "1.5rem" }], //        16 / 24 — preferred Thai body
        xl: ["1.125rem", { lineHeight: "1.625rem" }], //  18 / 26 — section sub-headings
        "2xl": ["1.25rem", { lineHeight: "1.75rem" }], // 20 / 28 — section headings
        "3xl": ["1.5rem", { lineHeight: "2rem" }], //     24 / 32 — H3
        "4xl": ["2rem", { lineHeight: "2.5rem" }], //     32 / 40 — H2
        "5xl": ["2.5rem", { lineHeight: "3rem" }], //     40 / 48 — display
      },
      // Named aliases mirroring SPACING in src/theme/scales.ts. The
      // numeric Tailwind scale (`p-1 = 4 px`, `p-2 = 8 px`, …) stays
      // available; these add the design-token names alongside.
      spacing: {
        "tk-xs": "4px",
        "tk-sm": "8px",
        "tk-md": "12px",
        "tk-lg": "16px",
        "tk-xl": "20px",
        "tk-2xl": "24px",
        "tk-3xl": "32px",
        "tk-4xl": "40px",
        "tk-5xl": "48px",
        "tk-6xl": "64px",
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
