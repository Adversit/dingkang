/** Local, quiet ambience. Creating this controller does not create or start audio. */
export type CozyAudioController={enable:()=>Promise<boolean>;stop:()=>void;setRoom:(inside:boolean)=>void;door:()=>void;dispose:()=>void};

export function createCozyAudio(onPlaying:(playing:boolean)=>void):CozyAudioController {
  let context:AudioContext|null=null,master:GainNode|null=null,inside=false,disposed=false,generation=0;
  let birdTimer:number|null=null;
  const sources=new Set<AudioScheduledSourceNode>(),nodes=new Set<AudioNode>();
  const track=<T extends AudioNode>(node:T):T=>{nodes.add(node);return node;};
  const canPlay=()=>!disposed&&!document.hidden&&context?.state==='running';
  const clearBird=()=>{if(birdTimer!==null)window.clearTimeout(birdTimer);birdTimer=null;};
  function stop(){
    generation++;clearBird();
    const old=context;context=null;
    if(old&&master){master.gain.cancelScheduledValues(old.currentTime);master.gain.setValueAtTime(0,old.currentTime);}
    master=null;
    for(const source of sources){try{source.stop();}catch{/* Already ended. */}source.disconnect();}
    sources.clear();for(const node of nodes)node.disconnect();nodes.clear();
    if(old&&old.state!=='closed')void old.close().catch(()=>{});
    onPlaying(false);
  }
  function tone(type:OscillatorType,from:number,to:number,start:number,duration:number,level:number){
    const ctx=context,out=master;if(!ctx||!out||!canPlay())return;
    const source=track(ctx.createOscillator()),gain=track(ctx.createGain());
    source.type=type;source.frequency.setValueAtTime(from,start);source.frequency.exponentialRampToValueAtTime(to,start+duration);
    gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(level,start+Math.min(.025,duration*.14));gain.gain.exponentialRampToValueAtTime(.00001,start+duration);
    source.connect(gain);gain.connect(out);sources.add(source);
    source.onended=()=>{sources.delete(source);source.disconnect();gain.disconnect();nodes.delete(source);nodes.delete(gain);};
    source.start(start);source.stop(start+duration+.02);
  }
  function queueBird(){
    clearBird();if(!canPlay()||inside)return;
    birdTimer=window.setTimeout(()=>{
      birdTimer=null;if(!canPlay()||inside||!context)return;
      const now=context.currentTime;
      tone('sine',1850,2850,now,.18,.017);tone('sine',2400,2050,now+.25,.16,.013);
      queueBird();
    },16000+Math.random()*19000);
  }
  function noiseLayer(buffer:AudioBuffer,frequency:number,q:number,level:number,lfoSpeed:number){
    const ctx=context,out=master;if(!ctx||!out)return;
    const source=track(ctx.createBufferSource()),filter=track(ctx.createBiquadFilter()),gain=track(ctx.createGain());
    source.buffer=buffer;source.loop=true;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=q;gain.gain.value=level;
    source.connect(filter);filter.connect(gain);gain.connect(out);sources.add(source);source.start();
    const lfo=track(ctx.createOscillator()),depth=track(ctx.createGain());lfo.frequency.value=lfoSpeed;depth.gain.value=level*.28;lfo.connect(depth);depth.connect(gain.gain);sources.add(lfo);lfo.start();
  }
  async function enable(){
    if(disposed||document.hidden)return false;
    if(canPlay())return true;
    stop();const ticket=++generation;
    const AudioCtor=window.AudioContext||(window as typeof window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
    if(!AudioCtor)return false;
    let next:AudioContext;
    try{
      next=new AudioCtor();context=next;
      // Called directly from the sound button; no automatic resume on visibility changes.
      await next.resume();
      if(disposed||document.hidden||ticket!==generation||context!==next){if(next.state!=='closed')void next.close().catch(()=>{});return false;}
      master=track(next.createGain());master.gain.setValueAtTime(0,next.currentTime);master.gain.linearRampToValueAtTime(inside?.17:.35,next.currentTime+.65);master.connect(next.destination);
      const buffer=next.createBuffer(1,next.sampleRate*3,next.sampleRate),data=buffer.getChannelData(0);
      let smooth=0;for(let i=0;i<data.length;i++){const white=Math.random()*2-1;smooth=(smooth+.035*white)/1.035;data[i]=white*.28+smooth*1.9;}
      noiseLayer(buffer,340,.45,.18,.071);noiseLayer(buffer,1150,.68,.15,.113);
      onPlaying(true);queueBird();return true;
    }catch{if(ticket===generation)stop();return false;}
  }
  function setRoom(value:boolean){
    inside=value;if(context&&master){master.gain.cancelScheduledValues(context.currentTime);master.gain.setTargetAtTime(inside?.17:.35,context.currentTime,.3);}
    queueBird();
  }
  function door(){
    if(!canPlay()||!context)return;
    const now=context.currentTime;tone('triangle',185,115,now,.32,.025);tone('sine',96,54,now+.23,.17,.075);
  }
  function visibility(){if(document.hidden)stop();}
  document.addEventListener('visibilitychange',visibility);
  return {enable,stop,setRoom,door,dispose:()=>{if(disposed)return;disposed=true;document.removeEventListener('visibilitychange',visibility);stop();}};
}
