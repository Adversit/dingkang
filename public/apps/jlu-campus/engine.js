import {createWorld, createTransform, SpatialIndex, pointInFeature, distanceToSegment} from './geometry.js';
import {createCampusNPCs,getNPCDialogue} from './npc.js';
import {drawInteriorArt, getInteriorDrawables} from './interior-art.js';
import {getInteriorLayout,resolveInteriorPosition,isInteriorWalkable,interiorSegmentClear,interiorExitAt,nearestInteriorEntrance,RIXIN_ID} from './interior-layout.js';
import {createPlaces} from './places.js';

// Original, procedural pixel artwork. Geographic positions remain in metres;
// every view (world, minimap and selection) uses this same display transform.
const BASE_SCALE = 10;
const GROUND_Y = 0.68;
const CHUNK = 512;
const ACTOR_SCALE = 1.2; // 24px body at 10px/metre: consistent with doors and trees.
const PI2 = Math.PI * 2;
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const hash = (x,y=0) => {let n=Math.imul(Math.floor(x),374761393)^Math.imul(Math.floor(y),668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
const length = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1]);
const inBounds = (a,b) => a[0]<=b[2]&&a[2]>=b[0]&&a[1]<=b[3]&&a[3]>=b[1];
const point = v => Array.isArray(v)?v:[Number(v?.x)||0,Number(v?.y)||0];
const avatars = ['#d96669','#6c8ec8','#5f9c86','#b589bd','#d79a52','#568a9a','#b66b91','#6e7d48'];
const polyBounds = polys => {let a=Infinity,b=Infinity,c=-Infinity,d=-Infinity;for(const p of polys)for(const q of p.outer){a=Math.min(a,q[0]);b=Math.min(b,q[1]);c=Math.max(c,q[0]);d=Math.max(d,q[1]);}return[a,b,c,d];};
const trace = (ctx,polygons,dy=0) => {ctx.beginPath();for(const p of polygons){for(const ring of [p.outer,...(p.holes||[])]){if(!ring.length)continue;ctx.moveTo(ring[0][0],ring[0][1]+dy);for(let i=1;i<ring.length;i++)ctx.lineTo(ring[i][0],ring[i][1]+dy);ctx.closePath();}}};
const buildPalette = b => {
  const name=b.name||'',t=b.tags||{};
  if(/中心图书馆/.test(name))return{wall:'#d4c2a4',dark:'#a08e77',roof:'#697b82',edge:'#435c64',window:'#608c9c',trim:'#eee4c9'};
  if(/日新/.test(name))return{wall:'#d8d4bc',dark:'#aaa991',roof:'#82989f',edge:'#536e77',window:'#63899b',trim:'#f2e1c5'};
  if(/鼎新|东荣/.test(name))return{wall:'#cab7a2',dark:'#8e8b86',roof:'#889da4',edge:'#4a666e',window:'#517b90',trim:'#e9e0ce'};
  if(/唐敖庆|化学|物理/.test(name))return{wall:'#d7bda2',dark:'#af927d',roof:'#8a786a',edge:'#665c52',window:'#638896',trim:'#ebe1c9'};
  if(/宿舍|公寓/.test(name)||t.building==='dormitory')return{wall:'#d0b29b',dark:'#ad8b76',roof:'#9d6a58',edge:'#70574a',window:'#6a8a8c',trim:'#e5d4b8'};
  if(/餐厅|食堂/.test(name))return{wall:'#d6b592',dark:'#ad8c6a',roof:'#688777',edge:'#456d5e',window:'#739296',trim:'#f2dcb6'};
  if(/体育|运动/.test(name))return{wall:'#c3c6b4',dark:'#979f96',roof:'#7a9d98',edge:'#4e7775',window:'#688b91',trim:'#e2e5cf'};
  return{wall:'#d7c7ab',dark:'#afa38e',roof:'#8c9693',edge:'#66716e',window:'#698b97',trim:'#efead5'};
};
function surfaceColor(f){const t=f.tags||{};if(t.leisure==='pitch')return t.sport==='tennis'?'#7caa83':'#6ba16d';if(t.leisure==='track')return'#c58b70';if(t.landuse==='forest'||t.natural==='wood')return'#829e68';if(t.surface==='paving_stones'||t.highway==='pedestrian'||t.landuse==='plaza')return'#d1c9ae';if(t.leisure==='garden'||t.landuse==='flowerbed')return'#9fae76';if(t.amenity==='parking'||t.landuse==='parking')return'#bdbdab';return'#a9b985';}
function roadWidth(r){const t=r.tags||{};if(t.width&&Number.isFinite(+t.width))return clamp(+t.width,1,18);return({primary:12,secondary:10,tertiary:9,residential:7,service:5,footway:2.3,path:2,steps:2,pedestrian:6,cycleway:2.5,track:3})[t.highway]||3;}
function roadAllowed(r){return !['construction','proposed'].includes(r.tags?.highway)&&r.tags?.access!=='no';}

export function createEngine(canvas, callbacks={}) {
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)throw new Error('浏览器暂不支持校园画布。');
  let data=null,world=null,transform=null;
  let buildings=[],surfaces=[],roads=[],water=[],boundary=[],places=[];
  let buildingIndex,surfaceIndex,roadIndex,waterIndex,treeIndex;
  let trees=[],lamps=[],crossings=[],npcs=[],nearbyNPC=null,entryPlazas=[],chunks=new Map();
  const treeSprites=new Map();
  let groundBuilds=0,visibleChunkCount=0,chunkBudget=48,mapBaseBuilds=0;
  let mapBases=new WeakMap(),mapFeatureOrder=new WeakMap();
  let pixelRatio=1,width=1,height=1,raf=0,lastTime=0,destroyed=false;
  let player={x:0,y:0,direction:'down',moving:false,interior:null};
  let camera=[0,0],lastNotify=0,lastNearby=0,lastStats=0,frameCount=0,fps=60;
  let targetPath=[],marker=null,navigationStatus='idle',nearby=null,remote=[],remoteScope=null,lastEmote=null,interior=null;
  const keys=new Set(),joystick=[0,0],mapViews=new WeakMap();
  const opts={zoom:1,speed:1,weather:'auto',timeOfDay:'auto',reducedMotion:false,name:'访客',avatar:0,showNames:true};
  let mouseDown=null,dragging=false,navigationWorker=null,navigationRequest=0,localOccluded=false,localActorDepth=-Infinity;
  const listeners=[];
  function listen(el,name,fn,options){el.addEventListener(name,fn,options);listeners.push(()=>el.removeEventListener(name,fn,options));}
  function notify(message){callbacks.onNotice?.(message);}
  function resize(){const r=canvas.getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);pixelRatio=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(width*pixelRatio);canvas.height=Math.round(height*pixelRatio);ctx.imageSmoothingEnabled=false;}
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(canvas);resize();
  const isTyping=()=>['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||document.activeElement?.isContentEditable;
  listen(window,'keydown',e=>{if(isTyping()||document.querySelector('dialog[open]'))return;const key=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d',' ','e'].includes(key)){e.preventDefault();keys.add(key);if((key==='e'||key===' ')&&!e.repeat)interact();}});
  listen(window,'keyup',e=>keys.delete(e.key.toLowerCase()));
  listen(window,'blur',()=>{keys.clear();joystick[0]=0;joystick[1]=0;});
  listen(document,'visibilitychange',()=>{keys.clear();joystick[0]=joystick[1]=0;lastTime=0;if(document.hidden){cancelAnimationFrame(raf);raf=0;}else if(!destroyed&&!raf){raf=requestAnimationFrame(render);}});
  listen(canvas,'pointerdown',e=>{if(e.button!==0)return;mouseDown={x:e.clientX,y:e.clientY,time:performance.now()};dragging=false;});
  listen(canvas,'pointermove',e=>{if(mouseDown&&Math.hypot(e.clientX-mouseDown.x,e.clientY-mouseDown.y)>10)dragging=true;});
  listen(canvas,'pointerup',e=>{if(mouseDown&&!dragging&&performance.now()-mouseDown.time<600&&world&&!interior){const r=canvas.getBoundingClientRect(),p=screenToWorld(e.clientX-r.left,e.clientY-r.top);setTarget({x:p[0],y:p[1]});}mouseDown=null;});
  listen(canvas,'wheel',e=>{e.preventDefault();opts.zoom=clamp(opts.zoom+(e.deltaY<0?.1:-.1),.4,2);callbacks.onStats?.({zoom:opts.zoom});},{passive:false});
  const renderFeature=f=>({...f,polygons:f.polygons?.map(p=>({outer:p.outer.map(p=>transform.forward(...p)),holes:(p.holes||[]).map(r=>r.map(p=>transform.forward(...p)))})),lines:f.lines?.map(l=>l.map(p=>transform.forward(...p))),center:f.center?transform.forward(...f.center):undefined,bounds:transform.transformedBounds(f.bounds||[0,0,data.meta.width,data.meta.height])});
  function load(next){
    data=next;world=createWorld(data);places=createPlaces(data,world);navigationWorker?.terminate();navigationRequest++;navigationWorker=null;try{navigationWorker=new Worker(new URL('./navigation-worker.js',import.meta.url),{type:'module'});navigationWorker.postMessage({type:'load',data});navigationWorker.onmessage=({data:result})=>{if(result.id!==navigationRequest||navigationStatus!=='planning'||interior)return;if(result.path?.length){targetPath=result.path;navigationStatus='walking';notify('已找到可行走路线，按方向键可随时接管。');}else{targetPath=[];navigationStatus='idle';notify('已标记位置，当前路径未能连通；可打开地图传送到入口。');}emitNavigation();};navigationWorker.onerror=()=>{navigationWorker?.terminate();navigationWorker=null;cancelNavigation();notify('自动寻路暂不可用，可继续行走或使用地图传送。');};}catch{navigationWorker=null;}transform=createTransform(data.meta.width,data.meta.height,203);
    buildings=data.buildings.map(f=>{const b=renderFeature(f);b.palette=buildPalette(f);b.levels=clamp(parseInt(f.tags?.['building:levels'])||(/鼎新|东荣/.test(f.name)?10:/公寓/.test(f.name)?6:4),1,16);b.bounds=polyBounds(b.polygons);b.height=8+b.levels*3.5;b.depth=b.bounds[3];return b;});
    surfaces=data.surfaces.map(renderFeature);roads=data.roads.map(renderFeature);water=data.water.map(renderFeature);boundary=data.boundary.map(renderFeature);
    mapFeatureOrder=new WeakMap();for(const [index,feature]of [...surfaces,...roads,...water,...buildings].entries())mapFeatureOrder.set(feature,index);
    mapBases=new WeakMap();mapBaseBuilds=0;
    buildingIndex=new SpatialIndex(buildings,80);surfaceIndex=new SpatialIndex(surfaces,80);roadIndex=new SpatialIndex(roads,80);waterIndex=new SpatialIndex(water,80);
    trees=[];lamps=[];npcs=createCampusNPCs(data,world);nearbyNPC=null;crossings=[];for(const poi of data.pois||[]){if(poi.tags?.highway!=='crossing')continue;const q=transform.forward(poi.x,poi.y);let best=null,bestDist=7;for(const r of roadIndex.at(...q,8)){if(roadWidth(r)<4)continue;for(const line of r.lines)for(let i=1;i<line.length;i++){const d=distanceToSegment(q,line[i-1],line[i]);if(d<bestDist){bestDist=d;best={x:q[0],y:q[1],angle:Math.atan2(line[i][1]-line[i-1][1],line[i][0]-line[i-1][0]),width:roadWidth(r)};}}}if(best)crossings.push(best);}const occupied=new Set();
    // Decorative trees are generated on mapped green land, never inferred as obstacles.
    for(const s of data.surfaces){const tags=s.tags||{};if(!['grass','forest','meadow','recreation_ground','flowerbed'].includes(tags.landuse)&&!['wood','scrub','grassland'].includes(tags.natural)&&!['garden','park'].includes(tags.leisure))continue;const b=s.bounds;for(let x=b[0]+3;x<b[2];x+=9)for(let y=b[1]+3;y<b[3];y+=9){if(hash(x,y)>.44)continue;const p=[x+(hash(y,x)-.5)*5,y+(hash(x+13,y)-.5)*5];if(!pointInFeature(p,s)||!world.isWalkable(...p,.4))continue;const key=`${Math.round(p[0]/4)},${Math.round(p[1]/4)}`;if(occupied.has(key))continue;occupied.add(key);const q=transform.forward(...p);trees.push({x:q[0],y:q[1],seed:hash(x,y),bounds:[q[0]-6,q[1]-9,q[0]+6,q[1]+3]});}}
    // Roadside lamps/trees keep walkways legible and introduce scale cues.
    for(const r of data.roads){if(!['tertiary','residential','service','pedestrian'].includes(r.tags?.highway))continue;for(const line of r.lines){let travelled=0;for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i],len=length(a,b);if(len<1)continue;for(let t=12-travelled;t<len;t+=24){if(t<0)continue;const x=a[0]+(b[0]-a[0])*t/len,y=a[1]+(b[1]-a[1])*t/len;const side=roadWidth(r)/2+2;const p=[x-(b[1]-a[1])/len*side,y+(b[0]-a[0])/len*side];if(!world.isWalkable(...p,.4))continue;const q=transform.forward(...p);lamps.push({x:q[0],y:q[1],seed:hash(x,y)});}travelled=(travelled+len)%24;}}}
    treeIndex=new SpatialIndex(trees,64);entryPlazas=data.buildings.filter(b=>b.name==='日新楼').map(b=>{const p=world.getEntrance(b);return p?{point:transform.forward(...p),name:b.name}:null;}).filter(Boolean);chunks.clear();groundBuilds=0;visibleChunkCount=0;interior=null;remote=[];remoteScope=null;cancelNavigation({clearMarker:true});
    const spawn=world.spawn||world.nearestWalkable(data.meta.width/2,data.meta.height/2,500)||[0,0];player={x:spawn[0],y:spawn[1],direction:'down',moving:false,interior:null};camera=transform.forward(...spawn);nearby=null;emitPosition();callbacks.onLocation?.(data.meta.name);callbacks.onStats?.({map:data.meta.id,buildings:buildings.length,trees:trees.length});
    return getPosition();
  }
  const scale=()=>BASE_SCALE*opts.zoom;
  const actorScale=()=>ACTOR_SCALE*opts.zoom;
  const screenToWorld=(x,y)=>transform.inverse(camera[0]+(x-width/2)/scale(),camera[1]+(y-height/2)/(scale()*GROUND_Y));
  function screen(q){return[(q[0]-camera[0])*scale()+width/2,(q[1]-camera[1])*scale()*GROUND_Y+height/2];}
  function cameraBounds(pad=0){const s=scale();return[camera[0]-width/(2*s)-pad,camera[1]-height/(2*s*GROUND_Y)-pad,camera[0]+width/(2*s)+pad,camera[1]+height/(2*s*GROUND_Y)+pad];}
  function groundChunk(cx,cy){
    const key=cx+','+cy;if(chunks.has(key)){const c=chunks.get(key);c.used=performance.now();return c.canvas;}
    groundBuilds++;const c=document.createElement('canvas');c.width=CHUNK;c.height=CHUNK;const g=c.getContext('2d');g.imageSmoothingEnabled=false;g.fillStyle='#b6bd91';g.fillRect(0,0,CHUNK,CHUNK);
    const x=cx*CHUNK/BASE_SCALE,y=cy*CHUNK/BASE_SCALE,box=[x,y,x+CHUNK/BASE_SCALE,y+CHUNK/BASE_SCALE];
    g.scale(BASE_SCALE,BASE_SCALE);g.translate(-x,-y);
    for(const f of boundary){trace(g,f.polygons);g.fillStyle='#b2bd8d';g.fill('evenodd');}
    for(const f of surfaceIndex.query(box)){trace(g,f.polygons);g.fillStyle=surfaceColor(f);g.fill('evenodd');if(f.tags?.leisure==='pitch'){g.save();trace(g,f.polygons);g.clip('evenodd');g.strokeStyle='#d2dbb5';g.lineWidth=.25;const b=f.bounds;g.strokeRect(b[0]+2,b[1]+2,b[2]-b[0]-4,b[3]-b[1]-4);g.beginPath();g.moveTo((b[0]+b[2])/2,b[1]+2);g.lineTo((b[0]+b[2])/2,b[3]-2);g.stroke();g.beginPath();g.arc((b[0]+b[2])/2,(b[1]+b[3])/2,Math.min(8,(b[2]-b[0])/5),0,PI2);g.stroke();g.restore();}}
    // Fine deterministic grass and paving grain, fixed in world space.
    for(let gx=Math.floor(x/3)*3;gx<box[2];gx+=3)for(let gy=Math.floor(y/3)*3;gy<box[3];gy+=3){const n=hash(gx,gy);g.fillStyle=n>.55?'#6c925514':'#edf0bc17';g.fillRect(gx+n,gy+hash(gy,gx),.14,.35);}
    for(const f of roadIndex.query([box[0]-12,box[1]-12,box[2]+12,box[3]+12])){const rw=roadWidth(f),highway=f.tags?.highway;for(const line of f.lines){g.beginPath();line.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.lineCap='round';g.lineJoin='round';g.strokeStyle=rw>4?'#a6a996':'#aab08f';g.lineWidth=rw+1.1;g.stroke();g.strokeStyle=rw>4?'#c8c9bb':'#dfd5b7';g.lineWidth=rw;g.stroke();if(!roadAllowed(f)){g.strokeStyle='#b58c64';g.setLineDash([1.5,1.5]);g.lineWidth=1;g.stroke();g.setLineDash([]);}if(rw>=7){g.strokeStyle='#e8dfb0';g.lineWidth=.12;g.setLineDash([3,4]);g.stroke();g.setLineDash([]);}if(highway==='steps'){g.strokeStyle='#adab98';g.lineWidth=.18;for(let k=1;k<line.length;k++){const a=line[k-1],b=line[k],l=length(a,b);for(let t=.6;t<l;t+=.8){const px=a[0]+(b[0]-a[0])*t/l,py=a[1]+(b[1]-a[1])*t/l;g.beginPath();g.moveTo(px-(b[1]-a[1])*rw/2/l,py+(b[0]-a[0])*rw/2/l);g.lineTo(px+(b[1]-a[1])*rw/2/l,py-(b[0]-a[0])*rw/2/l);g.stroke();}}}}}
    for(const crossing of crossings){if(crossing.x<box[0]-10||crossing.x>box[2]+10||crossing.y<box[1]-10||crossing.y>box[3]+10)continue;g.save();g.translate(crossing.x,crossing.y);g.rotate(crossing.angle);g.fillStyle='#eeecd1';for(let y=-crossing.width/2+.4;y<crossing.width/2-.3;y+=1.1)g.fillRect(-2,y,4,.55);g.restore();}
    for(const f of waterIndex.query(box)){trace(g,f.polygons);g.fillStyle='#72a9aa';g.fill('evenodd');g.strokeStyle='#8b9f7b';g.lineWidth=1.1;g.stroke();}
    // Art-directed welcome forecourt, deliberately separate from OSM geometry.
    for(const plaza of entryPlazas){const [px,py]=plaza.point;if(!inBounds([px-30,py,px+30,py+19],box))continue;g.fillStyle='#c8c6b4';g.fillRect(px-30,py+.5,60,18);g.strokeStyle='#a4aa98';g.lineWidth=.4;g.strokeRect(px-30,py+.5,60,18);for(let tx=-29.8;tx<30;tx+=1.8)for(let ty=1;ty<18;ty+=1.8){g.fillStyle=hash(tx,ty)>.5?'#d6d3bf':'#cbcbb8';g.fillRect(px+tx,py+ty,1.65,1.65);}g.fillStyle='#9baf94';g.fillRect(px-30,py+17.8,60,.6);}
    // Rounded campus edge is a game boundary, not a claimed surveyed fence.
    for(const f of boundary){trace(g,f.polygons);g.strokeStyle='#7f946a';g.lineWidth=.35;g.setLineDash([2,3]);g.stroke();g.setLineDash([]);}
    chunks.set(key,{canvas:c,used:performance.now()});return c;
  }
  function drawGround(){
    const b=cameraBounds(2),step=CHUNK/BASE_SCALE;
    const x0=Math.floor(b[0]/step),x1=Math.floor(b[2]/step),y0=Math.floor(b[1]/step),y1=Math.floor(b[3]/step);
    const visible=new Set();visibleChunkCount=(x1-x0+1)*(y1-y0+1);
    // Pin the entire current view until drawing finishes. A zoomed-out view
    // can exceed 48 tiles; evicting during generation used to churn every frame.
    chunkBudget=Math.max(48,visibleChunkCount+Math.min(32,2*(x1-x0+y1-y0+4)));
    for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
      visible.add(x+','+y);const p=screen([x*step,y*step]);
      ctx.drawImage(groundChunk(x,y),p[0],p[1],CHUNK*opts.zoom+1,CHUNK*opts.zoom*GROUND_Y+1);
    }
    if(chunks.size>chunkBudget){
      const candidates=[...chunks.entries()].filter(([key])=>!visible.has(key)).sort((a,b)=>a[1].used-b[1].used);
      for(const [key,value]of candidates){if(chunks.size<=chunkBudget)break;value.canvas.width=1;value.canvas.height=1;chunks.delete(key);}
    }
  }
  function drawWater(time){const b=cameraBounds(5);ctx.save();ctx.translate(width/2-camera[0]*scale(),height/2-camera[1]*scale()*GROUND_Y);ctx.scale(scale(),scale()*GROUND_Y);for(const f of waterIndex.query(b)){ctx.save();trace(ctx,f.polygons);ctx.clip('evenodd');ctx.strokeStyle='#d0e5cf66';ctx.lineWidth=.13;for(let y=Math.floor(Math.max(b[1],f.bounds[1])/5)*5;y<Math.min(b[3],f.bounds[3]);y+=5){ctx.beginPath();for(let x=Math.max(b[0],f.bounds[0]);x<Math.min(b[2],f.bounds[2]);x+=2){const yy=y+Math.sin(x*.11+time*.00045+y)*.33;(x===Math.max(b[0],f.bounds[0])?ctx.moveTo:ctx.lineTo).call(ctx,x,yy);}ctx.stroke();}ctx.restore();}ctx.restore();}
  function buildingFrontAt(b,x){let front=-Infinity;for(const poly of b.polygons)for(let i=1;i<poly.outer.length;i++){const a=poly.outer[i-1],q=poly.outer[i];if(x<Math.min(a[0],q[0])||x>Math.max(a[0],q[0]))continue;const t=Math.abs(q[0]-a[0])<.001?0:(x-a[0])/(q[0]-a[0]);front=Math.max(front,a[1]+(q[1]-a[1])*t);}return front;}
  function actorDepth(x,y,visibleBuildings){const p=transform.forward(x,y);let depth=p[1];for(const b of visibleBuildings){if(p[0]<b.bounds[0]-1||p[0]>b.bounds[2]+1)continue;const front=buildingFrontAt(b,p[0]);if(p[1]>=front-.15)depth=Math.max(depth,b.depth+.1);}return depth;}
  function drawBuilding(b,night){
    const s=scale(),p=b.palette,roof=b.polygons.map(poly=>({outer:poly.outer.map(q=>screen(q)),holes:poly.holes.map(r=>r.map(q=>screen(q)))})),h=b.height*s;
    // Preserve the depth order while revealing only the building that would
    // actually cover the local body. Courtyard roof holes remain transparent.
    const selfPoint=screen(transform.forward(player.x,player.y)),personScale=actorScale();
    const bodyPoints=[[selfPoint[0],selfPoint[1]-personScale*13],[selfPoint[0],selfPoint[1]-personScale*20],[selfPoint[0],selfPoint[1]]];
    let coversSelf=false;
    if(b.depth>localActorDepth+.01){
      const lifted=roof.map(p=>({outer:p.outer.map(q=>[q[0],q[1]-h]),holes:p.holes.map(r=>r.map(q=>[q[0],q[1]-h]))}));
      coversSelf=bodyPoints.some(p=>pointInFeature(p,{polygons:lifted}));
      if(!coversSelf)for(const polygon of roof){for(const ring of [polygon.outer,...polygon.holes])for(let i=1;i<ring.length;i++){const a=ring[i-1],q=ring[i];if(q[0]<a[0])continue;const wall={polygons:[{outer:[a,q,[q[0],q[1]-h],[a[0],a[1]-h],a],holes:[]}]};if(bodyPoints.some(p=>pointInFeature(p,wall)))coversSelf=true;}}
    }
    ctx.save();if(coversSelf){ctx.globalAlpha=.45;localOccluded=true;}
    // Cast shadow on the ground first, retaining all courtyard cutouts.
    ctx.save();ctx.translate(h*.42,h*.16);trace(ctx,roof);ctx.fillStyle='#344d4427';ctx.fill('evenodd');ctx.restore();
    // Side faces are independently clipped so windows follow real footprint edges.
    const faces=[];for(const poly of roof)for(const ring of [poly.outer,...poly.holes])for(let i=1;i<ring.length;i++){const a=ring[i-1],q=ring[i];if(q[0]>=a[0])faces.push({a,q,depth:(a[1]+q[1])/2});}faces.sort((a,b)=>a.depth-b.depth);
    for(const{a,q}of faces){const dx=q[0]-a[0],dy=q[1]-a[1],len=Math.hypot(dx,dy);ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...q);ctx.lineTo(q[0],q[1]-h);ctx.lineTo(a[0],a[1]-h);ctx.closePath();ctx.fillStyle=dy<0?p.dark:p.wall;ctx.fill();ctx.strokeStyle=p.dark;ctx.lineWidth=1;ctx.stroke();if(len>10){ctx.save();ctx.clip();const rows=Math.min(10,b.levels),gap=h/(rows+1),cols=Math.floor(len/(3.1*s));for(let row=0;row<rows;row++){for(let col=1;col<cols;col++){const t=col/cols,x=a[0]+dx*t,y=a[1]+dy*t-(row+1)*gap;ctx.fillStyle=night>.3&&hash(col+row*23,b.bounds[0])>.47?'#f2d28a':p.window;const ww=Math.max(2,s*1.15),wh=Math.max(3,gap*.58);const glazing=ctx.fillStyle;ctx.fillStyle=p.edge;ctx.fillRect(Math.round(x-ww/2-1),Math.round(y-wh-1),Math.round(ww+2),Math.round(wh+2));ctx.fillStyle=glazing;ctx.fillRect(Math.round(x-ww/2),Math.round(y-wh),Math.round(ww),Math.round(wh));ctx.fillStyle=night>.3?'#f9df9a55':'#c7d8cf88';ctx.fillRect(Math.round(x-ww/2),Math.round(y-wh),Math.round(ww),1);ctx.fillStyle=p.trim;ctx.fillRect(Math.round(x-ww/2-2),Math.round(y+1),Math.round(ww+4),Math.max(1,Math.round(s*.16)));
        // Repeated facade modules: mullions, inset curtains, sills and occasional
        // air conditioners. Seed by building/column, never by screen position.
        if(ww>6){ctx.fillStyle=p.trim+'c0';ctx.fillRect(Math.round(x),Math.round(y-wh),Math.max(1,Math.round(s*.1)),Math.round(wh));}
        if(hash(col*17+row,b.bounds[1])>.7){ctx.fillStyle=night>.3?'#bf9a6650':'#ead6b68a';ctx.fillRect(Math.round(x-ww/2),Math.round(y-wh),Math.max(1,Math.round(ww*.28)),Math.round(wh));}
        if(s>=6&&row<rows-1&&hash(col+row*31,b.bounds[0])>.76){const ax=x+ww*.7,ay=y-wh*.28,aw=s*.7,ah=s*.45;ctx.fillStyle='#5c6f6780';ctx.fillRect(ax+1,ay+2,aw,ah);ctx.fillStyle='#ced0bd';ctx.fillRect(ax,ay,aw,ah);ctx.fillStyle='#788f88';for(let v=1;v<4;v++)ctx.fillRect(ax+aw*v/5,ay+s*.08,Math.max(1,s*.05),ah-s*.13);}
}}for(let row=1;row<=rows;row++){const yoff=row*gap;ctx.strokeStyle=p.trim+'99';ctx.lineWidth=Math.max(1,s*.13);ctx.beginPath();ctx.moveTo(a[0],a[1]-yoff);ctx.lineTo(q[0],q[1]-yoff);ctx.stroke();}
      // End piers and a narrow downpipe give each long face a clear termination.
      for(const t of [.015,.985]){const xx=a[0]+dx*t,yy=a[1]+dy*t;ctx.fillStyle=p.trim+'80';ctx.fillRect(xx-s*.13,yy-h,s*.26,h);}
      if(len>15*s){const xx=a[0]+dx*.94,yy=a[1]+dy*.94;ctx.fillStyle=p.edge+'99';ctx.fillRect(xx,yy-h,s*.13,h);ctx.fillStyle=p.trim+'88';ctx.fillRect(xx,yy-h,s*.05,h);}
      ctx.restore();}}
    trace(ctx,roof,-h);ctx.fillStyle=p.roof;ctx.fill('evenodd');ctx.strokeStyle=p.edge;ctx.lineWidth=Math.max(1,s*.35);ctx.stroke();
    ctx.save();trace(ctx,roof,-h);ctx.clip('evenodd');const bb=b.bounds.map((v,i)=>(i%2?((v-camera[1])*s*GROUND_Y+height/2):((v-camera[0])*s+width/2)));ctx.strokeStyle='#ffffff1b';ctx.lineWidth=1;for(let y=bb[1]-h+1.2*s;y<bb[3]-h;y+=1.2*s){ctx.beginPath();ctx.moveTo(bb[0],y);ctx.lineTo(bb[2],y);ctx.stroke();}
    // Roof parapets, service housings and grouped glazed panels break large
    // homogeneous areas. Their geometry is original decorative artwork.
    const roofWidth=bb[2]-bb[0],roofHeight=bb[3]-bb[1];
    if(roofWidth>100&&roofHeight>100){
      const count=Math.min(8,Math.max(2,Math.floor(roofWidth/(24*s))));
      for(let k=0;k<count;k++){const rx=bb[0]+roofWidth*(.18+.64*(k+.4)/count),ry=bb[1]-h+roofHeight*(.22+.5*hash(k,b.bounds[0]));const rw=(3+hash(k,b.bounds[1])*3)*s,rh=2.6*s;ctx.fillStyle='#3c535541';ctx.fillRect(rx+s*.7,ry+s*.5,rw,rh);ctx.fillStyle='#657774';ctx.fillRect(rx,ry,rw,rh);ctx.fillStyle='#b7bdb0';ctx.fillRect(rx,ry-s*.7,rw,rh);ctx.fillStyle='#7e918b';for(let v=1;v<5;v++)ctx.fillRect(rx+rw*v/5,ry-s*.45,.16*s,rh-s*.4);ctx.fillStyle='#d3d4bf';ctx.fillRect(rx,ry-s*.7,rw,s*.17);}
      const panelY=bb[1]-h+roofHeight*.48;ctx.strokeStyle='#495f5d';ctx.lineWidth=Math.max(1,s*.24);ctx.beginPath();ctx.moveTo(bb[0]+roofWidth*.1,panelY);ctx.lineTo(bb[2]-roofWidth*.1,panelY);ctx.stroke();ctx.strokeStyle='#b5c0b38a';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(bb[0]+roofWidth*.1,panelY-2);ctx.lineTo(bb[2]-roofWidth*.1,panelY-2);ctx.stroke();
    }
    // Roof utilities and a glazed roof lantern create original landmark accents.
    const center=screen(b.center||[(b.bounds[0]+b.bounds[2])/2,(b.bounds[1]+b.bounds[3])/2]);
    if(/图书馆|鼎新/.test(b.name)){const rw=Math.min(24*s,(bb[2]-bb[0])*.4),rh=8*s;ctx.fillStyle=p.edge;ctx.fillRect(center[0]-rw/2,center[1]-h-rh/2,rw,rh);ctx.fillStyle='#88a8ad';ctx.fillRect(center[0]-rw/2+3,center[1]-h-rh/2+3,rw-6,rh-6);ctx.strokeStyle='#b9cbc2';for(let i=1;i<6;i++){ctx.beginPath();ctx.moveTo(center[0]-rw/2+rw*i/6,center[1]-h-rh/2);ctx.lineTo(center[0]-rw/2+rw*i/6,center[1]-h+rh/2);ctx.stroke();}}
    else if((bb[2]-bb[0])>70){ctx.fillStyle='#b0b6a5';ctx.fillRect(center[0]-8,center[1]-h-6,17,11);ctx.fillStyle='#74817c';ctx.fillRect(center[0]-6,center[1]-h-4,13,7);}ctx.restore();
    // Ground-level doors remain aligned with collision geometry.
    const original=data.buildings.find(f=>f.id===b.id),ent=world.getEntrance(original);if(ent){const q=screen(transform.forward(...ent));ctx.fillStyle='#eee0ba';ctx.fillRect(q[0]-s*.85,q[1]-2*s,s*1.7,2*s);ctx.fillStyle='#50777b';ctx.fillRect(q[0]-s*.62,q[1]-1.8*s,s*1.24,1.8*s);
      if(/日新楼|中心图书馆/.test(b.name)){
        // Original landmark treatment: blue glazed entrance, warm stone piers,
        // shop awnings, planters and street furniture, anchored at the OSM door.
        const fw=9*s,fh=Math.min(h*.95,24*s);ctx.fillStyle='#667d83';ctx.fillRect(q[0]-fw/2-3,q[1]-fh-3,fw+6,fh+3);ctx.fillStyle='#466b82';ctx.fillRect(q[0]-fw/2,q[1]-fh,fw,fh);
        for(let i=1;i<6;i++){ctx.strokeStyle=i%2?'#b0c3bd':'#799faa';ctx.lineWidth=Math.max(1,s*.18);ctx.beginPath();ctx.moveTo(q[0]-fw/2+i*fw/6,q[1]-fh);ctx.lineTo(q[0]-fw/2+i*fw/6+Math.sin(i)*s*.5,q[1]-1);ctx.stroke();}for(let j=1;j<5;j++){ctx.fillStyle='#a8bcb059';ctx.fillRect(q[0]-fw/2,q[1]-j*fh/5,fw,1);}
        ctx.fillStyle='#e4d2a7';ctx.fillRect(q[0]-fw/2-3,q[1]-fh-5,fw+6,5);drawLabel(b.name,q[0],q[1]-fh-10,'#f4d780','#405f68ed',Math.max(12,opts.zoom*15));
        if(/日新/.test(b.name)){for(const sign of [{offset:-13,text:'生活服务',color:'#678788'},{offset:13,text:'日新小铺',color:'#a27063'}]){const xx=q[0]+sign.offset*s,ww=13*s;ctx.fillStyle=sign.color;ctx.fillRect(xx-ww/2,q[1]-4.8*s,ww,2.2*s);ctx.fillStyle='#f4e4bf';ctx.font=`${Math.max(11,s*1.25)}px "Microsoft YaHei",sans-serif`;ctx.textAlign='center';ctx.fillText(sign.text,xx,q[1]-3.15*s);for(let aw=0;aw<8;aw++){ctx.fillStyle=aw%2?'#f0e8ce':'#b67567';ctx.fillRect(xx-ww/2+aw*ww/8,q[1]-2.5*s,ww/8,1.3*s);}ctx.fillStyle='#7d9a98';ctx.fillRect(xx-ww/2,q[1]-1.2*s,ww,1.2*s);}}

      }
    }
    if(opts.showNames&&b.name&&opts.zoom>.5&&!/日新楼|中心图书馆/.test(b.name)){const label=screen(b.center||[(b.bounds[0]+b.bounds[2])/2,(b.bounds[1]+b.bounds[3])/2]);drawLabel(b.name,label[0],label[1]-h+12,night>.3?'#f4e7c3':'#f1efda','#334f51d9',Math.min(16,12+opts.zoom*2));}
    ctx.restore();
  }
  function drawLabel(text,x,y,color='#f8f4df',bg='#31545ac9',size=14){ctx.save();ctx.font=`600 ${size}px "Microsoft YaHei",system-ui,sans-serif`;const w=ctx.measureText(text).width;ctx.fillStyle=bg;ctx.fillRect(Math.round(x-w/2-6),Math.round(y-size+1),Math.round(w+12),size+7);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.fillText(text,Math.round(x),Math.round(y));ctx.restore();}
  function treeSprite(seed){
    const variant=Math.floor(seed*20);if(treeSprites.has(variant))return treeSprites.get(variant);const c=document.createElement('canvas');c.width=64;c.height=80;const g=c.getContext('2d');g.imageSmoothingEnabled=false;
    const autumn=variant>16,colors=autumn?['#635c39','#8d7e42','#b19a51','#c6b05d','#dbc77d']:['#294f3e','#396a45','#51834d','#73a25c','#9abd72'];
    g.fillStyle='#5d5541';g.fillRect(29,40,7,36);g.fillStyle='#91734d';g.fillRect(30,42,4,31);g.fillStyle='#b19360';g.fillRect(30,48,1,22);g.fillStyle='#4c503b';g.fillRect(28,74,10,3);
    g.strokeStyle='#695d41';g.lineWidth=3;g.beginPath();g.moveTo(32,60);g.lineTo(20,40);g.moveTo(33,55);g.lineTo(46,33);g.stroke();
    const crowns=[{x:31,y:22,r:17},{x:18,y:34,r:15},{x:45,y:35,r:15},{x:31,y:44,r:17},{x:29,y:31,r:19}];
    for(let k=0;k<crowns.length;k++){const base=crowns[k],cx=base.x+(hash(k,variant)*4-2),cy=base.y+(hash(variant,k)*4-2),radius=base.r;for(let y=-radius;y<=radius;y+=2)for(let x=-radius;x<=radius;x+=2){const edge=(x*x+y*y)/(radius*radius),grain=hash(x+k*47+variant*5,y+variant*11);if(edge>1+(grain-.5)*.13)continue;let shade=edge>.84?0:clamp(Math.floor(2.4-(x+y)/(radius*1.3)+(grain-.5)*1.8),1,4);if(y>radius*.3)shade=Math.max(0,shade-1);g.fillStyle=colors[shade];g.fillRect(Math.floor(cx+x),Math.floor(cy+y),2,2);}}
    // Bright isolated leaf clusters read as fine pixel foliage at game scale.
    for(let k=0;k<45;k++){const x=Math.floor(9+hash(k,variant)*46),y=Math.floor(8+hash(variant,k+17)*44);if(crowns.some(c=>(x-c.x)**2+(y-c.y)**2<c.r*c.r*.8)&&hash(k,8)>.45){g.fillStyle=colors[4];g.fillRect(x,y,2,1);}}
    treeSprites.set(variant,c);return c;
  }
  function drawTree(t,time){const q=screen([t.x,t.y]),z=(1.9+t.seed*.55)*opts.zoom,wind=opts.reducedMotion?0:Math.round(Math.sin(time*.0008+t.seed*80)*1.3*opts.zoom);ctx.fillStyle='#2848342b';ctx.beginPath();ctx.ellipse(q[0]+10*z,q[1]+1,22*z,7*z,0,0,PI2);ctx.fill();const local=transform.forward(player.x,player.y),p=screen(local),dx=(p[0]-q[0]-wind)/(29*z),dy=(p[1]-13*actorScale()-q[1]+42*z)/(31*z);const coversLocal=t.y>=local[1]-.5&&dx*dx+dy*dy<1;ctx.save();if(coversLocal){ctx.globalAlpha=.45;localOccluded=true;}ctx.drawImage(treeSprite(t.seed),q[0]-32*z+wind,q[1]-76*z,64*z,80*z);ctx.restore();}
  function forecourtObjects(){
    const objects=[],bounds=cameraBounds(40),z=opts.zoom,s=scale();
    for(const plaza of entryPlazas){
      const [px,py]=plaza.point;if(px<bounds[0]-35||px>bounds[2]+35||py<bounds[1]-20||py>bounds[3]+20)continue;
      for(const side of [-1,1]){
        const bikeY=py+13;
        objects.push({depth:bikeY,draw(){const p=screen([px+side*22,bikeY]);
          ctx.fillStyle='#6b8076';ctx.fillRect(p[0]-37*z,p[1]-4*z,74*z,3*z);
          for(let k=0;k<5;k++){const x=p[0]+(k-2)*14*z,y=p[1]-3*z;ctx.strokeStyle='#455b5d';ctx.lineWidth=2*z;ctx.beginPath();ctx.arc(x-5*z,y,5*z,0,PI2);ctx.arc(x+7*z,y,5*z,0,PI2);ctx.stroke();ctx.strokeStyle=['#b17765','#698f9b','#9aa66b','#a98d61','#8493b0'][k];ctx.beginPath();ctx.moveTo(x-5*z,y);ctx.lineTo(x,y-9*z);ctx.lineTo(x+7*z,y);ctx.lineTo(x-5*z,y);ctx.lineTo(x+3*z,y-7*z);ctx.stroke();ctx.strokeStyle='#52635d';ctx.beginPath();ctx.moveTo(x+7*z,y);ctx.lineTo(x+4*z,y-13*z);ctx.lineTo(x+9*z,y-13*z);ctx.moveTo(x,y-9*z);ctx.lineTo(x-3*z,y-11*z);ctx.stroke();}
        }});
        const planterY=py+4.5;
        objects.push({depth:planterY,draw(){const q=screen([px+side*7,planterY]);
          ctx.fillStyle='#827662';ctx.fillRect(q[0]-2*s,q[1]-.8*s,4*s,.8*s);ctx.fillStyle='#baa382';ctx.fillRect(q[0]-2.15*s,q[1]-s,4.3*s,.25*s);ctx.fillStyle='#577653';ctx.fillRect(q[0]-2*s,q[1]-1.5*s,4*s,.5*s);
          for(let k=0;k<10;k++){ctx.fillStyle=['#b88583','#d7c482','#9fb66e'][k%3];ctx.fillRect(q[0]-1.8*s+k*.38*s,q[1]-(1.5+hash(k,side)*.3)*s,.25*s,.3*s);}
        }});
        const benchY=py+7.5;
        objects.push({depth:benchY,draw(){const q=screen([px+side*14,benchY]);ctx.fillStyle='#4c6256';ctx.fillRect(q[0]-2.4*s,q[1]-.8*s,.25*s,.8*s);ctx.fillRect(q[0]+2.15*s,q[1]-.8*s,.25*s,.8*s);for(let k=0;k<3;k++){ctx.fillStyle=k%2?'#b5976d':'#997c59';ctx.fillRect(q[0]-3*s,q[1]-(1.7-k*.25)*s,6*s,.2*s);}ctx.fillStyle='#c4a77a';ctx.fillRect(q[0]-3*s,q[1]-.8*s,6*s,.32*s);}});
      }
      const signY=py+5;
      objects.push({depth:signY,draw(){const q=screen([px-28,signY]);ctx.fillStyle='#536a5c';ctx.fillRect(q[0]-20*z,q[1]-45*z,40*z,28*z);ctx.fillRect(q[0]-17*z,q[1]-17*z,3*z,18*z);ctx.fillRect(q[0]+14*z,q[1]-17*z,3*z,18*z);ctx.fillStyle='#e8d9af';ctx.fillRect(q[0]-17*z,q[1]-42*z,34*z,21*z);ctx.fillStyle='#809d92';ctx.fillRect(q[0]-13*z,q[1]-38*z,11*z,12*z);ctx.fillStyle='#a38b67';for(let k=0;k<3;k++)ctx.fillRect(q[0]+2*z,q[1]-(38-k*5)*z,(k===2?8:11)*z,2*z);}});
    }
    return objects;
  }
  function drawLamp(l,night){const q=screen([l.x,l.y]),z=opts.zoom;ctx.fillStyle='#53665d';ctx.fillRect(q[0]-1.5*z,q[1]-70*z,3*z,70*z);ctx.fillStyle='#889386';ctx.fillRect(q[0]-z,q[1]-68*z,z,67*z);ctx.fillStyle='#435b55';ctx.fillRect(q[0]-7*z,q[1]-74*z,14*z,4*z);ctx.fillRect(q[0]-5*z,q[1]-80*z,10*z,6*z);ctx.fillStyle=night>.2?'#fbe1a0':'#e4d8b2';ctx.fillRect(q[0]-5*z,q[1]-73*z,10*z,6*z);if(night>.2){const gr=ctx.createRadialGradient(q[0],q[1]-70*z,2*z,q[0],q[1]-70*z,58*z);gr.addColorStop(0,`rgba(255,214,127,${night*.5})`);gr.addColorStop(1,'rgba(255,214,127,0)');ctx.fillStyle=gr;ctx.fillRect(q[0]-58*z,q[1]-128*z,116*z,116*z);}}
  function roomScale(){const base=interior?.layout.id===RIXIN_ID?Math.max(20,Math.min(26,width/24,height/26)):Math.max(4,Math.min(6,width/240,height/160));return base*opts.zoom;}
  function drawPerson(person,time,self=false,labels=true){const q=interior?[width/2+((self?interior.x:person.interiorX??interior.layout.spawn.x)-interior.cameraX)*roomScale(),height/2+((self?interior.y:person.interiorY??interior.layout.spawn.y)-interior.cameraY)*roomScale()]:screen(transform.forward(person.x,person.y)),z=interior?(interior.layout.id===RIXIN_ID?roomScale()/10:opts.zoom*2.6):actorScale();const moving=!!person.moving,step=moving&&!opts.reducedMotion?Math.floor(time/145)%4:0,bob=step%2?1:0;const color=typeof person.avatar==='string'&&/^#[0-9a-f]{6}$/i.test(person.avatar)?person.avatar:avatars[(Number(person.avatar)||0)%avatars.length];ctx.save();ctx.translate(q[0],q[1]);ctx.scale(z,z);ctx.fillStyle='#28473b38';ctx.fillRect(-5,-1,11,3);if(self){ctx.strokeStyle='#f5dd87';ctx.lineWidth=.65;ctx.beginPath();ctx.ellipse(0,1,8,3,0,0,PI2);ctx.stroke();}ctx.fillStyle='#3d5262';ctx.fillRect(-4,-7,3,7+(step===1?-2:0));ctx.fillRect(1,-7,3,7+(step===3?-2:0));ctx.fillStyle='#f4cba6';ctx.fillRect(-5,-16+bob,10,7);ctx.fillStyle=color;ctx.fillRect(-5,-12+bob,10,8);ctx.fillStyle='#ffffff55';ctx.fillRect(-3,-12+bob,2,7);ctx.fillStyle='#e7b897';ctx.fillRect(-7,-11+bob,2,6);ctx.fillRect(5,-11+bob,2,6);ctx.fillStyle='#434038';ctx.fillRect(-5,-20+bob,10,6);ctx.fillRect(-6,-18+bob,2,5);ctx.fillRect(4,-18+bob,2,5);if(person.direction!=='up'){ctx.fillStyle='#303b42';ctx.fillRect(person.direction==='left'?-4:person.direction==='right'?2:-2,-15+bob,1,1);if(person.direction==='down')ctx.fillRect(2,-15+bob,1,1);}else{ctx.fillStyle='#434038';ctx.fillRect(-4,-16+bob,8,3);}ctx.fillStyle='#344b55';ctx.fillRect(-5,-1,4,2);ctx.fillRect(1,-1,4,2);ctx.restore();if(labels)drawPersonLabel(person,self,q,z);}
  function drawPersonLabel(person,self=false,q,z){
    q??=interior?[width/2+((self?interior.x:person.interiorX??interior.layout.spawn.x)-interior.cameraX)*roomScale(),height/2+((self?interior.y:person.interiorY??interior.layout.spawn.y)-interior.cameraY)*roomScale()]:screen(transform.forward(person.x,person.y));
    z??=interior?(interior.layout.id===RIXIN_ID?roomScale()/10:opts.zoom*2.6):actorScale();
    drawLabel(self?'我 · '+opts.name:(person.name||person.nickname||'同学'),q[0],q[1]-(person.npc?34:24)*z,self?'#fff5ce':'#f0f6ef',self?'#396a63dd':person.npc?'#6b784cde':'#476879c9',13);if(person.message){drawLabel(String(person.message).slice(0,35),q[0],q[1]-62*z,'#30434a','#fff9e4ee',14);}
  }
  function timeState(){const mode=opts.timeOfDay||opts.time||'auto';if(mode==='night')return{night:.65,sunset:0};if(mode==='day')return{night:0,sunset:0};if(mode==='sunset')return{night:.15,sunset:.2};const hour=(new Date().getUTCHours()+8)%24+new Date().getUTCMinutes()/60;return{night:hour<5||hour>20?.62:hour<7?(7-hour)*.2:hour>17?(hour-17)*.19:0,sunset:hour>16&&hour<19?.15:0};}
  function weatherState(){if(opts.weather==='auto')return'clear';return opts.weather;}
  function drawAtmosphere(time,night,sunset){if(sunset){ctx.fillStyle=`rgba(232,135,70,${sunset})`;ctx.fillRect(0,0,width,height);}if(night){ctx.fillStyle=`rgba(12,24,62,${night*.45})`;ctx.fillRect(0,0,width,height);}const weather=weatherState();if(weather==='rain'){ctx.fillStyle='#446d8117';ctx.fillRect(0,0,width,height);ctx.strokeStyle='#e0eff08a';ctx.lineWidth=1;for(let i=0;i<90;i++){const x=(hash(i,9)*width+(opts.reducedMotion?0:time*.025))%(width+50)-25,y=(hash(i,3)*height+(opts.reducedMotion?0:time*.38))%(height+60)-30;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-4,y+13);ctx.stroke();}}else if(weather==='snow'){ctx.fillStyle='#eef4e9bb';for(let i=0;i<65;i++){const x=(hash(i,9)*width+(opts.reducedMotion?0:Math.sin(time*.0006+i)*20)+width)%width,y=(hash(i,4)*height+(opts.reducedMotion?0:time*.035))%height;const sz=1+Math.floor(hash(i,18)*3);ctx.fillRect(x,y,sz,sz);}}}
  function drawMarker(time){if(!marker)return;const p=screen(transform.forward(marker.x,marker.y));const pulse=opts.reducedMotion?0:Math.sin(time*.004)*3;ctx.strokeStyle='#e8bd56';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p[0],p[1],12+pulse,5+pulse/3,0,0,PI2);ctx.stroke();ctx.fillStyle='#e9bc4e';ctx.beginPath();ctx.moveTo(p[0],p[1]-7);ctx.lineTo(p[0]-5,p[1]-18-pulse);ctx.lineTo(p[0]+5,p[1]-18-pulse);ctx.fill();}
  function drawPath(){if(targetPath.length<1)return;ctx.strokeStyle='#e8ce85bb';ctx.lineWidth=2;ctx.setLineDash([4,6]);ctx.beginPath();let p=screen(transform.forward(player.x,player.y));ctx.moveTo(...p);for(const q of targetPath)ctx.lineTo(...screen(transform.forward(...q)));ctx.stroke();ctx.setLineDash([]);}
  function drawInterior(time){
    const s=roomScale(),ox=width/2-interior.cameraX*s,oy=height/2-interior.cameraY*s;
    drawInteriorArt(ctx,interior,{width,height,time,scale:s});
    const occupants=remote.filter(p=>p.interior===player.interior&&isInteriorWalkable(interior.layout,p.interiorX,p.interiorY)&&(p.interiorRevision===interior.layout.revision||(interior.layout.revision==='library-v1'&&!p.interiorRevision))).map(p=>({...p,self:false}));occupants.push({...player,avatar:opts.avatar,interiorY:interior.y,self:true});const drawables=getInteriorDrawables(interior,{width,height,scale:s});
    for(const p of occupants)drawables.push({depth:p.interiorY??interior.layout.spawn.y,actor:true,draw:()=>drawPerson(p,time,p.self,false)});
    drawables.sort((a,b)=>a.depth-b.depth||(a.actor?1:0)-(b.actor?1:0));
    for(const item of drawables)item.draw(ctx);
    for(const p of occupants)drawPersonLabel(p,p.self);
    for(const exit of interior.layout.exits){const x=ox+exit.door.x*s,y=oy+exit.door.y*s;if(x>-80&&x<width+80&&y>-30&&y<height+30)drawLabel(exit.label+' · E / 空格',x,y,'#fbf3d6','#466c64e6',14);}
    drawLabel(`${interior.building.name} · 游戏化室内`,width/2,48,'#fff4d1','#284b51dd',16);
  }
  function step(dt,time){if(!world)return;if(document.querySelector('dialog[open]')){keys.clear();joystick[0]=joystick[1]=0;player.moving=false;return;}let dx=joystick[0],dy=joystick[1];if(keys.has('w')||keys.has('arrowup'))dy-=1;if(keys.has('s')||keys.has('arrowdown'))dy+=1;if(keys.has('a')||keys.has('arrowleft'))dx-=1;if(keys.has('d')||keys.has('arrowright'))dx+=1;const direct=Math.hypot(dx,dy)>0;if(direct&&navigationStatus!=='idle')cancelNavigation();let worldDx=0,worldDy=0;const speed=3.4*opts.speed;
    if(interior){
      const n=Math.hypot(dx,dy);player.moving=false;
      if(n>.1){const previousX=interior.x,previousY=interior.y;dx/=n;dy/=n;const movement=speed*dt*interior.layout.movementScale,nx=interior.x+dx*movement,ny=interior.y+dy*movement;
        if(interiorSegmentClear(interior.layout,[interior.x,interior.y],[nx,interior.y])){interior.x=nx;player.moving=true;}
        if(interiorSegmentClear(interior.layout,[interior.x,interior.y],[interior.x,ny])){interior.y=ny;player.moving=true;}
        player.moving=Math.hypot(interior.x-previousX,interior.y-previousY)>.0001;
        player.direction=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');
      }
      const rs=roomScale(),hx=width/(2*rs),hy=height/(2*rs),cx=interior.width<=hx*2?interior.width/2:clamp(interior.x,hx,interior.width-hx),cy=interior.height<=hy*2?interior.height/2:clamp(interior.y,hy,interior.height-hy);
      interior.cameraX+=(cx-interior.cameraX)*Math.min(1,dt*6);interior.cameraY+=(cy-interior.cameraY)*Math.min(1,dt*6);return;
    }
    if(direct){const n=Math.hypot(dx,dy);dx/=n;dy/=n;const a=transform.inverse(0,0),b=transform.inverse(dx,dy);worldDx=b[0]-a[0];worldDy=b[1]-a[1];}
    else if(targetPath.length){
      // Reaching an intermediate waypoint must not insert a stationary frame.
      // Keep the existing arrival tolerance and collision checks.
      while(targetPath.length&&Math.hypot(targetPath[0][0]-player.x,targetPath[0][1]-player.y)<Math.max(.4,speed*dt))targetPath.shift();
      if(!targetPath.length){navigationStatus='idle';emitNavigation();notify('已到达目标附近。');}
      else{const goal=targetPath[0],dist=Math.hypot(goal[0]-player.x,goal[1]-player.y);worldDx=(goal[0]-player.x)/dist;worldDy=(goal[1]-player.y)/dist;const a=transform.forward(0,0),b=transform.forward(worldDx,worldDy);dx=b[0]-a[0];dy=b[1]-a[1];}
    }
    player.moving=Math.hypot(worldDx,worldDy)>.05;if(player.moving){player.direction=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');const nx=player.x+worldDx*speed*dt,ny=player.y+worldDy*speed*dt;let moved=false;if(world.isWalkable(nx,player.y)){player.x=nx;moved=true;}if(world.isWalkable(player.x,ny)){player.y=ny;moved=true;}if(!moved){player.moving=false;if(navigationStatus!=='idle'){cancelNavigation();notify('前方暂时无法通过，已停止自动步行。');}}}
    const wanted=transform.forward(player.x,player.y);camera[0]+=(wanted[0]-camera[0])*Math.min(1,dt*8);camera[1]+=(wanted[1]-camera[1])*Math.min(1,dt*8);
    if(time-lastNearby>700){lastNearby=time;updateNearby();}
  }
  function render(time){if(destroyed)return;if(document.hidden){lastTime=0;raf=0;return;}raf=requestAnimationFrame(render);const dt=Math.min(.05,lastTime?(time-lastTime)/1000:0);lastTime=time;if(!data){ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);ctx.fillStyle='#b2bd8d';ctx.fillRect(0,0,width,height);return;}step(dt,time);ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);ctx.imageSmoothingEnabled=false;if(interior)drawInterior(time);else{drawGround();const {night,sunset}=timeState();drawWater(opts.reducedMotion?0:time);drawPath();const bounds=cameraBounds(100),objects=[],visibleBuildings=buildingIndex.query(bounds);for(const b of visibleBuildings)objects.push({depth:b.depth,draw:()=>drawBuilding(b,night)});for(const t of treeIndex.query(bounds))objects.push({depth:t.y,draw:()=>drawTree(t,time)});for(const l of lamps)if(l.x>bounds[0]&&l.x<bounds[2]&&l.y>bounds[1]&&l.y<bounds[3])objects.push({depth:l.y,draw:()=>drawLamp(l,night)});objects.push({depth:(localActorDepth=actorDepth(player.x,player.y,visibleBuildings)),self:true,draw:()=>drawPerson({...player,avatar:opts.avatar},time,true)});for(const p of [...remote,...npcs]){if(p.messageUntil&&time>p.messageUntil)p.message=null;if(p.interior)continue;const q=transform.forward(p.x,p.y);if(q[0]>bounds[0]&&q[0]<bounds[2]&&q[1]>bounds[1]&&q[1]<bounds[3])objects.push({depth:actorDepth(p.x,p.y,visibleBuildings),draw:()=>drawPerson(p,time)});}objects.push(...forecourtObjects());objects.sort((a,b)=>a.depth-b.depth||(a.self?1:0)-(b.self?1:0));localOccluded=false;for(const o of objects)o.draw();if(localOccluded){const p=screen(transform.forward(player.x,player.y)),z=actorScale();ctx.save();ctx.strokeStyle='#f5dd87';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(p[0],p[1]+z,8*z,3*z,0,0,PI2);ctx.stroke();ctx.restore();drawLabel('我 · '+opts.name,p[0],p[1]-24*z,'#fff5ce','#396a63ee',13);}drawMarker(time);drawAtmosphere(time,night,sunset);}
    for(const p of remote){const blend=Math.min(1,dt*9);p.x+=(p.targetX-p.x)*blend;p.y+=(p.targetY-p.y)*blend;if(Number.isFinite(p.interiorX)&&Number.isFinite(p.targetInteriorX))p.interiorX+=(p.targetInteriorX-p.interiorX)*blend;if(Number.isFinite(p.interiorY)&&Number.isFinite(p.targetInteriorY))p.interiorY+=(p.targetInteriorY-p.interiorY)*blend;}
    if(time-lastNotify>100){lastNotify=time;emitPosition();}frameCount++;if(time-lastStats>1000){fps=Math.round(frameCount*1000/(time-lastStats));lastStats=time;frameCount=0;canvas.dataset.fps=String(fps);canvas.dataset.npcCount=String(npcs.length);callbacks.onStats?.({fps,chunks:chunks.size,zoom:opts.zoom,position:getPosition(),interior:interior?.building.name||null,visiblePlayers:remote.length+1});}}
  function emitPosition(){const p=getPosition();canvas.dataset.position=JSON.stringify(p);callbacks.onPosition?.(p);}
  function getPosition(){return{x:+player.x.toFixed(3),y:+player.y.toFixed(3),direction:player.direction,moving:player.moving,interior:player.interior||null,interiorX:interior?+interior.x.toFixed(3):null,interiorY:interior?+interior.y.toFixed(3):null,interiorRevision:interior?.layout.revision||null};}
  function getDestination(target){if(!world)return null;const feature=typeof target==='string'?[...data.buildings,...places].find(f=>f.id===target):target;if(typeof target==='string'&&!feature)return null;if(feature?.kind||feature?.sourceLayer){if(feature.accessible===false||!Array.isArray(feature.entrance))return null;return world.isWalkable(...feature.entrance)?{x:feature.entrance[0],y:feature.entrance[1]}:null;}const building=feature?.polygons?feature:null,p=building?world.getEntrance(building):world.nearestWalkable(...point(feature),150);return p?{x:p[0],y:p[1]}:null;}
  function teleport(target){if(!world)return null;const p=getDestination(target);if(!p){notify('这里没有可安全到达的地面，请选择另一处入口。');return null;}cancelNavigation({clearMarker:true});interior=null;player.interior=null;player.x=p.x;player.y=p.y;player.moving=false;targetPath=[];camera=transform.forward(p.x,p.y);updateNearby();emitPosition();return getPosition();}
  function getMarker(){return marker?{...marker}:null;}
  function getNavigationState(){return{status:navigationStatus,target:getMarker()};}
  function emitNavigation(){callbacks.onNavigation?.(getNavigationState());}
  function cancelNavigation({clearMarker=false}={}){navigationRequest++;targetPath=[];navigationStatus='idle';player.moving=false;if(clearMarker)marker=null;emitNavigation();}
  function setMarker(value){
    const destination=value?.kind&&Array.isArray(value.center)?{x:value.center[0],y:value.center[1]}:value?getDestination(value):null;
    cancelNavigation();marker=destination?{...destination,name:value?.name||''}:null;emitNavigation();return getMarker();
  }
  function setTarget(target){
    if(!world)return;if(interior){notify('请先离开室内，再选择步行目的地。');return;}
    const dest=getDestination(target);if(!dest){notify('这个地点没有公开可达的入口，请查看地图说明。');return;}
    cancelNavigation();marker={...dest,name:target?.name||''};
    const from=[player.x,player.y],to=[dest.x,dest.y];
    if(world.lineWalkable(from,to)){targetPath=[to];navigationStatus='walking';}
    else if(navigationWorker){navigationStatus='planning';notify('正在规划可行走路线…');navigationWorker.postMessage({type:'path',id:navigationRequest,from,to});}
    else notify('已标记位置；自动寻路暂不可用，可以手动行走或地图传送。');
    emitNavigation();
  }
  function updateNearby(){
    let best=Infinity;nearby=null;
    for(const b of world.buildingIndex.at(player.x,player.y,15)){
      const layout=getInteriorLayout(b.id),door=b.id===RIXIN_ID?nearestInteriorEntrance(layout,player.x,player.y):null;
      if(b.id===RIXIN_ID&&!door)continue;
      const entrance=door?.exterior||world.getEntrance(b);
      if(entrance){const distance=Math.hypot(entrance[0]-player.x,entrance[1]-player.y);if(distance<best&&distance<(door?layout.entryRadius+.001:12)){best=distance;nearby=door?{...b,entryDoorId:door.id,entryLabel:door.label}:b;}}
    }
    for(const place of places){const p=place.entrance||place.center;if(!p)continue;const d=Math.hypot(p[0]-player.x,p[1]-player.y);if(d<7&&d<best&&best>3){nearby=place;best=d;}}
    nearbyNPC=npcs.find(n=>Math.hypot(n.x-player.x,n.y-player.y)<6&&best>3)||null;
    callbacks.onNearby?.(nearbyNPC||nearby);callbacks.onLocation?.(nearby?`${nearby.name||'建筑'}${nearby.entryLabel?' · '+nearby.entryLabel:''}附近`:data.meta.name);
  }


  function makeInterior(b,x,y,revision){
    const layout=getInteriorLayout(b.id);if(!layout)return false;
    cancelNavigation();const entrance=layout.exits.find(exit=>exit.id===b.entryDoorId),position=entrance&&x===undefined&&y===undefined?{...entrance.spawn}:resolveInteriorPosition(layout,x,y,revision||layout.revision);
    interior={building:b,layout,width:layout.width,height:layout.height,...position,cameraX:position.x,cameraY:position.y,furniture:layout.objects.filter(object=>object.solid)};
    player.interior=b.id;player.moving=false;const s=roomScale(),hx=width/(2*s),hy=height/(2*s);
    interior.cameraX=layout.width<=hx*2?layout.width/2:clamp(position.x,hx,layout.width-hx);interior.cameraY=layout.height<=hy*2?layout.height/2:clamp(position.y,hy,layout.height-hy);
    callbacks.onInteract?.({building:b,interior:true});return true;
  }
  function reconcile(p){
    const result=teleport(p);if(!result)return null;
    if(p.interior){const b=data.buildings.find(b=>b.id===p.interior),layout=getInteriorLayout(p.interior);
      if(b&&layout){if(layout.id===RIXIN_ID&&p.interiorRevision!==layout.revision)notify('日新楼室内布局已更新，请从入口重新进入。');else makeInterior(b,p.interiorX,p.interiorY,p.interiorRevision);}
    }
    emitPosition();return getPosition();
  }
  function interact(){if(!world)return;if(interior){const exit=interiorExitAt(interior.layout,interior.x,interior.y);if(exit){const b=interior.building;if(exit.exterior&&world.isWalkable(...exit.exterior)){player.x=exit.exterior[0];player.y=exit.exterior[1];camera=transform.forward(player.x,player.y);}interior=null;player.interior=null;player.moving=false;emitPosition();callbacks.onInteract?.({building:b,interior:false});updateNearby();notify('已回到校园。');}else{notify(interior.layout.id===RIXIN_ID?'走到任一标注的出口附近，按 E 或空格离开。':'走到下方出口附近，按 E 或空格离开。');}return;}updateNearby();if(nearbyNPC){const npc=nearbyNPC,line=getNPCDialogue(npc,npc.dialogueIndex||0);npc.dialogueIndex=(npc.dialogueIndex||0)+1;npc.message=line;npc.messageUntil=performance.now()+7000;notify(line);callbacks.onInteract?.({npc,line});return;}if(!nearby){notify('靠近建筑入口，再按 E 或空格互动。');return;}if(nearby.kind||!/日新楼|中心图书馆/.test(nearby.name)){callbacks.onInteract?.({building:nearby,interior:false});notify(`${nearby.name||'这栋建筑'}：可在地图查看位置和标记。`);return;}const b=nearby;if(makeInterior(b)){emitPosition();notify(b.id===RIXIN_ID?'沿中央走廊探索日新楼，走到出口按 E 离开。':'室内为原创游戏场景，可走到下方出口离开。');}}
  function setRemotePlayers(players,scope){
    const campus=data?.meta.id?.replace('qianwei-','');
    if(!scope?.roomId||scope.campus!==campus){remote=[];remoteScope=null;return;}
    const prev=new Map(remoteScope?.roomId===scope.roomId?remote.map(p=>[p.id||p.sessionId,p]):[]);
    remoteScope={roomId:scope.roomId,campus};
    remote=(players||[]).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&(!p.roomId||p.roomId===scope.roomId)&&(!p.campus||p.campus===campus)).map(p=>{const old=prev.get(p.id||p.sessionId),sameInterior=old?.interior===p.interior&&old?.interiorRevision===p.interiorRevision,smoothWorld=old&&sameInterior&&Math.hypot(p.x-old.x,p.y-old.y)<=12,layout=p.interior?getInteriorLayout(p.interior):null,smoothInterior=sameInterior&&isInteriorWalkable(layout,old?.interiorX,old?.interiorY)&&isInteriorWalkable(layout,p.interiorX,p.interiorY)&&interiorSegmentClear(layout,[old.interiorX,old.interiorY],[p.interiorX,p.interiorY]);return{...p,x:smoothWorld?old.x:p.x,y:smoothWorld?old.y:p.y,targetX:p.x,targetY:p.y,interiorX:smoothInterior?old.interiorX:p.interiorX,interiorY:smoothInterior?old.interiorY:p.interiorY,targetInteriorX:p.interiorX,targetInteriorY:p.interiorY};});
  }
  function drawMapBase(g,{w,h,z,ox,oy,dpr,full,selectedId}){
    // Index queries are padded for road widths, outlines and POI dots. Keep the
    // source layer order so overlapping surfaces paint identically to the map.
    const margin=Math.max(10,6*dpr/z),bounds=[-ox/z-margin,-oy/z-margin,(w-ox)/z+margin,(h-oy)/z+margin];
    const mapFeatures=(index,all)=>full?all:index.query(bounds).sort((a,b)=>mapFeatureOrder.get(a)-mapFeatureOrder.get(b));
    g.fillStyle='#e7e4cd';g.fillRect(0,0,w,h);g.save();g.translate(ox,oy);g.scale(z,z);for(const f of boundary){trace(g,f.polygons);g.fillStyle='#b6c293';g.fill('evenodd');g.strokeStyle='#718b69';g.lineWidth=1.4/z;g.stroke();}for(const f of mapFeatures(surfaceIndex,surfaces)){trace(g,f.polygons);g.fillStyle=surfaceColor(f);g.fill('evenodd');}for(const f of mapFeatures(roadIndex,roads)){g.strokeStyle=roadWidth(f)>4?'#dedcc6':'#e8e0c5';g.lineWidth=roadWidth(f);g.lineCap='round';for(const l of f.lines){g.beginPath();l.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.stroke();}}for(const f of mapFeatures(waterIndex,water)){trace(g,f.polygons);g.fillStyle='#75aeb0';g.fill('evenodd');}for(const f of mapFeatures(buildingIndex,buildings)){trace(g,f.polygons);g.fillStyle=f.id===selectedId?'#dda953':/公寓/.test(f.name)?'#b4a38d':/餐厅/.test(f.name)?'#a7ad84':'#8faaa9';g.fill('evenodd');g.strokeStyle=f.id===selectedId?'#a07135':'#648783';g.lineWidth=(f.id===selectedId?2:.7)/z;g.stroke();}for(const p of places){if(p.polygons||!p.center)continue;const q=transform.forward(...p.center);if(!full&&(q[0]<bounds[0]||q[0]>bounds[2]||q[1]<bounds[1]||q[1]>bounds[3]))continue;g.fillStyle=p.kind==='gate'?'#876e8e':'#668e78';g.beginPath();g.arc(q[0],q[1],(p.id===selectedId?5:2.5)*dpr/z,0,PI2);g.fill();}const selectedPlace=places.find(p=>p.id===selectedId);if(selectedPlace?.polygons){trace(g,selectedPlace.polygons.map(p=>({outer:p.outer.map(q=>transform.forward(...q)),holes:(p.holes||[]).map(r=>r.map(q=>transform.forward(...q)))})));g.fillStyle='#e6b55244';g.fill('evenodd');g.strokeStyle='#b77d30';g.lineWidth=2*dpr/z;g.stroke();}g.restore();
    if(full){g.textAlign='center';g.font=`500 ${14*dpr}px "Microsoft YaHei",sans-serif`;const occupied=[];const major=/日新|中心图书馆|鼎新|唐敖庆楼$|前卫体育馆|李四光|王湘浩|东荣|理化楼/;const mapLabels=[...buildings,...places.filter(p=>p.center&&p.name).map(p=>({...p,center:transform.forward(...p.center)}))].filter(f=>f.name&&!/公寓|区$/.test(f.name)).sort((a,b)=>Number(major.test(b.name))-Number(major.test(a.name)));for(const feature of mapLabels){const p=feature.center||[(feature.bounds[0]+feature.bounds[2])/2,(feature.bounds[1]+feature.bounds[3])/2],x=ox+p[0]*z,y=oy+p[1]*z,textWidth=g.measureText(feature.name).width,box=[x-textWidth/2-3*dpr,y-14*dpr,x+textWidth/2+3*dpr,y+3*dpr];if(x<0||x>w||y<0||y>h)continue;if(feature.id!==selectedId&&occupied.some(other=>inBounds(box,other)))continue;occupied.push(box);g.strokeStyle='#f0efda';g.lineWidth=3*dpr;g.strokeText(feature.name,x,y);g.fillStyle='#2c514f';g.fillText(feature.name,x,y);}}
  }
  function drawMap(mapCanvas,settings={}){if(!data)return;const g=mapCanvas.getContext('2d');if(!g)return;const w=mapCanvas.width,h=mapCanvas.height,full=settings.full!==false,dpr=w/(mapCanvas.getBoundingClientRect().width||w),pad=(full?24:5)*dpr;const mapZoom=clamp(Number(settings.zoom)||1,1,12),mapCenter=settings.center?transform.forward(...point(settings.center)):[transform.width/2,transform.height/2];const b=full?[mapCenter[0]-transform.width/(2*mapZoom),mapCenter[1]-transform.height/(2*mapZoom),mapCenter[0]+transform.width/(2*mapZoom),mapCenter[1]+transform.height/(2*mapZoom)]:[camera[0]-110,camera[1]-110,camera[0]+110,camera[1]+110];const z=Math.min((w-pad*2)/(b[2]-b[0]),(h-pad*2)/(b[3]-b[1])),ox=(w-(b[2]-b[0])*z)/2-b[0]*z,oy=(h-(b[3]-b[1])*z)/2-b[1]*z;
    if(w<1||h<1||!(z>0))return;
    mapViews.set(mapCanvas,{z,ox,oy});
    const selectedId=settings.selectedId||settings.selected?.id||settings.selected,buffer=full?0:Math.ceil(64*dpr);
    let cached=mapBases.get(mapCanvas);
    const matches=cached&&cached.w===w&&cached.h===h&&cached.dpr===dpr&&cached.full===full&&cached.z===z&&cached.selectedId===selectedId;
    // The minimap follows the camera by shifting a small overscanned image;
    // movement within its margin does not retrace the entire campus geometry.
    if(!matches||Math.abs(ox-cached.ox)>buffer||Math.abs(oy-cached.oy)>buffer){
      const base=cached?.canvas||document.createElement('canvas');base.width=w+2*buffer;base.height=h+2*buffer;
      const baseContext=base.getContext('2d');
      drawMapBase(baseContext,{w:base.width,h:base.height,z,ox:ox+buffer,oy:oy+buffer,dpr,full,selectedId});
      cached={canvas:base,w,h,dpr,full,z,ox,oy,selectedId};mapBases.set(mapCanvas,cached);mapBaseBuilds++;
    }
    g.drawImage(cached.canvas,ox-cached.ox-buffer,oy-cached.oy-buffer);
    // A campus map shows room members at their outdoor position or building entrance.
    // Interior coordinates never belong to this geographic view.
    for(const peer of remote){
      const building=peer.interior?data.buildings.find(b=>b.id===peer.interior):null;
      if(peer.interior&&!building)continue;
      const entry=building?.id===RIXIN_ID?nearestInteriorEntrance(getInteriorLayout(building.id),peer.targetX??peer.x,peer.targetY??peer.y):null;
      const location=building?(entry?.exterior||world.getEntrance(building)):[peer.x,peer.y];if(!location)continue;
      const q=transform.forward(...location),x=ox+q[0]*z,y=oy+q[1]*z;
      if(x<0||x>w||y<0||y>h)continue;
      g.fillStyle=building?'#e7e4cd':'#527da8';g.strokeStyle=building?'#527da8':'#f5f2df';g.lineWidth=2*dpr;
      g.beginPath();g.arc(x,y,(full?4.5:3.5)*dpr,0,PI2);g.fill();g.stroke();
      if(full){g.font=`500 ${14*dpr}px "Microsoft YaHei",sans-serif`;g.textAlign='center';g.strokeStyle='#f0efda';g.lineWidth=3*dpr;const label=(peer.name||peer.nickname||'同组伙伴')+(building?' · 室内':'');g.strokeText(label,x,y-9*dpr);g.fillStyle='#254b70';g.fillText(label,x,y-9*dpr);}
    }
    const p=transform.forward(player.x,player.y);g.fillStyle='#ea745d';g.strokeStyle='#fff8da';g.lineWidth=2;g.beginPath();g.arc(ox+p[0]*z,oy+p[1]*z,(full?6:4)*dpr,0,PI2);g.fill();g.stroke();const mark=marker;if(mark){const q=transform.forward(mark.x,mark.y);g.strokeStyle='#aa7427';g.lineWidth=2;g.beginPath();g.arc(ox+q[0]*z,oy+q[1]*z,8,0,PI2);g.stroke();}g.fillStyle='#365d55';g.font=`600 ${(full?14:10)*dpr}px sans-serif`;g.textAlign='right';g.fillText('N ↘',w-9*dpr,(full?22:14)*dpr);
  }
  function mapToWorld(mapCanvas,clientX,clientY){const v=mapViews.get(mapCanvas);if(!v)return null;const rect=mapCanvas.getBoundingClientRect();const x=(clientX-rect.left)*mapCanvas.width/rect.width,y=(clientY-rect.top)*mapCanvas.height/rect.height,q=transform.inverse((x-v.ox)/v.z,(y-v.oy)/v.z);return{x:q[0],y:q[1]};}
  function pickMap(mapCanvas,clientX,clientY){const converted=mapToWorld(mapCanvas,clientX,clientY);if(!converted)return null;const q=[converted.x,converted.y],exactBuilding=world.findBuilding(...q);if(exactBuilding)return exactBuilding;let bestPlace=null,bestDistance=10;for(const place of places){if(place.polygons&&pointInFeature(q,place))return place;const d=place.center?length(q,place.center):Infinity;if(d<bestDistance){bestDistance=d;bestPlace=place;}}if(bestPlace)return bestPlace;let closest=null,best=25;for(const item of world.buildingIndex.at(...q,25)){const d=length(q,item.center);if(d<best){best=d;closest=item;}}return closest;}
  function setOptions(next){Object.assign(opts,next);if(next.time)opts.timeOfDay=next.time;if(next.nickname)opts.name=next.nickname;opts.zoom=clamp(Number(opts.zoom)||1,.4,2);opts.speed=clamp(Number(opts.speed)||1,.5,2);}
  function destroy(){destroyed=true;navigationWorker?.terminate();cancelAnimationFrame(raf);resizeObserver.disconnect();for(const off of listeners)off();chunks.clear();mapBases=new WeakMap();mapFeatureOrder=new WeakMap();}
  raf=requestAnimationFrame(render);
  return{getRenderStats(){return{groundBuilds,cachedChunks:chunks.size,visibleChunks:visibleChunkCount,chunkBudget,mapBaseBuilds};},load,setOptions,setRemotePlayers,setJoystick(x,y){joystick[0]=clamp(x,-1,1);joystick[1]=clamp(y,-1,1);},getPosition,teleport,reconcile,getDestination,getSafePosition:getDestination,getEntrance:getDestination,interact,drawMap,pickMap,mapToWorld,getMapTransform(mapCanvas){return mapViews.get(mapCanvas)||null;},setTarget,setMarker,getMarker,getNavigationState,cancelNavigation,getBuildings(){return data?.buildings||[];},getPlaces(){return places;},getMapFeatures(){return [...(data?.buildings||[]),...places];},getWorld(){return world;},destroy};
}
