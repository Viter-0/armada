/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dim"]'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [require("@tailwindcss/typography"), require("daisyui")],
  daisyui: {
    themes: ["dark",
      {
        dim: {
          ...require("daisyui/src/theming/themes")["dim"],
          // Primary color
          "--p": "65.69% 0.196 275.75",
          '.text-orange': {
            "color": "rgb(251 146 60)"
          },
          '.text-blue': {
            "color": "rgb(85, 175, 255)"
          }
        },
        light: {
          ...require("daisyui/src/theming/themes")["light"],
          // Secondary color
          "--s": "45.74% 0.1218 251",
          '.text-orange': {
            "color": "rgb(179, 85, 8)"
          },
          '.text-blue': {
            "color": "rgb(19, 89, 152)"
          }
        },
      },
    ],
  },
}
