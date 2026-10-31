/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        archive: '#F5F1E8',
        ink: {
          DEFAULT: '#252525',
          secondary: '#65635F',
        },
        burgundy: '#783E48',
        'research-blue': '#476B87',
        'evidence-green': '#66846B',
        highlight: '#E9C968',
        divider: '#D9D2C6',
        paper: '#FFFEFA',
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'Times New Roman', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
};
