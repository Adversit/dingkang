const API='/api/campus';
const SESSION_KEY='jlu-campus-session-v1';
export class CampusNetwork {
  constructor(callbacks={}){this.callbacks=callbacks;this.session=null;this.room=null;this.position=null;this.seq=0;this.lastMessageId=0;this.snapshot=null;this.mode='offline';this.socket=null;this.timer=null;this.busy=false;this.failures=0;this.stopped=true;this.lastSocketAttempt=0;this.wsReady=false;this.wsAllowed=true;this.pendingReply=0;this.generation=0;this.scope='plaza';this.hasOlderMessages=false;this.messageCache=new Map();this.messageEpoch=0;this.resumePromise=null;this.roomQueue=Promise.resolve();}
  emit(name,value){this.callbacks[name]?.(value);}
  status(state,text){this.emit('onStatus',{state,text,mode:this.mode});}
  async request(path,{method='GET',body,auth=true}={}){
    const headers={'Accept':'application/json'};if(body!==undefined)headers['Content-Type']='application/json';if(auth&&this.session?.token)headers.Authorization='Bearer '+this.session.token;
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);const startedAt=Date.now();
    try{const r=await fetch(API+path,{method,headers,body:body!==undefined?JSON.stringify(body):undefined,cache:'no-store',signal:controller.signal});let data;try{data=await r.json();}catch{throw Error('联机服务返回了无法识别的响应。');}this.rttMs=Date.now()-startedAt;if(path==='/sync'||path.startsWith('/snapshot'))this.syncRttMs=this.rttMs;if(!r.ok){const e=new Error(typeof data.error==='string'?data.error:data.error?.message||data.message||'联机操作未完成。');e.status=r.status;e.code=data.code;e.snapshot=data.snapshot;throw e;}return data;}catch(e){if(e.name==='AbortError')throw Error('联机请求超时，正在重试。');throw e;}finally{clearTimeout(timeout);}
  }
  async initialize(profile){
    let saved=null;try{saved=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null');}catch{sessionStorage.removeItem(SESSION_KEY);}if(saved?.token&&saved.id){this.session=saved;try{const me=await this.request('/me');this.session={...this.session,...me.session};this.restoreRoomId=me.roomId;this.saveSession();}catch(e){if(e.status!==401&&e.status!==403)throw e;this.session=null;sessionStorage.removeItem(SESSION_KEY);}}
    if(!this.session){const data=await this.request('/session',{method:'POST',auth:false,body:{nickname:profile.nickname,appearance:{avatar:profile.avatar}}});if(!data.session?.token)throw Error('创建漫游身份失败，请稍后重试。');this.session=data.session;this.saveSession();}
    this.emit('onSession',this.session);return this.session;
  }
  saveSession(){try{sessionStorage.setItem(SESSION_KEY,JSON.stringify(this.session));}catch{}}
  async connect(campus,profile){
    this.status('connecting','正在连接校园广场…');await this.initialize(profile);const rooms=await this.listRooms(campus);const old=rooms.find(r=>r.id===this.restoreRoomId);const room=old||rooms.find(r=>r.players<r.maxPlayers);this.restoreRoomId=null;
    if(room)await this.join(room.id);else await this.create('校园广场',campus);return this.room;
  }
  async listRooms(campus){const data=await this.request('/rooms?campus='+encodeURIComponent(campus));return data.rooms||[];}
  roomMutation(action){const promise=this.roomQueue.then(action);this.roomQueue=promise.catch(()=>{});return promise;}
  create(title,campus){return this.roomMutation(()=>this.createNow(title,campus));}
  join(roomId){return this.roomMutation(()=>this.joinNow(roomId));}
  async createNow(title,campus){this.stopTransport();const generation=this.generation;try{const data=await this.request('/rooms',{method:'POST',body:{title:title||'校园广场',campus}});if(generation!==this.generation)throw Error('另一次房间操作已生效。');await this.callbacks.onBeforeRoomChange?.(data.room);this.resetRoom(data);return data;}catch(e){if(generation===this.generation&&this.room){this.stopped=false;this.startTransport();}throw e;}}
  async joinNow(roomId){this.stopTransport();const generation=this.generation;try{const data=await this.request('/join',{method:'POST',body:{roomId:roomId.trim()}});if(generation!==this.generation)throw Error('另一次房间操作已生效。');await this.callbacks.onBeforeRoomChange?.(data.room);this.resetRoom(data);return data;}catch(e){if(generation===this.generation&&this.room){this.stopped=false;this.startTransport();}throw e;}}
  resetRoom(data){this.stopTransport();this.messageCache.clear();this.lastMessageId=0;this.seq=0;this.accept(this.scope==='plaza'?data:{...data,messages:[],lastMessageId:0},true,true);this.stopped=false;this.failures=0;this.mode='http';this.status('online','已连接 · HTTP 同步');this.startTransport();}
  accept(data,reconcile=false,replaceMessages=false){
    if(!data||data.type!=='snapshot')return;if(replaceMessages){this.messageEpoch++;this.messageCache.clear();this.lastMessageId=0;this.hasOlderMessages=false;this.emit('onMessagesReset');}this.snapshot=data;this.room=data.room;this.lastMessageId=Math.max(this.lastMessageId,Number(data.lastMessageId)||0);const self=(data.players||[]).find(p=>p.id===data.selfId);if(self){this.seq=Math.max(this.seq,self.seq||0);const sameInterior=self.interior&&self.interior===this.position?.interior,revisionChanged=sameInterior&&(self.interiorRevision??null)!==(this.position?.interiorRevision??null),anchorChanged=sameInterior&&Math.hypot(self.x-this.position.x,self.y-this.position.y)>.1;if(reconcile||!this.position||revisionChanged||anchorChanged){this.position={x:self.x,y:self.y,direction:self.direction,moving:false,interior:self.interior,interiorRevision:self.interiorRevision??null,interiorX:self.interiorX,interiorY:self.interiorY};this.emit('onReconcile',this.position);}}
    for(const m of data.messages||[])if(!m.scope||m.scope===this.scope)this.messageCache.set(m.id,m);if(this.messageCache.size>300){for(const id of [...this.messageCache.keys()].sort((a,b)=>a-b).slice(0,this.messageCache.size-300))this.messageCache.delete(id);}this.emit('onSnapshot',{...data,messages:[...this.messageCache.values()].sort((a,b)=>a.id-b.id)});
  }
  setPosition(position){this.position={...position};}
  startTransport(){this.schedule(30);this.tryWebSocket();}
  schedule(delay=220){clearTimeout(this.timer);if(!this.stopped)this.timer=setTimeout(()=>this.tick(),delay);}
  async tick(){
    if(this.stopped)return;if(this.busy){this.schedule(70);return;}this.busy=true;const generation=this.generation,roomId=this.room?.id,messageEpoch=this.messageEpoch,recovering=this.failures>0;
    try{
      const p=this.position,after=recovering?0:this.lastMessageId;const input=p?{type:'sync',...p,roomId,scope:this.scope,seq:++this.seq,after}:{type:'snapshot',scope:this.scope,after};
      if(this.socket?.readyState===WebSocket.OPEN&&this.wsReady){if(this.pendingReply&&Date.now()-this.pendingReply>5000){this.socket.close();this.wsReady=false;throw Error('实时连接超时，切换备用同步。');}if(!this.pendingReply){this.socket.send(JSON.stringify(input));this.pendingReply=Date.now();}}
      else{const data=await this.request(p?'/sync':'/snapshot?after='+after+'&scope='+this.scope,p?{method:'POST',body:input}:{});if(generation!==this.generation||roomId!==this.room?.id||messageEpoch!==this.messageEpoch)return;this.accept(data,false,recovering);if(this.mode!=='http'||this.failures){this.mode='http';this.status('online','已连接 · HTTP 同步');}if(this.wsAllowed&&Date.now()-this.lastSocketAttempt>45000)this.tryWebSocket();}
      this.failures=0;
    }catch(e){if(generation!==this.generation||messageEpoch!==this.messageEpoch)return;if(e.status===409&&e.snapshot){this.accept(e.snapshot,true);this.status('online','已校正位置');}else{this.failures++;this.status('reconnecting',e.message||'连接中断，正在重连…');}}
    finally{if(generation===this.generation){this.busy=false;this.schedule(this.failures?Math.min(8000,500*2**Math.min(this.failures,4)):document.hidden?1500:!this.position?.moving?750:this.mode==='websocket'?130:230);}}
  }
  tryWebSocket(){
    if(this.stopped||!this.session?.token||this.socket?.readyState===WebSocket.OPEN||this.socket?.readyState===WebSocket.CONNECTING)return;
    this.lastSocketAttempt=Date.now();const generation=this.generation;let ws;try{ws=new WebSocket((location.protocol==='https:'?'wss:':'ws:')+'//'+location.host+API+'/ws',['campus-v1','campus-token.'+this.session.token]);}catch{return;}this.socket=ws;let acknowledged=false;
    const timeout=setTimeout(()=>{if(!acknowledged)ws.close();},6000);
    ws.onopen=()=>{if(generation!==this.generation)return ws.close();ws.send(JSON.stringify({type:'snapshot',scope:this.scope,after:0}));};
    ws.onmessage=(event)=>{if(generation!==this.generation)return;let data;try{data=JSON.parse(event.data);}catch{return;}if(this.pendingReply){this.rttMs=Date.now()-this.pendingReply;this.syncRttMs=this.rttMs;}this.pendingReply=0;if(data.type==='snapshot'){const replaceMessages=!acknowledged;acknowledged=true;clearTimeout(timeout);this.wsReady=true;if(this.mode!=='websocket'){this.mode='websocket';this.status('online','已连接 · WebSocket 实时');}this.accept(data,false,replaceMessages);}else if(data.type==='error'){if(data.snapshot)this.accept(data.snapshot,true);this.emit('onError',data.error||'实时操作未完成。');}};
    ws.onerror=()=>{};ws.onclose=()=>{clearTimeout(timeout);if(generation!==this.generation)return;this.socket=null;this.wsReady=false;this.pendingReply=0;if(this.mode==='websocket'){this.mode='http';this.failures=1;this.status('reconnecting','实时连接断开，正在恢复同步…');}};
  }
  stopTransport(){this.generation++;this.stopped=true;this.busy=false;clearTimeout(this.timer);this.timer=null;this.wsReady=false;this.pendingReply=0;if(this.socket){this.socket.onclose=null;this.socket.close();this.socket=null;}}
  leave(){const requestedRoomId=this.room?.id;return this.roomMutation(()=>this.room?.id===requestedRoomId?this.leaveNow():undefined);}
  async leaveNow(){this.stopTransport();const generation=this.generation,roomId=this.room?.id;try{if(this.session&&roomId)await this.request('/leave',{method:'POST',body:{roomId}});}finally{if(generation===this.generation){this.room=null;this.snapshot=null;this.messageCache.clear();this.mode='offline';this.status('offline','独自漫游');this.emit('onSnapshot',{players:[],messages:[],room:null,selfId:this.session?.id});}}}
  async updateProfile(profile){if(!this.session)return;const data=await this.request('/me',{method:'PATCH',body:{nickname:profile.nickname,appearance:{avatar:profile.avatar}}});this.session={...this.session,...data.session};this.saveSession();this.emit('onSession',this.session);return this.session;}
  async sendMessage(text){if(!this.room)throw Error('请先加入一个房间。');const generation=this.generation,messageEpoch=this.messageEpoch;const data=await this.request('/messages',{method:'POST',body:{text,roomId:this.room.id,scope:this.scope}});if(generation!==this.generation||messageEpoch!==this.messageEpoch)return data;if(data.type==='snapshot')this.accept(data);else await this.refreshSnapshot();return data;}
  async deleteMessage(id){const generation=this.generation;const data=await this.request('/messages/'+encodeURIComponent(id),{method:'DELETE'});if(generation!==this.generation)return data;if(data.type==='snapshot')this.accept(data);else{const old=this.messageCache.get(id);if(old)this.messageCache.set(id,{...old,text:'',deleted:true});await this.refreshSnapshot();}return data;}
  async reportMessage(id,reason){return this.request('/messages/'+encodeURIComponent(id)+'/report',{method:'POST',body:{reason}});}
  async refreshSnapshot(replaceMessages=false){const generation=this.generation,messageEpoch=this.messageEpoch;const data=await this.request('/snapshot?after=0&scope='+this.scope);if(generation===this.generation&&messageEpoch===this.messageEpoch)this.accept(data,false,replaceMessages);return data;}
  resume(){if(this.resumePromise)return this.resumePromise;this.resumePromise=this.roomMutation(async()=>{if(!this.room)return;this.stopTransport();const generation=this.generation;this.status('connecting','正在恢复校园消息…');try{await this.refreshSnapshot(true);if(generation===this.generation){this.failures=0;this.mode='http';this.status('online','已连接 · HTTP 同步');}}catch(error){this.failures=1;this.status('reconnecting',error.message||'正在重新连接校园…');throw error;}finally{if(generation===this.generation){this.stopped=false;this.startTransport();}}}).finally(()=>{this.resumePromise=null;});return this.resumePromise;}
  teleport(poiId){return this.roomMutation(()=>this.teleportNow(poiId));}
  async teleportNow(poiId){if(!this.room)throw Error('请先加入房间，再使用传送。');this.stopTransport();const generation=this.generation;try{const data=await this.request('/teleport',{method:'POST',body:{poiId,seq:++this.seq,roomId:this.room.id,scope:this.scope}});if(generation===this.generation)this.accept(data,true);return data;}finally{if(generation===this.generation){this.stopped=false;this.startTransport();}}}
  setScope(scope){return this.roomMutation(()=>this.setScopeNow(scope));}
  async setScopeNow(scope){if(!['plaza','room'].includes(scope))return;this.scope=scope;this.messageCache.clear();this.lastMessageId=0;if(!this.room)return;this.stopTransport();const generation=this.generation;try{await this.refreshSnapshot();}finally{if(generation===this.generation){this.stopped=false;this.startTransport();}}}
  async loadOlderMessages(){if(!this.room)return;const generation=this.generation,messageEpoch=this.messageEpoch;const oldest=Math.min(...this.messageCache.keys());const data=await this.request('/messages?scope='+this.scope+(Number.isFinite(oldest)?'&before='+oldest:''));if(generation!==this.generation||messageEpoch!==this.messageEpoch)return;this.hasOlderMessages=!!data.hasMore;for(const m of data.messages||[])this.messageCache.set(m.id,m);if(this.snapshot)this.emit('onSnapshot',{...this.snapshot,messages:[...this.messageCache.values()].sort((a,b)=>a.id-b.id)});return data;}
  async health(){return this.request('/health',{auth:false});}
  destroy(){this.stopTransport();}
}
