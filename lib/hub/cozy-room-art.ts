import type { ModuleCategory } from './catalog';

/** Art-space coordinates use the image's top-left corner as [0, 0]. */
export type CozyArtPoint = readonly [number, number];
export type CozyArtHotspot = {
  label: string;
  polygon: readonly CozyArtPoint[];
};
export type CozyRoomArt = {
  src: string;
  width: number;
  height: number;
  hotspots: Record<string, CozyArtHotspot>;
  /** x, y and visual radius in normalized image coordinates. */
  lights: readonly (readonly [number, number, number])[];
};

/** Measured against the final generated images, not the generation prompts. */
export const cozyRoomArt: Record<ModuleCategory, CozyRoomArt> = {
  research: {
    src: '/assets/hub/cozy/rooms/research-v2.webp',
    width: 1672, height: 941,
    hotspots: {
      'zhiliu-radar': { label: '窗边的星象仪', polygon: [[.028,.248],[.148,.209],[.212,.312],[.207,.464],[.167,.557],[.185,.701],[.048,.715],[.045,.594],[.069,.516],[.022,.405]] },
      'zhizheng-research': { label: '桌上的研究手稿', polygon: [[.430,.653],[.534,.607],[.629,.671],[.592,.741],[.498,.705]] },
      'agent-architecture-journey': { label: '墙上的架构图', polygon: [[.763,.117],[.998,.063],[.998,.492],[.759,.432]] },
    },
    lights: [[.355,.379,.040],[.662,.531,.055],[.634,.293,.025],[.975,.526,.025],[.538,.052,.045]],
  },
  product: {
    src: '/assets/hub/cozy/rooms/product-v2.webp',
    width: 1672, height: 941,
    hotspots: {
      'aipm-studio-dk': { label: '灵感画架', polygon: [[.039,.125],[.202,.169],[.252,.778],[.088,.804],[.064,.574]] },
      'evopm-workbench': { label: '演进齿轮', polygon: [[.405,.338],[.466,.235],[.544,.230],[.584,.292],[.588,.397],[.549,.474],[.548,.557],[.418,.564],[.413,.492]] },
      'ai-dev-collaboration-workbench': { label: '开发工作台', polygon: [[.762,.341],[.873,.342],[.869,.469],[.906,.489],[.896,.511],[.726,.496],[.730,.473],[.760,.454]] },
    },
    lights: [[.474,.086,.05],[.936,.367,.04],[.314,.333,.04],[.592,.255,.025],[.655,.157,.03]],
  },
  life: {
    src: '/assets/hub/cozy/rooms/life-v2.webp',
    width: 1672, height: 941,
    hotspots: {
      'wandeng-evening': { label: '沙发旁的晚灯', polygon: [[.029,.218],[.099,.221],[.127,.360],[.071,.373],[.070,.818],[.102,.867],[.087,.892],[.026,.889],[.026,.864],[.054,.816],[.051,.371],[.001,.362]] },
      'roommate-housekeeper': { label: '门边的钥匙架', polygon: [[.857,.245],[.880,.183],[.914,.135],[.941,.143],[.959,.171],[.984,.188],[.986,.462],[.975,.479],[.868,.452]] },
    },
    lights: [[.063,.293,.065],[.666,.453,.055],[.463,.616,.025],[.465,.078,.045],[.802,.180,.028]],
  },
  games: {
    src: '/assets/hub/cozy/rooms/games-v2.webp',
    width: 1672, height: 941,
    hotspots: {
      'jlu-campus': { label: '桌边的旅行手册', polygon: [[.593,.844],[.627,.824],[.650,.839],[.652,.871],[.641,.895],[.615,.909],[.589,.890],[.587,.867]] },
      'cloudrush-runner': { label: '云端风景画', polygon: [[.085,.079],[.277,.112],[.276,.375],[.088,.382]] },
      'starfall-creature-isles': { label: '精灵玻璃花园', polygon: [[.116,.310],[.130,.371],[.170,.391],[.201,.451],[.215,.610],[.213,.698],[.178,.734],[.186,.858],[.144,.893],[.066,.879],[.054,.741],[.018,.706],[.019,.581],[.029,.466],[.064,.398],[.108,.368]] },
      'pocket-arcade-ten': { label: '复古街机', polygon: [[.295,.267],[.319,.229],[.416,.231],[.419,.386],[.430,.429],[.426,.589],[.329,.600],[.294,.566]] },
      'yourwar-battle-forge': { label: '战争沙盘', polygon: [[.297,.631],[.406,.589],[.475,.581],[.505,.530],[.541,.534],[.574,.596],[.734,.634],[.779,.671],[.647,.771],[.499,.819],[.344,.724]] },
      'mistbound-letters': { label: '书架上的邮船', polygon: [[.666,.382],[.691,.348],[.721,.299],[.738,.265],[.756,.247],[.775,.288],[.783,.348],[.811,.386],[.826,.398],[.811,.464],[.753,.476],[.696,.449]] },
      'moonlit-immortal-chronicle': { label: '山水卷轴', polygon: [[.780,.084],[.857,.073],[.858,.426],[.826,.426],[.812,.369],[.795,.314],[.776,.273]] },
      'yunque-sanguo': { label: '三国将旗', polygon: [[.935,.192],[.946,.220],[.945,.297],[.996,.310],[.993,.756],[.979,.800],[.965,.760],[.956,.817],[.971,.866],[.958,.903],[.910,.915],[.887,.895],[.900,.850],[.925,.815],[.927,.765],[.874,.736],[.870,.352],[.861,.333],[.870,.305],[.928,.301],[.929,.228]] },
    },
    lights: [[.489,.061,.05],[.290,.201,.027],[.272,.403,.03],[.134,.562,.035],[.757,.547,.03],[.884,.174,.03],[.704,.907,.035]],
  },
};
