/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mimo: {
          coral:   '#FF5C6C',
          coralDark: '#FF3B4E',
          teal:    '#3ECFB2',
          tealDark: '#1FA88E',
          sol:     '#FFB830',
          solDark: '#C98800',
          violeta: '#9B6DFF',
          noche:   '#1A1A2E',
          nocheAlt: '#2D2B55',
          warm:    '#FFF6F0',
          muted:   '#F0EBE8',
          ink:     '#4A4A5A',
          quiet:   '#9B8F8A',
        },
        pet: {
          dark: '#08061D',
          accent: '#4d7298',
          light: '#F5F5F7',
          primary: '#FF5C6C',
          primaryDark: '#FF3B4E',
          link: '#0076DF'
        }
      },
      fontFamily: {
        display: ["'Nunito'", 'system-ui', 'sans-serif'],
        sans:    ["'DM Sans'", "'Nunito'", 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        mimo: '0 4px 24px rgba(255, 92, 108, 0.12)',
        card: '0 2px 12px rgba(0, 0, 0, 0.05)',
      },
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
