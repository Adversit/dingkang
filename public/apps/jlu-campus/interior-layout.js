/** Shared, original interior data. Rixin measurements describe the public game's
 * layout, not a surveyed building plan. Door interaction zones are our own.
 * Client rendering and server collision consume this same module. */
export const RIXIN_ID='way/1473779965';
export const LIBRARY_ID='way/1473651054';
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const inside=(x,y,ring)=>{let result=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])result=!result;}return result;};
const segmentDistance=(x,y,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t);};

const libraryObjects=[];
for(let y=20;y<100;y+=28)for(let x=15;x<170;x+=40)libraryObjects.push({id:`library-${x}-${y}`,kind:y===20?'bookshelf':'reading-table',x,y,w:25,h:9,solid:true});
const library={id:LIBRARY_ID,revision:'library-v1',title:'中心图书馆',width:190,height:140,spawn:{x:95,y:123},footRadius:2,maxSpeed:20.4,movementScale:3,renderScale:4,collisionMode:'legacy-box',bounds:{minX:7,maxX:183,minY:8,maxY:133},objects:libraryObjects,solids:libraryObjects,walls:[],doors:[],floors:[],rooms:[],exits:[{id:'main',label:'出口',x:75,y:116,w:40,h:24,door:{x:95,y:137},spawn:{x:95,y:123}}]};

const footprint=[[45.875,89.875],[45.875,86.0625],[20.5,86.3125],[20.5,89.75],[2.5625,89.9375],[2.0625,47.75],[1.4375,2.3125],[63.5625,1.6875],[64.6875,89.6875]];
const wallCells=new Map(),cellKey=(x,y)=>`${x},${y}`;
const inFloor=(x,y)=>inside(x+.5,y+.5,footprint);
for(let y=0;y<91;y++)for(let x=0;x<66;x++)if(inFloor(x,y)&&[-1,0,1].some(dx=>[-1,0,1].some(dy=>!inFloor(x+dx,y+dy))))wallCells.set(cellKey(x,y),'exterior');
function wall(x1,y1,x2,y2,material='plaster'){for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)if(inFloor(x,y))wallCells.set(cellKey(x,y),material);}
for(const segment of [[2,8,15,8],[15,3,15,8],[49,8,63,8],[49,3,49,8]])wall(...segment);
for(const x of [4,6,8,10,12,52,54,56,58,60])wall(x,3,x,4);
for(const y of [15,30,44,52,64,76]){wall(2,y,25,y);wall(39,y,62,y);}
for(const x of [13,51]){wall(x,15,x,44);wall(x,64,x,76);}
for(const x of [25,39]){wall(x,16,x,43,'glass');wall(x,53,x,75,'glass');}
for(const y of [15,44,76]){wall(3,y,12,y,'glass');wall(52,y,62,y,'glass');}
for(const segment of [[3,83,19,83],[19,83,19,84],[46,83,63,83],[46,83,46,84]])wall(...segment,'glass');
const doorCoordinates=[[9,8,10,8],[54,8,55,8],[7,15,8,15],[56,15,57,15],[25,22,25,23],[39,22,39,23],[25,36,25,37],[39,36,39,37],[7,44,8,44],[56,44,57,44],[25,57,25,58],[39,57,39,58],[25,69,25,70],[39,69,39,70],[7,76,8,76],[56,76,57,76],[16,83,17,83],[47,83,48,83]];
const doors=doorCoordinates.map(([x,y,x2,y2],i)=>({id:`door-${i+1}`,kind:'door',x,y,w:x2-x+1,h:y2-y+1,axis:x===x2?'vertical':'horizontal'}));
const reserves=doors.map(d=>d.axis==='vertical'?{x:d.x-2,y:d.y,w:5,h:d.h}:{x:d.x,y:d.y-2,w:d.w,h:5});
reserves.push({x:30,y:78,w:5,h:7});
const exitDefinitions=[['main','正门',32.6875,86.1875,0,-1,3],['right-south','右下侧门',64.5,78.8125,-1,0,2],['right-middle','右侧中门',64.125,47.375,-1,0,2],['right-north','右上侧门',63.6875,14.1875,-1,0,2],['left-south','左下侧门',2.4375,80.75,1,0,2],['left-middle','左侧中门',2.0625,47.75,1,0,2],['left-north','左上侧门',1.5625,11.625,1,0,2]];
const exteriorDoors={
  main:{sourceNodeId:'node/13521002682',sourceWayId:'way/1473779992',ref:'正门',sourcePoint:[1000.62,756.61],exterior:[999.59,754.44]},
  'left-south':{sourceNodeId:'node/13521002687',sourceWayId:'way/1473779996',ref:'1号门',sourcePoint:[1030.43,748.98],exterior:[1032.59,747.93]},
  'left-middle':{sourceNodeId:'node/13521002689',sourceWayId:'way/1473779997',ref:'2号门',sourcePoint:[1044.45,778.85],exterior:[1046.61,777.81]},
  'left-north':{sourceNodeId:'node/13521002690',sourceWayId:'way/1473779998',ref:'3号门',sourcePoint:[1059.95,811.49],exterior:[1062.10,810.42]},
  'right-north':{sourceNodeId:'node/13521002686',sourceWayId:'way/1473779995',ref:'4号门',sourcePoint:[1002.36,834.97],exterior:[1000.23,836.08]},
  'right-middle':{sourceNodeId:'node/13521002685',sourceWayId:'way/1473779994',ref:'5号门',sourcePoint:[988.21,805.01],exterior:[986.06,806.07]},
  'right-south':{sourceNodeId:'node/13521002684',sourceWayId:'way/1473779993',ref:'6号门',sourcePoint:[974.77,776.57],exterior:[972.63,777.66]},
};
const exits=exitDefinitions.map(([id,label,x,y,dx,dy,opening])=>{
  const vertical=!!dx,reserve=vertical?{x:x-3,y:y-opening/2,w:6,h:opening}:{x:x-opening/2,y:y-3,w:opening,h:6};reserves.push(reserve);
  const cx=x+dx*.95,cy=y+dy*.95;
  return{id,doorId:id,...exteriorDoors[id],label:exteriorDoors[id].ref,localLabel:label,door:{x,y},x:cx-(vertical?.7:opening/2),y:cy-(vertical?opening/2:.7),w:vertical?1.4:opening,h:vertical?opening:1.4,spawn:{x:x+dx*2.5,y:y+dy*2.5}};
});
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
for(const [key] of wallCells){const[x,y]=key.split(',').map(Number);if(reserves.some(r=>overlap({x,y,w:1,h:1},r)))wallCells.delete(key);}
// Merge adjacent wall cells into readable, common art/collision rectangles.
const walls=[];
for(let y=0;y<91;y++)for(let x=0;x<66;){const material=wallCells.get(cellKey(x,y));if(!material){x++;continue;}let end=x+1;while(end<66&&wallCells.get(cellKey(end,y))===material)end++;const previous=walls.find(w=>w.x===x&&w.w===end-x&&w.y+w.h===y&&w.material===material);if(previous)previous.h++;else walls.push({id:`wall-${x}-${y}`,kind:'wall',material,x,y,w:end-x,h:1,solid:true});x=end;}
const floors=[];
for(const[material,rectangles]of Object.entries({terrazzo:[[3,3,14,7],[50,3,62,7],[14,16,24,29],[40,16,50,29],[3,31,12,43],[52,31,62,43],[3,53,24,63],[52,65,62,75],[4,84,18,88],[47,84,63,88]],parquet:[[3,16,12,29],[52,16,62,29],[14,31,24,43],[40,31,50,43],[14,65,24,75],[40,65,50,75],[3,65,12,75]],carpet:[[40,53,62,63]],mat:[[30,83,34,84]]}))for(const[x,y,x2,y2]of rectangles)floors.push({material,x,y,w:x2-x+1,h:y2-y+1});
const roomFacts=[['wc-west','卫生间',3,3,12,5,'toilet'],['wc-east','卫生间',50,3,13,5,'toilet'],['nails','美甲',3,16,10,14,'shop'],['stationery','文具',14,16,11,14,'shop'],['tea-near','茶饮',40,16,11,14,'shop'],['tea-east','茶饮',52,16,11,14,'shop'],['print','打印',3,31,10,13,'shop'],['clothes-west','服饰',14,31,11,13,'shop'],['clothes-east','服饰',40,31,11,13,'shop'],['phone-north','手机配件',52,31,11,13,'shop'],['photo','证件照',3,53,22,11,'shop'],['suits','正装',40,53,23,11,'shop'],['clothes-south','服饰',3,65,10,11,'shop'],['tea-south-west','茶饮',14,65,11,11,'shop'],['tea-south-east','茶饮',40,65,11,11,'shop'],['phone-south','手机配件',52,65,11,11,'shop'],['stall-west','饮品小食',4,84,15,5,'shop'],['stall-east','饮品小食',47,84,17,5,'shop']];
const rooms=roomFacts.map(([id,label,x,y,w,h,kind])=>({id,label,x,y,w,h,kind}));
const objects=[];
function available(object){return ![...walls,...objects.filter(o=>o.solid),...reserves].some(r=>overlap(object,r))&&[[object.x+.05,object.y+.05],[object.x+object.w-.05,object.y+.05],[object.x+.05,object.y+object.h-.05],[object.x+object.w-.05,object.y+object.h-.05]].every(([x,y])=>inside(x,y,footprint));}
function add(kind,x,anchorY,w=1,h=1,extra={}){const object={id:`${kind}-${x}-${anchorY}`,kind,x,y:anchorY-h+1,w,h,solid:true,...extra};if(available(object))objects.push(object);return object;}
add('escalator',30,75,2,8,{direction:'up',label:'上行扶梯'});add('escalator',33,75,2,8,{direction:'down',label:'下行扶梯'});
for(const x of [16,45])add('stairs',x,8,4,6,{direction:'up',label:'楼梯'});
for(const x of [27,35])add('elevator',x,3,3,1,{label:'电梯'});
for(const y of [20,28,36,44,60]){add('bench',28,y,1,3,{direction:'right'});add('bench',36,y,1,3,{direction:'left'});}
add('shelf',4,16,3);add('counter',4,18,3);for(const y of [21,25])for(const x of [7,10])add('nail-table',x,y,2);
for(const x of [14,16,18,20,22])add('stationery-rack',x,16,2);for(const y of [19,23,27])for(const x of [14,16,18])add('stationery-rack',x,y,2);add('checkout',21,21,2);
add('menu-board',41,16,3);for(const x of [45,47,49])add('fridge',x,16,2);add('tea-bar',41,18,3);for(const x of [45,47])add('display-case',x,18,2);
add('menu-board',58,16,3);add('fridge',61,16,2);add('tea-bar',58,18,3);add('checkout',61,18,2);
for(const x of [14,17,20,42,45,48])add('clothes-rack',x,31,3);for(const y of [34,38])for(const x of [14,17,45,48])add('clothes-rack',x,y,3);add('counter',22,34,3);add('counter',40,34,3);
for(const x of [3,5,7,9,11])add('printer',x,31);add('printer',12,39);add('counter',9,41,3);
for(const x of [53,55,57,59,61])add('peg-rack',x,31,2);add('counter',53,41,3);for(const x of [53,57])add('phone-case',x,36,3);
for(const x of [13,17,22,49,45,40])add('repair-kiosk',x,46,3,2,{label:'维修服务'});
add('backdrop',5,53,3);add('photo-camera',6,59);for(const x of [14,17,20])add('photo-wall',x,53,3);add('counter',21,56,3);
for(const x of [41,44,47,50,53,56,59])add('suit-rack',x,53,3);for(const x of [45,48,53,56])add('suit-rack',x,59,3);add('counter',41,56,3);
for(const x of [14,16,47,49])add('fridge',x,65,2);for(const x of [18,21,41,44])add('menu-board',x,65,3);for(const x of [18,44])add('counter',x,67,3);for(const x of [21,41])add('tea-bar',x,67,3);
for(const x of [3,6,9])add('clothes-rack',x,65,3);for(const x of [6,9])add('clothes-rack',x,69,3);add('checkout',10,73,2);
for(const x of [53,55,57,59,61])add('peg-rack',x,65,2);for(const x of [53,56])add('phone-case',x,69,3);add('checkout',53,73,2);
for(const x of [5,9,13,57,53,49]){add('menu-board',x,84,3);add([9,53].includes(x)?'tea-bar':'counter',x,86,3);}
for(const x of [21,42])add('notice',x,77,2,1,{label:'公告'});for(const x of [23,41])add('extinguisher',x,77);
for(const y of [7,15,23,31,39,47,55,63,71,79])for(const x of [4,12,20,28]){const a={x,y,w:1,h:1},b={x:64-x,y,w:1,h:1};if(available(a)&&available(b)&&[a,b].every(p=>[[p.x-.5,p.y+.5],[p.x+1.5,p.y+.5],[p.x+.5,p.y-.5],[p.x+.5,p.y+1.5]].every(([xx,yy])=>inFloor(Math.floor(xx),Math.floor(yy))&&!wallCells.has(cellKey(Math.floor(xx),Math.floor(yy)))))){add('column',x,y);add('column',64-x,y);}}
// Wall signs are drawings, not obstacles.
objects.push({id:'clock',kind:'clock',x:31.5,y:2,w:1,h:1,solid:false});
for(const x of [11,53])objects.push({id:`wc-sign-${x}`,kind:'wc-sign',label:'卫生间',x,y:8,w:1,h:1,solid:false});
for(const y of [8,44,76])for(const x of [4,60])objects.push({id:`exit-sign-${x}-${y}`,kind:'exit-sign',label:'出口',x,y,w:1,h:1,solid:false});
const rixin={id:RIXIN_ID,revision:'rixin-v2',title:'日新楼',width:66,height:91,spawn:{...exits[0].spawn},entryRadius:6,exteriorEvidence:'docs/campus/rixin-doors-2026-10-26.md',footRadius:.32,maxSpeed:6.8,movementScale:1,renderScale:24,collisionMode:'circle',footprint,objects,solids:[...walls,...objects.filter(o=>o.solid)],walls,doors,floors,rooms,exits,source:'Reference game public layout measurements; original render and derived interaction zones'};
export function getInteriorLayout(buildingId){return buildingId===RIXIN_ID?rixin:buildingId===LIBRARY_ID?library:null;}
export function isInteriorWalkable(layout,x,y){
  if(!layout||!Number.isFinite(x)||!Number.isFinite(y))return false;
  if(layout.bounds&&(x<layout.bounds.minX||x>layout.bounds.maxX||y<layout.bounds.minY||y>layout.bounds.maxY))return false;
  if(layout.footprint){if(!inside(x,y,layout.footprint))return false;for(let i=0;i<layout.footprint.length;i++)if(segmentDistance(x,y,layout.footprint[i],layout.footprint[(i+1)%layout.footprint.length])<layout.footRadius)return false;}
  const radius=layout.footRadius;
  for(const solid of layout.solids){
    if(layout.collisionMode==='legacy-box'){if(x>solid.x-radius&&x<solid.x+solid.w+radius&&y>solid.y-radius&&y<solid.y+solid.h+radius)return false;}
    else{const dx=x-clamp(x,solid.x,solid.x+solid.w),dy=y-clamp(y,solid.y,solid.y+solid.h);if(dx*dx+dy*dy<radius*radius)return false;}
  }
  return true;
}
export function interiorSegmentClear(layout,a,b){
  if(!Array.isArray(a)||!Array.isArray(b)||!isInteriorWalkable(layout,a[0],a[1]))return false;
  const distance=Math.hypot(b[0]-a[0],b[1]-a[1]);if(!Number.isFinite(distance))return false;
  const count=Math.max(1,Math.ceil(distance/Math.max(.12,Math.min(.5,layout.footRadius/2))));
  for(let i=1;i<=count;i++)if(!isInteriorWalkable(layout,a[0]+(b[0]-a[0])*i/count,a[1]+(b[1]-a[1])*i/count))return false;
  return true;
}
export function interiorExitAt(layout,x,y){
  if(!layout||!isInteriorWalkable(layout,x,y))return null;
  return layout.exits.find(exit=>x>exit.x&&x<exit.x+exit.w&&y>exit.y&&y<exit.y+exit.h)||null;
}
export function resolveInteriorPosition(layout,x,y,revision){
  const compatible=revision===layout?.revision||(layout?.revision==='library-v1'&&!revision);
  return compatible&&isInteriorWalkable(layout,x,y)?{x,y}:{...layout.spawn};
}

/** Select only a verified geographic door within the local interaction radius. */
export function nearestInteriorEntrance(layout,x,y){
  if(!layout||!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(layout.entryRadius))return null;
  let nearest=null,distance=layout.entryRadius;
  for(const exit of layout.exits){if(!Array.isArray(exit.exterior))continue;const next=Math.hypot(x-exit.exterior[0],y-exit.exterior[1]);if(next<=distance){nearest=exit;distance=next;}}
  return nearest;
}
