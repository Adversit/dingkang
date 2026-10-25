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
