import { env } from 'cloudflare:workers';
export const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
export function identity(req:Request){const id=req.headers.get('oai-authenticated-user-id'),email=req.headers.get('oai-authenticated-user-email');if(!id||!email)throw new ApiError('请先使用 ChatGPT 登录',401);return id;}
export function mutation(req:Request){const origin=req.headers.get('Origin');if(!origin||origin!==new URL(req.url).origin)throw new ApiError('请求来源不匹配',403);}
export class ApiError extends Error {constructor(message:string,public status=400){super(message)}}
export function failure(e:unknown){if(e instanceof ApiError)return json({error:e.message},e.status);if(e instanceof Error&&e.name==='ZodError')return json({error:'输入不符合格式或超过长度限制'},400);return json({error:'操作失败，数据未确认保存。请重试或保留当前内容。'},500);}
export function db(){if(!env.DB)throw new ApiError('数据库尚未就绪',503);return env.DB;}
export function bucket(){if(!env.BUCKET)throw new ApiError('文件存储尚未就绪',503);return env.BUCKET;}
export async function owned(projectId:string,owner:string){const row=await db().prepare('SELECT * FROM zhizheng_research__projects WHERE id=? AND owner_id=?').bind(projectId,owner).first<{id:string;state:string;revision:number;updated_at:string}>();if(!row)throw new ApiError('项目不存在或无访问权限',404);return row;}
export async function body(req:Request){const text=await req.text();if(text.length>700000)throw new ApiError('请求过大',413);try{return JSON.parse(text)}catch{throw new ApiError('JSON 格式错误')}}
export async function sha256(bytes:ArrayBuffer){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');}
