import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {hubThemes,parseThemeId,parseAppearance,appearanceForRoute,buildHubUrl} from '../lib/hub/theme.ts';

const source=ts.createSourceFile('page.tsx',fs.readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const hub=source.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='Hub');
const names=['navigateTo','changeTheme','persist','loadPreferences','rememberCozyRoom','exploreCatalog','toggleModuleTools','closeModuleTools'];
const functions=hub.body.statements.filter(node=>ts.isFunctionDeclaration(node)&&names.includes(node.name?.text)).map(node=>node.getText(source)).join('\n');
const script=ts.transpileModule(functions,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
function harness(){
  const state={theme:null,opened:null,openedCalls:0,error:'',saved:[],fetches:[],directoryOpen:false,catalogRequest:0,moduleToolsOpen:false,moduleToolsFocusCalls:0};
  const context={
    URL,URLSearchParams,appearanceForRoute,parseAppearance,parseList:raw=>JSON.parse(raw||'[]'),
    moduleUrl:(module,theme,search)=>buildHubUrl(module?.id||null,theme,search),
    readyRef:{current:true},navigationLock:{current:false},importLock:{current:false},
    explicitTheme:{current:'cozy'},routeSearch:{current:'?style=cozy&from=bookmark&app=game-a'},
    appearanceRef:{current:{theme:'night-harbor',motion:true}},
    cozyRoom:{current:null},catalogFocusRequested:{current:false},
    setCozyDirectoryOpen:value=>{state.directoryOpen=typeof value==='function'?value(state.directoryOpen):value;},
    setCatalogRequest:value=>{state.catalogRequest=typeof value==='function'?value(state.catalogRequest):value;},
    setModuleToolsOpen:value=>{state.moduleToolsOpen=typeof value==='function'?value(state.moduleToolsOpen):value;},
    moduleToolsButtonRef:{current:{focus:()=>{state.moduleToolsFocusCalls++;}}},
    moduleToolsRef:{current:{querySelector:()=>null}},
    sessionRef:{current:{authenticated:true,userId:'owner'}},preferencesReady:{current:true},
    preferenceSaveError:{current:null},pendingSaves:{current:0},queue:{current:Promise.resolve()},
    favRef:{current:[]},recentRef:{current:[]},stored:{current:{values:{unrelated:'retained'},revision:4}},
    openRef:{current:{id:'game-a'}},frameRef:{current:{contentWindow:{}}},
    acceptedUrl:{current:'/?style=cozy&from=bookmark&app=game-a'},section:'all',
    window:{location:{origin:'https://hub.test'}},
    location:{origin:'https://hub.test',pathname:'/',search:'?style=cozy&from=bookmark&app=game-a'},
    history:{state:{}},flushHubModule:async()=>{},
    assertOwner:owner=>assert.equal(owner,'owner'),notify(){},friendly:error=>error.message,
    setNavigating(){},setFrameLoading(){},setSearch(){},setSection(){},setSidebarOpen(){},setSaving(){},setFavorites(){},setRecents(){},
    setOpen:value=>{state.opened=value;state.openedCalls++;},setAppearance:value=>{state.theme=value;},setError:value=>{state.error=value;},
    result:async response=>response,
    fetch:async(url,options)=>{
      state.fetches.push({url,options});
      if(options?.method==='PUT'){const body=JSON.parse(options.body);state.saved.push(body);return {values:body.values,revision:body.expectedRevision+1};}
      return {values:{appearance:JSON.stringify({theme:'kinetic',motion:false})},revision:8};
    },
  };
  context.history.replaceState=(value,_unused,url)=>{context.history.state=value;const parsed=new URL(url,'https://hub.test');context.location.pathname=parsed.pathname;context.location.search=parsed.search;};
  context.history.pushState=context.history.replaceState;
  Object.defineProperty(context,'moduleToolsOpen',{get:()=>state.moduleToolsOpen});
  vm.createContext(context);vm.runInContext(script,context);
  return {context,state};
}

test('four exact URL styles and legacy saved quiet compatibility',()=>{
  assert.deepEqual(hubThemes.map(theme=>theme.id),['classic','night-harbor','kinetic','cozy']);
  for(const id of hubThemes.map(theme=>theme.id))assert.equal(parseThemeId(id),id);
  for(const id of ['quiet','CLASSIC','cozy ','unknown',null])assert.equal(parseThemeId(id),null);
  assert.equal(parseAppearance('{"theme":"quiet"}').theme,'classic');
});

test('unknown preferences fall back safely and an explicit false motion preference survives',()=>{
  assert.deepEqual(parseAppearance('malformed'),{theme:'night-harbor',motion:true});
  assert.deepEqual(parseAppearance('{"theme":"unknown","motion":false}'),{theme:'night-harbor',motion:false});
});

test('URL appearance takes precedence without mutating the saved preference',()=>{
  const saved={theme:'kinetic',motion:false};
  assert.deepEqual(appearanceForRoute(saved,'cozy'),{theme:'cozy',motion:false});
  assert.deepEqual(saved,{theme:'kinetic',motion:false});
  assert.deepEqual(appearanceForRoute(saved,null),saved);
});

test('route construction preserves unrelated query parameters and only changes app/style',()=>{
  const url=buildHubUrl('starfall-creature-isles','cozy','?from=bookmark&app=old&style=classic');
  const params=new URL(url,'https://hub.test').searchParams;
  assert.equal(params.get('from'),'bookmark');assert.equal(params.get('app'),'starfall-creature-isles');assert.equal(params.get('style'),'cozy');
  const home=new URL(buildHubUrl(null,'cozy',params.toString()),'https://hub.test');
  assert.equal(home.searchParams.has('app'),false);assert.equal(home.searchParams.get('style'),'cozy');
});

test('a late preference load preserves a URL style while retaining cloud motion and revision',async()=>{
  const {context:c,state}=harness();await c.loadPreferences();
  assert.equal(state.theme.theme,'cozy');assert.equal(state.theme.motion,false);
  assert.equal(c.appearanceRef.current.theme,'kinetic');assert.equal(c.stored.current.revision,8);
  assert.equal(state.saved.length,0);
});

test('switching style inside an application preserves its frame and URL app',async()=>{
  const {context:c,state}=harness();c.changeTheme('classic');await c.queue.current;
  assert.equal(state.openedCalls,0);assert.equal(c.openRef.current.id,'game-a');
  const params=new URLSearchParams(c.location.search);assert.equal(params.get('app'),'game-a');assert.equal(params.get('style'),'classic');assert.equal(params.get('from'),'bookmark');
  assert.equal(JSON.parse(state.saved[0].values.appearance).theme,'classic');assert.equal(state.saved[0].values.unrelated,'retained');
});

test('navigation materializes the current style and preserves the save owner/version protocol',async()=>{
  const {context:c,state}=harness();await c.navigateTo({id:'game-b'});await c.queue.current;
  assert.equal(c.openRef.current.id,'game-b');assert.equal(new URLSearchParams(c.location.search).get('style'),'cozy');
  assert.equal(state.saved[0].expectedRevision,4);assert.equal(state.fetches[0].options.headers['X-Hub-User-Id'],'owner');
  assert.equal(JSON.parse(state.saved[0].values.appearance).theme,'night-harbor','visiting a style link must not silently overwrite the saved theme');
});

test('failed history flush preserves both the existing frame and the accepted style URL',async()=>{
  const {context:c,state}=harness();c.flushHubModule=async()=>{throw Error('unsaved game');};
  c.location.search='?style=kinetic&app=game-b';
  assert.equal(await c.navigateTo({id:'game-b'},'all','pop','kinetic',c.location.search),false);
  assert.equal(state.openedCalls,0);assert.equal(c.openRef.current.id,'game-a');assert.equal(c.explicitTheme.current,'cozy');
  assert.equal(c.location.pathname+c.location.search,c.acceptedUrl.current);
});

test('overlapping history events keep frame, style and URL aligned after a delayed flush',async()=>{
  const {context:c,state}=harness();let release;c.flushHubModule=()=>new Promise(resolve=>{release=resolve;});
  const first=c.navigateTo({id:'game-b'},'all','pop','kinetic','?style=kinetic&app=game-b&from=history');
  await c.navigateTo({id:'game-c'},'all','pop','classic','?style=classic&app=game-c');
  assert.equal(state.openedCalls,0);release();await first;await c.queue.current;
  assert.equal(c.openRef.current.id,'game-b');assert.equal(state.theme.theme,'kinetic');
  const params=new URLSearchParams(c.location.search);assert.equal(params.get('app'),'game-b');assert.equal(params.get('style'),'kinetic');assert.equal(params.get('from'),'history');
});

test('style changes and favorites share CAS without dropping unrelated preference fields',async()=>{
  const {context:c,state}=harness();c.changeTheme('classic');c.persist({favorites:['game-a']});c.changeTheme('kinetic');await c.queue.current;
  assert.equal(state.saved.length,3);assert.deepEqual(state.saved.map(item=>item.expectedRevision),[4,5,6]);
  const final=state.saved.at(-1).values;assert.equal(final.unrelated,'retained');assert.deepEqual(JSON.parse(final.favorites),['game-a']);assert.equal(JSON.parse(final.appearance).theme,'kinetic');
});

test('a preference conflict leaves the route style visible and does not invent a new revision',async()=>{
  const {context:c,state}=harness();c.fetch=async()=>{throw Error('conflict');};c.changeTheme('kinetic');await c.queue.current;
  assert.equal(c.stored.current.revision,4);assert.equal(state.theme.theme,'kinetic');assert.equal(c.preferenceSaveError.current,'conflict');
  assert.equal(new URLSearchParams(c.location.search).get('style'),'kinetic');
});


test('cozy integration: selecting a room changes only temporary view memory',()=>{
  const {context:c,state}=harness();
  for(const room of ['research','product','life','games',null]){c.rememberCozyRoom(room);assert.equal(c.cozyRoom.current,room);}
  assert.equal(state.fetches.length,0);assert.equal(state.saved.length,0);assert.equal(state.openedCalls,0);assert.equal(c.stored.current.revision,4);
});

test('cozy integration: returning from an application waits for its save and retains the room',async()=>{
  const {context:c,state}=harness();c.rememberCozyRoom('games');let release;
  c.flushHubModule=()=>new Promise(resolve=>{release=resolve;});
  const leaving=c.navigateTo(null,'all');assert.equal(state.openedCalls,0);assert.equal(c.cozyRoom.current,'games');
  release();assert.equal(await leaving,true);assert.equal(c.openRef.current,null);assert.equal(c.cozyRoom.current,'games');
  assert.equal(state.theme.theme,'cozy');assert.equal(new URLSearchParams(c.location.search).get('style'),'cozy');
});

test('cozy integration: a failed application save preserves its iframe and room',async()=>{
  const {context:c,state}=harness();c.rememberCozyRoom('research');c.flushHubModule=async()=>{throw Error('save failed');};
  assert.equal(await c.navigateTo(null,'all'),false);assert.equal(state.openedCalls,0);assert.equal(c.openRef.current.id,'game-a');assert.equal(c.cozyRoom.current,'research');
});

test('cozy integration: list search and style changes preserve the chosen room and list intent',async()=>{
  const {context:c,state}=harness();c.rememberCozyRoom('product');c.exploreCatalog();
  assert.equal(state.directoryOpen,true);assert.equal(state.catalogRequest,1);assert.equal(c.catalogFocusRequested.current,true);assert.equal(state.openedCalls,0);
  c.changeTheme('classic');await c.queue.current;assert.equal(c.cozyRoom.current,'product');assert.equal(state.directoryOpen,true);
  c.changeTheme('cozy');await c.queue.current;assert.equal(c.cozyRoom.current,'product');assert.equal(state.directoryOpen,true);
  for(const item of state.saved){assert.equal('room' in item.values,false);assert.equal('cozyRoom' in item.values,false);assert.equal('cozyDirectoryOpen' in item.values,false);}
});

test('immersive controls toggle without changing the active module, URL or storage bridge',()=>{
  const {context:c,state}=harness(),module=c.openRef.current,frame=c.frameRef.current,url=c.location.search;
  c.toggleModuleTools();assert.equal(state.moduleToolsOpen,true);
  c.toggleModuleTools();assert.equal(state.moduleToolsOpen,false);
  assert.equal(c.openRef.current,module);assert.equal(c.frameRef.current,frame);assert.equal(c.location.search,url);
  assert.equal(state.openedCalls,0);assert.equal(state.fetches.length,0);
});

test('closing immersive controls restores the launcher focus without leaving the app',()=>{
  const {context:c,state}=harness();state.moduleToolsOpen=true;
  c.closeModuleTools();
  assert.equal(state.moduleToolsOpen,false);assert.equal(state.moduleToolsFocusCalls,1);
  assert.equal(c.openRef.current.id,'game-a');assert.equal(state.openedCalls,0);
});

test('an open save-export dialog cannot be hidden by closing its controls ancestor',()=>{
  const {context:c,state}=harness();state.moduleToolsOpen=true;let dialogFocus=0;
  c.moduleToolsRef.current.querySelector=selector=>{assert.equal(selector,'dialog[open]');return{focus:()=>{dialogFocus++;}};};
  c.closeModuleTools();
  assert.equal(state.moduleToolsOpen,true);assert.equal(dialogFocus,1);assert.equal(state.moduleToolsFocusCalls,0);
  assert.equal(c.openRef.current.id,'game-a');assert.equal(state.openedCalls,0);
});

test('immersive return keeps controls and module until the actual flush resolves, then closes controls',async()=>{
  const {context:c,state}=harness();state.moduleToolsOpen=true;let release;const url=c.location.search;
  c.flushHubModule=()=>new Promise(resolve=>{release=resolve;});
  const pending=c.navigateTo(null,'all');
  assert.equal(c.openRef.current.id,'game-a');assert.equal(state.moduleToolsOpen,true);assert.equal(state.openedCalls,0);assert.equal(c.location.search,url);
  release();assert.equal(await pending,true);
  assert.equal(c.openRef.current,null);assert.equal(state.moduleToolsOpen,false);assert.equal(state.openedCalls,1);
});

test('a blocked immersive return reveals recovery controls while preserving the module and URL',async()=>{
  const {context:c,state}=harness(),url=c.location.search;
  c.flushHubModule=async()=>{throw Error('请先处理存档冲突');};
  assert.equal(await c.navigateTo(null,'all'),false);
  assert.equal(state.moduleToolsOpen,true);assert.equal(state.error,'请先处理存档冲突');
  assert.equal(c.openRef.current.id,'game-a');assert.equal(state.openedCalls,0);assert.equal(c.location.search,url);
  assert.equal(c.navigationLock.current,false);
});
