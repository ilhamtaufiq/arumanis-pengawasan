/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#fff7e6',
        foreground: '#111111',
        main: '#ffcc00',
        secondary: '#ff6b6b',
        accent: '#4ade80',
        info: '#38bdf8',
        danger: '#ff3b30',
        muted: '#f4f4f5',
        card: '#ffffff',
        border: '#111111',
      },
      borderRadius: {
        neo: '6px',
      },
      boxShadow: {
        neo: '4px 4px 0 #111111',
        'neo-sm': '2px 2px 0 #111111',
        'neo-lg': '6px 6px 0 #111111',
      },
    },
  },
  plugins: [],
}