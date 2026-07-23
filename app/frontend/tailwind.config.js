/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0b1326",
        surface: {
          DEFAULT: "rgba(22, 33, 62, 0.7)",
          lighter: "rgba(31, 46, 84, 0.8)",
        },
        accent: {
          blue: "#00d2ff",
          emerald: "#00ff88",
          rose: "#ff4d4d",
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
