/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          light: '#ffffff',
          dark: '#09090b'
        },
        card: {
          light: '#ffffff',
          dark: '#0c0c0f'
        },
        border: {
          light: '#e4e4e7',
          dark: '#1e1e24'
        }
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      }
    },
  },
  plugins: [],
}
