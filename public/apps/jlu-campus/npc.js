/** Original scripted campus guides. They are local scenery, never online players. */
const SOUTH_GUIDES = [
  {key:'rixin',building:'日新楼',name:'日新楼同学（NPC）',avatar:2,lines:[
    '日新楼到了，进门逛逛？走近入口按 E，我在这儿等朋友。',
    '想看看整个校园，可以按 M 打开地图。选中楼宇后能标记位置，也能查看安全传送点。',
    '不赶时间的话，就慢慢走吧。拐过一栋楼，总能换个看校园的角度。'
  ]},
  {key:'library',building:'中心图书馆',name:'图书馆向导（NPC）',avatar:5,lines:[
    '图书馆就在身后。先在门口歇歇，还是进去找个座位？靠近入口按 E。',
    '靠近入口按 E 可以进馆。室内下方留有出口，走到那里再按 E 就能回到校园。',
    '书还没翻开，心已经静下来一点了。逛累了就回来坐坐。'
  ]},
  {key:'lakeside',building:'湖畔餐厅',name:'湖畔同学（NPC）',avatar:3,lines:[
    '在湖畔歇一会儿吧。什么都不做，看看水面，也是一种逛校园。',
    '试试在设置里切到夜间，看看校园路灯。手动雨雪会标为模拟，和自动天气分开。',
    '想和真人一起逛，可以加入同一个房间。同校区的广场消息能跨房间交流。'
  ]},
  {key:'dingxin',building:'鼎新楼',name:'广场向导（NPC）',avatar:6,lines:[
    '抬头看看，鼎新楼就在这里。绕着广场走一圈，再选下一站吧。',
    '如果迷路，打开地图点“回到自己”。标记只帮助定位，传送会先检查落点是否能站立。'
  ]}
];
const NORTH_GUIDES = [
  {key:'north-start',building:'理化楼',name:'北区向导（NPC）',avatar:1,lines:[
    '欢迎来到前卫北区！换个校区，也换一种散步的心情。',
    '想找地方就按 M。这里有些楼名还没补齐，地图会保留它们的位置。',
    '左上方可以切换南北区。加入房间前，先确认和伙伴选择的是同一校区。'
  ]},
  {key:'north-map',building:'长春吉大附中实验学校',name:'北区同学（NPC）',avatar:4,lines:[
    '第一次来这边？不用急着选目的地，沿着路随便走走也很好。',
    '按 M 可以打开完整地图；在搜索框输入名字，或直接点建筑，就能找到它的位置。'
  ]}
];

export function createCampusNPCs(data, world) {
  if (!data || !world?.getEntrance || !world?.nearestWalkable || !world?.isWalkable) return [];
  const guides = data.meta?.id === 'qianwei-north' ? NORTH_GUIDES : SOUTH_GUIDES;
  const placed = [];
  for (const guide of guides) {
    const building = (data.buildings || []).find(item => item.name === guide.building);
    if (!building) continue;
    const entrance = world.getEntrance(building);
    if (!entrance) continue;
    // Keep clear of doors and spawn points. Guides never add a collision obstacle.
    let position = null;
    for (const radius of [6,9,12]) {
      for (let i=0;i<12;i++) {
        const angle=i*Math.PI/6;
        const point=world.nearestWalkable(entrance[0]+Math.cos(angle)*radius,entrance[1]+Math.sin(angle)*radius,3);
        if (!point || !world.isWalkable(point[0],point[1],0.8)) continue;
        if (Math.hypot(point[0]-entrance[0],point[1]-entrance[1])<3) continue;
        if (world.spawn && Math.hypot(point[0]-world.spawn[0],point[1]-world.spawn[1])<3) continue;
        if (world.lineWalkable && !world.lineWalkable(entrance,point)) continue;
        if (placed.some(other => Math.hypot(other.x-point[0],other.y-point[1])<5)) continue;
        position=point;break;
      }
      if (position) break;
    }
    if (!position) continue;
    placed.push({id:`npc:${data.meta?.id || 'campus'}:${guide.key}`,name:guide.name,x:position[0],y:position[1],avatar:guide.avatar,direction:'down',moving:false,npc:true,lines:[...guide.lines]});
  }
  return placed;
}

export function getNPCDialogue(npc, index=0) {
  const lines=npc?.lines;
  if (!Array.isArray(lines) || !lines.length) return '迷路了吗？按 M 看看地图，再选一个想去的地方。';
  const cursor=Number.isFinite(index)?Math.trunc(index):0;
  return String(lines[((cursor%lines.length)+lines.length)%lines.length]);
}
