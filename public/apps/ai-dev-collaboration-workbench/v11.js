'use strict';
(function(){
  const H=ADCCore;
  const pick=v=>Array.isArray(v)?(language==='zh'?v[0]:v[1]):(v||'');
  const byId=(p,id)=>p?.nodes?.find(n=>n.id===id);
  const children=(p,id)=>p.nodes.filter(n=>n.parentId===id);
  const hasEdge=(p,from,to,type)=>p.edges.some(e=>e.from===from&&e.to===to&&e.type===type);
  const addEdge=(p,from,to,type)=>{if(!hasEdge(p,from,to,type))p.edges.push({id:uid(),from,to,type});};
  const acceptance=(id,title,expected,actual,evidence,status='unverified',extra={})=>({id,title,kind:extra.kind||'normal',input:extra.input||'',expected,method:extra.method||'',actual,evidence,version:extra.version||'fixture-v1',status,manual:extra.manual===true});

  function prepareProject(p){
    if(!p)return p;
    H.normalizeHierarchy(p);
    p.schema=3;
    p.moduleView={expanded:{},mode:'overview',activeContainer:null,...(p.moduleView||{})};
    p.nodes.forEach(n=>{n.acceptance=Array.isArray(n.acceptance)?n.acceptance.map(H.normalizeAcceptance):[];n.moduleLevel=n.moduleLevel||'leaf';});
    if(p.example)migrateExample(p);
    if(p.example&&!p.canvasRepairVersion){p.edges=p.edges.filter(e=>!(e.from==='processing'&&e.to==='delivery'&&e.type==='data'&&p.edges.some(v=>v.from==='grouper'&&v.to==='output'&&v.type==='data')));p.canvasRepairVersion=1;}
    return p;
  }

  function migrateExample(p){
    if(p.hierarchyVersion===1)return p;
    const arch=byId(p,'architecture'), collector=byId(p,'collector'), normalizer=byId(p,'normalizer'), grouper=byId(p,'grouper'), output=byId(p,'output');
    if(!arch||!collector||!normalizer||!grouper||!output)return p;
    arch.type='module';arch.moduleLevel='container';delete arch.parentId;arch.title=B('报道接入','Report intake');arch.summary=B('接收并标准化可追溯的报道输入','Receive and normalize traceable report inputs');arch.x=380;arch.y=80;arch.w=420;arch.h=160;arch.artifact=B('模块边界：接收原始报道，保留 eventId、source 与原始记录，不负责事件聚合。','Boundary: receive raw reports and preserve eventId, source and raw records; do not group events here.');
    collector.parentId='architecture';collector.x=420;collector.y=150;collector.moduleLevel='leaf';collector.w=250;collector.h=140;
    let standardizer=byId(p,'standardizer');
    if(!standardizer){standardizer=node('standardizer','module',B('格式标准化','Format normalization'),B('统一字段并保留原始来源','Normalize fields while preserving source'),420,320,'execute',B('将原始报道转换为约定字段，不改变事件身份。','Convert raw reports to the agreed fields without changing event identity.'),{status:'verified',parentId:'architecture',acceptance:[acceptance('standardizer-contract',B('字段保真','Field fidelity'),B('eventId、source 和原始记录均保留。','eventId, source and raw record are preserved.'),B('示例输入经过字段标准化后仍可追溯。','Fixture input remains traceable after normalization.'),B('固定字段检查','Fixed field check'), 'passed')]});p.nodes.push(standardizer);}
    standardizer.parentId='architecture';standardizer.x=420;standardizer.y=320;standardizer.moduleLevel='leaf';
    let processing=byId(p,'processing');
    if(!processing){processing=node('processing','module',B('事件处理','Event processing'),B('校验输入并按事件聚合','Validate inputs and group events'),900,80,'execute',B('模块边界：从标准化报道得到事件集合，负责口径与聚合规则。','Boundary: turn normalized reports into event groups using explicit rules.'),{moduleLevel:'container',status:'accepted'});p.nodes.push(processing);}
    processing.type='module';processing.moduleLevel='container';delete processing.parentId;processing.x=900;processing.y=80;processing.w=420;processing.h=160;
    normalizer.parentId='processing';normalizer.x=940;normalizer.y=150;normalizer.moduleLevel='leaf';
    grouper.parentId='processing';grouper.x=940;grouper.y=320;grouper.moduleLevel='leaf';
    let delivery=byId(p,'delivery');
    if(!delivery){delivery=node('delivery','module',B('结果输出','Result output'),B('生成可审查的聚合结果','Produce inspectable grouped output'),1420,80,'verify',B('模块边界：输出事件集合、来源广度和报道数，供验证与后续消费。','Boundary: output events, source breadth and report counts for verification and downstream use.'),{moduleLevel:'container',status:'verified'});p.nodes.push(delivery);}
    delivery.type='module';delivery.moduleLevel='container';delete delivery.parentId;delivery.x=1420;delivery.y=80;delivery.w=420;delivery.h=160;
    output.parentId='delivery';output.x=1460;output.y=160;output.moduleLevel='leaf';
    const old=p.edges||[];
    p.edges=old.map(e=>{
      if(e.type==='state')return {...e,type:'dependency'};
      if(e.from==='architecture'&&e.to==='normalizer')return {...e,to:'processing',type:'dependency'};
      if(e.from==='collector'&&e.to==='normalizer')return {...e,to:'standardizer',type:'data'};
      if(e.from==='output'&&e.to==='verification')return {...e,from:'delivery',type:'dependency'};
      return e;
    });
    addEdge(p,'standardizer','normalizer','data');

    addEdge(p,'processing','verification','dependency');
    addEdge(p,'delivery','verification','dependency');
    addEdge(p,'plan','architecture','control');
    addEdge(p,'verification','risk','dependency');
    p.nodes.forEach(n=>{if(!Array.isArray(n.acceptance))n.acceptance=[];});
    arch.acceptance=arch.acceptance.length?arch.acceptance:[acceptance('intake-boundary',B('输入边界清晰','Input boundary is clear'),B('原始报道进入后保留身份字段，并能进入后续校验。','Raw reports preserve identity fields and can enter validation.'),B('固定 fixture 的 4 条记录进入标准化步骤。','All four fixture records enter normalization.'),B('确定性 fixture 检查','Deterministic fixture check'),'passed')];
    normalizer.acceptance=normalizer.acceptance.length?normalizer.acceptance:[acceptance('validation-required-fields',B('必填字段校验','Required field validation'),B('缺失 eventId 或 source 的记录必须被拒绝。','Records missing eventId or source must be rejected.'),B('空字段会抛出 eventId and source are required。','Empty fields throw eventId and source are required.'),B('异常输入测试','Invalid input test'),'passed')];
    grouper.acceptance=grouper.acceptance.length?grouper.acceptance:[acceptance('group-by-event',B('按事件计数','Count by event'),B('4 条报道形成 2 个事件；首个事件 3 条报道、2 个来源。','Four reports form two events; the first has three reports and two sources.'),B('固定 fixture 运行结果满足三项断言。','Fixture run satisfies all three assertions.'),B('确定性运行','Deterministic run'),'passed')];
    output.acceptance=output.acceptance.length?output.acceptance:[acceptance('output-provenance',B('保留传播广度','Preserve source breadth'),B('结果同时输出 sourceCount 与 reportCount。','Output includes sourceCount and reportCount.'),B('聚合结果中保留来源集合和报道数量。','Grouped output retains sources and report count.'),B('结果结构检查','Output shape check'),'passed')];
    processing.acceptance=processing.acceptance.length?processing.acceptance:[acceptance('processing-contract',B('模块接口行为','Module interface behavior'),B('标准化输入经过校验和聚合后输出事件集合。','Normalized input becomes an event collection after validation and grouping.'),'','接口与集成检查','unverified')];
    delivery.acceptance=delivery.acceptance.length?delivery.acceptance:[acceptance('delivery-contract',B('结果可审查','Inspectable result'),B('结果包含事件身份、来源广度和报道数量。','Result includes event identity, source breadth and report count.'),'','输出审查','unverified')];
    p.moduleView.expanded={};p.moduleView.mode='overview';p.moduleView.activeContainer=null;p.hierarchyVersion=1;
    return p;
  }

  storeData.projects.forEach(prepareProject);
  storeData.schema=3;

  function expanded(p){return p.moduleView?.expanded||{};}
  function legacyGeom(n,p){
    if(n.moduleLevel==='container'){
      const open=!!expanded(p)[n.id]||p.moduleView?.activeContainer===n.id;
      const count=children(p,n.id).length;
      return {...n,w:Math.max(n.w||420,420),h:open?Math.max(350,150+count*145):160};
    }
    return {...n,w:n.w||250,h:n.h||150};
  }
  function geom(n,p){return CanvasLayout.layout(p).get(n.id)||n;}
  function visibleIds(p){
    const all=H.visibleNodeIds(p,expanded(p));
    if(p.moduleView?.mode!=='inside')return all;
    const id=p.moduleView.activeContainer;
    return new Set([id,...children(p,id).map(n=>n.id)]);
  }
  function projectedEdges(p){
    const vis=visibleIds(p);return H.projectEdges(p,filter,expanded(p)).filter(e=>vis.has(e.from)&&vis.has(e.to));
  }
  function acceptanceCounts(n){
    const a=n.acceptance||[];return {total:a.length,passed:a.filter(x=>x.status==='passed').length,failed:a.filter(x=>x.status==='failed').length,manual:a.filter(x=>x.status==='manual').length,unverified:a.filter(x=>x.status==='unverified').length};
  }
  const acceptanceLabel=s=>({unverified:B('未验证','Unverified'),passed:B('通过','Passed'),failed:B('失败','Failed'),manual:B('需人工判断','Manual judgment')}[s]||B(s,s));
  const moduleLabel=n=>n.moduleLevel==='container'?L('大模块','Container'):L('小模块','Submodule');
  function moduleSummary(n){
    const c=acceptanceCounts(n), childCount=children(project(),n.id).length;
    return `${childCount?childCount+' '+L('个子模块','submodules')+' · ':''}${c.failed?c.failed+' '+L('项失败','failed')+' · ':''}${c.unverified?c.unverified+' '+L('项未验证','unverified'):' '+L('项已通过','passed')}`;
  }

  function canvasToolsV11(){
    const p=project();
    return `${ib('zoom-out',L('缩小','Zoom out'),'minus')}<button data-action="zoom-reset" id="zoom-label" class="zoom-label">100%</button>${ib('zoom-in',L('放大','Zoom in'),'plus')}${ib('fit',L('适应画布','Fit canvas'),'fit')}<span class="separator"></span>${p?.moduleView?.mode==='inside'?`<span class="inside-breadcrumb">${btn('back-overview',L('返回总览','Back to overview'),'chevron','text-button')}<strong>${esc(pick(byId(p,p.moduleView.activeContainer)?.title))}</strong></span>`:''}<label class="flow-filter-label" title="${L('执行流：实际顺序、触发和编排；数据流：数据或产物传递、转换；依赖/依据：前置条件、决策依据或验收依据。节点状态由标签表示。','Execution: actual order, triggers and orchestration; Data: data or artifacts passed or transformed; Dependency / basis: prerequisites, decision basis or verification basis. Node state is shown by status labels.')}"><span class="sr-only">${L('关系筛选','Flow filter')}</span><select id="flow-filter">${Object.entries(flowLabels).map(([k,v])=>`<option value="${k}" ${filter===k?'selected':''}>${value(v)}</option>`).join('')}</select></label><span id="flow-help" class="flow-help">${value(flowHelp[filter])}</span><label class="search-field">${icon('search')}<input id="node-search" placeholder="${L('查找模块或产物','Find modules or artifacts')}" aria-label="${L('查找模块或产物','Find modules or artifacts')}" value="${esc(query)}"></label><button class="icon-btn ${focus?'pressed':''}" data-action="focus" aria-pressed="${focus}" aria-label="${L('聚焦关联','Focus relationships')}">${icon('focus')}</button>${btn('download-pack',L('开发包','Dev pack'),'download','text-button')}${ib('add-node',L('添加产物','Add artifact'),'plus')}`;
  }

  function drawGraphV11(){
    const p=project(),world=$('#world');if(!p||!world)return;
    const {x,y,z}=p.camera;world.style.transform=`translate(${x}px,${y}px) scale(${z})`;
    const level=storeData.prefs.density==='auto'?(z<.65?'far':z>1.15?'near':'normal'):storeData.prefs.density;
    const vis=visibleIds(p), related=selected&&focus?C.neighbors(selected,p.edges):null;
    const nodes=p.nodes.filter(n=>vis.has(n.id));
    $('#nodes').innerHTML=nodes.map(n=>{
      const g=geom(n,p),dim=(related&&!related.has(n.id))||(query&&!`${pick(n.title)} ${pick(n.summary)}`.toLowerCase().includes(query.toLowerCase()));
      const open=n.moduleLevel==='container'&&(expanded(p)[n.id]||p.moduleView.activeContainer===n.id), c=acceptanceCounts(n), childCount=children(p,n.id).length;
      return `<article tabindex="0" role="button" aria-label="${esc(pick(n.title))}" data-action="select-node" data-id="${n.id}" class="graph-node type-${n.type} ${n.moduleLevel==='container'?'module-container':''} ${n.parentId?'child-node':''} ${open?'expanded':''} ${n.id===selected?'selected':''} ${dim?'dim':''} level-${level}" style="left:${g.x}px;top:${g.y}px;width:${g.w}px;height:${g.h}px;--readable:1">${n.moduleLevel==='container'?`<button type="button" class="module-toggle" data-action="toggle-module" data-id="${n.id}" aria-expanded="${open}" aria-label="${open?L('折叠内部模块','Collapse submodules'):L('展开内部模块','Expand submodules')}" title="${open?L('折叠内部模块','Collapse submodules'):L('展开内部模块','Expand submodules')}">${icon(open?'minus':'plus')}</button>`:''}<div class="node-kicker">${value(typeLabels[n.type])}${n.moduleLevel==='container'?` · ${moduleLabel(n)}`:''}<span class="status-dot ${n.status}" title="${value(statusLabels[n.status])}"></span></div><h3>${esc(pick(n.title))}</h3>${level!=='far'?`<p>${esc(pick(n.summary))}</p>`:''}${n.moduleLevel==='container'?`<div class="module-boundary"><span>${L('边界','Boundary')} <strong>${childCount} ${L('个内部模块','internal modules')}</strong></span><span class="status-summary">${c.failed?c.failed+' '+L('失败','failed'):c.unverified?c.unverified+' '+L('未验证','unverified'):c.passed+' '+L('通过','passed')}</span></div>`:''}${level==='near'?`<small>${stageLabel(n.stage)} · ${moduleSummary(n)}</small>`:''}</article>`;
    }).join('');
    const rect=n=>geom(n,p);
    $('#edges').innerHTML=`<defs><marker id="arrow-v11" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6" fill="none" stroke="currentColor"/></marker></defs>`+projectedEdges(p).map(e=>{
      const a=byId(p,e.from),b=byId(p,e.to);if(!a||!b)return '';
      const ar=rect(a),br=rect(b),ax=ar.x+ar.w,ay=ar.y+ar.h/2,bx=br.x,byy=br.y+br.h/2,direct=e.edgeIds.some(id=>{const x=p.edges.find(v=>v.id===id);return x&&(x.from===selected||x.to===selected);});
      const path=CanvasLayout.route(ar,br,!!a.parentId&&a.parentId===b.parentId);
      const label=`${pick(a.title)} → ${pick(b.title)} · ${value(flowLabels[e.type])}${e.edgeIds.length>1?' · '+e.edgeIds.length+' '+L('条连接','connections'):''}`;
      return `<path class="edge ${e.type} ${e.edgeIds.length>1?'aggregate ':''}${selected&&focus&&!direct?'dim':''} ${direct?'highlight':''}" data-action="show-edge-detail" data-edge-ids="${e.edgeIds.join(',')}" d="${path.d}" marker-end="url(#arrow-v11)"><title>${esc(label)}</title></path>${e.edgeIds.length>1?`<g class="edge-count" tabindex="0" role="button" aria-label="${esc(label)}" data-action="show-edge-detail" data-edge-ids="${e.edgeIds.join(',')}" transform="translate(${path.x},${path.y})"><rect x="-14" y="-12" width="28" height="24" rx="12"/><text text-anchor="middle" dy="5">${e.edgeIds.length}</text></g>`:''}`;
    }).join('');
    $('#zoom-label').textContent=Math.round(z*100)+'%';$('#semantic-label').textContent=L({far:'远景 · 模块边界与状态',normal:'常规 · 模块摘要与关系',near:'近景 · 内部模块与验收摘要'}[level],{far:'Overview · module boundaries & state',normal:'Normal · summaries & relationships',near:'Detail · submodules & acceptance'}[level]);
  }

  function fitCanvasV11(){
    const vp=$('#viewport'),p=project();if(!vp||!p)return;
    const boxes=CanvasLayout.layout(p),ns=p.nodes.filter(n=>visibleIds(p).has(n.id));if(!ns.length)return;
    p.camera=CanvasLayout.fit(ns.map(n=>boxes.get(n.id)),vp.clientWidth,vp.clientHeight);drawGraphV11();persist();
  }
  function selectNodeV11(id){
    const p=project(),n=byId(p,id);if(!n)return;
    p.moduleView ||= {expanded:{},mode:'overview',activeContainer:null};
    if(n.parentId)p.moduleView.expanded[n.parentId]=true;
    if(p.moduleView.mode==='inside'&&id!==p.moduleView.activeContainer&&n.parentId!==p.moduleView.activeContainer){p.moduleView.mode='overview';p.moduleView.activeContainer=null;}
    selected=id;view='canvas';full=false;render();
    const vp=$('#viewport'),g=geom(n,p);if(vp){const c=p.camera;const right=(g.x+g.w)*c.z+c.x,bottom=(g.y+g.h)*c.z+c.y;if(right>vp.clientWidth-30)c.x-=right-vp.clientWidth+30;if(g.x*c.z+c.x<20)c.x=20-g.x*c.z;if(bottom>vp.clientHeight-55)c.y-=bottom-vp.clientHeight+55;if(g.y*c.z+c.y<30)c.y=30-g.y*c.z;drawGraphV11();}persist();
  }
  function mountCanvasV11(){
    const vp=$('#viewport');if(!vp||!project())return;
    project().moduleView ||= {expanded:{},mode:'overview',activeContainer:null};
    vp.style.setProperty('--grid-alpha',storeData.prefs.strength/100);vp.dataset.grid=storeData.prefs.grid;drawGraphV11();
    vp.onpointerdown=e=>{
      if(e.button!==0||e.target.closest('button,.edge,.edge-count'))return;
      const p=project(),el=e.target.closest('.graph-node'),id=el?.dataset.id,n=id?byId(p,id):null,g=n?geom(n,p):null;
      activeDrag={id,startX:e.clientX,startY:e.clientY,cam:{...p.camera},node:n?{...n}:null,rect:g,local:n?.canvasPosition?{...n.canvasPosition}:null,moved:false};vp.setPointerCapture(e.pointerId);
    };
    vp.onpointermove=e=>{
      if(!activeDrag)return;const d=activeDrag,dx=e.clientX-d.startX,dy=e.clientY-d.startY;
      if(!d.moved&&Math.abs(dx)+Math.abs(dy)<=5)return;d.moved=true;
      const p=project();
      if(d.id){const n=byId(p,d.id);if(!n)return;
        if(n.parentId){const r=geom(byId(p,n.parentId),p);n.canvasPosition={x:Math.max(40,Math.min(r.w-320,d.rect.x-r.x+dx/d.cam.z)),y:Math.max(CanvasLayout.HEADER,d.rect.y-r.y+dy/d.cam.z)};}
        else {n.x=Math.max(0,d.node.x+dx/d.cam.z);n.y=Math.max(0,d.node.y+dy/d.cam.z);}
      }else{p.camera.x=d.cam.x+dx;p.camera.y=d.cam.y+dy;}
      drawGraphV11();
    };
    vp.onpointerup=()=>{
      if(!activeDrag)return;const d=activeDrag,p=project();activeDrag=null;swallowClick=d.moved;
      if(d.id&&d.moved){const n=byId(p,d.id);if(n.canvasPosition){n.canvasPosition.x=H.snap(n.canvasPosition.x);n.canvasPosition.y=H.snap(n.canvasPosition.y);}else{n.x=H.snap(n.x);n.y=H.snap(n.y);}}
      if(d.id&&!d.moved){swallowClick=true;selectNodeV11(d.id);return;}persist(d.moved);drawGraphV11();
    };
    vp.onpointercancel=()=>{if(!activeDrag)return;const d=activeDrag,n=byId(project(),d.id);if(n){n.x=d.node.x;n.y=d.node.y;if(d.local)n.canvasPosition=d.local;else delete n.canvasPosition;}project().camera=d.cam;activeDrag=null;drawGraphV11();};
    vp.onwheel=e=>{e.preventDefault();zoom(e.deltaY<0?1.1:1/1.1,e.clientX,e.clientY);};
    graphObserver=new ResizeObserver(()=>drawGraphV11());graphObserver.observe(vp);
  }

  function acceptanceRows(n){
    return (n.acceptance||[]).map(a=>`<article class="acceptance-row"><header><strong>${esc(pick(a.title))}</strong><span class="status-tag ${a.status}">${value(acceptanceLabel(a.status))}</span></header><p><b>${L('预期','Expected')}：</b>${esc(pick(a.expected))}</p>${a.actual?`<p><b>${L('实际','Actual')}：</b>${esc(pick(a.actual))}</p>`:''}${a.evidence?`<p><b>${L('证据','Evidence')}：</b>${esc(pick(a.evidence))}</p>`:''}<footer><small>${a.kind==='normal'?L('场景','Scenario'):esc(a.kind)}</small>${btn('edit-acceptance',L('编辑','Edit'),'edit','text-button',`data-node-id="${n.id}" data-acceptance-id="${a.id}"`)}</footer></article>`).join('');
  }
  function inspectorV11(){
    const p=project(),n=byId(p,selected);if(!n)return '';
    const c=acceptanceCounts(n), kids=children(p,n.id), parent=byId(p,n.parentId);
    return `<aside class="inspector ${full?'expanded':''}" style="--panel-width:${storeData.prefs.panelWidth}px" aria-label="${L('模块详情','Module details')}">${!full?'<div class="resize-handle" role="separator" tabindex="0" aria-label="Resize detail panel" aria-orientation="vertical"></div>':''}<header class="inspector-header"><span>${value(typeLabels[n.type])}${n.moduleLevel==='container'?' · '+moduleLabel(n):n.parentId?' · '+L('子模块','Submodule'):''}</span><div>${ib('full',full?L('返回画布','Back to canvas'):L('全页阅读','Read full page'),full?'canvas':'expand')}${ib('close-detail',L('关闭详情','Close details'),'close')}</div></header><div class="detail-scroll"><div class="detail-main"><h1>${esc(pick(n.title))}</h1><section id="artifact-result"><div class="section-heading"><h2>${L('职责与边界','Responsibility & boundary')}</h2>${btn('edit-node',L('编辑','Edit'),'edit','text-button')}</div><pre class="artifact-content">${esc(pick(n.artifact)||L('尚无产物。编辑后记录可检查的结果。','No artifact yet. Edit to capture an inspectable result.'))}</pre></section><section id="artifact-summary"><h2>${L('摘要与状态','Summary & status')}</h2><p>${esc(pick(n.summary))}</p><span class="status-tag ${n.status}">${value(statusLabels[n.status])}</span> <small>${stageLabel(n.stage)}</small>${parent?`<p class="quiet">${L('所属大模块','Parent module')}：${esc(pick(parent.title))}</p>`:''}</section>${n.moduleLevel==='container'?`<section><h2>${L('内部模块','Submodules')}</h2><div class="child-list">${kids.map(k=>btn('open-node',pick(k.title),'file','related-link',`data-id="${k.id}"`)).join('')||`<p>${L('暂未添加小模块。','No submodules yet.')}</p>`}</div>${btn('enter-module',L('进入模块查看','Enter module'),'focus','text-button',`data-id="${n.id}"`)}</section>`:''}<section id="artifact-acceptance"><div class="section-heading"><h2>${L('验收标准与证据','Acceptance & evidence')}</h2>${btn('add-acceptance',L('添加验收项','Add criterion'),'plus','text-button',`data-node-id="${n.id}"`)}</div><p class="quiet">${L('执行前定义标准；通过必须有实际结果和证据。人工接受与测试通过分开记录。','Define criteria before execution. Passing requires actual results and evidence. Manual acceptance is separate from tests.')}</p><div class="acceptance-list">${acceptanceRows(n)||`<p>${L('尚未定义验收项。','No acceptance criteria defined yet.')}</p>`}</div><div class="pack-callout"><strong>${c.passed}/${c.total} ${L('项通过','passed')}</strong><p>${c.failed?c.failed+' '+L('项失败；','failed; '):''}${c.unverified?c.unverified+' '+L('项未验证。','unverified.'):L('仍需判断模块整体是否可接受。','the module still needs a separate acceptance decision.')}</p>${btn('accept-module',L('记录人工接受','Record manual acceptance'),'check','text-button',`data-node-id="${n.id}"`)}</div>${n.manualAcceptance?`<div class="manual-decision"><strong>${L('人工接受记录','Manual acceptance')}</strong><p>${new Date(n.manualAcceptance.at).toLocaleString(language==='zh'?'zh-CN':'en-US')} · ${esc(n.manualAcceptance.note||L('无备注','No note'))}</p></div>`:''}</section><section id="artifact-related"><h2>${L('相关产物与关系','Related artifacts & relationships')}</h2>${p.edges.filter(e=>e.from===n.id||e.to===n.id).map(e=>{const other=byId(p,e.from===n.id?e.to:e.from);return other?`<button class="related-link" data-action="open-node" data-id="${other.id}"><span>${esc(pick(other.title))}</span><small>${value(flowLabels[e.type])} ${e.from===n.id?'→':'←'}</small></button>`:''}).join('')||`<p>${L('暂无关联','No relationships yet')}</p>`}</section><details id="artifact-method"><summary>${L('方法依据 · WHY / INTENT / 约束 / 风险 / EVAL','Method rationale · WHY / INTENT / constraints / risks / EVAL')}</summary>${['why','intent','constraints','risks','eval'].map(k=>`<h3>${({why:'WHY',intent:'INTENT',constraints:L('约束','Constraints'),risks:L('风险','Risks'),eval:'EVAL'})[k]}</h3><p class="preserve">${esc(pick(n[k])||L('待补充','To be documented'))}</p>`).join('')}</details>${btn('download-pack',L('下载开发资料包','Download Development Pack'),'download','text-button')}</div>${full?`<nav class="detail-index" aria-label="${L('本页目录','On this page')}"><small>${L('本页内容','On this page')}</small><a href="#artifact-result">${L('职责与边界','Responsibility')}</a><a href="#artifact-acceptance">${L('验收与证据','Acceptance')}</a><a href="#artifact-related">${L('相关关系','Relationships')}</a><small>v${p.version}</small></nav>`:''}</div></aside>`;
  }

  function verificationPageV11(){
    const p=project(),rows=p.nodes.filter(n=>n.acceptance?.length).map(n=>{const c=acceptanceCounts(n);return `<button class="artifact-row" data-action="open-node" data-id="${n.id}"><div><small>${n.moduleLevel==='container'?L('大模块','Module'):L('小模块','Submodule')}</small><h2>${esc(pick(n.title))}</h2><p>${c.passed}/${c.total} ${L('项通过','passed')} · ${c.unverified} ${L('项未验证','unverified')} · ${c.failed} ${L('项失败','failed')}</p></div><span class="status-tag ${c.failed?'failed':c.unverified?'review':'verified'}">${c.failed?L('有失败','Has failures'):c.unverified?L('需复验','Needs review'):L('可检查','Inspectable')}</span></button>`;}).join('');
    return `<div class="page-heading"><div><h1>${L('验收与证据','Acceptance & evidence')}</h1><p>${L('先定义什么算做对，再把实际结果和证据带回来。','Define what counts as correct, then bring back actual results and evidence.')}</p></div>${p.example?btn('rerun',L('重新运行样例','Rerun fixture'),'check','primary'):''}</div>${p.example?`<h2>${L('事件去重 · 确定性结果','Event deduplication · deterministic result')}</h2>${evidenceTable()}<p>${L('范围：4 条固定数据的确定性聚合。不覆盖实时抓取、语义匹配或生产性能。','Scope: deterministic grouping of four fixed records. Does not cover live ingestion, semantic matching or production performance.')}</p>`:''}<h2>${L('项目验收项','Project acceptance criteria')}</h2>${rows||`<div class="empty"><p>${L('还没有结构化验收项。请在模块详情中添加。','No structured criteria yet. Add one from a module detail panel.')}</p></div>`}`;
  }

  function editNodeDialogV11(isNew=false){
    const p=project();if(!p){newProjectDialog();return;}const n=isNew?node(uid(),'module','','',80,80,p.stage,''):byId(p,selected);if(!n)return;
    const parents=p.nodes.filter(v=>v.id!==n.id&&v.type==='module'&&v.moduleLevel==='container');
    showDialog(isNew?L('添加产物','Add artifact'):L('编辑产物','Edit artifact'),field('title',L('名称','Name'),n.title,false,true)+`<div class="form-pair"><label class="form-field"><span>${L('类型','Type')}</span><select name="type">${Object.entries(typeLabels).map(([k,v])=>`<option value="${k}" ${n.type===k?'selected':''}>${value(v)}</option>`).join('')}</select></label><label class="form-field"><span>${L('阶段','Stage')}</span><select name="stage">${stages.map(s=>`<option value="${s.id}" ${n.stage===s.id?'selected':''}>${stageLabel(s.id)}</option>`).join('')}</select></label></div><div class="form-pair"><label class="form-field"><span>${L('模块层级','Module level')}</span><select name="moduleLevel"><option value="leaf" ${n.moduleLevel!=='container'?'selected':''}>${L('小模块 / 独立产物','Submodule / standalone artifact')}</option><option value="container" ${n.moduleLevel==='container'?'selected':''}>${L('大模块容器','Module container')}</option></select></label><label class="form-field"><span>${L('所属大模块','Parent module')}</span><select name="parentId"><option value="">${L('无（顶层）','None (top level)')}</option>${parents.map(v=>`<option value="${v.id}" ${n.parentId===v.id?'selected':''}>${esc(pick(v.title))}</option>`).join('')}</select></label></div>`+field('artifact',L('产物内容 · 结果优先','Artifact content · result first'),n.artifact,true,true)+field('summary',L('WHAT · 职责或摘要','WHAT · responsibility or summary'),n.summary,true,true)+field('evidence',L('验证证据','Verification evidence'),n.evidence,true)+`<label class="form-field"><span>${L('状态（已验证必须提供证据）','Status (verified requires evidence)')}</span><select name="status">${Object.entries(statusLabels).map(([k,v])=>`<option value="${k}" ${n.status===k?'selected':''}>${value(v)}</option>`).join('')}</select></label><details><summary>${L('方法依据','Method rationale')}</summary>${field('why','WHY',n.why,true)}${field('intent','INTENT',n.intent,true)}${field('constraints',L('约束','Constraints'),n.constraints,true)}${field('risks',L('风险','Risks'),n.risks,true)}${field('eval','EVAL',n.eval,true)}</details>`,f=>{
      if(f.status==='verified'&&!f.evidence.trim())throw Error(L('请记录可检查的证据。','Add inspectable evidence.'));
      if(f.type==='module')H.validateCard({name:f.title,what:f.summary,why:f.why,intent:f.intent});
      if(f.moduleLevel==='container'&&f.parentId)throw Error(L('大模块不能嵌套在另一个模块中。','Containers cannot be nested.'));
      if(f.parentId&&!parents.some(v=>v.id===f.parentId))throw Error(L('所属大模块无效。','Invalid parent module.'));
      const oldExpected=(n.acceptance||[]).map(a=>[a.id,a.expected]);
      Object.assign(n,{title:f.title,type:f.type,stage:f.stage,artifact:f.artifact,summary:f.summary,evidence:f.evidence,status:f.status,why:f.why,intent:f.intent,constraints:f.constraints,risks:f.risks,eval:f.eval,moduleLevel:f.type==='module'?f.moduleLevel:'leaf'});
      if(f.parentId)n.parentId=f.parentId;else delete n.parentId;
      if(n.acceptance) n.acceptance.forEach(a=>{const old=oldExpected.find(v=>v[0]===a.id);if(old&&old[1]!==a.expected){a.status='unverified';a.actual='';a.evidence='';}});
      if(isNew)p.nodes.push(H.place(n,n.x,n.y,p.nodes));
      p.version++;prepareProject(p);persist(true);selectNodeV11(n.id);
    });
  }

  function acceptanceDialog(nodeId,itemId){
    const p=project(),n=byId(p,nodeId),old=(n.acceptance||[]).find(a=>a.id===itemId),a=old||{id:uid(),title:'',kind:'normal',input:'',expected:'',method:'',actual:'',evidence:'',version:`v${p.version}`,status:'unverified'};
    showDialog(old?L('编辑验收项','Edit acceptance criterion'):L('添加验收项','Add acceptance criterion'),field('title',L('验收项标题','Criterion title'),a.title,false,true)+`<div class="form-pair"><label class="form-field"><span>${L('场景类型','Scenario type')}</span><select name="kind"><option value="normal">${L('正常','Normal')}</option><option value="boundary" ${a.kind==='boundary'?'selected':''}>${L('边界','Boundary')}</option><option value="exception" ${a.kind==='exception'?'selected':''}>${L('异常','Exception')}</option><option value="regression" ${a.kind==='regression'?'selected':''}>${L('回归','Regression')}</option></select></label><label class="form-field"><span>${L('验证方式','Verification method')}</span><input name="method" value="${esc(a.method)}" maxlength="200"></label></div>`+field('input',L('输入或前置条件','Input / precondition'),a.input,true)+field('expected',L('预期行为','Expected behavior'),a.expected,true,true)+field('actual',L('实际结果','Actual result'),a.actual,true)+field('evidence',L('证据（文本或链接）','Evidence (text or link)'),a.evidence,true)+`<div class="form-pair"><label class="form-field"><span>${L('对应版本','Version')}</span><input name="version" value="${esc(a.version||`v${p.version}`)}" maxlength="80"></label><label class="form-field"><span>${L('验证状态','Verification status')}</span><select name="status"><option value="unverified">${L('未验证','Unverified')}</option><option value="passed" ${a.status==='passed'?'selected':''}>${L('通过','Passed')}</option><option value="failed" ${a.status==='failed'?'selected':''}>${L('失败','Failed')}</option><option value="manual" ${a.status==='manual'?'selected':''}>${L('需人工判断','Manual judgment')}</option></select></label></div>`,f=>{
      if(f.status==='passed'&&(!f.actual.trim()||!f.evidence.trim()))throw Error(L('标记通过前必须填写实际结果和证据。','Actual result and evidence are required before marking passed.'));
      const next={...a,title:f.title.trim(),kind:f.kind,input:f.input,expected:f.expected,method:f.method,actual:f.actual,evidence:f.evidence,version:f.version,status:f.status,manual:f.status==='manual'};
      if(old&&old.expected!==next.expected){next.status='unverified';next.actual='';next.evidence='';next.history=[...(old.history||[]),{status:old.status,actual:old.actual,evidence:old.evidence,version:old.version,at:new Date().toISOString()}];toast('预期已变化：该项需要复验','Expected behavior changed: re-verification required');}
      if(old){n.acceptance=n.acceptance.map(v=>v.id===old.id?next:v);}else{n.acceptance=[...(n.acceptance||[]),next];}
      p.version++;persist(true);selectNodeV11(n.id);
    });
  }

  function manualAcceptanceDialog(nodeId){
    const p=project(),n=byId(p,nodeId),c=acceptanceCounts(n),blocking=c.failed+c.unverified;
    showDialog(L('记录人工接受','Record manual acceptance'),`<p>${blocking?L(`当前还有 ${blocking} 项未解决或未验证。请记录接受剩余风险的理由。`,`There are ${blocking} unresolved or unverified items. Record why the residual risk is accepted.`):L('验收项均已通过，仍请记录最终接受备注。','All criteria passed; record the final acceptance note.')}</p>${field('note',L('接受备注与残余风险','Acceptance note & residual risk'),'',true,true)}`,f=>{n.manualAcceptance={at:new Date().toISOString(),note:f.note};n.status='accepted';p.version++;persist(true);selectNodeV11(n.id);});
  }

  function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
  const u16=n=>new Uint8Array([n&255,(n>>>8)&255]);
  const u32=n=>new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]);
  function concatBytes(parts){const total=parts.reduce((n,p)=>n+p.length,0),out=new Uint8Array(total);let o=0;parts.forEach(p=>{out.set(p,o);o+=p.length;});return out;}
  function zipStore(files){
    const enc=new TextEncoder(),locals=[],centrals=[];let offset=0;
    Object.entries(files).forEach(([name,content])=>{const nb=enc.encode(name),data=enc.encode(content),crc=crc32(data),local=concatBytes([u32(0x04034b50),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(nb.length),u16(0),nb,data]);locals.push(local);centrals.push({nb,crc,size:data.length,offset});offset+=local.length;});
    const central=centrals.map(v=>concatBytes([u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),u32(v.crc),u32(v.size),u32(v.size),u16(v.nb.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(v.offset),v.nb]));
    const body=concatBytes([...locals,...central]),start=body.length-central.reduce((n,v)=>n+v.length,0),size=body.length-start;
    return new Blob([body,u32(0x06054b50),u16(0),u16(0),u16(central.length),u16(central.length),u32(size),u32(start),u16(0)],{type:'application/zip'});
  }
  function downloadBlob(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1200);}
  function packDialog(){
    const files=H.buildDevelopmentPack(project(),language),entries=Object.entries(files),todo=entries.filter(([,v])=>/TODO|待补充/.test(v)).length;
    showDialog(L('开发资料包','Development Pack'),`<p>${L('根据当前项目结构生成确定性文件，不调用模型 API。未填写内容保留为 TODO。','Generated deterministically from the current project. No model API is called; incomplete content stays TODO.')}</p><div class="pack-files">${entries.map(([n,c])=>`<div class="pack-file"><span>${esc(n)}</span><small>${c.length} ${L('字符','chars')}</small></div>`).join('')}</div><p class="quiet">${todo?todo+' '+L('个文件仍包含 TODO，请在下载前确认。','files still contain TODO; review before download.'):L('没有发现 TODO。','No TODO markers found.')}</p>`,()=>{downloadBlob(zipStore(files),`${pick(project().name).replace(/[<>:"/\\|?*]/g,'-')}-development-pack.zip`);toast('开发资料包已下载','Development Pack downloaded');});
  }
  function exportProjectV11(format){
    const p=project();if(!p)return;
    if(format==='pack'){const files=H.buildDevelopmentPack(p,language);downloadBlob(zipStore(files),`${pick(p.name).replace(/[<>:"/\\|?*]/g,'-')}-development-pack.zip`);toast('开发资料包已下载','Development Pack downloaded');return;}
    const body=format==='json'?JSON.stringify({schema:3,projects:[p]},null,2):`# ${pick(p.name)}\n\n${pick(p.goal)}\n\n`+p.nodes.map(n=>`## ${pick(n.title)}\n\n${pick(n.artifact)}\n\n### ${L('验收','Acceptance')}\n${(n.acceptance||[]).map(a=>`- [${a.status}] ${pick(a.title)}: ${pick(a.expected)}`).join('\n')||'TODO'}\n\n### ${L('证据','Evidence')}\n${pick(n.evidence)||'TODO'}`).join('\n\n');downloadBlob(new Blob([body],{type:format==='json'?'application/json;charset=utf-8':'text/markdown;charset=utf-8'}),pick(p.name).replace(/[<>:"/\\|?*]/g,'-')+'.'+(format==='json'?'json':'md'));}
  function importProjectV11(){
    const input=document.createElement('input');input.type='file';input.accept='.json,application/json';
    input.onchange=async()=>{try{const file=input.files?.[0];if(!file||file.size>5e6)throw Error(L('文件必须小于 5 MB','File must be under 5 MB'));const data=JSON.parse(await file.text());if(!H.validateStore(data))throw Error(L('项目格式无效','Invalid project format'));for(const p of data.projects){prepareProject(p);const result=H.validateHierarchy(p);if(!result.valid)throw Error(result.reason);if(!p.nodes.length||p.nodes.some(n=>!typeLabels[n.type]||!stages.some(s=>s.id===n.stage)||!statusLabels[n.status]))throw Error(L('存在无效产物','Invalid artifact'));if(p.edges.some(e=>!p.nodes.some(n=>n.id===e.from)||!p.nodes.some(n=>n.id===e.to)||!flowLabels[e.type]))throw Error(L('存在无效关系','Invalid relationship'));}
      data.projects.forEach(p=>{p.id=uid();p.camera=p.camera||{x:40,y:60,z:1};storeData.projects.push(p);storeData.active=p.id;});storeData.schema=3;view='projects';persist(true);render();toast('项目已导入','Project imported');
    }catch(e){toast('导入失败：'+e.message,'Import failed: '+e.message);}};input.click();
  }
  function openExampleV11(){let p=storeData.projects.find(v=>v.example);if(!p){p=exampleProject();storeData.projects.push(p);}prepareProject(p);storeData.active=p.id;view='canvas';selected=null;full=false;persist();render();fitCanvasV11();}
  function releasePageV11(){return `<div class="page-heading"><div><h1>${L('版本与验收','Releases & acceptance')}</h1><p>${L('方法来源、站点实现和人工验收分别记录。','Method source, site implementation and human acceptance are tracked separately.')}</p></div></div><div class="release-entry"><small>2026-09-23</small><h2>Site 1.2 · ${L('保存反馈与阅读体验','Save feedback & readability')}</h2><p>${L('清晰显示账号同步状态；保存失败可重试或下载工作区备份；完善移动端导航、验收文本可读性与项目导入校验。','Clear account sync status, retry and workspace backup on save failure, improved mobile navigation and acceptance text, and safer project imports.')}</p></div><div class="release-entry"><small>2026-09-20</small><h2>Site 1.1 · ${L('分层模块与验收前置','Layered modules & acceptance-first')}</h2><p>${L('两层模块画布、折叠与展开、真实关系投影、结构化验收项、复验记录、人工接受记录和 Development Pack 导出。','Two-level module canvas, collapse/expand, real relationship projection, structured acceptance criteria, re-verification, manual acceptance records and Development Pack export.')}</p><p>${L('验收依据：v1.1 任务书；自动化测试与浏览器交互已执行，视觉判断仍需人工确认。','Acceptance source: the v1.1 task brief. Automated and browser interaction checks are complete; visual judgment still needs human confirmation.')}</p><a href="/apps/ai-dev-collaboration-workbench/acceptance.html" target="_blank">${L('查看逐项验收记录','Open acceptance record')}</a></div><div class="release-entry"><small>2026-09-15</small><h2>Site 1.0 · ${L('空间工作台','Spatial workspace')}</h2><p>${L('中文默认、中英切换、可保存项目、关系画布、三级语义缩放、可调整详情面板与完整阅读。','Chinese default with English switching, saved projects, relationship canvas, three semantic zoom levels, resizable inspector and full reading.')}</p></div><div class="release-entry"><small>2026-09-15T17:35:48+08:00</small><h2>Skill 0.1.0</h2><p>GPT-5.6 Sol</p><p>${L('九阶段协作方法、模块卡、ADR 与验证计划来自上传的原始 Skill 包。','Nine-stage methodology, module cards, ADRs and verification plans originate from the uploaded Skill package.')}</p></div>`;}

  // Replace only the presentation and interaction hooks; the original site state and navigation remain intact.
  mountCanvas=mountCanvasV11;drawGraph=drawGraphV11;fitCanvas=fitCanvasV11;selectNode=selectNodeV11;canvasTools=canvasToolsV11;inspector=inspectorV11;editNodeDialog=editNodeDialogV11;exportProject=exportProjectV11;importProject=importProjectV11;openExample=openExampleV11;verificationPage=verificationPageV11;releasePage=releasePageV11;

  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action,p=project();
    if(a==='export'){e.preventDefault();e.stopImmediatePropagation();showDialog(L('导出项目','Export project'),`<label class="form-field"><span>${L('格式','Format')}</span><select name="format"><option value="json">JSON · ${L('完整项目与画布','Full project and canvas')}</option><option value="md">Markdown · ${L('产物阅读','Artifact reading')}</option><option value="pack">Development Pack · ${L('可交给 Coding Agent','For a Coding Agent')}</option></select></label><p class="quiet">${L('开发资料包只根据已记录内容生成，不调用模型 API；未填写部分会保留为 TODO。','The Development Pack is generated from recorded content only; no model API is called and incomplete fields remain TODO.')}</p>`,f=>exportProjectV11(f.format));return;}
    if(a==='toggle-module'){e.preventDefault();e.stopImmediatePropagation();const id=b.dataset.id;if(!p||!byId(p,id))return;p.moduleView ||= {expanded:{},mode:'overview'};p.moduleView.expanded[id]=!p.moduleView.expanded[id];if(!p.moduleView.expanded[id]&&byId(p,selected)?.parentId===id)selected=id;persist(true);render();return;}
    if(a==='enter-module'){e.preventDefault();if(!p)return;const id=b.dataset.id;p.moduleView.overviewCamera={...p.camera};p.moduleView.overviewExpanded={...p.moduleView.expanded};selected=null;p.moduleView.mode='inside';p.moduleView.activeContainer=id;p.moduleView.expanded[id]=true;persist(true);render();fitCanvasV11();return;}
    if(a==='back-overview'){e.preventDefault();if(!p)return;p.moduleView.mode='overview';p.moduleView.activeContainer=null;p.moduleView.expanded=p.moduleView.overviewExpanded||p.moduleView.expanded;if(p.moduleView.overviewCamera)p.camera={...p.moduleView.overviewCamera};selected=null;persist(true);render();return;}
    if(a==='add-acceptance'){e.preventDefault();acceptanceDialog(b.dataset.nodeId);return;}
    if(a==='edit-acceptance'){e.preventDefault();acceptanceDialog(b.dataset.nodeId,b.dataset.acceptanceId);return;}
    if(a==='accept-module'){e.preventDefault();manualAcceptanceDialog(b.dataset.nodeId);return;}
    if(a==='download-pack'){e.preventDefault();packDialog();return;}
    if(a==='show-edge-detail'){e.preventDefault();const ids=(b.dataset.edgeIds||'').split(',');const rows=ids.map(id=>p?.edges.find(v=>v.id===id)).filter(Boolean);showDialog(L('关系明细','Relationship details'),`<p>${L('折叠视图中的汇总关系对应以下真实连线：','This aggregate relationship contains these source connections:')}</p>${rows.map(r=>{const a=byId(p,r.from),z=byId(p,r.to);return `<div class="pack-file"><span>${esc(pick(a?.title||r.from))} → ${esc(pick(z?.title||r.to))}</span><small>${value(flowLabels[r.type])}</small></div>`;}).join('')}`,()=>{});return;}
  },true);

  // Extend the existing export dialog with a deterministic Development Pack choice.
  document.addEventListener('keydown',e=>{if(e.target.matches('.edge-count')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
  const oldRender=render;
  render=function(){oldRender();window.AccountSync?.decorate();const dialogExport=document.querySelector('[data-action="export"]');if(dialogExport)dialogExport.title=L('导出 JSON、Markdown 或开发资料包','Export JSON, Markdown or Development Pack');};
  try{persist();}catch{}
  render();
})();
