import { getChatGPTUser } from '../../chatgpt-auth';
import { z } from 'zod';
import { CATEGORIES,FEEDBACK,dateRange,digestMarkdown,normalizeUrl,type Event } from '@/modules/zhiliu-radar/lib/domain';
import { ALLOWED_HOSTS,assertPublicUrl,collectSource } from '@/modules/zhiliu-radar/lib/ingest';
import { database,rows,one,run,now,uid,snapshot,initializeSources,importSourceCatalog,ingest,summarize } from '@/modules/zhiliu-radar/lib/server';
export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(){try{const user=await getChatGPTUser();if(!user)return json({error:'请使用 ChatGPT 登录后读取私人空间'},401);return json({...await snapshot(user?.userId||null),user:user?{name:user.displayName}:null,allowedHosts:ALLOWED_HOSTS})}catch(e){return json({error:e instanceof Error?e.message:'读取失败'},500)}}
const id=z.string().min(1).max(100);
const sourceSchema=z.object({name:z.string().trim().min(1).max(80),url:z.string().url().max(2000),kind:z.enum(['rss','json','url']),category:z.enum(CATEGORIES),quality:z.number().int().min(10).max(30),official:z.boolean()});
export async function POST(req:Request){
 try {
  const origin=req.headers.get('origin');if(!origin||origin!==new URL(req.url).origin)return json({error:'请求来源不匹配'},403);
  const user=await getChatGPTUser();if(!user)return json({error:'请使用 ChatGPT 登录后保存与操作',signIn:'/signin-with-chatgpt?return_to=%2Fm%2Fzhiliu-radar'},401);
  if(Number(req.headers.get('content-length')||0)>50000)return json({error:'请求过大'},413);const text=await req.text();if(text.length>50000)return json({error:'请求过大'},413);
  const body=JSON.parse(text);const action=z.string().max(40).parse(body.action);const requestId=z.string().regex(/^[a-zA-Z0-9_-]{12,80}$/).parse(body.requestId);const key=user.userId+':'+action+':'+requestId;
  await run("DELETE FROM zhiliu_radar__idempotency WHERE key=? AND response='pending' AND created_at<?",key,new Date(Date.now()-600000).toISOString());const existing=await one('SELECT response FROM zhiliu_radar__idempotency WHERE key=?',key);if(existing){if(existing.response==='pending')return json({error:'相同操作正在处理，请稍后刷新'},409);return json(JSON.parse(existing.response))}
  const claim=await run('INSERT OR IGNORE INTO zhiliu_radar__idempotency (key,response,created_at) VALUES (?,\'pending\',?)',key,now());if(!claim.meta.changes)return json({error:'相同操作正在处理'},409);
  try{
   let result:any={ok:true};
   if(action==='initialize'){await initializeSources();result=await ingest()}
   else if(action==='ingest')result=await ingest('手动采集',body.sourceId?id.parse(body.sourceId):undefined,body.cycleId?id.parse(body.cycleId):undefined);
   else if(action==='source-import-aihot')result=await importSourceCatalog();
   else if(action==='source-add'||action==='source-test'){
    const data=sourceSchema.parse(body.source);assertPublicUrl(data.url,ALLOWED_HOSTS);
    if(action==='source-test'){const fetched=await collectSource({...data,id:'test',official:Number(data.official),enabled:1,failures:0},false);result={ok:true,count:fetched.entries.length,samples:fetched.entries.slice(0,3),attempts:fetched.attempts}}
    else{const count=await one('SELECT count(*) n FROM zhiliu_radar__sources');if(count.n>=1000)throw new Error('最多保存 1000 个来源');const sourceId=uid();await run('INSERT INTO zhiliu_radar__sources (id,name,url,kind,category,quality,official,enabled,created_at) VALUES (?,?,?,?,?,?,?,1,?)',sourceId,data.name,normalizeUrl(data.url),data.kind,data.category,data.quality,Number(data.official),now());result={ok:true,id:sourceId}}
   }
   else if(action==='source-toggle'){await run('UPDATE zhiliu_radar__sources SET enabled=? WHERE id=?',z.boolean().parse(body.enabled)?1:0,id.parse(body.id))}
   else if(action==='feedback'){
    const eventId=id.parse(body.id),kind=z.enum(FEEDBACK).parse(body.kind),active=z.boolean().parse(body.active);if(!await one('SELECT id FROM zhiliu_radar__events WHERE id=?',eventId))throw new Error('事件不存在');
    if(active){if(['useful','irrelevant'].includes(kind))await run('DELETE FROM zhiliu_radar__reading_feedback WHERE owner=? AND event_id=? AND kind=?',user.userId,eventId,kind==='useful'?'irrelevant':'useful');await run('INSERT OR IGNORE INTO zhiliu_radar__reading_feedback (owner,event_id,kind,created_at) VALUES (?,?,?,?)',user.userId,eventId,kind,now())}else await run('DELETE FROM zhiliu_radar__reading_feedback WHERE owner=? AND event_id=? AND kind=?',user.userId,eventId,kind);
   }
   else if(action==='preferences'){
    const prefs=z.object({weights:z.record(z.number().int().min(0).max(5)),keywords:z.string().max(400),minutes:z.number().int().min(5).max(30)}).parse(body.prefs);for(const c of CATEGORIES)if(prefs.weights[c]===undefined)throw new Error('缺少主题权重');
    await run('INSERT INTO zhiliu_radar__user_preferences (owner,value,updated_at) VALUES (?,?,?) ON CONFLICT(owner) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at',user.userId,JSON.stringify(prefs),now());
   }
   else if(action==='event-edit'){
    const data=z.object({id,title:z.string().min(1).max(220),summary:z.string().max(800),category:z.enum(CATEGORIES)}).parse(body);
    await run('UPDATE zhiliu_radar__events SET manual_title=?,manual_summary=?,category=?,locked=1 WHERE id=?',data.title,data.summary||null,data.category,data.id);
   }
   else if(action==='event-merge'){
    const from=id.parse(body.from),to=id.parse(body.to);if(from===to)throw new Error('不能合并到自身');for(const e of [from,to])if(!await one('SELECT id FROM zhiliu_radar__events WHERE id=?',e))throw new Error('事件不存在');
    await database().batch([database().prepare('UPDATE zhiliu_radar__item_event_links SET event_id=?,manual=1,relation=? WHERE event_id=?').bind(to,'人工合并',from),database().prepare('UPDATE zhiliu_radar__events SET locked=1,updated_at=? WHERE id=?').bind(now(),to)]);
   }
   else if(action==='event-split'){
    const itemId=id.parse(body.itemId),item=await one('SELECT i.*,l.event_id FROM zhiliu_radar__items i JOIN zhiliu_radar__item_event_links l ON l.item_id=i.id WHERE i.id=?',itemId);if(!item)throw new Error('条目不存在');
    const eventId=requestId;await database().batch([database().prepare('INSERT OR IGNORE INTO zhiliu_radar__events (id,title,category,locked,created_at,updated_at) VALUES (?,?,?,1,?,?)').bind(eventId,item.title,item.category,now(),now()),database().prepare('UPDATE zhiliu_radar__item_event_links SET event_id=?,manual=1,relation=? WHERE item_id=?').bind(eventId,'人工拆分',itemId),database().prepare('UPDATE zhiliu_radar__events SET locked=1 WHERE id=?').bind(item.event_id)]);result={ok:true,id:eventId};
   }
   else if(action==='job-edit'){
    const data=z.object({itemId:id,company:z.string().max(120),city:z.string().max(80),position:z.string().max(220),type:z.string().max(80),deadline:z.string().max(80),applyUrl:z.string().url().max(2000),status:z.string().max(120)}).parse(body);assertPublicUrl(data.applyUrl);const {itemId,...job}=data;
    await run('UPDATE zhiliu_radar__items SET job_override=? WHERE id=?',JSON.stringify({...job,verifiedBy:'用户人工核实',verifiedAt:now()}),itemId);
   }
   else if(action==='digest-create'){
    const day=z.string().parse(body.date),count=z.number().int().min(3).max(20).parse(body.count);const [start,end]=dateRange(day);const snap=await snapshot(user.userId);
    const selected=snap.events.filter(e=>e.latest&&e.latest>=start&&e.latest<end&&!e.feedback.includes('irrelevant')&&!e.feedback.includes('error')).slice(0,count);const digestId=requestId;
    await run('INSERT OR IGNORE INTO zhiliu_radar__digests (id,owner,date,content,event_ids,created_at,updated_at) VALUES (?,?,?,?,?,?,?)',digestId,user.userId,day,digestMarkdown(day,selected as Event[]),JSON.stringify(selected.map(e=>e.id)),now(),now());result={ok:true,id:digestId,count:selected.length};
   }
   else if(action==='digest-save'){const content=z.string().max(40000).parse(body.content);const result2=await run('UPDATE zhiliu_radar__digests SET content=?,edited=1,updated_at=? WHERE id=? AND owner=?',content,now(),id.parse(body.id),user.userId);if(!result2.meta.changes)throw new Error('简报不存在或无访问权限')}
   else if(action==='model-summary')result=await summarize(id.parse(body.itemId));
   else throw new Error('不支持的操作');
   await run('UPDATE zhiliu_radar__idempotency SET response=? WHERE key=?',JSON.stringify(result),key);return json(result);
  }catch(e){await run('DELETE FROM zhiliu_radar__idempotency WHERE key=?',key);throw e}
 }catch(e){const message=e instanceof z.ZodError?'输入格式不正确，请检查必填字段':e instanceof Error?e.message:'操作失败';return json({error:/UNIQUE constraint/.test(message)?'该来源已存在，请勿重复添加':message},400)}
}
