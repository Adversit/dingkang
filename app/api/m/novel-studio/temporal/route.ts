import { HubError, failure, json, readBoundedBody, requireMutation, requireUser } from '@/lib/hub/server';
import { archiveFor } from '@/modules/novel-ai/route-support';
import { projectAsOf, TemporalError } from '@/modules/novel-studio/temporal.mjs';

export const dynamic = 'force-dynamic';

/** Read a conservative projection from the signed-in account's current archive. */
export async function POST(req: Request) {
  try {
    requireMutation(req);
    const user = requireUser(req);
    if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new HubError('请求须使用 JSON。',415);
    const raw=await readBoundedBody(req,8192);
    let input: { projectId?:unknown; asOf?:unknown; perspective?:unknown; characterId?:unknown };
    try { input=JSON.parse(new TextDecoder().decode(raw)); } catch { throw new HubError('请求 JSON 格式错误。',400); }
    if (!input || typeof input !== 'object' || Array.isArray(input) || typeof input.projectId !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(input.projectId) || typeof input.asOf !== 'string' || !['omniscient','limited'].includes(String(input.perspective)) || (input.characterId !== undefined && typeof input.characterId !== 'string')) throw new HubError('查询参数无效。',400);
    const archive=await archiveFor(user.userId);
    const project=archive.state.projects.find((p:{id:string})=>p.id===input.projectId);
    if (!project) throw new HubError('作品不存在。',404);
    const temporal=project.temporal || {transitions:[],knowledge:[],speeches:[]};
    const sourceCurrent=(source:{sceneId:string;revisionId:string;evidence:string})=>{
      const scene=project.scenes.find((s:{id:string})=>s.id===source.sceneId);
      const revision=scene?.revisions?.at(-1);
      return !!revision && revision.id===source.revisionId && scene.title===revision.title && scene.draft===revision.body && typeof source.evidence==='string' && revision.body.includes(source.evidence);
    };
    const result=projectAsOf(temporal,{asOf:input.asOf,perspective:input.perspective,characterId:input.characterId,sourceCurrent});
    return json({...result,archiveVersion:archive.version,canonVersion:project.canonVersion,scope:'current-canon',notice:result.notice+' 本查询使用当前作品档案，不支持历史分支或旧提交回放。'});
  } catch (error) {
    if (error instanceof TemporalError) return json({error:error.message},error.status);
    return failure(error);
  }
}
