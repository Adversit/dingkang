import {featureBounds,pointInFeature,pointInRing} from './geometry.js';

/** Derive public map destinations from the original OSM snapshot without
 * changing it. Both the browser and build-collision.mjs use this function. */
const RESTRICTED=new Set(['no','private','permit','customers','delivery','agricultural','forestry','emergency']);
const ALLOWED=new Set(['yes','permissive','designated']);
const finitePoint=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
const isConstruction=tags=>['landuse','building','highway','railway','leisure'].some(key=>['construction','proposed'].includes(tags?.[key]))||['construction','proposed'].some(key=>tags?.[key]&&tags[key]!=='no');

function kindOf(feature,layer){
  const t=feature.tags||{};
  if(layer==='water'||t.natural==='water'||t.water||t.amenity==='fountain')return 'water';
  if(['gate','lift_gate','swing_gate','kissing_gate'].includes(t.barrier)||t.entrance==='gate')return 'gate';
  if(t.place==='square')return 'square';
  if(['park','garden','nature_reserve'].includes(t.leisure))return 'park';
  if(t.sport||['pitch','sports_centre','track','stadium'].includes(t.leisure)||t.landuse==='recreation_ground')return 'sports';
  return 'poi';
}
function accessFor(tags,kind){
  // A general permit/private condition is retained even when the mode is foot=yes:
  // it does not establish that a visitor has the required permission.
  if(tags.locked==='yes'||tags.entrance==='no'||tags.foot==='no'||tags.access==='no')return {allowed:false,note:'公开数据标注关闭或禁止步行，不能作为通行或传送目的地。'};
  if(RESTRICTED.has(tags.access)||RESTRICTED.has(tags.foot))return {allowed:false,note:'公开数据标注需许可或限制通行，不能作为通行或传送目的地。'};
  if(kind==='gate'&&!ALLOWED.has(tags.foot)&&!ALLOWED.has(tags.access))return {allowed:false,note:'公开数据未确认此门可供步行通行，仅提供位置标记。'};
  return {allowed:true,note:kind==='gate'?'到达校内侧安全位置；开放状态以现场管理为准。':''};
}
function centerOf(feature){
  if(finitePoint(feature.center))return [...feature.center];
  if(Number.isFinite(feature.x)&&Number.isFinite(feature.y))return [feature.x,feature.y];
  const b=featureBounds(feature);return b.every(Number.isFinite)?[(b[0]+b[2])/2,(b[1]+b[3])/2]:null;
}

export function createPlaces(data,world){
  if(!world||typeof world.nearestWalkable!=='function'||typeof world.isWalkable!=='function')throw new TypeError('createPlaces requires the campus geometry world');
  const result=[],seen=new Set((data.buildings||[]).map(b=>b.id));
  const construction=(data.surfaces||[]).filter(f=>isConstruction(f.tags));
  const waters=[...(data.water||[]),...(data.surfaces||[]).filter(f=>f.tags?.amenity==='fountain')];
  const safe=p=>finitePoint(p)&&world.isWalkable(p[0],p[1],.65)&&!construction.some(f=>pointInFeature(p,f));
  const normalize=p=>{if(!safe(p))return null;const rounded=p.map(v=>Math.round(v*1000)/1000);return safe(rounded)?rounded:[...p];};
  const outsideWater=p=>!waters.some(f=>(f.polygons||[]).some(polygon=>pointInRing(p,polygon.outer)));
  function shore(feature,center){
    const candidates=[];
    for(const polygon of feature.polygons||[]){
      const ring=polygon.outer||[];
      for(let i=0;i<ring.length-1;i++){
        const a=ring[i],b=ring[i+1];
        // Sample actual outer shoreline; do not choose an interior hole/island.
        for(const t of [0,.5]){
          const edge=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
          for(const radius of [1,2,4,8]){
            let found=false;
            for(let n=0;n<16;n++){
              const angle=n*Math.PI/8,p=world.nearestWalkable(edge[0]+Math.cos(angle)*radius,edge[1]+Math.sin(angle)*radius,2);
              if(safe(p)&&outsideWater(p)){
                const dest=normalize(p);if(dest&&outsideWater(dest)){candidates.push(dest);found=true;break;}
              }
            }
            if(found)break;
          }
        }
      }
    }
    candidates.sort((a,b)=>Math.hypot(a[0]-center[0],a[1]-center[1])-Math.hypot(b[0]-center[0],b[1]-center[1])||a[0]-b[0]||a[1]-b[1]);
    return candidates[0]||null;
  }
  function destination(feature,kind,center){
    if(kind==='water'&&feature.polygons?.length)return shore(feature,center);
    // A shop or facility POI can sit inside a building; use its known exterior
    // entrance instead of resolving to an enclosed internal courtyard.
    const containing=(data.buildings||[]).find(b=>(b.polygons||[]).some(p=>pointInRing(center,p.outer)));
    if(containing)return normalize(world.getEntrance(containing));
    const point=normalize(world.nearestWalkable(...center,kind==='gate'?20:100));
    return point&&outsideWater(point)?point:null;
  }
  for(const layer of ['water','surfaces','pois'])for(const feature of data[layer]||[]){
    const name=String(feature.name||feature.tags?.name||'').trim(),tags={...(feature.tags||{})};
    if(!name||!feature.id||seen.has(feature.id)||isConstruction(tags))continue;
    const center=centerOf(feature);if(!center)continue;
    seen.add(feature.id);const kind=kindOf(feature,layer),access=accessFor(tags,kind);
    const entrance=access.allowed?destination(feature,kind,center):null,accessible=!!entrance;
    const accessNote=!access.allowed?access.note:!entrance?'公开数据暂未找到安全到达点，仅提供位置标记。':access.note||(kind==='water'?'到达湖岸或水景外缘，目的地不在水面内。':'到达公开数据推算的安全位置，设施开放情况以现场为准。');
    const bounds=featureBounds(feature);
    result.push({id:feature.id,name,tags,kind,sourceLayer:layer,center,bounds:bounds.every(Number.isFinite)?[...bounds]:[...center,...center],...(feature.polygons?{polygons:feature.polygons}:{}),entrance,accessible,accessNote});
  }
  return result.sort((a,b)=>a.id.localeCompare(b.id,'en'));
}
