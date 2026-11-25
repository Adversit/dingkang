'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Gamepad2, Star } from 'lucide-react';
import { modules, type HubModule } from '@/lib/hub/catalog';
import { moduleArtwork } from '@/lib/hub/theme';
import { fetchGamesCatalog, type GameCatalogEntry } from '@/lib/hub/games-client';
import styles from './GameHall.module.css';

type Props = {
  favorites: readonly string[];
  recentIds: readonly string[];
  disabled?: boolean;
  onLaunch: (module: HubModule) => void;
  onToggleFavorite: (id: string) => void;
  onBack?: () => void;
};

const fallbackGames: GameCatalogEntry[] = modules
  .filter(item => item.category === 'games')
  .map(item => ({
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
      storage: item.id === 'jlu-campus' ? 'campus-multiplayer' : 'hub-state',
      multiplayer: item.id === 'jlu-campus',
      httpSync: item.id === 'jlu-campus',
      stateEndpoint: item.id === 'jlu-campus' ? null : `/api/games/${item.id}/state`,
      campusApiPrefix: item.id === 'jlu-campus' ? '/api/games/jlu-campus' : null,
    },
  }));

export default function GameHall({
  favorites,
  recentIds,
  disabled = false,
  onLaunch,
  onToggleFavorite,
  onBack,
}: Props) {
  const [games, setGames] = useState<GameCatalogEntry[]>(fallbackGames);

  useEffect(() => {
    const controller = new AbortController();
    fetchGamesCatalog(controller.signal)
      .then(list => {
        if (list.length > 0) setGames(list);
      })
      .catch(() => {
        /* Fallback catalog metadata already matches catalog.ts */
      });
    return () => controller.abort();
  }, []);

  const recentGames = recentIds
    .map(id => games.find(item => item.id === id))
    .filter((item): item is GameCatalogEntry => Boolean(item));

  const launchEntry = (entry: GameCatalogEntry) => {
    const found = modules.find(item => item.id === entry.id);
    if (found) onLaunch(found);
  };

  return (
    <section className={styles.hall} aria-label="游戏大厅">
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          {onBack && (
            <button type="button" className="hub-button" onClick={onBack}>
              <ArrowLeft size={17} />
              返回目录
            </button>
          )}
          <div>
            <h2>
              <Gamepad2 size={24} />
              游戏大厅
            </h2>
            <p className={styles.note}>收录 {games.length} 款互动作品，用于个人探索与云端存档。</p>
          </div>
        </div>

        {recentGames.length > 0 && (
          <div className={styles.continueRow}>
            <span>继续上次：</span>
            {recentGames.slice(0, 2).map(game => (
              <button
                key={game.id}
                type="button"
                className="hub-button primary"
                disabled={disabled}
                onClick={() => launchEntry(game)}
              >
                {game.name}
                <ArrowUpRight size={16} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={styles.grid}>
        {games.map(game => {
          const isFav = favorites.includes(game.id);
          return (
            <article key={game.id} className={styles.card}>
              <button
                type="button"
                className={styles.launchBtn}
                disabled={disabled}
                onClick={() => launchEntry(game)}
              >
                <div className={styles.artwork}>
                  {game.artwork ? (
                    <img
                      src={game.artwork.src}
                      alt={game.artwork.label}
                      loading="lazy"
                      style={{ objectPosition: game.artwork.position }}
                    />
                  ) : (
                    <div className={styles.artFallback}>
                      <span>{game.name}</span>
                    </div>
                  )}
                  <span className={styles.openMark} aria-hidden="true">
                    <ArrowUpRight size={22} />
                  </span>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardTitleRow}>
                    <h3>{game.name}</h3>
                    <span className={styles.capabilityBadge}>
                      {game.capabilities.multiplayer ? '多人 · HTTP同步' : '云端存档'}
                    </span>
                  </div>
                  <p>{game.description}</p>
                </div>
              </button>
              <button
                type="button"
                className={`${styles.favBtn} ${isFav ? styles.favSelected : ''}`}
                onClick={() => onToggleFavorite(game.id)}
                disabled={disabled}
                aria-label={(isFav ? '取消收藏' : '收藏') + game.name}
                aria-pressed={isFav}
              >
                <Star size={19} fill={isFav ? 'currentColor' : 'none'} />
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
