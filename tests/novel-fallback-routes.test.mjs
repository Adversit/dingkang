import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import * as flow from '../modules/novel-orchestration/auto-run.mjs';
import * as context from '../modules/novel-ai/context.mjs';
import * as analysis from '../modules/novel-ai/analysis.mjs';
import * as fallback from '../modules/novel-ai/fallback-service.mjs';
import * as preferences from '../modules/novel-ai/model-preference-core.mjs';
import * as modelSelection from '../modules/novel-ai/model-selection.mjs';
import * as keyPref from '../modules/novel-ai/key-preference-core.mjs';
import * as profile from '../modules/novel-ai/writing-profile.mjs';
import * as modelsList from '../modules/novel-ai/models-list.mjs';

// Exercise public route handlers with production selection, fallback, SQLite CAS,
// actual provider packet assembly and SSE; only the network and account are fixtures.
const require=createRequire(import.meta.url);
const typescript=(path,deps)=>{
 const source=readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};new Function('require','module','exports',js)(key=>{
  if(key in deps)return deps[key];
  if(key.startsWith('node:'))return require(key);
  throw new Error('missing test dependency: '+key);
 },module,module.exports);return module.exports;
};
class HubError extends Error{constructor(msg,status=400){super(msg);this.status=status}}
const archive={version:6,state:{projects:[{id:'p',canonVersion:1,scenes:[{id:'s',title:'章',draft:'门开了。',revisions:[{id:'r',title:'章',body:'门开了。'}]}],facts:[]}]}};
const scene={projectId:'p',sceneId:'s',revisionId:'r',instruction:'续写',storyMoment:'1',perspective:'omniscient',pov:'',factIds:[]};
const book={mode:'idea',idea:'一次测试构思。',sceneCount:2};
const json=(body,status=200)=>Response.json(body,{status}),owner='qa',bad='removed-test-model',good='gpt-5.5',date='gpt-5.5-2026-04-23',base='https://api.openai.com/v1';
const payload=(raw,model=date)=>json({model,choices:[{finish_reason:'stop',message:{content:raw}}]});
function environment(defaultId=bad){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('CREATE TABLE novel_model_preferences(owner_id TEXT PRIMARY KEY,model_id TEXT,source_revision INTEGER,revision INTEGER,updated_at TEXT);CREATE TABLE novel_model_secret_preferences(owner_id TEXT PRIMARY KEY,source TEXT,revision INTEGER);');
 sqlite.prepare('INSERT INTO novel_model_secret_preferences VALUES(?,?,?)').run(owner,'WriterKey',1);
 if(defaultId!==null)sqlite.prepare('INSERT INTO novel_model_preferences VALUES(?,?,1,1,?)').run(owner,defaultId,'');
 const d1={prepare:sql=>({bind:(...vs)=>({first:async()=>sqlite.prepare(sql).get(...vs),run:async()=>({meta:sqlite.prepare(sql).run(...vs)})})})};
 const binding={source:'WriterKey',revision:1,key:'fictional-test-value'},getNovelKeyBinding=async()=>({...binding});
 const hub={database:()=>d1,json,HubError,failure:e=>json({error:e.message},e.status||500),requireMutation:()=>{},requireUser:()=>({userId:owner}),readBoundedBody:async req=>new Uint8Array(await req.arrayBuffer())};
 const helpers={config:()=>'',archiveFor:async()=>archive,inputFor:async req=>({owner,input:await req.json()}),problem:e=>json({error:e.message},e.status||500)};
 const modelPref=typescript('modules/novel-ai/model-preference.ts',{'@/lib/hub/server':hub,'./route-support':helpers,'./key-preference':{getNovelKeyBinding},'./model-preference-core.mjs':preferences,'./model-selection.mjs':modelSelection,'./context.mjs':context,'./models-list.mjs':modelsList});
 const textRun=typescript('modules/novel-ai/text-run.ts',{'./fallback-service.mjs':fallback,'./context.mjs':context,'./key-preference':{getNovelKeyBinding},'./model-preference':modelPref});
 const route=name=>typescript('app/api/m/novel-studio/'+name+'/route.ts',{'@/lib/hub/server':hub,'@/lib/feedback/server':{feedbackIdentity:()=>({authenticated:true,isOwner:true})},'cloudflare:workers':{env:{}},'@/modules/novel-ai/route-support':helpers,'@/modules/novel-ai/analysis.mjs':analysis,'@/modules/novel-ai/context.mjs':context,'@/modules/novel-ai/writing-profile.mjs':profile,'@/modules/novel-ai/model-preference':modelPref,'@/modules/novel-ai/key-preference':{getNovelKeyBinding},'@/modules/novel-ai/key-preference-core.mjs':keyPref,'@/modules/novel-ai/text-run':textRun,'@/modules/novel-ai/fallback-service.mjs':fallback,'@/modules/novel-orchestration/auto-run.mjs':flow});
 const post=(name,input)=>route(name).POST(new Request('https://fixture.invalid/api/m/novel-studio/'+name,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)}));
 const current=()=>sqlite.prepare('SELECT model_id,revision FROM novel_model_preferences WHERE owner_id=?').get(owner);
 const calls=[], hooks={};const fetch=async(url,args)=>{
  const path=new URL(url).pathname,body=args.body?JSON.parse(args.body):null;calls.push({path,body});
  if(path.endsWith('/models'))return json({object:'list',data:[{object:'model',id:good}]});
  if(body.model===bad)return json({error:{code:'model_not_found',param:'model',message:'Model is not available.'}},404);
  if(body.messages.length===1&&body.messages[0].content==='Reply OK.')return payload('OK');
  assert.equal(body.model,good);
  await hooks.onActual?.();
  let raw='门开了一寸。';
  if(body.response_format){
   const u=JSON.parse(body.messages.at(-1).content);
   raw=JSON.stringify(u.mode==='extract'?{candidates:[]}:u.mode==='check'?{issues:[]}:{scenes:[{title:'一',goal:'查看'}]});
  }
  return payload(raw);
 };
 return {post,calls,fetch,current,sqlite,hooks,modelPref,binding};
}
const cb={source:'WriterKey',revision:1};
const inputFor=async name=>{
 if(name==='plan'){const data={idea:'计划',sceneCount:1};return {...data,previewHash:(await flow.preparePlanPreview(data,bad,base,cb)).previewHash}}
 if(name==='auto-run')return {...book,previewHash:(await flow.preparePreview(book,null,bad,base,cb)).previewHash};
 if(name==='draft'||name==='review')return {...scene,previewHash:(await context.compileContext(scene,archive,bad,base,cb)).previewHash};
 if(name==='analyze')return {mode:'check',scene:{text:'门开了。',revisionId:'r',storyTime:'1'},facts:[]};
 return {instruction:'写小说',scene:'桌上有灯。',facts:[]};
};
for(const name of ['plan','auto-run','draft','review','generate','analyze'])test('confirmed model removal recovers via '+name+' endpoint without changing content permissions',async t=>{
 const x=environment();t.mock.method(globalThis,'fetch',x.fetch);
 const res=await x.post(name,await inputFor(name));
 assert.equal(res.status,200);
 let notice;
 if(name==='auto-run'){
  const events=(await res.text()).trim().split('\n\n').filter(s=>s.startsWith('event: ')).map(s=>{const [kind,line]=s.split('\n');return {type:kind.slice(7),data:JSON.parse(line.slice(6))}});
  const switches=events.filter(e=>e.type==='model_switched');assert.equal(switches.length,1);
  notice=switches[0].data;assert.equal(events.at(-1).type,'complete');
  assert.equal(events.filter(e=>e.type==='draft_ready').length,2);
  assert.ok(events.filter(e=>e.type.endsWith('_ready')&&e.type!=='context_ready').every(e=>e.data.model===date));
 }else{
  const output=await res.json();notice=output.modelFallback;
  assert.equal(output.requestedModel,bad);assert.equal(output.model,date);
 }
 assert.deepEqual(notice,{requestedModel:bad,selectedModel:good,reason:'model_not_found',defaultUpdated:true});
 assert.deepEqual({...x.current()},{model_id:good,revision:2});
 assert.equal(x.calls.filter(c=>c.path.endsWith('/models')).length,1);
 const [initial,discovery,probe,replay]=x.calls;assert.equal(initial.body.model,bad);assert.equal(discovery.path,'/v1/models');
 assert.deepEqual(probe.body.messages,[{role:'user',content:'Reply OK.'}]);assert.deepEqual(replay.body.messages,initial.body.messages);
 assert.ok(x.calls.slice(2).every(c=>c.body.model===good));x.sqlite.close();
});
test('manual override and concurrent changes preserve the author-selected default; fallback still returns prose',async t=>{
 let x=environment('different-working-model');t.mock.method(globalThis,'fetch',(...args)=>x.fetch(...args));
 const manual=await (await x.post('generate',{...await inputFor('generate'),model:bad})).json();
 assert.equal(manual.modelFallback.defaultUpdated,false);assert.equal(x.current().model_id,'different-working-model');x.sqlite.close();
 x=environment();x.hooks.onActual=()=>x.sqlite.prepare('UPDATE novel_model_preferences SET model_id=?,revision=revision+1 WHERE owner_id=?').run('newer-choice',owner);
 const changed=await (await x.post('generate',await inputFor('generate'))).json();
 assert.equal(changed.text,'门开了一寸。');assert.equal(changed.modelFallback.defaultUpdated,false);assert.deepEqual({...x.current()},{model_id:'newer-choice',revision:2});
 const old=x.binding.revision, p={...(await x.modelPref.getModelPreference(owner)),model:bad};x.sqlite.prepare('UPDATE novel_model_secret_preferences SET revision=? WHERE owner_id=?').run(old+1,owner);
 assert.equal(await x.modelPref.rememberProbedModel(owner,p,bad,good),false,'the conditional SQL guards source rotation even between reads');x.sqlite.close();
});
