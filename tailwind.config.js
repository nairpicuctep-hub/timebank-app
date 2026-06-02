/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Brand gradient stops
        amber: '#F0A830',
        coral: '#E85030',
        rose:  '#D03878',
        mint:  '#15a06e',

        // Warm cream surfaces
        cream:   '#fdf4ec',
        'cream-1': '#fef6f0',
        'cream-2': '#fff5ed',
        'cream-3': '#fff0f0',

        // Ink + text (warm, never pure black)
        ink:   '#2b1c14',
        text:  '#3a2a20',
        muted: '#8a7565',
        faint: '#b7a596',
      },
      fontFamily: {
        display: ['Bricolage Grotesque', 'system-ui', 'sans-serif'],
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['DM Mono', 'ui-monospace', 'monospace'],
      },
      backgroundImage: {
        'tb-grad':   'linear-gradient(135deg, #F0A830, #E85030, #D03878)',
        'tb-grad-r': 'linear-gradient(135deg, #D03878, #E85030, #F0A830)',
      },
      borderRadius: {
        card: '22px',
        btn:  '13px',
        pill: '100px',
      },
      boxShadow: {
        card: '0 10px 30px -16px rgba(120, 60, 20, 0.25)',
        grad: '0 18px 40px -18px rgba(234, 88, 12, 0.55)',
        btn:  '0 6px 16px -4px rgba(234, 88, 12, 0.45)',
      },
      animation: {
        'rise':       'rise 0.6s cubic-bezier(0.2,0.7,0.2,1) both',
        'tc-pop':     'tcPop 0.5s ease',
        'spin-slow':  'spin 8s linear infinite',
      },
      keyframes: {
        rise: {
          '0%':   { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        tcPop: {
          '0%':   { transform: 'scale(1)' },
          '35%':  { transform: 'scale(1.18)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
