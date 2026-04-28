/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
      },
      colors: {
        ink: "#07111f",
        ocean: "#0b2a4a",
        teal: "#1fc7b6",
        coral: "#ff6b5c",
        gold: "#f5c542",
      },
      boxShadow: {
        soft: "0 18px 45px rgba(7, 17, 31, 0.16)",
      },
    },
  },
  plugins: [],
};
