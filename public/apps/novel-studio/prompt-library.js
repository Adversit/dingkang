(() => {
'use strict';
const base='prompt-sources/', {shell,escape:E}=window.NovelStudio;
const roles=['全部','规划','正文','提取','审阅'];
let catalog=[],role='全部';
const mount=document.querySelector('#root');
mount.innerHTML=shell({active:'promptSources',title:'提示词资料库',content:`<section class="pr-wrap"><header><h1>提示词资料库</h1><p>已下载的上游原件与本站参考用法。另可查看本站第 41 版的原始角色提示词。浏览、复制和下载都不会替换你在画布中写好的角色提示词。</p></header><div class="pr-actions"><a class="pr-main-download" href="${base}novel-prompt-sources.zip" download>下载全部原件与许可证</a><a href="workflow-research.html">开源流程对照</a><a href="canvas.html">回到创作画布</a></div><details class="pr-legacy"><summary>本站第 41 版 · 升级前的内置提示词</summary><div id="old-prompts"><p>读取中…</p></div><a href="prompt-sources/v41-role-prompts.zip" download>下载旧版原词</a></details><h2>开源原件</h2><div class="pr-filter" aria-label="按角色筛选">${roles.map((r,i)=>'<button type="button" data-role="'+r+'" aria-pressed="'+(i===0)+'">'+r+'</button>').join('')}</div><p class="pr-status" role="status">正在读取本地原件…</p><ul class="pr-list"></ul></section>`});
const safeFile=v=>typeof v==='string'&&/^[a-zA-Z0-9._-]+$/.test(v);
const status=msg=>{mount.querySelector('.pr-status').textContent=msg};
function item(e){
  if(!safeFile(e.file)||!safeFile(e.licenseFile)||!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/blob\/[a-f0-9]{40}\//.test(e.url))return '';
  const original=e.prompt?'<h3>上游系统词</h3><pre>'+E(e.prompt)+'</pre>':'<p class="pr-note">这是上游创作规程；原文可在下方下载。</p>';
  return `<li class="pr-entry"><div class="pr-title"><span class="pr-kind">${E(e.role)}</span><h2>${E(e.title)}</h2></div><p>${E(e.usage)}</p><p class="pr-origin">${E(e.project)} · ${E(e.license)} · © ${E(e.attribution)} · <code>${E(e.commit.slice(0,8))}</code></p><details><summary>查看提示词与本站用法</summary>${original}<h3>本站参考写法</h3><p class="pr-use">${E(e.adaptation)}</p><button class="pr-copy" type="button" data-copy="${E(e.id)}">复制本站参考写法</button></details><div class="pr-links"><a href="${base}${E(e.file)}" download>下载原件</a><a href="${E(e.url)}" target="_blank" rel="noopener noreferrer">固定版本来源</a><a href="${base}${E(e.licenseFile)}" download>许可证</a></div></li>`;
}
function paint(){const shown=catalog.filter(e=>role==='全部'||e.role===role);mount.querySelector('.pr-list').innerHTML=shown.map(item).join('');status(`共 ${shown.length} 项`);for(const b of mount.querySelectorAll('[data-role]'))b.setAttribute('aria-pressed',String(b.dataset.role===role));}
mount.addEventListener('click',async ev=>{const b=ev.target.closest('button');if(!b)return;if(b.dataset.role&&roles.includes(b.dataset.role)){role=b.dataset.role;paint();return}if(b.dataset.copy){const entry=catalog.find(row=>row.id===b.dataset.copy);if(!entry)return;try{await navigator.clipboard.writeText(entry.adaptation);status('已复制。可在画布对应角色的写作要求后粘贴。')}catch{status('剪贴板不可用，可在“本站参考写法”中选择文字复制。')}}});
fetch(base+'v41-manifest.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(rows=>{mount.querySelector('#old-prompts').innerHTML=rows.map(e=>{if(!safeFile(e.file)||!/^https:\/\/github\.com\/Adversit\/dingkang\/blob\/[a-f0-9]{40}\//.test(e.source))return '';return `<details class="pr-entry"><summary>${E(e.title)}</summary><p>${E(e.note)}</p><pre>${E(e.prompt)}</pre><div class="pr-links"><a href="${base}${E(e.file)}" download>下载原词</a><a href="${E(e.source)}" target="_blank" rel="noopener noreferrer">查看旧版源码</a></div></details>`}).join('')}).catch(()=>{mount.querySelector('#old-prompts').textContent='旧版提示词暂未载入，仍可下载。'});
fetch(base+'manifest.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(rows=>{catalog=rows;paint()}).catch(()=>status('资料目录未能加载。仍可下载完整原件与许可证。'));
})();
