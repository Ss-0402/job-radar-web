import type { Config } from "tailwindcss";

/**
 * 视觉系统 v2：中性八阶 + 唯一强调色（信号红）。
 * 全部来自真实产品的测量：Linear 的细线、Geist 的网格、Stripe 的单强调色。
 */
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
          50: "#fafaf9",
          100: "#f4f3f1",
          200: "#edebe7",
          300: "#e2dfda",
          400: "#6e6963", // 辅助文字，5.0:1
          500: "#5c5851",
          600: "#4a4640",
          700: "#3a3731",
          800: "#2a2824",
          900: "#191816",
        },
        accent: {
          50: "#fdf2ef",
          100: "#fae1da",
          300: "#e9a99d",
          500: "#c8321e",
          600: "#a82815",
          700: "#8c2111",
        },
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "\"Segoe UI\"",
          "\"PingFang SC\"",
          "\"Hiragino Sans GB\"",
          "\"Microsoft YaHei\"",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      fontSize: {
        // 11 标签 / 12 辅助 / 13 UI / 15 正文 / 18 小节 / 28 页面标题
        micro: ["11px", { lineHeight: "1.45", letterSpacing: "0.06em" }],
        note: ["12px", { lineHeight: "1.55" }],
        ui: ["13px", { lineHeight: "1.5" }],
        body: ["15px", { lineHeight: "1.75" }],
        sect: ["18px", { lineHeight: "1.35" }],
        page: ["28px", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
      },
      borderRadius: {
        cell: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
