import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: { DEFAULT: '#e2e2e2', dark: '#b0b0b0' },
        dark: { DEFAULT: '#000000', 2: '#111111', 3: '#1a1a1a', 4: '#222222' },
        mid: { DEFAULT: '#2a2a2a', 2: '#333333' },
        status: {
          green: '#22d07a',
          blue: '#3b9de8',
          amber: '#f5a623',
          red: '#e84560',
          purple: '#9b6dff',
        },
        border: { DEFAULT: 'rgba(255,255,255,0.08)', 2: 'rgba(255,255,255,0.14)' },
        txt: { DEFAULT: '#ffffff', 2: '#c8c8c8', 3: '#787878' },
      },
      fontFamily: {
        heading: ['"League Spartan"', 'sans-serif'],
        body: ['"League Spartan"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
