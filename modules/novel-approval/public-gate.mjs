/** The public canon endpoint must never accept an unreviewed fact commit. */
import { NovelError } from '../novel-studio/server/domain.mjs';
export function requireGuardedFactCommit(request){
  if(request&&typeof request==='object'&&request.command&&typeof request.command==='object'&&['commit_fact','add_temporal_transition','add_temporal_knowledge','add_temporal_speech','retcon_merge'].includes(request.command.type))throw new NovelError('正式变更已升级：请在新版工作台准备审阅、确认报告后再提交。原草稿与待审记录仍然保留。',409);
}
