import { requireUser, requireMutation, listFiles, uploadFile, json, failure } from '@/lib/hub/server';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  try { const owner = requireUser(req).userId; return json(await listFiles(owner, new URL(req.url).searchParams.get('moduleId') ?? undefined)); }
  catch (error) { return failure(error); }
}
export async function POST(req: Request) {
  try { const owner = requireUser(req).userId; requireMutation(req); return json({ file: await uploadFile(req, owner) }, 201); }
  catch (error) { return failure(error); }
}
