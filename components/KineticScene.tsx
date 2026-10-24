'use client';

import {useEffect,useId,useRef,type CSSProperties} from 'react';
import {BookOpen,Layers,Heart,Gamepad2,Grid2X2,FolderClosed} from 'lucide-react';
import type {HubSceneProps} from '@/lib/hub/theme';
import type {ModuleCategory} from '@/lib/hub/catalog';
import styles from './KineticScene.module.css';

const entrances: {id:ModuleCategory;title:string;subtitle:string;x:string;y:string;Icon:typeof BookOpen}[] = [
  {id:'research',title:'研究与学习',subtitle:'追问，再往前一步',x:'55%',y:'16%',Icon:BookOpen},
  {id:'product',title:'产品与开发',subtitle:'把想法做出来',x:'85%',y:'47%',Icon:Layers},
  {id:'life',title:'生活与陪伴',subtitle:'安放日常的片刻',x:'28%',y:'66%',Icon:Heart},
  {id:'games',title:'游戏',subtitle:'去另一个世界看看',x:'64%',y:'86%',Icon:Gamepad2},
];
const orbits = [
  {cx:555,cy:370,rx:316,ry:182,rotation:-23},
  {cx:555,cy:370,rx:244,ry:140,rotation:18},
  {cx:555,cy:370,rx:190,ry:239,rotation:33},
];
const travelers = [
  {orbit:0,phase:.2,speed:.00012,r:3.7},{orbit:0,phase:2.45,speed:.00012,r:2.3},
  {orbit:0,phase:4.4,speed:.00012,r:2.6},{orbit:1,phase:1.4,speed:-.00016,r:3.1},
  {orbit:1,phase:4.2,speed:-.00016,r:2.4},{orbit:2,phase:2.8,speed:.0001,r:2.8},
  {orbit:2,phase:5.9,speed:.0001,r:2.2},
];
function point(orbit:typeof orbits[number],phase:number) {
  const x=Math.cos(phase)*orbit.rx,y=Math.sin(phase)*orbit.ry,angle=orbit.rotation*Math.PI/180;
  return {x:orbit.cx+x*Math.cos(angle)-y*Math.sin(angle),y:orbit.cy+x*Math.sin(angle)+y*Math.cos(angle)};
}

/** A decorative instrument and four ordinary navigation buttons; no app state. */
export default function KineticScene({motion,onSelectCategory,onExplore,onOpenData,disabled}:HubSceneProps) {
  const sceneRef=useRef<HTMLElement>(null);
  const id='kinetic-'+useId().replace(/[^a-zA-Z0-9_-]/g,'');
  const paint=(name:string)=>`url(#${id}-${name})`;

  useEffect(()=>{
    const scene=sceneRef.current;
    if(!scene)return;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    const dots=Array.from(scene.querySelectorAll<SVGCircleElement>('[data-traveler]'));
    const trails=Array.from(scene.querySelectorAll<SVGLineElement>('[data-trail]'));
    const traces=Array.from(scene.querySelectorAll<SVGEllipseElement>('[data-trace]'));
    let active=true,frame=0,last=0,elapsed=0,x=0,y=0,targetX=0,targetY=0;
    const allowed=()=>active&&motion&&!reduced.matches&&!document.hidden;
    function draw() {
      scene!.style.setProperty('--drift-x',`${x*10}px`);
      scene!.style.setProperty('--drift-y',`${y*7}px`);
      scene!.style.setProperty('--pitch',`${-y*2.5}deg`);
      scene!.style.setProperty('--yaw',`${x*3.5}deg`);
      scene!.style.setProperty('--core-float',`${Math.sin(elapsed/1800)*4}px`);
      scene!.style.setProperty('--beam-shift',`${Math.sin(elapsed/3400)*9}px`);
      travelers.forEach((traveler,index)=>{
        const phase=traveler.phase+elapsed*traveler.speed;
        const head=point(orbits[traveler.orbit],phase),tail=point(orbits[traveler.orbit],phase-Math.sign(traveler.speed)*.075);
        dots[index]?.setAttribute('cx',String(head.x));dots[index]?.setAttribute('cy',String(head.y));
        trails[index]?.setAttribute('x1',String(tail.x));trails[index]?.setAttribute('y1',String(tail.y));
        trails[index]?.setAttribute('x2',String(head.x));trails[index]?.setAttribute('y2',String(head.y));
      });
      traces.forEach((trace,index)=>trace.setAttribute('stroke-dashoffset',String(-elapsed/(55+index*19))));
    }
    function stop() {if(frame)cancelAnimationFrame(frame);frame=0;last=0;}
    function tick(now:number) {
      frame=0;
      if(!allowed())return;
      const delta=last?Math.min(now-last,40):0;last=now;elapsed+=delta;
      const ease=1-Math.exp(-delta/145);x+=(targetX-x)*ease;y+=(targetY-y)*ease;
      draw();frame=requestAnimationFrame(tick);
    }
    function reconcile() {
      stop();
      if(allowed()){scene!.dataset.motion='active';frame=requestAnimationFrame(tick);}
      else if(!motion||reduced.matches){
        scene!.dataset.motion='static';x=y=targetX=targetY=elapsed=0;draw();
      }else scene!.dataset.motion='paused';
    }
    function pointer(event:PointerEvent) {
      if(!allowed()||event.pointerType==='touch')return;
      const rect=scene!.getBoundingClientRect();if(!rect.width||!rect.height)return;
      targetX=Math.max(-1,Math.min(1,(event.clientX-rect.left)/rect.width*2-1));
      targetY=Math.max(-1,Math.min(1,(event.clientY-rect.top)/rect.height*2-1));
    }
    function leave(){targetX=targetY=0;}
    scene.addEventListener('pointermove',pointer,{passive:true});
    scene.addEventListener('pointerleave',leave,{passive:true});
    document.addEventListener('visibilitychange',reconcile);
    reduced.addEventListener('change',reconcile);
    draw();reconcile();
    return()=>{
      active=false;stop();scene.dataset.motion='static';
      scene.removeEventListener('pointermove',pointer);scene.removeEventListener('pointerleave',leave);
      document.removeEventListener('visibilitychange',reconcile);reduced.removeEventListener('change',reconcile);
    };
  },[motion]);

  return <section ref={sceneRef} className={styles.scene} data-motion="static" aria-labelledby={`${id}-title`}>
    <div className={styles.atmosphere} aria-hidden="true"><div className={styles.floor}/><div className={styles.lightField}/><div className={styles.horizon}/></div>
    <div className={styles.copy}>
      <h1 id={`${id}-title`} className={styles.title}>让好奇心，<br/>自由运行。</h1>
      <p className={styles.description}>研究、创造、生活与游戏。<br/>从你此刻的兴趣出发，继续下一段探索。</p>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} disabled={disabled} onClick={onExplore}><Grid2X2 size={18} strokeWidth={1.6}/>探索全部应用</button>
        <button type="button" className={styles.secondary} disabled={disabled} onClick={onOpenData}><FolderClosed size={18} strokeWidth={1.6}/>我的数据</button>
      </div>
    </div>

    <div className={styles.installation}>
      <svg className={styles.instrument} viewBox="0 0 1000 680" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`${id}-metal`} x1="0" y1="0" x2=".9" y2="1"><stop stopColor="#FAFDFF"/><stop offset=".27" stopColor="#A1B6D1"/><stop offset=".54" stopColor="#F1F7FE"/><stop offset="1" stopColor="#526E95"/></linearGradient>
          <linearGradient id={`${id}-top`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#D4E6F6"/><stop offset=".42" stopColor="#6085AC"/><stop offset=".72" stopColor="#B4D3E9"/><stop offset="1" stopColor="#3D628E"/></linearGradient>
          <linearGradient id={`${id}-side`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#426B98"/><stop offset="1" stopColor="#172D4C"/></linearGradient>
          <linearGradient id={`${id}-floor`} x1="0" y1="0" x2="1" y2=".6"><stop stopColor="#A6CBE5" stopOpacity=".07"/><stop offset=".5" stopColor="#A6CBE5" stopOpacity=".36"/><stop offset="1" stopColor="#D0EDFF" stopOpacity=".05"/></linearGradient>
          <linearGradient id={`${id}-light`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#C9F3FF" stopOpacity="0"/><stop offset=".55" stopColor="#BDF2FF"/><stop offset="1" stopColor="#F6FCFF"/></linearGradient>
          <radialGradient id={`${id}-aura`}><stop stopColor="#96DFFF" stopOpacity=".28"/><stop offset="1" stopColor="#96DFFF" stopOpacity="0"/></radialGradient>
          <filter id={`${id}-soft`} x="-50%" y="-100%" width="200%" height="300%"><feGaussianBlur stdDeviation="15"/></filter>
          <filter id={`${id}-glow`} x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="3"/></filter>
        </defs>
        <ellipse cx="570" cy="350" rx="340" ry="290" fill={paint('aura')}/>
        <g className={styles.floorMarks} stroke="#BBD9EF" strokeWidth="1" fill="none">
          <path d="M110 540 530 340 950 540M195 580 570 400 945 580M280 620 610 460 940 620"/>
          <path d="m300 440 390 195m-290-242 390 195m-290-242 390 195"/>
          {[0,1,2,3,4,5,6,7].map(index=><circle key={index} cx={260+index*86} cy={570+(index%3)*13} r="2" fill="#D2E8F8" stroke="none"/>)}
        </g>
        <ellipse cx="562" cy="559" rx="197" ry="43" fill="#060F29" opacity=".6" filter={paint('soft')}/>
        <path d="M285 530 525 415 800 535 560 650Z" fill={paint('floor')} stroke="#C6E6FC" strokeOpacity=".2"/>
        <path d="m285 530 275 120 240-115v12L560 666 285 543Z" fill="#1D3859"/>
        <path d="m285 530 275 120 240-115" fill="none" stroke="#CDEAFF" strokeOpacity=".48"/>
        {orbits.map((orbit,index)=><ellipse key={index} cx={orbit.cx} cy={orbit.cy} rx={orbit.rx} ry={orbit.ry} transform={`rotate(${orbit.rotation} ${orbit.cx} ${orbit.cy})`} fill="none" stroke={index===0?paint('metal'):'#9FC8EC'} strokeWidth={index===0?2.6:1.1} opacity={index===0?.74:.32}/>) }
        <g className={styles.core}>
          <path d="M595 111v383" stroke="#B8EEFF" strokeOpacity=".22" strokeWidth="19" filter={paint('soft')}/>
          <path d="M595 111v383" stroke="#AEEAFF" strokeOpacity=".8" strokeWidth="2"/>
          {[173,254,335,416].map((top,index)=><g key={top}>
            <path d={`M470 ${top} 600 ${top-54} 735 ${top+15} 605 ${top+72}Z`} fill={paint(index===0?'metal':'top')} stroke="#E0F0FF" strokeOpacity=".5"/>
            <path d={`M470 ${top} 605 ${top+72}v18L470 ${top+18}Z`} fill="#577A9F"/>
            <path d={`M605 ${top+72} 735 ${top+15}v18L605 ${top+90}Z`} fill={paint('side')}/>
            <path d={`m486 ${top+9} 118 63 114-49`} fill="none" stroke="#C5F0FF" strokeWidth="1.3" strokeOpacity={index===2?.9:.38}/>
            <path d={`m520 ${top-6} 79-33 82 42-78 33Z`} fill="#283F62" fillOpacity=".35" stroke="#D9EFFB" strokeOpacity=".24"/>
          </g>)}
          <path d="m580 148 19-8 20 10-19 8Z" fill="#F0FCFF"/>
        </g>
        <path d="M263 441C355 558 626 563 838 356" fill="none" stroke={paint('metal')} strokeWidth="3" opacity=".9"/>
        {orbits.map((orbit,index)=><ellipse key={index} data-trace={index} cx={orbit.cx} cy={orbit.cy} rx={orbit.rx} ry={orbit.ry} transform={`rotate(${orbit.rotation} ${orbit.cx} ${orbit.cy})`} fill="none" pathLength="1000" stroke={paint('light')} strokeWidth={index===0?3.2:2} strokeLinecap="round" strokeDasharray={`${60-index*12} ${940+index*12}`} strokeDashoffset="0"/>)}
        {travelers.map((traveler,index)=>{
          const head=point(orbits[traveler.orbit],traveler.phase),tail=point(orbits[traveler.orbit],traveler.phase-Math.sign(traveler.speed)*.075);
          return <g key={index}><line data-trail={index} x1={tail.x} y1={tail.y} x2={head.x} y2={head.y} stroke="#9BDFFF" strokeWidth={traveler.r*.8} strokeOpacity=".55"/><circle data-traveler={index} cx={head.x} cy={head.y} r={traveler.r} fill="#E5F8FF"/></g>;
        })}
      </svg>
      <nav className={styles.entrances} aria-label="选择应用分类">
        {entrances.map(({id:category,title,subtitle,x,y,Icon})=><button key={category} type="button" className={styles.orbitControl} data-category={category} style={{'--anchor-x':x,'--anchor-y':y} as CSSProperties} disabled={disabled} onClick={()=>onSelectCategory(category)}>
          <span className={styles.controlIcon}><Icon size={18} strokeWidth={1.6}/></span><span><strong>{title}</strong><small>{subtitle}</small></span>
        </button>)}
      </nav>
    </div>
  </section>;
}
