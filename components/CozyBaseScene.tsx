'use client';

import {useCallback,useEffect,useRef,useState,type KeyboardEvent} from 'react';
import {ArrowLeft,ArrowUpRight,BookOpen,ChevronRight,Compass,DoorOpen,Hammer,House,List,Search,Volume2,VolumeX,X} from 'lucide-react';
import {categories,modules,type HubModule,type ModuleCategory} from '@/lib/hub/catalog';
import type {HubSceneProps} from '@/lib/hub/theme';
import type {CozySceneController} from '@/lib/hub/cozy-scene';
import {cozyRoomArt} from '@/lib/hub/cozy-room-art';
import {createCozyAudio,type CozyAudioController} from '@/lib/hub/cozy-audio';
import styles from './CozyBaseScene.module.css';

const buildings=[
  {category:'research',name:'研习书屋',icon:BookOpen},
  {category:'product',name:'造物工坊',icon:Hammer},
  {category:'life',name:'日常小屋',icon:House},
  {category:'games',name:'冒险收藏室',icon:Compass},
] satisfies {category:ModuleCategory;name:string;icon:typeof BookOpen}[];
export type CozyBaseSceneProps=HubSceneProps&{initialRoom?:ModuleCategory|null;onRoomChange?:(room:ModuleCategory|null)=>void};

/** The island owns view state only; the shared portal owns navigation and saved data. */
export default function CozyBaseScene(props:CozyBaseSceneProps) {
  const {motion,onExplore,disabled}=props;
  const host=useRef<HTMLDivElement>(null),heading=useRef<HTMLHeadingElement>(null),roomButtons=useRef<(HTMLButtonElement|null)[]>([]);
  const latest=useRef(props),roomRef=useRef<ModuleCategory|null>(props.initialRoom??null),selectedRef=useRef<ModuleCategory|null>(props.initialRoom??null);
  const selectedModuleRef=useRef<HubModule|null>(null),transitionRef=useRef(false),launchGate=useRef(false);
  const controller=useRef<CozySceneController|null>(null),audio=useRef<CozyAudioController|null>(null),soundRequested=useRef(false),soundStarting=useRef(false),soundAttempt=useRef(0);
  const [status,setStatus]=useState<'loading'|'ready'|'fallback'>('loading');
  const [room,setRoom]=useState<ModuleCategory|null>(props.initialRoom??null),[selectedRoom,setSelectedRoom]=useState<ModuleCategory|null>(props.initialRoom??null);
  const [hovered,setHovered]=useState<ModuleCategory|null>(null),[hoveredModule,setHoveredModule]=useState<HubModule|null>(null),[selectedModule,setSelectedModule]=useState<HubModule|null>(null);
  const [transitioning,setTransitioning]=useState(false),[listOpen,setListOpen]=useState(false),[soundOn,setSoundOn]=useState(false),[soundPending,setSoundPending]=useState(false),[soundError,setSoundError]=useState('');
  useEffect(()=>{latest.current=props;if(!props.disabled)launchGate.current=false;},[props]);
  useEffect(()=>{
    let mounted=true;
    audio.current=createCozyAudio(playing=>{if(mounted){
      setSoundOn(playing);
      if(playing||!soundStarting.current||document.hidden){soundRequested.current=playing;soundStarting.current=false;setSoundPending(false);}
    }});
    audio.current.setRoom(Boolean(roomRef.current));
    return()=>{mounted=false;soundRequested.current=false;soundStarting.current=false;audio.current?.dispose();audio.current=null;};
  },[]);
  const stopSound=useCallback(()=>{soundAttempt.current++;soundRequested.current=false;soundStarting.current=false;audio.current?.stop();setSoundPending(false);},[]);
  const previewRoom=useCallback((category:ModuleCategory)=>{
    if(latest.current.disabled||transitionRef.current||roomRef.current)return;
    selectedRef.current=category;setSelectedRoom(category);setHovered(null);controller.current?.setSelected(category);
  },[]);
  const chooseRoom=useCallback((category:ModuleCategory|null)=>{
    if(latest.current.disabled||(category&&transitionRef.current)||category===roomRef.current)return;
    const previous=roomRef.current;
    selectedRef.current=category??previous??selectedRef.current;setSelectedRoom(selectedRef.current);
    roomRef.current=category;setRoom(category);setHovered(null);setHoveredModule(null);setSelectedModule(null);selectedModuleRef.current=null;setListOpen(false);launchGate.current=false;
    controller.current?.setSelected(selectedRef.current);controller.current?.enter(category);
    audio.current?.setRoom(Boolean(category));if(category)audio.current?.door();
    latest.current.onRoomChange?.(category);
  },[]);
  const launchModule=useCallback((module:HubModule)=>{
    if(latest.current.disabled||transitionRef.current||launchGate.current||module.category!==roomRef.current)return;
    launchGate.current=true;selectedModuleRef.current=module;setSelectedModule(module);controller.current?.highlightModule(module.id);stopSound();
    try{latest.current.onLaunch(module);}catch(error){launchGate.current=false;throw error;}
  },[stopSound]);
  useEffect(()=>{
    let cancelled=false;
    const element=host.current;if(!element)return;
    import('@/lib/hub/cozy-scene').then(({createCozyScene})=>{
      if(cancelled)return;
      return createCozyScene(element,{
        state:()=>({motion:latest.current.motion,disabled:latest.current.disabled}),
        select:chooseRoom,preview:previewRoom,
        hover:category=>{if(!cancelled)setHovered(category);},
        hoverModule:module=>{if(!cancelled){setHoveredModule(module);if(!module&&selectedModuleRef.current)controller.current?.highlightModule(selectedModuleRef.current.id);}},
        launch:launchModule,
        transition:busy=>{if(!cancelled){transitionRef.current=busy;setTransitioning(busy);}},
        fail:()=>{if(!cancelled){controller.current?.dispose();controller.current=null;transitionRef.current=false;setTransitioning(false);setStatus('fallback');}},
      });
    }).then(scene=>{
      if(!scene)return;if(cancelled){scene.dispose();return;}
      controller.current=scene;scene.setSelected(selectedRef.current);if(roomRef.current)scene.enter(roomRef.current,true);setStatus('ready');
    }).catch(()=>{if(!cancelled){transitionRef.current=false;setTransitioning(false);setStatus('fallback');}});
    return()=>{cancelled=true;controller.current?.dispose();controller.current=null;};
  },[chooseRoom,previewRoom,launchModule]);
  useEffect(()=>{controller.current?.update();},[motion,disabled]);
  useEffect(()=>{if(room)heading.current?.focus({preventScroll:true});},[room]);
  const current=buildings.find(b=>b.category===room),selected=buildings.find(b=>b.category===selectedRoom),hoveredBuilding=buildings.find(b=>b.category===hovered);
  const roomModules=room?modules.filter(m=>m.category===room):[],shownModule=hoveredModule||selectedModule;
  const showList=Boolean(room&&(listOpen||status==='fallback')),blocked=disabled||transitioning;
  const itemLabel=(module:HubModule)=>cozyRoomArt[module.category].hotspots[module.id]?.label||module.subtitle;
  function highlightModule(module:HubModule|null,commit=false){
    if(blocked)return;setHoveredModule(module);
    if(commit){selectedModuleRef.current=module;setSelectedModule(module);}
    controller.current?.highlightModule(module?.id??selectedModuleRef.current?.id??null);
  }
  function moveSelection(delta:number){
    if(blocked)return;
    if(room){const found=roomModules.findIndex(module=>module.id===selectedModuleRef.current?.id),index=found<0&&delta<0?0:found;const next=(index+delta+roomModules.length)%roomModules.length;highlightModule(roomModules[next]||null,true);}
    else{const found=buildings.findIndex(building=>building.category===selectedRef.current),index=found<0&&delta<0?0:found;previewRoom(buildings[(index+delta+buildings.length)%buildings.length].category);}
  }
  function canvasKey(event:KeyboardEvent<HTMLDivElement>){
    if(event.altKey||event.ctrlKey||event.metaKey||disabled)return;
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();moveSelection(event.key==='ArrowLeft'?-1:1);}
    else if(event.key==='Enter'){event.preventDefault();if(room&&selectedModuleRef.current)launchModule(selectedModuleRef.current);else if(!room&&selectedRef.current)chooseRoom(selectedRef.current);}
    else if(event.key==='Escape'){event.preventDefault();if(room)chooseRoom(null);else{selectedRef.current=null;setSelectedRoom(null);controller.current?.setSelected(null);}}
  }
  function roomKey(event:KeyboardEvent<HTMLButtonElement>,index:number){
    if(blocked)return;
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'||event.key==='Home'||event.key==='End'){
      event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?buildings.length-1:(index+(event.key==='ArrowLeft'?-1:1)+buildings.length)%buildings.length;
      previewRoom(buildings[next].category);roomButtons.current[next]?.focus();
    }else if(event.key==='Enter'&&selectedRef.current===buildings[index].category){event.preventDefault();chooseRoom(buildings[index].category);}
  }
  async function toggleSound(){
    setSoundError('');
    if(soundRequested.current||soundOn||soundPending){stopSound();return;}
    if(disabled)return;
    const attempt=++soundAttempt.current;soundRequested.current=true;soundStarting.current=true;setSoundPending(true);
    const engine=audio.current;if(!engine)return;
    const playing=await engine.enable();
    if(audio.current!==engine||soundAttempt.current!==attempt)return;
    soundRequested.current=playing;soundStarting.current=false;setSoundPending(false);if(!playing&&!document.hidden)setSoundError('声音未开启，可再次尝试。');
  }
  const fallbackSrc=room?cozyRoomArt[room].src:'/assets/hub/cozy/island-v2.webp';
  return <section className={styles.scene} data-motion={motion?'on':'off'} data-renderer={status} data-room={room||'island'} aria-labelledby="cozy-base-title">
    <div className={styles.stage}>
      <div className={styles.sceneBackdrop} style={{backgroundImage:`url("${fallbackSrc}")`}} aria-hidden="true"/>
      {/* eslint-disable-next-line @next/next/no-img-element -- Pre-optimized local WebP remains visible until the WebGL texture is ready. */}
      {status!=='ready'&&<img className={styles.fallback} src={fallbackSrc} alt={room?`${current?.name}的室内场景`:'海风与暖灯环绕的小岛'}/>}
      <div ref={host} className={styles.canvas} role="region" tabIndex={0} aria-busy={transitioning||status==='loading'} aria-label={room?`${current?.name}。方向键选择物件，Enter打开，Escape返回海岛。`:'海岛场景。方向键选择小屋，Enter进入，Escape取消选择。'} onKeyDown={canvasKey}/>
      <div className={styles.edgeShade} aria-hidden="true"/>
    </div>
    <header className={styles.header}>
      <div className={styles.heading}>
        {room&&<button className={styles.iconButton} type="button" disabled={disabled} onClick={()=>chooseRoom(null)} aria-label="返回海岛"><ArrowLeft size={20}/></button>}
        <h1 ref={heading} tabIndex={-1} id="cozy-base-title">{current?.name||'暖居海岛'}</h1>
      </div>
      <div className={styles.toolbar}>
        <button className={styles.toolButton} type="button" disabled={disabled&&!soundOn&&!soundPending} aria-pressed={soundOn} aria-busy={soundPending} aria-label={soundOn||soundPending?'关闭环境音':'开启环境音'} title={soundOn||soundPending?'关闭环境音':'开启环境音'} onClick={()=>void toggleSound()}>{soundOn?<Volume2 size={19}/>:<VolumeX size={19}/>}<span className={styles.soundText}>{soundPending?'声音开启中':soundOn?'环境音开启':'声音关闭'}</span></button>
        {room&&<button className={styles.toolButton} type="button" aria-label="房间物件" aria-expanded={showList} aria-controls="cozy-room-items" disabled={blocked} onClick={()=>setListOpen(!showList)}><List size={19}/><span>物件</span></button>}
        <button className={styles.toolButton} type="button" aria-label="目录" disabled={disabled} onClick={()=>{stopSound();onExplore();}}><Search size={19}/><span>目录</span></button>
      </div>
    </header>
    {soundError&&<p className={styles.soundNote} role="status">{soundError}</p>}
    {status==='fallback'&&<p className={styles.fallbackNote} role="status">场景暂未加载，可用下方标签与物件清单继续。</p>}
    <div className={styles.bottomHud}>
      {!room&&selected?<div className={styles.nameplate} data-selected="true">
        <span className={styles.seal}><selected.icon size={23} strokeWidth={1.6}/></span>
        <div className={styles.plateText}><strong>{selected.name}</strong><span>{categories.find(category=>category.id===selected.category)?.name}</span></div>
        <button className={styles.enterButton} type="button" disabled={blocked} onClick={()=>chooseRoom(selected.category)}><span>{transitioning?'正在进屋':'进入小屋'}</span><ChevronRight size={18}/></button>
      </div>:room&&shownModule?<div className={styles.nameplate} data-selected="true">
        <span className={styles.seal}><DoorOpen size={22} strokeWidth={1.6}/></span>
        <div className={styles.plateText}><small>{itemLabel(shownModule)}</small><strong>{shownModule.name}</strong><span>{shownModule.subtitle}</span></div>
        <button className={styles.enterButton} type="button" disabled={blocked} onClick={()=>launchModule(shownModule)}><span>打开</span><ArrowUpRight size={18}/></button>
      </div>:<div className={styles.hint}>{transitioning?'正在推开小屋的门…':room?'轻触物件，打开它的世界。':hoveredBuilding?`${hoveredBuilding.name} · 点击选中`:'选一座小屋，走进去看看。'}</div>}
      {!room&&<nav className={styles.rooms} aria-label="选择小屋，方向键移动，Enter进入">
        {buildings.map((building,index)=>{const Icon=building.icon;return <button key={building.category} ref={element=>{roomButtons.current[index]=element;}} type="button" className={styles.roomTab} data-selected={selectedRoom===building.category?'true':'false'} aria-pressed={selectedRoom===building.category} tabIndex={selectedRoom===building.category||(!selectedRoom&&index===0)?0:-1} disabled={blocked} onClick={()=>previewRoom(building.category)} onKeyDown={event=>roomKey(event,index)} onMouseEnter={()=>{if(!blocked){controller.current?.highlight(building.category);setHovered(building.category);}}} onMouseLeave={()=>{controller.current?.highlight(null);setHovered(null);}} onFocus={()=>{if(!blocked)controller.current?.highlight(building.category);}} onBlur={()=>controller.current?.highlight(null)}><Icon size={18} strokeWidth={1.7}/><span>{building.name}</span></button>;})}
      </nav>}
    </div>
    {showList&&<aside id="cozy-room-items" className={styles.objectList} aria-label={`${current?.name}里的物件`}>
      <div className={styles.listHeading}><h2>房间里的物件</h2>{status!=='fallback'&&<button className={styles.iconButton} type="button" disabled={disabled} aria-label="收起物件清单" onClick={()=>setListOpen(false)}><X size={19}/></button>}</div>
      <div className={styles.objectItems}>{roomModules.map(module=><button key={module.id} type="button" className={styles.objectButton} data-selected={selectedModule?.id===module.id?'true':'false'} disabled={blocked} onMouseEnter={()=>highlightModule(module)} onMouseLeave={()=>highlightModule(null)} onFocus={()=>highlightModule(module,true)} onBlur={()=>highlightModule(null)} onClick={()=>launchModule(module)}><span className={styles.objectMark} aria-hidden="true"/><span><small>{itemLabel(module)}</small><strong>{module.name}</strong></span><ArrowUpRight size={18}/></button>)}</div>
    </aside>}
    <span className={styles.srOnly} role="status">{room?`位于${current?.name}`:selected?`已选中${selected.name}，可进入小屋。`:'可选择四座小屋。'}</span>
  </section>;
}
