import { requireUser, database, bucket, json, failure } from '@/lib/hub/server';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  try {
    const owner = requireUser(req).userId;
    const checks = await Promise.allSettled([
      database().prepare('SELECT 1 AS ready FROM hub_states LIMIT 1').all(),
      bucket().head(`hub/${encodeURIComponent(owner)}/.health-check`),
    ]);
    const databaseReady = checks[0].status === 'fulfilled', storageReady = checks[1].status === 'fulfilled';
    return json({ ok: databaseReady && storageReady, database: databaseReady ? 'ready' : 'unavailable', storage: storageReady ? 'ready' : 'unavailable' }, databaseReady && storageReady ? 200 : 503);
  } catch (error) { return failure(error); }
}
