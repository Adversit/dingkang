'use client';

import {ArrowDown,ArrowUpRight,BookOpen,Layers,Heart,Gamepad2,Pause,Play,FolderOpen} from 'lucide-react';
import type {HubSceneProps} from '@/lib/hub/theme';
import type {ModuleCategory} from '@/lib/hub/catalog';
import styles from './KineticScene.module.css';

const entrances:{id:ModuleCategory;name:string;verb:string;Icon:typeof BookOpen}[]=[
  {id:'research',name:'研究与学习',verb:'发现与理解',Icon:BookOpen},
  {id:'product',name:'产品与开发',verb:'构想与实现',Icon:Layers},
  {id:'life',name:'生活与陪伴',verb:'日常与片刻',Icon:Heart},
  {id:'games',name:'游戏与冒险',verb:'进入另一个世界',Icon:Gamepad2},
];
type Props=HubSceneProps&{motionEnabled:boolean;reducedMotion:boolean;onToggleMotion():void};

/** Presentation only: every entrance uses the shared workspace actions. */
export default function KineticScene({recentModules,onLaunch,onExplore,onSelectCategory,onOpenData,disabled,motionEnabled,reducedMotion,onToggleMotion}:Props){
  return <section className={styles.scene} aria-labelledby="kinetic-title">
    <div className={styles.hero} data-kinetic-hero>
      <div className={styles.copy}>
        <h1 id="kinetic-title"><span>让好奇心</span><span>自由运行。</span></h1>
        <p>从一个念头，到一件作品。<br/>研究、创造和日常，都在这里发生。</p>
        <div className={styles.actions}>
          <button className={styles.explore} disabled={disabled} onClick={onExplore}>探索我的应用<ArrowDown size={20}/></button>
          <button className={styles.data} disabled={disabled} onClick={onOpenData}><FolderOpen size={19}/>我的数据</button>
        </div>
        {recentModules.length>0&&<div className={styles.recents}><span>接着上次</span>{recentModules.slice(0,2).map(module=><button key={module.id} disabled={disabled} onClick={()=>onLaunch(module)}>{module.name}<ArrowUpRight size={17}/></button>)}</div>}
      </div>
      <div className={styles.artSpace} aria-hidden="true"><span className={styles.arc}/><span className={styles.arc}/><span className={styles.axis}/><span className={styles.centerDot}/></div>
      <button className={styles.motion} disabled={disabled||reducedMotion} aria-pressed={motionEnabled&&!reducedMotion} onClick={onToggleMotion}>{motionEnabled&&!reducedMotion?<Pause size={16}/>:<Play size={16}/>}<span>{reducedMotion?'已减少动效':motionEnabled?'暂停动效':'开启动效'}</span></button>
    </div>
    <nav className={styles.entrances} aria-label="选择应用分类">
      {entrances.map(({id,name,verb,Icon})=><button key={id} className={styles.entrance} data-category={id} disabled={disabled} onClick={()=>onSelectCategory(id)} data-kinetic-interactive>
        <span className={styles.symbol} aria-hidden="true"><i/><i/><Icon size={24} strokeWidth={1.5}/></span>
        <span className={styles.label}><strong>{name}</strong><span>{verb}</span></span><ArrowUpRight className={styles.arrow} size={23}/>
      </button>)}
    </nav>
  </section>;
}
