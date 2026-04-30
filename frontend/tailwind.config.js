/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        primary: '#6366F1',
        'primary-dark': '#534AB7',
        'primary-light': '#EEEDFE',
        'n-bg': '#F5F4FF',
        'n-border': '#E0DEF7',
        'n-surface': '#FFFFFF',
      },
    },
  },
  plugins: [],
}
