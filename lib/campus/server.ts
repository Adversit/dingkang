import collisionData from './collision-data.json';
import type { CampusId, CampusPlayer, CampusSnapshot, CampusRoom, CampusMessage } from './protocol';

/** D1 is the shared authority. Module memory contains immutable geometry only, never room state. */
const MAX_PLAYERS = 8;
const ACTIVE_MS = 20_000;
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_SPEED = 9;
const FOOT_RADIUS = 0.35;
type Point = [number, number];
type Polygon = {outer: Point[]; holes?: Point[][]; bounds?: number[] | {minX:number; minY:number; maxX:number; maxY:number}};
type World = {
  bounds: {minX:number; minY:number; maxX:number; maxY:number}; spawn: Point;
  boundary: Polygon[]; obstacles: Polygon[];
  landmarks: {id:string; name:string; entrance:Point}[];
};
const worlds = collisionData as unknown as Record<CampusId, World>;
type Session = {id:string; secret_hash:string; owner_id:string|null; nickname:string; appearance:string; created_at:number; expires_at:number};
type PlayerRow = {session_id:string; room_id:string; x:number; y:number; direction:string; moving:number; interior:string|null; interior_x:number|null; interior_y:number|null; seq:number; updated_at:number; last_seen:number; teleported_at:number};
type RoomRow = {id:string; code:string; title:string; campus:CampusId; owner_id:string; max_players:number; created_at:number};
type RoomContext = {player:PlayerRow;room:RoomRow};
type ConnectionState = {context:RoomContext|null};
type Payload = Record<string, unknown>;
type Env = {DB?: D1Database};
class CampusError extends Error {
  status: number; code: string; snapshot?: CampusSnapshot;
  constructor(status:number, code:string, message:string, snapshot?:CampusSnapshot) {
    super(message); this.status=status; this.code=code; this.snapshot=snapshot;
  }
}
function fail(status:number, code:string, message:string):never { throw new CampusError(status,code,message); }
function response(data:unknown, status=200, extra:Record<string,string>={}) {
  return new Response(JSON.stringify(data), {status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});
}
function errorPayload(error:unknown) {
  return error instanceof CampusError
    ? {type:'error',error:error.message,code:error.code,...(error.snapshot ? {snapshot:error.snapshot} : {})}
    : {type:'error',error:'校园服务暂时不可用，请稍后重试。',code:'SERVICE_UNAVAILABLE'};
}
function checkOrigin(request:Request) {
  const origin=request.headers.get('origin');
  if(origin && origin!==new URL(request.url).origin) fail(403,'ORIGIN_REJECTED','请求来源不匹配，请从本站重新进入。');
  if(request.headers.get('sec-fetch-site')==='cross-site') fail(403,'ORIGIN_REJECTED','不接受其他网站发起的校园操作。');
}
async function body(request:Request):Promise<Payload> {
  if(Number(request.headers.get('content-length')||0)>8192) fail(413,'BODY_TOO_LARGE','请求内容过长。');
  if(!request.headers.get('content-type')?.includes('application/json')) fail(415,'JSON_REQUIRED','请求需要使用 JSON 格式。');
  const text=await request.text();
  if(text.length>8192) fail(413,'BODY_TOO_LARGE','请求内容过长。');
  let value:unknown;
  try {value=JSON.parse(text);} catch {fail(400,'INVALID_JSON','请求内容格式不正确。');}
  if(!value || typeof value!=='object' || Array.isArray(value)) fail(400,'INVALID_BODY','请求内容格式不正确。');
  return value as Payload;
}
function shortText(value:unknown,max:number,label:string,allowEmpty=false) {
  if(typeof value!=='string') fail(400,'INVALID_TEXT',`请填写${label}。`);
  const clean=value.trim().replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g,'');
  if((!allowEmpty && !clean)||[...clean].length>max) fail(400,'INVALID_TEXT',`${label}需为 1—${max} 个字。`);
  return clean;
}
function appearance(value:unknown) {
  if(value===undefined) return {avatar:0};
  if(!value || typeof value!=='object' || Array.isArray(value)) fail(400,'INVALID_APPEARANCE','人物外观不正确。');
  const avatar=(value as Payload).avatar;
  if(!Number.isInteger(avatar)||Number(avatar)<0||Number(avatar)>7) fail(400,'INVALID_APPEARANCE','请选择有效的人物外观。');
  return {avatar:Number(avatar)};
}
function campusId(value:unknown):CampusId {
  if(value!=='south' && value!=='north') fail(400,'INVALID_CAMPUS','请选择前卫南区或前卫北区。');
  return value;
}
async function sha(value:string) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function equalHash(a:string,b:string) {
  if(a.length!==b.length) return false;
  let different=0; for(let i=0;i<a.length;i++) different|=a.charCodeAt(i)^b.charCodeAt(i);
  return different===0;
}
async function authenticate(request:Request,db:D1Database,now:number):Promise<Session> {
  let token=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||'';
  if(!token && request.headers.get('upgrade')?.toLowerCase()==='websocket') {
    const protocol=request.headers.get('sec-websocket-protocol')?.split(',').map(x=>x.trim()).find(x=>x.startsWith('campus-token.'));
    token=protocol?.slice('campus-token.'.length)||'';
  }
  if(!/^[0-9a-f-]{36}\.[0-9a-f]{64}$/.test(token)) fail(401,'SESSION_REQUIRED','请先设置昵称进入校园。');
  const id=token.slice(0,36);
  const session=await db.prepare('SELECT * FROM campus_sessions WHERE id = ?').bind(id).first<Session>();
  if(!session || session.expires_at<=now || !equalHash(session.secret_hash,await sha(token))) fail(401,'SESSION_EXPIRED','校园会话已失效，请重新进入。');
  if(session.owner_id && session.owner_id!==request.headers.get('oai-authenticated-user-id')) fail(403,'SESSION_OWNER','请使用创建此校园会话的账号进入。');
  return session;
}
async function limit(db:D1Database,key:string,max:number,windowMs:number,now:number) {
  const bucket=Math.floor(now/windowMs);
  const row=await db.prepare('INSERT INTO campus_limits (key,hits,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=hits+1 RETURNING hits')
    .bind(`${key}:${bucket}`,(bucket+2)*windowMs).first<{hits:number}>();
  if(!row || row.hits>max) fail(429,'RATE_LIMIT','操作太快了，请稍等片刻。');
}
function roomView(row:RoomRow):CampusRoom {return {id:row.id,code:row.code,title:row.title,campus:row.campus,maxPlayers:row.max_players};}
async function playerFor(db:D1Database,session:Session) {
  return db.prepare('SELECT * FROM campus_players WHERE session_id = ?').bind(session.id).first<PlayerRow>();
}
async function currentRoom(db:D1Database,session:Session):Promise<{player:PlayerRow; room:RoomRow}> {
  const context=await roomContext(db,session.id);
  if(!context) fail(409,'ROOM_REQUIRED','请先加入一个校园房间。');
  return context;
}
async function roomContext(db:D1Database,sessionId:string):Promise<RoomContext|null> {
  const row=await db.prepare(`SELECT p.*,r.code AS room_code,r.title AS room_title,r.campus AS room_campus,r.owner_id AS room_owner_id,r.max_players AS room_max_players,r.created_at AS room_created_at
    FROM campus_players p JOIN campus_rooms r ON r.id=p.room_id WHERE p.session_id=?`).bind(sessionId)
    .first<PlayerRow & {room_code:string;room_title:string;room_campus:CampusId;room_owner_id:string;room_max_players:number;room_created_at:number}>();
  if(!row)return null;
  return {player:row,room:{id:row.room_id,code:row.room_code,title:row.room_title,campus:row.room_campus,owner_id:row.room_owner_id,max_players:row.room_max_players,created_at:row.room_created_at}};
}
function messageView(row:Record<string,unknown>):CampusMessage {
  return {id:Number(row.id),playerId:String(row.session_id),nickname:String(row.nickname),text:row.deleted_at?'消息已删除':String(row.text),createdAt:Number(row.created_at),deleted:!!row.deleted_at,scope:row.scope as 'plaza'|'room',campus:row.campus as CampusId};
}
function messageScope(value:unknown):'plaza'|'room' {if(value===undefined||value===null||value==='plaza')return 'plaza';if(value==='room')return 'room';fail(400,'INVALID_SCOPE','请选择校园广场或当前房间。');}
function messageQueries(db:D1Database,room:RoomRow,after:unknown=0,now=Date.now(),scopeValue:unknown='plaza',beforeValue:unknown=0) {
  const scope=messageScope(scopeValue), filter=scope==='plaza'?'campus = ? AND scope = \'plaza\'':'room_id = ? AND scope = \'room\'', target=scope==='plaza'?room.campus:room.id;
  const cursor=Number(after||0);
  if(!Number.isSafeInteger(cursor)||cursor<0) fail(400,'INVALID_CURSOR','消息游标不正确。');
  const before=Number(beforeValue||0);
  if(!Number.isSafeInteger(before)||before<0) fail(400,'INVALID_CURSOR','历史消息游标不正确。');
  const query=before
    ? db.prepare(`SELECT * FROM (SELECT * FROM campus_messages WHERE ${filter} AND id < ? ORDER BY id DESC LIMIT 50) ORDER BY id ASC`).bind(target,before)
    : cursor
      ? db.prepare(`SELECT * FROM campus_messages WHERE ${filter} AND id > ? ORDER BY id ASC LIMIT 50`).bind(target,cursor)
      : db.prepare(`SELECT * FROM (SELECT * FROM campus_messages WHERE ${filter} ORDER BY id DESC LIMIT 50) ORDER BY id ASC`).bind(target);
  // Deletions have a separate quota, so old tombstones never starve newer messages.
  const deleted=cursor&&!before ? db.prepare(`SELECT * FROM campus_messages WHERE ${filter} AND id <= ? AND deleted_at > ? ORDER BY deleted_at DESC LIMIT 50`).bind(target,cursor,now-60_000) : null;
  return {queries:deleted?[query,deleted]:[query],cursor,before};
}
function messageResult(results:D1Result<Record<string,unknown>>[],cursor:number,before:number) {
  const latest=results[0]?.results||[],deleted=results[1]?.results||[];
  const messages=[...deleted,...latest].map(messageView).sort((a,b)=>a.id-b.id),oldest=Math.min(...latest.map(x=>Number(x.id)),before||Infinity);
  return {messages,lastMessageId:Math.max(cursor,...messages.map(x=>x.id),0),oldestMessageId:oldest===Infinity?null:oldest,hasMore:latest.length===50};
}
async function messagesFor(db:D1Database,room:RoomRow,after:unknown=0,now=Date.now(),scope:unknown='plaza',before:unknown=0) {
  const parts=messageQueries(db,room,after,now,scope,before);
  return messageResult(await db.batch<Record<string,unknown>>(parts.queries),parts.cursor,parts.before);
}
/** Update, peer read and chat read travel to D1 together; no per-peer or per-statement HTTP round trips. */
async function roomSnapshot(db:D1Database,session:Session,room:RoomRow,after:unknown,now:number,scope:unknown,update?:D1PreparedStatement) {
  const parts=messageQueries(db,room,after,now,scope);
  const peerQuery=db.prepare('SELECT p.*,s.nickname,s.appearance FROM campus_players p JOIN campus_sessions s ON s.id=p.session_id WHERE p.room_id=? AND p.last_seen>? AND s.expires_at>? ORDER BY p.session_id LIMIT 8').bind(room.id,now-ACTIVE_MS,now);
  const batch=await db.batch<Record<string,unknown>>([...(update?[update]:[]),peerQuery,...parts.queries]);
  const changes=update?batch.shift()!.meta.changes:undefined;
  const peers=batch.shift()! as unknown as D1Result<PlayerRow & {nickname:string;appearance:string}>;
  const players:CampusPlayer[]=peers.results.map(p=>({id:p.session_id,nickname:p.nickname,appearance:JSON.parse(p.appearance),x:p.x,y:p.y,direction:p.direction as CampusPlayer['direction'],moving:!!p.moving,interior:p.interior,interiorX:p.interior_x,interiorY:p.interior_y,seq:p.seq,updatedAt:p.updated_at}));
  const value:CampusSnapshot={type:'snapshot',protocol:1,serverTime:now,selfId:session.id,room:roomView(room),players,...messageResult(batch,parts.cursor,parts.before)};
  return {value,changes};
}
async function snapshot(db:D1Database,session:Session,after:unknown=0,now=Date.now(),scope:unknown='plaza',connection?:ConnectionState):Promise<CampusSnapshot> {
  const context=await roomContext(db,session.id);
  if(connection)connection.context=context;
  if(!context)return {type:'snapshot',protocol:1,serverTime:now,selfId:session.id,room:null,players:[],messages:[],lastMessageId:0};
  return (await roomSnapshot(db,session,context.room,after,now,scope)).value;
}
function inRing(x:number,y:number,ring:Point[]) {
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++) {
    const [xi,yi]=ring[i], [xj,yj]=ring[j];
    if((yi>y)!==(yj>y) && x<(xj-xi)*(y-yi)/(yj-yi)+xi) inside=!inside;
  }
  return inside;
}
function inPolygon(x:number,y:number,polygon:Polygon) {
  return inRing(x,y,polygon.outer) && !(polygon.holes||[]).some(hole=>inRing(x,y,hole));
}
/** The same OSM polygon holes are retained for courtyard traversal. */
export function isCampusWalkable(campus:CampusId,x:number,y:number) {
  if(!Number.isFinite(x)||!Number.isFinite(y)) return false;
  const world=worlds[campus],b=world.bounds;
  if(!world || x<b.minX || x>b.maxX || y<b.minY || y>b.maxY) return false;
  for(const [dx,dy] of [[0,0],[FOOT_RADIUS,0],[-FOOT_RADIUS,0],[0,FOOT_RADIUS],[0,-FOOT_RADIUS]]) {
    const px=x+dx,py=y+dy;
    if(!world.boundary.some(polygon=>inPolygon(px,py,polygon))) return false;
    if(world.obstacles.some(polygon=>inPolygon(px,py,polygon))) return false;
  }
  return true;
}
function clearSegment(campus:CampusId,a:Point,b:Point) {
  const count=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/0.45));
  for(let i=1;i<=count;i++) if(!isCampusWalkable(campus,a[0]+(b[0]-a[0])*i/count,a[1]+(b[1]-a[1])*i/count)) return false;
  return true;
}
function sequence(value:unknown) {
  if(!Number.isSafeInteger(value)||Number(value)<1||Number(value)>2_000_000_000) fail(400,'INVALID_SEQUENCE','移动序号不正确。');
  return Number(value);
}
const INTERIORS=new Set(['way/1473651054','way/1473779965']);
function interiorWalkable(id:string,x:number,y:number) {
  if(!Number.isFinite(x)||!Number.isFinite(y)||x<7||x>183||y<8||y>133) return false;
  const height=id==='way/1473651054'?9:15;
  for(const fy of [20,48,76])for(const fx of [15,55,95,135])if(x>fx-2&&x<fx+27&&y>fy-2&&y<fy+height+2)return false;
  return true;
}
function interiorClear(id:string,a:Point,b:Point) {
  const count=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/0.8));
  for(let i=1;i<=count;i++)if(!interiorWalkable(id,a[0]+(b[0]-a[0])*i/count,a[1]+(b[1]-a[1])*i/count))return false;
  return true;
}
async function move(db:D1Database,session:Session,input:Payload,now:number,teleport=false,connection?:ConnectionState):Promise<CampusSnapshot> {
  const previous=connection?.context;
  try{return await applyMove(db,session,input,now,teleport,connection);}
  catch(error){
    if(connection)connection.context=null;
    // An HTTP teleport/scene change may have advanced the same actor while this socket was idle.
    // Retry once only when authoritative state actually differs; malformed or truly illegal input stays rejected.
    if(connection&&previous&&error instanceof CampusError&&['MOVE_TOO_FAST','COLLISION','EXIT_REQUIRED','INTERIOR_ANCHOR','INVALID_INTERIOR','INTERIOR_COLLISION'].includes(error.code)){
      const latest=await roomContext(db,session.id);
      if(latest&&(latest.room.id!==previous.room.id||latest.player.seq!==previous.player.seq||latest.player.updated_at!==previous.player.updated_at||latest.player.x!==previous.player.x||latest.player.y!==previous.player.y||latest.player.interior!==previous.player.interior||latest.player.interior_x!==previous.player.interior_x||latest.player.interior_y!==previous.player.interior_y)){
        connection.context=latest;
        try{return await applyMove(db,session,input,now,teleport,connection);}catch(retryError){connection.context=null;throw retryError;}
      }
    }
    throw error;
  }
}
async function applyMove(db:D1Database,session:Session,input:Payload,now:number,teleport=false,connection?:ConnectionState) {
  let context=connection?.context;
  if(!context||input.roomId!==context.room.id)context=await currentRoom(db,session);
  const {player,room}=context,seq=sequence(input.seq);
  if(input.roomId!==room.id) fail(409,'ROOM_CHANGED','房间已经切换，请使用新房间继续同步。');
  if(seq<=player.seq) return snapshot(db,session,input.after,now,input.scope,connection);
  if(now-player.last_seen<65 && !teleport) fail(429,'SYNC_RATE','同步过快，请降低到每秒 10 次以内。');
  let x=Number(input.x),y=Number(input.y),direction=String(input.direction||player.direction),moving=input.moving===true,interior:string|null=player.interior;
  let ix=player.interior_x,iy=player.interior_y;
  let teleportedAt=player.teleported_at;
  const world=worlds[room.campus];
  if(teleport) {
    if(now-player.teleported_at<2000) fail(429,'TELEPORT_RATE','请稍等两秒后再传送。');
    const landmark=world.landmarks.find(poi=>poi.id===input.poiId);
    if(!landmark) fail(400,'INVALID_DESTINATION','未找到可用的校园入口。');
    [x,y]=landmark.entrance; moving=false; interior=null; ix=null; iy=null; teleportedAt=now;
    if(!isCampusWalkable(room.campus,x,y)) fail(409,'DESTINATION_BLOCKED','该入口暂不可用，请选择其他目的地。');
  } else {
    if(typeof input.x!=='number'||typeof input.y!=='number'||!Number.isFinite(x)||!Number.isFinite(y)) fail(400,'INVALID_POSITION','人物位置不正确。');
    if(!['up','down','left','right'].includes(direction)) fail(400,'INVALID_DIRECTION','人物方向不正确。');
    const elapsed=Math.min(2,Math.max(0,(now-player.updated_at)/1000));
    // 0.8 m jitter allowance accommodates independent client/server ticks; no teleport-sized budget.
    if(Math.hypot(x-player.x,y-player.y)>MAX_SPEED*elapsed+0.8) throw new CampusError(409,'MOVE_TOO_FAST','移动距离超出允许范围，已同步回服务器位置。',await snapshot(db,session,input.after,now,input.scope));
    if(!clearSegment(room.campus,[player.x,player.y],[x,y])) throw new CampusError(409,'COLLISION','前方是建筑、水面或校园边界，已恢复安全位置。',await snapshot(db,session,input.after,now,input.scope));
    if(input.interior!==undefined) {
      if(input.interior===null || input.interior==='') {
        if(player.interior && !((player.interior_y||0)>116 && Math.abs((player.interior_x||0)-95)<20)) fail(409,'EXIT_REQUIRED','请走到室内出口后离开。');
        interior=null;ix=null;iy=null;
      }
      else {
        const landmark=world.landmarks.find(poi=>poi.id===input.interior);
        if(!landmark || room.campus!=='south' || !INTERIORS.has(landmark.id) || Math.hypot(x-landmark.entrance[0],y-landmark.entrance[1])>12) fail(400,'INVALID_INTERIOR','请从日新楼或中心图书馆的入口进入室内。');
        if(player.interior && player.interior!==landmark.id) fail(409,'EXIT_REQUIRED','请先离开当前室内。');
        if(player.interior===landmark.id) {
          if(typeof input.interiorX!=='number'||typeof input.interiorY!=='number') fail(400,'INTERIOR_POSITION','室内坐标不正确。');
          const nx=input.interiorX,ny=input.interiorY;
          if(Math.hypot(x-player.x,y-player.y)>0.1) fail(409,'INTERIOR_ANCHOR','室内漫游不能改变校园入口位置。');
          if(Math.hypot(nx-(ix??95),ny-(iy??123))>20.4*elapsed+0.8 || !interiorClear(landmark.id,[ix??95,iy??123],[nx,ny])) throw new CampusError(409,'INTERIOR_COLLISION','室内移动超出范围或遇到家具，已恢复服务器位置。',await snapshot(db,session,input.after,now,input.scope));
          ix=nx;iy=ny;
        } else {ix=95;iy=123;}
        interior=landmark.id;
      }
    }
  }
  const update=db.prepare(`UPDATE campus_players SET x=?,y=?,direction=?,moving=?,interior=?,interior_x=?,interior_y=?,seq=?,updated_at=?,last_seen=?,teleported_at=? WHERE session_id=? AND room_id=? AND seq=? AND updated_at=? AND x=? AND y=? AND interior IS ? AND interior_x IS ? AND interior_y IS ?
    AND (last_seen>? OR (SELECT COUNT(*) FROM campus_players active WHERE active.room_id=? AND active.session_id<>? AND active.last_seen>?) < ?)`)
    .bind(x,y,direction,moving?1:0,interior,ix,iy,seq,now,now,teleportedAt,session.id,room.id,player.seq,player.updated_at,player.x,player.y,player.interior,player.interior_x,player.interior_y,now-ACTIVE_MS,room.id,session.id,now-ACTIVE_MS,room.max_players);
  const result=await roomSnapshot(db,session,room,input.after,now,input.scope,update);
  if(!result.changes) {
    const latest=await roomContext(db,session.id);if(connection)connection.context=latest;
    if(!latest||latest.room.id!==input.roomId)fail(409,'ROOM_CHANGED','房间已经切换，请使用新房间继续同步。');
    if(latest.player.last_seen<now-ACTIVE_MS)fail(409,'ROOM_FULL','房间已满，请重新选择其他房间。');
    return (await roomSnapshot(db,session,latest.room,input.after,now,input.scope)).value;
  }
  if(connection)connection.context={room,player:{...player,x,y,direction,moving:moving?1:0,interior,interior_x:ix,interior_y:iy,seq,updated_at:now,last_seen:now,teleported_at:teleportedAt}};
  return result.value;
}
async function join(db:D1Database,session:Session,id:unknown,now:number) {
  if(typeof id!=='string'||id.length>80) fail(400,'INVALID_ROOM','请输入有效的房间代码。');
  const room=await db.prepare('SELECT * FROM campus_rooms WHERE id=? OR code=?').bind(id,id.toUpperCase()).first<RoomRow>();
  if(!room) fail(404,'ROOM_NOT_FOUND','没有找到这个房间，请检查房间代码。');
  const current=await playerFor(db,session);
  const [x,y]=current?.room_id===room.id ? [current.x,current.y] : worlds[room.campus].spawn;
  if(!isCampusWalkable(room.campus,x,y)) fail(503,'SPAWN_UNAVAILABLE','校园出生点暂不可用。');
  // Capacity check and insertion execute as one SQLite statement, so concurrent joins cannot overfill.
  const result=await db.prepare(`INSERT INTO campus_players (session_id,room_id,x,y,direction,moving,interior,seq,updated_at,last_seen,teleported_at)
    SELECT ?,?,?,?,'down',0,NULL,0,?,?,0 WHERE (SELECT COUNT(*) FROM campus_players WHERE room_id=? AND session_id<>? AND last_seen>?) < ?
    ON CONFLICT(session_id) DO UPDATE SET room_id=excluded.room_id,x=excluded.x,y=excluded.y,direction='down',moving=0,interior=NULL,interior_x=NULL,interior_y=NULL,seq=0,updated_at=excluded.updated_at,last_seen=excluded.last_seen,teleported_at=0`)
    .bind(session.id,room.id,x,y,now,now,room.id,session.id,now-ACTIVE_MS,room.max_players).run();
  if(!result.meta.changes) fail(409,'ROOM_FULL','房间已满，请选择其他房间。');
  return snapshot(db,session,0,now);
}
async function chat(db:D1Database,session:Session,input:Payload,now:number) {
  const text=shortText(input.text,240,'消息'),scope=messageScope(input.scope);
  const {room,player}=await currentRoom(db,session);
  if(input.roomId!==room.id) fail(409,'ROOM_CHANGED','房间已经切换，请重新发送消息。');
  if(player.last_seen<now-ACTIVE_MS) fail(409,'ROOM_INACTIVE','连接已断开，请重新加入房间后发送消息。');
  await limit(db,`chat:${session.id}`,5,10_000,now);
  await db.prepare('INSERT INTO campus_messages (room_id,scope,campus,session_id,nickname,text,created_at) SELECT ?,?,?,id,nickname,?,? FROM campus_sessions WHERE id=?').bind(room.id,scope,room.campus,text,now,session.id).run();
  return snapshot(db,session,input.after,now,scope);
}
async function websocket(request:Request,db:D1Database,session:Session) {
  if(request.headers.get('upgrade')?.toLowerCase()!=='websocket') fail(426,'WEBSOCKET_REQUIRED','请使用 WebSocket 建立实时连接。');
  if(typeof WebSocketPair==='undefined') fail(503,'WEBSOCKET_UNAVAILABLE','当前环境未启用 WebSocket，请使用 HTTP 同步。');
  if(!request.headers.get('sec-websocket-protocol')?.split(',').map(x=>x.trim()).includes('campus-v1')) fail(400,'PROTOCOL_REQUIRED','实时连接协议不匹配，请刷新页面。');
  const pair=new WebSocketPair(),client=pair[0],server=pair[1];
  server.accept();
  // Only this connection's last accepted state is cached. Every write retains a D1 room+sequence CAS.
  const connection:ConnectionState={context:null};
  let running=false,closed=false; const queue:Payload[]=[];
  const send=(data:unknown)=>{if(!closed) try{server.send(JSON.stringify(data));}catch{closed=true;}};
  const drain=async()=>{
    if(running) return; running=true;
    while(queue.length&&!closed) {
      const input=queue.shift()!;
      try {
        if(session.expires_at<=Date.now()) {send({type:'error',error:'校园会话已过期，请重新进入。',code:'SESSION_EXPIRED'});server.close(1008,'会话已过期');break;}
        if(input.type==='sync') send(await move(db,session,input,Date.now(),false,connection));
        else if(input.type==='teleport') send(await move(db,session,input,Date.now(),true,connection));
        else if(input.type==='chat') send(await chat(db,session,input,Date.now()));
        else if(input.type==='snapshot') send(await snapshot(db,session,input.after,Date.now(),input.scope,connection));
        else fail(400,'INVALID_ACTION','无法识别的实时操作。');
      } catch(error) {send(errorPayload(error));}
    }
    running=false;
  };
  server.addEventListener('message',event=>{
    if(typeof event.data!=='string'||event.data.length>4096) {send({type:'error',code:'INVALID_MESSAGE',error:'实时消息过长或格式不正确。'});return;}
    let input:Payload;
    try {input=JSON.parse(event.data);}catch{send({type:'error',code:'INVALID_JSON',error:'实时消息格式不正确。'});return;}
    if(!input||typeof input!=='object'||Array.isArray(input)) return;
    if(queue.length>=8) {server.close(1008,'操作过于频繁');closed=true;return;}
    if(input.type==='sync'&&queue.at(-1)?.type==='sync') queue[queue.length-1]=input;
    else queue.push(input);
    void drain();
  });
  server.addEventListener('close',()=>{closed=true;});
  server.addEventListener('error',()=>{closed=true;});
  send({type:'ready',protocol:1,transport:'websocket',selfId:session.id,maxPlayers:MAX_PLAYERS});
  return new Response(null,{status:101,webSocket:client,headers:{'Sec-WebSocket-Protocol':'campus-v1'}});
}

/** Handles only the campus namespace; called before Vinext's normal route handler. */
export async function handleCampusRequest(request:Request,env:Env,options:{now?:()=>number}={}):Promise<Response> {
  const now=(options.now||Date.now)(),url=new URL(request.url),path=url.pathname.replace(/^\/api\/campus\/?/,'').replace(/\/$/,'');
  try {
    if(request.method!=='GET'||path==='ws') checkOrigin(request);
    const db=env.DB;
    if(!db) fail(503,'DATABASE_UNAVAILABLE','校园云端存储尚未就绪，请稍后重试。');
    if(path==='health'&&request.method==='GET') {
      try {await db.prepare('SELECT id FROM campus_sessions LIMIT 1').first();}catch{fail(503,'SCHEMA_PENDING','校园数据库正在初始化，请稍后重试。');}
      return response({ok:true,protocol:1,storage:'d1',maxPlayers:MAX_PLAYERS,campuses:['south','north'],httpSync:true,websocketSupported:typeof WebSocketPair!=='undefined',websocketVerification:'需由实际客户端握手确认',serverTime:now});
    }
    if(path==='session'&&request.method==='POST') {
      const input=await body(request),nickname=shortText(input.nickname,16,'昵称'),look=appearance(input.appearance);
      const ip=request.headers.get('cf-connecting-ip')||request.headers.get('oai-authenticated-user-id')||'unknown';
      await limit(db,`session:${await sha(ip)}`,30,60*60*1000,now);
      const id=crypto.randomUUID(),secret=[...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join(''),token=`${id}.${secret}`;
      const expiresAt=now+SESSION_MS;
      await db.prepare('INSERT INTO campus_sessions (id,secret_hash,owner_id,nickname,appearance,created_at,expires_at) VALUES (?,?,?,?,?,?,?)')
        .bind(id,await sha(token),request.headers.get('oai-authenticated-user-id'),nickname,JSON.stringify(look),now,expiresAt).run();
      await db.prepare('DELETE FROM campus_limits WHERE expires_at < ?').bind(now).run();
      return response({session:{id,nickname,appearance:look,token,expiresAt}},201);
    }
    const session=await authenticate(request,db,now);
    if(path==='ws'&&request.method==='GET') return await websocket(request,db,session);
    if(path==='me'&&request.method==='GET') return response({session:{id:session.id,nickname:session.nickname,appearance:JSON.parse(session.appearance),expiresAt:session.expires_at},roomId:(await playerFor(db,session))?.room_id||null});
    if(path==='me'&&request.method==='PATCH') {
      const input=await body(request),nickname=input.nickname===undefined?session.nickname:shortText(input.nickname,16,'昵称'),look=input.appearance===undefined?JSON.parse(session.appearance):appearance(input.appearance);
      await limit(db,`profile:${session.id}`,12,60_000,now);
      await db.prepare('UPDATE campus_sessions SET nickname=?,appearance=? WHERE id=?').bind(nickname,JSON.stringify(look),session.id).run();
      return response({session:{id:session.id,nickname,appearance:look,expiresAt:session.expires_at}});
    }
    if(path==='rooms'&&request.method==='GET') {
      const campus=campusId(url.searchParams.get('campus')||'south');
      const rows=await db.prepare(`SELECT r.*,(SELECT COUNT(*) FROM campus_players p WHERE p.room_id=r.id AND p.last_seen>?) AS players FROM campus_rooms r
        WHERE r.campus=? AND (r.created_at>? OR EXISTS(SELECT 1 FROM campus_players active WHERE active.room_id=r.id AND active.last_seen>?))
        ORDER BY players DESC,r.created_at DESC LIMIT 60`).bind(now-ACTIVE_MS,campus,now-120_000,now-ACTIVE_MS).all<RoomRow & {players:number}>();
      return response({rooms:rows.results.map(row=>({...roomView(row),players:row.players}))});
    }
    if(path==='rooms'&&request.method==='POST') {
      const input=await body(request),campus=campusId(input.campus),title=shortText(input.title,24,'房间名称');
      await limit(db,`room:${session.id}`,5,60_000,now);
      const id=crypto.randomUUID(),code=[...crypto.getRandomValues(new Uint8Array(6))].map(x=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x%31]).join('');
      await db.prepare('INSERT INTO campus_rooms (id,code,title,campus,owner_id,max_players,created_at) VALUES (?,?,?,?,?,?,?)').bind(id,code,title,campus,session.id,MAX_PLAYERS,now).run();
      return response(await join(db,session,id,now),201);
    }
    if(path==='join'&&request.method==='POST') {await limit(db,`join:${session.id}`,20,60_000,now);return response(await join(db,session,(await body(request)).roomId,now));}
    if(path==='leave'&&request.method==='POST') {
      const input=await body(request);
      if(typeof input.roomId!=='string'||input.roomId.length>80) fail(400,'INVALID_ROOM','离开房间需要提供当前房间编号。');
      const removed=await db.prepare('DELETE FROM campus_players WHERE session_id=? AND room_id=?').bind(session.id,input.roomId).run();
      return response({ok:true,left:!!removed.meta.changes});
    }
    if(path==='sync'&&request.method==='POST') return response(await move(db,session,await body(request),now));
    if(path==='teleport'&&request.method==='POST') return response(await move(db,session,await body(request),now,true));
    if(path==='snapshot'&&request.method==='GET') return response(await snapshot(db,session,url.searchParams.get('after'),now,url.searchParams.get('scope')));
    if(path==='messages'&&request.method==='GET') {const {room}=await currentRoom(db,session);return response(await messagesFor(db,room,url.searchParams.get('after'),now,url.searchParams.get('scope'),url.searchParams.get('before')));}
    if(path==='messages'&&request.method==='POST') return response(await chat(db,session,await body(request),now));
    const messageMatch=path.match(/^messages\/(\d+)(\/report)?$/);
    if(messageMatch) {
      const {room}=await currentRoom(db,session),id=Number(messageMatch[1]);
      const message=await db.prepare("SELECT * FROM campus_messages WHERE id=? AND ((scope='room' AND room_id=?) OR (scope='plaza' AND campus=?))").bind(id,room.id,room.campus).first<{session_id:string;deleted_at:number|null}>();
      if(!message) fail(404,'MESSAGE_NOT_FOUND','这条消息不存在或不在当前可见范围。');
      if(messageMatch[2]&&request.method==='POST') {
        const reason=shortText((await body(request)).reason,200,'举报原因');
        await limit(db,`report:${session.id}`,10,60_000,now);
        await db.prepare('INSERT INTO campus_reports (message_id,reporter_id,reason,created_at) VALUES (?,?,?,?) ON CONFLICT(message_id,reporter_id) DO NOTHING').bind(id,session.id,reason,now).run();
        return response({ok:true,message:'举报已记录，等待管理员审核。'});
      }
      if(!messageMatch[2]&&request.method==='DELETE') {
        if(message.session_id!==session.id) fail(403,'MESSAGE_OWNER','只能删除自己发送的消息。');
        await db.prepare("UPDATE campus_messages SET text='',deleted_at=? WHERE id=? AND session_id=?").bind(now,id,session.id).run();
        return response({ok:true,id});
      }
    }
    fail(404,'NOT_FOUND','没有找到这个校园接口。');
  } catch(error) {
    return response(errorPayload(error),error instanceof CampusError?error.status:503);
  }
}
