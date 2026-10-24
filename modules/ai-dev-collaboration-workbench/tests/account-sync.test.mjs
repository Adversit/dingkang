import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

function account(fetch){
  const window={ACCOUNT_BOOTSTRAP:{revision:0,user:{email:'user@example.test'}},addEventListener(){}};
  const document={documentElement:{lang:'zh-CN'},querySelector(){return null;},addEventListener(){}};
  runInNewContext(readFileSync(new URL('../../../public/apps/ai-dev-collaboration-workbench/account.js',import.meta.url),'utf8'),{
    window,document,fetch,structuredClone,setTimeout:()=>1,clearTimeout(){},
  });
  return window.AccountSync;
}

test('account save waits for in-flight changes and saves the latest revision',async()=>{
  let completeFirst;
  const requests=[];
  const sync=account(async(_url,options)=>{
    const body=JSON.parse(options.body);requests.push(body);
    if(requests.length===1)await new Promise(resolve=>{completeFirst=resolve;});
    return {ok:true,json:async()=>({revision:body.revision+1})};
  });
  sync.queue({schema:3,projects:[{id:'first'}]});
  const first=sync.flush();
  sync.queue({schema:3,projects:[{id:'first'},{id:'second'}]});
  const second=sync.flush();
  completeFirst();
  assert.equal(await first,true);
  assert.equal(await second,true);
  assert.deepEqual(requests.map(({revision,data})=>[revision,data.projects.length]),[[0,1],[1,2]]);
});

test('failed account save keeps changes available for retry',async()=>{
  let fail=true;
  const sync=account(async()=>fail?{ok:false,status:503}:{ok:true,json:async()=>({revision:1})});
  sync.queue({schema:3,projects:[{id:'kept'}]});
  assert.equal(await sync.flush(),false);
  fail=false;
  assert.equal(await sync.flush(),true);
});
