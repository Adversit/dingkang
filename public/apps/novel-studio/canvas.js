(() => {
  'use strict';

  const root = document.querySelector('#root');
  const base = '/api/m/novel-studio/';
  const E = (x) =>
    String(x ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );

  const LAYER_LABELS = {
    world: '世界设定',
    belief: '人物认知',
    speech: '角色台词',
    plan: '剧情伏笔',
    unknown: '待归类',
  };

  let account = '';
  let archive = null;
  let version = 0;
  let projectId = '';
  let sceneId = '';
  let busy = false;
  let dirty = false;
  let loadError = '';

  // Local editor draft state
  let draftTitle = '';
  let draftBody = '';
  let activeRightTab = 'assistant'; // 'assistant' | 'canon' | 'review'

  // AI Assistant state
  let aiInstruction = '';
  let aiStyle = 'general';
  let aiModel = '';
  let defaultModel = '';
  let availableModels = [];
  let aiPreview = null;
  let aiCandidate = '';
  let aiIssues = [];
  let aiNotice = '';

  // Modals
  let modal = ''; // '' | 'new-project' | 'new-scene' | 'new-fact'

  const getProject = () => archive?.projects?.find((p) => p.id === projectId) || archive?.projects?.[0] || null;
  const getScene = () => {
    const p = getProject();
    return p?.scenes?.find((s) => s.id === sceneId) || p?.scenes?.[0] || null;
  };
  const getRevision = () => getScene()?.revisions?.at(-1) || null;

  function headers() {
    return { 'Content-Type': 'application/json', 'X-Hub-User-Id': account };
  }

  function showToast(msg) {
    document.querySelector('.nv-toast')?.remove();
    const el = document.createElement('div');
    el.className = 'nv-toast';
    el.setAttribute('role', 'status');
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  function syncDraftFromScene() {
    const p = getProject();
    if (p && p.id !== projectId) projectId = p.id;
    const s = getScene();
    if (s && s.id !== sceneId) sceneId = s.id;
    draftTitle = s?.title || '';
    draftBody = s?.draft ?? s?.revisions?.at(-1)?.body ?? '';
    dirty = false;
    aiPreview = null;
    aiCandidate = '';
    aiIssues = [];
    aiNotice = '';
  }

  async function loadCanon() {
    const res = await fetch(base + 'canon', {
      cache: 'no-store',
      headers: { 'X-Hub-User-Id': account },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.state || !Array.isArray(data.state.projects)) {
      throw new Error(data?.error || '无法读取小说档案');
    }
    archive = data.state;
    version = data.version;
    if (!archive.projects.some((p) => p.id === projectId)) {
      projectId = archive.projects[0]?.id || '';
    }
    const p = getProject();
    if (!p?.scenes?.some((s) => s.id === sceneId)) {
      sceneId = p?.scenes?.[0]?.id || '';
    }
    syncDraftFromScene();
  }

  async function sendCanonCommand(command, successToast) {
    if (busy) return false;
    busy = true;
    render();
    try {
      const payload = {
        commandId: crypto.randomUUID(),
        expectedVersion: version,
        command,
      };
      const res = await fetch(base + 'canon', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.state) {
        throw new Error(data?.error || `保存失败 (HTTP ${res.status})`);
      }
      archive = data.state;
      version = data.version;
      if (successToast) showToast(successToast);
      return true;
    } catch (err) {
      showToast(err.message || '操作未成功');
      return false;
    } finally {
      busy = false;
      render();
    }
  }

  async function loadModels() {
    try {
      const pr = await fetch(base + 'model-preference', {
        cache: 'no-store',
        headers: { 'X-Hub-User-Id': account },
      });
      const pd = await pr.json().catch(() => null);
      if (pr.ok && pd) {
        defaultModel = pd.model || pd.fallbackModel || '';
      }
    } catch {}
    try {
      const r = await fetch(base + 'models', {
        cache: 'no-store',
        headers: { 'X-Hub-User-Id': account },
      });
      const d = await r.json().catch(() => null);
      if (r.ok && Array.isArray(d?.models)) {
        availableModels = (Array.isArray(d.writingModels) ? d.writingModels : d.models).filter(
          (x) => x && typeof x.id === 'string'
        );
      }
    } catch {}
    render();
  }

  async function handleSaveChapter(commitVersion = false) {
    const p = getProject();
    const s = getScene();
    if (!p || !s) {
      showToast('请先创建一部作品与章节');
      return;
    }
    const title = draftTitle.trim() || s.title || '未命名章节';
    const body = draftBody;
    const savedDraft = await sendCanonCommand(
      {
        type: 'save_draft',
        projectId: p.id,
        sceneId: s.id,
        title,
        body,
      },
      commitVersion ? '' : '章节草稿已保存'
    );
    if (!savedDraft) return;
    dirty = false;

    if (commitVersion) {
      const ok = await sendCanonCommand(
        {
          type: 'save_revision',
          projectId: p.id,
          sceneId: s.id,
          revisionId: crypto.randomUUID(),
          title,
          body,
          summary: `正式版本 v${(s.revisions?.length || 0) + 1}`,
        },
        '已保存为正式章节版本（可用于 AI 续写与设定审阅）'
      );
      if (ok) dirty = false;
    }
    render();
  }

  async function handleRunAIAssistant(mode) {
    // mode: 'draft' | 'review'
    if (busy) return;
    const p = getProject();
    const s = getScene();
    if (!p || !s) {
      showToast('请先创建作品与章节');
      return;
    }
    if (dirty || !getRevision() || getRevision().body !== draftBody || getRevision().title !== draftTitle) {
      await handleSaveChapter(true);
    }
    const rev = getRevision();
    if (!rev) {
      showToast('请先点击「保存并定稿」生成基线版本后再调用 AI');
      return;
    }
    const instruction =
      aiInstruction.trim() ||
      (mode === 'review'
        ? '请检查当前章节正文与已收录设定是否存在人物性格、时间线或世界观冲突。'
        : '请顺着当前章节末尾的情节自然续写下一段场景，注重人物动作与细节张力。');

    busy = true;
    aiNotice = '正在编译上下文与设定集…';
    render();

    try {
      const ctxInput = {
        projectId: p.id,
        sceneId: s.id,
        revisionId: rev.id,
        instruction,
        storyMoment: '1',
        perspective: 'omniscient',
        pov: '',
        factIds: (p.facts || []).slice(0, 30).map((f) => f.id),
        model: aiModel,
        writingProfile: {
          styleId: aiStyle,
          authorConstraints: '',
          revealNow: '',
        },
      };
      const ctxRes = await fetch(base + 'context', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(ctxInput),
      });
      const ctxData = await ctxRes.json().catch(() => null);
      if (!ctxRes.ok || !ctxData?.previewHash) {
        throw new Error(ctxData?.error || '上下文编译失败，请检查模型设置');
      }
      aiPreview = ctxData;
      aiNotice = mode === 'draft' ? '正在调用模型生成续写段落…' : '正在调用模型执行一致性审阅…';
      render();

      const runRes = await fetch(base + mode, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          ...ctxInput,
          previewHash: ctxData.previewHash,
        }),
      });
      const runData = await runRes.json().catch(() => null);
      if (!runRes.ok) {
        throw new Error(runData?.error || `模型调用未完成 (HTTP ${runRes.status})`);
      }

      if (mode === 'draft') {
        aiCandidate = runData?.text || '';
        aiNotice = '已生成候选段落，可一键追加到正文编辑器。';
        showToast('AI 续写候选已生成');
      } else {
        aiIssues = Array.isArray(runData?.issues) ? runData.issues : [];
        aiNotice = aiIssues.length
          ? `审阅完成：发现 ${aiIssues.length} 条潜在设定或逻辑提醒。`
          : '审阅完成：未发现明显的设定冲突。';
        activeRightTab = 'review';
        showToast('AI 一致性审阅已完成');
      }
    } catch (err) {
      aiNotice = err.message || 'AI 调用未成功';
      showToast(aiNotice);
    } finally {
      busy = false;
      render();
    }
  }

  function studioShell(content) {
    const p = getProject();
    const s = getScene();
    const wordCount = Array.from(draftBody || '').length;
    const statusHtml = `
      <span class="nv-top-status">
        ${busy ? '正在同步…' : dirty ? '● 有未保存修改' : '✓ 已同步'}
        · 本章 ${wordCount.toLocaleString('zh-CN')} 字
      </span>
    `;
    const actionsHtml = `
      <a class="nv-top-link" href="consistency.html?view=records">设定档案库</a>
      <a class="nv-top-link" href="prompt-library.html">提示词库</a>
      <a class="nv-top-link" href="model-settings.html">模型设置</a>
    `;
    return window.NovelStudio?.shell
      ? window.NovelStudio.shell({
          active: 'canvas',
          title: p ? `${p.name} · ${s?.title || '创作工作台'}` : 'AI 小说工坊',
          content,
          status: statusHtml,
          actions: actionsHtml,
        })
      : `<main>${content}</main>`;
  }

  function renderView() {
    if (!account || !archive) {
      const signedOut = !account;
      return studioShell(`
        <div class="nv-onboarding">
          <div class="nv-onboarding-card">
            <h2>${signedOut ? '登录以开启 AI 小说工坊' : '暂时无法读取小说档案'}</h2>
            <p>${
              signedOut
                ? '在统一的三栏沉浸式写作台里管理小说章节、人物世界观设定与 AI 续写审阅。'
                : E(loadError || '请检查网络连接后重试。')
            }</p>
            ${
              signedOut
                ? '<a class="nv-btn is-primary" href="/signin-with-chatgpt?return_to=%2Fapps%2Fnovel-studio%2Fcanvas.html" target="_top">登录工作台账号</a>'
                : '<button class="nv-btn is-primary" data-nv-act="reload">重新加载</button>'
            }
          </div>
        </div>
      `);
    }

    const projects = archive.projects || [];
    const p = getProject();
    const scenes = p?.scenes || [];
    const s = getScene();
    const facts = p?.facts || [];
    const rev = getRevision();
    const isRevisionSynced = !!rev && rev.body === draftBody && rev.title === draftTitle;

    return studioShell(`
      <div class="nv-workbench">
        <!-- Column 1: Works & Chapters Directory -->
        <aside class="nv-col-left" aria-label="作品与章节目录">
          <div class="nv-panel-block">
            <div class="nv-block-head">
              <strong>当前作品</strong>
              <button class="nv-btn is-small is-primary" type="button" data-nv-act="open-modal" data-modal="new-project">
                + 新建小说
              </button>
            </div>
            <select id="nv-project-select" class="nv-select" aria-label="切换小说作品">
              ${
                projects.length
                  ? projects
                      .map(
                        (item) =>
                          `<option value="${E(item.id)}" ${item.id === p?.id ? 'selected' : ''}>${E(
                            item.name
                          )} (${item.scenes?.length || 0}章)</option>`
                      )
                      .join('')
                  : '<option value="">尚无作品，请点击右上角新建</option>'
              }
            </select>
          </div>

          <div class="nv-panel-block nv-chapters-block">
            <div class="nv-block-head">
              <strong>章节目录 (${scenes.length})</strong>
              ${
                p
                  ? '<button class="nv-btn is-small" type="button" data-nv-act="open-modal" data-modal="new-scene">+ 新建章节</button>'
                  : ''
              }
            </div>

            ${
              scenes.length === 0
                ? `<div class="nv-empty-small">
                    <p>这部作品还没有章节。</p>
                    ${
                      p
                        ? '<button class="nv-btn is-small is-primary" type="button" data-nv-act="open-modal" data-modal="new-scene">创建第一章</button>'
                        : '<button class="nv-btn is-small is-primary" type="button" data-nv-act="open-modal" data-modal="new-project">创建第一部小说</button>'
                    }
                  </div>`
                : `<div class="nv-chapter-list">
                    ${scenes
                      .map((item, idx) => {
                        const active = item.id === s?.id;
                        const chars = Array.from(item.draft || item.revisions?.at(-1)?.body || '').length;
                        return `
                          <button type="button" class="nv-chapter-item ${active ? 'is-active' : ''}" data-nv-act="select-scene" data-scene-id="${E(item.id)}">
                            <div class="nv-chapter-item-top">
                              <span class="nv-chapter-num">CH.${String(idx + 1).padStart(2, '0')}</span>
                              <span class="nv-chapter-words">${chars} 字</span>
                            </div>
                            <strong>${E(item.title || '未命名章节')}</strong>
                          </button>
                        `;
                      })
                      .join('')}
                  </div>`
            }
          </div>
        </aside>

        <!-- Column 2: Immersive Distraction-Free Chapter Editor -->
        <section class="nv-col-center" aria-label="沉浸式正文编辑器">
          ${
            !p || !s
              ? `<div class="nv-empty-editor">
                  <h2>开始你的小说创作</h2>
                  <p>在左侧新建一部小说作品或章节，即可在此开启沉浸式正文写作与 AI 协同续写。</p>
                  <button class="nv-btn is-primary" type="button" data-nv-act="open-modal" data-modal="${
                    p ? 'new-scene' : 'new-project'
                  }">
                    ${p ? '+ 创建第一章' : '+ 创建新小说作品'}
                  </button>
                </div>`
              : `
                <div class="nv-editor-header">
                  <input
                    id="nv-draft-title"
                    class="nv-title-input"
                    value="${E(draftTitle)}"
                    placeholder="输入章节标题，如：第一章 雨夜来信"
                    maxlength="100"
                  />
                  <div class="nv-editor-actions">
                    <span class="nv-version-badge ${isRevisionSynced ? 'is-synced' : 'is-draft'}">
                      ${
                        isRevisionSynced
                          ? `已定稿 v${s.revisions?.length || 1}`
                          : dirty
                            ? '编辑中（未保存）'
                            : '草稿待定稿'
                      }
                    </span>
                    <button class="nv-btn is-small" type="button" data-nv-act="save-draft" ${busy ? 'disabled' : ''}>
                      保存草稿
                    </button>
                    <button class="nv-btn is-small is-primary" type="button" data-nv-act="save-revision" ${busy ? 'disabled' : ''}>
                      保存并定稿
                    </button>
                  </div>
                </div>

                <textarea
                  id="nv-draft-body"
                  class="nv-body-textarea"
                  placeholder="在这里直接撰写或修改小说正文…（右侧可随时唤起 AI 续写段落或检查设定冲突）"
                >${E(draftBody)}</textarea>
              `
          }
        </section>

        <!-- Column 3: AI Co-Pilot & Worldbuilding Canon -->
        <aside class="nv-col-right" aria-label="AI 创作助手与设定集">
          <div class="nv-right-tabs">
            <button
              type="button"
              class="${activeRightTab === 'assistant' ? 'is-active' : ''}"
              data-nv-act="right-tab"
              data-tab="assistant"
            >
              AI 续写助手
            </button>
            <button
              type="button"
              class="${activeRightTab === 'canon' ? 'is-active' : ''}"
              data-nv-act="right-tab"
              data-tab="canon"
            >
              设定集 (${facts.length})
            </button>
            <button
              type="button"
              class="${activeRightTab === 'review' ? 'is-active' : ''}"
              data-nv-act="right-tab"
              data-tab="review"
            >
              审阅 (${aiIssues.length})
            </button>
          </div>

          ${
            activeRightTab === 'assistant'
              ? `
                <div class="nv-right-body">
                  <label class="nv-field">
                    <span>叙事风格</span>
                    <select id="nv-ai-style" class="nv-select">
                      <option value="general" ${aiStyle === 'general' ? 'selected' : ''}>通用文学叙事</option>
                      <option value="xuanhuan" ${aiStyle === 'xuanhuan' ? 'selected' : ''}>东方玄幻 · 布局悟道</option>
                      <option value="mystery" ${aiStyle === 'mystery' ? 'selected' : ''}>悬疑推理 · 线索伏笔</option>
                    </select>
                  </label>

                  <label class="nv-field">
                    <span>写作模型</span>
                    <select id="nv-ai-model" class="nv-select">
                      <option value="">默认模型${defaultModel ? ' (' + E(defaultModel) + ')' : ''}</option>
                      ${availableModels
                        .map(
                          (m) =>
                            `<option value="${E(m.id)}" ${m.id === aiModel ? 'selected' : ''}>${E(
                              m.id
                            )}</option>`
                        )
                        .join('')}
                    </select>
                  </label>

                  <label class="nv-field">
                    <span>本段续写或扩写指令</span>
                    <textarea
                      id="nv-ai-instruction"
                      rows="4"
                      placeholder="告诉 AI 接下来这一幕发生什么：例如“主角推开旧祠堂的木门，发现铜铃内侧刻着第二道暗纹”…"
                    >${E(aiInstruction)}</textarea>
                  </label>

                  <div class="nv-btn-row">
                    <button
                      type="button"
                      class="nv-btn is-primary"
                      style="flex:1"
                      data-nv-act="ai-draft"
                      ${busy || !p || !s ? 'disabled' : ''}
                    >
                      ${busy ? 'AI 思考中…' : '✨ AI 生成续写段落'}
                    </button>
                    <button
                      type="button"
                      class="nv-btn"
                      data-nv-act="ai-review"
                      ${busy || !p || !s ? 'disabled' : ''}
                    >
                      审阅一致性
                    </button>
                  </div>

                  ${aiNotice ? `<div class="nv-notice">${E(aiNotice)}</div>` : ''}

                  ${
                    aiCandidate
                      ? `
                        <div class="nv-candidate-card">
                          <div class="nv-candidate-head">
                            <strong>AI 候选正文</strong>
                            <button type="button" class="nv-btn is-small is-primary" data-nv-act="append-candidate">
                              一键追加到正文末尾
                            </button>
                          </div>
                          <div class="nv-candidate-prose">${E(aiCandidate)}</div>
                        </div>
                      `
                      : ''
                  }
                </div>
              `
              : activeRightTab === 'canon'
                ? `
                  <div class="nv-right-body">
                    <div class="nv-block-head">
                      <span>已确认的人物与世界观事实</span>
                      ${
                        p
                          ? '<button type="button" class="nv-btn is-small is-primary" data-nv-act="open-modal" data-modal="new-fact">+ 新增设定</button>'
                          : ''
                      }
                    </div>
                    ${
                      facts.length === 0
                        ? '<div class="nv-empty-small"><p>尚未收录设定事实。添加角色性格、核心设定或时间线后，AI 续写与审阅会自动遵循这些设定。</p></div>'
                        : `<div class="nv-fact-list">
                            ${facts
                              .map(
                                (f) => `
                                <article class="nv-fact-card">
                                  <div class="nv-fact-top">
                                    <span class="nv-fact-tag">${E(LAYER_LABELS[f.layer] || f.layer)}</span>
                                    ${f.storyTime ? `<small>时点 ${E(f.storyTime)}</small>` : ''}
                                  </div>
                                  <p>${E(f.statement)}</p>
                                </article>
                              `
                              )
                              .join('')}
                          </div>`
                    }
                  </div>
                `
                : `
                  <div class="nv-right-body">
                    <div class="nv-block-head">
                      <span>本章设定与逻辑审阅报告</span>
                      <button type="button" class="nv-btn is-small" data-nv-act="ai-review" ${
                        busy || !p || !s ? 'disabled' : ''
                      }>
                        重新审阅
                      </button>
                    </div>
                    ${
                      aiIssues.length === 0
                        ? '<div class="nv-empty-small"><p>点击「审阅一致性」，AI 会自动对照你的设定集检查本章是否存在前后矛盾。</p></div>'
                        : `<div class="nv-fact-list">
                            ${aiIssues
                              .map(
                                (iss) => `
                                <article class="nv-fact-card is-warn">
                                  <strong>${E(iss.description)}</strong>
                                  ${
                                    iss.evidence?.quote || iss.quote
                                      ? `<blockquote>${E(iss.evidence?.quote || iss.quote)}</blockquote>`
                                      : ''
                                  }
                                </article>
                              `
                              )
                              .join('')}
                          </div>`
                    }
                  </div>
                `
          }
        </aside>
      </div>

      ${renderModal()}
    `);
  }

  function renderModal() {
    if (!modal) return '';
    if (modal === 'new-project') {
      return `
        <div class="nv-modal-backdrop" data-nv-act="close-backdrop">
          <section class="nv-modal" role="dialog" aria-modal="true" aria-label="新建小说作品">
            <header class="nv-modal-head">
              <h3>新建小说作品</h3>
              <button type="button" data-nv-act="close-modal">×</button>
            </header>
            <form id="nv-form-new-project" class="nv-form">
              <label class="nv-field">
                <span>小说名称</span>
                <input name="name" required maxlength="100" placeholder="如：长夜余火 / 雾港纪事" autofocus />
              </label>
              <label class="nv-field">
                <span>首章标题</span>
                <input name="sceneTitle" required maxlength="100" defaultValue="第一章 序幕" value="第一章 序幕" />
              </label>
              <label class="nv-field">
                <span>故事一句话简介或开篇草稿（可选）</span>
                <textarea name="body" rows="4" placeholder="写下开篇第一段或核心故事设定…"></textarea>
              </label>
              <div class="nv-modal-actions">
                <button type="button" class="nv-btn" data-nv-act="close-modal">取消</button>
                <button type="submit" class="nv-btn is-primary" ${busy ? 'disabled' : ''}>创建作品</button>
              </div>
            </form>
          </section>
        </div>
      `;
    }

    if (modal === 'new-scene') {
      return `
        <div class="nv-modal-backdrop" data-nv-act="close-backdrop">
          <section class="nv-modal" role="dialog" aria-modal="true" aria-label="新建章节">
            <header class="nv-modal-head">
              <h3>新建章节</h3>
              <button type="button" data-nv-act="close-modal">×</button>
            </header>
            <form id="nv-form-new-scene" class="nv-form">
              <label class="nv-field">
                <span>章节标题</span>
                <input name="title" required maxlength="100" placeholder="如：第二章 旧巷重逢" autofocus />
              </label>
              <label class="nv-field">
                <span>初始正文草稿（可选）</span>
                <textarea name="body" rows="4" placeholder="可留空直接进入编辑器撰写…"></textarea>
              </label>
              <div class="nv-modal-actions">
                <button type="button" class="nv-btn" data-nv-act="close-modal">取消</button>
                <button type="submit" class="nv-btn is-primary" ${busy ? 'disabled' : ''}>创建章节</button>
              </div>
            </form>
          </section>
        </div>
      `;
    }

    if (modal === 'new-fact') {
      return `
        <div class="nv-modal-backdrop" data-nv-act="close-backdrop">
          <section class="nv-modal" role="dialog" aria-modal="true" aria-label="新增设定事实">
            <header class="nv-modal-head">
              <h3>新增人物或世界观设定</h3>
              <button type="button" data-nv-act="close-modal">×</button>
            </header>
            <form id="nv-form-new-fact" class="nv-form">
              <label class="nv-field">
                <span>设定类型</span>
                <select name="layer" class="nv-select">
                  <option value="world">世界设定 / 规则</option>
                  <option value="belief">人物性格 / 认知</option>
                  <option value="plan">剧情伏笔 / 计划</option>
                </select>
              </label>
              <label class="nv-field">
                <span>设定描述</span>
                <textarea name="statement" required rows="3" placeholder="如：林羽左手腕有一道旧剑痕，且在第三章前不知道幕后黑手是城主。"></textarea>
              </label>
              <div class="nv-modal-actions">
                <button type="button" class="nv-btn" data-nv-act="close-modal">取消</button>
                <button type="submit" class="nv-btn is-primary" ${busy ? 'disabled' : ''}>保存设定</button>
              </div>
            </form>
          </section>
        </div>
      `;
    }
    return '';
  }

  function render() {
    const activeEl = document.activeElement;
    const activeId = activeEl?.id;
    const selStart = activeEl?.selectionStart;
    const selEnd = activeEl?.selectionEnd;

    root.innerHTML = renderView();

    if (activeId) {
      const nextEl = document.getElementById(activeId);
      if (nextEl) {
        nextEl.focus({ preventScroll: true });
        if (typeof selStart === 'number' && typeof nextEl.setSelectionRange === 'function') {
          try {
            nextEl.setSelectionRange(selStart, selEnd);
          } catch {}
        }
      }
    }
  }

  // Event Delegation
  root.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'nv-draft-title') {
      draftTitle = t.value;
      dirty = true;
    } else if (t.id === 'nv-draft-body') {
      draftBody = t.value;
      dirty = true;
    } else if (t.id === 'nv-ai-instruction') {
      aiInstruction = t.value;
    }
  });

  root.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'nv-project-select') {
      if (dirty && !confirm('当前章节有未保存修改，切换作品将放弃未保存内容，是否继续？')) {
        t.value = projectId;
        return;
      }
      projectId = t.value;
      sceneId = getProject()?.scenes?.[0]?.id || '';
      syncDraftFromScene();
      render();
    } else if (t.id === 'nv-ai-style') {
      aiStyle = t.value;
    } else if (t.id === 'nv-ai-model') {
      aiModel = t.value;
    }
  });

  root.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-nv-act]');
    if (!btn) return;
    const act = btn.dataset.nvAct;

    if (act === 'close-backdrop' && e.target !== btn) return;
    if (act === 'close-modal' || act === 'close-backdrop') {
      modal = '';
      render();
      return;
    }
    if (act === 'open-modal') {
      modal = btn.dataset.modal || '';
      render();
      return;
    }
    if (act === 'reload') {
      try {
        await loadCanon();
        render();
      } catch (err) {
        loadError = err.message;
        render();
      }
      return;
    }
    if (act === 'select-scene') {
      const nextId = btn.dataset.sceneId;
      if (nextId === sceneId) return;
      if (dirty && !confirm('当前章节有未保存修改，切换章节将丢弃修改，确定切换吗？')) return;
      sceneId = nextId;
      syncDraftFromScene();
      render();
      return;
    }
    if (act === 'right-tab') {
      activeRightTab = btn.dataset.tab || 'assistant';
      render();
      return;
    }
    if (act === 'save-draft') {
      await handleSaveChapter(false);
      return;
    }
    if (act === 'save-revision') {
      await handleSaveChapter(true);
      return;
    }
    if (act === 'ai-draft') {
      await handleRunAIAssistant('draft');
      return;
    }
    if (act === 'ai-review') {
      await handleRunAIAssistant('review');
      return;
    }
    if (act === 'append-candidate') {
      if (!aiCandidate) return;
      draftBody = (draftBody ? draftBody.trimEnd() + '\n\n' : '') + aiCandidate.trim();
      dirty = true;
      aiCandidate = '';
      showToast('已追加到正文末尾，记得点击「保存并定稿」');
      render();
      return;
    }
  });

  root.addEventListener('submit', async (e) => {
    const formEl = e.target;
    if (formEl.id === 'nv-form-new-project') {
      e.preventDefault();
      const fd = new FormData(formEl);
      const name = String(fd.get('name') || '').trim();
      const sceneTitle = String(fd.get('sceneTitle') || '第一章 序幕').trim();
      const body = String(fd.get('body') || '（在此开始撰写第一章正文…）').trim() || '（在此开始撰写第一章正文…）';
      const newPid = crypto.randomUUID();
      const newSid = crypto.randomUUID();
      const ok = await sendCanonCommand(
        {
          type: 'create_project_with_scene_drafts',
          projectId: newPid,
          name,
          description: '',
          scenes: [{ sceneId: newSid, title: sceneTitle, body }],
        },
        '新小说作品已创建'
      );
      if (ok) {
        projectId = newPid;
        sceneId = newSid;
        modal = '';
        syncDraftFromScene();
        render();
      }
    } else if (formEl.id === 'nv-form-new-scene') {
      e.preventDefault();
      const p = getProject();
      if (!p) return;
      const fd = new FormData(formEl);
      const title = String(fd.get('title') || '').trim();
      const body = String(fd.get('body') || '').trim();
      const newSid = crypto.randomUUID();
      const ok = await sendCanonCommand(
        {
          type: 'create_scene',
          projectId: p.id,
          sceneId: newSid,
          title,
        },
        '新章节已创建'
      );
      if (ok) {
        sceneId = newSid;
        modal = '';
        if (body) {
          await sendCanonCommand(
            {
              type: 'save_draft',
              projectId: p.id,
              sceneId: newSid,
              title,
              body,
            },
            ''
          );
        }
        syncDraftFromScene();
        render();
      }
    } else if (formEl.id === 'nv-form-new-fact') {
      e.preventDefault();
      const p = getProject();
      const s = getScene();
      if (!p) return;
      const fd = new FormData(formEl);
      const statement = String(fd.get('statement') || '').trim();
      const layer = String(fd.get('layer') || 'world');
      // Ensure we have a revision to anchor the fact, or save one first
      if (!getRevision() && s) {
        await handleSaveChapter(true);
      }
      const rev = getRevision();
      if (!s || !rev) {
        showToast('请先创建并定稿一个章节，再添加设定事实');
        return;
      }
      const quote = (rev.body || '').slice(0, 60) || statement;
      const ok = await sendCanonCommand(
        {
          type: 'record_fact',
          projectId: p.id,
          factId: crypto.randomUUID(),
          statement,
          layer,
          subject: 'story',
          storyTime: '1',
          source: {
            sceneId: s.id,
            revisionId: rev.id,
            evidence: quote,
          },
        },
        '新设定已加入作品设定集'
      );
      if (ok) {
        modal = '';
        render();
      }
    }
  });

  // Hub Leave Guards
  let approvedLeave = false;
  function hasUnsavedResults() {
    return !!(busy || dirty || aiCandidate);
  }
  window.HubBeforeLeave = async () => {
    if (
      hasUnsavedResults() &&
      !confirm(
        busy
          ? '正在与服务器同步小说内容，确定离开吗？'
          : '当前章节或 AI 续写候选尚未保存，确定离开吗？'
      )
    ) {
      return false;
    }
    approvedLeave = true;
    return true;
  };
  window.HubCancelLeave = () => {
    approvedLeave = false;
  };
  window.addEventListener('beforeunload', (e) => {
    if (!approvedLeave && hasUnsavedResults()) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // Boot
  (async () => {
    try {
      const r = await fetch('/api/hub/session', { cache: 'no-store' });
      const id = await r.json().catch(() => ({}));
      if (!r.ok || !id.authenticated || !id.userId) {
        throw new Error('请先使用工作台账号登录');
      }
      account = id.userId;
      await loadCanon();
      render();
      void loadModels();
    } catch (err) {
      loadError = err.message || '加载失败';
      render();
    }
  })();
})();
