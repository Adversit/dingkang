import {deliveryApi} from './delivery-api.mjs';
// The Sites dispatcher owns ChatGPT authentication; no passwords or OAuth tokens are handled here.
export function getUser(request){
  const id=request.headers.get('oai-authenticated-user-id'),email=request.headers.get('oai-authenticated-user-email');
  if(!id||!email)return null;
  let name=email;
  if(request.headers.get('oai-authenticated-user-full-name-encoding')==='percent-encoded-utf-8'){
    try{name=decodeURIComponent(request.headers.get('oai-authenticated-user-full-name')||'')||email;}catch{}
  }
  return {id,email,name};
}
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function isAdmin(user,env){return !!user&&typeof env.SITE_ADMIN_EMAIL==='string'&&!!env.SITE_ADMIN_EMAIL.trim()&&user.email.toLowerCase()===env.SITE_ADMIN_EMAIL.trim().toLowerCase();}
async function audit(env,user,action,target,reason){
  await env.DB.prepare('INSERT INTO ai_dev_collaboration_workbench__admin_reads (actor, target, action, reason, created_at) VALUES (?, ?, ?, ?, ?)').bind(user.id,target,action,reason,new Date().toISOString()).run();
}
async function adminApi(request,env,user){
  if(!isAdmin(user,env))return json({error:'admin_required'},403);
  const url=new URL(request.url),path=url.pathname;
  if(path==='/api/admin/workspaces'&&request.method==='GET'){
    const offset=Number(url.searchParams.get('offset')||0);
    if(!Number.isSafeInteger(offset)||offset<0)return json({error:'invalid_offset'},400);
    const target=(url.searchParams.get('user')||'').trim();
    await audit(env,user,'list',target||'*','查看排障概览');
    const totals=await env.DB.prepare('SELECT COUNT(*) AS users, COALESCE(SUM(json_array_length(data, \'$.projects\')),0) AS projects FROM ai_dev_collaboration_workbench__workspaces').bind().first();
    const rows=await env.DB.prepare('SELECT user_id, revision, updated_at, json_array_length(data, \'$.projects\') AS projects FROM ai_dev_collaboration_workbench__workspaces WHERE (? = \'\' OR user_id = ?) ORDER BY updated_at DESC, user_id LIMIT 26 OFFSET ?').bind(target,target,offset).all();
    return json({totals,items:rows.results.slice(0,25),hasMore:rows.results.length>25,offset});
  }
  if(path==='/api/admin/read'&&request.method==='POST'){
    if(request.headers.get('Origin')!==url.origin)return json({error:'invalid_origin'},403);
    if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'json_required'},415);
    const raw=await request.text();if(raw.length>4096)return json({error:'too_large'},413);
    let body;try{body=JSON.parse(raw);}catch{return json({error:'invalid_json'},400);}
    if(typeof body.userId!=='string'||!body.userId||body.userId.length>256||typeof body.reason!=='string'||body.reason.trim().length<4||body.reason.length>500)return json({error:'reason_required'},400);
    await audit(env,user,'read',body.userId,body.reason.trim());
    const row=await env.DB.prepare('SELECT data, revision, updated_at FROM ai_dev_collaboration_workbench__workspaces WHERE user_id = ?').bind(body.userId).first();
    return row?json({userId:body.userId,data:JSON.parse(row.data),revision:row.revision,updatedAt:row.updated_at}):json({error:'not_found'},404);
  }
  if(path==='/api/admin/audit'&&request.method==='GET'){
    const rows=await env.DB.prepare('SELECT actor, target, action, reason, created_at FROM ai_dev_collaboration_workbench__admin_reads ORDER BY created_at DESC, id DESC LIMIT 100').bind().all();
    return json({items:rows.results});
  }
  return json({error:'method_or_route_not_allowed'},405);
}
const safeId=id=>typeof id==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(id);
const allowedNodeTypes=new Set(['problem','architecture','module','decision','plan','verification','risk','artifact']);
const allowedNodeStatuses=new Set(['draft','review','verified','accepted']);
const allowedEdgeTypes=new Set(['control','data','dependency','state']);
const allowedAcceptanceStatuses=new Set(['unverified','passed','failed','manual']);
const allowedAcceptanceKinds=new Set(['normal','boundary','exception','regression']);
export function validState(data){
  if(!data||![2,3].includes(data.schema)||!Array.isArray(data.projects)||data.projects.length>200)return false;
  const ids=new Set();
  return data.projects.every(p=>{
    if(!p||!safeId(p.id)||ids.has(p.id)||!Array.isArray(p.nodes)||!Array.isArray(p.edges)||p.nodes.length>5000||p.edges.length>20000)return false;
    if(p.camera!==undefined&&(!p.camera||!Number.isFinite(p.camera.x)||!Number.isFinite(p.camera.y)||!Number.isFinite(p.camera.z)||p.camera.z<=0))return false;
    ids.add(p.id);const nodes=new Set();
    return p.nodes.every(n=>{
      if(!n||!safeId(n.id)||nodes.has(n.id)||!Number.isFinite(n.x)||!Number.isFinite(n.y))return false;
      if(n.type!==undefined&&!allowedNodeTypes.has(n.type)||n.status!==undefined&&!allowedNodeStatuses.has(n.status))return false;
      if(n.parentId!==undefined&&!safeId(n.parentId)||n.moduleLevel!==undefined&&!['container','leaf'].includes(n.moduleLevel))return false;
      if(n.w!==undefined&&(!Number.isFinite(n.w)||n.w<=0)||n.h!==undefined&&(!Number.isFinite(n.h)||n.h<=0))return false;
      if(n.acceptance!==undefined&&(!Array.isArray(n.acceptance)||n.acceptance.some(a=>!a||!safeId(a.id)||a.status!==undefined&&!allowedAcceptanceStatuses.has(a.status)||a.kind!==undefined&&!allowedAcceptanceKinds.has(a.kind))))return false;
      nodes.add(n.id);return true;
    })&&p.nodes.every(n=>n.parentId===undefined||nodes.has(n.parentId))
      &&p.edges.every(e=>e&&nodes.has(e.from)&&nodes.has(e.to)&&(e.id===undefined||safeId(e.id))&&(e.type===undefined||allowedEdgeTypes.has(e.type)));
  });
}
export async function api(request,env){
  const user=getUser(request),path=new URL(request.url).pathname;
  if(!user)return json({error:'sign_in_required'},401);
  if(path==='/api/session')return json({user,isAdmin:isAdmin(user,env)});
  if(path.startsWith('/api/admin/'))return adminApi(request,env,user);
  if(path!=='/api/workspace')return json({error:'not_found'},404);
  if(request.method==='GET'){
    const row=await env.DB.prepare('SELECT data, revision FROM ai_dev_collaboration_workbench__workspaces WHERE user_id = ?').bind(user.id).first();
    return json({data:row?JSON.parse(row.data):null,revision:row?.revision||0});
  }
  if(request.method!=='PUT')return json({error:'method_not_allowed'},405);
  if(request.headers.get('Origin')!==new URL(request.url).origin)return json({error:'invalid_origin'},403);
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'json_required'},415);
  if(Number(request.headers.get('Content-Length'))>2000000)return json({error:'too_large'},413);
  const raw=await request.text();if(raw.length>2000000)return json({error:'too_large'},413);
  let body;try{body=JSON.parse(raw);}catch{return json({error:'invalid_json'},400);}
  if(!Number.isSafeInteger(body.revision)||body.revision<0||!validState(body.data))return json({error:'invalid_state'},400);
  const saved=body.revision===0
    ?await env.DB.prepare('INSERT INTO ai_dev_collaboration_workbench__workspaces (user_id, data, revision, updated_at) VALUES (?, ?, 1, ?) ON CONFLICT(user_id) DO NOTHING RETURNING revision').bind(user.id,JSON.stringify(body.data),new Date().toISOString()).first()
    :await env.DB.prepare('UPDATE ai_dev_collaboration_workbench__workspaces SET data = ?, revision = revision + 1, updated_at = ? WHERE user_id = ? AND revision = ? RETURNING revision').bind(JSON.stringify(body.data),new Date().toISOString(),user.id,body.revision).first();
  if(saved)return json({revision:saved.revision});
  return json({error:'revision_conflict'},409);
}
const loginHtml=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AI 开发协作 · 登录</title><style>body{margin:0;background:#f7f7f5;color:#242623;font:16px/1.7 system-ui}main{max-width:540px;margin:15vh auto;padding:32px}h1{font-size:32px}a{display:inline-block;padding:12px 20px;border-radius:8px;background:#272a27;color:white;text-decoration:none}p{color:#60665f}small{display:block;margin-top:28px}button{float:right;background:none;border:1px solid #ccc;padding:8px;border-radius:5px}</style><main><button onclick="const en=document.documentElement.lang==='zh-CN';document.documentElement.lang=en?'en':'zh-CN';document.querySelectorAll('[data-en]').forEach(e=>e.textContent=e.dataset[en?'en':'zh']);this.textContent=en?'中文':'EN'">EN</button><p>AI Development Collaboration</p><h1 data-zh="你的项目，你的工作台" data-en="Your projects. Your workspace.">你的项目，你的工作台</h1><p data-zh="使用自己的 ChatGPT 账号登录。画布与项目按账号独立保存，可在不同设备继续使用。" data-en="Sign in with your ChatGPT account. Your projects are saved separately and available across devices.">使用自己的 ChatGPT 账号登录。画布与项目按账号独立保存，可在不同设备继续使用。</p><a href="/signin-with-chatgpt?return_to=%2Fm%2Fai-dev-collaboration-workbench" target="_top" data-zh="使用 ChatGPT 登录" data-en="Sign in with ChatGPT">使用 ChatGPT 登录</a><small data-zh="登录只用于身份识别，不会读取你的聊天记录，也不会调用 GPT API。" data-en="Sign-in identifies your account. This site does not read your chats or call the GPT API.">登录只用于身份识别，不会读取你的聊天记录，也不会调用 GPT API。</small><p data-zh="数据使用说明：站点管理员可为故障排查与产品改进只读查看已保存的项目；访问会被记录。请勿在项目中存放密码、密钥等敏感信息。" data-en="Data use: the site administrator may view saved projects for troubleshooting and product improvements. Access is logged. Do not store passwords or secret keys in projects.">数据使用说明：站点管理员可为故障排查与产品改进只读查看已保存的项目；访问会被记录。请勿在项目中存放密码、密钥等敏感信息。</p></main></html>`;
export function createWorker(assets){return {async fetch(request,env){
  const path=new URL(request.url).pathname;
  try{
    if(path.startsWith('/api/delivery'))return await deliveryApi(request,env,getUser(request));
    if(path.startsWith('/api/'))return await api(request,env);
    if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Method not allowed',{status:405});
    if(path==='/delivery'||path==='/delivery.html'){
      if(!getUser(request))return new Response(null,{status:302,headers:{Location:'/signin-with-chatgpt?return_to=%2Fm%2Fai-dev-collaboration-workbench%2Fdelivery','Cache-Control':'no-store'}});
      return new Response(request.method==='HEAD'?null:assets['/delivery.html'].body,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
    }
    if(path==='/admin'||path==='/admin.html'){
      const user=getUser(request);
      if(!user)return new Response(null,{status:302,headers:{Location:'/signin-with-chatgpt?return_to=%2Fm%2Fai-dev-collaboration-workbench%2Fadmin','Cache-Control':'no-store'}});
      if(!isAdmin(user,env))return new Response('此账号没有管理员权限 / Administrator access required',{status:403,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
      return new Response(request.method==='HEAD'?null:assets['/admin.html'].body,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
    }
    if(path==='/'||path==='/index.html'){
      const user=getUser(request);
      if(!user)return new Response(loginHtml,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
      const row=await env.DB.prepare('SELECT data, revision FROM ai_dev_collaboration_workbench__workspaces WHERE user_id = ?').bind(user.id).first();
      const boot=JSON.stringify({user,isAdmin:isAdmin(user,env),data:row?JSON.parse(row.data):null,revision:row?.revision||0}).replace(/</g,'\\u003c');
      const html=assets['/index.html'].body.replace(/(<script src="[^"]*core\.js">)/,`<script>window.ACCOUNT_BOOTSTRAP=${boot};</script>$1`);
      return new Response(request.method==='HEAD'?null:html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'}});
    }
    const asset=assets[path];if(!asset)return new Response('Not found',{status:404});
    return new Response(request.method==='HEAD'?null:(asset.base64?Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0)):asset.body),{headers:{'Content-Type':asset.type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}});
  }catch(error){console.error('Workspace request failed',error?.message);return json({error:'storage_unavailable',message:'项目暂时无法读取或保存，请稍后重试。'},503);}
}};}
