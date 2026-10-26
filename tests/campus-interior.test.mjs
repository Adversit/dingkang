import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createWorld} from '../public/apps/jlu-campus/geometry.js';
import {RIXIN_ID,LIBRARY_ID,getInteriorLayout,isInteriorWalkable,interiorSegmentClear,interiorExitAt,resolveInteriorPosition,nearestInteriorEntrance} from '../public/apps/jlu-campus/interior-layout.js';

const rixin=getInteriorLayout(RIXIN_ID),library=getInteriorLayout(LIBRARY_ID);
const center=rect=>[rect.x+rect.w/2,rect.y+rect.h/2];

test('日新楼 uses its nonrectangular 66×91 layout and a safe vestibule spawn',()=>{
  assert.equal(rixin.width,66);assert.equal(rixin.height,91);assert.ok(rixin.footprint.length>4);
  assert.deepEqual(rixin.spawn,{x:32.6875,y:83.6875});assert.ok(isInteriorWalkable(rixin,rixin.spawn.x,rixin.spawn.y));
  assert.equal(interiorExitAt(rixin,rixin.spawn.x,rixin.spawn.y),null,'entering must not immediately exit');
  assert.equal(isInteriorWalkable(rixin,32,89),false,'recess outside the entrance is not floor');
  for(const p of [[0,0],[66,45],[30,91],[NaN,20],[20,Infinity]])assert.equal(isInteriorWalkable(rixin,...p),false);
  assert.equal(getInteriorLayout('unknown-building'),null);
});

test('every interior wall and solid object blocks the foot while all 18 door openings are traversable',()=>{
  assert.equal(rixin.doors.length,18);
  for(const wall of rixin.walls)assert.equal(isInteriorWalkable(rixin,...center(wall)),false,wall.id);
  for(const object of rixin.objects.filter(object=>object.solid))assert.equal(isInteriorWalkable(rixin,...center(object)),false,object.id);
  for(const door of rixin.doors){
    const p=center(door),horizontal=door.axis==='horizontal';
    const a=horizontal?[p[0],p[1]-.9]:[p[0]-.9,p[1]],b=horizontal?[p[0],p[1]+.9]:[p[0]+.9,p[1]];
    assert.ok(isInteriorWalkable(rixin,...p),door.id+' center');
    assert.ok(interiorSegmentClear(rixin,a,b),door.id+' crossing');
  }
  // Endpoints are clear, but the connecting segment crosses a solid escalator.
  assert.ok(isInteriorWalkable(rixin,29.5,72));assert.ok(isInteriorWalkable(rixin,32.5,72));
  assert.equal(interiorSegmentClear(rixin,[29.5,72],[32.5,72]),false);
});

test('all seven exit zones have safe approach points and do not include the central hall',()=>{
  assert.equal(rixin.exits.length,7);assert.equal(new Set(rixin.exits.map(exit=>exit.id)).size,7);
  for(const exit of rixin.exits){
    assert.ok(isInteriorWalkable(rixin,exit.spawn.x,exit.spawn.y),exit.id+' approach');
    assert.equal(interiorExitAt(rixin,...center(exit))?.id,exit.id);
    assert.ok(interiorSegmentClear(rixin,[exit.spawn.x,exit.spawn.y],center(exit)),exit.id+' approach to trigger');
  }
  assert.equal(interiorExitAt(rixin,32.5,50),null);
  assert.equal(interiorExitAt(rixin,32.5,87),null,'outside the footprint is not an exit interaction point');
});

test('the main entrance connects to every room, every doorway and every exit with foot clearance',()=>{
  const step=.5,width=Math.ceil(rixin.width/step),height=Math.ceil(rixin.height/step),walk=new Uint8Array(width*height),seen=new Uint8Array(width*height);
  const point=(x,y)=>[x*step+step/2,y*step+step/2];
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)walk[y*width+x]=isInteriorWalkable(rixin,...point(x,y))?1:0;
  const sx=Math.floor(rixin.spawn.x/step),sy=Math.floor(rixin.spawn.y/step),start=sy*width+sx;
  assert.ok(walk[start]);assert.ok(interiorSegmentClear(rixin,[rixin.spawn.x,rixin.spawn.y],point(sx,sy)));
  const queue=[start];seen[start]=1;
  for(let index=0;index<queue.length;index++){
    const id=queue[index],x=id%width,y=Math.floor(id/width);
    for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
      const xx=x+dx,yy=y+dy,next=yy*width+xx;if(xx<0||yy<0||xx>=width||yy>=height||!walk[next]||seen[next])continue;
      if(!interiorSegmentClear(rixin,point(x,y),point(xx,yy)))continue;seen[next]=1;queue.push(next);
    }
  }
  const reached=queue.map(id=>point(id%width,Math.floor(id/width)));
  for(const room of rixin.rooms)assert.ok(reached.some(([x,y])=>x>room.x&&x<room.x+room.w&&y>room.y&&y<room.y+room.h),room.id+' must connect to the entrance');
  for(const door of rixin.doors)assert.ok(reached.some(p=>Math.hypot(p[0]-center(door)[0],p[1]-center(door)[1])<.5),door.id+' must connect to the entrance');
  for(const exit of rixin.exits)assert.ok(reached.some(([x,y])=>x>exit.x&&x<exit.x+exit.w&&y>exit.y&&y<exit.y+exit.h),exit.id+' must connect to the entrance');
});

test('revision-aware restoration resets old or blocked coordinates and preserves valid current positions',()=>{
  const safe={x:32.5,y:50};assert.ok(isInteriorWalkable(rixin,safe.x,safe.y));
  assert.deepEqual(resolveInteriorPosition(rixin,safe.x,safe.y,rixin.revision),safe);
  for(const revision of [undefined,null,'rixin-v1','unknown'])assert.deepEqual(resolveInteriorPosition(rixin,safe.x,safe.y,revision),rixin.spawn);
  for(const[x,y]of[[95,123],[30.5,72],[NaN,20],[20,Infinity]])assert.deepEqual(resolveInteriorPosition(rixin,x,y,rixin.revision),rixin.spawn);
  const recovered=resolveInteriorPosition(rixin,95,123,'rixin-v1');recovered.x=-1;assert.equal(rixin.spawn.x,32.6875,'recovery returns an independent position');
});

test('library keeps the prior 190×140 collision rules and accepts compatible unversioned saves',()=>{
  assert.equal(library.width,190);assert.equal(library.height,140);assert.equal(library.revision,'library-v1');
  const legacyWalk=(x,y)=>x>=7&&x<=183&&y>=8&&y<=133&&!library.objects.some(f=>x>f.x-2&&x<f.x+f.w+2&&y>f.y-2&&y<f.y+f.h+2);
  for(let y=0;y<=140;y+=1.5)for(let x=0;x<=190;x+=1.5)assert.equal(isInteriorWalkable(library,x,y),legacyWalk(x,y),`${x},${y}`);
  assert.deepEqual(resolveInteriorPosition(library,95,110,undefined),{x:95,y:110});
  assert.deepEqual(resolveInteriorPosition(library,95,110,library.revision),{x:95,y:110});
  assert.deepEqual(resolveInteriorPosition(library,20,23,library.revision),library.spawn);
  assert.equal(interiorExitAt(library,95,123)?.id,'main');
});


test('all seven exterior destinations have distinct source nodes and safe points in the real south campus',()=>{
  const data=JSON.parse(fs.readFileSync(new URL('../public/apps/jlu-campus/data/qianwei-south.json',import.meta.url),'utf8')),world=createWorld(data);
  assert.equal(new Set(rixin.exits.map(exit=>exit.sourceNodeId)).size,7);
  assert.equal(new Set(rixin.exits.map(exit=>exit.sourceWayId)).size,7);
  for(const exit of rixin.exits){
    const source=data.pois.find(poi=>poi.id===exit.sourceNodeId);assert.ok(source,exit.id+' source node exists');
    assert.ok(source.tags?.entrance,exit.id+' source is an entrance');
    assert.deepEqual([source.x,source.y],exit.sourcePoint,exit.id+' original point unchanged');
    assert.ok(world.isWalkable(...exit.exterior,.65),exit.id+' safe exterior');
    assert.ok(Math.hypot(exit.exterior[0]-source.x,exit.exterior[1]-source.y)<3,exit.id+' safe point remains at the actual door');
    assert.equal(nearestInteriorEntrance(rixin,...exit.exterior)?.id,exit.id);
    assert.equal(nearestInteriorEntrance(rixin,...exit.sourcePoint)?.id,exit.id);
  }
});

test('door selection is bounded to six metres and never accepts a fabricated distant entrance',()=>{
  assert.equal(rixin.entryRadius,6);
  const main=rixin.exits.find(exit=>exit.id==='main'),[x,y]=main.exterior;
  assert.equal(nearestInteriorEntrance(rixin,x,y+5.9)?.id,'main');
  assert.equal(nearestInteriorEntrance(rixin,x,y+6.1),null);
  for(const p of [[20,32],[0,0],[NaN,y],[x,Infinity]])assert.equal(nearestInteriorEntrance(rixin,...p),null);
  assert.equal(nearestInteriorEntrance(null,x,y),null);assert.equal(nearestInteriorEntrance(library,95,123),null);
});
