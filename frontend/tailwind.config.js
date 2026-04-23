/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#F5F0E8',
        sage: '#8BAF8E',
        'sage-dark': '#5C7A5F',
        blush: '#E8A598',
        'warm-dark': '#2C2416',
        'warm-mid': '#6B5B47',
        'card-bg': '#FFFDF9',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans: ['"DM Sans"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 20px 60px rgba(44,36,22,0.12)',
        'card-hover': '0 30px 80px rgba(44,36,22,0.18)',
        modal: '0 30px 80px rgba(44,36,22,0.2)',
      },
    },
  },
  plugins: [],
}
