(() => {
  'use strict';
  const state = document.getElementById('state');
  const refresh = document.getElementById('refresh');
  const row = (label, value, success) => {
    const el = document.createElement('div');
    el.className = 'status-row';
    const title = document.createElement('span');
    title.textContent = label;
    const detail = document.createElement('strong');
    detail.className = success ? 'ok' : 'missing';
    detail.textContent = value;
    el.append(title, detail);
    return el;
  };
  async function check() {
    refresh.disabled = true;
    state.replaceChildren();
    const progress = document.createElement('p'); progress.textContent = '正在读取配置状态…'; state.append(progress);
    try {
      const res = await fetch('/api/m/novel-studio/model-status', {cache: 'no-store'});
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || '无法读取配置状态。');
      if (!data || typeof data.keyConfigured !== 'boolean' || typeof data.modelConfigured !== 'boolean') throw new Error('状态响应格式不正确。');
      state.replaceChildren(row('NOVEL_OPENAI_API_KEY', data.keyConfigured ? '已读取到配置' : '未配置', data.keyConfigured));
      state.append(row('NOVEL_OPENAI_MODEL', data.modelConfigured ? (data.model || '已配置，名称无法显示') : '未配置', data.modelConfigured));
      const note = document.createElement('p');
      note.className = 'small';
      note.textContent = data.keyConfigured && data.modelConfigured ? '配置已载入；尚未验证密钥、模型权限或实际调用。' : '请在站点原生设置中完成配置，再重新部署。';
      state.append(note);
    } catch (error) {
      state.replaceChildren();
      const message = document.createElement('p'); message.className = 'failure'; message.textContent = error instanceof Error ? error.message : '无法读取配置状态。'; state.append(message);
    } finally { refresh.disabled = false; }
  }
  refresh.addEventListener('click', check);
  check();
})();
