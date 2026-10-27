import test from 'node:test';
import assert from 'node:assert/strict';
import {createEngine} from '../public/apps/jlu-campus/engine.js';
import {createTransform} from '../public/apps/jlu-campus/geometry.js';

function canvas(width=180,height=180){
  const el=new EventTarget(),commands=[],state={},stack=[];let arcs=[];
  Object.assign(el,{width,height,dataset:{},cssWidth:width,cssHeight:height});
  const methods={save(){stack.push({...state});},restore(){Object.assign(state,stack.pop()||{});},beginPath(){arcs=[];},arc(x,y,r){arcs.push({x,y,r});},fill(){commands.push({op:'fill',color:state.fillStyle,arcs:[...arcs]});},stroke(){},fillRect(...args){commands.push({op:'fillRect',args,color:state.fillStyle});},drawImage(image,...args){commands.push({op:'drawImage',image,args});},measureText(text){return{width:String(text).length*12};},createLinearGradient(){return{addColorStop(){}};},createRadialGradient(){return{addColorStop(){}};}};
  el.context=new Proxy(state,{get(target,key){return key==='commands'?commands:methods[key]??target[key]??(()=>{});},set(target,key,value){target[key]=value;return true;}});
  el.getContext=()=>el.context;el.getBoundingClientRect=()=>({left:0,top:0,width:el.cssWidth,height:el.cssHeight});return el;
}
const data=()=>({meta:{id:'qianwei-south',name:'缓存测试校园',width:2000,height:2000,spawn:[1000,1000]},boundary:[],buildings:[],roads:[],water:[],surfaces:[],pois:[],landmarks:[]});
function harness(){
  const names=['window','document','ResizeObserver','Worker','requestAnimationFrame','cancelAnimationFrame'],saved=new Map(names.map(n=>[n,Object.getOwnPropertyDescriptor(globalThis,n)]));
  const win=new EventTarget(),doc=new EventTarget();win.devicePixelRatio=1;doc.hidden=false;doc.querySelector=()=>null;doc.createElement=()=>canvas();
  Object.assign(globalThis,{window:win,document:doc,ResizeObserver:class{observe(){}disconnect(){}},Worker:class{postMessage(){}terminate(){}},requestAnimationFrame:()=>1,cancelAnimationFrame(){}});
  const engine=createEngine(canvas(600,500));engine.load(data());
  return{engine,dispose(){engine.destroy();for(const[n,d]of saved){if(d)Object.defineProperty(globalThis,n,d);else delete globalThis[n];}}};
}
const builds=e=>e.getRenderStats().mapBaseBuilds;
const circles=(map,color)=>map.context.commands.filter(c=>c.op==='fill'&&c.color===color).flatMap(c=>c.arcs);

test('repeated minimap draws reuse a bounded base while peer and marker overlays stay live',()=>{
  const h=harness();try{
    const map=canvas(),scope={roomId:'test-room',campus:'south'};
    h.engine.setRemotePlayers([{id:'first',roomId:scope.roomId,campus:'south',x:1004,y:1002}],scope);
    h.engine.drawMap(map,{full:false});assert.equal(builds(h.engine),1);
    const base=map.context.commands.find(c=>c.op==='drawImage').image;
    assert.equal(base.width,180+128);assert.equal(base.height,180+128);
    const first=circles(map,'#527da8');assert.equal(first.length,1);
    h.engine.setRemotePlayers([{id:'replacement',roomId:scope.roomId,campus:'south',x:1020,y:1010}],scope);
    h.engine.setMarker({x:1005,y:1005});map.context.commands.length=0;
    h.engine.drawMap(map,{full:false});assert.equal(builds(h.engine),1);
    assert.equal(map.context.commands.find(c=>c.op==='drawImage').image,base);
    const second=circles(map,'#527da8');assert.equal(second.length,1);assert.notDeepEqual(second,first);
    h.engine.setRemotePlayers([],scope);map.context.commands.length=0;h.engine.drawMap(map,{full:false});
    assert.equal(builds(h.engine),1);assert.equal(circles(map,'#527da8').length,0);
  }finally{h.dispose();}
});

test('minimap camera movement shifts cached pixels and picking uses the current transform',()=>{
  const h=harness();try{
    const map=canvas();h.engine.drawMap(map,{full:false});const initial={...h.engine.getMapTransform(map)};
    h.engine.teleport({x:1005,y:1005});map.context.commands.length=0;h.engine.drawMap(map,{full:false});
    assert.equal(builds(h.engine),1);const view=h.engine.getMapTransform(map);assert.notDeepEqual(view,initial);
    const image=map.context.commands.find(c=>c.op==='drawImage');assert.ok(Math.abs(image.args[0]+64)>0);
    const q=createTransform(2000,2000,203).forward(1005,1005),picked=h.engine.mapToWorld(map,view.ox+q[0]*view.z,view.oy+q[1]*view.z);
    assert.ok(Math.abs(picked.x-1005)<1e-8);assert.ok(Math.abs(picked.y-1005)<1e-8);
    h.engine.teleport({x:1300,y:1000});h.engine.drawMap(map,{full:false});assert.equal(builds(h.engine),2);
  }finally{h.dispose();}
});

test('map bases rebuild for size, device scale, selection, view and campus changes',()=>{
  const h=harness();try{
    const map=canvas();let expected=0;
    const draw=settings=>{h.engine.drawMap(map,settings);assert.equal(builds(h.engine),++expected);};
    draw({full:false});map.width=360;map.height=360;draw({full:false});
    map.cssWidth=360;map.cssHeight=360;draw({full:false});
    draw({full:false,selectedId:'way/1'});draw({full:true});draw({full:true,zoom:2});
    draw({full:true,zoom:2,center:[800,800]});draw({full:true,zoom:2,center:[800,800],selectedId:'way/1'});
    h.engine.drawMap(map,{full:true,zoom:2,center:[800,800],selectedId:'way/1'});assert.equal(builds(h.engine),expected);
    h.engine.load({...data(),meta:{...data().meta,id:'qianwei-north'}});assert.equal(builds(h.engine),0);
    h.engine.drawMap(map,{full:false});assert.equal(builds(h.engine),1);
  }finally{h.dispose();}
});

test('minimap static layers keep source paint order and cull distant geometry',()=>{
  const h=harness();try{
    const surface=(id,x,y,tags)=>({id,tags,bounds:[x,y,x+20,y+20],center:[x+10,y+10],polygons:[{outer:[[x,y],[x+20,y],[x+20,y+20],[x,y+20],[x,y]],holes:[]}]});
    const next=data();next.surfaces=[surface('forest',990,990,{natural:'wood'}),surface('garden',995,995,{leisure:'garden'}),surface('distant-pitch',1700,1700,{leisure:'pitch'})];
    h.engine.load(next);const map=canvas();h.engine.drawMap(map,{full:false});
    const base=map.context.commands.find(c=>c.op==='drawImage').image,colors=base.context.commands.filter(c=>c.op==='fill').map(c=>c.color);
    assert.ok(colors.indexOf('#829e68')>=0);assert.ok(colors.indexOf('#9fae76')>colors.indexOf('#829e68'));
    assert.equal(colors.includes('#6ba16d'),false,'offscreen pitch is not retraced into a tiny minimap cache');
  }finally{h.dispose();}
});
