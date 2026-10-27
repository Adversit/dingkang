'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight,Hand,Smile,Pause,Play,Volume2,VolumeX,X,RotateCcw,Maximize2,Minimize2} from 'lucide-react';
import {EXPRESSION_LABELS,expressionFor,type AvatarMode} from '../lib/avatar';

const ATLAS='/assets/wandeng-evening/characters/wandeng-expressions.webp';
type Props={busy:boolean;partial:boolean;typing:boolean;mode:AvatarMode;reply:string;quiet:boolean;onQuiet:()=>void};
export default function AvatarStage({busy,partial,typing,mode,reply,quiet,onQuiet}:Props){
 const canvas=useRef<HTMLCanvasElement>(null),pointer=useRef({x:0,y:0}),runtime=useRef({frame:0,moving:true,speaking:false});
 const [manual,setManual]=useState<number|null>(9),[gallery,setGallery]=useState(false),[motion,setMotion]=useState(true),[reduced,setReduced]=useState(false),[visible,setVisible]=useState(true),[ready,setReady]=useState(false),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0),[rain,setRain]=useState(false),[soundError,setSoundError]=useState('');
 const audio=useRef<AudioContext|null>(null),gestureTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const automatic=expressionFor({busy,partial,typing,mode,reply}),frame=manual??automatic;
 runtime.current={frame,moving:motion&&!reduced&&visible,speaking:busy&&partial&&manual===null};
 useEffect(()=>{
  const media=matchMedia('(prefers-reduced-motion: reduce)');const changed=()=>setReduced(media.matches);changed();media.addEventListener('change',changed);
  try{const saved=localStorage.getItem('wandeng-visual-motion');if(saved==='off')setMotion(false);}catch{}
  const hidden=()=>{setVisible(!document.hidden);if(document.hidden){audio.current?.close().catch(()=>{});audio.current=null;setRain(false);}};document.addEventListener('visibilitychange',hidden);
  gestureTimer.current=setTimeout(()=>setManual(null),2200);
  return()=>{media.removeEventListener('change',changed);document.removeEventListener('visibilitychange',hidden);if(gestureTimer.current)clearTimeout(gestureTimer.current);audio.current?.close().catch(()=>{});};
 },[]);
 useEffect(()=>{if(busy||typing){setManual(null);if(gestureTimer.current)clearTimeout(gestureTimer.current);}},[busy,typing]);
 useEffect(()=>{
  const el=canvas.current;if(!el)return;const ctx=el.getContext('2d');if(!ctx){setFailed(true);return;}
  let disposed=false,raf=0,last=-1000,nextBlink=performance.now()+3200,blinkEnd=0,drawn='';
  const picture=new Image();setReady(false);setFailed(false);
  const paint=(time:number)=>{
   if(disposed)return;if(document.hidden){raf=0;return;}
   if(time-last<32){raf=requestAnimationFrame(paint);return;}last=time;
   const {frame:base,moving,speaking}=runtime.current;let selected=base;
   if(moving&&time>nextBlink){blinkEnd=time+120;nextBlink=time+3600+Math.random()*2600;}
   if(moving&&base===0&&time<blinkEnd)selected=1;
   if(moving&&speaking)selected=Math.floor(time/170)%3===0?0:Math.floor(time/170)%2===0?10:11;
   const unit=picture.naturalWidth/4,sourceHeight=picture.naturalHeight/3,sx=(selected%4)*unit,sy=Math.floor(selected/4)*sourceHeight;
   const width=el.width,height=el.height;const key=selected+':'+width+':'+height;
   if(!moving&&drawn===key){raf=requestAnimationFrame(paint);return;}drawn=moving?'':key;
   ctx.clearRect(0,0,width,height);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
   // Narrow scanline mesh gives the shoulders a sub-pixel breath while the
   // face stays stable. This is original Canvas animation, not a Cubism model.
   const step=sourceHeight/64;
   for(let row=0;row<64;row++){
    const y=row*step,h=Math.min(step+.65,sourceHeight-y),weight=Math.max(0,(y/sourceHeight-.49));
    const breath=moving?Math.sin(time/1600)*.006*weight:0;
    const lean=moving?pointer.current.x*.013*(1-y/sourceHeight):0;
    const rise=moving?Math.sin(time/1600)*.0015*weight+pointer.current.y*.002*(1-y/sourceHeight):0;
    ctx.drawImage(picture,sx,sy+y,unit,h,(lean-breath/2)*width,(y/sourceHeight+rise)*height,width*(1+breath),h/sourceHeight*height+.6);
   }
   raf=requestAnimationFrame(paint);
  };
  const resize=()=>{const bounds=el.getBoundingClientRect();const scale=Math.min(devicePixelRatio||1,2);el.width=Math.max(1,Math.round(bounds.width*scale));el.height=Math.max(1,Math.round(bounds.height*scale));};
  const observer=new ResizeObserver(resize);observer.observe(el);
  picture.onload=()=>{if(disposed)return;resize();setReady(true);raf=requestAnimationFrame(paint);};picture.onerror=()=>{if(!disposed)setFailed(true);};picture.src=ATLAS+(retry?'?retry='+retry:'');
  const resume=()=>{if(!document.hidden&&picture.complete&&picture.naturalWidth&&!raf)raf=requestAnimationFrame(paint);};document.addEventListener('visibilitychange',resume);
  return()=>{disposed=true;cancelAnimationFrame(raf);observer.disconnect();document.removeEventListener('visibilitychange',resume);};
 },[retry]);
 function react(next:number){if(gestureTimer.current)clearTimeout(gestureTimer.current);setManual(next);gestureTimer.current=setTimeout(()=>setManual(null),5000);}
 function toggleMotion(){setMotion(v=>{try{localStorage.setItem('wandeng-visual-motion',v?'off':'on');}catch{}return!v;});}
 async function toggleRain(){
  setSoundError('');if(audio.current){await audio.current.close();audio.current=null;setRain(false);return;}
  try{
   const ctx=new AudioContext();audio.current=ctx;await ctx.resume();const buffer=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate),data=buffer.getChannelData(0);let previous=0;
   for(let i=0;i<data.length;i++){previous=(previous+(Math.random()*2-1)*.02)/1.02;data[i]=previous*3.5;}
   const source=ctx.createBufferSource();source.buffer=buffer;source.loop=true;const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1600;const gain=ctx.createGain();gain.gain.value=.23;source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);source.start();setRain(true);
  }catch{audio.current?.close().catch(()=>{});audio.current=null;setRain(false);setSoundError('这个浏览器暂时无法播放环境声。');}
 }
 return <section className={'avatar-stage '+(quiet?'quiet':'')} aria-label="晚灯数字角色" data-expression={EXPRESSION_LABELS[frame]} data-motion={motion&&!reduced?'on':'off'} onPointerMove={e=>{if(e.pointerType==='touch')return;const r=e.currentTarget.getBoundingClientRect();pointer.current={x:Math.max(-1,Math.min(1,(e.clientX-r.left)/r.width*2-1)),y:Math.max(-1,Math.min(1,(e.clientY-r.top)/r.height*2-1))};}} onPointerLeave={()=>{pointer.current={x:0,y:0};}}>
  <div className="room-art"/>
  <div className="room-shade"/>
  <div className="stage-heading"><span className="scene-index">01 / THE EVENING ROOM</span><h1>今晚，坐一会儿。</h1></div>
  <button className="stage-expand" onClick={onQuiet} aria-label={quiet?'展开对话':'收起对话，专注陪伴'} title={quiet?'展开对话':'收起对话'}>{quiet?<Minimize2 size={17}/>:<Maximize2 size={17}/>}</button>
  <button className="character-touch" aria-label="向晚灯打招呼" onClick={()=>react(9)} disabled={!ready||busy}>
   <canvas ref={canvas} className={'character-canvas '+(ready?'loaded':'')} role="img" aria-label={'晚灯的原创角色，当前表情：'+EXPRESSION_LABELS[frame]} />
   {!ready&&!failed&&<span className="art-loading">正在点亮房间…</span>}
  </button>
  {failed&&<div className="art-failure">角色素材暂未载入<button onClick={()=>setRetry(v=>v+1)}><RotateCcw size={14}/>重新加载</button></div>}
  <div className="character-caption"><span className="character-name">晚灯 <small>AI COMPANION</small></span><span className="expression-status"><i/>{manual!==null?'表情互动 · '+EXPRESSION_LABELS[frame]:busy?(partial?'正在回应':'想一想…'):typing?'在听你说':mode==='solve'?'一起慢慢理清':mode==='light'?'随意聊聊':'在这里，听你说'}</span></div>
  {gallery&&<div className="expression-drawer"><div className="expression-heading"><div><h2>这一刻的表情</h2><p>点一个看看。只切换角色演出，不会发送消息。</p></div><button aria-label="关闭表情面板" onClick={()=>setGallery(false)}><X size={18}/></button></div><div className="expression-grid">{EXPRESSION_LABELS.map((label,i)=><button key={label} disabled={busy} onClick={()=>react(i)} aria-pressed={manual===i} aria-label={'预览表情：'+label} className={manual===i?'selected':''}><span className="expression-thumb" style={{backgroundPosition:`${i%4*100/3}% ${Math.floor(i/4)*50}%`}}/><span>{label}</span></button>)}</div><button className="expression-auto" onClick={()=>{if(gestureTimer.current)clearTimeout(gestureTimer.current);setManual(null);}}><RotateCcw size={13}/>回到自然状态</button></div>}
  <div className="stage-bottom"><div className="stage-controls"><button className={gallery?'selected':''} aria-expanded={gallery} onClick={()=>setGallery(v=>!v)}><Smile size={17}/><span>表情</span></button><button onClick={()=>react(9)} disabled={busy}><Hand size={17}/><span>打个招呼</span></button><span className="control-divider"/><button aria-pressed={motion&&!reduced} disabled={reduced} onClick={toggleMotion} title={reduced?'已遵循系统减少动态效果设置':''}>{motion&&!reduced?<Pause size={16}/>:<Play size={16}/>}<span>{motion&&!reduced?'暂停动态':'开启动态'}</span></button><button onClick={toggleRain} aria-pressed={rain}>{rain?<Volume2 size={17}/>:<VolumeX size={17}/>}<span>{rain?'雨声 · 开':'雨声 · 关'}</span></button></div><span className="stage-smallprint">原创 2D 角色{quiet&&<button onClick={onQuiet}>继续聊聊 <ArrowUpRight size={12}/></button>}</span></div>
  {soundError&&<div className="sound-error" role="status">{soundError}</div>}
 </section>;
}
