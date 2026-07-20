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
        syne: ["var(--font-syne)", "sans-serif"],
        dm: ["var(--font-dm)", "sans-serif"],
      },
      colors: {
        accent: {
          DEFAULT: "#c05a2e",
          dark: "#8b3d18",
          light: "rgba(192,90,46,0.08)",
        },
        teal: {
          DEFAULT: "#2a7a6e",
          light: "rgba(42,122,110,0.08)",
        },
        surface: {
          DEFAULT: "#faf9f7",
          2: "#f4f2ee",
        },
        bg: "#f0ede8",
      },
      borderRadius: {
        card: "20px",
      },
    },
  },
  plugins: [],
};

export default config;
