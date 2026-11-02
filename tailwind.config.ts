import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f7f7f8",
          100: "#ececef",
          200: "#d9d9df",
          400: "#8f8f9d",
          600: "#5a5a68",
          800: "#2c2c36",
          900: "#17171d",
        },
        accent: {
          500: "#e8590c",
          600: "#d9480f",
        },
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "\"Segoe UI\"",
          "\"PingFang SC\"",
          "\"Microsoft YaHei\"",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
