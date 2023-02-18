const colors = require('tailwindcss/colors')
module.exports = {
  purge: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  darkMode: false, // or 'media' or 'class'
  theme: {
    colors: {
      ...colors,
      primary: '#00bfff',
      secondary: '#7289da',
      yellow: '#ff0',
      yellow_dark: '#f6e533',
      text_primary: '#3d006f',
      btn_primary: '#fd6d6f',
      icon: '#581557'
    },
    extend: {},
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
