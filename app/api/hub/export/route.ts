import { requireUser, exportStates, failure } from '@/lib/hub/server';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  try { return await exportStates(requireUser(req).userId); }
  catch (error) { return failure(error); }
}
