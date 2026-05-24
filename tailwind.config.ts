import { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Cozy Arcade palette (cf spec Section 6.2)
        primary: {
          50: '#FEEDEE',
          500: '#E63946',
          600: '#C62A38',
          700: '#A41E2A',
        },
        secondary: {
          500: '#2A9D8F',
          700: '#1F756B',
        },
        accent: {
          500: '#FFCB05',
          700: '#A87E00',
        },
        sky: {
          500: '#6BBFE2',
          700: '#2E6E91',
        },
        success: '#2D9D5F',
        warning: '#E68A1C',
        error: '#D6362B',
        info: '#3F76D6',
        cream: '#FFF8EC',
        surface: '#FFFFFF',
        'surface-alt': '#FCEFD5',
        'text-primary': '#0F1A2E',
        'text-secondary': '#5E6779',
        'text-disabled': '#A8B0BD',
        border: '#0F1A2E',
        // Dark mode tokens
        'dark-primary': '#FF6B7A',
        'dark-bg': '#0F1421',
        'dark-surface': '#1A2236',
        'dark-text-primary': '#F5F1E8',
        'dark-border': '#000000',
      },
      fontFamily: {
        // Cf spec Section 6.4
        pixel: ['PressStart2P-Regular'],
        heading: ['Fredoka-SemiBold'],
        'heading-bold': ['Fredoka-Bold'],
        body: ['Nunito-Regular'],
        'body-medium': ['Nunito-Medium'],
        'body-semibold': ['Nunito-SemiBold'],
        'body-bold': ['Nunito-Bold'],
      },
      fontSize: {
        // Cf spec Section 6.4 type scale
        pixel: ['12px', { lineHeight: '16px' }],
        caption: ['12px', { lineHeight: '16px' }],
        small: ['14px', { lineHeight: '20px' }],
        body: ['16px', { lineHeight: '24px' }],
        lead: ['18px', { lineHeight: '28px' }],
        h4: ['18px', { lineHeight: '24px' }],
        h3: ['20px', { lineHeight: '28px' }],
        h2: ['24px', { lineHeight: '32px' }],
        h1: ['28px', { lineHeight: '36px' }],
        'display-lg': ['32px', { lineHeight: '40px' }],
        'display-xl': ['40px', { lineHeight: '48px' }],
      },
      borderWidth: {
        DEFAULT: '1px',
        pixel: '3px',
        'pixel-lg': '4px',
      },
      borderRadius: {
        none: '0',
        sm: '2px',
        DEFAULT: '4px',
        md: '6px',
        lg: '8px',
        full: '9999px',
      },
    },
  },
  plugins: [],
} satisfies Config;
