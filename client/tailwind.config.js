/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pet: {
          dark: '#08061D',
          accent: '#4d7298',
          light: '#ece1d1',
          primary: '#0d945c',
          primaryDark: '#127545'
        }
      }
    },
  },
  plugins: [],
}