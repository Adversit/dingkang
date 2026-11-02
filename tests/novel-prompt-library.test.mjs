import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const base=fileURLToPath(new URL('../public/apps/novel-studio/prompt-sources/',import.meta.url));
const read=name=>readFile(path.join(base,name));
const digest=(alg,bytes)=>createHash(alg).update(bytes).digest('hex');
const vendor={module:{exports:{}},exports:{},TextEncoder,TextDecoder,Uint8Array,Uint16Array,Uint32Array,Int32Array,ArrayBuffer,DataView};
vm.runInNewContext(await readFile(new URL('../public/apps/novel-studio/vendor/fflate-0.8.3.js',import.meta.url),'utf8'),vendor);
const expected={
'nv-planner':'6dcf30dfbdc00d2d4f231ba9adfbfe5c54019085','nv-writer':'f8e371db4d4619fecdb902242cec4c1db0e81381','nv-extract':'ee11e1a35b67679be68a98dc01f885e5e438d935','nv-review':'504fed92ea112af7333fa73fa61d07ec3b38dfd9','nw-review':'65d373a172fcffe5b00264816b977d5293fa5cdc','nw-dialogue':'061abe6b4bbf84e15ee1a42491544e2ad1bffc9a'};
test('downloaded upstream originals match independent pinned Git blob identities and carry full license and source',async()=>{
 const rows=JSON.parse(await read('manifest.json'));
 assert.deepEqual(rows.map(r=>r.id).sort(),Object.keys(expected).sort());
 for(const row of rows){
  const bytes=await read(row.file),header=Buffer.from('blob '+bytes.length+'\0');
  assert.equal(digest('sha1',Buffer.concat([header,bytes])),expected[row.id]);
  assert.equal(digest('sha256',bytes),row.sha256); assert.equal(bytes.length,row.bytes);
  assert.ok(row.url.includes('/blob/'+row.commit+'/')); assert.match(row.commit,/^[0-9a-f]{40}$/);
  const lic=(await read(row.licenseFile)).toString(); assert.ok(lic.includes(row.attribution)); assert.ok(lic.includes('Permission is hereby granted'));assert.ok(lic.includes('THE SOFTWARE IS PROVIDED'));
 }
});
test('each original download is unchanged in the all-in-one archive; v41 contains distinct modes and the original shared analysis system text',async()=>{
 const rs=JSON.parse(await read('manifest.json')),old=JSON.parse(await read('v41-manifest.json'));assert.equal(old.length,5);
 for(const [name,archive] of [...new Set(rs.flatMap(r=>[r.file,r.licenseFile]))].map(n=>[n,'novel-prompt-sources.zip']).concat(old.map(x=>[x.file,'v41-role-prompts.zip']))){
  const zipped=Buffer.from(vendor.module.exports.unzipSync(await read(archive))[name]);
  assert.deepEqual(zipped,await read(name));
 }
 const shared=old.find(r=>r.file==='v41-analysis.txt');assert.ok(shared.prompt.includes('extract'));assert.ok(shared.prompt.includes('check'));
 for(const x of old){assert.equal(x.prompt,(await read(x.file)).toString());assert.equal(digest('sha256',await read(x.file)),x.sha256);}
});
test('source shelf renders local files and prior role text; filtering and copying a reference do not mutate an authored prompt',async()=>{
 const nodes=Object.create(null),links=[],clipboard=[],requests=[],buttons=['全部','规划','正文','提取','审阅'].map(role=>({dataset:{role},setAttribute(){}}));
 const mount={innerHTML:'',querySelector(selector){return nodes[selector]??=( {innerHTML:'',textContent:''} )},querySelectorAll(){return buttons},addEventListener(_type,cb){links.push(cb)}};
 const runtime={document:{querySelector:()=>mount},window:{NovelStudio:{shell:({content})=>content,escape:x=>String(x)}},navigator:{clipboard:{writeText:x=>clipboard.push(x)}},fetch:async url=>{requests.push(url);return {ok:true,json:async()=>JSON.parse(await read(path.basename(url)))}}};
 vm.runInNewContext(await readFile(new URL('../public/apps/novel-studio/prompt-library.js',import.meta.url),'utf8'),runtime);
 for(let i=0;i<10&&(!nodes['#old-prompts']||!nodes['.pr-list']);i++)await new Promise(r=>setTimeout(r,5));
 assert.equal(requests.length,2);assert.ok(requests.every(x=>x.startsWith('prompt-sources/')));
 assert.ok(nodes['#old-prompts'].innerHTML.includes('你是小说一致性审阅助手。'));assert.ok(nodes['#old-prompts'].innerHTML.includes('v41-analysis.txt'));
 await links[0]({target:{closest:()=>({dataset:{role:'提取'}})}});
 assert.ok(nodes['.pr-list'].innerHTML.includes('nv-extract-source.py.txt'));assert.ok(!nodes['.pr-list'].innerHTML.includes('nv-writer'));
 await links[0]({target:{closest:()=>({dataset:{copy:'nv-extract'}})}});
 assert.equal(clipboard.length,1);assert.ok(clipboard[0].includes('原句'));assert.equal(requests.length,2);
});
