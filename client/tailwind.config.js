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
          primaryDark: '#127545',
          link: '#0076DF'
        }
      }
    },
    keyframes: {
      'slide-up': {
        '0%': { transform: 'translateY(10px)', opacity: '0' },
        '100%': { transform: 'translateY(0)', opacity: '1' },
      },
      'slide-down': {
        '0%': { transform: 'translate(-50%, -100%)', opacity: '0' },
        '100%': { transform: 'translate(-50%, 0)', opacity: '1' },
      }
    },
    animation: { 'slide-up': 'slide-up 0.3s ease-out', 'slide-down': 'slide-down 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }
  },
  plugins: [],
}