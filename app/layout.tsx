import type {Metadata} from 'next';
import './globals.css';
import './kinetic.css';

export const metadata:Metadata={
  title:'丁康的工作空间',
  description:'一个私人空间，四种不同心情。研究、创造、生活与游戏，共享自己的文件和进度。',
};
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="zh-CN"><body>{children}</body></html>;
}
