import { requireUser, requireMutation, downloadFile, deleteFile, json, failure } from '@/lib/hub/server';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };
export async function GET(req: Request, context: Context) {
  try { return await downloadFile(requireUser(req).userId, (await context.params).id); }
  catch (error) { return failure(error); }
}
export async function DELETE(req: Request, context: Context) {
  try { const owner = requireUser(req).userId; requireMutation(req); await deleteFile(owner, (await context.params).id); return json({ ok: true }); }
  catch (error) { return failure(error); }
}
