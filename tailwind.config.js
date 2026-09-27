/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: { fontFamily: { sans: ["Poppins", "system-ui", "sans-serif"] }, colors: { ink: "#0b0d1a", panel: "rgb(14 17 36 / <alpha-value>)", accent: "#a855f7", mint: "#a3e635", sky: "#67e8f9" } } },
  plugins: [],
};
