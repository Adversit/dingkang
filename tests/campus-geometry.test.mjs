import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pointInRing,pointInPolygon,createTransform,SpatialIndex,createWorld} from '../public/apps/jlu-campus/geometry.js';
const ring=(x1,y1,x2,y2)=>[[x1,y1],[x2,y1],[x2,y2],[x1,y2],[x1,y1]];
const feature=(id,x1,y1,x2,y2,holes=[])=>({id,name:id,bounds:[x1,y1,x2,y2],center:[(x1+x2)/2,(y1+y2)/2],polygons:[{outer:ring(x1,y1,x2,y2),holes}]});
const data=(buildings=[],water=[])=>({meta:{width:100,height:100},boundary:[feature('campus',0,0,100,100)],buildings,water,roads:[],pois:[]});
test('polygon holes remain walkable while outer walls and water block the foot',()=>{
  const courtyard=feature('courtyard',20,20,60,60,[ring(30,30,50,50)]);
  const world=createWorld(data([courtyard],[feature('lake',70,10,90,30)]));
  assert.equal(pointInRing([20,40],courtyard.polygons[0].outer),true);
  assert.equal(pointInPolygon([40,40],courtyard.polygons[0]),false);
  assert.equal(world.isWalkable(40,40),true);
  assert.equal(world.isWalkable(25,40),false);
  assert.equal(world.isWalkable(30.2,40),false,'foot must not clip an inner wall');
  assert.equal(world.isWalkable(80,20),false);
  assert.equal(world.isWalkable(0.2,50),false,'foot remains inside the campus');
  assert.equal(world.isWalkable(NaN,20),false);
});
test('203 degree display transform round-trips independently of world geometry',()=>{
  const t=createTransform(2069,1306.18,203);
  for(const p of [[0,0],[2069,0],[0,1306.18],[1034.5,653.09],[1300.123,854.765]]){
    const back=t.inverse(...t.forward(...p));
    assert.ok(Math.hypot(back[0]-p[0],back[1]-p[1])<1e-9);
    const projected=t.forward(...p);assert.ok(projected[0]>-1e-8&&projected[1]>-1e-8);
  }
  const bounds=t.transformedBounds([0,0,2069,1306.18]);
  assert.ok(Math.abs(bounds[2]-t.width)<1e-8);assert.ok(Math.abs(bounds[3]-t.height)<1e-8);
});
test('spatial index does not duplicate features spanning cells',()=>{
  const a=feature('a',0,0,200,200),b=feature('b',300,300,310,310),index=new SpatialIndex([a,b],32);
  assert.deepEqual(index.query([0,0,200,200]),[a]);
  assert.deepEqual(index.at(305,305),[b]);
});
test('entry fallback and spawn choose walkable exterior, never an enclosed courtyard',()=>{
  const building=feature('日新楼',20,20,60,60,[ring(30,30,50,50)]),d=data([building]);
  d.pois=[{id:'door',x:40,y:60,tags:{entrance:'yes'}}];
  const world=createWorld(d),entry=world.getEntrance(building);
  assert.ok(entry);assert.equal(world.isWalkable(...entry),true);
  assert.equal(pointInRing(entry,building.polygons[0].outer),false);
  assert.equal(world.isWalkable(...world.spawn),true);
});
test('A* goes around obstacles and every smoothed segment remains collision-free',()=>{
  const world=createWorld(data([feature('wall',40,10,60,80)]));
  const route=world.findPath([20,30],[80,30]);
  assert.ok(route&&route.length>2);
  for(let i=1;i<route.length;i++) assert.equal(world.lineWalkable(route[i-1],route[i]),true);
  assert.equal(world.findPath([20,30],[80,30],{maxNodes:1}),null);
});
test('closed courtyard cannot be reached through its solid surrounding building',()=>{
  const world=createWorld(data([feature('courtyard',20,20,60,60,[ring(30,30,50,50)])]));
  assert.equal(world.findPath([10,40],[40,40],{maxNodes:10000}),null);
});
test('real campus fixture has safe spawn and all available building exits are valid',{skip:!fs.existsSync(new URL('../public/apps/jlu-campus/data/qianwei-south.json',import.meta.url))},()=>{
  const d=JSON.parse(fs.readFileSync(new URL('../public/apps/jlu-campus/data/qianwei-south.json',import.meta.url),'utf8')),world=createWorld(d);
  assert.equal(world.isWalkable(...world.spawn),true);
  for(const building of d.buildings){const point=world.getEntrance(building);if(point)assert.equal(world.isWalkable(...point),true,building.id);}
});

test('canonical map spawn and landmark entrances are shared with the server, after collision checks',()=>{
  const building=feature('test-building',20,20,40,40),d=data([building]);
  d.meta.spawn=[75,75];d.landmarks=[{id:building.id,entrance:[35,42]}];
  const world=createWorld(d);
  assert.deepEqual(world.spawn,d.meta.spawn);assert.deepEqual(world.getEntrance(building),d.landmarks[0].entrance);
  d.meta.spawn=[30,30];d.landmarks[0].entrance=[30,30];
  const invalidWorld=createWorld(d);
  assert.equal(invalidWorld.isWalkable(...invalidWorld.spawn),true);
  assert.notDeepEqual(invalidWorld.spawn,d.meta.spawn);assert.notDeepEqual(invalidWorld.getEntrance(building),d.landmarks[0].entrance);
});
for(const campus of ['south','north']) test(`real ${campus} canonical entrances and spawn match exactly`,()=>{
  const path=new URL(`../public/apps/jlu-campus/data/qianwei-${campus}.json`,import.meta.url);
  const d=JSON.parse(fs.readFileSync(path,'utf8')),world=createWorld(d);
  assert.deepEqual(world.spawn,d.meta.spawn);
  for(const landmark of d.landmarks){
    if(!landmark.entrance) continue;
    const building=d.buildings.find(item=>item.id===landmark.id);
    assert.ok(building,landmark.id);
    assert.equal(world.isWalkable(...landmark.entrance),true,landmark.name);
    assert.deepEqual(world.getEntrance(building),landmark.entrance,landmark.name);
  }
});

test('the actual Rixin-to-central-library walking route exists and all segments clear obstacles',()=>{
  const d=JSON.parse(fs.readFileSync(new URL('../public/apps/jlu-campus/data/qianwei-south.json',import.meta.url),'utf8'));
  const world=createWorld(d),target=d.buildings.find(b=>b.name==='中心图书馆');
  const route=world.findPath(world.spawn,world.getEntrance(target),{cellSize:4,maxNodes:18000});
  assert.ok(route&&route.length>2,'the representative campus route must be reachable');
  for(let i=1;i<route.length;i++)assert.ok(world.lineWalkable(route[i-1],route[i]),`unsafe route segment ${i}`);
});
