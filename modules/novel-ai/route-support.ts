import { env } from 'cloudflare:workers';
import { feedbackIdentity } from '@/lib/feedback/server';
import { requireUser, requireMutation, database, readBoundedBody, HubError, json } from '@/lib/hub/server';
import { readArchive } from '@/modules/novel-studio/server/store.mjs';
import { ContextError } from './context.mjs';
export function config(name:string):string {const value=(env as unknown as Record<string,unknown>)[name]??(typeof process!=='undefined'?process.env[name]:undefined);return typeof value==='string'?value.trim():''}
export async function inputFor(req:Request){requireMutation(req);const user=requireUser(req),identity=feedbackIdentity(req,{FEEDBACK_OWNER_EMAIL:config('FEEDBACK_OWNER_EMAIL')});if(!identity.isOwner)throw new HubError('AI 功能目前仅向站点负责人开放。',403);if(!req.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new HubError('请求须使用 JSON。',415);const bytes=await readBoundedBody(req,64*1024);let input:unknown;try{input=JSON.parse(new TextDecoder().decode(bytes))}catch{throw new HubError('请求 JSON 格式错误。',400)}return {owner:user.userId,input}}
export async function archiveFor(owner:string){const db=database();return readArchive({load:async(ownerId:string)=>await db.prepare('SELECT version, state_json FROM novel_canon_states WHERE owner_id = ?').bind(ownerId).first<{version:number;state_json:string}>(),compareAndSwap:async()=>{throw new Error('read-only adapter')}},owner)}
export function problem(error:unknown){if(error instanceof HubError||error instanceof ContextError)return json({status:'ERROR',error:error.message},error.status);return json({status:'ERROR',error:'请求未完成，请检查服务状态后重试。'},500)}
