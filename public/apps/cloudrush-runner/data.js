export const HEROES = [
 {id:'sun',name:'晴空',title:'逐风领航员',color:'#f39751',row:0,skill:'流星冲刺',key:'疾驰',desc:'化作流星冲刺 5 秒，无敌并击碎前方障碍，适合在密集赛道爆发。',passive:'二段跳 · 金币得分 +15%',jumps:2,cooldown:23,duration:5,score:1.15},
 {id:'mist',name:'凛音',title:'雾隐信使',color:'#45bebb',row:1,skill:'时空漫游',key:'时缓',desc:'减缓赛道 6 秒，获得护盾并吸引金币，轻松穿越密集障碍。',passive:'三段跳 · 时缓与护盾',jumps:3,cooldown:26,duration:6,score:1},
 {id:'star',name:'星璃',title:'星河魔法师',color:'#9c7cdd',row:2,skill:'星河飞行',key:'飞行',desc:'飞行 6 秒，越过断崖与障碍，跳跃升高、下滑降低，金币三倍得分。',passive:'二段跳 · 长按跳跃可滑翔',jumps:2,cooldown:27,duration:6,score:1},
];
export const MOUNTS = [
 {id:'fox',name:'赤焰灵狐',title:'爆发型坐骑',color:'#efa95b',row:0,skill:'焰尾疾驰',desc:'每收集 35 枚金币，自动冲刺 3 秒并击碎障碍。',passive:'踩怪得分 +50%',threshold:35},
 {id:'griffin',name:'岚羽狮鹫',title:'探索型坐骑',color:'#69cdd2',row:1,skill:'乘风而起',desc:'每收集 30 枚金币，飞行 3.5 秒，跳跃升高、下滑降低，探索空中奖励。',passive:'跳跃高度 +12%',threshold:30},
 {id:'tiger',name:'霓光机虎',title:'得分型坐骑',color:'#9b91dc',row:2,skill:'电光超载',desc:'每收集 32 枚金币，启动 4 秒磁场，获得一层护盾，拾取得分翻倍。',passive:'破坏障碍额外 +200 分',threshold:32},
];
export const PETS = [
 {id:'momo',name:'啵啵',title:'拾光小狐',color:'#efb554',col:0,skill:'金币雷达',desc:'自动吸附附近 130 范围内的金币，拾取金币获得额外得分。',passive:'金币吸附 · 金币得分 +10%'},
 {id:'whale',name:'云团',title:'守护云鲸',color:'#71bfcf',col:1,skill:'云朵守护',desc:'开局赠送护盾；护盾消耗后，每 24 秒重新生成一次。',passive:'护盾可抵挡一次撞击；不抵挡坠落'},
 {id:'owl',name:'星咕',title:'星夜猫头鹰',color:'#a995d8',col:2,skill:'回溯星光',desc:'角色技能冷却缩短 15%，每局首次失误自动救援一次。',passive:'技能急速 · 一次坠落或撞击救援'},
];
export const WORLDS = [
 {name:'晨曦群岛',sub:'在瀑布与云海之间，开始这场旅行。',range:'0—600 m',color:'#63ceae',filter:'none'},
 {name:'落日回廊',sub:'追上霞光，穿过金色的浮空遗迹。',range:'600—1,200 m',color:'#f4ab66',filter:'sepia(.4) saturate(1.25) hue-rotate(330deg)'},
 {name:'星夜秘境',sub:'让星光为你指路，跑向更远的夜空。',range:'1,200—1,800 m · 循环探索',color:'#9b94df',filter:'hue-rotate(55deg) saturate(.75) brightness(.62)'},
];
export const CATALOG = {hero:HEROES,mount:MOUNTS,pet:PETS};
export const defaults = () => ({version:1,coins:1200,best:0,bestDistance:0,runs:0,totalCoins:0,selection:{hero:'sun',mount:'fox',pet:'momo'},levels:{},settings:{music:.36,sfx:.6,muted:false},tutorial:true,stats:{broken:0,precision:0,gems:0,airCoins:0},trials:{},claimed:[],unlockedTrails:['breeze'],trail:'breeze',trial:'islands'});
export function loadSave(storage=globalThis.localStorage){try{let d=defaults(),s=JSON.parse(storage.getItem('cloudrush.save.v1')||'null');if(!s||s.version!==1)return d;for(const k of ['coins','best','bestDistance','runs','totalCoins'])d[k]=Math.max(0,Math.min(1e10,Number(s[k])||0));for(const k of Object.keys(CATALOG)){if(CATALOG[k].some(x=>x.id===s.selection?.[k]))d.selection[k]=s.selection[k];}for(const k of Object.keys(s.levels||{}))d.levels[k]=Math.max(1,Math.min(10,Number(s.levels[k])||1));if(s.settings){d.settings.music=Math.max(0,Math.min(1,Number(s.settings.music)||0));d.settings.sfx=Math.max(0,Math.min(1,Number(s.settings.sfx)||0));d.settings.muted=!!s.settings.muted;}d.tutorial=s.tutorial!==false;for(const k of ['broken','precision','gems','airCoins'])d.stats[k]=Math.max(0,Math.min(1e10,Number(s.stats?.[k])||0));for(const t of TRIALS)d.trials[t.id]=Math.max(0,Math.min(3,Math.floor(Number(s.trials?.[t.id])||0)));d.claimed=QUESTS.filter(q=>Array.isArray(s.claimed)&&s.claimed.includes(q.id)).map(q=>q.id);d.unlockedTrails=['breeze',...QUESTS.filter(q=>q.unlock&&d.claimed.includes(q.id)).map(q=>q.unlock)];d.trail=d.unlockedTrails.includes(s.trail)?s.trail:'breeze';d.trial=TRIALS.some(t=>t.id===s.trial)?s.trial:'islands';return d;}catch{return defaults();}}
export const levelOf=(save,type,id)=>save.levels[type+':'+id]||1;
export const upgradeCost=(level)=>200+level*120;
export function getLoadout(save){return Object.fromEntries(Object.entries(CATALOG).map(([type,list])=>[type,{...list.find(x=>x.id===save.selection[type]),level:levelOf(save,type,save.selection[type]),...(type==='mount'?{threshold:list.find(x=>x.id===save.selection[type]).threshold-(levelOf(save,type,save.selection[type])>=5?5:0)-(levelOf(save,type,save.selection[type])>=10?3:0)}:{})}]))}

export const BUILDS = [
 {id:'blaze',name:'焰尾破坏流',tag:'击破 · 连锁爆发',hero:'sun',mount:'fox',pet:'momo',color:'#e99756',desc:'每次击破额外 +300 分、星能 +6；每三次击破再得 1000 分。'},
 {id:'guard',name:'时缓守护流',tag:'闪避 · 续航',hero:'mist',mount:'tiger',pet:'whale',color:'#55b9ae',desc:'漂亮闪避得分提升至 350，恢复 2 点体力，技能冷却缩短 0.9 秒。'},
 {id:'sky',name:'星河探索流',tag:'空中 · 寻宝',hero:'star',mount:'griffin',pet:'owl',color:'#a28add',desc:'空中金币得分 ×1.5；风之晶由 800 分提升至 1500 分。'},
];
export const buildFor=loadout=>BUILDS.find(b=>['hero','mount','pet'].every(k=>loadout[k]?.id===b[k]))||null;
export const TRIALS = [
 {id:'islands',name:'风起群岛',world:0,distance:1000,reward:400,side:['precision',8],sideLabel:'漂亮闪避 8 次',story:'穿过浮岛花园，寻找散落在风中的星光。'},
 {id:'ruins',name:'日落古城',world:1,distance:1400,reward:600,side:['broken',8],sideLabel:'击破障碍 8 个',story:'沿着金色回廊前行，让古老的风灯再次亮起。'},
 {id:'observatory',name:'逐月之约',world:2,distance:1800,reward:800,side:['gems',4],sideLabel:'收集风之晶 4 枚',story:'登上月下天文台，完成属于风行者的第一段传奇。'},
];
export const QUESTS = [
 {id:'first-wind',name:'踏上旅途',desc:'最远距离达到 500 米',metric:'bestDistance',target:500,reward:250},
 {id:'coin-friend',name:'拾光旅人',desc:'累计收集 300 枚金币',metric:'totalCoins',target:300,reward:350},
 {id:'breaker',name:'破风之力',desc:'累计击破 30 个障碍',metric:'broken',target:30,reward:450,unlock:'ember'},
 {id:'dancer',name:'风间舞步',desc:'累计漂亮闪避 30 次',metric:'precision',target:30,reward:450},
 {id:'sky-collector',name:'星光收藏家',desc:'累计收集 15 枚风之晶',metric:'gems',target:15,reward:600,unlock:'starlight'},
 {id:'first-chapter',name:'云端的约定',desc:'完成全部 3 个风之试炼',metric:'chapters',target:3,reward:1000},
];
export const TRAILS=[{id:'breeze',name:'清风',color:'#9ef5dc'},{id:'ember',name:'焰尾',color:'#ffbc78'},{id:'starlight',name:'星尘',color:'#d2afff'}];
export function questProgress(save,quest){return quest.metric==='chapters'?Object.keys(save.trials||{}).filter(k=>save.trials[k]>0).length:save[quest.metric]??save.stats?.[quest.metric]??0;}
export function settleRun(save,run){
 if(run.mode==='practice')return {reward:0,stars:0,newRecord:false,newQuests:[]};
 const newRecord=run.score>save.best,rewardBase=run.coins+Math.floor(run.distance/20);let reward=rewardBase,stars=0;
 save.best=Math.max(save.best,run.score);save.bestDistance=Math.max(save.bestDistance,run.distance);save.totalCoins+=run.coins;save.runs++;save.tutorial=false;
 save.stats||={};for(const key of ['broken','precision','gems','airCoins'])save.stats[key]=(save.stats[key]||0)+(run[key]||0);
 if(run.mode==='trial'&&run.completed){const trial=TRIALS.find(t=>t.id===run.trial);if(trial){stars=1+(run[trial.side[0]]>=trial.side[1]?1:0)+(run.clean?1:0);save.trials||={};if(!save.trials[trial.id])reward+=trial.reward;save.trials[trial.id]=Math.max(save.trials[trial.id]||0,stars);}}
 save.coins+=reward;return {reward,stars,newRecord,newQuests:QUESTS.filter(q=>!(save.claimed||[]).includes(q.id)&&questProgress(save,q)>=q.target).map(q=>q.name)};
}
export function claimQuest(save,id){const q=QUESTS.find(q=>q.id===id);save.claimed||=[];if(!q||save.claimed.includes(id)||questProgress(save,q)<q.target)return false;save.claimed.push(id);save.coins+=q.reward;if(q.unlock){save.unlockedTrails||=['breeze'];if(!save.unlockedTrails.includes(q.unlock))save.unlockedTrails.push(q.unlock);}return q;}
