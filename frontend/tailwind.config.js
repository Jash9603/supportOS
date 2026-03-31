/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream:   '#F5F0E8',
        ink:     '#0D0D0B',
        amber:   '#C8841A',
        'amber-light': '#E8A020',
        'blue-deep': '#1A3FCC',
        border:  '#D4CFC4',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body:    ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
