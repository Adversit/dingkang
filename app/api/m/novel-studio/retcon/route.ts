import { requireUser, database, json, failure, HubError } from '@/lib/hub/server';
import { readArchive } from '@/modules/novel-studio/server/store.mjs';
import { readRetcon, RetconError } from '@/modules/novel-retcon/branch.mjs';
import { d1ArchiveAdapter } from '@/modules/novel-studio/server/d1-adapter.mjs';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{const user=requireUser(req);const url=new URL(req.url),projectId=url.searchParams.get('projectId'),branchId=url.searchParams.get('branchId');if(!projectId||!branchId)throw new HubError('缺少作品或分支标识。',400);const archive=await readArchive(d1ArchiveAdapter(database()),user.userId);return json({archiveVersion:archive.version,report:readRetcon(archive.state,projectId,branchId)})}catch(error){if(error instanceof RetconError)return json({error:error.message},error.status);return failure(error)}}
