import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f0f5fb",
          100: "#dce8f4",
          200: "#b9d1e9",
          300: "#85afd5",
          400: "#4f87bf",
          500: "#3068a8",
          600: "#25538d",
          700: "#1e3a5f",
          800: "#162d4a",
          900: "#0f1f34",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 15px -3px rgba(0,0,0,0.07), 0 10px 20px -2px rgba(0,0,0,0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
