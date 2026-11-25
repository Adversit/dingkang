import { modules } from '@/lib/hub/catalog';
import { moduleArtwork } from '@/lib/hub/theme';
import { json } from '@/lib/hub/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const games = modules
    .filter(item => item.category === 'games')
    .map(item => {
      const isCampus = item.id === 'jlu-campus';
      return {
        id: item.id,
        name: item.name,
        subtitle: item.subtitle,
        description: item.description,
        category: item.category,
        path: item.path,
        icon: item.icon,
        color: item.color,
        artwork: moduleArtwork[item.id] ?? null,
        capabilities: {
          storage: isCampus ? 'campus-multiplayer' : 'hub-state',
          multiplayer: isCampus,
          httpSync: isCampus,
          stateEndpoint: isCampus ? null : `/api/games/${item.id}/state`,
          campusApiPrefix: isCampus ? '/api/games/jlu-campus' : null,
        },
      };
    });
  return json({ games });
}
