import { moduleById } from '@/lib/hub/catalog';
import {
  requireUser,
  requireMutation,
  moduleId,
  readJson,
  readState,
  readStateRevision,
  stateHistory,
  writeState,
  json,
  failure,
  HubError,
} from '@/lib/hub/server';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ gameId: string }> };

function resolveBridgeGameId(raw: unknown): string {
  if (raw === 'jlu-campus') {
    throw new HubError('吉大校园漫游使用 /api/games/jlu-campus/* 多人接口。', 400);
  }
  const id = moduleId(raw);
  const entry = moduleById(id);
  if (!entry || entry.category !== 'games') {
    throw new HubError('未知游戏模块。', 404);
  }
  return id;
}

export async function GET(req: Request, context: Context) {
  try {
    const owner = requireUser(req).userId;
    const id = resolveBridgeGameId((await context.params).gameId);
    const query = new URL(req.url).searchParams;
    if (query.get('history') === '1') return json(await stateHistory(owner, id));
    if (query.has('revision')) {
      const value = query.get('revision')!;
      if (!/^\d+$/.test(value)) throw new HubError('版本号无效。');
      return json(await readStateRevision(owner, id, Number(value)));
    }
    return json(await readState(owner, id));
  } catch (error) {
    return failure(error);
  }
}

export async function PUT(req: Request, context: Context) {
  try {
    const owner = requireUser(req).userId;
    requireMutation(req);
    const id = resolveBridgeGameId((await context.params).gameId);
    return json(await writeState(owner, id, await readJson(req)));
  } catch (error) {
    return failure(error);
  }
}
