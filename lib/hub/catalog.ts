export type ModuleCategory = 'research' | 'product' | 'life' | 'games';
export type HubModule = {id:string;name:string;subtitle:string;description:string;category:ModuleCategory;path:string;icon:string;color:string;};
export const categories: {id:ModuleCategory;name:string;description:string;icon:string}[] = [
  {id:'research',name:'研究与学习',description:'从信息发现，到理解与实践。',icon:'book'},
  {id:'product',name:'产品与开发',description:'把构想、决策和交付放在一起。',icon:'layers'},
  {id:'life',name:'生活与陪伴',description:'照顾日常，也留一点自己的空间。',icon:'heart'},
  {id:'games',name:'游戏',description:'选一段旅程，接着上次的进度。',icon:'game'},
];
export const modules:HubModule[] = [
  {id:'novel-studio',name:'AI 小说创作',subtitle:'故事创作画布',description:'从构思到场景，查看创作过程',category:'product',path:'/apps/novel-studio/canvas.html',icon:'book',color:'#906b56'},
  {id:'jlu-campus',name:'吉大校园漫游',subtitle:'前卫校园 · 像素世界',description:'南北校区地图、多人同行与建设计划',category:'games',path:'/apps/jlu-campus/index.html',icon:'home',color:'#527e6b'},
  {id:'zhiliu-radar',name:'知流',subtitle:'个人信息雷达',description:'精选信息、信源与阅读记录',category:'research',path:'/m/zhiliu-radar',icon:'radar',color:'#456c90'},
  {id:'zhizheng-research',name:'知证',subtitle:'论文研究工作台',description:'论文阅读、复刻与知识图谱',category:'research',path:'/m/zhizheng-research',icon:'research',color:'#5d6b9b'},
  {id:'agent-architecture-journey',name:'Agent 架构学习',subtitle:'从零搭建 Agent',description:'学习笔记、代码与架构画布',category:'research',path:'/apps/agent-architecture-journey/index.html',icon:'book',color:'#497e73'},
  {id:'aipm-studio-dk',name:'AI PM Studio',subtitle:'产品构想与验证',description:'发现问题，验证产品想法',category:'product',path:'/apps/aipm-studio-dk/index.html',icon:'idea',color:'#537a91'},
  {id:'evopm-workbench',name:'EvoPM',subtitle:'产品演进工作台',description:'反馈、需求决策与迭代记录',category:'product',path:'/m/evopm-workbench',icon:'evolve',color:'#6873a0'},
  {id:'ai-dev-collaboration-workbench',name:'AI 研发协作',subtitle:'项目交付工作台',description:'需求、执行与验收；承接造物流程',category:'product',path:'/m/ai-dev-collaboration-workbench',icon:'code',color:'#4a7181'},
  {id:'wandeng-evening',name:'晚灯',subtitle:'数字陪伴与轻复盘',description:'聊聊今天，留下一页手账',category:'life',path:'/m/wandeng-evening',icon:'lamp',color:'#a27853'},
  {id:'roommate-housekeeper',name:'同住',subtitle:'合租生活管家',description:'账单、家务与共同的日常',category:'life',path:'/apps/roommate-housekeeper/index.html',icon:'home',color:'#5c7b6c'},
  {id:'cloudrush-runner',name:'逐风奇旅',subtitle:'云端跑酷',description:'跑者、坐骑与浮空岛',category:'games',path:'/apps/cloudrush-runner/index.html',icon:'wind',color:'#517a9b'},
  {id:'starfall-creature-isles',name:'星屿同行',subtitle:'精灵探索物语',description:'捕捉精灵，探索群岛',category:'games',path:'/apps/starfall-creature-isles/index.html',icon:'sparkles',color:'#6a8a6b'},
  {id:'pocket-arcade-ten',name:'口袋游乐场',subtitle:'即玩小游戏合集',description:'短暂放松，随时开始',category:'games',path:'/apps/pocket-arcade-ten/index.html',icon:'game',color:'#8a6f99'},
  {id:'yourwar-battle-forge',name:'YourWar',subtitle:'你的战争',description:'自由布阵的战争沙盘',category:'games',path:'/apps/yourwar-battle-forge/index.html',icon:'swords',color:'#8a7863'},
  {id:'mistbound-letters',name:'雾海来信',subtitle:'群岛送信之旅',description:'驾着邮船，收集故事',category:'games',path:'/apps/mistbound-letters/index.html',icon:'mail',color:'#4f7c88'},
  {id:'moonlit-immortal-chronicle',name:'月下问仙录',subtitle:'文字修仙模拟',description:'奇遇、宗门与修行',category:'games',path:'/m/moonlit-immortal-chronicle',icon:'moon',color:'#6e7492'},
  {id:'yunque-sanguo',name:'云阙三国',subtitle:'群星觉醒',description:'招募武将，谋划阵容',category:'games',path:'/m/yunque-sanguo',icon:'flag',color:'#9b6e60'},
];
export const moduleById = (id:string) => modules.find(module=>module.id===id);
