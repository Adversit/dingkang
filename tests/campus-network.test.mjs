import test from 'node:test';
import assert from 'node:assert/strict';
import { CampusNetwork } from '../public/apps/jlu-campus/network.js';

const snapshot = (roomId, x=1) => ({type:'snapshot',protocol:1,serverTime:1000,selfId:'visitor',room:{id:roomId,code:'ABC123',title:roomId,campus:'south',maxPlayers:8},players:[{id:'visitor',nickname:'测试访客',appearance:{avatar:3},x,y:2,seq:1,direction:'down',moving:false}],messages:[],lastMessageId:0});
function browser(t) {
  const previous = new Map(['document','WebSocket','sessionStorage'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  const stored = new Map();
  globalThis.document = {hidden:false};
  globalThis.WebSocket = {OPEN:1,CONNECTING:0};
  globalThis.sessionStorage = {getItem:key=>stored.get(key)??null,setItem:(key,value)=>stored.set(key,String(value)),removeItem:key=>stored.delete(key)};
  t.after(()=>{for(const [key,descriptor] of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
  return stored;
}
function deferred() {let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}

test('a previous-room HTTP snapshot cannot replace a newly joined room',async t=>{
  browser(t); const old=deferred(), accepted=[];
  const net=new CampusNetwork({onSnapshot:data=>accepted.push(data.room?.id)});
  net.room={id:'old-room'};net.position={x:1,y:2};net.session={id:'visitor',token:'test-only'};net.stopped=false;net.wsAllowed=false;
  net.request=()=>old.promise;net.schedule=()=>{};net.startTransport=()=>{};
  const pending=net.tick();
  net.resetRoom(snapshot('new-room',50));
  old.resolve(snapshot('old-room',2));await pending;
  assert.equal(net.room.id,'new-room');
  assert.equal(net.position.x,50);
  assert.deepEqual(accepted,['new-room']);
  net.destroy();
});

test('leaving during an HTTP sync does not resurrect the old room or restart its polling',async t=>{
  browser(t);const old=deferred(),emitted=[];let schedules=0;
  const net=new CampusNetwork({onSnapshot:data=>emitted.push(data.room?.id||null)});
  net.room={id:'old-room'};net.position={x:1,y:2};net.session={id:'visitor',token:'test-only'};net.stopped=false;net.wsAllowed=false;
  net.request=path=>path==='/leave'?Promise.resolve({ok:true}):old.promise;
  net.schedule=()=>{schedules++;};
  const pending=net.tick();await net.leave();
  old.resolve(snapshot('old-room'));await pending;
  assert.equal(net.room,null);assert.equal(net.stopped,true);assert.equal(schedules,0);
  assert.deepEqual(emitted,[null]);
});

test('temporary profile lookup failure preserves the saved identity instead of creating another',async t=>{
  const stored=browser(t);const saved={id:'visitor',token:'test-only',nickname:'测试访客',appearance:{avatar:3}};
  stored.set('jlu-campus-session-v1',JSON.stringify(saved));const calls=[];
  const net=new CampusNetwork();net.request=async path=>{calls.push(path);throw Error('temporarily offline');};
  await assert.rejects(net.initialize({nickname:'测试访客',avatar:3}),/temporarily offline/);
  assert.deepEqual(calls,['/me']);assert.deepEqual(JSON.parse(stored.get('jlu-campus-session-v1')),saved);
});

test('server-confirmed expired identity is replaced and stored once',async t=>{
  const stored=browser(t);stored.set('jlu-campus-session-v1',JSON.stringify({id:'expired',token:'expired-test-token'}));
  const next={id:'new-visitor',token:'new-test-token',nickname:'测试访客',appearance:{avatar:3}},calls=[];
  const net=new CampusNetwork();net.request=async path=>{calls.push(path);if(path==='/me'){const error=Error('expired');error.status=401;throw error;}return{session:next};};
  assert.deepEqual(await net.initialize({nickname:'测试访客',avatar:3}),next);
  assert.deepEqual(calls,['/me','/session']);assert.deepEqual(JSON.parse(stored.get('jlu-campus-session-v1')),next);
});

test('switching chat scope ignores an old message response and restarts with the new cursor',async t=>{
  browser(t);const sent=deferred(),events=[];
  const net=new CampusNetwork({onSnapshot:data=>events.push(data.messages)});
  net.room={id:'room'};net.session={id:'visitor',token:'test-only'};net.startTransport=()=>{};
  const roomMessage={id:2,scope:'room',text:'房间消息'},plazaMessage={id:800,scope:'plaza',text:'广场消息'};
  net.request=path=>path==='/messages'?sent.promise:Promise.resolve({...snapshot('room'),messages:[roomMessage],lastMessageId:2});
  const pending=net.sendMessage('广场消息');
  await net.setScope('room');
  sent.resolve({...snapshot('room'),messages:[plazaMessage],lastMessageId:800});await pending;
  assert.equal(net.scope,'room');assert.equal(net.lastMessageId,2);
  assert.deepEqual([...net.messageCache.values()],[roomMessage]);assert.deepEqual(events,[[roomMessage]]);
  net.destroy();
});

test('pending history from another room cannot enter the current chat',async t=>{
  browser(t);const history=deferred();
  const net=new CampusNetwork();net.startTransport=()=>{};net.resetRoom(snapshot('old-room'));
  net.messageCache.set(40,{id:40,scope:'plaza',text:'旧校区消息'});net.request=()=>history.promise;
  const pending=net.loadOlderMessages();net.resetRoom({...snapshot('new-room'),messages:[{id:50,scope:'plaza',text:'新校区消息'}],lastMessageId:50});
  history.resolve({messages:[{id:20,scope:'plaza',text:'更早旧消息'}],hasMore:true});await pending;
  assert.equal(net.room.id,'new-room');assert.deepEqual([...net.messageCache.keys()],[50]);
  net.destroy();
});

test('deletion finishing after leave cannot issue a new snapshot read',async t=>{
  browser(t);const deletion=deferred(),calls=[];
  const net=new CampusNetwork();net.room={id:'room'};net.session={id:'visitor',token:'test-only'};
  net.request=path=>{calls.push(path);return path==='/messages/25'?deletion.promise:Promise.resolve({ok:true});};
  const pending=net.deleteMessage(25);await net.leave();deletion.resolve({ok:true,id:25});await pending;
  assert.deepEqual(calls,['/messages/25','/leave']);assert.equal(net.room,null);assert.equal(net.stopped,true);
});

test('a pending leave response cannot erase a later successfully joined room',async t=>{
  browser(t);const leaving=deferred();
  const net=new CampusNetwork();net.room={id:'old-room'};net.session={id:'visitor',token:'test-only'};net.startTransport=()=>{};
  net.request=()=>leaving.promise;const pending=net.leave();net.resetRoom(snapshot('new-room'));
  leaving.resolve({ok:true});await pending;
  assert.equal(net.room?.id,'new-room');assert.equal(net.stopped,false);net.destroy();
});

test('joining another campus waits for its map before reconciling coordinates or syncing',async t=>{
  browser(t);const ready=deferred(),entered=deferred(),events=[];
  const net=new CampusNetwork({onBeforeRoomChange:async room=>{events.push('loading:'+room.campus);entered.resolve();await ready.promise;events.push('loaded');},onReconcile:()=>events.push('reconcile')});
  net.room={id:'south-room',campus:'south'};net.session={id:'visitor',token:'test-only'};
  const next=snapshot('north-room',660.76);next.room.campus='north';
  net.request=async()=>next;net.startTransport=()=>events.push('sync');
  const pending=net.join('north-room');await entered.promise;
  assert.equal(net.stopped,true);assert.deepEqual(events,['loading:north']);
  ready.resolve();await pending;
  assert.deepEqual(events,['loading:north','loaded','reconcile','sync']);assert.equal(net.room.campus,'north');assert.equal(net.position.x,660.76);net.destroy();
});

test('a room-scoped join does not skip history because the initial snapshot contains plaza IDs',async t=>{
  browser(t);const net=new CampusNetwork();net.scope='room';net.startTransport=()=>{};
  const initial={...snapshot('room'),messages:[{id:900,scope:'plaza',text:'广场消息'}],lastMessageId:900};
  net.resetRoom(initial);
  assert.equal(net.lastMessageId,0);assert.equal(net.messageCache.size,0);
  net.accept({...snapshot('room'),messages:[{id:12,scope:'room',text:'房间历史'}],lastMessageId:12});
  assert.equal(net.lastMessageId,12);assert.deepEqual([...net.messageCache.keys()],[12]);net.destroy();
});

test('resume keeps the selected chat scope and replaces stale cached history',async t=>{
  browser(t);const net=new CampusNetwork(),paths=[];net.startTransport=()=>{};
  net.room={id:'room'};net.session={id:'visitor',token:'test-only'};net.scope='room';net.lastMessageId=100;
  net.messageCache.set(1,{id:1,scope:'room',text:'离线期间已撤回的旧消息'});
  net.messageCache.set(100,{id:100,scope:'room',text:'旧版本'});
  const fresh={id:100,scope:'room',text:'',deleted:true};
  net.request=async path=>{paths.push(path);return{...snapshot('room'),messages:[fresh],lastMessageId:100};};
  await net.resume();
  assert.equal(net.scope,'room');assert.ok(paths.some(p=>p.includes('after=0')&&p.includes('scope=room')));
  assert.deepEqual([...net.messageCache.values()],[fresh]);net.destroy();
});

test('HTTP recovery resets the message cursor and drops obsolete text from the cache',async t=>{
  browser(t);const net=new CampusNetwork(),payloads=[];let attempts=0;
  net.room={id:'room'};net.session={id:'visitor',token:'test-only'};net.position={x:1,y:2};net.stopped=false;net.wsAllowed=false;net.schedule=()=>{};
  net.lastMessageId=40;net.messageCache.set(2,{id:2,scope:'plaza',text:'恢复后不应保留的旧文本'});
  const fresh={id:50,scope:'plaza',text:'当前消息'};
  net.request=async(path,options)=>{payloads.push(options.body);if(attempts++===0)throw Error('temporary offline');return{...snapshot('room'),messages:[fresh],lastMessageId:50};};
  await net.tick();assert.equal(net.failures,1);await net.tick();
  assert.equal(payloads[1].after,0);assert.equal(net.failures,0);assert.deepEqual([...net.messageCache.values()],[fresh]);net.destroy();
});

test('HTTP movement preserves the interior revision while ordinary acknowledgements keep local progress',async t=>{
  browser(t);const reconciled=[],sent=[],net=new CampusNetwork({onReconcile:p=>reconciled.push({...p})});
  const entered=snapshot('room');Object.assign(entered.players[0],{interior:'way/1473779965',interiorRevision:'rixin-v2',interiorX:32.6875,interiorY:83.6875});
  net.startTransport=()=>{};net.resetRoom(entered);net.schedule=()=>{};net.wsAllowed=false;
  net.setPosition({...net.position,interiorY:82.5,moving:true});
  net.request=async(path,options)=>{sent.push(options.body);return entered;};
  await net.tick();
  assert.equal(sent[0].interiorRevision,'rixin-v2');assert.equal(sent[0].interiorY,82.5);
  assert.equal(net.position.interiorY,82.5,'an ordinary older acknowledgement must not rewind local movement');
  assert.equal(reconciled.length,1);assert.equal(reconciled[0].interiorRevision,'rixin-v2');net.destroy();
});

test('a changed revision reconciles the same room but delayed interior snapshots cannot undo local exit',t=>{
  browser(t);const reconciled=[],net=new CampusNetwork({onReconcile:p=>reconciled.push({...p})});
  net.startTransport=()=>{};const entered=snapshot('room');Object.assign(entered.players[0],{interior:'way/1473779965',interiorRevision:'rixin-v1',interiorX:95,interiorY:123});
  net.resetRoom(entered);
  const revised={...entered,players:[{...entered.players[0],interiorRevision:'rixin-v2',interiorX:32.6875,interiorY:83.6875,seq:2}]};
  net.accept(revised);assert.equal(reconciled.length,2);assert.equal(net.position.interiorRevision,'rixin-v2');assert.equal(net.position.interiorX,32.6875);
  net.setPosition({...net.position,interior:null,interiorRevision:null,interiorX:null,interiorY:null});
  net.accept(revised);assert.equal(reconciled.length,2);assert.equal(net.position.interior,null,'a normal acknowledgement from before exit must not pull the actor inside');net.destroy();
});

test('HTTP exit rejection restores the authoritative interior pose and the next update can recover',async t=>{
  browser(t);const reconciled=[],sent=[],net=new CampusNetwork({onReconcile:p=>reconciled.push({...p})});
  const inside=snapshot('room');Object.assign(inside.players[0],{interior:'way/1473779965',interiorRevision:'rixin-v2',interiorX:32.6875,interiorY:82,seq:4});
  net.room=inside.room;net.position={x:1,y:2,interior:null,interiorRevision:null,interiorX:null,interiorY:null};net.stopped=false;net.wsAllowed=false;net.schedule=()=>{};
  net.request=async(path,options)=>{sent.push(options.body);if(sent.length===1)throw Object.assign(Error('请走到室内出口后离开。'),{status:409,code:'EXIT_REQUIRED',snapshot:inside});return inside;};
  await net.tick();assert.equal(net.position.interiorRevision,'rixin-v2');assert.equal(net.position.interiorY,82);assert.equal(reconciled.length,1);
  await net.tick();assert.equal(sent[1].interior,'way/1473779965');assert.equal(sent[1].interiorRevision,'rixin-v2');assert.equal(net.failures,0);net.destroy();
});

test('WebSocket carries interior revision and a layout-change error clears retired coordinates',async t=>{
  browser(t);const oldLocation=Object.getOwnPropertyDescriptor(globalThis,'location');globalThis.location={protocol:'https:',host:'campus.test'};
  t.after(()=>{if(oldLocation)Object.defineProperty(globalThis,'location',oldLocation);else delete globalThis.location;});
  class Socket{static OPEN=1;static CONNECTING=0;constructor(){this.readyState=1;this.sent=[];}send(value){this.sent.push(JSON.parse(value));}close(){this.readyState=3;this.onclose?.();}}
  globalThis.WebSocket=Socket;const reconciled=[],net=new CampusNetwork({onReconcile:p=>reconciled.push({...p})});
  net.session={id:'visitor',token:'test-only'};net.room={id:'room'};net.position={x:1,y:2,interior:'way/1473779965',interiorRevision:'rixin-v2',interiorX:32.6875,interiorY:83.6875};net.stopped=false;net.schedule=()=>{};
  net.tryWebSocket();const socket=net.socket;socket.onopen();const inside=snapshot('room');Object.assign(inside.players[0],net.position);socket.onmessage({data:JSON.stringify(inside)});
  await net.tick();assert.equal(socket.sent.at(-1).interiorRevision,'rixin-v2');assert.equal(socket.sent.at(-1).interiorY,83.6875);
  const outside=snapshot('room');Object.assign(outside.players[0],{interior:null,interiorRevision:null,interiorX:null,interiorY:null,seq:8});
  socket.onmessage({data:JSON.stringify({type:'error',code:'INTERIOR_LAYOUT_CHANGED',error:'室内已更新',snapshot:outside})});
  assert.equal(net.position.interior,null);assert.equal(net.position.interiorRevision,null);assert.equal(net.position.interiorX,null);assert.equal(reconciled.at(-1).interiorY,null);net.destroy();
});

test('interior revision survives reconciliation and changed coordinates are never silently reused',async t=>{
  browser(t);const poses=[],net=new CampusNetwork({onReconcile:p=>poses.push(p)}),first=snapshot('room');
  Object.assign(first.players[0],{interior:'way/1473779965',interiorRevision:'rixin-v1',interiorX:95,interiorY:123});
  net.accept(first,true);assert.equal(net.position.interiorRevision,'rixin-v1');
  const next={...first,players:[{...first.players[0],interiorRevision:'rixin-v2',interiorX:33,interiorY:85,seq:2}]};
  net.accept(next);assert.equal(poses.length,2);assert.equal(net.position.interiorRevision,'rixin-v2');assert.equal(net.position.interiorX,33);
  // An ordinary delayed exterior snapshot must not cancel local entry before its first sync.
  net.accept(snapshot('room'));assert.equal(poses.length,2);assert.equal(net.position.interiorRevision,'rixin-v2');net.destroy();
});

test('a server-confirmed door anchor replaces the nearby entry position once without repeated movement rewinds',t=>{
  browser(t);const poses=[],net=new CampusNetwork({onReconcile:p=>poses.push({...p})});
  net.position={x:1000.62,y:756.61,interior:'way/1473779965',interiorRevision:'rixin-v2',interiorX:32.6875,interiorY:83.6875};
  const entered=snapshot('room');Object.assign(entered.players[0],{...net.position,x:999.59,y:754.44});
  net.accept(entered);
  assert.equal(poses.length,1);assert.deepEqual([net.position.x,net.position.y],[999.59,754.44]);assert.equal(net.position.interiorRevision,'rixin-v2');
  net.setPosition({...net.position,interiorY:82.5,moving:true});net.accept(entered);
  assert.equal(poses.length,1);assert.equal(net.position.interiorY,82.5,'the same acknowledged door must not keep rewinding local indoor movement');net.destroy();
});
