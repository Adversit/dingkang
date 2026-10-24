import { requireUser, requireMutation, moduleId, readJson, writeState, json, failure } from '@/lib/hub/server';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  try { const owner = requireUser(req).userId; requireMutation(req); const body = await readJson(req); return json(await writeState(owner, moduleId(body.moduleId), body)); }
  catch (error) { return failure(error); }
}
