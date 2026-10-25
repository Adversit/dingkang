import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const geometry=JSON.parse(fs.readFileSync(path.join(root,'lib/campus/collision-data.json'),'utf8'));
const source=fs.readFileSync(path.join(root,'lib/campus/server.ts'),'utf8').replace("import collisionData from './collision-data.json';",`const collisionData = ${JSON.stringify(geometry)};`);
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {handleCampusRequest,isCampusWalkable,moveForTest}=await import('data:text/javascript;base64,'+Buffer.from(compiled+'\nexport {move as moveForTest};').toString('base64'));
const migrations=['0001_keen_blazing_skull.sql','0002_stale_morph.sql','0003_white_silver_sable.sql'].map(name=>fs.readFileSync(path.join(root,'drizzle',name),'utf8'));

function fixture() {
  const sql=new DatabaseSync(':memory:');
  migrations.forEach(value=>sql.exec(value));
  const state={now:1_800_000_000_000};
  const metrics={roundTrips:0};let inBatch=false;
  function statement(query,args=[]) {
    return {
      query,
      bind(...values){return statement(query,values);},
      async first(){if(!inBatch)metrics.roundTrips++;return sql.prepare(query).get(...args)||null;},
      async all(){if(!inBatch)metrics.roundTrips++;return {success:true,results:sql.prepare(query).all(...args),meta:{changes:0}};},
      async run(){if(!inBatch)metrics.roundTrips++;const result=sql.prepare(query).run(...args);return {success:true,results:[],meta:{changes:Number(result.changes)}};},
    };
  }
  const db={prepare:statement,async batch(statements){metrics.roundTrips++;inBatch=true;sql.exec('BEGIN');try{const rows=[];for(const item of statements)rows.push(await (/^\s*(UPDATE|INSERT|DELETE)/i.test(item.query)?item.run():item.all()));sql.exec('COMMIT');return rows;}catch(error){sql.exec('ROLLBACK');throw error;}finally{inBatch=false;}}};
  async function call(endpoint,{method='GET',token,body,headers={},status=200,dbOverride=db}={}) {
    const request=new Request('https://campus.test/api/campus/'+endpoint,{method,headers:{...(method!=='GET'?{origin:'https://campus.test'}:{}),...(token?{authorization:'Bearer '+token}:{}),...(body!==undefined?{'content-type':'application/json'}:{}),...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})});
    const response=await handleCampusRequest(request,{DB:dbOverride},{now:()=>state.now});
    const data=await response.json();
    assert.equal(response.status,status,JSON.stringify(data));
    return data;
  }
  async function session(nickname='游客',headers={}){return (await call('session',{method:'POST',body:{nickname,appearance:{avatar:2}},headers,status:201})).session;}
  async function room(session,campus='south',title='测试房间'){return call('rooms',{method:'POST',token:session.token,body:{campus,title},status:201});}
  return {sql,state,db,call,session,room,metrics};
}

test('health honestly distinguishes configured database and WebSocket availability',async()=>{
  const f=fixture();
  assert.equal((await f.call('health')).maxPlayers,8);
  assert.equal((await f.call('health')).websocketSupported,false);
  await f.call('health',{dbOverride:null,status:503});
});

test('anonymous sessions use hashed random credentials and cannot impersonate another profile',async()=>{
  const f=fixture(),alice=await f.session('甲'),bob=await f.session('乙');
  const row=f.sql.prepare('SELECT * FROM campus_sessions WHERE id=?').get(alice.id);
  assert.equal(row.secret_hash.length,64);assert.notEqual(row.secret_hash,alice.token.split('.')[1]);
  await f.call('me',{token:alice.id+'.'+bob.token.split('.')[1],status:401});
  await f.call('me',{token:alice.id+'.'+'0'.repeat(64),status:401});
  const me=await f.call('me',{token:alice.token});
  assert.equal(me.session.nickname,'甲');assert.equal(JSON.stringify(me).includes(alice.token),false);
  await f.call('me',{method:'PATCH',token:bob.token,body:{nickname:'丙',id:alice.id}});
  assert.equal((await f.call('me',{token:alice.token})).session.nickname,'甲');
  await f.call('rooms',{method:'POST',token:alice.token,body:{campus:'south',title:'外部请求'},headers:{origin:'https://other.test'},status:403});
  const linked=await f.session('账号游客',{'oai-authenticated-user-id':'account-a'});
  await f.call('me',{token:linked.token,status:403});
  await f.call('me',{token:linked.token,headers:{'oai-authenticated-user-id':'account-b'},status:403});
  await f.call('me',{token:linked.token,headers:{'oai-authenticated-user-id':'account-a'}});
  f.state.now+=8*86400_000;await f.call('me',{token:alice.token,status:401});
});

test('all building and public-place entrances and both spawns pass server collision geometry',()=>{
  for(const campus of ['south','north']) {
    const map=geometry[campus];
    assert.equal(isCampusWalkable(campus,...map.spawn),true,campus+' spawn');
    for(const landmark of map.landmarks)assert.equal(isCampusWalkable(campus,...landmark.entrance),true,campus+' '+landmark.id);
    assert.equal(isCampusWalkable(campus,-10,0),false);
    assert.equal(isCampusWalkable(campus,map.bounds.maxX+10,map.bounds.maxY+10),false);
  }
  const destinations=[...geometry.south.landmarks,...geometry.north.landmarks];
  assert.equal(destinations.filter(item=>item.kind==='building').length,109);
  assert.equal(destinations.length,150);
});

test('atomic joins cap a room at eight and leave frees a slot',async()=>{
  const f=fixture(),owner=await f.session('房主'),initial=await f.room(owner),sessions=[];
  for(let i=0;i<8;i++)sessions.push(await f.session('同学'+i));
  await Promise.all(sessions.slice(0,7).map(s=>f.call('join',{method:'POST',token:s.token,body:{roomId:initial.room.code}})));
  await f.call('join',{method:'POST',token:sessions[7].token,body:{roomId:initial.room.id},status:409});
  assert.equal((await f.call('snapshot',{token:owner.token})).players.length,8);
  await f.call('leave',{method:'POST',token:sessions[0].token,body:{roomId:initial.room.id}});
  await f.call('join',{method:'POST',token:sessions[7].token,body:{roomId:initial.room.id}});
  assert.equal((await f.call('snapshot',{token:owner.token})).players.length,8);
});

test('movement rejects forged targets, replay, excessive speed, flood and stale room packets',async()=>{
  const f=fixture(),a=await f.session('甲'),b=await f.session('乙'),initial=await f.room(a);
  await f.call('join',{method:'POST',token:b.token,body:{roomId:initial.room.id}});
  const p=initial.players[0],input={roomId:initial.room.id,x:p.x,y:p.y,direction:'left',moving:false,seq:1};
  f.state.now+=100;
  const moved=await f.call('sync',{method:'POST',token:a.token,body:{...input,sessionId:b.id}});
  assert.equal(moved.players.find(p=>p.id===a.id).seq,1);assert.equal(moved.players.find(p=>p.id===b.id).seq,0);
  const replay=await f.call('sync',{method:'POST',token:a.token,body:{...input,x:p.x+500}});assert.equal(replay.players.find(p=>p.id===a.id).x,p.x);
  await f.call('sync',{method:'POST',token:a.token,body:{...input,seq:2},status:429});
  f.state.now+=100;
  const fast=await f.call('sync',{method:'POST',token:a.token,body:{...input,seq:2,x:p.x+100},status:409});assert.equal(fast.code,'MOVE_TOO_FAST');assert.ok(fast.snapshot);
  await f.call('sync',{method:'POST',token:a.token,body:{...input,seq:2,x:'nan'},status:400});
  const other=await f.room(a,'north');f.state.now+=100;
  assert.equal((await f.call('leave',{method:'POST',token:a.token,body:{roomId:initial.room.id}})).left,false);
  await f.call('sync',{method:'POST',token:a.token,body:{...input,seq:100},status:409});
  assert.equal((await f.call('snapshot',{token:a.token})).room.id,other.room.id);
});

test('teleports resolve server map IDs instead of accepting arbitrary destinations',async()=>{
  const f=fixture(),a=await f.session(),joined=await f.room(a),id=geometry.south.landmarks[0].id;
  const result=await f.call('teleport',{method:'POST',token:a.token,body:{roomId:joined.room.id,poiId:id,seq:1,x:999999,y:999999}});
  assert.deepEqual([result.players[0].x,result.players[0].y],geometry.south.landmarks[0].entrance);
  await f.call('teleport',{method:'POST',token:a.token,body:{roomId:joined.room.id,poiId:id,seq:2},status:429});
  f.state.now+=2100;
  await f.call('teleport',{method:'POST',token:a.token,body:{roomId:joined.room.id,poiId:'evil/not-on-map',seq:2},status:400});
});

test('public lake destinations land on safe shores and restricted gate IDs cannot teleport',async()=>{
  const f=fixture(),a=await f.session(),joined=await f.room(a);
  for(const [i,id] of ['relation/20170939','way/1473873899'].entries()){
    f.state.now+=2100;
    const result=await f.call('teleport',{method:'POST',token:a.token,body:{roomId:joined.room.id,poiId:id,seq:i+1}});
    const point=result.players[0];assert.equal(isCampusWalkable('south',point.x,point.y),true);
    assert.equal(geometry.south.landmarks.find(item=>item.id===id).kind,'water');
  }
  for(const id of ['node/11929117189','node/11939582907']){
    f.state.now+=2100;
    assert.equal(geometry.south.landmarks.some(item=>item.id===id),false);
    const result=await f.call('teleport',{method:'POST',token:a.token,body:{roomId:joined.room.id,poiId:id,seq:3},status:400});
    assert.equal(result.code,'INVALID_DESTINATION');
  }
});

test('plaza crosses south rooms, room chat and north-campus messages remain isolated',async()=>{
  const f=fixture(),a=await f.session('甲'),b=await f.session('乙'),c=await f.session('丙');
  const ar=await f.room(a),br=await f.room(b),cr=await f.room(c,'north');
  const plaza=await f.call('messages',{method:'POST',token:a.token,body:{roomId:ar.room.id,text:'广场招呼'}});
  const plazaId=plaza.messages.at(-1).id;
  await f.call('messages',{method:'POST',token:a.token,body:{roomId:ar.room.id,text:'房间秘密',scope:'room'}});
  assert.equal((await f.call('messages',{token:b.token})).messages[0].text,'广场招呼');
  assert.equal((await f.call('messages?scope=room',{token:b.token})).messages.length,0);
  assert.equal((await f.call('messages',{token:c.token})).messages.length,0);
  await f.call('messages/'+plazaId,{method:'DELETE',token:b.token,status:403});
  await f.call('messages/'+plazaId+'/report',{method:'POST',token:c.token,body:{reason:'测试'},status:404});
  await f.call('messages/'+plazaId+'/report',{method:'POST',token:b.token,body:{reason:'测试举报'}});
  await f.call('messages/'+plazaId+'/report',{method:'POST',token:b.token,body:{reason:'重复举报'}});
  assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM campus_reports').get().n,1);
  await f.call('messages/'+plazaId,{method:'DELETE',token:a.token});
  const deleted=(await f.call('messages?after='+plazaId,{token:b.token})).messages[0];
  assert.equal(deleted.deleted,true);assert.equal(deleted.text,'消息已删除');
  await f.call('messages',{method:'POST',token:a.token,body:{roomId:br.room.id,text:'错误房间'},status:409});
  assert.equal((await f.call('snapshot',{token:c.token})).room.id,cr.room.id);
});

test('history pagination works and 50 deletion tombstones do not starve new messages',async()=>{
  const f=fixture(),a=await f.session(),joined=await f.room(a);
  const insert=f.sql.prepare("INSERT INTO campus_messages(room_id,scope,campus,session_id,nickname,text,created_at,deleted_at) VALUES (?,'plaza','south',?,'同学',?,?,?)");
  for(let i=1;i<=65;i++)insert.run(joined.room.id,a.id,'消息'+i,f.state.now,i<=50?f.state.now:null);
  const next=await f.call('messages?after=50',{token:a.token});
  assert.equal(next.lastMessageId,65);assert.ok(next.messages.some(x=>x.text==='消息65'));
  const latest=await f.call('messages',{token:a.token});assert.equal(latest.messages.length,50);assert.equal(latest.oldestMessageId,16);
  const history=await f.call('messages?before=16',{token:a.token});assert.equal(history.messages.length,15);assert.equal(history.oldestMessageId,1);
});

test('chat flood, malformed names and untrusted payloads return bounded Chinese errors',async()=>{
  const f=fixture(),a=await f.session(),joined=await f.room(a);
  for(let i=0;i<5;i++)await f.call('messages',{method:'POST',token:a.token,body:{roomId:joined.room.id,text:'消息'+i}});
  await f.call('messages',{method:'POST',token:a.token,body:{roomId:joined.room.id,text:'太多'},status:429});
  await f.call('session',{method:'POST',body:{nickname:'长'.repeat(17)},status:400});
  await f.call('session',{method:'POST',body:{nickname:'正常',appearance:{avatar:100}},status:400});
  await f.call('messages',{method:'POST',token:a.token,body:{roomId:joined.room.id,text:'长'.repeat(241)},status:400});
  await f.call('ws',{token:a.token,status:426});
  await f.call('ws',{headers:{upgrade:'websocket','sec-websocket-protocol':'campus-v1, campus-token.'+a.token},status:503});
});

test('indoor coordinates share exact furniture constraints and cannot teleport between interiors',async()=>{
  const f=fixture(),a=await f.session(),joined=await f.room(a),id='way/1473651054';
  let snap=await f.call('teleport',{method:'POST',token:a.token,body:{roomId:joined.room.id,poiId:id,seq:1}});
  const p=snap.players[0],input={roomId:joined.room.id,x:p.x,y:p.y,direction:'up',moving:true,interior:id};
  f.state.now+=100;
  snap=await f.call('sync',{method:'POST',token:a.token,body:{...input,seq:2,interiorX:95,interiorY:123}});
  assert.equal(snap.players[0].interiorX,95);
  f.state.now+=100;
  snap=await f.call('sync',{method:'POST',token:a.token,body:{...input,seq:3,interiorX:95,interiorY:121}});
  assert.equal(snap.players[0].interiorY,121);
  f.state.now+=100;
  await f.call('sync',{method:'POST',token:a.token,body:{...input,seq:4,interiorX:15,interiorY:20},status:409});
  await f.call('sync',{method:'POST',token:a.token,body:{...input,seq:4,interior:'way/1473779965',interiorX:95,interiorY:123},status:400});
  await f.call('sync',{method:'POST',token:a.token,body:{...input,seq:4,interior:null}});
});

test('expired presence does not evict sessions or exceed capacity when old clients return',async()=>{
  const f=fixture(),old=await f.session('暂离'),initial=await f.room(old),peers=[];
  f.state.now+=21_000;
  for(let i=0;i<8;i++){const p=await f.session('新同学'+i);peers.push(p);await f.call('join',{method:'POST',token:p.token,body:{roomId:initial.room.id}});}
  await f.call('sync',{method:'POST',token:old.token,body:{roomId:initial.room.id,seq:1,x:initial.players[0].x,y:initial.players[0].y,direction:'down'},status:409});
  assert.equal((await f.call('snapshot',{token:peers[0].token})).players.length,8);
  await f.call('me',{token:old.token});
});

test('steady WebSocket updates use one database round trip without stale-cache authority leaks',async()=>{
  const f=fixture(),a=await f.session(),joined=await f.room(a),session=f.sql.prepare('SELECT * FROM campus_sessions WHERE id=?').get(a.id),connection={context:null};
  const p=joined.players[0],input={roomId:joined.room.id,x:p.x,y:p.y,direction:'down',moving:false};
  f.state.now+=100;
  await moveForTest(f.db,session,{...input,seq:1},f.state.now,false,connection);
  f.state.now+=100;f.metrics.roundTrips=0;
  const next=await moveForTest(f.db,session,{...input,seq:2},f.state.now,false,connection);
  assert.equal(next.players[0].seq,2);assert.equal(f.metrics.roundTrips,1,'steady WS write+snapshot must fit one D1 batch');
  f.state.now+=100;
  await f.call('sync',{method:'POST',token:a.token,body:{...input,seq:4,direction:'left'}});
  f.state.now+=100;
  const stale=await moveForTest(f.db,session,{...input,seq:3,direction:'right'},f.state.now,false,connection);
  assert.equal(stale.players[0].seq,4);assert.equal(stale.players[0].direction,'left');
  const north=await f.room(a,'north');f.state.now+=100;
  await assert.rejects(moveForTest(f.db,session,{...input,seq:5},f.state.now,false,connection),error=>error.code==='ROOM_CHANGED');
  assert.equal((await f.call('snapshot',{token:a.token})).room.id,north.room.id);
});

test('empty room listings expire after two minutes while their share codes remain usable',async()=>{
  const f=fixture(),a=await f.session(),initial=await f.room(a);
  await f.call('leave',{method:'POST',token:a.token,body:{roomId:initial.room.id}});
  assert.ok((await f.call('rooms',{token:a.token})).rooms.some(room=>room.id===initial.room.id));
  f.state.now+=120_001;
  assert.equal((await f.call('rooms',{token:a.token})).rooms.some(room=>room.id===initial.room.id),false);
  await f.call('join',{method:'POST',token:a.token,body:{roomId:initial.room.code}});
  assert.ok((await f.call('rooms',{token:a.token})).rooms.some(room=>room.id===initial.room.id));
});

test('HTTP teleport and indoor exit invalidate socket state and do not trap later valid movement',async()=>{
  const f=fixture(),a=await f.session(),initial=await f.room(a),session=f.sql.prepare('SELECT * FROM campus_sessions WHERE id=?').get(a.id),connection={context:null};
  const p=initial.players[0];f.state.now+=100;
  await moveForTest(f.db,session,{roomId:initial.room.id,x:p.x,y:p.y,seq:1,direction:'down'},f.state.now,false,connection);
  f.state.now+=100;
  const moved=await f.call('teleport',{method:'POST',token:a.token,body:{roomId:initial.room.id,seq:2,poiId:'way/1473651054'}}),at=moved.players[0];
  f.state.now+=100;
  const valid=await moveForTest(f.db,session,{roomId:initial.room.id,seq:3,x:at.x,y:at.y,direction:'up'},f.state.now,false,connection);
  assert.equal(valid.players[0].seq,3);assert.equal(valid.players[0].x,at.x);
  f.state.now+=100;
  await moveForTest(f.db,session,{roomId:initial.room.id,seq:4,x:at.x,y:at.y,direction:'up',interior:'way/1473651054',interiorX:95,interiorY:123},f.state.now,false,connection);
  f.state.now+=1000;
  await moveForTest(f.db,session,{roomId:initial.room.id,seq:5,x:at.x,y:at.y,direction:'up',interior:'way/1473651054',interiorX:95,interiorY:110},f.state.now,false,connection);
  f.state.now+=2100;
  const outside=await f.call('teleport',{method:'POST',token:a.token,body:{roomId:initial.room.id,seq:6,poiId:'way/1473651054'}});
  f.state.now+=100;
  const recovered=await moveForTest(f.db,session,{roomId:initial.room.id,seq:7,x:outside.players[0].x,y:outside.players[0].y,direction:'down',interior:null},f.state.now,false,connection);
  assert.equal(recovered.players[0].interior,null);assert.equal(recovered.players[0].seq,7);
});

test('same-room rejoin cannot create an ABA overwrite by an older socket pose',async()=>{
  const f=fixture(),a=await f.session(),initial=await f.room(a),session=f.sql.prepare('SELECT * FROM campus_sessions WHERE id=?').get(a.id),original=f.sql.prepare('SELECT * FROM campus_players WHERE session_id=?').get(a.id);
  const room=f.sql.prepare('SELECT * FROM campus_rooms WHERE id=?').get(initial.room.id),connection={context:{player:original,room}};
  f.state.now+=100;
  await f.call('teleport',{method:'POST',token:a.token,body:{roomId:initial.room.id,seq:1,poiId:'way/1473651054'}});
  f.state.now+=100;const rejoined=await f.call('join',{method:'POST',token:a.token,body:{roomId:initial.room.id}});assert.equal(rejoined.players[0].seq,0);
  f.state.now+=100;
  const stale=await moveForTest(f.db,session,{roomId:initial.room.id,seq:1,x:original.x,y:original.y,direction:'down'},f.state.now,false,connection);
  assert.equal(stale.players[0].x,rejoined.players[0].x);assert.equal(stale.players[0].seq,0);
});
