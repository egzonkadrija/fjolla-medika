/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./admin.html",
    "./js/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#09111f",
        mist: "#edf6f1",
        forest: "#0f5d44",
        pine: "#0a3d30",
        sage: "#9dd7bf",
        line: "rgba(148, 163, 184, 0.22)"
      },
      fontFamily: {
        sans: ["Manrope", "sans-serif"],
        display: ["Sora", "sans-serif"]
      },
      boxShadow: {
        glow: "0 32px 80px rgba(9, 17, 31, 0.22)"
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
};
