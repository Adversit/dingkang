(() => {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const paths = {
    canvas: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><path d="M14 6h4a2 2 0 0 1 2 2v2M4 14v3a2 2 0 0 0 2 2h4"/>',
    library: '<path d="M4 5h6a3 3 0 0 1 3 3v13a4 4 0 0 0-4-3H4zM13 8a3 3 0 0 1 3-3h4v13h-3a4 4 0 0 0-4 3"/>',
    write: '<path d="m14 4 6 6M4 20l5-1L21 7a2 2 0 0 0-4-4L5 15zM13 20h8"/>',
    knowledge: '<circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="18" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="m10.5 7-4 8m7-8 4 8M8 18h8"/>',
    review: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6m-12 6 3 3 5-6"/>',
    settings: '<path d="M4 7h8m4 0h4M4 17h3m4 0h9"/><circle cx="14" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    hub: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'
  };
  const icon = name => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.library}</svg>`;
  const links = [
    ['canvas','创作画布','canvas.html'],
    ['library','我的作品','consistency.html?view=overview'],
    ['write','正文编辑','consistency.html?view=write'],
    ['knowledge','设定资料','consistency.html?view=records'],
    ['review','审阅修订','consistency.html?view=check'],
    ['settings','模型设置','model-settings.html']
  ];
  function shell({active='canvas',content='',title='',actions='',status=''}={}) {
    return `<div class="studio-shell"><a class="studio-skip" href="#studio-content">跳到主要内容</a><aside class="studio-sidebar"><a class="studio-brand" href="canvas.html" data-studio-nav><span class="studio-brand-mark" aria-hidden="true">${icon('write')}</span><span>AI 小说创作</span></a><nav class="studio-nav" aria-label="小说创作导航">${links.map(([id,label,href])=>`<a href="${href}" data-studio-nav class="studio-nav-link${id===active?' is-active':''}"${id===active?' aria-current="page"':''}>${icon(id)}<span>${label}</span></a>`).join('')}</nav><div class="studio-sidebar-bottom"><a href="/" target="_top" class="studio-hub-link" data-studio-hub data-studio-action="hub">${icon('hub')}<span>工作空间</span></a></div></aside><div class="studio-main"><header class="studio-topbar"><span class="studio-page-name">${escape(title || links.find(x=>x[0]===active)?.[1] || '')}</span><div class="studio-topbar-actions">${status}${actions}</div></header><main id="studio-content" class="studio-content" tabindex="-1">${content}</main></div></div>`;
  }
  document.addEventListener('click', event => {
    const hub = event.target.closest?.('[data-studio-hub]');
    if (!hub || window.parent === window || event.defaultPrevented) return;
    event.preventDefault();
    window.parent.postMessage({type:'hub:open-menu',moduleId:'novel-studio'},location.origin);
  });
  window.NovelStudio = Object.freeze({shell,icon,escape});
})();
