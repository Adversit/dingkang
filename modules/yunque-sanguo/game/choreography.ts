import {BattleEvent,Unit} from './battle';
import {HEROES} from './data';
export type WeaponStyle='spear'|'blade'|'heavy'|'bow'|'spell';
export function weaponStyle(hero:number):WeaponStyle{return [0,2,5,14,23].includes(hero)?'spear':hero===8?'heavy':hero===15?'bow':[1,7,9,10,18,22].includes(hero)?'blade':'spell';}
export function actionTiming(e:BattleEvent,cinematic:boolean,reduced:boolean){
 const active=['attack','skill','combo','boss'].includes(e.kind),big=e.kind==='combo'||e.kind==='boss',critical=e.hits.some(h=>h.kind==='critical');
 const intro=big&&cinematic&&!reduced?700:0;
 const contact=active?intro+(e.kind==='attack'?350:480):0;
 const stop=reduced||!active?0:big?130:critical?105:65;
 return {intro,contact,stop,duration:e.kind==='intro'?900:e.kind==='status'?600:e.kind==='end'?0:contact+stop+(big?900:e.kind==='skill'?700:490)};
}
export const clamp=(n:number,min=0,max=1)=>Math.max(min,Math.min(max,n));
export const smooth=(n:number)=>{const t=clamp(n);return t*t*(3-2*t);};
export function motionTime(elapsed:number,contact:number,stop:number){return elapsed<=contact?elapsed:contact+Math.max(0,elapsed-contact-stop);}
export function worldPosition(u:Pick<Unit,'side'|'slot'>){return {x:(u.side===0?-1:1)*(u.slot<3?1.8:4.15),z:(u.slot%3-1)*3.05+(u.slot<3?.18:-.18)};}
export interface ActorPose{x:number;z:number;y:number;bend:number;swing:number;step:number;recoil:number;fall:number;flash:number;scale:number}
export function poseFor(u:Unit,e:BattleEvent,elapsed:number,cinematic:boolean,reduced:boolean):ActorPose{
 const home=worldPosition(u),timing=actionTiming(e,cinematic,reduced),time=motionTime(elapsed,timing.contact,timing.stop),relative=time-timing.intro;
 const actor=e.units.find(v=>v.uid===e.actor),target=e.units.find(v=>e.targets.includes(v.uid)&&v.side!==actor?.side),active=e.actor===u.uid&&['attack','skill','combo','boss'].includes(e.kind);
 const hit=e.hits.some(h=>h.uid===u.uid&&['damage','critical'].includes(h.kind)),post=Math.max(0,time-timing.contact),direction=u.side===0?1:-1;
 const wasKilled=u.hp<=0&&hit,fall=u.hp<=0?wasKilled?smooth(post/460):1:0;
 const out:ActorPose={...home,y:0,bend:0,swing:0,step:0,recoil:0,fall,flash:0,scale:1};
 if(reduced){out.fall=u.hp<=0&&(!wasKilled||elapsed>=timing.contact)?1:0;out.flash=hit&&elapsed>=timing.contact&&elapsed<timing.contact+180?.18:0;return out;}
 if(active&&relative>=0){
  const weapon=weaponStyle(u.hero),melee=weapon==='spear'||weapon==='blade'||weapon==='heavy',attackEnd=timing.contact-timing.intro;
  const wind=smooth(relative/170),rush=smooth((relative-170)/Math.max(1,attackEnd-170)),recover=smooth(post/400);
  if(melee&&target){const dest=worldPosition(target),dx=dest.x-home.x,dz=dest.z-home.z,d=Math.hypot(dx,dz),reach=Math.max(0,d-(weapon==='spear'?2.1:1.22)),travel=rush*(1-recover);out.x+=dx/d*reach*travel;out.z+=dz/d*reach*travel;out.x-=direction*.22*wind*(1-rush);out.y=Math.sin(travel*Math.PI)*(weapon==='heavy'?.17:.09);}
  out.bend=(-.17*wind*(1-rush)+.28*rush)*(1-recover);
  out.swing=(-.7*wind*(1-rush)+1.05*rush)*(1-recover);
  out.step=Math.sin(clamp((relative-160)/280)*Math.PI*2)*(1-recover);
  if(!melee){out.y=.12*wind*(1-recover);out.bend=-.1*wind*(1-recover);out.swing=.4*wind*(1-recover);}
 }
 if(hit&&elapsed>=timing.contact){const recoil=Math.sin(clamp(post/370)*Math.PI);out.x+=direction*-.42*recoil;out.z+=.13*recoil;out.bend-=.2*recoil;out.recoil=recoil;out.flash=Math.max(0,1-post/180);}
 return out;
}
/** Continuous multi-joint 2.5D mesh: hips, shoulders, weapon-side arm and cloth move separately. */
export function deformVertex(x:number,y:number,pose:ActorPose,idle:number){
 const torso=smooth((y-1.05)/.9),arm=clamp((Math.abs(x)-.25)/.65)*Math.sin(clamp((y-1)/1.5)*Math.PI),leg=1-smooth((y-.25)/1.1);
 const lean=pose.bend+idle*.012;
 return {x:x+Math.sin(lean)*(y-1.05)*torso+pose.swing*.22*arm+pose.step*.09*leg*(x<0?-1:1),y:y-(1-Math.cos(lean))*Math.max(0,y-1.05)*torso+pose.swing*.06*arm+Math.sin(idle)*.014*torso,z:pose.swing*.09*arm};
}
