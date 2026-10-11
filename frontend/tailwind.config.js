/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        spice: {
          dark: '#0a0d14',
          panel: '#111726',
          border: '#1f293d',
          accent: '#06b6d4',
          amber: '#f59e0b',
          emerald: '#10b981',
          rose: '#f43f5e',
        }
      }
    },
  },
  plugins: [],
}
