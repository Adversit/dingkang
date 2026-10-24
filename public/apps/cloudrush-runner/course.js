// Hand-authored phrases. Distances are world pixels; every phrase ends with recovery space.
// A coin arc is guidance, while the upper paths are optional rewards.
const e=(at,type,extra={})=>({at,type,...extra});
export const COURSES = [
 {id:'first-leap',name:'迎风起跳',length:1800,tier:0,world:-1,hint:'沿金币弧线起跳，再次按下可以二段跳',events:[e(420,'block'),e(1120,'spikes')]},
 {id:'first-slide',name:'俯身过门',length:1800,tier:0,world:-1,hint:'按住下滑穿过低门，松开后准备起跳',events:[e(400,'ceiling'),e(1100,'block')]},
 {id:'first-gap',name:'云桥初行',length:1850,tier:0,world:-1,hint:'金币弧线会带你越过断崖',events:[e(420,'gap',{w:220}),e(1240,'creature')]},
 {id:'first-rocket',name:'听见风声',length:2000,tier:0,world:-1,hint:'红线亮起后飞弹会发射，贴地滑过',events:[e(670,'missile'),e(1440,'spikes')]},
 {id:'breather',name:'拾光小径',length:1650,tier:1,world:-1,hint:'休整一下，收集金币与体力',events:[e(300,'coinroad'),e(800,'coinroad'),e(1280,'stamina')]},
 {id:'low-high',name:'低门与跃迁',length:2000,tier:1,world:-1,hint:'先下滑，再跳跃，保持自己的节奏',events:[e(400,'ceiling'),e(960,'spikes'),e(1480,'block')]},
 {id:'stomp',name:'踏风连跳',length:2000,tier:1,world:-1,hint:'落在巡逻怪头顶，可以借力弹起',events:[e(400,'creature'),e(1000,'creature'),e(1510,'spikes')]},
 {id:'meadow-steps',name:'浮岛阶梯',length:2300,tier:1,world:0,hint:'跃上浮台，拾取高处的风之晶',events:[e(340,'platform',{w:240,rise:95}),e(850,'platform',{w:240,rise:150}),e(1500,'block'),e(1060,'gem',{rise:200})]},
 {id:'wind-bridge',name:'上升气流',length:2250,tier:1,world:0,hint:'起跳进入风柱，按住跳跃借风滑行',events:[e(330,'wind',{w:420}),e(520,'gap',{w:240}),e(670,'gem',{rise:200}),e(1520,'ceiling')]},
 {id:'spring-garden',name:'弹簧花园',length:2150,tier:1,world:0,hint:'踩上弹簧花，飞向高处的奖励',events:[e(400,'spring'),e(790,'platform',{w:310,rise:135}),e(960,'gem',{rise:215}),e(1590,'creature')]},
 {id:'twin-clouds',name:'云间二重奏',length:2350,tier:2,world:0,hint:'两次跨越之间，留出落地的时间',events:[e(400,'gap',{w:230}),e(1160,'gap',{w:265}),e(1820,'ceiling')]},
 {id:'sky-choice',name:'高处的风景',length:2400,tier:2,world:0,hint:'地面路线更稳，高台奖励更丰厚',events:[e(300,'platform',{w:300,rise:95}),e(910,'platform',{w:350,rise:170}),e(1110,'gem',{rise:240}),e(1780,'block')]},
 {id:'ruin-fire',name:'古城炉火',length:2150,tier:1,world:1,hint:'火盆闪烁后喷火，起跳避开它',events:[e(440,'flame'),e(1190,'flame'),e(1660,'stamina')]},
 {id:'ruin-arches',name:'回廊交错',length:2250,tier:1,world:1,hint:'低门后是断桥，滑过后松开并起跳',events:[e(330,'ceiling'),e(1040,'gap',{w:230}),e(1770,'creature')]},
 {id:'ruin-roofs',name:'金色屋脊',length:2500,tier:2,world:1,hint:'登上屋脊，可以越过下方的火盆',events:[e(300,'platform',{w:420,rise:100}),e(850,'flame'),e(1000,'platform',{w:480,rise:150}),e(1260,'gem',{rise:225}),e(1910,'ceiling')]},
 {id:'ruin-chase',name:'遗迹追风',length:2450,tier:2,world:1,hint:'观察红色预警，飞弹过后再跳',events:[e(780,'missile'),e(1630,'block'),e(2000,'stamina')]},
 {id:'ruin-rhythm',name:'火光拍点',length:2450,tier:2,world:1,hint:'连续跳跃穿过火光，技能可以打破障碍',events:[e(420,'flame'),e(1130,'spikes'),e(1850,'flame')]},
 {id:'night-lift',name:'月影浮台',length:2400,tier:1,world:2,hint:'浮台会缓缓升降，看准落点再跳',events:[e(320,'platform',{w:320,rise:95,amp:24}),e(1060,'platform',{w:350,rise:150,amp:28}),e(1250,'gem',{rise:210}),e(1880,'block')]},
 {id:'night-light',name:'星门脉冲',length:2250,tier:1,world:2,hint:'星门亮起时有危险，下滑始终安全',events:[e(400,'laser'),e(1200,'laser'),e(1780,'stamina')]},
 {id:'night-orbit',name:'流星回廊',length:2400,tier:2,world:2,hint:'先穿过星门，再越过断崖',events:[e(370,'laser'),e(1120,'gap',{w:260}),e(1860,'creature')]},
 {id:'night-dream',name:'逐月之路',length:2600,tier:2,world:2,hint:'连跳登上月台，风之晶就在最高处',events:[e(320,'spring'),e(850,'platform',{w:460,rise:160,amp:22}),e(1140,'gem',{rise:240}),e(1900,'laser')]},
 {id:'night-signal',name:'星光信号',length:2400,tier:2,world:2,hint:'循着预警滑过飞弹，再借浮台起跳',events:[e(730,'missile'),e(1660,'platform',{w:330,rise:90}),e(1820,'gem',{rise:155})]},
];
export function chooseCourse(index,world,random=Math.random,last='') {
 if(index<4)return COURSES[index];
 if(index%5===4)return COURSES.find(c=>c.id==='breather');
 const pool=COURSES.filter(c=>c.tier>0&&c.id!=='breather'&&(c.world===world||c.world===-1)&&c.id!==last&&(index>7||c.tier===1));
 return pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];
}
