import { getChatGPTUser } from '@/app/chatgpt-auth';
import { shanghaiDate } from '@/modules/zhiliu-radar/lib/domain';
import { initializeSources,importSourceCatalog,ingest,run,rows,one } from '@/modules/zhiliu-radar/lib/server';
export const dynamic='force-dynamic';
// Shared source operations remain owner-private in the unified Site. Every
// request must also have a platform-authenticated visitor; a bypass/service
// bearer without a visitor identity does not authorize access.
export async function POST(req:Request){
 try{if(!await getChatGPTUser())return Response.json({error:'请使用 ChatGPT 登录'},{status:401});const origin=req.headers.get('origin');if(!origin||origin!==new URL(req.url).origin)return Response.json({error:'请求来源不匹配'},{status:403});const body:any=await req.json();
  if(body.action==='update'){await initializeSources();if(body.cycleId&&(typeof body.cycleId!=='string'||body.cycleId.length>100))throw new Error('无效采集轮次');return Response.json(await ingest('后台更新',undefined,body.cycleId))}
  if(body.action==='catalog-import')return Response.json(await importSourceCatalog());
  if(body.action==='status'){const [sources,counts,runs,setting]=await Promise.all([rows('SELECT * FROM zhiliu_radar__sources ORDER BY created_at'),one('SELECT (SELECT count(*) FROM zhiliu_radar__items) AS items,(SELECT count(DISTINCT event_id) FROM zhiliu_radar__item_event_links) AS events,(SELECT count(*) FROM zhiliu_radar__items i WHERE NOT EXISTS (SELECT 1 FROM zhiliu_radar__item_event_links l WHERE l.item_id=i.id)) AS pending'),rows('SELECT * FROM zhiliu_radar__ingestion_runs ORDER BY started_at DESC LIMIT 3'),one('SELECT value FROM zhiliu_radar__site_settings WHERE key=?','schedule')]);return Response.json({sources,counts,runs,today:shanghaiDate(),schedule:setting?JSON.parse(setting.value):{connected:false,label:'未接入 · 支持手动采集'}})}
  if(body.action==='schedule-status'){if(typeof body.label!=='string'||body.label.length>180||typeof body.connected!=='boolean')throw new Error('无效状态');await run('INSERT INTO zhiliu_radar__site_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value','schedule',JSON.stringify({connected:body.connected,label:body.label}));return Response.json({ok:true})}
  return Response.json({error:'未知操作'},{status:400});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'更新失败'},{status:400})}
}
