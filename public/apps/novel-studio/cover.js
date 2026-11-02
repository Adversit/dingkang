(() => {
 if(!window.customElements||customElements.get('novel-cover'))return;
 const node=(tag,text='',klass='')=>{const n=document.createElement(tag);if(text)n.textContent=text;if(klass)n.className=klass;return n};
 const matches=id=>typeof id==='string'&&/^gpt-image-[1-9]\d*(?:\.\d+)?(?:-[a-z0-9]+)*$/.test(id)&&!/(?:-edit|-inpaint|-preview-only)$/.test(id);
 customElements.define('novel-cover',class extends HTMLElement {
   connectedCallback(){
     this.currentURL='';this.previewURL='';this.etag=null;this.candidate=null;this.busy=false;this.active=true;
     this.account=this.dataset.account;this.titleText=this.dataset.title||'小说';this.api='/api/m/novel-studio/cover?project='+encodeURIComponent(this.dataset.project);
     this.draw();this.read();
   }
   disconnectedCallback(){this.active=false;for(const u of [this.currentURL,this.previewURL])if(u)URL.revokeObjectURL(u)}
   draw(){
     this.innerHTML='<figure class="cover-face"><img alt="作品封面" hidden><span class="cover-placeholder" aria-hidden="true"></span></figure><div class="cover-controls"><h3>作品封面</h3><button type="button" class="cover-toggle" aria-expanded="false">设置封面</button> <a class="cover-download" download hidden>下载图片</a><p class="cover-status" role="status"></p></div><section class="cover-edit" hidden><label>上传图片<input type="file" accept="image/png,image/jpeg"></label><label>粘贴封面图片<textarea class="cover-paste" rows="1" placeholder="先复制图片，点这里按 ⌘V 或 Ctrl+V" autocomplete="off" spellcheck="false"></textarea></label><p class="cover-hint">PNG、JPEG，最多 6 MB。图片单独保存，不包含在文字备份中。</p><details><summary>用模型画封面</summary><label>图像模型<select><option value="">先读取可选图像模型</option></select></label><button type="button" class="cover-models">读取模型</button><label>画面描述<textarea class="cover-brief" rows="4" maxlength="1800"></textarea></label><button type="button" class="cover-generate">生成候选封面</button><p class="cover-hint">单张按所选模型计费，可能需要数分钟。只发送画面描述；超时不会自动重试。</p></details><div class="cover-pending" hidden><strong>待采用的封面</strong><img alt="候选封面"><div><button type="button" class="cover-save">采用这张封面</button><button type="button" class="cover-discard">放弃候选</button></div></div><button type="button" class="cover-refresh">刷新已保存封面</button></section>';
     const q=s=>this.querySelector(s);q('.cover-placeholder').textContent=this.titleText;q('.cover-brief').value='为中文小说《'+this.titleText+'》绘制竖版实体书封面，画面风格与主题统一，标题清晰。';
     q('.cover-download').download=this.titleText+'-封面';q('.cover-toggle').onclick=()=>{const pane=q('.cover-edit');pane.hidden=!pane.hidden;q('.cover-toggle').setAttribute('aria-expanded',String(!pane.hidden))};
     const supported=f=>f&&['image/png','image/jpeg'].includes(f.type);
     const offer=f=>{if(!supported(f)||!f.size||f.size>6*1024*1024){this.notice('请选择 6 MB 内的 PNG 或 JPEG 图片。');return}this.candidatePhoto(f);this.notice('候选图片已就绪，预览后点“采用这张封面”。')};
     q('input').onchange=()=>{const f=q('input').files?.[0];if(f)offer(f);q('input').value=''};
     const paste=q('.cover-paste');
     paste.oninput=()=>{paste.value=''};
     paste.onpaste=e=>{e.preventDefault();if(this.busy||!this.active||q('.cover-edit').hidden)return;
       const dt=e.clipboardData;let photo=null;
       for(const item of Array.from(dt?.items||[])){if(item.kind!=='file')continue;const file=item.getAsFile?.();if(supported(file)){photo=file;break}}
       photo=photo||Array.from(dt?.files||[]).find(supported);
       if(photo)offer(photo);else this.notice('没有收到 PNG 或 JPEG 图片。请复制图片本身，或使用上传图片。');
     };
     q('.cover-models').onclick=()=>this.run(async()=>{const rsp=await fetch('/api/m/novel-studio/models',{headers:this.headers(),cache:'no-store'});const v=await rsp.json();if(!rsp.ok)throw Error(v.error||'读取图像模型失败');if(!this.active)return;
       const select=q('select');select.replaceChildren(node('option','请选择图像模型'));select.options[0].value='';const choices=(v.models||[]).filter(x=>matches(x.id));for(const m of choices){const o=node('option',m.id);o.value=m.id;select.append(o)}this.notice(choices.length?'已读取 '+choices.length+' 个候选模型。':'当前连接没有返回兼容的 GPT 图像模型，仍可上传图片。');});
     q('.cover-generate').onclick=()=>this.run(async()=>{const model=q('select').value,prompt=q('.cover-brief').value.trim();if(!matches(model)||!prompt)throw Error('请选择图像模型并填写画面描述。');this.notice('正在生成一张封面，请保持页面打开…');
       const r=await fetch(this.api,{method:'POST',headers:this.headers({'Content-Type':'application/json'}),body:JSON.stringify({model,prompt})});
       if(!r.ok)throw Error((await r.json().catch(()=>({}))).error||'生成中断，请先检查用量。');const f=await r.blob();if(!this.active)return;this.candidatePhoto(f);this.notice('已收到模型绘制的候选封面。');});
     q('.cover-save').onclick=()=>this.run(async()=>{if(!this.candidate||!this.etag)throw Error('请刷新封面后再采用。');
       const r=await fetch(this.api,{method:'PUT',headers:this.headers({'Content-Type':this.candidate.type,'X-Cover-Version':this.etag}),body:this.candidate});const v=await r.json().catch(()=>({}));
       if(!r.ok)throw Error(v.error||'未能确认保存，请刷新后核对。');if(!this.active)return;this.showStored(this.candidate,v.etag);this.candidatePhoto(null);this.notice('封面已保存。');});
     q('.cover-refresh').onclick=()=>this.read();q('.cover-discard').onclick=()=>{this.candidatePhoto(null);this.notice('候选已放弃。')};
   }
   headers(extra={}){return {'X-Hub-User-Id':this.account,...extra}}
   notice(message){if(this.active)this.querySelector('.cover-status').textContent=message}
   async run(job){if(this.busy||!this.active)return;this.busy=true;this.querySelectorAll('button,input,textarea,select').forEach(e=>e.disabled=true);try{await job()}catch(e){this.notice(e?.message||'操作失败，请稍后再试。')}finally{this.busy=false;if(this.active)this.querySelectorAll('button,input,textarea,select').forEach(e=>e.disabled=false)}}
   async read(){return this.run(async()=>{const r=await fetch(this.api+'&meta=1',{headers:this.headers(),cache:'no-store'});const v=await r.json();if(!r.ok)throw Error(v.error||'无法读取封面。');if(!v.exists){if(this.active)this.showStored(null,'none');return}
       const image=await fetch(this.api,{headers:this.headers(),cache:'no-store'});if(!image.ok)throw Error('读取封面失败。');const file=await image.blob(),etag=image.headers.get('etag');if(this.active)this.showStored(file,etag);});}
   showStored(blob,etag){if(this.currentURL)URL.revokeObjectURL(this.currentURL);this.currentURL=blob?URL.createObjectURL(blob):'';this.etag=etag;const img=this.querySelector('.cover-face img'),placeholder=this.querySelector('.cover-placeholder'),link=this.querySelector('.cover-download');img.hidden=!blob;placeholder.hidden=!!blob;link.hidden=!blob;if(blob){img.src=this.currentURL;link.href=this.currentURL}else{img.removeAttribute('src');link.removeAttribute('href')}if(blob)link.download=this.titleText+'-封面.'+(blob.type==='image/jpeg'?'jpg':'png');this.querySelector('.cover-toggle').textContent=blob?'更换封面':'设置封面';}
   candidatePhoto(f){if(this.previewURL)URL.revokeObjectURL(this.previewURL);this.previewURL=f?URL.createObjectURL(f):'';this.candidate=f;this.querySelector('.cover-pending').hidden=!f;const image=this.querySelector('.cover-pending img');if(f)image.src=this.previewURL;else image.removeAttribute('src');}
 });
})();
