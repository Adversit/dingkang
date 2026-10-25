import type {HubModule,ModuleCategory} from './catalog';

export type HubThemeId = 'classic' | 'night-harbor' | 'kinetic' | 'cozy';
export type HubAppearance = {theme:HubThemeId;motion:boolean};
/** Scene presenters receive actions; all account, routing and save logic stays in the portal. */
export type HubSceneProps = {
  motion:boolean;
  recentModules:readonly HubModule[];
  onLaunch(module:HubModule):void;
  onExplore():void;
  onSelectCategory(category:ModuleCategory):void;
  onOpenData():void;
  disabled:boolean;
};
export type HubTheme = {
  id:HubThemeId;
  name:string;
  description:string;
  identity:string;
  colors:{background:string;surface:string;raised:string;text:string;muted:string;accent:string;accentText:string;line:string};
  scene:{src:string|null;position:string;shade:string};
  motion:{supported:boolean;durationSeconds:number};
};

export const hubThemes:readonly HubTheme[] = [
  {
    id:'classic',name:'经典工作台',description:'清晰有序，专注手头的事。',identity:'工作空间',
    colors:{background:'#F8FAFC',surface:'#FFFFFF',raised:'#EAF0F6',text:'#24384D',muted:'#62768A',accent:'#365F83',accentText:'#FFFFFF',line:'#D8E2EB'},
    scene:{src:null,position:'center',shade:'transparent'},
    motion:{supported:false,durationSeconds:26},
  },
  {
    id:'night-harbor',name:'夜航实验室',description:'山海夜色，留一盏灯。',identity:'夜航实验室',
    colors:{background:'#0E1718',surface:'#172325',raised:'#1F2D2F',text:'#F6F4EE',muted:'#B9C5C4',accent:'#DFFD56',accentText:'#17210B',line:'#344345'},
    scene:{src:'/assets/hub/night-harbor.webp',position:'center 56%',shade:'rgba(5,16,18,.78)'},
    motion:{supported:true,durationSeconds:26},
  },
  {
    id:'kinetic',name:'灵感轨道',description:'让想法相遇，让灵感流动。',identity:'灵感轨道',
    colors:{background:'#F1F4FA',surface:'#FFFFFF',raised:'#E4EAF6',text:'#1E2944',muted:'#5B687F',accent:'#3549C5',accentText:'#FFFFFF',line:'#CFD7E5'},
    scene:{src:null,position:'center',shade:'transparent'},
    motion:{supported:true,durationSeconds:28},
  },
  {
    id:'cozy',name:'暖居小镇',description:'在自己的小天地，慢慢生长。',identity:'暖居小镇',
    colors:{background:'#F5F0E5',surface:'#FFFCF4',raised:'#E9E6D7',text:'#4B4435',muted:'#726B58',accent:'#65734C',accentText:'#FFFFFF',line:'#D4CFBA'},
    scene:{src:'/assets/hub/cozy/island-v2.webp',position:'69% center',shade:'transparent'},
    motion:{supported:true,durationSeconds:30},
  },
];

export const defaultAppearance:HubAppearance = {theme:'night-harbor',motion:true};
/** URLs accept only current exact IDs; the legacy quiet alias is only a saved-preference migration. */
export function parseThemeId(value:unknown):HubThemeId|null {
  return typeof value==='string'&&hubThemes.some(theme=>theme.id===value)?value as HubThemeId:null;
}
export function parseAppearance(raw?:string):HubAppearance {
  try {
    const value=JSON.parse(raw||'null');
    return {
      theme:value?.theme==='quiet'?'classic':parseThemeId(value?.theme)||defaultAppearance.theme,
      motion:typeof value?.motion==='boolean'?value.motion:defaultAppearance.motion,
    };
  } catch {return {...defaultAppearance};}
}
export function appearanceForRoute(saved:HubAppearance,urlTheme:HubThemeId|null):HubAppearance {
  return {...saved,theme:urlTheme||saved.theme};
}
export function buildHubUrl(moduleId:string|null,style:HubThemeId|null,search=''):string {
  const params=new URLSearchParams(search);
  params.delete('app');params.delete('style');
  if(style)params.set('style',style);
  if(moduleId)params.set('app',moduleId);
  const query=params.toString();return '/'+(query?'?'+query:'');
}
export const themeById=(id:HubThemeId)=>hubThemes.find(theme=>theme.id===id)||hubThemes[1];
export function themeVariables(theme:HubTheme):Record<string,string> {
  return {
    '--hub-bg':theme.colors.background,'--hub-surface':theme.colors.surface,
    '--hub-raised':theme.colors.raised,'--hub-text':theme.colors.text,
    '--hub-muted':theme.colors.muted,'--hub-accent':theme.colors.accent,
    '--hub-accent-text':theme.colors.accentText,'--hub-line':theme.colors.line,
    '--hub-scene-shade':theme.scene.shade,'--hub-motion-duration':theme.motion.durationSeconds+'s',
  };
}
export type HubArtwork={src:string;position?:string;label:string};
export const moduleArtwork:Record<string,HubArtwork> = {
  'jlu-campus':{src:'/apps/jlu-campus/data/overview.svg',position:'50% 50%',label:'吉林大学前卫南区真实 OSM 几何地图'},
  'yourwar-battle-forge':{src:'/assets/hub/yourwar.webp',position:'50% 52%',label:'YourWar 战术沙盘场景'},
  'pocket-arcade-ten':{src:'/assets/hub/pocket-arcade.webp',position:'50% 48%',label:'游乐场中的游戏场景'},
  'wandeng-evening':{src:'/assets/wandeng-evening/scenes/evening-room.webp',position:'50% 54%',label:'晚灯中的陪伴场景'},
  'starfall-creature-isles':{src:'/apps/starfall-creature-isles/assets/world-map.webp',position:'50% 45%',label:'星屿同行群岛地图'},
  'mistbound-letters':{src:'/apps/mistbound-letters/assets/harbor.webp',position:'50% 48%',label:'雾海来信港口场景'},
  'moonlit-immortal-chronicle':{src:'/assets/moonlit-immortal-chronicle/moonlit-mountains.webp',position:'50% 47%',label:'月下问仙录山水场景'},
  'yunque-sanguo':{src:'/assets/yunque-sanguo/art/optimized/citadel.webp',position:'50% 42%',label:'云阙三国城池场景'},
  'cloudrush-runner':{src:'/apps/cloudrush-runner/assets/v2/world-night.webp',position:'50% 50%',label:'逐风奇旅夜间世界'},
};
export const categoryPresentation:Record<ModuleCategory,{title:string;description:string}> = {
  research:{title:'沿着好奇，向前一步。',description:'发现信息，整理研究，把理解慢慢变深。'},
  product:{title:'让想法，成为作品。',description:'从产品判断，到一次完整的交付。'},
  life:{title:'生活里，也留一点温度。',description:'照顾共同的日常，收好属于自己的片刻。'},
  games:{title:'现在，去另一个世界。',description:'不同的旅程，随时接着上次出发。'},
};
