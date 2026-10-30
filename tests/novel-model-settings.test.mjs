import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const script=readFileSync(new URL('../public/apps/novel-studio/model-settings.js',import.meta.url),'utf8');
const tick=()=>new Promise(setImmediate);
const response=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data});
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function environment({statusCode=200,connectionResponse,preferenceResponse,variables=[{name:'MyWritingKey',eligible:true},{name:'AnotherKey',eligible:true}]}={}){
  class Element {
    constructor(){this.value='';this.disabled=false;this.textContent='';this.className='';this.dataset={};this.listeners={};this.innerHTML='';this.hidden=false;}
    addEventListener(type,listener){this.listeners[type]=listener}
    replaceChildren(){this.innerHTML='';this.textContent=''}
    querySelectorAll(){return []}
  }
  const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id)};
  const calls=[],windowEvents={};
  let currentSource='MyWritingKey',sourceRevision=1,model='writer-alpha',modelRevision=3,preferenceStale=false,failStatus=false;
  const currentPreference=()=>({model,revision:modelRevision,sourceRevision,stale:preferenceStale,fallbackModel:null});
  const fetch=async(path,options={})=>{
    calls.push({path,options});
    if(path.endsWith('/model-status')){
      if(failStatus)throw Error('network unavailable');
      if(statusCode!==200)return response({error:statusCode===401?'请先登录':'仅负责人可查看'},statusCode);
      return response({selectedSource:currentSource,preferenceRevision:sourceRevision,keyConfigured:true,environmentVariables:variables});
    }
    if(path.endsWith('/model-preference')){
      if(preferenceResponse)return preferenceResponse({path,options,currentPreference});
      if(options.method==='POST'){
        const body=JSON.parse(options.body);
        if(body.expectedRevision!==modelRevision||body.expectedSourceRevision!==sourceRevision)return response({error:'设置已变化'},409);
        model=body.model;modelRevision++;preferenceStale=false;
      }
      return response(currentPreference());
    }
    if(path.endsWith('/model-connection')){
      const body=JSON.parse(options.body);
      if(connectionResponse)return connectionResponse(body);
      if(body.expectedRevision!==sourceRevision)return response({error:'连接已变化'},409);
      if(body.source!==currentSource){currentSource=body.source;sourceRevision++;preferenceStale=true;model=null}
      return response({connected:true,selectedSource:currentSource,preferenceRevision:sourceRevision,sourceRevision,writingModels:[{id:'writer-alpha'},{id:'writer-beta'}],truncated:false});
    }
    throw Error('Unexpected request '+path);
  };
  const window={NovelStudio:{escape,icon:()=>'<svg></svg>',shell:({content})=>content},addEventListener(type,listener){windowEvents[type]=listener}};
  vm.runInNewContext(script,{window,document:{getElementById:get},fetch,Error});
  return {get,calls,window,windowEvents,current:()=>({currentSource,sourceRevision,model,modelRevision}),failRead(){failStatus=true},
    click:id=>get(id).listeners.click(),
    source(name){get('key-source').value=name;get('key-source').listeners.change()},
    model(id){get('model-list').listeners.click({target:{closest:()=>({dataset:{modelId:id}})}})},
  };
}
const ready=async app=>{await tick();await tick();return app};
const writes=app=>app.calls.filter(call=>call.options.method==='POST');

test('opens with runtime environment names and makes no automatic connection or generation request',async()=>{
  const app=await ready(environment());
  assert.match(app.get('key-source').innerHTML,/MyWritingKey/);
  assert.match(app.get('key-source').innerHTML,/AnotherKey/);
  assert.doesNotMatch(app.get('key-source').innerHTML,/小说专用|复用已有|NOVEL_OPENAI_API_KEY/);
  assert.equal(writes(app).length,0);
  assert.equal(app.get('test-connection').disabled,false);
  assert.equal(app.get('model-browser').hidden,true);
  assert.equal(app.get('save-model').disabled,true);
});

test('tests the selected variable, lists returned models, and saves a selected default with revision guards',async()=>{
  const app=await ready(environment());
  app.source('AnotherKey');await app.click('test-connection');
  const connection=writes(app)[0];
  assert.equal(connection.path,'/api/m/novel-studio/model-connection');
  assert.deepEqual(JSON.parse(connection.options.body),{source:'AnotherKey',expectedRevision:1});
  assert.match(app.get('model-list').innerHTML,/writer-alpha/);
  assert.match(app.get('model-list').innerHTML,/writer-beta/);
  assert.equal(app.get('model-browser').hidden,false);
  app.model('writer-beta');await app.click('save-model');
  assert.deepEqual(JSON.parse(writes(app)[1].options.body),{model:'writer-beta',expectedRevision:3,expectedSourceRevision:2});
  assert.equal(app.get('current-model').textContent,'writer-beta');
  assert.match(app.get('model-message').textContent,/已保存/);
  assert.equal(app.calls.some(call=>/auto-run|draft|generate|chat\/completions/.test(call.path)),false);
  assert.equal(JSON.stringify(writes(app)).includes('Authorization'),false,'browser submits references, never provider credentials');
});

test('provider key rejection does not log the website user out or replace the active connection',async()=>{
  const app=await ready(environment({connectionResponse:()=>response({error:'连接验证失败，请检查密钥。'},401)}));
  app.source('AnotherKey');await app.click('test-connection');
  assert.equal(app.get('settings-form').hidden,false);
  assert.equal(app.get('settings-access').hidden,true);
  assert.match(app.get('connection-message').textContent,/连接验证失败/);
  assert.match(app.get('connection-message').textContent,/未被此操作替换/);
  assert.equal(app.current().currentSource,'MyWritingKey');
  assert.equal(app.get('current-model').textContent,'writer-alpha');
  assert.equal(app.get('save-model').disabled,true);
  assert.equal(writes(app).length,1);
});

test('website authentication failure shows sign-in and never reads private model preferences',async()=>{
  const app=await ready(environment({statusCode:401}));
  assert.equal(app.get('settings-form').hidden,true);
  assert.equal(app.get('settings-access').hidden,false);
  assert.match(app.get('settings-access').innerHTML,/signin-with-chatgpt\?return_to=/);
  assert.equal(app.calls.some(call=>call.path.endsWith('/model-preference')),false);
  assert.equal(writes(app).length,0);
});

test('changing the variable clears its model list and cannot save a previously selected model',async()=>{
  const app=await ready(environment());
  await app.click('test-connection');app.model('writer-beta');
  app.source('AnotherKey');
  assert.equal(app.get('model-list').innerHTML,'');
  assert.equal(app.get('model-browser').hidden,true);
  assert.equal(app.get('save-model').disabled,true);
  await app.click('save-model');
  assert.equal(writes(app).filter(call=>call.path.endsWith('/model-preference')).length,0);
});

test('a missing response never claims the connection was unchanged and requires a fresh status read',async()=>{
  for(const connectionResponse of [()=>{throw Error('response lost')},()=>response({error:'upstream unavailable'},502),()=>response({connected:true})]){
    const app=await ready(environment({connectionResponse}));
    app.source('AnotherKey');await app.click('test-connection');
    assert.match(app.get('connection-message').textContent,/结果未能确认/);
    assert.doesNotMatch(app.get('connection-message').textContent,/未被此操作替换/);
    assert.equal(app.get('test-connection').disabled,true);
    assert.equal(app.get('save-model').disabled,true);
    assert.equal(app.get('refresh').disabled,false);
    assert.equal(writes(app).length,1);
  }
});

test('typed pre-save model failures show their safe cause and preserve a retryable connection selection',async()=>{
  const failures=[
    {code:'MODEL_NETWORK_ERROR',category:'network',providerStatus:null,error:'站点暂时无法连接 OpenAI，请稍后重试。',status:502},
    {code:'MODEL_RUNTIME_ERROR',category:'runtime_api',providerStatus:null,error:'站点连接服务发生错误，请稍后重试。',status:502},
    {code:'MODEL_PROVIDER_ERROR',category:'provider',providerStatus:503,error:'OpenAI 未能返回模型列表，请稍后重试。',status:502},
    {code:'MODEL_RESPONSE_INVALID',category:'malformed',providerStatus:200,error:'模型服务返回格式无效，请稍后重试。',status:502},
    {code:'MODEL_REQUEST_TIMEOUT',category:'timeout',providerStatus:null,error:'读取模型列表超时，请重试。',status:504},
  ];
  for(const {status,...body} of failures){
    const app=await ready(environment({connectionResponse:()=>response({...body,connectionUnchanged:true},status)}));
    app.source('AnotherKey');await app.click('test-connection');
    assert.equal(app.get('connection-badge').textContent,'连接失败');
    assert.ok(app.get('connection-message').textContent.startsWith(body.error));
    assert.match(app.get('connection-message').textContent,/未被此操作替换/);
    assert.equal(app.get('test-connection').disabled,false);
    assert.equal(app.get('save-model').disabled,true);
    assert.equal(app.get('current-model').textContent,'writer-alpha');
    assert.equal(app.current().currentSource,'MyWritingKey');
  }
});

test('untrusted or mismatched no-change claims cannot turn an uncertain server response into a definite failure',async()=>{
  const valid={code:'MODEL_NETWORK_ERROR',category:'network',providerStatus:null,error:'站点暂时无法连接 OpenAI，请稍后重试。',connectionUnchanged:true};
  const invalid=[{...valid,code:'UNKNOWN_CODE'},{...valid,category:'storage'},{...valid,error:'untrusted body'},{...valid,providerStatus:'503'},{...valid,connectionUnchanged:'true'}];
  for(const body of invalid){
    const app=await ready(environment({connectionResponse:()=>response(body,502)}));
    await app.click('test-connection');
    assert.equal(app.get('connection-badge').textContent,'结果待确认');
    assert.doesNotMatch(app.get('connection-message').textContent,/未被此操作替换|untrusted body/);
    assert.equal(app.get('test-connection').disabled,true);
  }
});

test('a failed configuration refresh cannot reuse stale source options or model selections',async()=>{
  const app=await ready(environment());
  await app.click('test-connection');app.model('writer-beta');
  app.failRead();await app.click('refresh');
  assert.equal(app.get('key-source').disabled,true);
  assert.equal(app.get('test-connection').disabled,true);
  assert.equal(app.get('save-model').disabled,true);
  assert.equal(app.get('model-list').innerHTML,'');
  const before=writes(app).length;await app.click('test-connection');await app.click('save-model');
  assert.equal(writes(app).length,before);
});

test('pending connection work disables competing changes and blocks hub navigation until settled',async()=>{
  let release;const pending=new Promise(resolve=>{release=resolve});
  const app=await ready(environment({connectionResponse:()=>pending}));
  const operation=app.click('test-connection');
  assert.equal(app.get('key-source').disabled,true);
  assert.equal(app.get('refresh').disabled,true);
  assert.equal(app.window.HubBeforeLeave(),false);
  let warned=false;app.windowEvents.beforeunload({preventDefault(){warned=true},returnValue:null});assert.equal(warned,true);
  release(response({error:'连接验证失败'},401));await operation;
  assert.equal(app.window.HubBeforeLeave(),true);
  assert.equal(app.get('refresh').disabled,false);
});

test('unconfigured deployments expose a setup action without inventing a credential or model',async()=>{
  const app=await ready(environment({variables:[]}));
  assert.equal(app.get('key-source').disabled,true);
  assert.equal(app.get('test-connection').disabled,true);
  assert.match(app.get('connection-message').textContent,/Sites.*重新部署/);
  assert.equal(app.get('model-list').innerHTML,'');
  assert.equal(writes(app).length,0);
});

test('returned model IDs render as text and selecting an unreturned model is ignored',async()=>{
  const app=await ready(environment({connectionResponse:()=>response({connected:true,selectedSource:'MyWritingKey',preferenceRevision:1,writingModels:[{id:'writer-<img src=x>'}]})}));
  await app.click('test-connection');
  assert.match(app.get('model-list').innerHTML,/&lt;img src=x&gt;/);
  assert.doesNotMatch(app.get('model-list').innerHTML,/<img/);
  app.model('unreturned-model');await app.click('save-model');
  assert.equal(writes(app).filter(call=>call.path.endsWith('/model-preference')).length,0);
});
