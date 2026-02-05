/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Ubuntu_400Regular'],
        light: ['Ubuntu_300Light'],
        medium: ['Ubuntu_500Medium'],
        bold: ['Ubuntu_700Bold'],
      },
    },
  },
  plugins: [],
}
