import type { Config } from "tailwindcss";

const config: Config = {
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
        surface: {
          base: '#0A0B0E',
          card: '#111318',
          elevated: '#161922',
          subtle: '#1C1F2B',
        },
        border: {
          subtle: '#1E222D',
          muted: '#282D3C',
          active: '#3A4256',
        },
        accent: {
          emerald: '#10B981',
          teal: '#14B8A6',
          indigo: '#6366F1',
          amber: '#F59E0B',
          rose: '#F43F5E',
          sky: '#38BDF8',
        }
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;

