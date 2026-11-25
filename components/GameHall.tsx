'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowUpRight, Compass, Gamepad2, Sparkles, Star, Users } from 'lucide-react';
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
  const [filter, setFilter] = useState<'all' | 'multiplayer' | 'cloud' | 'favorites'>('all');

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

  const spotlightGame = recentGames[0] || games[0];

  const visibleGames = games.filter(game => {
    if (filter === 'multiplayer') return game.capabilities.multiplayer;
    if (filter === 'cloud') return !game.capabilities.multiplayer;
    if (filter === 'favorites') return favorites.includes(game.id);
    return true;
  });

  const launchEntry = (entry: GameCatalogEntry) => {
    const found = modules.find(item => item.id === entry.id);
    if (found) onLaunch(found);
  };

  return (
    <section className={styles.hall} aria-label="游戏大厅">
      {/* 顶部导航与筛选栏 */}
      <div className={styles.topToolbar}>
        <div className={styles.titleBlock}>
          {onBack && (
            <button type="button" className="hub-button" onClick={onBack}>
              <ArrowLeft size={17} />
              返回目录
            </button>
          )}
          <div className={styles.titleCopy}>
            <h2>
              <span className={styles.hallIconBadge}>
                <Gamepad2 size={22} />
              </span>
              游戏大厅
            </h2>
            <p className={styles.note}>收录 {games.length} 款互动作品，用于个人探索与云端存档。</p>
          </div>
        </div>

        <div className={styles.filterPills} role="tablist" aria-label="筛选游戏">
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'all'}
            className={filter === 'all' ? styles.filterActive : ''}
            onClick={() => setFilter('all')}
          >
            全部 ({games.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'multiplayer'}
            className={filter === 'multiplayer' ? styles.filterActive : ''}
            onClick={() => setFilter('multiplayer')}
          >
            多人漫游 (1)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'cloud'}
            className={filter === 'cloud' ? styles.filterActive : ''}
            onClick={() => setFilter('cloud')}
          >
            云端存档 ({games.length - 1})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'favorites'}
            className={filter === 'favorites' ? styles.filterActive : ''}
            onClick={() => setFilter('favorites')}
          >
            收藏 ({games.filter(g => favorites.includes(g.id)).length})
          </button>
        </div>
      </div>

      {/* 焦点舞台 Spotlight Banner */}
      {spotlightGame && (
        <div
          className={styles.spotlightBanner}
          style={{ '--game-accent': spotlightGame.color } as CSSProperties}
        >
          {spotlightGame.artwork && (
            <div className={styles.spotlightBackdrop} aria-hidden="true">
              <img
                src={spotlightGame.artwork.src}
                alt=""
                style={{ objectPosition: spotlightGame.artwork.position }}
              />
              <div className={styles.spotlightShade} />
            </div>
          )}
          <div className={styles.spotlightContent}>
            <div className={styles.spotlightTags}>
              <span className={styles.spotlightKicker}>
                <Sparkles size={14} />
                {recentGames.length > 0 ? '继续上次的旅程' : '焦点世界'}
              </span>
              <span className={styles.spotlightCap}>
                {spotlightGame.capabilities.multiplayer ? (
                  <>
                    <Users size={14} /> 多人同行 · HTTP同步
                  </>
                ) : (
                  <>
                    <Compass size={14} /> 账号级云端存档
                  </>
                )}
              </span>
            </div>
            <h3>{spotlightGame.name}</h3>
            <p>{spotlightGame.subtitle} · {spotlightGame.description}</p>
            <div className={styles.spotlightActions}>
              <button
                type="button"
                className={styles.spotlightPrimaryBtn}
                disabled={disabled}
                onClick={() => launchEntry(spotlightGame)}
              >
                <span>立即进入 {spotlightGame.name}</span>
                <ArrowUpRight size={18} />
              </button>
              {recentGames.slice(1, 3).map(game => (
                <button
                  key={game.id}
                  type="button"
                  className={styles.spotlightSecondaryBtn}
                  disabled={disabled}
                  onClick={() => launchEntry(game)}
                >
                  继续 · {game.name}
                  <ArrowUpRight size={15} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 游戏 Bento 矩阵 */}
      <div className={styles.grid}>
        {visibleGames.map(game => {
          const isFav = favorites.includes(game.id);
          return (
            <article
              key={game.id}
              className={styles.card}
              style={{ '--game-accent': game.color } as CSSProperties}
              data-kinetic-interactive="true"
            >
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
                  <span className={styles.floatingCapBadge}>
                    {game.capabilities.multiplayer ? '多人 · HTTP同步' : '云端存档'}
                  </span>
                  <span className={styles.openMark} aria-hidden="true">
                    <ArrowUpRight size={21} />
                  </span>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardTitleRow}>
                    <h3>{game.name}</h3>
                    <span className={styles.subtitlePill}>{game.subtitle}</span>
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
                <Star size={18} fill={isFav ? 'currentColor' : 'none'} />
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
