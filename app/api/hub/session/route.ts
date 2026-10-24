import { userFromRequest, json, failure } from '@/lib/hub/server';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  try { const user = userFromRequest(req); return json(user ? { authenticated: true, ...user } : { authenticated: false, userId: null, displayName: null }); }
  catch (error) { return failure(error); }
}
