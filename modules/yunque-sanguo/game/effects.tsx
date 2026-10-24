'use client';
import {useEffect,useRef} from 'react';
import {BattleEvent,Unit} from './battle';
import {HEROES} from './data';
export const ELEMENT_COLORS:Record<string,string>={fire:'#ff9050',ice:'#9eefff',wind:'#66edbc',thunder:'#b9a0ff',shadow:'#e983fa',light:'#ffe6a4'};
export const arenaPosition=(u:Unit)=>({x:u.side===0?(u.slot<3?35:15):(u.slot<3?65:85),y:23+(u.slot%3)*29+(u.slot<3?5:0)});
export default function Effects({event,index,cinematic,paused=false,reduced=false,speed=1}:{event:BattleEvent;index:number;cinematic:boolean;paused?:boolean;reduced?:boolean;speed?:number}){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const canvas=ref.current;if(!canvas||!event.actor)return;
  if(paused)return;
  if(reduced){canvas.getContext('2d')?.clearRect(0,0,canvas.width,canvas.height);return;}
  const ctx=canvas.getContext('2d');if(!ctx)return;
  const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,rect.width<700?1.25:1.75),w=rect.width,h=rect.height;
  canvas.width=w*dpr;canvas.height=h*dpr;ctx.scale(dpr,dpr);
  const actor=event.units.find(u=>u.uid===event.actor);if(!actor)return;
  const actorSide=actor.side;const from=arenaPosition(actor),col=ELEMENT_COLORS[event.element]||'#ffe6a4';
  const strong=event.kind==='combo'||event.kind==='boss',delay=strong&&cinematic?.85:0,duration=strong?1.8:1;
  const particles=Array.from({length:rect.width<700?(strong?20:8):(strong?38:14)},(_,i)=>({angle:i*2.39996,speed:40+(i*53)%190,size:1+(i%4)}));
  let raf=0;const start=performance.now();
  const circle=(x:number,y:number,r:number)=>{ctx.beginPath();ctx.arc(x,y,Math.max(.1,r),0,Math.PI*2);ctx.stroke();};
  function frame(time:number){
   const t=((time-start)/1000-delay)*(strong&&cinematic?1:speed);ctx!.clearRect(0,0,w,h);
   if(t<0){raf=requestAnimationFrame(frame);return;}if(t>duration)return;
   if(document.hidden)return;
   ctx!.save();ctx!.globalCompositeOperation='lighter';ctx!.strokeStyle=col;ctx!.fillStyle=col;ctx!.shadowColor=col;ctx!.shadowBlur=strong?24:13;
   const alpha=Math.max(0,Math.min(1,(duration-t)*1.5));ctx!.globalAlpha=alpha;
   const progress=Math.min(1,t*5),fx=from.x*w/100,fy=from.y*h/100-18;
   for(const [j,uid] of [...new Set(event.targets)].entries()){
    const target=event.units.find(u=>u.uid===uid);if(!target)continue;const p=arenaPosition(target),x=p.x*w/100,y=p.y*h/100-18;
    ctx!.lineWidth=strong?4:2;
    if(event.kind==='attack'&&['猛将','铁卫'].includes(HEROES[actor!.hero].role)){
      if(t>.13){const swing=Math.min(1,(t-.13)*7);ctx!.lineWidth=7*(1-swing)+1;ctx!.beginPath();ctx!.ellipse(x,y,22+swing*42,15+swing*25,-.75,Math.PI*.9,Math.PI*(.9+swing*1.35));ctx!.stroke();ctx!.lineWidth=2;circle(x,y,swing*35);}
    }else if(event.element==='thunder'){
      for(let fork=0;fork<(strong?3:1);fork++){ctx!.beginPath();const sx=strong?x+(fork-1)*40:fx,sy=strong?-15:fy;ctx!.moveTo(sx,sy);for(let k=1;k<=9;k++){const q=k/9;ctx!.lineTo(sx+(x-sx)*q+(k===9?0:Math.sin(k*18+j+Math.floor(t*12)+fork)*23),sy+(y-sy)*q);}ctx!.stroke();}
      circle(x,y,t*75);circle(x,y,t*45);
    }else if(event.element==='wind'){
      ctx!.save();ctx!.translate(x,y);ctx!.rotate(t*8);for(let k=0;k<(strong?3:1);k++){ctx!.beginPath();ctx!.lineWidth=strong?10:3;ctx!.ellipse(0,0,35+t*85,12+t*35,k*Math.PI/3,.1,Math.PI*1.4);ctx!.stroke();}ctx!.restore();
    }else if(event.element==='fire'){
      const gradient=ctx!.createRadialGradient(x,y,1,x,y,Math.max(1,progress*(strong?110:55)));gradient.addColorStop(0,'#fff1b8');gradient.addColorStop(.15,col);gradient.addColorStop(1,'#ff370000');ctx!.fillStyle=gradient;ctx!.fillRect(x-120,y-120,240,240);ctx!.fillStyle=col;
      for(let k=0;k<(strong?22:8);k++){ctx!.beginPath();ctx!.ellipse(x+Math.sin(k*14)*40*(strong?1:.5),y-t*(40+k*6),(2+k%4)*(1-t/duration),9+t*10,-.2,0,7);ctx!.fill();}
    }else if(event.element==='ice'){
      for(let k=0;k<(strong?3:1);k++){ctx!.lineWidth=k===1?7:2;ctx!.beginPath();ctx!.moveTo(fx,fy+(k-1)*12);ctx!.lineTo(fx+(x-fx)*progress,y+(k-1)*12);ctx!.stroke();}
      if(t>.18)for(let k=0;k<(strong?12:5);k++){const a=k*2.39996,d=(t-.18)*145,sx=x+Math.cos(a)*d,sy=y+Math.sin(a)*d;ctx!.beginPath();ctx!.moveTo(sx,sy-9);ctx!.lineTo(sx+3,sy);ctx!.lineTo(sx,sy+9);ctx!.lineTo(sx-3,sy);ctx!.closePath();ctx!.fill();}
    }else if(event.element==='light'&&target.side===actorSide){
      for(let k=0;k<3;k++){ctx!.beginPath();ctx!.ellipse(x,y+20-t*40+k*18,38+Math.sin(t*5)*8,12,0,0,7);ctx!.stroke();}
      ctx!.lineWidth=3;ctx!.beginPath();ctx!.moveTo(x-14,y-t*45);ctx!.lineTo(x+14,y-t*45);ctx!.moveTo(x,y-14-t*45);ctx!.lineTo(x,y+14-t*45);ctx!.stroke();
    }else{
      const radius=20+Math.sin(Math.min(1,t)*Math.PI)*(strong?75:25);circle(x,y,radius);ctx!.lineWidth=strong?8:3;ctx!.beginPath();ctx!.moveTo(x-radius,y-radius);ctx!.lineTo(x+radius,y+radius);ctx!.moveTo(x+radius,y-radius);ctx!.lineTo(x-radius,y+radius);ctx!.stroke();
    }
    if(event.kind==='attack'&&['谋士','辅助'].includes(HEROES[actor!.hero].role)&&event.element!=='ice'){ctx!.lineWidth=2;ctx!.beginPath();ctx!.moveTo(fx,fy);ctx!.lineTo(fx+(x-fx)*progress,fy+(y-fy)*progress);ctx!.stroke();}
    for(const p of particles){const d=t*p.speed*(strong?1.3:.6);ctx!.globalAlpha=alpha*Math.max(0,1-t/duration);ctx!.beginPath();ctx!.arc(x+Math.cos(p.angle)*d,y+Math.sin(p.angle)*d,p.size,0,7);ctx!.fill();}ctx!.globalAlpha=alpha;
   }
   if(strong&&t<.12){ctx!.fillStyle=col;ctx!.globalAlpha=(.12-t)*.55;ctx!.fillRect(0,0,w,h);}
   ctx!.restore();raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);return()=>cancelAnimationFrame(raf);
 },[event,index,cinematic,paused,reduced,speed]);
 return <canvas className="battle-effects" ref={ref} aria-hidden="true"/>;
}
