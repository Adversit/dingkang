/** Bounded, two-session production verification. No chat; credentials stay in memory. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';
import {getInteriorLayout,isInteriorWalkable,interiorSegmentClear,interiorExitAt,RIXIN_ID} from '../public/apps/jlu-campus/interior-layout.js';

if(!process.argv[2])throw new Error('用法：node tests/campus-interior-live.mjs <已发布URL> [脱敏报告.json]');
const origin=new URL(process.argv[2]).origin,layout=getInteriorLayout(RIXIN_ID),stamp=Date.now().toString(36);
const members=[],sockets=[],samples=[],checks=[],startedAt=new Date().toISOString();let requests=0;
const report={schemaVersion:1,site:origin,startedAt,purpose:'新版日新楼两独立会话 HTTP/WebSocket 室内短程验收，不发送聊天，不作为长期容量证明。',layoutRevision:layout.revision,checks,cleanup:{left:0,errors:[]}};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function own(member,snapshot){const player=snapshot?.players?.find(peer=>peer.id===member.id);if(snapshot?.room)member.room=snapshot.room;if(player){member.seq=Math.max(member.seq||0,player.seq);member.pose={x:player.x,y:player.y,direction:player.direction,moving:player.moving,interior:player.interior,interiorRevision:player.interiorRevision??null,interiorX:player.interiorX,interiorY:player.interiorY};}return player;}
async function api(route,{member,method='GET',body,status=200,label=route}={}){
  requests++;const start=performance.now();const response=await fetch(origin+'/api/campus/'+route,{method,headers:{...(member?{authorization:'Bearer '+member.token}:{}),...(method!=='GET'?{origin}:{}),...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(12000)});
  const value=await response.json();samples.push({kind:label,ms:performance.now()-start});
  if(response.status!==status)throw new Error(`${label} 返回 ${response.status}（预期 ${status}）：${value.code||'服务异常'}`);
  return value;
}
async function check(name,run){const start=performance.now();try{const extra=await run();checks.push({name,status:'passed',ms:Math.round(performance.now()-start),...(extra||{})});console.error('[室内验收] '+name+'：通过');}catch(error){checks.push({name,status:'failed',error:String(error.message||error)});throw error;}}
function open(member){return new Promise((resolve,reject)=>{
  const url=new URL('/api/campus/ws',origin);url.protocol=url.protocol==='https:'?'wss:':'ws:';
  const socket=new WebSocket(url,['campus-v1','campus-token.'+member.token]);sockets.push(socket);const queued=[],waiters=[];
  const pipe={socket,next(predicate,timeout=10000){const found=queued.findIndex(predicate);if(found>=0)return Promise.resolve(queued.splice(found,1)[0]);return new Promise((res,rej)=>{const item={predicate,res,rej,timer:null};item.timer=setTimeout(()=>{const i=waiters.indexOf(item);if(i>=0)waiters.splice(i,1);rej(new Error('WebSocket 室内响应超时'));},timeout);waiters.push(item);});}};
  const timer=setTimeout(()=>{socket.close();reject(new Error('WebSocket 握手超时'));},12000);
  socket.addEventListener('open',()=>{clearTimeout(timer);resolve(pipe);});socket.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('WebSocket 连接失败'));});
  socket.addEventListener('message',event=>{let value;try{value=JSON.parse(event.data);}catch{return;}const i=waiters.findIndex(item=>item.predicate(value));if(i>=0){const item=waiters.splice(i,1)[0];clearTimeout(item.timer);item.res(value);}else queued.push(value);});
});}
async function ws(pipe,member,input,{errorCode,label='ws_sync'}={}){
  const start=performance.now();pipe.socket.send(JSON.stringify(input));const value=await pipe.next(item=>item.type==='error'||item.type==='snapshot');samples.push({kind:label,ms:performance.now()-start});
  if(errorCode){assert.equal(value.type,'error');assert.equal(value.code,errorCode);assert.ok(value.snapshot,'rejected movement must provide a recovery snapshot');own(member,value.snapshot);return value.snapshot;}
  if(value.type==='error')throw new Error('WebSocket '+value.code);
  own(member,value);return value;
}
function moveInput(member,extra={}){return{type:'sync',...member.pose,roomId:member.room.id,seq:++member.seq,scope:'room',after:0,...extra};}
function exactPeer(snapshot,other){const peer=snapshot.players.find(player=>player.id===other.id);assert.ok(peer,'the other independent test identity must be visible');assert.equal(peer.interior,RIXIN_ID);assert.equal(peer.interiorRevision,layout.revision);assert.ok(Math.abs(peer.interiorX-other.pose.interiorX)<.001);assert.ok(Math.abs(peer.interiorY-other.pose.interiorY)<.001);}

try{
  await check('已发布共享布局与本地待验布局一致',async()=>{
    const health=await api('health');assert.equal(health.ok,true);assert.equal(health.storage,'d1');
    const response=await fetch(origin+'/apps/jlu-campus/interior-layout.js',{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(12000)});requests++;assert.equal(response.status,200);
    const deployed=await response.text(),local=fs.readFileSync(fileURLToPath(new URL('../public/apps/jlu-campus/interior-layout.js',import.meta.url)),'utf8'),hash=value=>createHash('sha256').update(value).digest('hex');
    assert.equal(hash(deployed),hash(local),'deployed layout is not the current local version; no test sessions were created');
    return{revision:layout.revision,width:layout.width,height:layout.height};
  });
  await check('两独立匿名会话只加入同一个临时验收房间',async()=>{
    const values=await Promise.all([0,1].map(i=>api('session',{method:'POST',body:{nickname:`室内验收${stamp.slice(-4)}-${i}`,appearance:{avatar:i}},status:201})));
    members.push(...values.map(value=>({...value.session,seq:0})));
    const initial=await api('rooms',{member:members[0],method:'POST',body:{title:`室内验收-${stamp}`,campus:'south'},status:201});own(members[0],initial);
    own(members[1],await api('join',{member:members[1],method:'POST',body:{roomId:initial.room.id}}));
    assert.notEqual(members[0].id,members[1].id);return{independentSessions:2,roomsCreated:1};
  });
  await check('HTTP 从受校验入口进入新版日新楼',async()=>{
    await Promise.all(members.map(async member=>own(member,await api('teleport',{member,method:'POST',body:{roomId:member.room.id,seq:++member.seq,poiId:RIXIN_ID}}))));
    await pause(120);
    await Promise.all(members.map(async member=>{const value=await api('sync',{member,method:'POST',body:moveInput(member,{interior:RIXIN_ID,interiorRevision:layout.revision,interiorX:layout.spawn.x,interiorY:layout.spawn.y}),label:'http_enter'});const self=own(member,value);assert.equal(self.interiorRevision,layout.revision);assert.equal(self.interiorX,layout.spawn.x);assert.equal(self.interiorY,layout.spawn.y);}));
  });
  let pipes;
  await check('WebSocket 室内合法移动及指定双方互见',async()=>{
    pipes=await Promise.all(members.map(open));await Promise.all(pipes.map(pipe=>pipe.next(value=>value.type==='ready')));
    await Promise.all(pipes.map((pipe,i)=>ws(pipe,members[i],{type:'snapshot',scope:'room',after:0},{label:'ws_initial_snapshot'})));
    const y=layout.spawn.y-.4;assert.ok(interiorSegmentClear(layout,[layout.spawn.x,layout.spawn.y],[layout.spawn.x,y]));await pause(150);
    await Promise.all(pipes.map((pipe,i)=>ws(pipe,members[i],moveInput(members[i],{interiorY:y,direction:'up',moving:true}))));
    const seen=await Promise.all(pipes.map((pipe,i)=>ws(pipe,members[i],{type:'snapshot',scope:'room',after:0},{label:'ws_peer_snapshot'})));
    exactPeer(seen[0],members[1]);exactPeer(seen[1],members[0]);return{connections:2,specificPeerIdentitiesChecked:true};
  });
  await check('退出请求早于门口同步时可恢复室内继续移动',async()=>{
    const member=members[0];assert.equal(interiorExitAt(layout,member.pose.interiorX,member.pose.interiorY),null);await pause(100);
    const error=await api('sync',{member,method:'POST',body:moveInput(member,{interior:null,interiorRevision:null,interiorX:null,interiorY:null}),status:409,label:'http_early_exit'});
    assert.equal(error.code,'EXIT_REQUIRED');assert.ok(error.snapshot);own(member,error.snapshot);assert.equal(member.pose.interiorRevision,layout.revision);
  });
  await check('WebSocket 拒绝穿入扶梯设施并返回原合法位置',async()=>{
    const member=members[0],before={...member.pose},facility=layout.objects.find(object=>object.kind==='escalator');assert.ok(facility);
    const blocked=[facility.x+facility.w/2,facility.y+facility.h-.5];assert.equal(isInteriorWalkable(layout,...blocked),false);
    const distance=Math.hypot(blocked[0]-before.interiorX,blocked[1]-before.interiorY);assert.ok(distance<layout.maxSpeed*2,'the collision probe must fit the speed allowance');await pause(Math.ceil(distance/layout.maxSpeed*1000)+150);
    await ws(pipes[0],member,moveInput(member,{interiorX:blocked[0],interiorY:blocked[1],moving:true}),{errorCode:'INTERIOR_COLLISION',label:'ws_collision_rejected'});
    assert.equal(member.pose.interiorX,before.interiorX);assert.equal(member.pose.interiorY,before.interiorY);
  });
  await check('主门与1号侧门各自退出到对应OSM门外点',async()=>{
    const doors=['main','left-south'].map(id=>layout.exits.find(item=>item.id===id)),targets=doors.map(exit=>[exit.x+exit.w/2,exit.y+exit.h/2]),starts=members.map(member=>[member.pose.interiorX,member.pose.interiorY]);
    for(let i=0;i<2;i++){assert.equal(interiorExitAt(layout,...targets[i])?.id,doors[i].id);assert.ok(interiorSegmentClear(layout,starts[i],targets[i]));}
    const distance=Math.max(...targets.map((target,i)=>Math.hypot(target[0]-starts[i][0],target[1]-starts[i][1]))),steps=Math.ceil(distance/8);
    for(let step=1;step<=steps;step++){
      await pause(Math.ceil(distance/steps/layout.maxSpeed*1000)+150);
      await Promise.all(pipes.map((pipe,i)=>ws(pipe,members[i],moveInput(members[i],{interiorX:starts[i][0]+(targets[i][0]-starts[i][0])*step/steps,interiorY:starts[i][1]+(targets[i][1]-starts[i][1])*step/steps,direction:i?'left':'down',moving:true}))));
    }
    await pause(100);
    await Promise.all(members.map(async(member,i)=>{const value=await api('sync',{member,method:'POST',body:moveInput(member,{interior:null,interiorRevision:null,interiorX:null,interiorY:null,moving:false}),label:'http_exit'});own(member,value);assert.equal(member.pose.interior,null);assert.equal(member.pose.x,doors[i].exterior[0]);assert.equal(member.pose.y,doors[i].exterior[1]);}));
    assert.notEqual(members[0].pose.x,members[1].pose.x);return{liveExitIds:doors.map(door=>door.id),allSevenDoorsCoveredByLocalServerTests:true};
  });
  await check('1号侧门原路进入对应室内出生点并再次退出',async()=>{
    const member=members[1],door=layout.exits.find(exit=>exit.id==='left-south');await pause(100);
    const entered=await api('sync',{member,method:'POST',body:moveInput(member,{interior:RIXIN_ID,interiorRevision:layout.revision,interiorX:door.spawn.x,interiorY:door.spawn.y}),label:'http_side_enter'});own(member,entered);
    assert.equal(member.pose.interiorX,door.spawn.x);assert.equal(member.pose.interiorY,door.spawn.y);assert.equal(member.pose.x,door.exterior[0]);assert.equal(member.pose.y,door.exterior[1]);
    const target=[door.x+door.w/2,door.y+door.h/2];assert.ok(interiorSegmentClear(layout,[member.pose.interiorX,member.pose.interiorY],target));
    await pause(Math.ceil(Math.hypot(target[0]-member.pose.interiorX,target[1]-member.pose.interiorY)/layout.maxSpeed*1000)+150);
    await ws(pipes[1],member,moveInput(member,{interiorX:target[0],interiorY:target[1],moving:true}),{label:'ws_side_reentry_move'});await pause(100);
    own(member,await api('sync',{member,method:'POST',body:moveInput(member,{interior:null,interiorRevision:null,interiorX:null,interiorY:null,moving:false}),label:'http_side_exit'}));
    assert.equal(member.pose.interior,null);assert.equal(member.pose.x,door.exterior[0]);assert.equal(member.pose.y,door.exterior[1]);return{liveEntryId:door.id};
  });
}catch(error){report.error=String(error.message||error);}
finally{
  for(const socket of sockets)try{socket.close(1000,'室内验收结束');}catch{}
  for(const member of members)if(member.room)try{await api('leave',{member,method:'POST',body:{roomId:member.room.id}});report.cleanup.left++;}catch(error){report.cleanup.errors.push(String(error.message||error));}
  const percentile=(values,p)=>{if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b);return Math.round(sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)]*100)/100;};
  report.latency=Object.fromEntries([...new Set(samples.map(sample=>sample.kind))].map(kind=>{const values=samples.filter(sample=>sample.kind===kind).map(sample=>sample.ms);return[kind,{samples:values.length,p50Ms:percentile(values,.5),p95Ms:percentile(values,.95)}];}));
  report.requests=requests;report.finishedAt=new Date().toISOString();report.passed=!report.error&&!report.cleanup.errors.length&&checks.every(check=>check.status==='passed');
  const json=JSON.stringify(report,null,2);if(process.argv[3]){const output=path.resolve(process.argv[3]);fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,json+'\n');}console.log(json);process.exitCode=report.passed?0:1;
}
