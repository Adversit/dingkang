import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {freshProfile} from '../public/apps/pocket-arcade-ten/rogue/data.mjs';

const cache=new Map();
function load(name){
  if(cache.has(name))return cache.get(name);
  const source=readFileSync(new URL(`../lib/hub/${name}.ts`,import.meta.url),'utf8');
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{}};
  vm.runInNewContext(code,{module,exports:module.exports,require:specifier=>load(specifier.replace('./','')),TextEncoder,Set,Promise});
  cache.set(name,module.exports);return module.exports;
}
const {parseBackup,prepareBackupPreview,validateBackupValues}=load('backup-preview');
const plain=value=>JSON.parse(JSON.stringify(value));
const envelope=(modules)=>({format:'dingkang-hub-state-backup',version:1,modules});

test('current tagged backups identify their own module and keep valid 200-character keys',()=>{
  const key='k'.repeat(200);
  const parsed=parseBackup({moduleId:'wandeng-evening',values:{[key]:'preference'}},'cloudrush-runner');
  assert.equal(parsed.entries[0].moduleId,'wandeng-evening');
  assert.deepEqual(plain(parsed.entries[0].values),{[key]:'preference'});
});

test('malformed, duplicate, unknown and unsupported-version backups fail before a preview',()=>{
  for(const value of [
    envelope([null]),envelope([{moduleId:'unknown-app',values:{}}]),
    envelope([{moduleId:'hub-preferences',values:{}},{moduleId:'hub-preferences',values:{}}]),
    envelope([{moduleId:'hub-preferences',values:{favorites:[]}}]),
    {...envelope([]),version:2},envelope([]),
    envelope([{moduleId:'hub-preferences',values:JSON.parse('{"__proto__":"bad"}')}]),
  ])assert.throws(()=>parseBackup(value));
});

test('legacy expedition conversion previews one game key while preserving other arcade records',async()=>{
  const old=freshProfile();old.crystals=45;
  const parsed=parseBackup(old);
  assert.equal(parsed.entries[0].moduleId,'pocket-arcade-ten');
  assert.ok(parsed.warnings.some(message=>message.includes('灰烬远征')));
  const [preview]=await prepareBackupPreview(parsed.entries,async()=>({values:{'pocket-arcade-v1':'{"scores":[8]}','ash-audio':'{"music":0.3}'},revision:7}));
  assert.equal(preview.expectedRevision,7);
  assert.equal(Object.keys(preview.values).length,1);
  assert.equal(preview.mergedValues['ash-audio'],'{"music":0.3}');
  assert.equal(JSON.parse(preview.mergedValues['pocket-ash-expedition-v1']).crystals,45);
});

test('preview freezes destination revision so changes after review cause CAS rejection',async()=>{
  const current={values:{favorites:'[]',recents:'["wandeng-evening"]'},revision:12};
  const parsed=parseBackup(envelope([{moduleId:'hub-preferences',values:{favorites:'["cloudrush-runner"]'},revision:900}]));
  const [preview]=await prepareBackupPreview(parsed.entries,async()=>current);
  current.values.recents='["yunque-sanguo"]';current.revision=13;
  assert.equal(preview.expectedRevision,12);
  assert.equal(preview.mergedValues.recents,'["wandeng-evening"]');
  const simulatedWrite=payload=>payload.expectedRevision===current.revision?200:409;
  assert.equal(simulatedWrite(preview),409);
  assert.equal(current.values.recents,'["yunque-sanguo"]');
});

test('capacity validation accounts for existing keys before confirmation',async()=>{
  const values=Object.fromEntries(Array.from({length:200},(_,i)=>[`existing${i}`,'ok']));
  const parsed=parseBackup({moduleId:'hub-preferences',values:{extra:'new'}});
  await assert.rejects(()=>prepareBackupPreview(parsed.entries,async()=>({values,revision:1})),/200/);
  assert.throws(()=>validateBackupValues({large:'x'.repeat(512*1024+1)}),/512/);
  const large=Object.fromEntries(Array.from({length:4},(_,i)=>[`large${i}`,'x'.repeat(512*1024)]));
  assert.throws(()=>validateBackupValues(large),/2 MiB/);
});

test('all catalog modules can round-trip in one unified backup',async()=>{
  const {modules}=load('catalog');
  const entries=[...modules.map(item=>({moduleId:item.id,values:{sample:'saved'}})),{moduleId:'hub-preferences',values:{favorites:'[]'}}];
  const parsed=parseBackup(envelope(entries));
  const preview=await prepareBackupPreview(parsed.entries,async()=>({values:{},revision:0}));
  assert.equal(preview.length,16);
  assert.ok(preview.every(item=>item.expectedRevision===0));
  assert.deepEqual(plain(preview.map(({moduleId,values})=>({moduleId,values}))),entries);
});
