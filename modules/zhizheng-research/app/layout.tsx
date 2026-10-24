import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'知证 · 论文研究工作台',description:'辅助论文阅读、实验复刻、信息汇总、知识图谱与可探索方向生成。',icons:{icon:'/assets/zhizheng-research/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>}
