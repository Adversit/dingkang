import type { Metadata } from "next";
import "@/modules/zhiliu-radar/app/globals.css";
export const metadata: Metadata = { title: "知流 · 个人信息雷达", icons: { icon: "/assets/zhiliu-radar/favicon.svg" } };
export default function ModuleLayout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
