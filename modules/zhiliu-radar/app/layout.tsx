import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "知流 · 个人信息雷达",
  description: "把注意力留给值得读的事。真实信源、事件聚合、阅读反馈与每日简报。",
  icons: {
    icon: "/assets/zhiliu-radar/favicon.svg",
    shortcut: "/assets/zhiliu-radar/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
