/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#27272a',
          dark: '#18181b',
          light: '#3f3f46'
        },
        accent: {
          DEFAULT: '#10b981',
          hover: '#059669'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace']
      }
    }
  },
  plugins: []
}
