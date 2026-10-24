import test from 'node:test';
import assert from 'node:assert/strict';
import '../../../public/apps/ai-dev-collaboration-workbench/core.js';
const C=globalThis.ADCCore;
test('groups events while preserving distinct sources and total reports',()=>{const result=C.deduplicate(C.fixture);assert.equal(result.length,2);assert.equal(result[0].sourceCount,2);assert.equal(result[0].reportCount,3);assert.notEqual(result.length,C.fixture.length);assert.deepEqual(C.deduplicate([]),[]);assert.throws(()=>C.deduplicate([{eventId:'a'}]));});
test('evidence compares expected and actual',()=>{assert.equal(C.evidence().length,3);assert.ok(C.evidence().every(t=>t.pass&&t.actual===t.expected));});
test('grid placement resolves overlap and retains identity',()=>{const a={id:'a',x:0,y:0,w:250,h:150},b={id:'b',x:0,y:0,w:250,h:150};const p=C.place(b,17,13,[a]);assert.equal(p.x%20,0);assert.equal(p.y%20,0);assert.ok(p.y>=170);assert.equal(p.id,'b');});
test('focus includes incoming and outgoing neighbors only',()=>{assert.deepEqual([...C.neighbors('b',[{from:'a',to:'b'},{from:'b',to:'c'},{from:'c',to:'d'}])].sort(),['a','b','c']);});
test('module validation rejects partial or malformed cards',()=>{assert.throws(()=>C.validateCard({name:'X'}));assert.throws(()=>C.validateCard({name:'X',what:'Y',why:'Z',intent:' '}));assert.throws(()=>C.validateCard({name:'X',what:'Y',why:'Z',intent:'I',risks:4}));assert.equal(C.validateCard({name:' X ',what:'Y',why:'Z',intent:'I'}).name,'X');});
test('import rejects bad schema and non-finite coordinates',()=>{assert.equal(C.validateStore({schema:1,projects:[]}),false);assert.equal(C.validateStore({schema:2,projects:[{id:'p',nodes:[{id:'n',x:NaN,y:0}],edges:[]}]}),false);assert.equal(C.validateStore({schema:2,projects:[]}),true);});
test('import rejects unsafe identifiers and markup-bearing status fields',()=>{
  const project={id:'p',nodes:[{id:'n',x:0,y:0,type:'module',status:'draft'}],edges:[]};
  assert.equal(C.validateStore({schema:3,projects:[project]}),true);
  assert.equal(C.validateStore({schema:3,projects:[{...project,id:'p" onclick="alert(1)'}]}),false);
  assert.equal(C.validateStore({schema:3,projects:[{...project,nodes:[{...project.nodes[0],status:'draft" onmouseover="alert(1)'}]}]}),false);
  assert.equal(C.validateStore({schema:3,projects:[{...project,nodes:[{...project.nodes[0],acceptance:[{id:'a" onmouseover="alert(1)',status:'passed'}]}]}]}),false);
  assert.equal(C.validateStore({schema:3,projects:[{...project,nodes:[{...project.nodes[0],acceptance:[{id:'a',kind:'<img src=x onerror=alert(1)>'}]}]}]}),false);
});
test('hierarchy accepts one container level and rejects nested containers',()=>{
  const p={schema:3,nodes:[{id:'root',type:'module',moduleLevel:'container',x:0,y:0},{id:'child',type:'module',moduleLevel:'leaf',parentId:'root',x:20,y:20,acceptance:[]}],edges:[]};
  assert.deepEqual(C.validateHierarchy(p),{valid:true});
  p.nodes.push({id:'nested',type:'module',moduleLevel:'container',parentId:'root',x:40,y:40,acceptance:[]});
  assert.equal(C.validateHierarchy(p).valid,false);
});
test('collapsed edges project to containers and preserve edge identity',()=>{
  const p={nodes:[{id:'a',moduleLevel:'container',type:'module'},{id:'a1',moduleLevel:'leaf',parentId:'a'},{id:'b',moduleLevel:'container',type:'module'},{id:'b1',moduleLevel:'leaf',parentId:'b'}],edges:[{id:'e1',from:'a1',to:'b1',type:'data'},{id:'e2',from:'a1',to:'b1',type:'data'}]};
  const collapsed=C.projectEdges(p,'data',{});assert.equal(collapsed.length,1);assert.deepEqual(collapsed[0].edgeIds,['e1','e2']);
  const expanded=C.projectEdges(p,'data',{a:true,b:true});assert.equal(expanded[0].from,'a1');assert.equal(expanded[0].to,'b1');
});
test('acceptance requires evidence before passed',()=>{assert.equal(C.validateAcceptance({id:'a',title:'Check',expected:'Works',status:'passed'}),false);assert.equal(C.validateAcceptance({id:'a',title:'Check',expected:'Works',actual:'It works',evidence:'run-1',status:'passed'}),true);});
test('development pack contains the requested agent-facing files',()=>{const files=C.buildDevelopmentPack({name:['示例','Example'],goal:['目标','Goal'],version:2,nodes:[],edges:[]},'zh');assert.ok(files['AGENTS.md']);assert.ok(files['CLAUDE.md']);assert.ok(files['docs/acceptance-criteria.md']);assert.ok(files['project.json'].includes('"schema": 3'));});
