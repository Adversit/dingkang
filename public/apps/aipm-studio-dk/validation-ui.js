import { STEPS, ensureFlow, stepStatus, confirmStep, readiness, startCollaboration, recordCollaborationDecision, recordResult, toMarkdown } from './validation-model.js';
import { METHODS, SKILL_RELEASE, METHOD_PACK_URL } from './pm-methods.js';

const escape = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text = value => escape(value || '尚未记录');
const date = value => new Date(value).toLocaleString('zh-CN', {month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'});
const statusText = {draft:'草稿', confirmed:'已确认', stale:'需重新确认'};
const outcomeText = {supported:'本轮证据支持', refuted:'本轮证据不支持', inconclusive:'证据不足'};
const dispositionText = {accepted:'采纳', modified:'修改后采纳', rejected:'拒绝'};
const legacyStage = {idea:'discover', problem:'discover', hypothesis:'define', plan:'validate', result:'validate'};
let context;

export function validationHref(project, step) {
  return `#/validation/${encodeURIComponent(project.id)}/${step || project.validationFlow?.currentStep || 'idea'}`;
}

function selectedStep(flow, requested) {
  const id = requested || flow.currentStep;
  return id === 'result' ? {id, title:'实际结果', description:'执行后再记录。模拟观察和真实反馈分别保存，结论始终对应当时的计划版本。', skillIds:['iterate-retrospective']} : STEPS.find(s => s.id === id) || STEPS[0];
}

function planLabel(flow, id) {
  const plans = flow.revisions.filter(r => r.stepId === 'plan');
  const index = plans.findIndex(r => r.id === id);
  return index >= 0 ? `计划 v${index + 1} · ${date(plans[index].createdAt)}` : '未关联计划';
}

function summary(flow) {
  const check = readiness(flow);
  return `<div class="validation-summary" id="validation-status" aria-live="polite"><span class="tag ${check.ready ? 'green' : 'outline'}">${check.ready ? '计划已确认' : '计划待完善'}</span><span>${check.ready ? '已记录执行要素；是否合理仍需本人检查。可以导出计划，执行后再记录结果。' : escape(check.missing[0] || '从你的初始判断开始。')}</span></div>`;
}

function fieldMarkup(field, value) {
  return `<label class="field"><span class="field-title">${escape(field.label)}${field.required === false ? '<span class="field-hint">选填</span>' : ''}</span><textarea name="${escape(field.id)}" rows="3" maxlength="12000" ${field.required === false ? '' : 'required'} placeholder="${escape(field.placeholder || '')}">${escape(value || '')}</textarea>${field.hint ? `<span class="field-hint">${escape(field.hint)}</span>` : ''}</label>`;
}

function stepForm(project, step, flow) {
  return `<form id="validation-form" data-project="${escape(project.id)}" data-step="${step.id}">${step.fields.map(f => fieldMarkup(f, flow.answers[step.id]?.[f.id])).join('')}<div class="form-bottom"><p>草稿自动保存。确认时填写依据，保存这一版判断。</p><button class="btn primary" type="submit">${step.id === 'plan' ? '确认验证计划' : '确认这一步'}</button></div><div class="form-error" id="validation-error" role="alert"></div></form>`;
}

function resultsForm(project, flow) {
  const plans = flow.revisions.filter(r => r.stepId === 'plan');
  if (!plans.length) return `<div class="validation-empty"><h3>先把计划准备好</h3><p>计划确认后，再执行并记录结果。现在不需要填写任何验证成果。</p><a class="btn" href="${validationHref(project, 'plan')}">继续制定计划</a></div>`;
  const draft = flow.answers.result || {};
  const kind = draft.kind || '';
  const conclusions = kind === 'simulation' ? [['inconclusive','证据不足 · 模拟不能确认真实需求']] : Object.entries(outcomeText);
  return `<form id="validation-result-form" data-project="${escape(project.id)}" data-step="result"><label class="field"><span class="field-title">这次执行的是哪一版计划？</span><select name="planRevisionId" required>${[...plans].reverse().map(r => `<option value="${escape(r.id)}" ${draft.planRevisionId === r.id ? 'selected' : ''}>${escape(planLabel(flow, r.id))}</option>`).join('')}</select><span class="field-hint">后续修改计划不会改写旧版本或它的结果。</span></label><label class="field"><span class="field-title">记录类型</span><select name="kind" required><option value="">请选择实际来源</option><option value="real" ${kind === 'real' ? 'selected' : ''}>真实用户或实际实验</option><option value="simulation" ${kind === 'simulation' ? 'selected' : ''}>模拟用户或情景推演</option></select></label>${fieldMarkup({id:'observations',label:'实际发生了什么？',placeholder:'记录时间、参与人数、任务行为、原话或实际测量值；不要把预期值写成结果。'}, draft.observations)}${fieldMarkup({id:'source',label:'证据来自哪里？',placeholder:'访谈记录、试用记录或原始数据的位置/链接。模拟请注明模型和情景。'}, draft.source)}<label class="field"><span class="field-title">对照原定标准，本轮能得出什么结论？</span><select name="conclusion" required>${conclusions.map(([id,label]) => `<option value="${id}" ${(draft.conclusion || 'inconclusive') === id ? 'selected' : ''}>${label}</option>`).join('')}</select></label>${fieldMarkup({id:'limitations',label:'哪些事情仍不能说明？',placeholder:'样本、招募、干预、测量等限制。小样本探索不能证明普遍需求。'}, draft.limitations)}${fieldMarkup({id:'nextDecision',label:'我决定下一步怎么做，为什么？',placeholder:'继续、调整还是停止？哪些证据改变了你的判断？'}, draft.nextDecision)}<div class="form-bottom"><p>记录保存后保留原文。新的观察可以另加一条。</p><button class="btn primary" type="submit">保存这次结果</button></div><div class="form-error" id="validation-error" role="alert"></div></form>`;
}

function methodPanel(project, step, flow) {
  const methods = METHODS.filter(m => step.skillIds.includes(m.id));
  const records = flow.collaboration.filter(c => c.stepId === step.id);
  return `<aside class="guide-panel validation-guide"><div class="guide-heading">这一步的方法</div><p>先写下自己的判断，再用方法检查遗漏。</p>${methods.map(m => `<details class="method-reference"><summary>${escape(m.title)}</summary><p>${escape(m.purpose)}</p><ul>${m.questions.map(q=>`<li>${escape(q)}</li>`).join('')}</ul><a class="text-link" href="${escape(m.sourceUrl)}" target="_blank" rel="noopener noreferrer">阅读原始 Skill</a></details>`).join('')}<div class="guide-separator"></div><div class="guide-heading">与 ChatGPT 协作</div><p>在自己的 ChatGPT 账号中讨论，模型在 ChatGPT 中选择。回来后记录建议与取舍。</p><button class="btn" data-vaction="prepare" data-project="${escape(project.id)}" data-step="${step.id}">准备协作材料</button><a class="text-link method-pack-link" href="${METHOD_PACK_URL}" download>下载 PM Skills 方法包</a><p class="guide-note">本站不调用模型，也不自动传输项目。方法包是供 ChatGPT 阅读的资料，不会自动安装 Skill。</p>${records.length ? `<div class="guide-separator"></div><div class="guide-heading">本步协作记录</div>${[...records].reverse().map(c => `<div class="collaboration-item"><span>${date(c.createdAt)}</span><small>${c.decisions.length ? `${c.decisions.length} 条取舍` : '待记录建议'}</small><button class="text-link" data-vaction="review" data-project="${escape(project.id)}" data-record="${escape(c.id)}">${c.decisions.length ? '查看或补充判断' : '记录建议与取舍'}</button><button class="text-link" data-vaction="material" data-project="${escape(project.id)}" data-record="${escape(c.id)}">查看当时材料</button></div>`).join('')}` : ''}</aside>`;
}

function history(flow, stepId) {
  const revisions = flow.revisions.filter(r => r.stepId === stepId);
  const collaborations = flow.collaboration.filter(c => c.stepId === stepId && c.decisions.length);
  const results = stepId === 'result' ? flow.results : [];
  if (!revisions.length && !collaborations.length && !results.length) return '';
  return `<section class="validation-history"><h3>${stepId === 'result' ? '已记录的结果' : '判断与版本'}</h3>${[...revisions].reverse().map((r, i) => `<details><summary>本人确认 v${revisions.length-i}<span>${date(r.createdAt)}</span></summary><dl>${Object.entries(r.answers).map(([k,v])=>`<dt>${escape(STEPS.find(s=>s.id===stepId)?.fields.find(f=>f.id===k)?.label || k)}</dt><dd>${text(v)}</dd>`).join('')}<dt>确认依据与取舍</dt><dd>${text(r.reason)}</dd></dl></details>`).join('')}${collaborations.flatMap(c => c.decisions.map(d => `<details><summary>AI 建议 · ${escape(dispositionText[d.disposition])}<span>${date(d.createdAt)}</span></summary><dl><dt>当时我的判断</dt><dd>${escape(snapshotText(c.snapshot))}</dd><dt>AI 建议原文（手动粘贴）</dt><dd>${text(d.response)}</dd><dt>我的最终判断</dt><dd>${text(d.finalJudgment)}</dd><dt>我这样选择的理由</dt><dd>${text(d.reason)}</dd></dl></details>`)).join('')}${[...results].reverse().map(r => `<details open><summary>${r.kind==='real'?'真实记录':'模拟记录'} · ${escape(outcomeText[r.conclusion])}<span>${date(r.createdAt)}</span></summary><p class="field-hint">${escape(planLabel(flow,r.planRevisionId))}</p><dl><dt>实际观察</dt><dd>${text(r.observations)}</dd><dt>来源</dt><dd>${text(r.source)}</dd><dt>解释边界</dt><dd>${text(r.limitations)}</dd><dt>我的下一步决定</dt><dd>${text(r.nextDecision)}</dd></dl></details>`).join('')}</section>`;
}

export function validationView(project, requestedStep) {
  const flow = ensureFlow(project);
  const step = selectedStep(flow, requestedStep);
  const nav = [...STEPS, {id:'result',title:'实际结果'}];
  return `<div class="editor-header"><div><p class="validation-kicker">从想法到验证计划${project.isDemo ? ' · 示例项目' : ''}</p><h1>${escape(project.title)}</h1></div><div class="inline-actions"><button class="btn small" data-vaction="prepare" data-project="${escape(project.id)}" data-step="${step.id}">ChatGPT 协作</button><a class="btn small" href="#/project/${encodeURIComponent(project.id)}">项目全流程</a><button class="btn small" data-vaction="export" data-project="${escape(project.id)}">导出计划与记录</button><button class="btn small" data-action="export" data-id="${escape(project.id)}">备份</button></div></div><nav class="validation-steps" aria-label="验证流程">${nav.map((s,i) => `<a href="${validationHref(project,s.id)}" ${step.id===s.id?'aria-current="step"':''}><span>${i+1}</span><strong>${escape(s.title)}</strong><small data-step-status="${s.id}">${s.id==='result'?(flow.results.length?`${flow.results.length} 条记录`:'执行后填写'):statusText[stepStatus(flow,s.id)]}</small></a>`).join('')}</nav>${summary(flow)}<div class="editor-grid validation-grid"><section class="form-panel"><h2>${escape(step.title)}</h2><p class="stage-intro">${escape(step.description)}</p>${step.id==='result'?resultsForm(project,flow):stepForm(project,step,flow)}${history(flow,step.id)}</section>${methodPanel(project,step,flow)}</div>`;
}

function snapshotText(snapshot) {
  const judgments = STEPS.map(s => `${s.title}\n${s.fields.map(f=>`${f.label}：${snapshot.answers[s.id]?.[f.id] || '尚未记录'}`).join('\n')}`).join('\n\n');
  const labels = {planRevisionId:'执行计划版本 ID',kind:'记录类型',observations:'实际观察',source:'证据来源',conclusion:'本轮结论',limitations:'解释边界',nextDecision:'我的下一步决定'};
  const result = snapshot.answers.result;
  return judgments + (result && Object.keys(result).length ? '\n\n尚未提交的结果草稿\n' + Object.entries(result).map(([key,value]) => `${labels[key] || key}：${value || '尚未填写'}`).join('\n') : '');
}

function buildTask(project, step) {
  const flow = ensureFlow(project);
  return `# ${project.title}：${step.title}\n\n请作为产品研究协作者，使用随附 PM Skills 方法材料帮助我检查这一阶段。若未收到方法包，请说明，只基于下述参考原则讨论，不声称已执行 Skill。\n\n## 协作规则\n- 先区分我的判断、已有证据和未验证假设，不替我虚构访谈、数据或验证结果。\n- 最多先追问三个影响决策的关键问题，再给出备选方案及取舍。\n- 小样本访谈或试用只形成探索性证据，不编造 p 值或统计显著性。\n- 计划写明对象、招募、任务、衡量、成功/失败/证据不足规则、时限、负责人及下一步。\n- 你的建议单独列出，最终决策由我作出。\n\n## 使用的方法\nPM Skills ${SKILL_RELEASE}\n${METHODS.filter(m=>step.skillIds.includes(m.id)).map(m=>`- ${m.title} (${m.id})\n  ${m.questions.join('；')}`).join('\n')}\n\n## 项目背景（用户填写的材料）\n${project.description || '未补充'}\n${project.isDemo?'注意：这是示例项目，不能作为真实用户验证证据。\n':''}\n## 当前判断草稿\n${snapshotText({answers:flow.answers})}\n\n## 结果草稿对应的执行计划快照\n${flow.answers.result?.planRevisionId ? JSON.stringify(flow.revisions.find(r=>r.id===flow.answers.result.planRevisionId)?.answers || {}, null, 2) : '尚未选择；不能用当前草稿代替历史执行计划。'}\n\n## 已记录结果\n${flow.results.length ? flow.results.map(r=>`[${r.kind==='real'?'真实记录':'模拟记录'} / ${planLabel(flow,r.planRevisionId)}] ${r.observations}\n来源：${r.source}\n结论：${outcomeText[r.conclusion]}\n局限：${r.limitations}\n我的下一步：${r.nextDecision}\n当时执行的计划（历史快照，不采用当前草稿）：\n${JSON.stringify(flow.revisions.find(v=>v.id===r.planRevisionId)?.answers || {}, null, 2)}`).join('\n\n') : '尚未执行或记录；不能补写成果。'}\n\n## 请返回\n1. 对我当前判断的质疑及缺失信息\n2. 建议与备选方案，明确各自依据和不确定性\n3. 等我本人选择的决策点\n`;
}

function materialModal(project, record) {
  context.modal('带到 ChatGPT 讨论',`<p class="modal-description">复制以下任务，在 ChatGPT 中粘贴，并上传方法包。本站不会自动打开对话或发送资料。</p><label class="field"><span class="field-title">已保存当时的判断快照</span><textarea id="collaboration-material" rows="10" readonly>${escape(record.taskText)}</textarea></label><div class="inline-actions"><button class="btn primary" data-vaction="copy" data-project="${escape(project.id)}" data-record="${escape(record.id)}">复制协作任务</button><button class="btn" data-vaction="download-task" data-project="${escape(project.id)}" data-record="${escape(record.id)}">下载任务</button><a class="btn" href="${METHOD_PACK_URL}" download>下载方法包</a><a class="text-link" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">打开 ChatGPT</a></div><p class="field-hint" id="copy-status" role="status">可在 ChatGPT 中选择账号当前可用的模型。</p>`,`<div class="modal-actions"><button class="btn" data-action="close">稍后回来</button><button class="btn primary" data-vaction="review" data-project="${escape(project.id)}" data-record="${escape(record.id)}">记录建议与取舍</button></div>`,true);
}

function reviewModal(project, record) {
  context.modal('AI 建议与我的取舍',`<p class="modal-description">建议保留原文。你的决定单独记录，阶段草稿由你自行修改。</p><details class="review-snapshot"><summary>查看讨论前的判断</summary><pre>${escape(snapshotText(record.snapshot))}</pre></details><form id="validation-review-form" data-project="${escape(project.id)}" data-record="${escape(record.id)}">${fieldMarkup({id:'response',label:'ChatGPT 建议原文',placeholder:'粘贴与你本次决定有关的建议。'},'')}<label class="field"><span class="field-title">我的选择</span><select name="disposition" required><option value="">请选择</option><option value="accepted">采纳</option><option value="modified">修改后采纳</option><option value="rejected">拒绝</option></select></label>${fieldMarkup({id:'finalJudgment',label:'我的最终判断',placeholder:'用自己的话写下决定。拒绝时也说明保留什么判断。'},'')}${fieldMarkup({id:'reason',label:'为什么这样选？',placeholder:'依据、替代方案、成本与风险，以及仍未验证的部分。'},'')}<div class="form-error" id="validation-modal-error" role="alert"></div><div class="modal-actions"><button type="button" class="btn" data-action="close">取消</button><button type="submit" class="btn primary">保存我的取舍</button></div></form>`, '', true);
}

function updateStatus(flow) {
  const node = document.querySelector('#validation-status');
  if (node) node.outerHTML = summary(flow);
  for (const s of STEPS) {
    const item = document.querySelector(`[data-step-status="${s.id}"]`);
    if (item) item.textContent = statusText[stepStatus(flow,s.id)];
  }
}

function addDecision(project, stepId, title, before, after, reason) {
  project.decisions.push({id:context.uid(),stageId:legacyStage[stepId],title,before,after,reason,createdAt:new Date().toISOString()});
}

export function bindValidationUI(api) {
  context = api;
  document.addEventListener('input', event => {
    const form = event.target.closest('#validation-form, #validation-result-form');
    if (!form || !event.target.name) return;
    const project = context.project(form.dataset.project);
    const flow = ensureFlow(project);
    flow.currentStep = form.dataset.step;
    flow.answers[form.dataset.step] = Object.fromEntries(new FormData(form));
    context.save(project);
    updateStatus(flow);
  });
  document.addEventListener('change', event => {
    const form = event.target.closest('#validation-result-form');
    if (!form) return;
    const project = context.project(form.dataset.project);
    const flow = ensureFlow(project);
    flow.answers.result = Object.fromEntries(new FormData(form));
    if (event.target.name === 'kind') {
      flow.answers.result.conclusion = 'inconclusive';
      const select = form.elements.conclusion;
      select.innerHTML = (event.target.value==='simulation'?[['inconclusive','证据不足 · 模拟不能确认真实需求']]:Object.entries(outcomeText)).map(([id,label])=>`<option value="${id}" ${id==='inconclusive'?'selected':''}>${label}</option>`).join('');
    }
    context.save(project);
  });
  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-vaction]');
    if (!button) return;
    const project = context.project(button.dataset.project);
    const flow = ensureFlow(project);
    const record = flow.collaboration.find(c=>c.id===button.dataset.record);
    try {
      switch(button.dataset.vaction) {
        case 'export': context.download(`${project.title}-验证计划与判断.md`,toMarkdown(project),'text/markdown;charset=utf-8'); context.toast('计划、版本与判断已导出'); break;
        case 'prepare': {
          if (!flow.answers.idea?.initialJudgment?.trim()) { context.toast('请先写下你的初始判断，保留讨论前的想法。'); context.go('validation',project.id,'idea'); break; }
          const step = selectedStep(flow,button.dataset.step);
          const entry = startCollaboration(project,step.id,buildTask(project,step));
          context.save(project); context.render(); materialModal(project,entry); break;
        }
        case 'material': if(record) materialModal(project,record); break;
        case 'review': if(record) reviewModal(project,record); break;
        case 'download-task': if(record) context.download(`${project.title}-ChatGPT协作任务.md`,record.taskText,'text/markdown;charset=utf-8'); break;
        case 'copy': if(record) {
          try { await navigator.clipboard.writeText(record.taskText); document.querySelector('#copy-status').textContent='已复制。在 ChatGPT 中粘贴，并上传方法包。'; }
          catch { const field=document.querySelector('#collaboration-material'); field?.focus(); field?.select(); document.querySelector('#copy-status').textContent='无法自动复制，已选中文本；请手动复制或下载任务。'; }
        } break;
      }
    } catch(error) { context.toast(error.message); }
  });
  document.addEventListener('submit', event => {
    const form = event.target;
    if (!['validation-form','validation-confirm-form','validation-review-form','validation-result-form'].includes(form.id)) return;
    event.preventDefault();
    const project=context.project(form.dataset.project);
    const flow=ensureFlow(project);
    const data=Object.fromEntries(new FormData(form));
    try {
      if(form.id==='validation-form') {
        flow.answers[form.dataset.step]=data;
        context.save(project);
        const step=selectedStep(flow,form.dataset.step);
        const index=STEPS.findIndex(s=>s.id===step.id);
        const missing=step.fields.filter(f=>f.required!==false&&!data[f.id]?.trim());
        if(missing.length) throw new Error(`请补充：${missing.map(f=>f.label).join('、')}`);
        if(STEPS.slice(0,index).some(s=>stepStatus(flow,s.id)!=='confirmed')) throw new Error('请先确认前面的判断；上游内容修改后，需要重新核对后续步骤。');
        context.modal('确认这一版判断',`<p class="modal-description">${escape(step.title)}。保留草稿快照与确认理由，之后仍可修改并生成新版本。</p><form id="validation-confirm-form" data-project="${escape(project.id)}" data-step="${step.id}">${fieldMarkup({id:'reason',label:'确认依据与取舍',placeholder:'为什么选择这个方向或验证方式？考虑过什么替代方案？还有哪些不确定性？'},'')}<div class="form-error" id="validation-modal-error" role="alert"></div><div class="modal-actions"><button type="button" class="btn" data-action="close">继续编辑</button><button type="submit" class="btn primary">确认并保存版本</button></div></form>`);
      }
      if(form.id==='validation-confirm-form') {
        const stepId=form.dataset.step;
        const previous=flow.revisions.filter(r=>r.stepId===stepId).at(-1);
        const revision=confirmStep(flow,stepId,data.reason);
        addDecision(project,stepId,`确认验证流程 · ${STEPS.find(s=>s.id===stepId).title}`,previous?JSON.stringify(previous.answers,null,2):'首次确认',JSON.stringify(revision.answers,null,2),data.reason.trim());
        const index=STEPS.findIndex(s=>s.id===stepId);
        flow.currentStep=stepId==='plan'?'plan':STEPS[index+1].id;
        const persisted=context.save(project); context.closeModal(); context.go('validation',project.id,flow.currentStep);
        context.toast(persisted?(stepId==='plan'?'验证计划已确认。执行后再到「实际结果」记录。':'判断版本已保存'):'本页已保留内容，请立即导出备份。');
      }
      if(form.id==='validation-review-form') {
        const entry=flow.collaboration.find(c=>c.id===form.dataset.record);
        const decision=recordCollaborationDecision(flow,form.dataset.record,data);
        addDecision(project,entry.stepId,`AI 建议 · ${dispositionText[decision.disposition]}`,snapshotText(entry.snapshot),decision.finalJudgment,decision.reason);
        const persisted=context.save(project); context.closeModal(); context.render(); context.toast(persisted?'取舍已保存。需要调整阶段内容时，请自行修改草稿并确认。':'取舍暂存在本页，请导出备份。');
      }
      if(form.id==='validation-result-form') {
        const result=recordResult(flow,data);
        project.evidence.push({id:result.id,stageId:'validate',kind:result.kind,title:`${planLabel(flow,result.planRevisionId)} · ${outcomeText[result.conclusion]}`,detail:`${result.observations}\n来源：${result.source}\n解释边界：${result.limitations}`,url:'',createdAt:result.createdAt});
        addDecision(project,'result','根据验证结果决定下一步',`${planLabel(flow,result.planRevisionId)}\n${result.observations}`,result.nextDecision,`${outcomeText[result.conclusion]}；${result.limitations}`);
        flow.answers.result={};
        const persisted=context.save(project); context.render(); context.toast(persisted?'结果与下一步判断已保存，已关联原计划版本。':'结果暂存在本页，请导出备份。');
      }
    } catch(error) {
      const target=document.querySelector('#validation-modal-error')||document.querySelector('#validation-error');
      if(target) target.textContent=error.message; else context.toast(error.message);
    }
  });
}
