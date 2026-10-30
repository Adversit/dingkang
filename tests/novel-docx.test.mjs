import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const vendorContext={module:{exports:{}},exports:{},TextEncoder,TextDecoder,Uint8Array,Uint16Array,Uint32Array,Int32Array,ArrayBuffer,DataView};vm.runInNewContext(fs.readFileSync('public/apps/novel-studio/vendor/fflate-0.8.3.js','utf8'),vendorContext);const fflate=vendorContext.module.exports;
const script=fs.readFileSync('public/apps/novel-studio/docx-reader.js','utf8');
function reader(DOMParser=class{}){const c={TextDecoder,Uint8Array,DataView,DOMParser,fflate};vm.runInNewContext(script,c);return c.NovelDocx}
const xml='<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>你好</w:t></w:r></w:p></w:body></w:document>';
function zip(content=xml){return fflate.zipSync({'word/document.xml':fflate.strToU8(content)})}
function central(b){for(let i=0;i<b.length-4;i++)if(b[i]===0x50&&b[i+1]===0x4b&&b[i+2]===1&&b[i+3]===2)return i;throw Error('no central')}
test('DOCX ZIP extraction verifies a valid compressed document',()=>{assert.equal(reader()._zipXml(zip(),fflate),xml)});
test('rejects bad CRC, oversized claim and invalid archive',()=>{
 const a=zip();let i=central(a);a[i+16]^=0xff;assert.throws(()=>reader()._zipXml(a,fflate));
 const b=zip();i=central(b);new DataView(b.buffer,b.byteOffset).setUint32(i+24,4*1024*1024+1,true);assert.throws(()=>reader()._zipXml(b,fflate),/过大/);
 assert.throws(()=>reader()._zipXml(new Uint8Array(30),fflate));
});
test('actual expanded content is bounded even when declared size is forged',()=>{
 const b=zip('x'.repeat(2_000_000));const i=central(b),v=new DataView(b.buffer,b.byteOffset);v.setUint32(i+24,1,true);v.setUint32(22,1,true);
 assert.throws(()=>reader()._zipXml(b,fflate),/超过限制/);
});
test('XML rejects DTD and extracts paragraphs with tabs without deleted text',()=>{
 const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';const node=(localName,textContent='',childNodes=[])=>({nodeType:1,namespaceURI:ns,localName,textContent,childNodes});
 const para=node('p','',[node('r','',[node('t','你好'),node('tab'),node('del','',[node('t','删文')]),node('t','世界')])]);
 class Parser{parseFromString(){return {getElementsByTagName:()=>[],getElementsByTagNameNS:()=>[{getElementsByTagNameNS:()=>[para]}]}}}
 const r=reader(Parser);assert.throws(()=>r._xmlText('<!DOCTYPE a [<!ENTITY x "foo">]>'),/不支持/);assert.equal(r._xmlText('<ok/>'),'你好\t世界');
});
