// A local, explicit record of a person's judgments and manual ChatGPT collaboration.
// This module performs no network requests and never treats an AI reply as a decision.

const field = (id, label, placeholder, hint = '', required = true) => ({ id, label, placeholder, hint, required });

export const STEPS = [
  {
    id: 'idea', title: '初始判断',
    description: '先保留你自己的想法。它可以不成熟，也可以在后面被证据改变。',
    skillIds: ['foundation-build-risk-review'],
    fields: [
      field('initialJudgment', '我最初的想法', '我注意到什么问题，想尝试怎样的改变？', '先写你现在的判断，不必提前写成完整方案。'),
      field('motivation', '为什么想验证它', '它来自自己的经历、某次观察，还是一个尚未验证的猜想？'),
      field('constraints', '这轮的条件', '例如：我能接触的人、可投入的时间和预算。', '选填；只记录真实条件。', false),
    ],
  },
  {
    id: 'problem', title: '收窄问题',
    description: '说清是谁在什么情况下遇到困难，把已经知道的事实与猜想分开。',
    skillIds: ['define-problem-statement'],
    fields: [
      field('audience', '这次关注谁', '一个具体人群；不要只写“所有用户”。'),
      field('situation', '问题发生的场景', '他们在什么时候，想完成什么任务？'),
      field('problem', '具体卡在哪里', '描述行为和困难，先不要把某个功能当成问题。'),
      field('currentAlternative', '他们现在怎么做', '现在使用什么方法？若不知道，明确写“待了解”。'),
      field('evidence', '已知线索与未知', '分别写下真实观察及来源、个人判断、尚待验证的问题。', '没有访谈或行为证据时如实保留未知。'),
    ],
  },
  {
    id: 'hypothesis', title: '选择假设',
    description: '本轮只检验一个关键判断，并留下选择它的理由和放弃的选项。',
    skillIds: ['foundation-build-risk-review', 'define-hypothesis', 'develop-design-rationale'],
    fields: [
      field('claim', '本轮要检验的假设', '我们相信，为［具体用户］提供［改变］，会让他们［可观察的行为］。'),
      field('riskiestAssumption', '最可能让方案失败的假设', '哪一项假设不成立，就需要重新考虑这个方向？'),
      field('alternatives', '我还考虑过什么', '其他方案或现有做法是什么？也可以考虑暂时不做。'),
      field('tradeoff', '我的选择与取舍', '为什么优先验证这个假设？暂时放下什么，付出什么代价？'),
    ],
  },
  {
    id: 'plan', title: '验证计划',
    description: '让这份计划具体到可以开始执行；判断规则要写在看到结果之前。',
    skillIds: ['measure-experiment-design'],
    fields: [
      field('method', '验证方法', '例如：真实任务试用、访谈、人工提供服务，或受控实验。', '按问题与条件选择；小样本探索不冒充统计结论。'),
      field('participants', '参与者与数量', '邀请什么条件的人，计划多少位？为什么这样选择？'),
      field('recruitment', '如何找到他们', '具体渠道、邀请方式，以及目前能否联系到。'),
      field('task', '请他们完成什么', '任务步骤、所需材料、你观察什么；避免只问“喜欢吗”。'),
      field('measure', '主要观察或指标', '本轮最关键的行为是什么？怎样记录或计算？'),
      field('baseline', '现有做法与基线', '已知基线及来源；未知时写明“未知”，并说明如何获得。', '预期值不能写成实测基线。'),
      field('criteria', '提前约定判断规则', '分别写明：什么支持假设、什么反驳假设、什么属于证据不足。', '包含成功、失败与证据不足三种情况。'),
      field('schedule', '负责人和时间', '谁来邀请、执行和整理？何时开始，何时检查？'),
      field('nextAction', '第一个可执行动作', '写下结束这次编辑后就能去做的一件事。'),
    ],
  },
];

const RESULT_FIELDS = ['planRevisionId', 'kind', 'observations', 'source', 'conclusion', 'limitations', 'nextDecision'];
const RESULT_LABELS = { planRevisionId: '计划版本', kind: '记录类型', observations: '实际观察', source: '来源', conclusion: '结论', limitations: '证据边界', nextDecision: '下一步判断' };
const RESULT_STEP = { id: 'result', title: '实际结果与复盘', fields: RESULT_FIELDS.map(id => ({ id })) };
const ALL_STEPS = [...STEPS, RESULT_STEP];
const FLOW_KEYS = ['version', 'currentStep', 'answers', 'revisions', 'collaboration', 'results'];
let sequence = 0;
const id = prefix => `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${(++sequence).toString(36)}-${Math.random().toString(36).slice(2, 9)}`}`;
const now = () => new Date().toISOString();
const clone = value => JSON.parse(JSON.stringify(value));
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const text = value => typeof value === 'string';
const nonempty = value => text(value) && Boolean(value.trim());
const date = value => text(value) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value));
const keys = (value, allowed, required = allowed) => isObject(value)
  && Object.keys(value).every(key => allowed.includes(key))
  && required.every(key => Object.hasOwn(value, key));
const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

function getStep(stepId) {
  const step = STEPS.find(item => item.id === stepId);
  if (!step) throw new Error('未知的验证步骤；实际结果请单独记录。');
  return step;
}

function getCollaborationStep(stepId) {
  const step = ALL_STEPS.find(item => item.id === stepId);
  if (!step) throw new Error('未知的协作步骤。');
  return step;
}

function validAnswers(answers) {
  return isObject(answers) && Object.entries(answers).every(([stepId, values]) => {
    const step = ALL_STEPS.find(item => item.id === stepId);
    return step && keys(values, step.fields.map(item => item.id), []) && Object.values(values).every(text);
  });
}

function canonicalAnswers(stepId, answers) {
  return Object.fromEntries(getStep(stepId).fields.map(item => [item.id, answers?.[item.id] || '']));
}

function stepAnswers(flow, stepId) {
  return canonicalAnswers(stepId, flow.answers[stepId]);
}

function latestRevision(flow, stepId) {
  return [...flow.revisions].reverse().find(revision => revision.stepId === stepId) || null;
}

function contextFingerprint(flow, stepId) {
  const index = STEPS.findIndex(step => step.id === stepId);
  return JSON.stringify(STEPS.slice(0, index).map(step => ({
    stepId: step.id,
    revisionId: latestRevision(flow, step.id)?.id || null,
    answers: stepAnswers(flow, step.id),
  })));
}

function validRevision(revision) {
  if (!keys(revision, ['id', 'stepId', 'answers', 'reason', 'createdAt', 'contextFingerprint'])
    || !nonempty(revision.id) || !nonempty(revision.reason) || !date(revision.createdAt)
    || !text(revision.contextFingerprint)) return false;
  const step = STEPS.find(item => item.id === revision.stepId);
  return Boolean(step && keys(revision.answers, step.fields.map(item => item.id))
    && Object.values(revision.answers).every(text)
    && step.fields.filter(item => item.required).every(item => nonempty(revision.answers[item.id])));
}

function validCollaborationDecision(decision) {
  return keys(decision, ['id', 'response', 'disposition', 'finalJudgment', 'reason', 'createdAt'])
    && nonempty(decision.id) && nonempty(decision.response)
    && ['accepted', 'modified', 'rejected'].includes(decision.disposition)
    && nonempty(decision.finalJudgment) && nonempty(decision.reason) && date(decision.createdAt);
}

function validCollaboration(entry, revisionIds) {
  return keys(entry, ['id', 'stepId', 'source', 'taskText', 'createdAt', 'snapshot', 'decisions'])
    && nonempty(entry.id) && ALL_STEPS.some(step => step.id === entry.stepId)
    && entry.source === 'chatgpt-manual' && nonempty(entry.taskText) && date(entry.createdAt)
    && keys(entry.snapshot, ['answers', 'revisionIds']) && validAnswers(entry.snapshot.answers)
    && Array.isArray(entry.snapshot.revisionIds)
    && entry.snapshot.revisionIds.every(revisionId => text(revisionId) && revisionIds.has(revisionId))
    && new Set(entry.snapshot.revisionIds).size === entry.snapshot.revisionIds.length
    && Array.isArray(entry.decisions) && entry.decisions.every(validCollaborationDecision);
}

function validResult(result, plans) {
  return keys(result, ['id', ...RESULT_FIELDS, 'createdAt'])
    && nonempty(result.id) && plans.has(result.planRevisionId)
    && ['real', 'simulation'].includes(result.kind)
    && nonempty(result.observations) && nonempty(result.source)
    && ['supported', 'refuted', 'inconclusive'].includes(result.conclusion)
    && (result.kind !== 'simulation' || result.conclusion === 'inconclusive')
    && nonempty(result.limitations) && nonempty(result.nextDecision) && date(result.createdAt);
}

export function validFlow(flow) {
  if (flow === undefined) return true;
  if (!keys(flow, FLOW_KEYS) || flow.version !== 1 || !ALL_STEPS.some(step => step.id === flow.currentStep)
    || !validAnswers(flow.answers) || !Array.isArray(flow.revisions) || !flow.revisions.every(validRevision)
    || !Array.isArray(flow.collaboration) || !Array.isArray(flow.results)) return false;
  const revisionIds = new Set(flow.revisions.map(revision => revision.id));
  const plans = new Set(flow.revisions.filter(revision => revision.stepId === 'plan').map(revision => revision.id));
  const prior = new Map();
  for (const revision of flow.revisions) {
    const dependencies = STEPS.slice(0, STEPS.findIndex(step => step.id === revision.stepId));
    if (dependencies.some(step => !prior.has(step.id))) return false;
    const expected = dependencies.map(step => ({
      stepId: step.id,
      revisionId: prior.get(step.id).id,
      answers: canonicalAnswers(step.id, prior.get(step.id).answers),
    }));
    if (revision.contextFingerprint !== JSON.stringify(expected)) return false;
    prior.set(revision.stepId, revision);
  }
  if (!flow.collaboration.every(entry => validCollaboration(entry, revisionIds))
    || !flow.results.every(result => validResult(result, plans))) return false;
  const allIds = [...revisionIds, ...flow.collaboration.flatMap(entry => [entry.id, ...entry.decisions.map(decision => decision.id)]), ...flow.results.map(result => result.id)];
  return revisionIds.size === flow.revisions.length && allIds.length === new Set(allIds).size;
}

function requireFlow(flow) {
  if (!flow || !validFlow(flow)) throw new Error('验证记录格式不正确，请保留原始备份。');
}

export function ensureFlow(project) {
  if (!isObject(project)) throw new Error('找不到项目。');
  if (project.validationFlow === undefined) {
    project.validationFlow = { version: 1, currentStep: 'idea', answers: {}, revisions: [], collaboration: [], results: [] };
  }
  requireFlow(project.validationFlow);
  return project.validationFlow;
}

export function stepStatus(flow, stepId) {
  getStep(stepId);
  const revision = latestRevision(flow, stepId);
  if (!revision) return 'draft';
  if (revision.contextFingerprint !== contextFingerprint(flow, stepId)) return 'stale';
  if (JSON.stringify(canonicalAnswers(stepId, revision.answers)) !== JSON.stringify(stepAnswers(flow, stepId))) return 'draft';
  return 'confirmed';
}

export function confirmStep(flow, stepId, reason) {
  requireFlow(flow);
  const step = getStep(stepId);
  if (!nonempty(reason)) throw new Error('请写下这次确认的理由。');
  const answers = stepAnswers(flow, stepId);
  const missing = step.fields.filter(item => item.required && !nonempty(answers[item.id]));
  if (missing.length) throw new Error(`请补充${missing.map(item => `「${item.label}」`).join('、')}。`);
  const previous = STEPS.slice(0, STEPS.indexOf(step)).find(item => stepStatus(flow, item.id) !== 'confirmed');
  if (previous) throw new Error(`请先确认「${previous.title}」的当前判断。`);
  const revision = freeze({
    id: id('revision'), stepId, answers: clone(answers), reason: reason.trim(),
    createdAt: now(), contextFingerprint: contextFingerprint(flow, stepId),
  });
  flow.revisions.push(revision);
  flow.currentStep = STEPS[STEPS.indexOf(step) + 1]?.id || 'result';
  return revision;
}

export function readiness(flow) {
  requireFlow(flow);
  const missing = [];
  for (const step of STEPS) {
    const empty = step.fields.filter(item => item.required && !nonempty(flow.answers[step.id]?.[item.id]));
    if (empty.length) missing.push(...empty.map(item => `${step.title}：${item.label}`));
    else {
      const status = stepStatus(flow, step.id);
      if (status === 'draft') missing.push(`请确认「${step.title}」的当前判断`);
      if (status === 'stale') missing.push(`前面的判断已变化，请重新确认「${step.title}」`);
    }
  }
  return { ready: missing.length === 0, missing, planRevision: latestRevision(flow, 'plan') };
}

export function startCollaboration(project, stepId, taskText) {
  const flow = ensureFlow(project);
  getCollaborationStep(stepId);
  if (!nonempty(taskText)) throw new Error('协作任务不能为空。');
  const record = {
    id: id('collaboration'), stepId, source: 'chatgpt-manual', taskText,
    createdAt: now(),
    snapshot: freeze({
      answers: clone(flow.answers),
      revisionIds: STEPS.map(step => latestRevision(flow, step.id)?.id).filter(Boolean),
    }),
    decisions: [],
  };
  flow.collaboration.push(record);
  return record;
}

export function recordCollaborationDecision(flow, collaborationId, input) {
  requireFlow(flow);
  const record = flow.collaboration.find(entry => entry.id === collaborationId);
  if (!record) throw new Error('找不到对应的 ChatGPT 协作记录。');
  if (!keys(input, ['response', 'disposition', 'finalJudgment', 'reason'])) throw new Error('请完整记录建议、处理方式、个人判断和理由。');
  const decision = { id: id('judgment'), ...input, createdAt: now() };
  if (!validCollaborationDecision(decision)) throw new Error('请完整记录建议、处理方式、个人判断和理由。');
  record.decisions.push(freeze(decision));
  return decision;
}

export function recordResult(flow, input) {
  requireFlow(flow);
  if (!keys(input, RESULT_FIELDS)) throw new Error('请完整记录结果、来源、证据边界和下一步判断。');
  const result = { id: id('result'), ...input, createdAt: now() };
  const plans = new Set(flow.revisions.filter(revision => revision.stepId === 'plan').map(revision => revision.id));
  if (!plans.has(result.planRevisionId)) throw new Error('请选择一个已经确认的验证计划版本。');
  if (result.kind === 'simulation' && result.conclusion !== 'inconclusive') throw new Error('模拟观察不能得出真实需求已被支持或反驳的结论。');
  if (!validResult(result, plans)) throw new Error('请完整记录结果、来源、证据边界和下一步判断。');
  flow.results.push(freeze(result));
  return result;
}

const conclusionLabels = { supported: '支持本轮假设', refuted: '反驳本轮假设', inconclusive: '证据不足' };
const dispositionLabels = { accepted: '采纳', modified: '修改后采纳', rejected: '拒绝' };
const statusLabels = { draft: '草稿', confirmed: '已确认', stale: '前提已变化，待重新确认' };

function answersMarkdown(answers, headingLevel = 3) {
  const lines = [];
  for (const step of STEPS) {
    if (!answers[step.id]) continue;
    lines.push(`${'#'.repeat(headingLevel)} ${step.title}`, '');
    for (const item of step.fields) lines.push(`**${item.label}**`, '', answers[step.id][item.id] || '尚未记录。', '');
  }
  if (answers.result && Object.values(answers.result).some(Boolean)) {
    lines.push(`${'#'.repeat(headingLevel)} 尚未提交的结果草稿`, '', '以下内容尚未提交为结果记录。', '');
    for (const key of RESULT_FIELDS) lines.push(`**${RESULT_LABELS[key]}**`, '', answers.result[key] || '尚未记录。', '');
  }
  return lines.join('\n');
}

export function toMarkdown(project) {
  const flow = project.validationFlow;
  if (flow === undefined) return `# ${project.title || '未命名项目'} · 验证记录\n\n尚未开始验证流程。\n`;
  requireFlow(flow);
  const check = readiness(flow);
  const lines = [
    `# ${project.title || '未命名项目'} · 验证记录`, '',
    project.description || '', '',
    '此档案区分个人判断、手动带回的 ChatGPT 建议、模拟观察与真实结果。', '',
    `计划状态：${check.ready ? '当前版本已确认，可以执行' : '仍有待补充或重新确认的内容'}。`, '',
    ...check.missing.map(item => `- ${item}`), '',
    '## 当前草稿', '',
  ];
  for (const step of STEPS) {
    lines.push(`### ${step.title}（${statusLabels[stepStatus(flow, step.id)]}）`, '');
    for (const item of step.fields) lines.push(`**${item.label}**`, '', flow.answers[step.id]?.[item.id] || '尚未记录。', '');
  }
  if (flow.answers.result && Object.values(flow.answers.result).some(Boolean)) {
    lines.push('### 尚未提交的结果草稿', '', '以下内容尚未提交为结果记录。', '');
    for (const key of RESULT_FIELDS) lines.push(`**${RESULT_LABELS[key]}**`, '', flow.answers.result[key] || '尚未记录。', '');
  }
  lines.push('## 已确认版本', '');
  if (!flow.revisions.length) lines.push('尚未确认任何版本。', '');
  for (const revision of flow.revisions) {
    lines.push(`### ${getStep(revision.stepId).title} · ${revision.id}`, '', `确认时间：${revision.createdAt}`, '', '**我的确认理由**', '', revision.reason, '');
    for (const item of getStep(revision.stepId).fields) lines.push(`**${item.label}**`, '', revision.answers[item.id] || '尚未记录。', '');
    lines.push('所依据的前序版本与草稿快照：', '', '```json', revision.contextFingerprint, '```', '');
  }
  lines.push('## ChatGPT 协作与个人取舍', '');
  if (!flow.collaboration.length) lines.push('尚未记录 ChatGPT 协作。', '');
  for (const record of flow.collaboration) {
    lines.push(`### ${getCollaborationStep(record.stepId).title} · ${record.id}`, '', `方式：用户在 ChatGPT 中手动协作；创建时间：${record.createdAt}`, '', '**发送时的任务**', '', record.taskText, '', '**发送前保留的个人记录**', '', answersMarkdown(record.snapshot.answers, 4), '', `所关联的已确认版本：${record.snapshot.revisionIds.join('、') || '尚无'}`, '');
    if (!record.decisions.length) lines.push('尚未带回建议或记录采纳决定。', '');
    for (const decision of record.decisions) lines.push(`#### ${dispositionLabels[decision.disposition]} · ${decision.id}`, '', `记录时间：${decision.createdAt}`, '', '**ChatGPT 建议原文（用户粘贴）**', '', decision.response, '', '**我的最终判断**', '', decision.finalJudgment, '', '**采纳、修改或拒绝的理由**', '', decision.reason, '');
  }
  lines.push('## 实际结果记录', '');
  if (!flow.results.length) lines.push('尚未提交实际结果；计划与预期不代表已经验证。', '');
  for (const result of flow.results) {
    lines.push(`### ${result.kind === 'real' ? '真实记录' : '模拟记录'} · ${result.id}`, '', `对应计划版本：${result.planRevisionId}`, '', `记录时间：${result.createdAt}`, '', '**观察与行为**', '', result.observations, '', '**来源**', '', result.source, '', `**结论：${conclusionLabels[result.conclusion]}**`, '', ...(result.kind === 'simulation' ? ['模拟记录只帮助检查流程，不能证明真实需求。', ''] : []), '**证据边界**', '', result.limitations, '', '**我的下一步判断**', '', result.nextDecision, '');
  }
  return lines.join('\n');
}
