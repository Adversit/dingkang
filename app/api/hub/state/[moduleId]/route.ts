import { requireUser, requireMutation, moduleId, readJson, readState, readStateRevision, stateHistory, writeState, json, failure, HubError } from '@/lib/hub/server';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ moduleId: string }> };
export async function GET(req: Request, context: Context) {
  try {
    const owner = requireUser(req).userId, id = moduleId((await context.params).moduleId), query = new URL(req.url).searchParams;
    if (query.get('history') === '1') return json(await stateHistory(owner, id));
    if (query.has('revision')) { const value = query.get('revision')!; if (!/^\d+$/.test(value)) throw new HubError('版本号无效。'); return json(await readStateRevision(owner, id, Number(value))); }
    return json(await readState(owner, id));
  } catch (error) { return failure(error); }
}
export async function PUT(req: Request, context: Context) {
  try { const owner = requireUser(req).userId; requireMutation(req); const id = moduleId((await context.params).moduleId); return json(await writeState(owner, id, await readJson(req))); }
  catch (error) { return failure(error); }
}
