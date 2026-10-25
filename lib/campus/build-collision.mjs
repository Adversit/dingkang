// Regenerate from independently obtained OSM layers; never hand-edit the output.
import fs from 'node:fs';
import path from 'node:path';
import {createWorld} from '../../public/apps/jlu-campus/geometry.js';
import {createPlaces} from '../../public/apps/jlu-campus/places.js';
const root = process.cwd();
const input = process.argv[2] || path.join(root, 'public/apps/jlu-campus/data');
const output = {};
for (const campus of ['south', 'north']) {
  const data = JSON.parse(fs.readFileSync(path.join(input, `qianwei-${campus}.json`), 'utf8'));
  const polygons = feature => feature.polygons.map(polygon => ({ ...polygon, bounds: feature.bounds }));
  const buildings=data.landmarks.map(item => ({id:item.id,name:item.name,entrance:item.entrance,kind:'building'}));
  const additional=createPlaces(data,createWorld(data)).filter(item=>item.accessible&&item.entrance).map(item=>({id:item.id,name:item.name,entrance:item.entrance,kind:item.kind}));
  const landmarks=[...new Map([...buildings,...additional].map(item=>[item.id,item])).values()];
  output[campus] = {
    bounds: data.meta.bounds, spawn: data.meta.spawn,
    boundary: data.boundary.flatMap(polygons),
    obstacles: [...data.buildings, ...data.water].flatMap(polygons),
    landmarks,
    attribution: data.meta.attribution, license: data.meta.license, source: data.meta.source,
  };
}
fs.mkdirSync(path.join(root, 'lib/campus'), {recursive:true});
fs.writeFileSync(path.join(root, 'lib/campus/collision-data.json'), JSON.stringify(output));
console.log('Generated collision geometry for both campuses from OSM data.');
