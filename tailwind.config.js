module.exports = {
  content: ["./src/**/*.{html,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#fafd1e",
      },
    },
  },
  variants: {
    extend: {
      backgroundColor: ["hover"],
      textColor: ["hover"],
      boxShadow: ["hover"],
    },
  },
  keyframes: {
    "move-dash": {
      "0%": { backgroundPosition: "0 0" },
      "100%": { backgroundPosition: "20px 20px" },
    },
  },
  animation: {
    "move-dash": "move-dash 1s linear infinite",
  },
  plugins: [],
};
