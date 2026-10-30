(() => {
  'use strict';
  const root = document.getElementById('root');
  const E = window.NovelStudio.escape;
  const api = '/api/m/novel-studio/';
  // Only these server-defined failures prove the model test failed before saving a connection.
  const connectionFailures = {
    MODEL_NOT_CONFIGURED:[503,'configuration','请先连接 OpenAI。'],
    MODEL_AUTH_FAILED:[401,'provider','连接验证失败，请检查 API Key。'],
    MODEL_ACCESS_DENIED:[403,'provider','此连接没有读取模型列表的权限。'],
    MODEL_REQUEST_LIMIT:[429,'provider','OpenAI 暂时限制了请求，请稍后重试或检查账号限额。'],
    MODEL_PROVIDER_ERROR:[502,'provider','OpenAI 未能返回模型列表，请稍后重试。'],
    MODEL_EMPTY_RESPONSE:[502,'malformed','模型服务返回空响应，请稍后重试。'],
    MODEL_RESPONSE_TOO_LARGE:[502,'malformed','模型列表超出处理限制，请稍后重试。'],
    MODEL_RESPONSE_INVALID:[502,'malformed','模型服务返回格式无效，请稍后重试。'],
    MODEL_REQUEST_TIMEOUT:[504,'timeout','读取模型列表超时，请重试。'],
    MODEL_NETWORK_ERROR:[502,'network','站点暂时无法连接 OpenAI，请稍后重试。'],
    MODEL_RESPONSE_READ_ERROR:[502,'response_read','模型列表传输中断，请重试。'],
    MODEL_RUNTIME_ERROR:[502,'runtime_api','站点连接服务发生错误，请稍后重试。'],
  };
  let state = null, preference = null, variables = [], models = [], selected = '', testedSource = '', testedRevision = null;
  let loading = false, testing = false, saving = false, requestSequence = 0;
  const get = id => document.getElementById(id);
  const view = `
    <div class="model-settings">
      <div class="settings-heading"><div><h1>模型设置</h1><p>连接你的 OpenAI 账号，选择写作模型。</p></div><span id="connection-badge" class="current-badge">正在读取</span></div>
      <div id="settings-access" hidden></div>
      <div id="settings-form" class="settings-sheet">
        <section class="settings-section" aria-labelledby="connection-title">
          <div class="settings-section-title"><h2 id="connection-title">连接</h2><button id="refresh" class="quiet" type="button">刷新配置</button></div>
          <label for="key-source">Sites 环境变量</label>
          <div class="connection-controls"><select id="key-source" disabled><option value="">正在读取…</option></select><button id="test-connection" class="primary" type="button" disabled>测试连接</button></div>
          <p class="settings-note">选择保存了 OpenAI API Key 的变量，密钥内容不会显示。</p>
          <p id="connection-message" class="settings-message" role="status" aria-live="polite"></p>
        </section>
        <section class="settings-section" aria-labelledby="models-title">
          <div class="settings-section-title"><h2 id="models-title">写作模型</h2><span id="model-count" class="subtle"></span></div>
          <div class="saved-model"><span class="subtle">当前默认模型</span><strong id="current-model">正在读取…</strong></div>
          <div id="model-placeholder" class="connection-placeholder">${window.NovelStudio.icon('settings')}<p>测试连接后，选择该账号返回的模型。</p></div>
          <div id="model-browser" class="model-browser" hidden>
            <label for="model-search">查找模型</label>
            <div class="model-search-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg><input id="model-search" type="search" placeholder="输入模型名称" autocomplete="off"></div>
            <div id="model-list" class="model-list" aria-label="可选写作模型"></div>
            <p id="models-note" class="settings-note"></p>
            <div class="settings-save-row"><span id="selection-label" class="subtle">选择一个模型作为默认</span><button id="save-model" class="primary" type="button" disabled>保存默认模型</button></div>
          </div>
          <p id="model-message" class="settings-message" role="status" aria-live="polite"></p>
        </section>
      </div>
      <details id="settings-help" class="settings-help"><summary>没有找到环境变量？</summary><p>在 Sites 站点设置的「环境变量」中保存你的 OpenAI API Key，启用 Secret，然后重新部署。变量名可以自定；这里会识别已部署的 OpenAI 密钥变量。</p><p>测试连接只读取模型列表，不生成正文。列表已排除明确用于图片、音频等任务的模型；文字生成能力和额度以实际写作请求为准。</p><p>请在 Sites 中修改或移除密钥；本页只保存所选变量名称和默认模型。</p></details>
    </div>`;
  root.innerHTML = window.NovelStudio.shell({active:'settings', title:'模型设置', content:view});

  function message(id, text, kind='') { const el=get(id); el.textContent=text; el.className='settings-message'+(kind?' '+kind:''); }
  function badge(text, connected=false) { get('connection-badge').textContent=text; get('connection-badge').dataset.connected=String(connected); }
  function updateControls() {
    const busy=loading||testing||saving;
    get('refresh').disabled=busy;
    get('key-source').disabled=busy||!variables.some(v=>v.eligible);
    get('test-connection').disabled=busy||!state||!variables.some(v=>v.name===get('key-source').value&&v.eligible);
    get('save-model').disabled=busy||!selected||!preference||testedSource!==get('key-source').value||testedRevision!==state?.preferenceRevision;
    get('model-search').disabled=busy;
    for(const button of get('model-list').querySelectorAll('button'))button.disabled=busy;
  }
  function clearModels() {
    models=[]; selected=''; testedSource=''; testedRevision=null;
    get('model-list').replaceChildren(); get('model-search').value=''; get('model-count').textContent='';
    get('model-browser').hidden=true; get('model-placeholder').hidden=false;
    message('model-message',''); updateControls();
  }
  function drawModels() {
    const query=get('model-search').value.trim().toLowerCase();
    const matches=models.filter(m=>m.id.toLowerCase().includes(query));
    get('model-list').innerHTML=matches.length?matches.map(m=>`<button type="button" class="model-option" data-model-id="${E(m.id)}" aria-pressed="${m.id===selected}"><span>${E(m.id)}</span><span class="model-mark">${m.id===selected?'已选择':m.id===preference?.model&&!preference?.stale?'当前默认':''}</span></button>`).join(''):`<div class="models-empty">${models.length?'没有匹配的模型，换个名称试试。':'此连接暂未返回可选的文字模型。'}</div>`;
    get('selection-label').textContent=selected?'已选择 '+selected:'选择一个模型作为默认';
    updateControls();
  }
  async function response(url, options) {
    const res=await fetch(api+url,{cache:'no-store',...options});
    const data=await res.json().catch(()=>null);
    if(!res.ok||!data){
      const spec=typeof data?.code==='string'&&Object.hasOwn(connectionFailures,data.code)?connectionFailures[data.code]:null;
      const knownFailure=url==='model-connection'&&data?.connectionUnchanged===true&&spec&&res.status===spec[0]&&data.category===spec[1]&&data.error===spec[2]&&(data.providerStatus===null||Number.isInteger(data.providerStatus)&&data.providerStatus>=100&&data.providerStatus<=599);
      const error=Error(knownFailure?spec[2]:typeof data?.error==='string'?data.error:'暂时无法完成请求，请重试。');
      error.status=res.status;error.connectionUnchanged=!!knownFailure;throw error;
    }
    return data;
  }
  async function loadPreference(sequence=requestSequence) {
    const data=await response('model-preference');
    if(sequence!==requestSequence)return;
    if(!Number.isSafeInteger(data.revision)||!(data.model===null||typeof data.model==='string'))throw Error('无法读取默认模型，请刷新配置。');
    preference=data;
    get('current-model').textContent=data.stale?'连接已变化，请重新选择':data.model||data.fallbackModel||'尚未设置';
  }
  async function initialize() {
    if(testing||saving)return;
    const seq=++requestSequence;loading=true;state=null;variables=[];preference=null;clearModels();get('key-source').innerHTML='<option value="">正在读取…</option>';get('key-source').value='';get('current-model').textContent='正在读取…';get('settings-form').hidden=false;get('settings-access').hidden=true;get('settings-help').hidden=false;
    message('connection-message','');badge('正在读取');updateControls();
    try {
      const data=await response('model-status');
      if(seq!==requestSequence)return;
      if(!Number.isSafeInteger(data.preferenceRevision)||!Array.isArray(data.environmentVariables))throw Error('无法读取环境变量，请刷新配置。');
      state=data;variables=data.environmentVariables.filter(v=>v&&typeof v.name==='string'&&typeof v.eligible==='boolean');
      const eligible=variables.filter(v=>v.eligible);
      get('key-source').innerHTML=eligible.length?eligible.map(v=>`<option value="${E(v.name)}">${E(v.name)}</option>`).join(''):'<option value="">暂无可用的密钥变量</option>';
      get('key-source').value=eligible.some(v=>v.name===data.selectedSource)?data.selectedSource:eligible[0]?.name||'';
      badge(data.keyConfigured?'待测试':'未连接');
      if(!eligible.length)message('connection-message','请在 Sites 中添加 OpenAI API Key 并重新部署，然后刷新配置。');
      await loadPreference(seq);
    } catch(error) {
      if(seq!==requestSequence)return;
      if(error.status===401||error.status===403){
        state=null;variables=[];get('settings-form').hidden=true;get('settings-help').hidden=true;get('settings-access').hidden=false;
        get('settings-access').className='settings-access';
        const signIn=error.status===401;
        get('settings-access').innerHTML=`<h2>${signIn?'登录后连接写作模型':'仅站点负责人可设置模型'}</h2><p>${signIn?'连接和模型选择会保存到你的账号。':'你可以继续浏览创作页面。模型连接由站点负责人管理。'}</p>${signIn?'<a class="button-link primary" target="_top" href="/signin-with-chatgpt?return_to=%2Fapps%2Fnovel-studio%2Fmodel-settings.html">使用 ChatGPT 登录</a>':'<a class="button-link" href="canvas.html">返回创作画布</a>'}`;
        badge(signIn?'未登录':'仅负责人');
      }else{message('connection-message',error.message,'error');badge('读取失败');}
    }finally{if(seq===requestSequence){loading=false;updateControls();}}
  }
  async function testConnection() {
    if(loading||testing||saving||!state)return;
    const source=get('key-source').value,revision=state.preferenceRevision;
    if(!variables.some(v=>v.name===source&&v.eligible))return;
    testing=true;clearModels();badge('连接中');message('connection-message','正在验证连接并读取模型…');
    get('test-connection').innerHTML='<span class="spinner" aria-hidden="true"></span>正在测试';updateControls();
    try {
      const data=await response('model-connection',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source,expectedRevision:revision})});
      if(data.connected!==true||data.selectedSource!==source||!Number.isSafeInteger(data.preferenceRevision)||!Array.isArray(data.writingModels))throw Error('连接结果无法确认，请刷新配置。');
      state={...state,selectedSource:source,preferenceRevision:data.preferenceRevision,keyConfigured:true};
      testedSource=source;testedRevision=data.preferenceRevision;
      models=data.writingModels.filter(m=>m&&typeof m.id==='string');
      badge('连接成功',true);
      message('connection-message',`连接成功，已读取 ${models.length} 个可选模型。`,'success');
      get('model-placeholder').hidden=true;get('model-browser').hidden=false;get('model-count').textContent=models.length+' 个模型';
      get('models-note').textContent=(data.truncated?'模型列表未完整返回。':'')+'已排除明确不适用于文字写作的模型；实际可调用性以生成结果为准。';
      try{await loadPreference()}catch(error){preference=null;get('current-model').textContent='暂时无法读取';message('model-message',error.message,'error');}
      const previous=preference?.stale?'':preference?.model||preference?.fallbackModel||'';
      selected=models.some(m=>m.id===previous)?previous:'';
      drawModels();
    }catch(error){
      const rejected=error.connectionUnchanged||Number.isInteger(error.status)&&error.status>=400&&error.status<500&&error.status!==408;
      badge(rejected?'连接失败':'结果待确认');
      message('connection-message',rejected?error.message+' 当前连接未被此操作替换。':'测试结果未能确认，请刷新配置查看当前连接。','error');
      if(!rejected)state=null;
      if(error.status===409){state=null;message('connection-message','连接设置已在另一处更新，请刷新配置后再试。','error')}
    }
    finally{testing=false;get('test-connection').textContent='测试连接';updateControls();}
  }
  async function saveDefault() {
    if(loading||testing||saving||!preference||!state||testedSource!==get('key-source').value||testedRevision!==state.preferenceRevision||!models.some(m=>m.id===selected))return;
    saving=true;const model=selected;message('model-message','正在保存…');get('save-model').textContent='正在保存';updateControls();
    try {
      const data=await response('model-preference',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model,expectedRevision:preference.revision,expectedSourceRevision:testedRevision})});
      if(data.stale||data.model!==model||data.sourceRevision!==testedRevision||!Number.isSafeInteger(data.revision))throw Error('保存结果无法确认，请刷新配置。');
      preference=data;get('current-model').textContent=model;message('model-message','已保存。新建创作会默认使用此模型。','success');drawModels();
    }catch(error){message('model-message',error.message,'error');if(error.status===409){testedRevision=null;preference=null;}}
    finally{saving=false;get('save-model').textContent='保存默认模型';updateControls();}
  }
  get('refresh').addEventListener('click',initialize);
  get('test-connection').addEventListener('click',testConnection);
  get('key-source').addEventListener('change',()=>{clearModels();badge('待测试');message('connection-message','测试成功后会保存此连接。');});
  get('model-search').addEventListener('input',drawModels);
  get('model-list').addEventListener('click',event=>{if(testing||saving)return;const item=event.target.closest('[data-model-id]');if(!item||!models.some(m=>m.id===item.dataset.modelId))return;selected=item.dataset.modelId;message('model-message','');drawModels();});
  get('save-model').addEventListener('click',saveDefault);
  window.addEventListener('beforeunload',event=>{if(testing||saving){event.preventDefault();event.returnValue='';}});
  window.HubBeforeLeave=()=>!testing&&!saving;
  window.HubCancelLeave=()=>{};
  void initialize();
})();
