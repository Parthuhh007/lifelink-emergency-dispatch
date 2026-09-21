/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-blue': '#2563eb', // Soft clinical blue
        'brand-teal': '#0d9488', // Muted teal
        'brand-red': '#dc2626', // Emergency red
      }
    },
  },
  plugins: [],
}
