const channel = (name) => `rgb(var(--${name}-rgb) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: channel('bg'),
        sidebar: channel('sidebar'),
        surface: channel('surface'),
        primary: channel('text'),
        secondary: channel('muted'),
        accent: channel('accent'),
        border: channel('border'),
        // A calmer pair than the stock red/green, used for money going out and in.
        red: { 400: '#FB7185', 500: '#E5484D', 600: '#CE2C31' },
        green: { 400: '#4ADE80', 500: '#30A46C', 600: '#218358' },
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        lift: 'var(--shadow-lift)',
      },
      borderRadius: {
        xl: '14px',
        '2xl': '20px',
      },
      keyframes: {
        rise: { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        rise: 'rise 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
};
