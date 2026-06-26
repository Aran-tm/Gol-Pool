/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        pitch: "#0b6e4f",
        grass: "#13a06e",
        ink: "#0a0a0f",
        gold: "#ffd166",
      },
    },
  },
  plugins: [],
};
