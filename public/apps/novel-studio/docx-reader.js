/* Bounded DOCX plain-text reader. ZIP64, encrypted and multi-volume files are rejected. */
(function(root){'use strict';
const MAX_ARCHIVE=5*1024*1024,MAX_XML=4*1024*1024,MAX_TEXT=1_000_000,MAX_ENTRIES=1000;
function zipXml(buffer,fflate){
 const b=buffer instanceof Uint8Array?buffer:new Uint8Array(buffer),v=new DataView(b.buffer,b.byteOffset,b.byteLength);
 const bad=()=>{throw Error('DOCX 文件损坏或使用了不支持的 ZIP 格式')};
 if(b.length<22||b.length>MAX_ARCHIVE)throw Error('DOCX 压缩文件不能超过 5 MiB');
 const u16=i=>{if(i<0||i+2>b.length)bad();return v.getUint16(i,true)},u32=i=>{if(i<0||i+4>b.length)bad();return v.getUint32(i,true)};
 let e=-1;for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--){if(u32(i)===0x06054b50&&i+22+u16(i+20)===b.length){e=i;break}}if(e<0)bad();
 const count=u16(e+10),entriesDisk=u16(e+8),centralSize=u32(e+12),centralOffset=u32(e+16);
 if(u16(e+4)||u16(e+6)||count!==entriesDisk||count===0xffff||centralSize===0xffffffff||centralOffset===0xffffffff||count>MAX_ENTRIES||centralOffset+centralSize!==e)bad();
 let cursor=centralOffset,target=null;
 for(let n=0;n<count;n++){
  if(u32(cursor)!==0x02014b50||cursor+46>e)bad();
  let flags=u16(cursor+8),method=u16(cursor+10),crc=u32(cursor+16),compressed=u32(cursor+20),size=u32(cursor+24),nameLen=u16(cursor+28),extra=u16(cursor+30),comment=u16(cursor+32),disk=u16(cursor+34),offset=u32(cursor+42),end=cursor+46+nameLen+extra+comment;
  if(end>e||disk||compressed===0xffffffff||size===0xffffffff||offset===0xffffffff)bad();
  const name=new TextDecoder('utf-8',{fatal:true}).decode(b.subarray(cursor+46,cursor+46+nameLen));
  if(name==='word/document.xml'){if(target)bad();target={flags,method,crc,compressed,size,offset,name}}
  cursor=end;
 }
 if(cursor!==e||!target)bad();
 const t=target;if((t.flags&1)||(t.flags&0x40)||![0,8].includes(t.method)||t.size>MAX_XML||t.compressed>MAX_ARCHIVE)throw Error('DOCX 正文加密、过大或压缩格式不受支持');
 if(u32(t.offset)!==0x04034b50||t.offset+30>centralOffset||u16(t.offset+6)!==t.flags||u16(t.offset+8)!==t.method)bad();
 const nameLen=u16(t.offset+26),extra=u16(t.offset+28),nameEnd=t.offset+30+nameLen,start=nameEnd+extra,end=start+t.compressed;
 if(end>centralOffset||new TextDecoder('utf-8',{fatal:true}).decode(b.subarray(t.offset+30,nameEnd))!==t.name)bad();
 if(!(t.flags&8)&&(u32(t.offset+14)!==t.crc||u32(t.offset+18)!==t.compressed||u32(t.offset+22)!==t.size))bad();
 let parts=[],len=0,checksum=0xffffffff;function add(chunk){len+=chunk.length;if(len>MAX_XML||len>t.size)throw Error('DOCX 解压后的正文超过限制');parts.push(chunk.slice());for(const byte of chunk){checksum^=byte;for(let j=0;j<8;j++)checksum=(checksum>>>1)^(0xedb88320&-(checksum&1))}}
 if(t.method===0){for(let p=start;p<end;p+=1024)add(b.subarray(p,Math.min(end,p+1024)))}else{
  if(!fflate||typeof fflate.Inflate!=='function')throw Error('DOCX 解压组件不可用');const inflater=new fflate.Inflate(chunk=>add(chunk));
  for(let p=start;p<end;p+=1024)inflater.push(b.subarray(p,Math.min(end,p+1024)),p+1024>=end);
  if(start===end)bad();
 }
 if(len!==t.size||((checksum^0xffffffff)>>>0)!==t.crc)bad();const out=new Uint8Array(len);let pos=0;for(const part of parts){out.set(part,pos);pos+=part.length}return new TextDecoder('utf-8',{fatal:true}).decode(out);
}
function xmlText(xml){
 if(/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml))throw Error('DOCX 正文包含不支持的 XML 声明');
 const doc=new DOMParser().parseFromString(xml,'application/xml');if(doc.getElementsByTagName('parsererror').length)throw Error('DOCX 正文 XML 无法解析');
 const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';const bodies=doc.getElementsByTagNameNS(ns,'body');if(bodies.length!==1)throw Error('DOCX 缺少有效的正文');
 const paragraphs=Array.from(bodies[0].getElementsByTagNameNS(ns,'p'));let size=0,out=[];
 for(const p of paragraphs){let text='';const walk=node=>{if(node.nodeType!==1)return;if(node.namespaceURI===ns){if(node!==p&&node.localName==='p')return;if(node.localName==='del'||node.localName==='instrText')return;if(node.localName==='t'){text+=node.textContent||'';return}if(node.localName==='tab'){text+='\t';return}if(node.localName==='br'||node.localName==='cr'){text+='\n';return}}for(const child of node.childNodes)walk(child)};walk(p);size+=text.length+1;if(size>MAX_TEXT)throw Error('DOCX 提取的正文超过 100 万字符');out.push(text)}
 return out.join('\n');
}
root.NovelDocx={read:buffer=>xmlText(zipXml(buffer,root.fflate)),_zipXml:zipXml,_xmlText:xmlText};
})(globalThis);
