/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bgLight: '#F6F6FB',
          panelLight: '#EEEDFB',
          cardLight: '#FFFFFF',
          borderLight: '#E4E4EE',
          textLight: '#14141F',
          textMutedLight: '#6B6B80',
          primary: '#5B4EF0',
          primaryHover: '#4B3FE0',
          badgePosBg: '#DCFCE7',
          badgePosText: '#15803D',

          bgDark: '#0D0D14',
          panelDark: '#16161F',
          cardDark: '#1A1A24',
          borderDark: '#2A2A38',
          textDark: '#E8E8F0',
          textMutedDark: '#9A9AB0',
          primaryDark: '#8277FF',

          navLight: '#0B0B0F',
          navDark: '#11111A',
          navPill: '#2A2A33',
        },
        segment: {
          premiumLight: '#2563EB',
          familyLight: '#10B981',
          economyLight: '#F59E0B',
          premiumDark: '#60A5FA',
          familyDark: '#34D399',
          economyDark: '#FBBF24',
        },
        primary: {
          DEFAULT: '#5B4EF0',
          hover: '#4B3FE0',
          light: '#EEEDFB',
          dark: '#8277FF',
        },
      },
      borderRadius: {
        'card': '14px',
        'btn': '10px',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        mono: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.02)',
        'card': '0 4px 16px -2px rgba(20, 20, 31, 0.05), 0 2px 6px -1px rgba(20, 20, 31, 0.03)',
        'card-dark': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
        'card-hover': '0 12px 28px -4px rgba(20, 20, 31, 0.08), 0 4px 8px -2px rgba(20, 20, 31, 0.04)',
      },
    },
  },
  plugins: [],
};
