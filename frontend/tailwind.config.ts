import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        app: 'var(--bg-app)',
        surface: {
          DEFAULT: 'var(--bg-surface)',
          subtle: 'var(--bg-surface-subtle)',
          elevated: 'var(--bg-surface-elevated)',
          interactive: 'var(--bg-surface-interactive)',
          hover: 'var(--bg-surface-interactive-hover)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          muted: 'var(--border-muted)',
          active: 'var(--border-active)',
        },
        content: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          muted: 'var(--text-muted)',
        },
        brand: {
          jade: {
            DEFAULT: 'var(--color-jade)',
            deep: 'var(--color-jade-deep)',
            surface: 'var(--color-jade-surface)',
            border: 'var(--color-jade-border)',
            text: 'var(--color-jade-text)',
          },
          steel: {
            DEFAULT: 'var(--color-steel)',
            surface: 'var(--color-steel-surface)',
            border: 'var(--color-steel-border)',
            text: 'var(--color-steel-text)',
          },
          brass: {
            DEFAULT: 'var(--color-brass)',
            surface: 'var(--color-brass-surface)',
            border: 'var(--color-brass-border)',
            text: 'var(--color-brass-text)',
          },
          burgundy: {
            DEFAULT: 'var(--color-burgundy)',
            surface: 'var(--color-burgundy-surface)',
            border: 'var(--color-burgundy-border)',
            text: 'var(--color-burgundy-text)',
          },
          amber: {
            DEFAULT: 'var(--color-amber)',
            surface: 'var(--color-amber-surface)',
            border: 'var(--color-amber-border)',
            text: 'var(--color-amber-text)',
          },
        },
      },
    },
  },
  plugins: [],
};
export default config;
