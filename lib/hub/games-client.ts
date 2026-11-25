import type { ModuleCategory } from './catalog';

export type GameCapabilities = {
  storage: 'hub-state' | 'campus-multiplayer';
  multiplayer: boolean;
  httpSync: boolean;
  stateEndpoint: string | null;
  campusApiPrefix: string | null;
};

export type GameCatalogEntry = {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  category: ModuleCategory;
  path: string;
  icon: string;
  color: string;
  artwork: { src: string; position?: string; label: string } | null;
  capabilities: GameCapabilities;
};

export type GameStatePayload = {
  values: Record<string, string>;
  revision: number;
  updatedAt: string | null;
};

export async function fetchGamesCatalog(signal?: AbortSignal): Promise<GameCatalogEntry[]> {
  const response = await fetch('/api/games', { cache: 'no-store', signal });
  if (!response.ok) throw new Error('暂时无法加载游戏大厅目录。');
  const data = (await response.json()) as { games?: GameCatalogEntry[] };
  return Array.isArray(data.games) ? data.games : [];
}

export async function fetchGameState(gameId: string, userId?: string): Promise<GameStatePayload> {
  const headers: Record<string, string> = {};
  if (userId) headers['X-Hub-User-Id'] = userId;
  const response = await fetch(`/api/games/${encodeURIComponent(gameId)}/state`, {
    cache: 'no-store',
    headers,
  });
  if (!response.ok) throw new Error('暂时无法读取游戏存档。');
  return (await response.json()) as GameStatePayload;
}

export async function saveGameState(
  gameId: string,
  payload: { values: Record<string, string>; expectedRevision: number },
  userId?: string,
): Promise<GameStatePayload> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (userId) headers['X-Hub-User-Id'] = userId;
  const response = await fetch(`/api/games/${encodeURIComponent(gameId)}/state`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(response.status === 409 ? '游戏存档已有更新，请刷新后重试。' : '保存游戏存档失败。');
  return (await response.json()) as GameStatePayload;
}
