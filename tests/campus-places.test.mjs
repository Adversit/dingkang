import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createWorld,pointInRing} from '../public/apps/jlu-campus/geometry.js';
import {createPlaces} from '../public/apps/jlu-campus/places.js';

const read=campus=>JSON.parse(fs.readFileSync(new URL(`../public/apps/jlu-campus/data/qianwei-${campus}.json`,import.meta.url)));
const square=(x,y,w)=>[[x,y],[x+w,y],[x+w,y+w],[x,y+w],[x,y]];
const fixture=()=>({meta:{width:100,height:100,spawn:[5,5]},boundary:[],buildings:[],water:[],surfaces:[],pois:[],roads:[]});

test('named lakes, squares, gates, facilities and sports grounds are derived without mutating the OSM snapshot',()=>{
  const south=read('south'),before=JSON.stringify(south),places=createPlaces(south,createWorld(south));
  assert.equal(places.length,42);assert.equal(new Set(places.map(p=>p.id)).size,42);
  for(const name of ['晏湖','清湖','五月花广场','鼎新南广场','鼎新北广场','吉林大学前卫南区南门','吉林大学前卫南区北门','日晷','吉大文创'])assert.ok(places.some(p=>p.name===name),name);
  assert.equal(places.filter(p=>p.name==='蜜雪冰城').length,2,'same name at different OSM locations must remain distinct');
  assert.equal(places.some(p=>p.id==='way/1473632404'),false,'construction is not an accessible finished destination');
  assert.equal(JSON.stringify(south),before);
  const north=read('north'),northPlaces=createPlaces(north,createWorld(north));assert.equal(northPlaces.length,1);assert.equal(northPlaces[0].kind,'sports');
});

test('all derived available destinations have foot clearance and water destinations are on external shores',()=>{
  for(const campus of ['south','north']){
    const data=read(campus),world=createWorld(data),places=createPlaces(data,world);
    for(const place of places){
      if(!place.accessible){assert.equal(place.entrance,null);continue;}
      assert.ok(world.isWalkable(...place.entrance,.65),place.name);
      if(place.kind==='water')for(const polygon of place.polygons||[])assert.equal(pointInRing(place.entrance,polygon.outer),false,place.name+' must be outside the water outer ring');
    }
    assert.deepEqual(createPlaces(data,world),places,'client/build output must be deterministic');
  }
});

test('locked and permission-only gates remain discoverable but have no travel endpoint',()=>{
  const data=read('south'),places=createPlaces(data,createWorld(data));
  for(const id of ['node/11929117189','node/11939582907']){
    const place=places.find(p=>p.id===id);assert.ok(place);assert.equal(place.kind,'gate');assert.equal(place.accessible,false);assert.equal(place.entrance,null);assert.match(place.accessNote,/禁止|限制|关闭/);
  }
  const d=fixture();d.pois=[{id:'node/unknown',name:'通行未确认的门',x:10,y:10,tags:{barrier:'gate'}}];
  assert.equal(createPlaces(d,createWorld(d))[0].accessible,false);
});

test('lake arrival avoids a walkable island inside a multipolygon hole',()=>{
  const d=fixture();d.water=[{id:'way/lake',name:'测试湖',center:[50,50],tags:{natural:'water'},polygons:[{outer:square(20,20,60),holes:[square(45,45,10)]}]}];
  const world=createWorld(d);assert.equal(world.isWalkable(50,50),true,'island is walkable geometry but not a valid shore target');
  const [lake]=createPlaces(d,world);assert.ok(lake.accessible);assert.equal(pointInRing(lake.entrance,d.water[0].polygons[0].outer),false);
});

test('indoor facility POIs use the building exterior and repeated layer IDs are deduplicated',()=>{
  const d=fixture();d.buildings=[{id:'way/building',name:'教学楼',center:[50,50],polygons:[{outer:square(30,30,40),holes:[square(45,45,10)]}]}];
  d.pois=[{id:'node/shop',name:'楼内文创',x:50,y:50,tags:{shop:'gift'}}];
  const park={id:'way/park',name:'同一公园',center:[10,10],tags:{leisure:'park'},polygons:[{outer:square(6,6,8),holes:[]}]};d.surfaces=[park,park];
  const world=createWorld(d),places=createPlaces(d,world),shop=places.find(p=>p.id==='node/shop');
  assert.equal(places.filter(p=>p.id==='way/park').length,1);assert.ok(shop.accessible);assert.equal(pointInRing(shop.entrance,d.buildings[0].polygons[0].outer),false);
});

test('both real lakes can be reached from spawn with the navigation worker configuration',()=>{
  const data=read('south'),world=createWorld(data),places=createPlaces(data,world);
  for(const name of ['晏湖','清湖']){
    const place=places.find(p=>p.name===name),distance=Math.hypot(place.entrance[0]-world.spawn[0],place.entrance[1]-world.spawn[1]);
    const route=world.findPath(world.spawn,place.entrance,{cellSize:distance>200?4:2,maxNodes:18000});
    assert.ok(route,name+' must have a complete walking route');
    assert.deepEqual(route.at(-1),place.entrance);
    for(let i=1;i<route.length;i++)assert.ok(world.lineWalkable(route[i-1],route[i]),name+' must not cut through a building or water');
  }
});
