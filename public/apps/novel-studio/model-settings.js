(() => {
  'use strict';
  const state=document.getElementById('state'),refresh=document.getElementById('refresh'),select=document.getElementById('key-source'),save=document.getElementById('save-source'),disable=document.getElementById('disable-existing'),message=document.getElementById('source-message');
  let revision=null,current=null,sources=null;
  const row=(label,value,ok)=>{let el=document.createElement('div');el.className='status-row';let title=document.createElement('span');title.textContent=label;let detail=document.createElement('strong');detail.className=ok?'ok':'missing';detail.textContent=value;el.append(title,detail);return el};
  async function check(){
    refresh.disabled=true;save.disabled=true;disable.disabled=true;state.replaceChildren();let progress=document.createElement('p');progress.textContent='正在读取配置状态…';state.append(progress);
    try{
      const res=await fetch('/api/m/novel-studio/model-status',{cache:'no-store'}),data=await res.json().catch(()=>null);
      if(!res.ok)throw Error(data?.error||'无法读取配置状态。');
      if(!data||typeof data.keyConfigured!=='boolean'||typeof data.modelConfigured!=='boolean'||!['NOVEL_OPENAI_API_KEY','OPENAI_CHATGPT'].includes(data.selectedSource)||!Number.isSafeInteger(data.preferenceRevision))throw Error('状态响应格式不正确。');
      current=data.selectedSource;revision=data.preferenceRevision;sources=data.sources;select.value=current;save.disabled=false;disable.disabled=current!=='OPENAI_CHATGPT';
      state.replaceChildren(row('当前密钥来源',current,true),row('所选 Secret',data.keyConfigured?'已读取到配置':'未配置',data.keyConfigured));
      state.append(row('NOVEL_OPENAI_MODEL',data.modelConfigured?(data.model||'已配置，名称无法显示'):'未配置',data.modelConfigured));
      let note=document.createElement('p');note.className='small';note.textContent=data.keyConfigured?'仅确认有值，尚未验证它是否是可用的 OpenAI Key 或模型权限。':'所选来源未配置；请设置 Secret 并重新部署，或选择另一个来源。';state.append(note);
    }catch(e){revision=null;current=null;sources=null;state.replaceChildren();let m=document.createElement('p');m.className='failure';m.textContent=e.message||'无法读取配置状态。';state.append(m)}finally{refresh.disabled=false}
  }
  async function choose(source){
    if(revision===null)return;
    if(source==='OPENAI_CHATGPT'&&!sources?.OPENAI_CHATGPT){message.textContent='当前部署中没有该 Secret，请先配置并部署。';return}
    const prompt=source==='OPENAI_CHATGPT'?'确认你已知道 OPENAI_CHATGPT 是你自己的 OpenAI API Key，并同意小说模块将其用于向 OpenAI 发起可能计费的请求？':'停止复用 OPENAI_CHATGPT，改用小说专用变量？如果该变量未配置，模型调用将不可用。';
    if(!confirm(prompt))return;
    save.disabled=true;disable.disabled=true;message.textContent='正在保存选择…';
    try{
      const res=await fetch('/api/m/novel-studio/model-status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source,expectedRevision:revision})}),data=await res.json().catch(()=>null);
      if(!res.ok)throw Error(data?.error||'保存失败。');
      message.textContent='已保存来源选择。没有发起模型请求；请在写作时选择模型并预览输入。';await check();
    }catch(e){message.textContent=e.message||'保存失败。';await check()}
  }
  refresh.addEventListener('click',check);save.addEventListener('click',()=>choose(select.value));disable.addEventListener('click',()=>choose('NOVEL_OPENAI_API_KEY'));check();
})();
