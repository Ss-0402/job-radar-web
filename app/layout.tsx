import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "岗位雷达",
  description: "贴一段 JD，30 秒看清你够不够格、还缺哪几项。",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
