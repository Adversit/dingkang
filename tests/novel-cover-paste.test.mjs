import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../public/apps/novel-studio/cover.js',import.meta.url),'utf8');
function panel(){
 let Class,requests=0,reads=0;
 const customElements={get(){},define(name,c){Class=c}};
 runInNewContext(source,{window:{customElements},customElements,HTMLElement:class{},URL,navigator:{clipboard:{read(){reads++;throw Error('no automatic read')}}},fetch:()=>{requests++;throw Error('no network for paste')}});
 const c=new Class(),elements=new Map(),q=k=>{if(!elements.has(k))elements.set(k,{hidden:false,value:'',setAttribute(){},removeAttribute(){}});return elements.get(k)};
 c.querySelector=q;c.active=true;c.titleText='书';c.draw();c.currentURL='blob:existing-cover';c.etag='"saved"';
 return {c,q,counts:()=>[requests,reads],paste:dt=>{let prevented=false;q('.cover-paste').onpaste({clipboardData:dt,preventDefault:()=>{prevented=true}});assert.equal(prevented,true)}};
}
const image=type=>new Blob(['sample'],{type});
test('pasting binary image via ClipboardItem or files sets a candidate without network, clipboard access, or replacing saved artwork',()=>{
 const p=panel(),a=image('image/png'),b=image('image/jpeg');
 p.paste({items:[{kind:'string',getAsFile:()=>assert.fail()},{kind:'file',getAsFile:()=>a}],files:[]});assert.equal(p.c.candidate,a);assert.equal(p.q('.cover-pending').hidden,false);
 p.paste({items:[{kind:'file',getAsFile:()=>null}],files:[b]});assert.equal(p.c.candidate,b);assert.equal(p.c.currentURL,'blob:existing-cover');assert.equal(p.c.etag,'"saved"');assert.deepEqual(p.counts(),[0,0]);p.c.candidatePhoto(null);
});
test('pasting image links, unsupported bytes, oversized images, or during a submission leaves the existing candidate untouched',()=>{
 const p=panel(),a=image('image/png');p.paste({files:[a]});const text={kind:'string',getAsString:()=>assert.fail()};p.paste({items:[text],files:[]});assert.match(p.q('.cover-status').textContent,/复制图片本身/);
 p.paste({files:[image('image/webp')]});p.paste({files:[{type:'image/png',size:7*1024*1024}]});p.c.busy=true;p.paste({files:[image('image/jpeg')]});assert.equal(p.c.candidate,a);assert.deepEqual(p.counts(),[0,0]);p.c.candidatePhoto(null);
});
