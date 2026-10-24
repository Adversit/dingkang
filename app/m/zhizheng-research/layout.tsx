import type { Metadata } from "next";
import "@/modules/zhizheng-research/app/globals.css";
export const metadata: Metadata = { title: "知证 · 论文研究工作台", icons: { icon: "/assets/zhizheng-research/favicon.svg" } };
export default function ModuleLayout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
