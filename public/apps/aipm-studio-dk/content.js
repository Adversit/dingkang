// The workflow adapts PM Skills framing, hypothesis, PRD, experiment,
// risk-review, and retrospective practices into short project prompts.
// Demo content is illustrative; it never supplies research or trial results.

export const STAGES = [
  {
    id: 'discover',
    title: '发现问题',
    shortTitle: '发现',
    kicker: '先理解，再解决',
    description: '从一个具体的人和场景出发，分清已经观察到的事实与还需要验证的判断。',
    question: '谁在什么场景下，遇到了一个值得解决的问题？',
    prompts: ['帮我把目标用户再收窄一点', '这个痛点有哪些还没验证的假设？', '用户现在是怎么解决这个问题的？'],
    fields: [
      { id: 'audience', label: '目标用户与场景', type: 'textarea', placeholder: '写下一个具体人群，以及问题发生的时刻。', hint: '先选一个最熟悉的人群，不必覆盖所有人。' },
      { id: 'problem', label: '正在发生的问题', type: 'textarea', placeholder: '他们想完成什么？卡在哪里？目前用什么方式应对？' },
      { id: 'evidence', label: '已知线索与待验证假设', type: 'textarea', placeholder: '记录亲身经历、原始材料或访谈线索；没有证据的判断，注明“待验证”。', hint: '个人经历能帮助提出问题，还不能代表整个用户群体。' },
    ],
    deliverable: '一份有边界的问题描述',
    skill: 'define-problem-statement',
  },
  {
    id: 'define',
    title: '定义方案',
    shortTitle: '定义',
    kicker: '把想法变成可检验的选择',
    description: '说清方案为什么有用、AI 为什么必要，以及第一版只解决什么。',
    question: '你准备改变什么，又凭什么判断它会有效？',
    prompts: ['不使用 AI，这个任务还能怎么完成？', '帮我找出方案里最脆弱的一个假设', '第一版有哪些可以先不做的功能？'],
    fields: [
      { id: 'hypothesis', label: '核心假设', type: 'textarea', placeholder: '我们相信，为［目标用户］提供［改变］，会带来［可观察的结果］。', hint: '好的假设允许被证据推翻。' },
      { id: 'solution', label: '方案与 AI 的作用', type: 'textarea', placeholder: '用户如何完成任务？AI 帮助哪一步？与现有做法相比有什么价值？' },
      { id: 'scope', label: '第一版范围与取舍', type: 'textarea', placeholder: '写下必须完成的核心任务、暂时不做的事，以及最需要先验证的风险。' },
    ],
    deliverable: '一份可验证、可取舍的方案',
    skill: 'define-hypothesis',
  },
  {
    id: 'prototype',
    title: '构建原型',
    shortTitle: '原型',
    kicker: '让核心任务可以被体验',
    description: '把方案变成能走通的原型，记录体验入口和验收方式。',
    question: '用户能否通过原型，完成你最想验证的那件事？',
    prompts: ['帮我把核心任务拆成最短体验路径', '第一版怎样才算真正做完？', '信息不足或 AI 出错时，用户会看到什么？'],
    fields: [
      { id: 'prototypeUrl', label: '原型或产品链接', type: 'url', placeholder: 'https://', hint: '可以填写外部制作的原型或已发布站点。' },
      { id: 'coreFlow', label: '核心体验路径', type: 'textarea', placeholder: '用户从哪里开始，经过哪些关键操作，最后得到什么？' },
      { id: 'acceptance', label: '验收标准与失败处理', type: 'textarea', placeholder: '怎样检查核心功能？遇到缺失信息、错误结果或不应回答的问题时，应该怎样处理？' },
    ],
    deliverable: '一个有验收标准的原型入口',
    skill: 'deliver-prd',
  },
  {
    id: 'simulate',
    title: '模拟试用',
    shortTitle: '模拟',
    kicker: '先演练，再邀请真实用户',
    description: '用预设场景检查流程与边界。模拟用于发现问题，不能替代真实用户反馈。',
    question: '在正常、困难和信息不足的情况下，体验都能继续吗？',
    prompts: ['帮我补充一个容易失败的试用场景', '这次模拟遗漏了哪些边界情况？', '哪些模拟发现值得带到真实验证中？'],
    fields: [
      { id: 'scenarios', label: '模拟场景与预期', type: 'textarea', placeholder: '写下试用者角色、要完成的任务，以及预期结果；请注明是模拟场景。' },
      { id: 'observations', label: '模拟观察记录', type: 'textarea', placeholder: '记录实际走查时的操作、卡点与错误；若只是预测，请注明“尚未试用”。', hint: 'AI 扮演用户的回答仍属于模拟，不计入真实验证。' },
      { id: 'changes', label: '修正与待验证问题', type: 'textarea', placeholder: '哪些问题先修正？哪些判断必须等真实用户试用后再决定？' },
    ],
    deliverable: '一份明确标注来源的模拟记录',
    skill: 'foundation-build-risk-review',
  },
  {
    id: 'validate',
    title: '真实验证',
    shortTitle: '验证',
    kicker: '让真实行为检验你的判断',
    description: '提前写好验证标准，再记录真实参与者的行为与反馈。没有结果时，保留未知。',
    question: '什么真实证据，会让你继续、修改或放弃这个方案？',
    prompts: ['这个验证方法能检验核心假设吗？', '怎样提前定义成功、失败和证据不足？', '除了完成率，还应关注什么负面影响？'],
    fields: [
      { id: 'plan', label: '验证计划与判断标准', type: 'textarea', placeholder: '邀请谁、观察什么任务、持续多久？写明主指标、基线是否已知，以及成功、失败与证据不足的标准。', hint: '方法可以是任务试用、访谈或受控实验；按问题和条件选择。' },
      { id: 'results', label: '真实记录与来源', type: 'textarea', placeholder: '验证完成后，填写实际参与情况、行为记录、原话或材料链接。尚未验证就保持为空。', hint: '不要把模拟回答、预期数值或设计目标写成实测结果。' },
      { id: 'conclusion', label: '结论与证据边界', type: 'textarea', placeholder: '哪些判断得到支持，哪些被推翻，哪些仍无法判断？这些记录不能证明什么？' },
    ],
    deliverable: '一份可追溯的真实验证记录',
    skill: 'measure-experiment-design',
  },
  {
    id: 'iterate',
    title: '迭代复盘',
    shortTitle: '迭代',
    kicker: '留下改变主意的理由',
    description: '回看原来的判断与实际发现，把反思变成一项具体的改进。',
    question: '哪条证据改变了你的判断，接下来准备做什么？',
    prompts: ['哪些变化来自证据，哪些仍是个人偏好？', '帮我找出这一轮最值得保留的取舍', '下一轮只改一件事，应该先考虑什么？'],
    fields: [
      { id: 'decision', label: '判断如何变化', type: 'textarea', placeholder: '原来怎么想？后来发现什么？现在决定保留、调整或暂停什么？' },
      { id: 'changes', label: '这轮改动与结果', type: 'textarea', placeholder: '记录实际完成的改动、有效的部分和未解决的问题；计划与完成分开写。' },
      { id: 'nextTest', label: '下一步行动', type: 'textarea', placeholder: '选一项具体行动，写下负责人、时间和检查方式。' },
    ],
    deliverable: '一条有依据的迭代决策',
    skill: 'iterate-retrospective',
  },
  {
    id: 'showcase',
    title: '项目展示',
    shortTitle: '展示',
    kicker: '让别人看见你的思考',
    description: '串起问题、取舍、作品和证据，如实呈现项目进度与个人贡献。',
    question: '读完这个项目，别人能看见你做过哪些重要判断？',
    prompts: ['帮我用一段话讲清项目的来龙去脉', '哪些个人贡献值得重点说明？', '如果被追问结果依据，我有哪些材料可展示？'],
    fields: [
      { id: 'summary', label: '项目故事', type: 'textarea', placeholder: '为谁解决什么问题？做出了什么？目前进行到哪一步？' },
      { id: 'contribution', label: '个人贡献与 AI 协作', type: 'textarea', placeholder: '你独立做了哪些判断？AI 提供了什么帮助？你采纳、修改或拒绝了哪些建议？' },
      { id: 'reflection', label: '关键取舍与证据', type: 'textarea', placeholder: '选出最有代表性的取舍，附上依据与作品入口，并说明仍未验证的部分。', hint: '尚未完成的阶段可以如实展示，不必补写虚构结果。' },
    ],
    deliverable: '一份可展示、可追问的项目故事',
    skill: 'iterate-retrospective',
  },
];

export const METHOD_CARDS = [
  {
    id: 'problem-framing',
    title: '把问题说具体',
    description: '从用户、场景与现有做法出发，找到真正需要改善的地方。',
    tag: '问题定义',
    stageId: 'discover',
    questions: ['谁在什么时候遇到问题？', '他们现在如何应对？', '哪些线索来自真实观察？'],
  },
  {
    id: 'ai-value',
    title: '说明 AI 的价值',
    description: '比较不同做法，把“想用 AI”变成一个可检验的选择。',
    tag: '方案判断',
    stageId: 'define',
    questions: ['不使用 AI 能否完成任务？', 'AI 改善了哪一步体验？', '什么结果会让你重新考虑？'],
  },
  {
    id: 'smallest-scope',
    title: '只做关键的一步',
    description: '让第一版能完成核心任务，也能清楚说明哪些事情暂时不做。',
    tag: '范围取舍',
    stageId: 'prototype',
    questions: ['核心任务最短需要几步？', '哪些功能不影响本轮验证？', '怎样判断原型已经可用？'],
  },
  {
    id: 'risk-first',
    title: '先找最大的风险',
    description: '聚焦最可能让方案失败的一项假设，再选择低成本的检查方法。',
    tag: '风险审视',
    stageId: 'simulate',
    questions: ['哪个假设一旦不成立，方案就需要改变？', '目前有什么支持或反对的线索？', '可以先做什么来减少不确定性？'],
  },
  {
    id: 'honest-validation',
    title: '用证据检验判断',
    description: '先定标准，再看结果。将模拟、真实观察与尚未验证的判断分开记录。',
    tag: '指标验证',
    stageId: 'validate',
    questions: ['本轮只想验证哪一个假设？', '什么算成功、失败或证据不足？', '这份记录有哪些解释边界？'],
  },
  {
    id: 'decision-story',
    title: '把取舍留下来',
    description: '记录改变主意的原因，让项目展示有可追溯的思考过程。',
    tag: '迭代复盘',
    stageId: 'iterate',
    questions: ['哪条发现改变了原来的判断？', '你采纳或拒绝了什么建议？', '下一步怎样检查改进是否有效？'],
  },
];

function createId(prefix) {
  const value = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${value}`;
}

export function createProject(title, description = '') {
  const now = new Date().toISOString();
  return {
    id: createId('project'),
    title: String(title ?? '').trim() || '未命名项目',
    description: String(description ?? '').trim(),
    isDemo: false,
    createdAt: now,
    updatedAt: now,
    currentStage: 0,
    completed: [],
    answers: {},
    decisions: [],
    evidence: [],
    messages: [],
  };
}

export function createDemoProject() {
  const project = createProject(
    'AI 产品经理工作台',
    '演示项目 · 以本站的产品构想展示记录方式。内容为设计思路示例，尚无真实用户验证结果。',
  );

  project.isDemo = true;
  project.currentStage = 1;
  project.completed = ['discover'];
  project.answers = {
    discover: {
      audience: '示例：准备应聘 AI 产品经理的求职者，希望用一个完整项目展示自己的产品思考与 AI 协作过程。',
      problem: '示例：只有最后的方案或作品，很难说明问题如何被定义、方案为什么这样选择，以及个人做了哪些判断。这个痛点仍需向目标用户验证。',
      evidence: '示例：构想来自项目发起者自身的求职与学习目标；已明确希望保留原始思考、AI 协作过程和产品取舍。尚未开展面向求职者的访谈或真实试用，不能据此认定普遍需求。',
    },
    define: {
      hypothesis: '示例假设：为 AI 产品经理求职者提供固定阶段与追问引导，帮助他们保留项目中的关键判断，从而更清楚地说明自己的产品思考。效果与衡量标准待验证。',
      solution: '示例：以固定主线组织项目，结合表单与追问整理思考。AI 的预期作用是帮助发现遗漏、比较方案和反思取舍；具体价值仍需通过试用检查。',
      scope: '示例：先聚焦一个项目从问题定义到展示的记录过程，保留个人判断与依据。不同场景的扩展留待后续；不把模拟试用当成真实反馈，不虚构验证结果。',
    },
  };

  project.decisions = [
    {
      id: createId('decision'),
      stageId: 'discover',
      title: '示例 · 聚焦 AI 产品经理求职者',
      before: '目标用户尚未收敛，在求职者与独立开发者之间选择。',
      after: '第一版优先面向 AI 产品经理求职者。',
      reason: '与项目发起者自身的学习和求职目标一致，便于从熟悉的场景起步；其他求职者的需求仍待验证。',
      createdAt: project.createdAt,
    },
    {
      id: createId('decision'),
      stageId: 'define',
      title: '示例 · 从生成报告转向记录项目过程',
      before: '帮助用户生成一份 AI 产品立项评审报告。',
      after: '通过固定主线与追问，记录原始思考、个人取舍及 AI 协作过程。',
      reason: '项目目标是让思考过程可展示、可复盘、可追问，因此最终报告之外也需要保留形成判断的过程。',
      createdAt: project.createdAt,
    },
  ];

  return project;
}
