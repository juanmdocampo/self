/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta extraída del logo SELF
        cream:         '#EEDCCA',  // fondo principal
        'card-bg':     '#E3CCB4',  // fondos secundarios / cards
        'warm-border': '#D2BBA3',  // bordes y separadores
        'warm-mid':    '#ACA093',  // texto secundario
        'warm-dark':   '#34322E',  // texto principal / logo
        // Acento (se mantiene para badges y tags)
        sage:          '#8BAF8E',
        'sage-dark':   '#5C7A5F',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans:  ['"DM Sans"', 'sans-serif'],
      },
      boxShadow: {
        card:       '0 20px 60px rgba(52,50,46,0.10)',
        'card-hover':'0 30px 80px rgba(52,50,46,0.15)',
        modal:      '0 30px 80px rgba(52,50,46,0.18)',
      },
    },
  },
  plugins: [],
}
