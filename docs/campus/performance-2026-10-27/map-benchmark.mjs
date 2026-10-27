// Reproduce map-only CPU drawing measurements; no browser or game rAF is run.
// Requires Node.js and the external @napi-rs/canvas package (not a site dependency).
// Usage:
// node --expose-gc map-benchmark.mjs <campus-source-dir> <output-dir> [canvas-module-or-path] [label] [--snapshots]
// Run against separate before/after source directories and compare JSON outputs.
// Optional snapshots write the 168px minimap and 800x600 full map for pixel comparison.
// Times depend on the machine/software rasterizer and must not be reported as browser FPS.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
if(!process.argv[2]||!process.argv[3])throw Error('Usage: node --expose-gc map-benchmark.mjs <campus-source-dir> <output-dir> [canvas-module-or-path] [label] [--snapshots]');
const {createCanvas}=require(process.argv[4]||'@napi-rs/canvas');
const source=path.resolve(process.argv[2]),outputDir=path.resolve(process.argv[3]);
const label=process.argv[5]||'run';
if(!/^[a-z0-9_-]+$/i.test(label))throw Error('Use a simple alphanumeric output label');
const snapshots=process.argv[6]==='--snapshots';
fs.mkdirSync(outputDir,{recursive:true});
const {createEngine}=await import(pathToFileURL(path.join(source,'engine.js')));
const data=JSON.parse(fs.readFileSync(path.join(source,'data/qianwei-south.json'),'utf8'));
function canvas(w=600,h=500){const c=createCanvas(w,h);c.dataset={};c.getBoundingClientRect=()=>({left:0,top:0,width:w,height:h});c.addEventListener=()=>{};c.removeEventListener=()=>{};return c;}
const window=new EventTarget();window.devicePixelRatio=1;
const document=new EventTarget();document.hidden=false;document.activeElement=null;document.querySelector=()=>null;document.createElement=()=>canvas();
Object.assign(globalThis,{window,document,ResizeObserver:class{observe(){}disconnect(){}},Worker:class{postMessage(){}terminate(){}},OffscreenCanvas:class{constructor(w,h){return createCanvas(w,h);}},requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{}});
function timed(fn){const t=performance.now();fn();return performance.now()-t;}
function summary(samples){const a=samples.toSorted((x,y)=>x-y),at=q=>+a[Math.min(a.length-1,Math.floor(q*a.length))].toFixed(3);return{samples:samples.length,medianMs:at(.5),p95Ms:at(.95),maxMs:at(1)};}
const results=[];
for(const [name,vw,vh,w,h,full] of [['mobile-mini',390,844,100,100,false],['desktop-mini',1363,900,168,168,false],['mini-180',1363,900,180,180,false],['mini-240',1363,900,240,240,false],['full-map',1363,900,800,600,true]]){
  const engine=createEngine(canvas(vw,vh));engine.load(data);
  const map=canvas(w,h),ctx=map.getContext('2d');
  const draw=()=>{ctx.reset();engine.drawMap(map,{full});ctx.getImageData(0,0,1,1);};
  const coldMs=timed(draw),coldStats=engine.getRenderStats();
  if(snapshots&&(name==='desktop-mini'||name==='full-map'))fs.writeFileSync(path.join(outputDir,`${label}-${name}.png`),map.toBuffer('image/png'));
  for(let i=0;i<20;i++)draw();
  const samples=[];for(let i=0;i<60;i++)samples.push(timed(draw));
  const result={name,width:w,height:h,full,coldMs:+coldMs.toFixed(3),hot:summary(samples),coldStats,hotStats:engine.getRenderStats()};
  results.push(result);console.log(JSON.stringify(result));engine.destroy();globalThis.gc?.();
}
const sha=file=>createHash('sha256').update(fs.readFileSync(path.join(source,file))).digest('hex');
const output={label,sourceHashes:{engine:sha('engine.js'),map:sha('data/qianwei-south.json')},method:'Actual drawMap on native @napi-rs/canvas, real south campus data. No rAF rendering. Cold single call; then 20 warmup + 60 measured calls at stationary camera. Context reset and 1px readback per call avoid native state retention. DPR1. This compares CPU software drawing costs, NOT browser FPS or the user device performance.',results};
fs.writeFileSync(path.join(outputDir,`map-${label}-results.json`),JSON.stringify(output,null,2));
