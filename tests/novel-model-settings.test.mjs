import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const script = readFileSync(new URL('../public/apps/novel-studio/model-settings.js', import.meta.url), 'utf8');

async function run(payload, ok = true) {
  class Element {
    constructor(){ this.children=[]; this.textContent=''; this.disabled=false; this.className=''; }
    append(...children){this.children.push(...children)}
    replaceChildren(...children){this.children=children}
    addEventListener(name, callback){this.callback=callback}
  }
  const state = new Element(), button = new Element(), requests=[];
  const document = {getElementById: id => id === 'state' ? state : button, createElement: () => new Element()};
  const fetch = async (path, options) => {requests.push({path, options});return {ok, json:async()=>payload};};
  vm.runInNewContext(script, {document, fetch, Error});
  await new Promise(resolve => setImmediate(resolve));
  return {state,button,requests};
}
const texts = element => [element.textContent, ...element.children.flatMap(texts)].join(' ');
test('status check requests only configuration presence and renders model name as text', async () => {
  const output = await run({keyConfigured:true,modelConfigured:true,model:'<img onerror=alert(1)>',verified:false});
  assert.equal(output.requests.length,1);
  assert.equal(output.requests[0].path,'/api/m/novel-studio/model-status');
  assert.equal(output.requests[0].options.cache,'no-store');
  assert.match(texts(output.state), /已读取到配置/);
  assert.match(texts(output.state), /尚未验证/);
  assert.match(texts(output.state), /<img onerror=alert\(1\)>/);
  assert.equal(output.button.disabled,false);
});
test('unconfigured and access-denied responses do not imply a verified model', async () => {
  const missing = await run({keyConfigured:false,modelConfigured:false,model:null,verified:false});
  assert.match(texts(missing.state), /未配置/);
  assert.match(texts(missing.state), /重新部署/);
  const denied = await run({error:'仅站点负责人可以查看模型配置状态。'}, false);
  assert.match(texts(denied.state), /仅站点负责人/);
  assert.equal(denied.button.disabled,false);
});
