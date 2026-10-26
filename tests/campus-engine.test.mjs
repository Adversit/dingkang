import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createEngine} from '../public/apps/jlu-campus/engine.js';
import {createTransform} from '../public/apps/jlu-campus/geometry.js';
import {getInteriorDrawables} from '../public/apps/jlu-campus/interior-art.js';

import {RIXIN_ID,LIBRARY_ID,getInteriorLayout,interiorExitAt,isInteriorWalkable} from '../public/apps/jlu-campus/interior-layout.js';

// These tests execute the actual engine. The DOM/Canvas/Worker adapters only
// record drawing commands and control asynchronous delivery; no engine methods
// or navigation helpers are replaced.
const ring=(a,b,c,d)=>[[a,b],[c,b],[c,d],[a,d],[a,b]];
const building=(id,name,a,b,c,d)=>({id,name,tags:{building:'university'},bounds:[a,b,c,d],center:[(a+c)/2,(b+d)/2],polygons:[{outer:ring(a,b,c,d),holes:[]}]});
function fixture(){
  const rixin=building(RIXIN_ID,'日新楼',10,10,30,30),wall=building('way/2','教学楼',40,10,60,80);
  return{meta:{id:'qianwei-south',name:'测试校园',width:100,height:100,spawn:[20,32]},boundary:[],buildings:[rixin,wall],water:[],surfaces:[],roads:[],pois:[],landmarks:[{id:rixin.id,entrance:[20,32]},{id:wall.id,entrance:[39,40]}]};
}
function mockContext(){
  const commands=[],state={fillStyle:'#000',strokeStyle:'#000',lineWidth:1},stack=[];let arcs=[];
  const methods={
    beginPath(){arcs=[];},arc(x,y,r){arcs.push({x,y,r});},
    fill(){for(const arc of arcs)commands.push({operation:'fill',...arc,color:state.fillStyle});},
    stroke(){for(const arc of arcs)commands.push({operation:'stroke',...arc,color:state.strokeStyle});},
    save(){stack.push({...state});},restore(){Object.assign(state,stack.pop()||{});},
    measureText(text){return{width:String(text).length*12};},
    fillRect(x,y,w,h){commands.push({operation:'fillRect',x,y,w,h,color:state.fillStyle});},
    fillText(text,x,y){commands.push({operation:'fillText',text:String(text),x,y,color:state.fillStyle});},
    scale(x,y){commands.push({operation:'scale',x,y});},
    drawImage(image,...args){commands.push({operation:'drawImage',image,args});},
    createLinearGradient(){return{addColorStop(){}};},createRadialGradient(){return{addColorStop(){}};},
  };
  const context=new Proxy(state,{get(target,key){if(key==='commands')return commands;if(key in methods)return methods[key];if(key in target)return target[key];return()=>{};},set(target,key,value){target[key]=value;return true;}});
  return context;
}
function mockCanvas(width=600,height=500){
  const canvas=new EventTarget();canvas.width=width;canvas.height=height;canvas.dataset={};canvas.context=mockContext();
  canvas.getContext=()=>canvas.context;canvas.getBoundingClientRect=()=>({left:0,top:0,width,height});return canvas;
}
const south=JSON.parse(fs.readFileSync(new URL('../public/apps/jlu-campus/data/qianwei-south.json',import.meta.url),'utf8'));
function harness(data=fixture(),{width=600,height=500}={}){
  const names=['window','document','ResizeObserver','Worker','requestAnimationFrame','cancelAnimationFrame'],saved=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
  const frames=new Map(),workers=[];let frameId=0;
  const window=new EventTarget();window.devicePixelRatio=1;
  const document=new EventTarget();document.hidden=false;document.activeElement=null;document.querySelector=()=>null;document.createElement=tag=>{assert.equal(tag,'canvas');return mockCanvas();};
  class Worker{constructor(){this.messages=[];this.terminated=false;workers.push(this);}postMessage(message){this.messages.push(message);}terminate(){this.terminated=true;}deliver(message){this.onmessage?.({data:message});}}
  Object.assign(globalThis,{window,document,Worker,ResizeObserver:class{observe(){}disconnect(){}},requestAnimationFrame:callback=>{const id=++frameId;frames.set(id,callback);return id;},cancelAnimationFrame:id=>frames.delete(id)});
  const canvas=mockCanvas(width,height),events=[],engine=createEngine(canvas,{onNavigation:state=>events.push(state)});engine.load(data);
  return{engine,data,canvas,events,workers,map:()=>mockCanvas(),tick(time){const callbacks=[...frames.values()];frames.clear();for(const callback of callbacks)callback(time);},dispose(){engine.destroy();for(const[name,descriptor]of saved){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}}};
}
function pendingRequest(h){const worker=h.workers.at(-1),request=worker.messages.findLast(message=>message.type==='path');assert.ok(request,'route must use the real worker planning branch');return{worker,request};}
function expectedMapPoint(engine,map,data,point){const view=engine.getMapTransform(map),q=createTransform(data.meta.width,data.meta.height,203).forward(...point);return[view.ox+q[0]*view.z,view.oy+q[1]*view.z];}
function assertPoint(command,expected){assert.ok(command);assert.ok(Math.abs(command.x-expected[0])<1e-8);assert.ok(Math.abs(command.y-expected[1])<1e-8);}

test('cancelNavigation invalidates an outstanding worker reply and keeps the player still',()=>{
  const h=harness();try{
    h.engine.setTarget({x:80,y:32,name:'目的地'});assert.equal(h.engine.getNavigationState().status,'planning');
    const{worker,request}=pendingRequest(h),before=h.engine.getPosition();
    h.engine.cancelNavigation();worker.deliver({id:request.id,path:[[20,85],[80,85],[80,32]]});
    assert.equal(h.engine.getNavigationState().status,'idle');assert.deepEqual(h.engine.getMarker(),{x:80,y:32,name:'目的地'});
    h.tick(100);h.tick(150);assert.equal(h.engine.getPosition().x,before.x);assert.equal(h.engine.getPosition().y,before.y);assert.equal(h.engine.getPosition().moving,false);
    h.engine.cancelNavigation({clearMarker:true});assert.equal(h.engine.getMarker(),null);
  }finally{h.dispose();}
});

test('navigation replaces an old marker and legacy map settings cannot draw the old target',()=>{
  const h=harness();try{
    const a={x:8,y:80,name:'A'},b={x:80,y:32,name:'B'};h.engine.setMarker(a);h.engine.setTarget(b);
    assert.deepEqual(h.engine.getMarker(),b);assert.deepEqual(h.engine.getNavigationState().target,b);
    const copy=h.engine.getMarker();copy.x=999;assert.equal(h.engine.getMarker().x,80,'marker is returned as a copy');
    for(const full of [true,false]){const map=h.map();h.engine.drawMap(map,{full,marker:a});const marks=map.context.commands.filter(command=>command.operation==='stroke'&&command.color==='#aa7427');assert.equal(marks.length,1);assertPoint(marks[0],expectedMapPoint(h.engine,map,h.data,[80,32]));}
    const{worker,request}=pendingRequest(h);h.engine.setMarker(a);assert.equal(h.engine.getNavigationState().status,'idle');worker.deliver({id:request.id,path:[[80,32]]});assert.equal(h.engine.getNavigationState().status,'idle');assert.deepEqual(h.engine.getMarker(),a);
  }finally{h.dispose();}
});

test('entering 日新楼 cancels pending navigation so late replies do not resume after leaving',()=>{
  const h=harness(south);try{
    const layout=getInteriorLayout(RIXIN_ID),entry=layout.exits.find(exit=>exit.id==='main');
    h.engine.teleport({x:entry.exterior[0],y:entry.exterior[1]});
    const target=south.landmarks.find(landmark=>landmark.entrance&&!h.engine.getWorld().lineWalkable(entry.exterior,landmark.entrance));assert.ok(target);
    h.engine.setTarget({x:target.entrance[0],y:target.entrance[1]});const{worker,request}=pendingRequest(h);h.engine.interact();
    assert.equal(h.engine.getPosition().interior,RIXIN_ID);assert.equal(h.engine.getNavigationState().status,'idle');
    worker.deliver({id:request.id,path:[target.entrance]});assert.equal(h.engine.getNavigationState().status,'idle');
    h.engine.setJoystick(0,1);for(let time=100;time<=550;time+=50)h.tick(time);h.engine.setJoystick(0,0);
    h.engine.interact();assert.equal(h.engine.getPosition().interior,null);const before=h.engine.getPosition();h.tick(600);h.tick(650);assert.equal(h.engine.getPosition().x,before.x);assert.equal(h.engine.getPosition().y,before.y);assert.equal(h.engine.getPosition().moving,false);
  }finally{h.dispose();}
});

test('maps show only scoped room peers and place indoor peers at the geographic building entrance',()=>{
  const h=harness();try{
    const scope={roomId:'r1',campus:'south'},outside={id:'outside',name:'室外伙伴',x:80,y:85,roomId:'r1',campus:'south'},inside={id:'inside',name:'室内伙伴',x:80,y:85,interior:RIXIN_ID,interiorX:5000,interiorY:-5000,roomId:'r1',campus:'south'};
    h.engine.setRemotePlayers([outside,inside,{...outside,id:'wrong-room',roomId:'r2'},{...outside,id:'wrong-campus',campus:'north'}],scope);
    for(const full of [true,false]){const map=h.map();h.engine.drawMap(map,{full});const outsideDots=map.context.commands.filter(c=>c.operation==='fill'&&c.color==='#527da8'),insideDots=map.context.commands.filter(c=>c.operation==='stroke'&&c.color==='#527da8');assert.equal(outsideDots.length,1);assert.equal(insideDots.length,1);assertPoint(outsideDots[0],expectedMapPoint(h.engine,map,h.data,[80,85]));assertPoint(insideDots[0],expectedMapPoint(h.engine,map,h.data,[20,32]));}
    for(const[players,nextScope]of [[[],scope],[[outside],{roomId:'r1',campus:'north'}],[[outside],undefined]]){h.engine.setRemotePlayers(players,nextScope);const map=h.map();h.engine.drawMap(map);assert.equal(map.context.commands.filter(c=>c.color==='#527da8').length,0,'leaving a room or campus removes all remote map points');}
  }finally{h.dispose();}
});


test('all seven real outdoor doors enter their own spawn and leave at their corresponding outdoor door',()=>{
  const h=harness(south);try{
    const layout=getInteriorLayout(RIXIN_ID);let time=100;
    for(const exit of layout.exits){
      h.engine.teleport({x:exit.exterior[0],y:exit.exterior[1]});h.engine.interact();let current=h.engine.getPosition();
      assert.equal(current.interior,RIXIN_ID,exit.id);assert.equal(current.interiorRevision,layout.revision);
      assert.ok(Math.abs(current.interiorX-exit.spawn.x)<.001,exit.id+' indoor x');assert.ok(Math.abs(current.interiorY-exit.spawn.y)<.001,exit.id+' indoor y');
      h.engine.interact();assert.equal(h.engine.getPosition().interior,RIXIN_ID,'entry spawn is not an exit trigger');
      const target=[exit.x+exit.w/2,exit.y+exit.h/2],dx=target[0]-current.interiorX,dy=target[1]-current.interiorY,length=Math.hypot(dx,dy);
      h.engine.setJoystick(dx/length,dy/length);
      for(let frames=0;frames<30;frames++){h.tick(time);time+=50;current=h.engine.getPosition();if(Math.hypot(current.interiorX-target[0],current.interiorY-target[1])<.25&&interiorExitAt(layout,current.interiorX,current.interiorY)?.id===exit.id)break;}
      h.engine.setJoystick(0,0);assert.equal(interiorExitAt(layout,current.interiorX,current.interiorY)?.id,exit.id,'must walk to the exit trigger');h.engine.interact();
      current=h.engine.getPosition();assert.equal(current.interior,null,exit.id);assert.equal(current.x,exit.exterior[0],exit.id+' outdoor x');assert.equal(current.y,exit.exterior[1],exit.id+' outdoor y');
    }
  }finally{h.dispose();}
});

test('legacy interior saves return outdoors and fabricated distant door locations cannot enter',()=>{
  const h=harness(south);try{
    const layout=getInteriorLayout(RIXIN_ID),entry=layout.exits.find(exit=>exit.id==='main'),outside={x:entry.exterior[0],y:entry.exterior[1]};
    for(const revision of [undefined,'rixin-v1']){
      h.engine.reconcile({...outside,interior:RIXIN_ID,interiorX:95,interiorY:123,interiorRevision:revision});
      assert.equal(h.engine.getPosition().interior,null,'legacy state returns outdoors instead of entering a new layout with old coordinates');
    }
    h.engine.reconcile({...outside,interior:RIXIN_ID,interiorX:95,interiorY:123,interiorRevision:layout.revision});
    const current=h.engine.getPosition();assert.equal(current.interior,RIXIN_ID);assert.ok(Math.abs(current.interiorX-layout.spawn.x)<.001);assert.ok(Math.abs(current.interiorY-layout.spawn.y)<.001);
  }finally{h.dispose();}
  // A synthetic building with the right id/name has no portal at its arbitrary
  // entrance. Interaction must never infer a door from its name or centroid.
  const synthetic=harness();try{const before=synthetic.engine.getPosition();synthetic.engine.interact();assert.equal(synthetic.engine.getPosition().interior,null);assert.equal(synthetic.engine.getPosition().x,before.x);assert.equal(synthetic.engine.getPosition().y,before.y);}finally{synthetic.dispose();}
});

test('interior rendering draws current safe peers and hides legacy or invalid same-room coordinates',()=>{
  const h=harness(south);try{
    const layout=getInteriorLayout(RIXIN_ID),scope={roomId:'r1',campus:'south'},entry=layout.exits.find(exit=>exit.id==='main');h.engine.teleport({x:entry.exterior[0],y:entry.exterior[1]});h.engine.interact();
    const peer={x:entry.exterior[0],y:entry.exterior[1],roomId:'r1',campus:'south',interior:RIXIN_ID,interiorRevision:layout.revision,interiorX:32.5,interiorY:82};
    h.engine.setRemotePlayers([
      {...peer,id:'valid',name:'CURRENT_SAFE_PEER'},
      {...peer,id:'old',name:'LEGACY_PEER',interiorRevision:'rixin-v1'},
      {...peer,id:'missing',name:'UNVERSIONED_PEER',interiorRevision:undefined},
      {...peer,id:'wall',name:'BLOCKED_PEER',interiorX:30.5,interiorY:72},
      {...peer,id:'outside',name:'OUT_OF_BOUNDS_PEER',interiorX:95,interiorY:123},
    ],scope);
    h.canvas.context.commands.length=0;h.tick(100);
    const texts=h.canvas.context.commands.filter(command=>command.operation==='fillText').map(command=>command.text);
    assert.ok(texts.includes('CURRENT_SAFE_PEER'));
    for(const name of ['LEGACY_PEER','UNVERSIONED_PEER','BLOCKED_PEER','OUT_OF_BOUNDS_PEER'])assert.equal(texts.includes(name),false,name);
  }finally{h.dispose();}
});

test('a peer leaving through another door snaps to that exterior immediately instead of sliding through the building',()=>{
  const h=harness(south);try{
    const layout=getInteriorLayout(RIXIN_ID),main=layout.exits.find(exit=>exit.id==='main'),side=layout.exits.find(exit=>exit.id==='right-north'),scope={roomId:'r1',campus:'south'};
    const peer={id:'cross-door-peer',name:'换门离开的伙伴',roomId:'r1',campus:'south',x:main.exterior[0],y:main.exterior[1],interior:RIXIN_ID,interiorRevision:layout.revision,interiorX:side.spawn.x,interiorY:side.spawn.y};
    h.engine.setRemotePlayers([peer],scope);
    const before=h.map();h.engine.drawMap(before,{full:true});assert.equal(before.context.commands.filter(command=>command.operation==='stroke'&&command.color==='#527da8').length,1);
    h.engine.setRemotePlayers([{...peer,x:side.exterior[0],y:side.exterior[1],interior:null,interiorRevision:null,interiorX:null,interiorY:null}],scope);
    const after=h.map();h.engine.drawMap(after,{full:true});const dots=after.context.commands.filter(command=>command.operation==='fill'&&command.color==='#527da8');
    assert.equal(dots.length,1);assertPoint(dots[0],expectedMapPoint(h.engine,after,h.data,side.exterior));
    assert.equal(after.context.commands.filter(command=>command.operation==='stroke'&&command.color==='#527da8').length,0);
    const sideEntry=layout.exits.find(exit=>exit.ref==='1号门');
    h.engine.setRemotePlayers([{...peer,x:sideEntry.exterior[0],y:sideEntry.exterior[1],interiorX:5000,interiorY:-5000}],scope);
    const insideSide=h.map();h.engine.drawMap(insideSide,{full:true});const circles=insideSide.context.commands.filter(command=>command.operation==='stroke'&&command.color==='#527da8');
    assert.equal(circles.length,1);assertPoint(circles[0],expectedMapPoint(h.engine,insideSide,h.data,sideEntry.exterior));
  }finally{h.dispose();}
});


for(const[id,title,peerOffset]of[[RIXIN_ID,'日新楼',4],[LIBRARY_ID,'中心图书馆',10]])test(`${title} zoom scales the room and peer spacing without moving either coordinate system`,()=>{
  const h=harness(south);try{
    const layout=getInteriorLayout(id),entry=id===RIXIN_ID?layout.exits.find(exit=>exit.id==='main').exterior:south.landmarks.find(landmark=>landmark.id===id).entrance;
    h.engine.reconcile({x:entry[0],y:entry[1],interior:id,interiorRevision:layout.revision,interiorX:layout.spawn.x,interiorY:layout.spawn.y});
    const before=h.engine.getPosition(),peer={id:'zoom-peer',name:'ZOOM_COMPARISON_PEER',roomId:'r1',campus:'south',x:entry[0],y:entry[1],interior:id,interiorRevision:layout.revision,interiorX:layout.spawn.x+peerOffset,interiorY:layout.spawn.y};
    assert.equal(before.interior,id);assert.ok(isInteriorWalkable(layout,peer.interiorX,peer.interiorY));
    h.engine.setRemotePlayers([peer],{roomId:'r1',campus:'south'});
    const observations=new Map();let time=100;
    for(const zoom of [1,.4,2]){
      h.engine.setOptions({zoom});h.canvas.context.commands.length=0;h.tick(time);time+=50;
      assert.deepEqual(h.engine.getPosition(),before,'zoom must not change world coordinates, interior coordinates, direction or motion');
      assert.ok(h.engine.getWorld().isWalkable(before.x,before.y));assert.ok(isInteriorWalkable(layout,before.interiorX,before.interiorY));
      const commands=h.canvas.context.commands,texts=commands.filter(command=>command.operation==='fillText'),self=texts.find(command=>command.text==='我 · 访客'),other=texts.find(command=>command.text===peer.name);
      assert.ok(self);assert.ok(other);const distance=other.x-self.x;assert.ok(distance>0);
      const roomScale=id===RIXIN_ID?commands.find(command=>command.operation==='drawImage').args[2]/layout.width:commands.find(command=>command.operation==='scale').x;
      assert.ok(Math.abs(distance-peerOffset*roomScale)<=1,'self and peer must use the same room projection');
      if(id===RIXIN_ID){const image=commands.find(command=>command.operation==='drawImage');assert.ok(Math.abs(image.args[3]-layout.height*roomScale)<1e-8,'cached artwork height uses the same scale');}
      observations.set(zoom,{distance,roomScale});
    }
    const base=observations.get(1);
    for(const zoom of [.4,2]){const result=observations.get(zoom);assert.ok(Math.abs(result.roomScale/base.roomScale-zoom)<1e-10);assert.ok(Math.abs(result.distance-base.distance*zoom)<=1);}
    assert.ok(observations.get(.4).roomScale<base.roomScale&&base.roomScale<observations.get(2).roomScale,'zoom changes the visible world extent');
  }finally{h.dispose();}
});

test('zooming out keeps the actor proportional to the world without changing its coordinates',()=>{
  const h=harness();try{
    h.engine.setOptions({avatar:0});const before=h.engine.getPosition(),scales=new Map();
    for(const [i,zoom]of [1,.4,2].entries()){
      h.engine.setOptions({zoom});h.canvas.context.commands.length=0;h.tick(100+i*50);
      const commands=h.canvas.context.commands,shirt=commands.findIndex(c=>c.operation==='fillRect'&&c.color==='#d96669');
      assert.ok(shirt>=0);const scale=commands.slice(0,shirt).findLast(c=>c.operation==='scale');
      scales.set(zoom,scale.x);assert.equal(scale.x,scale.y);assert.deepEqual(h.engine.getPosition(),before);
    }
    assert.ok(Math.abs(scales.get(.4)/scales.get(1)-.4)<1e-10);
    assert.ok(Math.abs(scales.get(2)/scales.get(1)-2)<1e-10);
  }finally{h.dispose();}
});

test('a wide zoomed-out view keeps all visible tiles cached, and travel stays within the cache budget',()=>{
  const data=fixture();data.meta.width=1200;data.meta.height=1200;
  const h=harness(data,{width:1363,height:936});try{
    h.engine.setOptions({zoom:.4});h.tick(100);
    let stats=h.engine.getRenderStats();assert.ok(stats.visibleChunks>48);
    assert.equal(stats.cachedChunks,stats.visibleChunks);
    const built=stats.groundBuilds;
    for(let time=150;time<=500;time+=50)h.tick(time);
    assert.equal(h.engine.getRenderStats().groundBuilds,built,'stationary frames must reuse every visible tile');
    for(const [i,p]of [[300,300],[800,800],[300,800],[800,300]].entries()){
      assert.ok(h.engine.teleport({x:p[0],y:p[1]}));h.tick(600+i*100);
      stats=h.engine.getRenderStats();assert.ok(stats.cachedChunks<=stats.chunkBudget);
      assert.ok(stats.cachedChunks>=stats.visibleChunks);
      h.tick(650+i*100);assert.equal(h.engine.getRenderStats().groundBuilds,stats.groundBuilds);
    }
    h.engine.setOptions({zoom:2});h.tick(1100);stats=h.engine.getRenderStats();
    assert.equal(stats.chunkBudget,48);assert.ok(stats.cachedChunks<=48);
  }finally{h.dispose();}
});

for(const id of [RIXIN_ID,LIBRARY_ID])test(`${id} furniture and players reverse their draw order across the same footprint`,()=>{
  const h=harness(south,{width:1000,height:900});try{
    const layout=getInteriorLayout(id),f=layout.objects.find(f=>{
      const x=f.x+f.w/2;return isInteriorWalkable(layout,x,f.y-layout.footRadius-.2)&&isInteriorWalkable(layout,x,f.y+f.h+layout.footRadius+.2);
    });assert.ok(f);
    const entry=id===RIXIN_ID?layout.exits.find(e=>e.id==='main').exterior:south.landmarks.find(l=>l.id===id).entrance;
    const x=f.x+f.w/2;
    // The sprite is the same cached object the production render queue uses.
    const capture=mockContext();
    getInteriorDrawables({layout,cameraX:x,cameraY:f.y},{width:1000,height:900,scale:4}).find(d=>d.id===f.id).draw(capture);
    const sprite=capture.commands.find(c=>c.operation==='drawImage').image;
    let tick=100;
    for(const [y,behind]of [[f.y-layout.footRadius-.2,true],[f.y+f.h+layout.footRadius+.2,false]]){
      h.engine.reconcile({x:entry[0],y:entry[1],interior:id,interiorRevision:layout.revision,interiorX:x,interiorY:y});
      assert.equal(h.engine.getPosition().interior,id);h.canvas.context.commands.length=0;h.tick(tick);tick+=100;
      const commands=h.canvas.context.commands,actor=commands.findIndex(c=>c.operation==='fillRect'&&c.color==='#d96669'),furniture=commands.findIndex(c=>c.operation==='drawImage'&&c.image===sprite);
      assert.ok(actor>=0&&furniture>=0);
      assert.equal(actor<furniture,behind,'a player behind furniture must be drawn first, and a player in front last');
      const label=commands.findIndex(c=>c.operation==='fillText'&&c.text==='我 · 访客');assert.ok(label>actor&&label>furniture,'the name remains readable above furniture');
    }
  }finally{h.dispose();}
});
