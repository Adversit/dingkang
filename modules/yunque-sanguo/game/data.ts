export type Faction = '蜀'|'魏'|'吴'|'群';
export type Rarity = 'R'|'SR'|'SSR'|'UR';
export type Role = '猛将'|'谋士'|'铁卫'|'辅助';
export type Target = 'front'|'back'|'all'|'lowest'|'random'|'ally'|'self';
export type StatusKind = 'burn'|'poison'|'stun'|'silence'|'shield'|'attack'|'defdown'|'taunt';
export interface Skill { name:string; description:string; target:Target; power:number; element:'wind'|'fire'|'thunder'|'ice'|'light'|'shadow'; status?:StatusKind; heal?:number; energy?:number; hits?:number; leech?:number }
export interface Hero { id:number; name:string; title:string; faction:Faction; role:Role; rarity:Rarity; hp:number; atk:number; def:number; mdef:number; speed:number; crit:number; skill:Skill; quote:string; bio:string }
const make=(id:number,name:string,title:string,faction:Faction,role:Role,rarity:Rarity,skill:Skill,quote:string):Hero=>({id,name,title,faction,role,rarity,hp:role==='铁卫'?1700:role==='辅助'?1250:role==='谋士'?1040:1200,atk:role==='猛将'?235:role==='谋士'?240:role==='辅助'?165:150,def:role==='铁卫'?100:role==='猛将'?68:48,mdef:role==='谋士'||role==='辅助'?92:role==='铁卫'?75:52,speed:105+(id*17)%45,crit:role==='猛将'?.16:.1,skill,quote,bio:`${title}，${faction==='群'?'群雄':faction+'国'}阵营的${role}。${skill.description}站位与同袍配合，将决定战场的走向。`});
export const HEROES:Hero[]=[
make(0,'赵云','银龙破阵','蜀','猛将','SSR',{name:'游龙照夜',description:'突袭生命最低的敌人，连续攻击3次，每次100%攻击伤害。',target:'lowest',power:1,element:'wind',hits:3},'一枪破晓，万里无惧。'),
make(1,'关羽','青锋义绝','蜀','猛将','SSR',{name:'青锋断岳',description:'横扫敌方前排，造成180%伤害，对低于35%生命的目标伤害提高50%。',target:'front',power:1.8,element:'wind'},'此心如刃，不负同袍。'),
make(2,'张飞','长坂惊雷','蜀','铁卫','SR',{name:'雷震长坂',description:'攻击前排130%，嘲讽全场2回合，自身获得25%生命护盾。',target:'front',power:1.3,element:'thunder',status:'taunt'},'有我在，谁敢越过此阵！'),
make(3,'诸葛亮','天枢星弈','蜀','谋士','UR',{name:'星落八阵',description:'对全体造成125%法术伤害，35%概率眩晕1回合。',target:'all',power:1.25,element:'thunder',status:'stun'},'星辰有序，胜负在心。'),
make(4,'黄月英','机巧流光','蜀','辅助','SR',{name:'流光机关',description:'治疗全体友军攻击的95%，并为其恢复25点怒气。',target:'ally',power:0,heal:.95,energy:25,element:'light'},'让灵感，照亮这片战场。'),
make(5,'马超','踏雪银骠','蜀','猛将','SR',{name:'踏雪惊鸿',description:'突袭敌方后排，造成180%伤害并降低防御2回合。',target:'back',power:1.8,element:'ice',status:'defdown'},'疾风所至，长枪所向。'),
make(6,'曹操','夜极星主','魏','谋士','UR',{name:'星垂九野',description:'全体敌人受到110%伤害并沉默1回合，全队攻击提高25%持续2回合。',target:'all',power:1.1,element:'shadow',status:'silence'},'这天下，总要有人点亮。'),
make(7,'夏侯惇','独目苍狼','魏','铁卫','SR',{name:'苍狼守誓',description:'重击前排160%，自身嘲讽2回合并获得25%生命护盾。',target:'front',power:1.6,element:'ice',status:'taunt'},'伤痕，是我守护的誓言。'),
make(8,'许褚','撼山虎卫','魏','铁卫','SR',{name:'撼山一击',description:'攻击生命最低敌人260%，使其眩晕1回合。',target:'lowest',power:2.6,element:'thunder',status:'stun'},'一步不退，便是我的道。'),
make(9,'典韦','赤焰恶来','魏','铁卫','SSR',{name:'赤戟护主',description:'前排受到180%伤害，自身吸取造成伤害的45%。',target:'front',power:1.8,element:'fire',leech:.45},'我身后，便是无人可侵之地。'),
make(10,'张辽','月下惊鸿','魏','猛将','SR',{name:'月刃袭营',description:'斩击后排200%，令其沉默1回合。',target:'back',power:2,element:'ice',status:'silence'},'月出之时，敌阵已破。'),
make(11,'郭嘉','霜华遗策','魏','谋士','SSR',{name:'霜华奇策',description:'全体受到110%法术伤害，中毒2回合，每回合损失8%最大生命。',target:'all',power:1.1,element:'shadow',status:'poison'},'风起之前，我已知归途。'),
make(12,'周瑜','赤霄琴焰','吴','谋士','SSR',{name:'赤霄流火',description:'全体受到120%法术伤害，灼烧2回合，每回合损失8%最大生命。',target:'all',power:1.2,element:'fire',status:'burn'},'听见了吗？风与火的和鸣。'),
make(13,'小乔','花间清音','吴','辅助','SR',{name:'清音愈心',description:'治疗全体友军攻击的150%，净化灼烧与中毒。',target:'ally',power:0,heal:1.5,element:'light'},'愿这片花开，为你而来。'),
make(14,'孙策','破浪天骄','吴','猛将','SSR',{name:'破浪千军',description:'前排受到210%伤害，自身攻击提高25%持续2回合。',target:'front',power:2.1,element:'wind',status:'attack'},'江海辽阔，正好纵马！'),
make(15,'孙尚香','弦月朱雀','吴','猛将','SR',{name:'弦月逐星',description:'锁定后排连续2次攻击，每次115%伤害。',target:'back',power:1.15,element:'fire',hits:2},'我的箭，只朝向自己的远方。'),
make(16,'陆逊','青灯焚城','吴','谋士','R',{name:'青灯焚野',description:'全体受到90%法术伤害并灼烧2回合。',target:'all',power:.9,element:'fire',status:'burn'},'一灯可明夜，一念可定局。'),
make(17,'大乔','沧海引潮','吴','辅助','R',{name:'沧海流歌',description:'治疗全队攻击的110%，为其添加相当于自身18%最大生命的护盾。',target:'ally',power:0,heal:1.1,element:'ice',status:'shield'},'潮汐往复，我会守候。'),
make(18,'吕布','无双天魔','群','猛将','UR',{name:'天魔裂空',description:'全体受到190%伤害，自身吸取伤害的20%。',target:'all',power:1.9,element:'shadow',leech:.2},'天地为阵，我自无双。'),
make(19,'貂蝉','夜蝶倾城','群','辅助','SSR',{name:'夜蝶迷心',description:'后排受到140%法术伤害并眩晕1回合，己方最低生命者回复250%攻击的生命。',target:'back',power:1.4,element:'shadow',status:'stun'},'月色之下，也有我的战场。'),
make(20,'张角','太平雷君','群','谋士','SR',{name:'九霄雷符',description:'随机3名敌人受到190%法术伤害，35%概率眩晕。',target:'random',power:1.9,element:'thunder',status:'stun'},'借苍天一雷，照见人间。'),
make(21,'袁绍','天阙贵胄','群','辅助','R',{name:'万旗同辉',description:'全体友军攻击提高25%持续2回合，并治疗攻击的80%。',target:'ally',power:0,heal:.8,element:'light',status:'attack'},'千旗齐举，此刻同心。'),
make(22,'颜良','铁壁苍锋','群','铁卫','R',{name:'苍锋守阵',description:'前排受到160%伤害并降低防御2回合。',target:'front',power:1.6,element:'ice',status:'defdown'},'铁壁之名，用刀来守。'),
make(23,'文丑','断阵飞戟','群','猛将','R',{name:'飞戟追魂',description:'攻击生命最低者280%，吸取伤害的30%。',target:'lowest',power:2.8,element:'wind',leech:.3},'千军之中，取你一阵。'),
];
export interface Bond { id:string; name:string; heroes:number[]; type:'属性'|'强化'|'合击'; description:string; atk?:number; hp?:number; combo?:string; target?:Target; element:Skill['element']; power?:number; effect?:'heal'|'shield'|'burn'|'stun'|'energy'|'execute' }
export const BONDS:Bond[]=[
{id:'oath',name:'桃园义魂',heroes:[1,2],type:'合击',description:'生命 +8%，攻击 +10%；合击横扫全体并眩晕前排。',hp:.08,atk:.1,combo:'青龙震岳',element:'wind',power:2.2,effect:'stun'},
{id:'spear',name:'银枪双骁',heroes:[0,5],type:'合击',description:'攻击 +8%；合击追击最低生命的敌人，造成460%伤害。',atk:.08,combo:'龙骧踏雪',element:'ice',power:4.6,effect:'execute'},
{id:'stars',name:'星机相映',heroes:[3,4],type:'合击',description:'生命 +8%；星雷攻击全体，全队回复30怒气。',hp:.08,combo:'天机星坠',element:'thunder',power:2,effect:'energy'},
{id:'sisters',name:'江东双姝',heroes:[13,17],type:'合击',description:'生命 +10%；合击治疗全队并添加18%最大生命护盾。',hp:.1,combo:'沧海花朝',element:'light',power:0,effect:'heal'},
{id:'tigers',name:'虎痴恶来',heroes:[8,9],type:'合击',description:'生命 +12%；合击震击全体并赋予全队护盾。',hp:.12,combo:'双卫镇山河',element:'thunder',power:2.1,effect:'shield'},
{id:'river',name:'江东双璧',heroes:[12,14],type:'合击',description:'攻击 +10%；合击焚烧全体，附加2回合灼烧。',atk:.1,combo:'业火破浪',element:'fire',power:2.2,effect:'burn'},
{id:'moon',name:'无双夜蝶',heroes:[18,19],type:'合击',description:'攻击 +10%；合击全体斩击，回复伤害的20%。',atk:.1,combo:'天魔蝶舞',element:'shadow',power:2.8},
{id:'north',name:'河北双雄',heroes:[22,23],type:'合击',description:'攻击 +12%；合击连斩前排并赋予全队护盾。',atk:.12,combo:'双戟裂苍穹',target:'front',element:'ice',power:2.5,effect:'shield'},
{id:'tactician',name:'王佐星谋',heroes:[6,11],type:'强化',description:'攻击 +12%；首次怒气技能额外获得35怒气。',atk:.12,element:'shadow',effect:'energy'},
{id:'fire',name:'燎原之志',heroes:[12,16],type:'强化',description:'攻击 +8%；灼烧伤害由8%提升至12%最大生命。',atk:.08,element:'fire',effect:'burn'},
{id:'wall',name:'铜雀铁卫',heroes:[6,7],type:'强化',description:'生命 +12%；开场获得15%最大生命护盾。',hp:.12,element:'ice',effect:'shield'},
{id:'fivetiger',name:'四骁同阵',heroes:[0,1,2,5],type:'属性',description:'四位同阵，全队攻击 +18%，生命 +12%。',atk:.18,hp:.12,element:'wind'},
{id:'bow',name:'江东英气',heroes:[14,15],type:'属性',description:'同袍携手，全队攻击 +12%。',atk:.12,element:'fire'},
{id:'banner',name:'河北旌旗',heroes:[21,22,23],type:'属性',description:'三旗聚首，全队生命 +20%。',hp:.2,element:'light'},
];
export const CHAPTERS=[
{name:'黄巾乱世',sub:'雷起苍穹 · 初踏乱世',boss:20,mechanic:'苍天雷罚',desc:'每3回合释放雷罚，打击全体并眩晕1名武将。',color:'#69d8cb',stages:['云阙初阵','青州烽烟','苍林伏兵','长风渡口','太平道坛','雷君降世']},
{name:'虎牢风云',sub:'铁骑踏雪 · 一战成名',boss:18,mechanic:'无双狂怒',desc:'生命低于50%时进入狂暴，攻击提升40%，持续至战斗结束。',color:'#b99ceb',stages:['河洛前哨','汜水争锋','铁骑来袭','孤城残阳','虎牢阵前','无双战魂']},
{name:'群雄逐鹿',sub:'群星汇聚 · 谁主沉浮',boss:21,mechanic:'千军援阵',desc:'第2、4、6回合复苏一名倒下的士兵，回复其40%生命。',color:'#e5c78b',stages:['逐鹿平原','白马疾风','延津夜雨','万旗深处','河北军阵','千军之主']},
{name:'官渡决战',sub:'暗潮涌动 · 星火破局',boss:6,mechanic:'魏武号令',desc:'每3回合全军攻击提升25%，并沉默我方后排1回合。',color:'#88a4f0',stages:['黎阳暗渡','乌巢星火','粮道截击','月下奇谋','决战官渡','魏武星令']},
{name:'赤壁烈焰',sub:'长江潮起 · 炽火连天',boss:12,mechanic:'赤壁业火',desc:'每2回合燃烧全场，持续2回合。治疗与净化是制胜关键。',color:'#fb976d',stages:['江南烟雨','赤壁前哨','铁锁连舟','东风初起','江天火海','赤霄终战']},
];
export interface Stage { id:number; chapter:number; name:string; boss:boolean; level:number; enemies:number[]; power:number; gold:number; exp:number; stones:number; tickets:number }
export const STAGES:Stage[]=Array.from({length:30},(_,i)=>{const ch=Math.floor(i/6),boss=i%6===5;const pools=[[22,23,16,20,21,17],[7,10,9,18,19,11],[22,23,7,21,20,17],[7,8,9,6,11,10],[14,15,22,12,16,13]];return {id:i,chapter:ch,name:CHAPTERS[ch].stages[i%6],boss,level:1+Math.floor(i*.85),enemies:boss?[...pools[ch]]:pools[ch].map((id,j)=>j===3&&i<3?16:id),power:Math.round(5400+i*1180+(boss?1600:0)),gold:1800+i*260,exp:24+i*4,stones:boss?12:4,tickets:boss?5:2};});
export const FACTION_COLOR:Record<Faction,string>={'蜀':'#61cba8','魏':'#8dacf0','吴':'#f29b77','群':'#ce98e3'};
export const RARITY_COLOR:Record<Rarity,string>={R:'#77b7dc',SR:'#c398f6',SSR:'#edc17a',UR:'#ff8b7e'};
