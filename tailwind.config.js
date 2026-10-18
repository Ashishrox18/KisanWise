/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Primary: Deep Forest Green ──────────────────
        primary: {
          50:  '#f0f7f4',
          100: '#d8ede4',
          200: '#b1dbca',
          300: '#82c0a8',
          400: '#539f84',
          500: '#357d64',
          600: '#2a6350',
          700: '#1B3A2F',   // ← brand primary
          800: '#162f26',
          900: '#0f211b',
          950: '#081410',
        },
        // ── Accent: Warm Amber / Harvest-Gold ───────────
        accent: {
          50:  '#fdf8ee',
          100: '#f9edce',
          200: '#f3d898',
          300: '#ecbc57',
          400: '#D98C2B',   // ← brand accent
          500: '#c47420',
          600: '#a35818',
          700: '#7e3e16',
          800: '#5d2e14',
          900: '#3a1c0d',
        },
        // ── Neutral: Warm Off-White / Linen ─────────────
        warm: {
          50:  '#FAFAF7',   // ← page background
          100: '#F4F3EF',
          200: '#E8E7E0',
          300: '#D4D2C8',
          400: '#B0AE9F',
          500: '#8A8876',
          600: '#6B6954',
          700: '#504E3C',
          800: '#363428',
          900: '#1E1D15',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs':  ['0.75rem',  { lineHeight: '1.5' }],
        'sm':  ['0.875rem', { lineHeight: '1.5714' }],
        'base':['1rem',     { lineHeight: '1.75' }],
        'lg':  ['1.125rem', { lineHeight: '1.75' }],
        'xl':  ['1.25rem',  { lineHeight: '1.75' }],
        '2xl': ['1.5rem',   { lineHeight: '1.3333' }],
        '3xl': ['1.875rem', { lineHeight: '1.2' }],
        '4xl': ['2.25rem',  { lineHeight: '1.1111' }],
      },
      borderRadius: {
        'sm':  '0.25rem',
        DEFAULT: '0.5rem',
        'md':  '0.625rem',
        'lg':  '0.75rem',
        'xl':  '1rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(27 58 47 / 0.08), 0 1px 2px -1px rgb(27 58 47 / 0.06)',
        'card-hover': '0 4px 12px 0 rgb(27 58 47 / 0.12), 0 2px 4px -2px rgb(27 58 47 / 0.08)',
        'modal': '0 20px 60px -10px rgb(27 58 47 / 0.25)',
      },
      animation: {
        'fade-in':     'fadeIn 0.2s ease-out',
        'slide-up':    'slideUp 0.3s ease-out',
        'pulse-soft':  'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { '0%': { opacity: '0' },             '100%': { opacity: '1' } },
        slideUp:   { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        pulseSoft: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
      },
    },
  },
  plugins: [],
}
