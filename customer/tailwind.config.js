// tailwind.config.js
module.exports = {
    theme: {
      extend: {
        keyframes: {
          marquee: {
            "0%": { transform: "translateX(0%)" },
            "100%": { transform: "translateX(-50%)" }, // moves left by half since you duplicated images
          },
        },
        animation: {
          marquee: "marquee 20s linear infinite",
        },
      },
    },
    plugins: [],
  };
  