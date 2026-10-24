import {UserError} from './domain.mjs';
import {createState,normalizeState,performAction} from './product.mjs';
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{...headers,...extra}});
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(url.pathname==='/api/state'||url.pathname==='/api/action'||url.pathname==='/api/reset'){
  if(!env.DB)return json({error:'保存服务暂时不可用，请稍后重试。'},503);
  if(!['GET','POST'].includes(request.method))return json({error:'不支持的请求'},405);
  if(request.method==='POST'&&request.headers.get('Origin')!==url.origin)return json({error:'请求来源无效，请刷新页面'},403);
  const session=env.HUB_USER_ID;
  if(!session)return json({error:'请登录后再打开生活空间。'},401);
  const cookie={};
  try{
   let row=await env.DB.prepare('SELECT data, version FROM roommate_housekeeper__demo_households WHERE id = ?').bind(session).first();
   if(!row){const s=createState();await env.DB.prepare('INSERT OR IGNORE INTO roommate_housekeeper__demo_households (id, data, version, updated_at) VALUES (?, ?, 1, ?)').bind(session,JSON.stringify(s),new Date().toISOString()).run();row=await env.DB.prepare('SELECT data, version FROM roommate_housekeeper__demo_households WHERE id = ?').bind(session).first();}
   let state=normalizeState(JSON.parse(row.data));
   if(request.method==='GET'&&url.pathname==='/api/state')return json({state,version:row.version},200,cookie);
   if(request.method!=='POST')return json({error:'请使用页面按钮操作'},405,cookie);
   const bodyText=await request.text();if(bodyText.length>15000)return json({error:'提交内容过长'},413,cookie);
   let b;try{b=JSON.parse(bodyText)}catch{return json({error:'提交格式无效'},400,cookie)}
   if(typeof b.requestId!=='string'||b.requestId.length>80)return json({error:'操作标识无效'},400,cookie);
   if(state.requests?.includes(b.requestId))return json({state,version:row.version,message:'操作已完成'},200,cookie);
   if(b.version!==row.version)return json({error:'数据已有变化，已更新页面，请重新操作。',state,version:row.version},409,cookie);
   let message;if(url.pathname==='/api/reset'){state=createState();message='已重置当前演示空间';}else{const r=performAction(state,b.actor,b.action,b.data);state=r.state;message=r.message;}
   state.requests=[...(state.requests||[]).slice(-79),b.requestId];
   const result=await env.DB.prepare('UPDATE roommate_housekeeper__demo_households SET data = ?, version = version + 1, updated_at = ? WHERE id = ? AND version = ?').bind(JSON.stringify(state),new Date().toISOString(),session,row.version).run();
   if(result.meta.changes!==1)return json({error:'其他操作刚刚更新了数据，请刷新后重试。'},409,cookie);
   return json({state,version:row.version+1,message},200,cookie);
  }catch(e){if(e instanceof UserError)return json({error:e.message},400,cookie);console.error('household request failed',e?.message);return json({error:'暂时保存失败，你填写的内容已保留，请重试。'},500,cookie);}
 }
 return new Response('Not found',{status:404});
}};
