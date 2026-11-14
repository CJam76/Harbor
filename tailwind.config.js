/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        'none': '0px',
        'sm': '1px',
        DEFAULT: '2px',
        'md': '3px',
        'lg': '3px',
      },
      colors: {
        harbor: {
          50: '#f0f5fa',
          100: '#e1ecf5',
          200: '#c5daf0',
          300: '#9ec1e6',
          400: '#6ea3d9',
          500: '#4683cb',
          600: '#2f68b3',
          700: '#235293',
          800: '#1d4377',
          900: '#193963',
          950: '#0e223d',
        },
        navy: {
          800: '#101a2e',
          900: '#0b1220',
          950: '#070b14',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['Charter', 'Georgia', 'Cambria', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'Cascadia Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(10, 15, 29, 0.05)',
        'paper': '0 1px 3px 0 rgba(15, 23, 42, 0.08), 0 4px 12px 0 rgba(15, 23, 42, 0.03)',
        'glass': '0 8px 32px 0 rgba(10, 15, 29, 0.12)',
        'tactile': '0 1px 1px 0 rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)',
      },
    },
  },
  plugins: [],
}
