/** Two-session, short-duration transport follow-up. Session secrets stay in memory. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
const origin=new URL(process.argv[2]||'http://invalid').origin;
if(!process.argv[2])throw new Error('用法：node tests/campus-transport-live.mjs <发布URL> <报告.json> [本任务已知QA房间code]');
const allowedCodes=new Set(process.argv.slice(4)),members=[],sockets=[],messages=[],samples=[],checks=[];
const stamp=Date.now().toString(36),startedAt=new Date().toISOString();let requests=0;
const report={schemaVersion:1,site:origin,startedAt,purpose:'批处理优化后的两会话短程复测；不等同于长期负载容量。',checks,cleanup:{left:0,deleted:0,errors:[]}};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function own(member,snapshot){if(!snapshot?.room)return;member.room=snapshot.room;const player=snapshot.players.find(peer=>peer.id===member.id);if(player){member.x=player.x;member.y=player.y;member.seq=Math.max(member.seq||0,player.seq);}}
async function api(route,{member,method='GET',body,status=200,label=route.split('?')[0]}={}){
  requests++;const start=performance.now();const result=await fetch(origin+'/api/campus/'+route,{method,headers:{...(member?{authorization:'Bearer '+member.token}:{}),...(method!=='GET'?{origin}:{}),...(body!==undefined?{'content-type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(12000)});
  const value=await result.json();samples.push({kind:label,ms:performance.now()-start});
  if(result.status!==status)throw new Error(route+` 返回 ${result.status}（预期 ${status}）：`+(value.code||'服务异常'));
  return value;
}
async function check(name,fn){const start=performance.now();try{const result=await fn();checks.push({name,status:result?.skipped?'skipped':'passed',ms:Math.round(performance.now()-start),...(result||{})});console.error('[校园复测] '+name+'：'+(result?.skipped?'跳过':'通过'));}catch(error){checks.push({name,status:'failed',error:String(error.message||error)});throw error;}}
function open(member){return new Promise((resolve,reject)=>{
  const url=new URL('/api/campus/ws',origin);url.protocol=url.protocol==='https:'?'wss:':'ws:';
  const socket=new WebSocket(url,['campus-v1','campus-token.'+member.token]);sockets.push(socket);
  const queued=[],waiters=[];
  const pipe={socket,send(value){socket.send(JSON.stringify(value));},next(predicate,timeout=10000){const i=queued.findIndex(predicate);if(i>=0)return Promise.resolve(queued.splice(i,1)[0]);return new Promise((res,rej)=>{const item={predicate,res,rej,timer:null};item.timer=setTimeout(()=>{waiters.splice(waiters.indexOf(item),1);rej(new Error('WebSocket 消息超时'));},timeout);waiters.push(item);});}};
  const timer=setTimeout(()=>{socket.close();reject(new Error('WebSocket 握手超时'));},12000);
  socket.addEventListener('open',()=>{clearTimeout(timer);resolve(pipe);});
  socket.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('WebSocket 连接失败'));});
  socket.addEventListener('message',event=>{let value;try{value=JSON.parse(event.data);}catch{return;}const i=waiters.findIndex(item=>item.predicate(value));if(i>=0){const item=waiters.splice(i,1)[0];clearTimeout(item.timer);item.res(value);}else queued.push(value);});
});}
async function wsCall(pipe,member,payload,label){const start=performance.now();pipe.send(payload);const result=await pipe.next(value=>value.type==='error'||value.type==='snapshot'&&(!payload.seq||label==='ws_cache_refresh'||value.players.some(peer=>peer.id===member.id&&peer.seq>=payload.seq)));if(result.type==='error')throw new Error('WebSocket '+result.code+'：'+result.error);samples.push({kind:label,ms:performance.now()-start});own(member,result);return result;}
async function httpSync(member){const result=await api('sync',{member,method:'POST',body:{roomId:member.room.id,seq:++member.seq,x:member.x,y:member.y,direction:'down',moving:false,interior:null,after:0,scope:'room'},label:'http_sync'});own(member,result);return result;}
try{
  await check('连接预热及数据库往返基线',async()=>{await api('health',{label:'cold_health'});for(let i=0;i<3;i++)await Promise.all([api('me',{status:401,label:'warm_no_database'}),api('health',{label:'warm_one_database'})]);});
  await check('两独立会话和真实同房',async()=>{
    const data=await Promise.all([0,1].map(i=>api('session',{method:'POST',body:{nickname:`复测${stamp.slice(-4)}-${i}`,appearance:{avatar:i}},status:201})));
    members.push(...data.map(value=>({...value.session,seq:0,room:null})));
    const first=await api('rooms',{member:members[0],method:'POST',body:{title:`联机复测-${stamp}`,campus:'south'},status:201});own(members[0],first);
    own(members[1],await api('join',{member:members[1],method:'POST',body:{roomId:first.room.id}}));
  });
  await check('HTTP 同步往返',async()=>{for(let i=0;i<3;i++){await pause(110);await Promise.all(members.map(httpSync));}});
  let pipes;
  await check('WebSocket 稳态同步与相互可见',async()=>{
    pipes=await Promise.all(members.map(open));await Promise.all(pipes.map(pipe=>pipe.next(value=>value.type==='ready')));
    await Promise.all(pipes.map((pipe,i)=>wsCall(pipe,members[i],{type:'snapshot',scope:'room',after:0},'ws_initial_snapshot')));
    for(let tick=0;tick<6;tick++){
      await pause(110);
      await Promise.all(pipes.map((pipe,i)=>{const member=members[i];return wsCall(pipe,member,{type:'sync',roomId:member.room.id,seq:++member.seq,x:member.x+(tick%2?-.2:.2),y:member.y,direction:i?'left':'right',moving:true,interior:null,after:0,scope:'room'},'ws_steady_sync');}));
    }
    const seen=await wsCall(pipes[1],members[1],{type:'snapshot',scope:'room',after:0},'ws_snapshot');
    assert.ok(Math.abs(seen.players.find(peer=>peer.id===members[0].id).x-members[0].x)<0.001);
    return {connections:2,syncSamples:12};
  });
  await check('WebSocket 重连和HTTP并发写后的权威序号',async()=>{
    await pause(110);await httpSync(members[0]);
    await pause(110);const member=members[0];
    const snapshot=await wsCall(pipes[0],member,{type:'sync',roomId:member.room.id,seq:++member.seq,x:member.x,y:member.y,direction:'up',moving:false,interior:null,after:0,scope:'room'},'ws_cache_refresh');
    assert.ok(snapshot.players.find(peer=>peer.id===member.id).seq<=member.seq);
    pipes[0].socket.close(1000,'重连测试');pipes[0]=await open(member);await pipes[0].next(value=>value.type==='ready');
    assert.equal((await wsCall(pipes[0],member,{type:'snapshot',scope:'room',after:0},'ws_reconnect_snapshot')).selfId,member.id);
    for(const pipe of pipes)pipe.socket.close(1000,'复测结束');
  });
  await check('已知QA范围内的广场跨房共享',async()=>{
    const rooms=(await api('rooms?campus=south',{member:members[0]})).rooms;
    const ownRoom=members[0].room.id;
    if(rooms.some(room=>room.players>0&&room.id!==ownRoom&&!allowedCodes.has(room.code)))return {skipped:true,reason:'存在不在本任务白名单内的在线房间，未写入公共广场。'};
    own(members[1],await api('rooms',{member:members[1],method:'POST',body:{title:`广场复测-${stamp}`,campus:'south'},status:201}));
    await httpSync(members[0]);
    const text=`[自动验收 ${stamp}] 广场跨房测试，随即删除`;
    const sent=await api('messages',{member:members[0],method:'POST',body:{roomId:members[0].room.id,text,scope:'plaza'}});
    const entry=sent.messages.find(message=>message.playerId===members[0].id&&message.text===text);assert.ok(entry);messages.push({id:entry.id,member:members[0]});
    const received=await api('messages?scope=plaza',{member:members[1]});assert.ok(received.messages.some(message=>message.id===entry.id));
    await api('messages/'+entry.id,{member:members[0],method:'DELETE'});messages[0].deleted=true;report.cleanup.deleted++;
  });
}catch(error){report.error=String(error.message||error);}
finally{
  for(const socket of sockets)try{socket.close(1000,'测试收尾');}catch{}
  for(const entry of messages)if(!entry.deleted)try{await api('messages/'+entry.id,{member:entry.member,method:'DELETE'});report.cleanup.deleted++;}catch(error){report.cleanup.errors.push(String(error.message||error));}
  for(const member of members)if(member.room)try{await api('leave',{member,method:'POST',body:{roomId:member.room.id}});report.cleanup.left++;}catch(error){report.cleanup.errors.push(String(error.message||error));}
  const percent=(array,p)=>{if(!array.length)return null;const sorted=[...array].sort((a,b)=>a-b);return Math.round(sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)]*100)/100;};
  report.latency=Object.fromEntries([...new Set(samples.map(sample=>sample.kind))].map(kind=>{const values=samples.filter(sample=>sample.kind===kind).map(sample=>sample.ms);return [kind,{samples:values.length,p50Ms:percent(values,.5),p95Ms:percent(values,.95)}];}));
  report.requests=requests;report.finishedAt=new Date().toISOString();report.passed=!report.error&&!report.cleanup.errors.length&&checks.every(item=>item.status==='passed');
  const json=JSON.stringify(report,null,2);if(process.argv[3]){const output=path.resolve(process.argv[3]);fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,json+'\n');}console.log(json);process.exitCode=report.passed?0:1;
}
