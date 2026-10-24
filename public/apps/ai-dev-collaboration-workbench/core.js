(function(root){
  const snap = n => Math.round(n / 20) * 20;
  const overlaps = (a,b) => a.x < b.x + b.w + 20 && a.x + a.w + 20 > b.x && a.y < b.y + b.h + 20 && a.y + a.h + 20 > b.y;
  function place(node,x,y,others){
    const p={...node,x:snap(Math.max(0,x)),y:snap(Math.max(0,y))};
    for(let i=0;i<200&&others.some(n=>n.id!==p.id&&overlaps(p,n));i++) p.y+=20;
    return p;
  }
  function neighbors(id,edges){return new Set([id,...edges.filter(e=>e.from===id||e.to===id).flatMap(e=>[e.from,e.to])]);}

  function deduplicate(records){
    const by=new Map();
    for(const r of records){
      if(!r.eventId||!r.source) throw Error('eventId and source are required');
      if(!by.has(r.eventId)) by.set(r.eventId,{eventId:r.eventId,sources:new Set(),reportCount:0});
      const e=by.get(r.eventId); e.sources.add(r.source); e.reportCount++;
    }
    return [...by.values()].map(e=>({...e,sources:[...e.sources],sourceCount:e.sources.size}));
  }
  const fixture=[
    {eventId:'model-release-a',source:'release-note'},
    {eventId:'model-release-a',source:'engineering-blog'},
    {eventId:'model-release-a',source:'release-note'},
    {eventId:'benchmark-b',source:'paper'}
  ];
  function evidence(){
    const actual=deduplicate(fixture);
    return [
      {id:'unique',expected:2,actual:actual.length,pass:actual.length===2},
      {id:'breadth',expected:2,actual:actual[0].sourceCount,pass:actual[0].sourceCount===2},
      {id:'reports',expected:3,actual:actual[0].reportCount,pass:actual[0].reportCount===3}
    ];
  }
  function validateCard(v){
    if(!v||typeof v!=='object') throw Error('Expected a module card object');
    for(const k of ['name','what','why','intent']) if(typeof v[k]!=='string'||!v[k].trim()||v[k].length>10000) throw Error(`Invalid ${k}`);
    return Object.fromEntries(['name','what','why','intent','input_output','constraints','eval','risks'].filter(k=>k in v).map(k=>{
      if(typeof v[k]!=='string') throw Error(`Invalid ${k}`); return [k,v[k].trim()];
    }));
  }

  const acceptanceStates=['unverified','passed','failed','manual'];
  function normalizeAcceptance(item={}){
    return {id:item.id||'',title:item.title||'',kind:item.kind||'normal',input:item.input||'',expected:item.expected||'',method:item.method||'',actual:item.actual||'',evidence:item.evidence||'',version:item.version||'',status:acceptanceStates.includes(item.status)?item.status:'unverified',manual:item.manual===true};
  }
  function validateAcceptance(item){
    const v=normalizeAcceptance(item);
    if(!v.id||!v.title.trim()||!v.expected.trim()) return false;
    if(!acceptanceStates.includes(v.status)) return false;
    if(v.status==='passed' && (!v.actual.trim()||!v.evidence.trim())) return false;
    return true;
  }
  function normalizeHierarchy(p){
    if(!p||!Array.isArray(p.nodes)) return p;
    p.schema=p.schema||3;
    p.moduleView={expanded:{},mode:'overview',...(p.moduleView||{})};
    p.nodes.forEach(n=>{
      n.acceptance=Array.isArray(n.acceptance)?n.acceptance.map(normalizeAcceptance):[];
      n.moduleLevel=n.moduleLevel||'leaf';
      if(n.parentId==='') delete n.parentId;
      if(n.parentId) n.moduleLevel='leaf';
      if(n.moduleLevel==='container'&&n.type!=='module') n.moduleLevel='leaf';
    });
    return p;
  }
  function hierarchyAncestors(p,id){
    const by=new Map((p?.nodes||[]).map(n=>[n.id,n])); const result=[]; const seen=new Set(); let n=by.get(id);
    while(n?.parentId && !seen.has(n.parentId)){seen.add(n.parentId);const parent=by.get(n.parentId);if(!parent)break;result.push(parent.id);n=parent;}
    return result;
  }
  function validateHierarchy(p){
    const nodes=p?.nodes||[], ids=new Set();
    for(const n of nodes){
      if(!n.id||ids.has(n.id)) return {valid:false,reason:'duplicate or empty node id'}; ids.add(n.id);
    }
    const by=new Map(nodes.map(n=>[n.id,n]));
    for(const n of nodes){
      if(n.parentId){
        const parent=by.get(n.parentId);
        if(!parent||parent.id===n.id) return {valid:false,reason:'missing or self parent'};
        if(parent.moduleLevel!=='container'||parent.type!=='module') return {valid:false,reason:'parent must be a module container'};
        if(n.moduleLevel==='container') return {valid:false,reason:'nested containers are not supported in v1.1'};
        if(parent.parentId) return {valid:false,reason:'nested containers are not supported in v1.1'};
        if(hierarchyAncestors(p,n.id).includes(n.id)) return {valid:false,reason:'module cycle'};
      }
    }
    for(const n of nodes) for(const item of (n.acceptance||[])) if(!validateAcceptance(item)) return {valid:false,reason:'invalid acceptance item'};
    return {valid:true};
  }
  function visibleNodeIds(p,expanded={}){
    const ids=new Set();
    for(const n of p?.nodes||[]) if(!n.parentId || expanded[n.parentId]) ids.add(n.id);
    return ids;
  }
  function projectEndpoint(p,id,expanded){
    const by=new Map((p?.nodes||[]).map(n=>[n.id,n])); let n=by.get(id); const seen=new Set();
    while(n?.parentId&&!expanded[n.parentId]&&!seen.has(n.parentId)){seen.add(n.parentId);n=by.get(n.parentId);}
    return n?.id||id;
  }
  function projectEdges(p,filter='all',expanded={}){
    const groups=new Map(), visible=visibleNodeIds(p,expanded);
    for(const e of p?.edges||[]){
      if(filter!=='all'&&e.type!==filter) continue;
      const from=projectEndpoint(p,e.from,expanded),to=projectEndpoint(p,e.to,expanded);
      if(from===to||!visible.has(from)||!visible.has(to)) continue;
      const key=`${from}::${to}::${e.type}`;
      if(!groups.has(key)) groups.set(key,{id:`projection-${groups.size}`,from,to,type:e.type,edgeIds:[]});
      groups.get(key).edgeIds.push(e.id);
    }
    return [...groups.values()];
  }
  function buildDevelopmentPack(p,lang='zh'){
    const pick=v=>Array.isArray(v)?(lang==='zh'?v[0]:v[1]):(v||'');
    const nodes=p?.nodes||[], by=new Map(nodes.map(n=>[n.id,n]));
    const tree=nodes.filter(n=>n.moduleLevel==='container').map(parent=>{
      const children=nodes.filter(n=>n.parentId===parent.id);
      return `- ${pick(parent.title)} — ${pick(parent.summary)}\n${children.map(n=>`  - ${pick(n.title)} — ${pick(n.summary)}`).join('\n')}`;
    }).join('\n');
    const acceptance=nodes.flatMap(n=>(n.acceptance||[]).map(a=>`- [${a.status}] ${pick(n.title)} / ${pick(a.title)}\n  - ${lang==='zh'?'预期':'Expected'}: ${pick(a.expected)}\n  - ${lang==='zh'?'实际':'Actual'}: ${pick(a.actual)||'TODO'}\n  - ${lang==='zh'?'证据':'Evidence'}: ${pick(a.evidence)||'TODO'}`)).join('\n');
    const rel=(p.edges||[]).map(e=>{const a=by.get(e.from),b=by.get(e.to);return `- ${a?pick(a.title):e.from} -[${e.type}]-> ${b?pick(b.title):e.to}`;}).join('\n');
    const name=pick(p?.name)||'Untitled project', goal=pick(p?.goal)||'TODO';
    const files={
      'README.md':`# ${name}\n\n${goal}\n\n${lang==='zh'?'此开发包由 AI Development Collaboration 站点根据已记录内容生成。未填写内容保留为 TODO，不代表已确认。':'Generated from the AI Development Collaboration site. TODO fields are not confirmed.'}\n\n- version: ${p?.version||1}\n- exported_at: ${new Date().toISOString()}\n`,
      'docs/prd.md':`# PRD\n\n## Problem\n${goal}\n\n## Scope\nTODO\n\n## Non-goals\nTODO\n`,
      'docs/architecture.md':`# Architecture\n\n## Module tree\n${tree||'TODO'}\n\n## Relationships\n${rel||'TODO'}\n`,
      'docs/spec.md':`# Specification\n\n## Required behavior\nTODO\n\n## Constraints\n${nodes.map(n=>pick(n.constraints)).filter(Boolean).join('\n')||'TODO'}\n`,
      'docs/plan.md':'# Plan\n\nTODO\n',
      'docs/test-spec.md':`# Test specification\n\n${acceptance||'TODO'}\n`,
      'docs/acceptance-criteria.md':`# Acceptance criteria\n\n${acceptance||'TODO'}\n\nManual acceptance remains separate from automated verification.\n`,
      'AGENTS.md':'# Agent development rules\n\n- Read the documents in docs/ before editing.\n- Preserve the stated scope and constraints.\n- Run the checks in docs/test-spec.md.\n- Do not treat TODO or unverified content as confirmed.\n',
      'CLAUDE.md':'# Claude Code context\n\nRead and follow AGENTS.md. It is the shared project contract.\n',
      'project.json':JSON.stringify({schema:3,project:p},null,2)
    };
    return files;
  }
  function validateStore(v){
    const safeId=id=>typeof id==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(id);
    const nodeTypes=new Set(['problem','architecture','module','decision','plan','verification','risk','artifact']);
    const statuses=new Set(['draft','review','verified','accepted']);
    const edgeTypes=new Set(['control','data','dependency','state']);
    const acceptanceStatuses=new Set(['unverified','passed','failed','manual']);
    const acceptanceKinds=new Set(['normal','boundary','exception','regression']);
    if(!v||(v.schema!==2&&v.schema!==3)||!Array.isArray(v.projects)||v.projects.length>200)return false;
    const projectIds=new Set();
    return v.projects.every(p=>{
      if(!p||!safeId(p.id)||projectIds.has(p.id)||!Array.isArray(p.nodes)||!Array.isArray(p.edges)||p.nodes.length>5000||p.edges.length>20000)return false;
      if(p.camera!==undefined&&(!p.camera||!Number.isFinite(p.camera.x)||!Number.isFinite(p.camera.y)||!Number.isFinite(p.camera.z)||p.camera.z<=0))return false;
      projectIds.add(p.id);const nodeIds=new Set();
      return p.nodes.every(n=>{
        if(!n||!safeId(n.id)||nodeIds.has(n.id)||!Number.isFinite(n.x)||!Number.isFinite(n.y))return false;
        if(n.type!==undefined&&!nodeTypes.has(n.type)||n.status!==undefined&&!statuses.has(n.status))return false;
        if(n.parentId!==undefined&&!safeId(n.parentId)||n.moduleLevel!==undefined&&!['container','leaf'].includes(n.moduleLevel))return false;
        if(n.w!==undefined&&(!Number.isFinite(n.w)||n.w<=0)||n.h!==undefined&&(!Number.isFinite(n.h)||n.h<=0))return false;
        if(n.acceptance!==undefined&&(!Array.isArray(n.acceptance)||n.acceptance.some(a=>!a||!safeId(a.id)||a.status!==undefined&&!acceptanceStatuses.has(a.status)||a.kind!==undefined&&!acceptanceKinds.has(a.kind))))return false;
        nodeIds.add(n.id);return true;
      })&&p.nodes.every(n=>n.parentId===undefined||nodeIds.has(n.parentId))
        &&p.edges.every(e=>e&&nodeIds.has(e.from)&&nodeIds.has(e.to)&&(e.id===undefined||safeId(e.id))&&(e.type===undefined||edgeTypes.has(e.type)));
    });
  }
  root.ADCCore={snap,place,neighbors,deduplicate,fixture,evidence,validateCard,acceptanceStates,normalizeAcceptance,validateAcceptance,normalizeHierarchy,validateHierarchy,visibleNodeIds,projectEndpoint,projectEdges,buildDevelopmentPack,validateStore};
})(globalThis);
