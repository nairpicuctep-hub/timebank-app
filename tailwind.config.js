/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        amber:   '#F0A830',
        coral:   '#E85030',
        rose:    '#D03878',
        mint:    '#1ED8A0',
        sand:    '#F5EDD8',
        ink:     '#0c0906',
        surface: '#141210',
        surface2:'#1c1917',
        surface3:'#242018',
        muted:   '#9a8f82',
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'serif'],
        sans:    ['Instrument Sans', 'sans-serif'],
        mono:    ['DM Mono', 'monospace'],
      },
      backgroundImage: {
        'tb-grad': 'linear-gradient(135deg, #F0A830, #E85030, #D03878)',
        'tb-grad-r': 'linear-gradient(135deg, #D03878, #E85030, #F0A830)',
      },
      animation: {
        'spin-slow': 'spin 8s linear infinite',
        'spin-slow-rev': 'spin 8s linear infinite reverse',
        'fade-up': 'fadeUp 0.6s ease forwards',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%,100%': { opacity: '0.8' },
          '50%':     { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
