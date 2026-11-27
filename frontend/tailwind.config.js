/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#0F2440',
          'navy-dark': '#09172A',
          'navy-light': '#1E3A5F',
          'navy-soft': '#F0F4F8',
          gold: '#B0843B',
          'gold-hover': '#936B2C',
          'gold-soft': '#FBF8F1',
          terracotta: '#0F2440',
          'terracotta-hover': '#09172A',
          ochre: '#B0843B',
          stone: '#F6F7F9',
          sand: '#EEF0F4',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', '"Inter"', 'system-ui', 'sans-serif'],
        serif: ['"Plus Jakarta Sans"', '"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 36, 64, 0.04), 0 4px 14px rgba(15, 36, 64, 0.03)',
        'card-hover': '0 4px 12px rgba(15, 36, 64, 0.06), 0 12px 28px rgba(15, 36, 64, 0.05)',
        soft: '0 1px 3px rgba(15, 36, 64, 0.05)',
      },
    },
  },
  plugins: [],
};
