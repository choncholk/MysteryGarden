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
        primary: {
          yellow: "#FFD700",
          yellowLight: "#FFF4CC",
          yellowDark: "#E6C200",
          green: "#22C55E",
          greenLight: "#D1FAE5",
          greenDark: "#16A34A",
        },
      },
    },
  },
  plugins: [],
};
export default config;

