const channel = (name) => `rgb(var(--${name}-rgb) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // One type scale for the whole app: use these, not one-off pixel sizes.
      fontSize: {
        display: ['2.5rem', { lineHeight: '1.05', letterSpacing: '-0.03em', fontWeight: '700' }],
        title: ['2rem', { lineHeight: '1.15', letterSpacing: '-0.025em', fontWeight: '700' }],
        heading: ['1.0625rem', { lineHeight: '1.4', letterSpacing: '-0.01em', fontWeight: '600' }],
        body: ['0.875rem', { lineHeight: '1.5' }],
        caption: ['0.75rem', { lineHeight: '1.4' }],
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', 'system-ui', 'sans-serif'],
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
        red: { 400: '#FF6961', 500: '#FF3B30', 600: '#D70015' },
        green: { 400: '#30D158', 500: '#34C759', 600: '#248A3D' },
        amber: { 400: '#FFB340', 500: '#FF9500', 600: '#C93400' },
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        lift: 'var(--shadow-lift)',
      },
      borderRadius: {
        xl: '12px',
        '2xl': '18px',
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
