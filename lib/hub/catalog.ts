export type ModuleCategory = 'research' | 'product' | 'life' | 'games';
export type HubModule = {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  category: ModuleCategory;
  path: string;
  icon: string;
  color: string;
  archived?: boolean;
  archiveNote?: string;
};
export const categories: {id:ModuleCategory;name:string;description:string;icon:string}[] = [
  {id:'research',name:'研究与学习',description:'AI 情报、论文精读与 Agent 架构实验。',icon:'book'},
  {id:'product',name:'产品与开发',description:'以 SpecKit 为主线的研发工作台与小说创作。',icon:'layers'},
  {id:'life',name:'生活与陪伴',description:'数字陪伴与每日手账。',icon:'heart'},
  {id:'games',name:'游戏大厅',description:'8 个独立游戏世界，统一账号存档。',icon:'game'},
];
export const modules:HubModule[] = [
  {id:'evopm-workbench',name:'SpecKit 研发工作台',subtitle:'Spec · Plan · Tasks 造物主线',description:'合并 AI PM、需求演进与研发交付，按 SpecKit 四步推进',category:'product',path:'/m/evopm-workbench',icon:'evolve',color:'#2563eb'},
  {id:'novel-studio',name:'AI 小说工坊',subtitle:'设定 · 大纲 · 沉浸写作',description:'三栏极简小说创作台：世界观设定、章节正文与 AI 续写审校',category:'product',path:'/apps/novel-studio/canvas.html',icon:'book',color:'#8b5cf6'},
  {id:'zhiliu-radar',name:'知流',subtitle:'AI 情报与每日简报',description:'一键采集精选 AI 信源、提炼要点并生成每日简报',category:'research',path:'/m/zhiliu-radar',icon:'radar',color:'#0ea5e9'},
  {id:'zhizheng-research',name:'知证',subtitle:'论文精读与证据笔记',description:'Crossref 论文检索、PDF 阅读、结构化笔记与 AI 综述',category:'research',path:'/m/zhizheng-research',icon:'research',color:'#10b981'},
  {id:'agent-architecture-journey',name:'Agent 架构实验室',subtitle:'5 大核心模块互动沙盘',description:'可视化拆解 Spec、Memory、Plan、MCP 工具与反思闭环',category:'research',path:'/apps/agent-architecture-journey/index.html',icon:'code',color:'#14b8a6'},
  {id:'wandeng-evening',name:'晚灯',subtitle:'数字陪伴与轻复盘',description:'聊聊今天，留下一页手账与确认记忆',category:'life',path:'/m/wandeng-evening',icon:'lamp',color:'#d97706'},
  {id:'jlu-campus',name:'吉大校园漫游',subtitle:'前卫校园 · 像素世界',description:'南北校区地图、多人同行与建设计划',category:'games',path:'/apps/jlu-campus/index.html',icon:'home',color:'#527e6b'},
  {id:'cloudrush-runner',name:'逐风奇旅',subtitle:'云端跑酷',description:'跑者、坐骑与浮空岛',category:'games',path:'/apps/cloudrush-runner/index.html',icon:'wind',color:'#517a9b'},
  {id:'starfall-creature-isles',name:'星屿同行',subtitle:'精灵探索物语',description:'捕捉精灵，探索群岛',category:'games',path:'/apps/starfall-creature-isles/index.html',icon:'sparkles',color:'#6a8a6b'},
  {id:'pocket-arcade-ten',name:'口袋游乐场',subtitle:'即玩小游戏合集',description:'短暂放松，随时开始',category:'games',path:'/apps/pocket-arcade-ten/index.html',icon:'game',color:'#8a6f99'},
  {id:'yourwar-battle-forge',name:'YourWar',subtitle:'你的战争',description:'自由布阵的战争沙盘',category:'games',path:'/apps/yourwar-battle-forge/index.html',icon:'swords',color:'#8a7863'},
  {id:'mistbound-letters',name:'雾海来信',subtitle:'群岛送信之旅',description:'驾着邮船，收集故事',category:'games',path:'/apps/mistbound-letters/index.html',icon:'mail',color:'#4f7c88'},
  {id:'moonlit-immortal-chronicle',name:'月下问仙录',subtitle:'文字修仙模拟',description:'奇遇、宗门与修行',category:'games',path:'/m/moonlit-immortal-chronicle',icon:'moon',color:'#6e7492'},
  {id:'yunque-sanguo',name:'云阙三国',subtitle:'群星觉醒',description:'招募武将，谋划阵容',category:'games',path:'/m/yunque-sanguo',icon:'flag',color:'#9b6e60'},
  {id:'roommate-housekeeper',name:'同住',subtitle:'合租生活管家（已归档）',description:'AI 面试作品归档保留',category:'life',path:'/apps/roommate-housekeeper/index.html',icon:'home',color:'#64748b',archived:true,archiveNote:'AI 面试作品 · 已归档'},
  {id:'aipm-studio-dk',name:'AI PM Studio',subtitle:'产品构想（已并入 SpecKit）',description:'已合并至 SpecKit 研发工作台',category:'product',path:'/apps/aipm-studio-dk/index.html',icon:'idea',color:'#64748b',archived:true,archiveNote:'已并入 SpecKit 研发工作台'},
  {id:'ai-dev-collaboration-workbench',name:'AI 研发协作',subtitle:'交付画布（已并入 SpecKit）',description:'已合并至 SpecKit 研发工作台',category:'product',path:'/m/ai-dev-collaboration-workbench',icon:'code',color:'#64748b',archived:true,archiveNote:'已并入 SpecKit 研发工作台'},
];
export const moduleById = (id:string) => modules.find(module=>module.id===id);
