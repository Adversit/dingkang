/** Bounded production acceptance. Tokens exist only in memory and are never logged. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';

const supplied=process.argv[2];
if(!supplied) {console.error('用法：node tests/campus-live.mjs https://已发布站点 [报告.json]');process.exit(2);}
const origin=new URL(supplied).origin;
if(!/^https:\/\//.test(origin)&&!/^http:\/\/(localhost|127\.0\.0\.1)(:|$)/.test(origin))throw new Error('只接受 HTTPS 已发布站点或本地测试地址。');
const startedAt=new Date().toISOString(),stamp=Date.now().toString(36),members=[],ownMessages=[],sockets=[],timings=[],checks=[];
let requestCount=0,stopped=false,heartbeatTimer,deadlineTimer;
const deadline=Date.now()+180_000;
const report={schemaVersion:1,site:origin,startedAt,scope:'9 个独立匿名会话、最多 8 人一房的有限验收；不代表长期容量或所有网络环境。',checks,transports:{http:false,websocket:false},cleanup:{messagesDeleted:0,sessionsLeft:0,errors:[]}};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const percentile=(list,fraction)=>{if(!list.length)return null;const sorted=[...list].sort((a,b)=>a-b);return Math.round(sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*fraction)-1)]*100)/100;};
function adopt(member,snapshot) {
  if(snapshot?.type!=='snapshot')return;
  member.room=snapshot.room;const self=snapshot.players.find(peer=>peer.id===member.id);
  if(self){member.x=self.x;member.y=self.y;member.direction=self.direction;member.interior=self.interior;member.interiorX=self.interiorX;member.interiorY=self.interiorY;member.seq=Math.max(member.seq||0,self.seq);}
}
async function request(endpoint,{member,method='GET',body,status=200,cleanup=false}={}) {
  if(!cleanup&&Date.now()>deadline)throw new Error('验收达到三分钟上限，已停止新增请求。');
  const start=performance.now();requestCount++;
  const result=await fetch(origin+'/api/campus/'+endpoint,{method,headers:{...(member?{authorization:'Bearer '+member.token}:{}),...(method!=='GET'?{origin}:{}),...(body!==undefined?{'content-type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15_000)});
  timings.push({transport:'http',route:endpoint.split('?')[0].replace(/messages\/\d+/,'messages/:id'),ms:performance.now()-start,status:result.status});
  let data;try{data=await result.json();}catch{throw new Error(`${endpoint.split('?')[0]} 未返回 JSON（HTTP ${result.status}）。`);}
  if(result.status!==status){if(member&&data.type==='snapshot')adopt(member,data);throw new Error(`${endpoint.split('?')[0]}：预期 HTTP ${status}，实际 ${result.status}；${data.code||'未知错误'}：${data.error||''}`);}
  return data;
}
async function step(name,fn,{optional=false}={}) {
  const start=performance.now();
  try {const detail=await fn();checks.push({name,status:detail?.skipped?'skipped':'passed',durationMs:Math.round(performance.now()-start),...(detail||{})});console.error(`[校园验收] ${name}：${detail?.skipped?'跳过':'通过'}`);return detail;}
  catch(error){checks.push({name,status:'failed',durationMs:Math.round(performance.now()-start),error:String(error.message||error)});console.error(`[校园验收] ${name}：失败`);if(!optional)throw error;}
}
function serialize(member,fn) {
  const current=(member.chain||Promise.resolve()).catch(()=>{}).then(fn);
  member.chain=current;return current;
}
function sync(member,changes={}) {
  return serialize(member,async()=>{
    if(!member.room)return null;
    const roomId=member.room.id;
    const data=await request('sync',{member,method:'POST',body:{roomId,seq:++member.seq,x:member.x,y:member.y,direction:member.direction||'down',moving:false,interior:member.interior||null,interiorX:member.interiorX??null,interiorY:member.interiorY??null,after:0,...changes}});
    if(member.room?.id===roomId)adopt(member,data);
    return data;
  });
}
async function postMessage(member,text,scope='room') {
  const data=await request('messages',{member,method:'POST',body:{roomId:member.room.id,text,scope}});
  const message=data.messages.find(message=>message.playerId===member.id&&message.text===text);
  assert.ok(message,'本人的测试消息应出现在返回快照中');ownMessages.push({member,id:message.id});return message;
}
async function deleteMessage(entry) {
  if(entry.deleted)return;
  await request('messages/'+entry.id,{member:entry.member,method:'DELETE',cleanup:true});entry.deleted=true;report.cleanup.messagesDeleted++;
}
async function teleport(member,poiId) {
  return serialize(member,async()=>{const data=await request('teleport',{member,method:'POST',body:{roomId:member.room.id,poiId,seq:++member.seq}});adopt(member,data);return data;});
}
function openSocket(member) {
  return new Promise((resolve,reject)=>{
    const url=new URL('/api/campus/ws',origin);url.protocol=url.protocol==='https:'?'wss:':'ws:';
    const socket=new WebSocket(url,['campus-v1','campus-token.'+member.token]);sockets.push(socket);
    const messages=[],waiters=[];let failed=null;
    const receive=data=>{
      const waiter=waiters.find(item=>item.predicate(data));
      if(waiter){waiters.splice(waiters.indexOf(waiter),1);clearTimeout(waiter.timer);waiter.resolve(data);}else messages.push(data);
    };
    const wrapper={socket,async next(predicate,timeout=10_000){const found=messages.findIndex(predicate);if(found>=0)return messages.splice(found,1)[0];if(failed)throw failed;return new Promise((res,rej)=>{const item={predicate,resolve:res,reject:rej,timer:null};item.timer=setTimeout(()=>{waiters.splice(waiters.indexOf(item),1);rej(new Error('WebSocket 等待消息超时。'));},timeout);waiters.push(item);});},send(data){socket.send(JSON.stringify(data));},close(){socket.close(1000,'验收完成');}};
    const timeout=setTimeout(()=>{socket.close();reject(new Error('WebSocket 升级超时。'));},12_000);
    socket.addEventListener('open',()=>{clearTimeout(timeout);resolve(wrapper);});
    socket.addEventListener('message',event=>{try{receive(JSON.parse(String(event.data)));}catch{failed=new Error('WebSocket 返回了无效 JSON。');}});
    socket.addEventListener('error',()=>{failed=new Error('WebSocket 握手或连接失败。');clearTimeout(timeout);reject(failed);for(const item of waiters){clearTimeout(item.timer);item.reject(failed);}waiters.length=0;});
  });
}
async function socketSnapshot(socket,member,extra={}) {
  const start=performance.now();socket.send({type:'snapshot',after:0,scope:'room',...extra});
  const result=await socket.next(data=>data.type==='snapshot'||data.type==='error');
  if(result.type==='error')throw new Error('WebSocket '+result.code+'：'+result.error);
  timings.push({transport:'websocket',route:'snapshot',ms:performance.now()-start,status:200});adopt(member,result);return result;
}

try {
  await step('数据库及传输能力健康检查',async()=>{const health=await request('health');assert.equal(health.ok,true);assert.equal(health.storage,'d1');assert.equal(health.maxPlayers,8);return {maxPlayers:health.maxPlayers,workerWebSocketApi:health.websocketSupported};});
  await step('创建九个独立匿名身份',async()=>{
    for(let batch=0;batch<3;batch++){const created=await Promise.all([0,1,2].map(async offset=>{const i=batch*3+offset;const data=await request('session',{method:'POST',body:{nickname:`验收${stamp.slice(-4)}-${i}`,appearance:{avatar:i%8}},status:201});return {...data.session,seq:0,room:null};}));members.push(...created);}
    assert.equal(new Set(members.map(member=>member.id)).size,9);return {count:9};
  });
  await step('八人真实同房与第九人容量拒绝',async()=>{
    const first=await request('rooms',{member:members[0],method:'POST',body:{title:`验收A-${stamp}`,campus:'south'},status:201});adopt(members[0],first);
    heartbeatTimer=setInterval(()=>{if(!stopped)for(const member of members)if(member.room)void sync(member).catch(()=>{});},6000);
    deadlineTimer=setTimeout(()=>{stopped=true;clearInterval(heartbeatTimer);},180_000);
    await Promise.all(members.slice(1,8).map(async member=>{const joined=await request('join',{member,method:'POST',body:{roomId:first.room.id}});adopt(member,joined);}));
    await request('join',{member:members[8],method:'POST',body:{roomId:first.room.id},status:409});
    const second=await request('rooms',{member:members[8],method:'POST',body:{title:`验收B-${stamp}`,campus:'south'},status:201});adopt(members[8],second);
    const snap=await request('snapshot',{member:members[0]});assert.equal(snap.players.length,8);assert.equal(snap.players.some(player=>player.id===members[8].id),false);
    report.transports.http=true;return {simultaneousPlayers:8,overflowRejected:true};
  });
  // Keep the nine test actors present at a low rate, below one request per player per five seconds.
  await step('HTTP 移动互见、房间隔离与防伪造',async()=>{
    await sleep(110);const x=members[0].x+0.2;await sync(members[0],{x,moving:true});
    const peer=await request('snapshot',{member:members[1]});assert.ok(Math.abs(peer.players.find(player=>player.id===members[0].id).x-x)<0.001);
    const separated=await request('snapshot',{member:members[8]});assert.equal(separated.players.length,1);
    const fakeToken=members[0].id+'.'+members[1].token.split('.')[1];await request('me',{member:{token:fakeToken},status:401});
    const roomId=members[0].room.id;
    await request('sync',{member:members[0],method:'POST',body:{roomId:members[8].room.id,seq:++members[0].seq,x:members[0].x,y:members[0].y,direction:'down'},status:409});
    assert.equal((await request('snapshot',{member:members[0]})).room.id,roomId);
  });
  await step('房内聊天持久化、本人删除与房间隔离',async()=>{
    const message=await postMessage(members[0],`[自动验收 ${stamp}] 房内消息`);
    const peer=await request('messages?scope=room',{member:members[1]});assert.ok(peer.messages.some(item=>item.id===message.id));
    const isolated=await request('messages?scope=room',{member:members[8]});assert.equal(isolated.messages.some(item=>item.id===message.id),false);
    await request('messages/'+message.id,{member:members[1],method:'DELETE',status:403});
    await deleteMessage(ownMessages.at(-1));
    assert.equal((await request('messages?scope=room',{member:members[1]})).messages.find(item=>item.id===message.id).deleted,true);
  });
  await step('同校区广场跨测试房间共享',async()=>{
    const rooms=(await request('rooms?campus=south',{member:members[0]})).rooms;
    const ownRooms=new Set(members.filter(member=>member.room).map(member=>member.room.id));
    if(rooms.some(room=>room.players>0&&!ownRooms.has(room.id)))return {skipped:true,reason:'检测到其他在线房间，为避免向真实玩家显示测试消息，未执行广场写入。'};
    const message=await postMessage(members[0],`[自动验收 ${stamp}] 广场连通性检查，随即删除`,'plaza');
    const other=await request('messages?scope=plaza',{member:members[8]});assert.ok(other.messages.some(item=>item.id===message.id));
    await deleteMessage(ownMessages.at(-1));
  });
  await step('地图白名单传送与同室内坐标同步',async()=>{
    const first=members[0],second=members[1];
    await teleport(first,'way/1473651054');await teleport(second,'way/1473651054');await sleep(110);
    await sync(first,{interior:'way/1473651054',interiorX:95,interiorY:123});
    await sync(second,{interior:'way/1473651054',interiorX:95,interiorY:123});await sleep(110);
    await sync(first,{interior:'way/1473651054',interiorX:95,interiorY:122});
    const snap=await request('snapshot',{member:second});const seen=snap.players.find(peer=>peer.id===first.id);assert.equal(seen.interior,'way/1473651054');assert.equal(seen.interiorY,122);
    await sleep(110);await sync(first,{interior:null,interiorX:null,interiorY:null});await sync(second,{interior:null,interiorX:null,interiorY:null});
  });
  await step('WebSocket 升级、双客户端移动与断线重连',async()=>{
    const a=await openSocket(members[0]),b=await openSocket(members[1]);
    await a.next(data=>data.type==='ready');await b.next(data=>data.type==='ready');
    await socketSnapshot(a,members[0]);await socketSnapshot(b,members[1]);
    await serialize(members[0],async()=>{
      await sleep(110);const member=members[0],seq=++member.seq,start=performance.now();
      a.send({type:'sync',roomId:member.room.id,seq,x:member.x,y:member.y,direction:'right',moving:false,interior:null,after:0,scope:'room'});
      const result=await a.next(data=>data.type==='error'||data.type==='snapshot'&&data.players.some(peer=>peer.id===member.id&&peer.seq===seq));
      if(result.type==='error')throw new Error('WebSocket 移动失败：'+result.code);adopt(member,result);timings.push({transport:'websocket',route:'sync',ms:performance.now()-start,status:200});
    });
    const seen=await socketSnapshot(b,members[1]);assert.equal(seen.players.find(peer=>peer.id===members[0].id).direction,'right');
    a.close();const reconnected=await openSocket(members[0]);await reconnected.next(data=>data.type==='ready');
    const recovered=await socketSnapshot(reconnected,members[0]);assert.equal(recovered.selfId,members[0].id);assert.equal(recovered.room.id,members[1].room.id);
    report.transports.websocket=true;a.close();b.close();reconnected.close();
    return {independentConnections:2,reconnected:true};
  },{optional:true});
  await step('北区独立地图和切房后旧离开请求隔离',async()=>{
    const member=members[8],old=member.room.id;
    await serialize(member,async()=>{const snap=await request('rooms',{member,method:'POST',body:{title:`验收北-${stamp}`,campus:'north'},status:201});member.seq=0;adopt(member,snap);});
    await request('leave',{member,method:'POST',body:{roomId:old}});
    const snap=await request('snapshot',{member});assert.equal(snap.room.campus,'north');assert.equal(snap.players.length,1);
    await sleep(110);await sync(member);return {campus:'north'};
  });
} catch(error) {
  report.error=String(error.message||error);
} finally {
  stopped=true;clearInterval(heartbeatTimer);clearTimeout(deadlineTimer);
  for(const socket of sockets)try{socket.close(1000,'验收结束');}catch{}
  await Promise.allSettled(members.map(member=>member.chain));
  for(const entry of ownMessages)try{await deleteMessage(entry);}catch(error){report.cleanup.errors.push('测试消息删除失败：'+String(error.message||error));}
  for(const member of members)if(member.room)try{await request('leave',{member,method:'POST',body:{roomId:member.room.id},cleanup:true});member.room=null;report.cleanup.sessionsLeft++;}catch(error){report.cleanup.errors.push('测试会话离房失败：'+String(error.message||error));}
  report.finishedAt=new Date().toISOString();report.requestCount=requestCount;
  report.latency=Object.fromEntries(['http','websocket'].map(transport=>{const values=timings.filter(item=>item.transport===transport).map(item=>item.ms);return [transport,{samples:values.length,p50Ms:percentile(values,0.5),p95Ms:percentile(values,0.95),maxMs:values.length?Math.round(Math.max(...values)*100)/100:null}];}));
  report.passed=checks.every(check=>check.status==='passed')&&!report.error&&!report.cleanup.errors.length;
  report.note='仅为本次短时验收的真实响应数据；空测试房间可能作为历史记录保留，所有成功清理的测试角色已离线。';
  const json=JSON.stringify(report,null,2);
  if(process.argv[3]){const destination=path.resolve(process.argv[3]);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,json+'\n');}
  console.log(json);process.exitCode=report.passed?0:1;
}
