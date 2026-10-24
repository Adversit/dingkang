'use client';
import {useState,useEffect,useRef,CSSProperties,lazy,Suspense,Component,ReactNode} from 'react';
import {FastForward,Pause,Play,Flag,Swords,Volume2,VolumeX,ChevronsRight,Shield} from 'lucide-react';
import {HEROES,STAGES,CHAPTERS,FACTION_COLOR} from './data';
import {Save} from './state';
import {simulate,BattleResult} from './battle';
import Character from './Character';
import {sound,combatSound,stopCombatAudio,setMusicPaused} from './audio';
import {actionTiming} from './choreography';
const BattleStage=lazy(()=>import('./BattleStage'));
class StageBoundary extends Component<{children:ReactNode;onError:()=>void},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}componentDidCatch(){this.props.onError();}render(){return this.state.failed?null:this.props.children;}}
import {useReducedMotion} from './useMotion';
import Effects,{ELEMENT_COLORS as colors,arenaPosition as position} from './effects';
const statusNames:Record<string,string>={burn:'灼烧',poison:'中毒',stun:'眩晕',silence:'沉默',attack:'攻击↑',defdown:'防御↓',taunt:'嘲讽'};
export default function BattleView({save,stageId,onFinish,onExit,audioEnabled,onToggleAudio}:{save:Save;audioEnabled:boolean;onToggleAudio:()=>void;stageId:number;onFinish:(r:BattleResult)=>void;onExit:()=>void}){
 const [result]=useState(()=>simulate(save,stageId));
 const [index,setIndex]=useState(0),[speed,setSpeed]=useState(1),[paused,setPaused]=useState(false),[cinematic,setCinematic]=useState(save.effects!=='reduced'),[hidden,setHidden]=useState(false);
 const muted=!audioEnabled;
 const systemReduced=useReducedMotion(),reduced=systemReduced||save.effects==='reduced';
 const done=useRef(false),finishRef=useRef(onFinish);finishRef.current=onFinish;
 const event=result.events[index],st=STAGES[stageId],isBig=['combo','boss'].includes(event.kind),showCinematic=cinematic&&!reduced;

 const clock=useRef(0),clockIndex=useRef(-1),impactSoundIndex=useRef(-1),swingSoundIndex=useRef(-1),introNotifiedIndex=useRef(-1),fieldRef=useRef<HTMLDivElement>(null);
 const [contactedIndex,setContactedIndex]=useState(-1),[introDoneIndex,setIntroDoneIndex]=useState(-1),[stageReady,setStageReady]=useState(false),[stageFailed,setStageFailed]=useState(false);
 if(clockIndex.current!==index){clockIndex.current=index;clock.current=0;}
 const frozen=paused||hidden||(!stageReady&&!stageFailed);
 useEffect(()=>{setMusicPaused(paused||hidden);if(frozen||muted)stopCombatAudio();return()=>{stopCombatAudio();setMusicPaused(false);};},[paused,hidden,frozen,muted]);
 const timing=actionTiming(event,showCinematic,reduced),contacted=timing.contact===0||contactedIndex===index;
 const displayUnits=contacted?event.units:(result.events[Math.max(0,index-1)]?.units||event.units);
 useEffect(()=>{const sync=()=>setHidden(document.hidden);sync();document.addEventListener('visibilitychange',sync);return()=>document.removeEventListener('visibilitychange',sync);},[]);
 useEffect(()=>{
  if(event.kind==='end'){if(!done.current){done.current=true;sound(result.winner===0?'win':'lose',!muted);finishRef.current(result);}return;}
  let raf=0,last=performance.now();
  const tick=(now:number)=>{const delta=Math.min(70,now-last);last=now;
   if(!frozen&&!document.hidden){clock.current+=delta*speed;
    if(clock.current>=timing.intro&&introNotifiedIndex.current!==index){introNotifiedIndex.current=index;setIntroDoneIndex(index);}
    if(clock.current>=timing.intro+100&&swingSoundIndex.current!==index&&['attack','skill','combo','boss'].includes(event.kind)){swingSoundIndex.current=index;combatSound('swing',event.element,!muted,event.units.find(u=>u.uid===event.actor)?.hero||0,isBig);}
    if(clock.current>=timing.contact&&impactSoundIndex.current!==index){impactSoundIndex.current=index;setContactedIndex(index);if(event.hits.length)combatSound(event.hits.some(h=>h.kind==='critical')?'critical':event.hits.every(h=>h.kind==='heal')?'heal':'impact',event.element,!muted,event.units.find(u=>u.uid===event.actor)?.hero||0,isBig);}
    if(clock.current>=timing.duration){setIndex(i=>Math.min(i+1,result.events.length-1));return;}
   }
   raf=requestAnimationFrame(tick);
  };raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);
 },[index,speed,frozen,showCinematic,reduced,muted]);
 const alive=(side:number)=>displayUnits.filter(u=>u.side===side&&u.hp>0).length;
 const actor=event.units.find(u=>u.uid===event.actor);
 const frontTarget=event.units.find(u=>event.targets.includes(u.uid)&&u.side!==actor?.side);
 const actionKind=event.kind==='attack'?'普攻':event.kind==='combo'?'羁绊合击':event.kind==='boss'?'首领战法':event.kind==='skill'?'怒气战法':'战况';
 return <div className={`battle-screen character-battle ${stageReady?'stage-ready':''} ${stageFailed?'stage-fallback':''} ${frozen?'battle-paused':''} ${reduced?'reduced-motion':''}`} style={{'--event-color':colors[event.element],'--tempo':`${1/speed}`} as CSSProperties}>
  <div className="battle-background"/><div className="battle-atmosphere" aria-hidden="true"/>
  <div className="battle-top"><button className="icon-button" onClick={onExit} aria-label="撤退（不消耗资源）"><Flag size={21}/></button><div><span className="eyebrow">{CHAPTERS[st.chapter].name} / {st.chapter+1}-{stageId%6+1}</span><h2>{st.name}</h2></div><div className="round-counter"><b>{Math.min(event.round||1,20).toString().padStart(2,'0')}</b><span> / 20 回合</span></div><button className="icon-button" onClick={onToggleAudio} aria-label="切换声音">{muted?<VolumeX/>:<Volume2/>}</button></div>
  <div className="battle-factions"><span>云阙军 <small>{alive(0)} / 6</small></span><Swords/><span>{st.boss?'首领军阵':'敌方军阵'} <small>{alive(1)} / 6</small></span></div>
  <div className="battle-field" ref={fieldRef}>
   {!stageReady&&!stageFailed&&<div className="battle-loading" role="status">武将集结中…</div>}
   {!stageFailed&&<StageBoundary onError={()=>{setStageReady(false);setStageFailed(true);}}><Suspense fallback={null}><BattleStage event={event} index={index} clock={clock} paused={frozen} reduced={reduced} cinematic={showCinematic} overlay={fieldRef} onReady={setStageReady} onError={()=>{setStageReady(false);setStageFailed(true);}}/></Suspense></StageBoundary>}
   <div className="arena-ring"/><div className="battle-centerline" aria-hidden="true"/><span className="formation-side-label side-label-0">同袍 · 守望</span><span className="formation-side-label side-label-1">破阵 · 争锋</span>
   {displayUnits.map(u=>{
    const hero=HEROES[u.hero],p=position(u),hit=contacted?event.hits.filter(h=>h.uid===u.uid):[],attacking=event.actor===u.uid&&['attack','skill','combo','boss'].includes(event.kind);
    const wounded=hit.some(h=>h.kind==='damage'||h.kind==='critical'),healed=hit.some(h=>h.kind==='heal');
    const target=frontTarget?position(frontTarget):p,melee=hero.role==='猛将'||hero.role==='铁卫';
    const movement=attacking&&melee&&event.kind==='attack';
    return <div key={u.uid} data-uid={u.uid} className={`battle-unit side-${u.side} ${u.hp<=0?'fallen':''} ${attacking?'attacking':''} ${wounded?'hit':''} ${healed?'healed':''} ${u.rage>=100?'rage-ready':''}`} style={{left:`${p.x}%`,top:`${p.y}%`,zIndex:attacking?88:Math.round(p.y),'--element':colors[hero.skill.element],'--faction':FACTION_COLOR[hero.faction],'--strike-x':`${(target.x-p.x)*.63}cqw`,'--strike-y':`${(target.y-p.y)*.63}cqh`,'--action-time':`${.7/speed}s`,'--impact-delay':isBig&&showCinematic?'.85s':`${.18/speed}s`} as CSSProperties}>
     <div className="unit-ring"/><div className={`unit-art ${movement?'melee-action':attacking?'cast-action':''} ${wounded?'damage-action':''}`} key={`${u.uid}-${attacking||wounded||healed?index:'idle'}`}>
      {stageFailed&&<Character id={u.hero} mirrored={u.side===1} priority/>}
      {u.boss&&<span className="boss-seal">首领</span>}{u.shield>0&&<span className="shield-ring"><Shield size={16}/></span>}
      {attacking&&<span className="acting-indicator">{event.kind==='combo'?'合击':hero.role==='辅助'?'施术':'出击'}</span>}
     </div>
     <div className="unit-info"><span><b>{hero.name}</b><small>{hero.faction} · {u.level}</small></span><div className="hp-bar" role="meter" aria-label={`${hero.name}生命`} aria-valuemin={0} aria-valuemax={u.maxHp} aria-valuenow={u.hp}><i style={{width:`${u.hp/u.maxHp*100}%`}}/></div><div className="rage-bar" aria-label={`怒气 ${u.rage}`}><i style={{width:`${u.rage}%`}}/></div><div className="unit-statuses">{Object.keys(u.statuses).map(k=><span key={k} className={`status-${k}`}>{statusNames[k]}</span>)}</div></div>
     <div className="floating-numbers" key={index}>{hit.map((n,i)=><b key={i} className={n.kind} style={{animationDelay:`${i*.06}s`}}>{n.kind==='critical'?'暴击 ':n.kind==='heal'?'+':n.kind==='shield'?'抵挡 ':''}{n.value}</b>)}</div>
    </div>;
   })}
   {!stageReady&&contacted&&<Effects event={event} index={index} cinematic={false} paused={frozen} reduced={reduced} speed={speed}/>}
   {['skill','combo','boss'].includes(event.kind)&&!showCinematic&&<div className="skill-banner" key={index} style={{color:colors[event.element]}}>{event.label}</div>}
   {event.kind==='skill'&&showCinematic&&<div className="skill-banner" key={index} style={{color:colors[event.element]}}>{event.label}</div>}
   {isBig&&showCinematic&&introDoneIndex!==index&&<div key={index} className={`cinematic cinematic-${event.element}`} style={{'--fx':colors[event.element]} as CSSProperties}><div className="cinematic-stripes"/>{stageFailed&&<div className="cutin-characters">{(event.partners||(actor?[actor.hero]:[])).map(id=><Character id={id} key={id} priority/>)}</div>}<div className="cutin-title"><span>{event.kind==='combo'?'羁绊 · 合击奥义':'首领 · 绝技'}</span><h2>{event.label}</h2><p>{event.partners?.map(id=>HEROES[id].name).join(' × ')}</p></div><button className="skip-cinematic" onClick={()=>setIndex(i=>Math.min(i+1,result.events.length-1))}>跳过演出 <ChevronsRight size={18}/></button></div>}
  </div>
  <div className="battle-controls"><div className="combat-log">{stageFailed&&<small className="compat-note">兼容战场 · </small>}<span className="gold">{actionKind}</span> {event.label}</div><div className="control-row"><button className="dark-button" onClick={()=>setCinematic(!cinematic)} disabled={reduced}>{reduced?'低动态':cinematic?'完整演出':'简洁演出'}</button><button className="dark-button" onClick={()=>setPaused(!paused)}>{paused?<Play size={17}/>:<Pause size={17}/>} {paused?'继续':'暂停'}</button><button className="gold-button compact" onClick={()=>setSpeed(v=>v===3?1:v+1)}><FastForward size={18}/> ×{speed}</button></div></div>
 </div>;
}
