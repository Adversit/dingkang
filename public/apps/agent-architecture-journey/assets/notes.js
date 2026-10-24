(async()=>{
  await window.HubStorage.ready;
  const readingKey = 'agent-reading-position';
  let savedPosition; try { savedPosition = JSON.parse(localStorage.getItem(readingKey) || 'null'); } catch {}
  const currentPath = location.pathname + location.search;
  if(savedPosition?.path === currentPath && !location.hash) requestAnimationFrame(()=>scrollTo(0,savedPosition.scroll || 0));
  let saveTimer; const rememberPosition=()=>{clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{localStorage.setItem(readingKey,JSON.stringify({path:currentPath,scroll:scrollY,updatedAt:new Date().toISOString()}));}catch{}},600)};
  addEventListener('scroll',rememberPosition,{passive:true});addEventListener('pagehide',()=>{try{localStorage.setItem(readingKey,JSON.stringify({path:currentPath,scroll:scrollY,updatedAt:new Date().toISOString()}));}catch{}});
  const $=(s,scope=document)=>scope.querySelector(s);
  const toast=(message)=>{const node=$('#toast');if(!node)return;node.textContent=message;node.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>node.classList.remove('show'),1800)};
  const progress=()=>{const max=document.documentElement.scrollHeight-window.innerHeight;const node=$('#progress');if(node)node.style.width=(max>0?window.scrollY/max*100:0)+'%'};
  window.addEventListener('scroll',progress,{passive:true});window.addEventListener('resize',progress);progress();
  const menu=$('#chapter-menu');if(menu)menu.addEventListener('click',()=>{const target=$('#chapter-drawer'),open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));target.hidden=!open});
  const loadPanel=async(panel)=>{if(panel.dataset.loaded)return;panel.dataset.loaded='loading';const target=$('.code-loading',panel);try{const response=await fetch('/apps/agent-architecture-journey/assets/code/'+encodeURIComponent(panel.dataset.code)+'.html');if(!response.ok)throw Error('HTTP '+response.status);target.outerHTML=await response.text();panel.dataset.loaded='true';progress()}catch(error){panel.dataset.loaded='';target.textContent='代码加载失败。收起后重新展开可重试。'}};
  document.querySelectorAll('details[data-code]').forEach(panel=>panel.addEventListener('toggle',()=>{if(panel.open)loadPanel(panel);progress()}));
  if(location.hash){const target=document.getElementById(decodeURIComponent(location.hash.slice(1)));if(target){let parent=target.closest('details');while(parent){parent.open=true;parent=parent.parentElement.closest('details')}if(target.matches('details[data-code]'))target.open=true;}}
  document.addEventListener('click',async ev=>{const btn=ev.target.closest('button[data-copy]');if(!btn)return;try{const r=await fetch('/apps/agent-architecture-journey/assets/code/'+encodeURIComponent(btn.dataset.copy)+'.txt');if(!r.ok)throw Error();await navigator.clipboard.writeText(await r.text());toast('代码已复制')}catch{toast('复制失败，请手动选中代码')}});
  const escapeText=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const codeList=$('#code-list');
  if(codeList){
    fetch('/apps/agent-architecture-journey/assets/code-index.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(items=>{
      const grouped=new Map();for(const item of items){const key=item.stage+':'+item.chapter;if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(item)}
      codeList.innerHTML=[...grouped].map(([key,list])=>'<div class="code-group">'+escapeText(list[0].stage+' · '+list[0].chapterTitle)+'</div>'+list.map(item=>'<a href="?file='+encodeURIComponent(item.id)+'" data-id="'+item.id+'">'+escapeText(item.title)+'</a>').join('')).join('');
      const select=async(id)=>{const item=items.find(x=>x.id===id)||items[0];if(!item)return;history.replaceState({},'','?file='+encodeURIComponent(item.id));codeList.querySelectorAll('a').forEach(a=>a.classList.toggle('active',a.dataset.id===item.id));$('#code-title').textContent=item.title;$('#code-chapter').textContent=item.stage+' · '+item.chapterTitle+' · '+item.lines+' 行';$('#back-chapter').href=item.route+'#'+item.id;$('#copy-current').disabled=true;const target=$('#code-content');target.innerHTML='<p>正在加载代码…</p>';try{const r=await fetch('/apps/agent-architecture-journey/assets/code/'+encodeURIComponent(item.id)+'.html');if(!r.ok)throw Error();target.innerHTML=await r.text();$('#copy-current').disabled=false;$('#copy-current').dataset.file=item.id}catch{target.innerHTML='<p>加载失败，请重新选择。</p>'}};
      codeList.addEventListener('click',ev=>{const a=ev.target.closest('a[data-id]');if(!a)return;ev.preventDefault();select(a.dataset.id)});
      const params=new URLSearchParams(location.search);const first=items.find(x=>x.stage===params.get('stage')&&(params.get('chapter')===null||x.chapter===params.get('chapter')))||items.find(x=>x.chapter===params.get('chapter'));select(params.get('file')||first?.id);
    }).catch(()=>{codeList.innerHTML='<p>代码目录暂时无法加载，请刷新重试。</p>'});
    $('#copy-current').addEventListener('click',async ev=>{try{const r=await fetch('/apps/agent-architecture-journey/assets/code/'+encodeURIComponent(ev.currentTarget.dataset.file)+'.txt');if(!r.ok)throw Error();await navigator.clipboard.writeText(await r.text());toast('代码已复制')}catch{toast('复制失败，请手动选中代码')}});
  }
})();
