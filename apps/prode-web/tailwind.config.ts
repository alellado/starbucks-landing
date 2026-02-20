import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        heading: ["'Sora'", "sans-serif"],
        body: ["'Manrope'", "sans-serif"]
      },
      colors: {
        pitch: "#0D4F32",
        turf: "#1F8A4D",
        ink: "#0E1525",
        accent: "#F5B700",
        cloud: "#F4F7FA"
      },
      boxShadow: {
        card: "0 12px 40px -18px rgba(14, 21, 37, 0.45)"
      }
    }
  },
  plugins: []
};

export default config;
