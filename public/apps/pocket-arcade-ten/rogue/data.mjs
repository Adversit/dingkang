// All progression is local. No account, payments or remote tracking.
export const SAVE_KEY='pocket-ash-expedition-v1';
export const COLORS=['#c4cebd','#78dfaa','#b5a0ff','#ffcd72'];
export const RARITIES=['朴素','精良','史诗','传说'];
export const FAMILIES={
 ballistic:{name:'枪火',icon:'⊕',color:'#edcc85',desc:'2件：暴击+10% · 4件：穿透+1 · 6件：暴击引发爆炸'},
 blade:{name:'钢刃',icon:'⚔',color:'#c2d4dc',desc:'2件：护甲+3 · 4件：命中吸血 · 6件：翻滚释放剑气'},
 fire:{name:'余烬',icon:'♨',color:'#ff9473',desc:'2件：伤害+12% · 4件：灼烧伤害翻倍 · 6件：敌人死亡爆燃'},
 frost:{name:'霜寒',icon:'❄',color:'#82dce8',desc:'2件：所有命中减速 · 4件：对减速敌人伤害+25% · 6件：周期冰环'},
 tech:{name:'雷械',icon:'ϟ',color:'#e6dc85',desc:'2件：攻速+12% · 4件：闪电多连锁2次 · 6件：额外雷击'},
 arcane:{name:'星术',icon:'✦',color:'#bea8f1',desc:'2件：拾取+60 · 4件：额外投射物+1 · 6件：新星范围与伤害提升'}
};
export const WEAPONS=[
 {id:'pistol',name:'铜雀手枪',icon:'⊕',family:'ballistic',type:'shot',damage:22,cd:.65,speed:470,range:500,desc:'稳定点射，优先攻击最近目标',evo:'日冕双枪',rune:'scope'},
 {id:'shotgun',name:'散星霰弹',icon:'⋔',family:'ballistic',type:'shot',damage:13,cd:1.2,speed:400,range:290,count:5,spread:.48,desc:'近距离扇形散射，多弹可命中同一目标',evo:'群星风暴',rune:'scope'},
 {id:'blade',name:'弧月双刃',icon:'⚔',family:'blade',type:'melee',damage:43,cd:.9,range:112,desc:'向最近敌人挥出扇形斩击',evo:'千刃圆舞',rune:'whetstone'},
 {id:'spear',name:'贯风长枪',icon:'➶',family:'blade',type:'shot',damage:39,cd:1.1,speed:590,range:360,pierce:3,desc:'贯穿一整条直线上的敌人',evo:'破军龙枪',rune:'whetstone'},
 {id:'flame',name:'余烬喷灯',icon:'♨',family:'fire',type:'shot',damage:8,cd:.18,speed:250,range:200,burn:7,spread:.22,desc:'短距连续火焰，附加可刷新的灼烧',evo:'赤龙吐息',rune:'coal'},
 {id:'cannon',name:'焰心榴炮',icon:'◉',family:'fire',type:'shot',damage:47,cd:1.8,speed:280,range:560,aoe:70,burn:5,desc:'缓慢炮弹爆炸，造成范围伤害',evo:'流星熔炉',rune:'coal'},
 {id:'ice',name:'霜棱法杖',icon:'❄',family:'frost',type:'shot',damage:26,cd:.8,speed:390,range:520,slow:.45,pierce:1,desc:'冰晶贯穿并减速敌人',evo:'极夜暴雪',rune:'crystal'},
 {id:'ring',name:'冰轮护符',icon:'◌',family:'frost',type:'orbit',damage:23,cd:.4,range:100,slow:.4,desc:'两枚冰轮绕身旋转，持续阻挡追兵',evo:'永冻星环',rune:'crystal'},
 {id:'tesla',name:'雷鸣线圈',icon:'ϟ',family:'tech',type:'chain',damage:31,cd:1.2,range:340,chain:3,desc:'闪电在邻近敌人之间连续跳跃',evo:'天罚回路',rune:'battery'},
 {id:'drone',name:'蜂鸟浮炮',icon:'⌘',family:'tech',type:'drone',damage:18,cd:.52,speed:540,range:600,desc:'独立浮炮环绕，远距自动狙击',evo:'蜂巢矩阵',rune:'battery'},
 {id:'star',name:'寻星魔弹',icon:'✦',family:'arcane',type:'shot',damage:29,cd:.85,speed:330,range:600,homing:true,desc:'自动追踪，命中后寻找新的敌人',evo:'彗星祈愿',rune:'tome'},
 {id:'aura',name:'幽光之域',icon:'☾',family:'arcane',type:'aura',damage:12,cd:.32,range:105,desc:'身边形成持续伤害领域',evo:'星界坍缩',rune:'tome'}
];
export const RELICS=[
 {id:'scope',name:'鹰眼瞄镜',icon:'◎',family:'ballistic',desc:'暴击+8%；解锁枪火武器进化',stats:{crit:.08}},
 {id:'powder',name:'黑火药袋',icon:'⁙',family:'ballistic',desc:'伤害+12%，弹速+15%',stats:{damage:.12,projectile:.15}},
 {id:'magazine',name:'扩容弹匣',icon:'▥',family:'ballistic',desc:'攻速+14%，最大生命−8',stats:{haste:.14,hp:-8}},
 {id:'ricochet',name:'穿甲弹芯',icon:'➤',family:'ballistic',desc:'所有弹体穿透+1',stats:{pierce:1}},
 {id:'whetstone',name:'古刃磨石',icon:'◇',family:'blade',desc:'伤害+10%；解锁钢刃武器进化',stats:{damage:.1}},
 {id:'plate',name:'铆钉甲片',icon:'⬡',family:'blade',desc:'护甲+4，移速−8',stats:{armor:4,speed:-8}},
 {id:'fang',name:'猩红獠牙',icon:'◢',family:'blade',desc:'每次造成伤害恢复0.35生命',stats:{leech:.35}},
 {id:'boots',name:'追猎之靴',icon:'↝',family:'blade',desc:'移动+22，翻滚冷却缩短15%',stats:{speed:22,dash:.15}},
 {id:'coal',name:'不熄煤心',icon:'♨',family:'fire',desc:'灼烧强度+40%；解锁余烬武器进化',stats:{burn:.4}},
 {id:'oil',name:'炼金燃油',icon:'◈',family:'fire',desc:'范围+18%，伤害+6%',stats:{area:.18,damage:.06}},
 {id:'furnace',name:'血焰熔炉',icon:'♜',family:'fire',desc:'伤害+22%，最大生命−15',stats:{damage:.22,hp:-15}},
 {id:'spark',name:'火绒徽记',icon:'✺',family:'fire',desc:'暴击+6%，拾取+30',stats:{crit:.06,magnet:30}},
 {id:'crystal',name:'永冻晶核',icon:'❄',family:'frost',desc:'最大生命+15；解锁霜寒武器进化',stats:{hp:15}},
 {id:'snow',name:'白雪披肩',icon:'≋',family:'frost',desc:'护甲+2，每秒恢复0.4生命',stats:{armor:2,regen:.4}},
 {id:'prism',name:'碎光棱镜',icon:'△',family:'frost',desc:'范围+20%',stats:{area:.2}},
 {id:'hourglass',name:'冰砂漏',icon:'⌛',family:'frost',desc:'翻滚冷却缩短20%，移速+8',stats:{dash:.2,speed:8}},
 {id:'battery',name:'超载电池',icon:'ϟ',family:'tech',desc:'攻速+12%；解锁雷械武器进化',stats:{haste:.12}},
 {id:'coil',name:'增幅线圈',icon:'⌁',family:'tech',desc:'连锁目标+2',stats:{chain:2}},
 {id:'salvage',name:'拾荒机械臂',icon:'⌘',family:'tech',desc:'材料收益+25%，拾取+30',stats:{economy:.25,magnet:30}},
 {id:'servo',name:'伺服关节',icon:'⚙',family:'tech',desc:'移动+15，攻速+8%',stats:{speed:15,haste:.08}},
 {id:'tome',name:'失落星典',icon:'▣',family:'arcane',desc:'经验+15%；解锁星术武器进化',stats:{xp:.15}},
 {id:'lens',name:'天文透镜',icon:'✧',family:'arcane',desc:'额外投射物+1，伤害−8%',stats:{extra:1,damage:-.08}},
 {id:'dew',name:'月露瓶',icon:'☽',family:'arcane',desc:'每秒恢复0.6生命',stats:{regen:.6}},
 {id:'compass',name:'星海罗盘',icon:'✥',family:'arcane',desc:'拾取+70，经验+10%',stats:{magnet:70,xp:.1}}
];
export const HEROES=[
 {id:'guard',name:'芽芽',title:'荒原守卫',sprite:12,color:'#eac784',desc:'均衡开局，受伤减免与生命更高。',start:['pistol','blade'],stats:{hp:25,armor:2},condition:'初始可用'},
 {id:'mage',name:'芙芙',title:'月影术士',sprite:13,color:'#c6a6f0',desc:'法术范围更大，但生命偏低。',start:['star','aura'],stats:{area:.2,hp:-10},condition:'初始可用'},
 {id:'ranger',name:'叶隼',title:'疾风游侠',sprite:21,color:'#b5db97',desc:'高暴击、高移速，适合走位射击。',start:['spear','shotgun'],stats:{crit:.12,speed:22,hp:-10},unlock:p=>p.stats.kills>=150,condition:'累计击败150个敌人'},
 {id:'engineer',name:'零号',title:'雷械工程师',sprite:10,color:'#83dce1',desc:'浮炮与连锁开局，材料收入更高。',start:['drone','tesla'],stats:{economy:.2,haste:.08},unlock:p=>p.stats.waves>=8,condition:'累计通过8波'},
 {id:'knight',name:'赤铠',title:'熔炉骑士',sprite:11,color:'#f99d7d',desc:'重甲近战，翻滚后用烈焰反击。',start:['blade','flame'],stats:{armor:5,hp:35,speed:-15},unlock:p=>p.stats.bosses>=2,condition:'累计击败2个首领'},
 {id:'frost',name:'凛星',title:'霜月守望者',sprite:16,color:'#abcfee',desc:'冰轮守护，恢复生命并减速敌人。',start:['ice','ring'],stats:{regen:.45,hp:15},unlock:p=>p.stats.wins>=1,condition:'完成一次十二波远征'}
];
export const BIOMES=[
 {id:'moss',name:'苔光废墟',caption:'古树之下，第一缕火光',top:'#142f2e',bottom:'#29413a',accent:'#83c8a0',hazard:'荆棘孢子',boss:'苔冠巨像',bossSprite:5},
 {id:'forge',name:'赤铜熔野',caption:'穿过余烬，听见钢铁的心跳',top:'#342421',bottom:'#534033',accent:'#efa275',hazard:'熔岩喷发',boss:'熔炉暴君',bossSprite:11},
 {id:'moon',name:'霜月墓园',caption:'长夜的尽头，是最后的守望',top:'#202740',bottom:'#303c51',accent:'#a6b6ed',hazard:'月蚀陨落',boss:'月蚀骑士',bossSprite:16}
];
export const DIFFICULTIES=['旅人','探险家','猎荒者','噩梦','深渊'];
export const SLOTS={core:'武装核心',coat:'防具',charm:'护符',boots:'足具'};
export const TALENTS=[
 {id:'vitality',name:'坚韧',icon:'♥',desc:'每级最大生命+6',stats:{hp:6}},
 {id:'power',name:'火力',icon:'➶',desc:'每级伤害+3%',stats:{damage:.03}},
 {id:'recovery',name:'生息',icon:'✚',desc:'每级每秒恢复+0.08',stats:{regen:.08}},
 {id:'fortune',name:'拾荒',icon:'✧',desc:'每级材料收益+4%',stats:{economy:.04}},
 {id:'agility',name:'轻盈',icon:'↝',desc:'每级移速+3',stats:{speed:3}},
 {id:'insight',name:'洞察',icon:'◎',desc:'每级经验收益+4%',stats:{xp:.04}}
];
export const PERKS=[
 {id:'power',name:'精准打击',icon:'➶',desc:'伤害+10%',stats:{damage:.1}},
 {id:'haste',name:'疾速节拍',icon:'ϟ',desc:'攻速+10%',stats:{haste:.1}},
 {id:'life',name:'生命绽放',icon:'♥',desc:'最大生命+18，并恢复25',stats:{hp:18},heal:25},
 {id:'crit',name:'猎手直觉',icon:'◎',desc:'暴击+8%',stats:{crit:.08}},
 {id:'armor',name:'钢铁意志',icon:'⬡',desc:'护甲+3',stats:{armor:3}},
 {id:'speed',name:'风行步伐',icon:'↝',desc:'移速+18，拾取+25',stats:{speed:18,magnet:25}},
 {id:'area',name:'余波回响',icon:'◌',desc:'攻击范围+15%',stats:{area:.15}},
 {id:'regen',name:'野地医师',icon:'✚',desc:'每秒恢复0.45生命',stats:{regen:.45}}
];
export class RNG{constructor(seed=Date.now()){this.state=seed>>>0||1}next(){let t=this.state+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);this.state>>>=0;return((t^t>>>14)>>>0)/4294967296}int(n){return Math.floor(this.next()*n)}pick(a){return a[this.int(a.length)]}shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){let j=this.int(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}}
export const uid=(rng)=>Date.now().toString(36)+'-'+Math.floor((rng?.next()??Math.random())*1e9).toString(36);
export function freshProfile(){return{version:1,revision:0,crystals:0,selected:'guard',difficulty:0,biome:0,mode:'campaign',talents:{},gear:[],equipped:{},stats:{kills:0,waves:0,bosses:0,wins:0,runs:0,best:0,maxDifficulty:0},records:[],claimed:[],run:null}}
export const isUnlocked=(p,h)=>!h.unlock||h.unlock(p);
export const talentCost=(p,id)=>25+20*(p.talents[id]||0);
export function addStats(target,stats,scale=1){for(const[k,v]of Object.entries(stats||{}))target[k]=(target[k]||0)+v*scale;return target}
const affixes=[['锋锐',{damage:.035}],['迅捷',{haste:.035}],['厚重',{armor:1}],['强韧',{hp:7}],['轻灵',{speed:4}],['灵视',{crit:.025}],['生息',{regen:.11}],['贪婪',{economy:.05}],['广域',{area:.045}]];
export function rollGear(rng,difficulty=0,guarantee=0){let r=rng.next(),rarity=Math.max(guarantee,r>.97-difficulty*.025?3:r>.80-difficulty*.035?2:r>.4?1:0),slot=rng.pick(Object.keys(SLOTS)),family=rng.pick(Object.keys(FAMILIES)),level=1+difficulty;let selected=rng.shuffle(affixes).slice(0,1+Math.min(2,rarity));let stats={};for(const [,s]of selected)addStats(stats,s,(1+rarity*.6)*(1+difficulty*.15));addStats(stats,slot==='core'?{damage:.04}:slot==='coat'?{hp:10}:slot==='charm'?{crit:.03}:{speed:7},1+rarity*.5);return{id:uid(rng),slot,family,rarity,level,name:`${FAMILIES[family].name}·${selected[0][0]}${SLOTS[slot]}`,stats,locked:false}}
const statNames={hp:'生命',damage:'伤害',haste:'攻速',crit:'暴击',armor:'护甲',speed:'移速',regen:'每秒恢复',economy:'材料',xp:'经验',area:'范围',magnet:'拾取',leech:'命中回复',extra:'额外弹体',pierce:'穿透',chain:'连锁',dash:'翻滚冷却缩减',burn:'灼烧',projectile:'弹速'};
const percent=new Set(['damage','haste','crit','economy','xp','area','dash','burn','projectile']);
export function describeStats(stats){return Object.entries(stats||{}).map(([k,v])=>`${statNames[k]||k}${v>=0?'+':''}${percent.has(k)?Math.round(v*100)+'%':Math.round(v*100)/100}`).join(' · ')}
export function validateProfile(raw){
 if(!raw||raw.version!==1||!raw.stats||!Array.isArray(raw.gear)||!Array.isArray(raw.records))throw Error('存档格式不正确');
 const p=freshProfile(),finite=(v,max=1e9)=>Number.isFinite(v)&&v>=0&&v<=max;
 if(!finite(raw.crystals))throw Error('存档星砂数据无效');p.crystals=Math.floor(raw.crystals);p.revision=finite(raw.revision)?raw.revision:0;
 for(const k of Object.keys(p.stats)){if(!finite(raw.stats[k]??0))throw Error('存档进度数据无效');p.stats[k]=Math.floor(raw.stats[k]||0)}p.stats.maxDifficulty=Math.min(4,p.stats.maxDifficulty);
 for(const t of TALENTS){let v=raw.talents?.[t.id]||0;if(!Number.isInteger(v)||v<0||v>8)throw Error('存档天赋数据无效');p.talents[t.id]=v}
 p.gear=raw.gear.slice(0,300).filter(g=>g&&typeof g.id==='string'&&g.id.length<100&&SLOTS[g.slot]&&FAMILIES[g.family]&&Number.isInteger(g.rarity)&&g.rarity>=0&&g.rarity<4&&g.stats&&Object.entries(g.stats).every(([k,v])=>statNames[k]&&Number.isFinite(v)&&Math.abs(v)<1000)).map(g=>({...g,name:String(g.name).slice(0,80),locked:!!g.locked}));
 for(const slot of Object.keys(SLOTS)){const g=p.gear.find(x=>x.id===raw.equipped?.[slot]&&x.slot===slot);if(g)p.equipped[slot]=g.id}
 p.selected=HEROES.find(h=>h.id===raw.selected&&isUnlocked(p,h))?.id||'guard';p.difficulty=Math.min(p.stats.maxDifficulty,Math.max(0,Number(raw.difficulty)||0));p.biome=Math.min(2,Math.max(0,Math.floor(Number(raw.biome)||0)));p.mode=['campaign','daily'].includes(raw.mode)?raw.mode:'campaign';p.records=raw.records.slice(0,20).filter(x=>x&&typeof x==='object');p.claimed=(raw.claimed||[]).filter(x=>typeof x==='string').slice(-100);p.run=raw.run&&typeof raw.run==='object'?raw.run:null;return p
}
export function loadProfile(storage=globalThis.localStorage){try{const v=storage?.getItem(SAVE_KEY);return v?validateProfile(JSON.parse(v)):freshProfile()}catch{return freshProfile()}}
export function saveProfile(p,storage=globalThis.localStorage){p.revision++;try{storage?.setItem(SAVE_KEY,JSON.stringify(p));return true}catch{return false}}
export function equip(p,id){const g=p.gear.find(g=>g.id===id);if(!g)return false;p.equipped[g.slot]=id;return true}
export function salvage(p,id){const g=p.gear.find(g=>g.id===id);if(!g||g.locked||Object.values(p.equipped).includes(id))return false;p.crystals+=5+g.rarity*7;p.gear=p.gear.filter(x=>x.id!==id);return true}
export function buyTalent(p,id){const t=TALENTS.find(t=>t.id===id),cost=talentCost(p,id);if(!t||(p.talents[id]||0)>=8||p.crystals<cost)return false;p.crystals-=cost;p.talents[id]=(p.talents[id]||0)+1;return true}
export function baseStats(p,hero,daily=false){let s={hp:100,damage:1,haste:1,crit:.05,armor:0,speed:180,regen:.25,economy:1,xp:1,area:1,magnet:95,leech:0,extra:0,pierce:0,chain:0,dash:0,burn:1,projectile:1};addStats(s,hero.stats);if(!daily){for(const t of TALENTS)addStats(s,t.stats,p.talents[t.id]||0);let sets={};for(const id of Object.values(p.equipped)){let g=p.gear.find(g=>g.id===id);if(g){addStats(s,g.stats);sets[g.family]=(sets[g.family]||0)+1}}for(const count of Object.values(sets)){if(count>=2)addStats(s,{hp:12,damage:.06});if(count>=4)addStats(s,{haste:.1,regen:.4})}}return s}
export function settle(p,result){if(p.claimed.includes(result.id))return false;p.claimed.push(result.id);p.claimed=p.claimed.slice(-100);p.crystals+=result.reward;p.stats.kills+=result.kills;p.stats.waves+=result.completed;p.stats.bosses+=result.bosses;p.stats.runs++;p.stats.wins+=result.win?1:0;p.stats.best=Math.max(p.stats.best,result.completed);if(result.win&&!result.daily)p.stats.maxDifficulty=Math.min(4,Math.max(p.stats.maxDifficulty,result.difficulty+1));for(const gear of result.loot){if(p.gear.length<300)p.gear.push(gear);else p.crystals+=5+gear.rarity*7}p.records.unshift({date:new Date().toISOString(),hero:result.hero,difficulty:result.difficulty,wave:result.completed,win:result.win,seed:result.seed,daily:result.daily,kills:result.kills});p.records=p.records.slice(0,20);p.run=null;return true}
export function dailySeed(){const d=new Date(),day=new Date(d.getTime()+8*3600000).toISOString().slice(0,10);return{day,seed:Number(day.replaceAll('-',''))}}
