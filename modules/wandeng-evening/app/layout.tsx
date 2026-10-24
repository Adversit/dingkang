import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata={title:'晚灯 · 数字陪伴',description:'原创二维数字角色、自然表情和夜间陪伴空间。聊聊今天，留下一页，记住什么由你决定。',icons:{icon:'/assets/wandeng-evening/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>;}
