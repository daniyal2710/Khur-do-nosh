/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        maroon: "#5c1a0e",
        maroon2: "#8b2e1a",
        gold: "#f59f00",
        orange: "#e8590c",
        orangedark: "#c94c00",
        greenok: "#2b8a3e",
      },
    },
  },
  plugins: [],
};
