'use strict';
// Loaded before the application. Server-provided state is the sole account data source.
window.AccountSync=(()=>{
  const boot=window.ACCOUNT_BOOTSTRAP;
  if(!boot)return null; // Static local preview only; production never serves an unguarded app page.
  let revision=boot.revision, timer, pending=null, saving=false, failed=false, conflict=false, inFlight=null, expired=false;
  const lang=(zh,en)=>document.documentElement.lang==='en'?en:zh;
  const message=()=>conflict?lang('其他窗口已更新。请下载当前备份，再刷新页面。','Another window changed this workspace. Download a backup before refreshing.')
    :expired?lang('登录已过期。请下载当前备份，再重新登录。','Your session expired. Download a backup before signing in again.')
    :failed?lang('保存失败，修改仍在当前页面。请重试或下载备份。','Save failed. Changes remain on this page. Retry or download a backup.')
    :saving?lang('正在保存…','Saving…')
    :pending?lang('有修改待保存','Changes waiting to save')
    :lang('已同步到你的账号','Synced to your account');
  const show=()=>{
    const label=document.querySelector('#save-label'),status=document.querySelector('#account-sync-status'),button=document.querySelector('#account-control');
    if(label)label.textContent=message();if(status)status.textContent=message();
    if(button){button.textContent=lang('我的账号','Account')+(failed||conflict?' · '+lang('保存需处理','Save needs attention'):'');button.title=message();button.dataset.syncIssue=failed||conflict?'true':'false';}
  };
  async function flush(){
    clearTimeout(timer);if(inFlight)return inFlight;if(conflict)return false;if(!pending)return !failed;
    inFlight=(async()=>{
      saving=true;
      try{
        while(pending&&!conflict){
          const data=pending;pending=null;show();
          try{
            const response=await fetch('/api/m/ai-dev-collaboration-workbench/workspace',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision,data}),credentials:'same-origin'});
            if(!response.ok){conflict=response.status===409;expired=response.status===401;throw new Error('save_failed');}
            revision=(await response.json()).revision;failed=false;expired=false;
          }catch{pending=pending||data;failed=true;break;}
        }
      }finally{saving=false;show();}
      return !pending&&!failed&&!conflict;
    })();
    try{return await inFlight;}finally{inFlight=null;}
  }
  function queue(data){pending=structuredClone(data);show();clearTimeout(timer);if(!conflict)timer=setTimeout(flush,500);}
  function decorate(){
    if(document.querySelector('#account-control')){show();return;}
    const host=document.querySelector('.toolbar-right')||document.querySelector('.home-actions');if(!host)return;
    const button=document.createElement('button');button.id='account-control';button.textContent=language==='zh'?'我的账号':'Account';button.className='text-button';button.title=boot.user.email;
    button.onclick=()=>{
      showDialog(language==='zh'?'我的账号':'My account',`<p>${esc(boot.user.name)}</p><p>${esc(boot.user.email)}</p><p id="account-sync-status" role="status" aria-live="polite"></p><p>${L('项目按账号保存。管理员可为排障与产品改进只读查看，访问会记录；不读取 ChatGPT 聊天记录。','Projects are saved by account. Administrator reads for troubleshooting and improvements are logged; ChatGPT conversations are not accessed.')}</p><button type="button" id="retry-account-save">${L('重试保存','Retry save')}</button> <button type="button" id="download-account-backup">${L('下载当前工作区备份','Download workspace backup')}</button> <button type="button" id="import-local-projects">${L('导入旧浏览器项目','Import legacy browser projects')}</button>${boot.isAdmin?`<p><a href="/m/ai-dev-collaboration-workbench/admin">${L('管理后台','Admin')}</a></p>`:''}<p><a id="account-signout" href="/signout-with-chatgpt?return_to=%2Fm%2Fai-dev-collaboration-workbench" target="_top">${L('退出登录','Sign out')}</a></p>`,()=>{});
      show();document.querySelector('#retry-account-save').onclick=flush;
      document.querySelector('#download-account-backup').onclick=()=>{
        const url=URL.createObjectURL(new Blob([JSON.stringify(storeData,null,2)],{type:'application/json;charset=utf-8'}));
        const link=document.createElement('a');link.href=url;link.download='ai-development-workspace-backup.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1200);
      };
      document.querySelector('#import-local-projects').onclick=()=>{
        let saved;try{saved=JSON.parse(localStorage.getItem('adc-projects-v2'));}catch{}
        if(!saved||!ADCCore.validateStore(saved)){toast('没有可导入的旧项目','No legacy projects to import');return;}
        let count=0;saved.projects.forEach(p=>{if(!storeData.projects.some(v=>v.id===p.id)){storeData.projects.push(structuredClone(p));count++;}});
        persist(true);render();toast(`已导入 ${count} 个项目；原浏览器备份仍保留`,`Imported ${count} projects; legacy backup retained`);
      };
      document.querySelector('#account-signout').onclick=async e=>{e.preventDefault();if(await flush()){location.assign('/signout-with-chatgpt?return_to=%2Fm%2Fai-dev-collaboration-workbench');}else toast('尚有未保存修改，请先重试或导出备份','Unsaved changes remain; retry or export first');};
    };
    host.prepend(button);if(boot.isAdmin){const link=document.createElement('a');link.href='/m/ai-dev-collaboration-workbench/admin';link.textContent=L('管理后台','Admin');link.className='text-button admin-shortcut';host.prepend(link);}show();
  }
  window.addEventListener('beforeunload',e=>{if(pending||saving){e.preventDefault();e.returnValue='';}});
  window.addEventListener('online',()=>{if(failed&&!conflict)flush();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)flush();});
  return {boot,queue,flush,decorate};
})();
