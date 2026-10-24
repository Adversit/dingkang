import type { Metadata } from 'next';
import Game from '@/modules/yunque-sanguo/game/Game';
import ModuleStorageGate from '@/components/ModuleStorageGate';

export const metadata: Metadata = {
  title: '云阙三国 · 群星觉醒',
  description: '原创三国幻想卡牌 RPG，统一账号云存档。',
};

export default function YunquePage() {
  return <>
    <link rel="stylesheet" href="/assets/yunque-sanguo/game.css" />
    <ModuleStorageGate moduleId="yunque-sanguo"><Game /></ModuleStorageGate>
  </>;
}
