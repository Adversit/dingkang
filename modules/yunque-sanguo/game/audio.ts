import {weaponStyle} from './choreography';

// Licensed recordings only. Music streams independently of the compact decoded SFX cache.
export type MusicScene='city'|'battle'|'victory'|'defeat';
export interface AudioSettings{enabled:boolean;music:number;effects:number}
let settings:AudioSettings={enabled:true,music:.42,effects:.65},unlocked=false,desired:MusicScene='city',paused=false,hidden=false;
let ctx:AudioContext|undefined,master:DynamicsCompressorNode|undefined,sfxBus:GainNode|undefined;
const playing=new Set<AudioBufferSourceNode>(),buffers=new Map<string,AudioBuffer>(),pending=new Map<string,Promise<void>>();
const clips=['sword-swing','sword-clash','spear-whoosh','bow-release','arrow-hit','heavy-hit','magic-cast','magic-impact','heal','ultimate'];
const clamp=(v:number,fallback:number)=>Number.isFinite(v)?Math.max(0,Math.min(1,v)):fallback;
function context(){if(typeof window==='undefined')return;try{ctx??=new AudioContext();if(!master){master=ctx.createDynamicsCompressor();master.threshold.value=-12;master.knee.value=16;master.ratio.value=4;master.attack.value=.005;master.release.value=.13;master.connect(ctx.destination);sfxBus=ctx.createGain();sfxBus.connect(master);sfxBus.gain.value=settings.enabled?settings.effects:0;}return ctx;}catch{return;}}
export function stopCombatAudio(){for(const source of playing){try{source.stop();}catch{}}playing.clear();}
async function load(id:string){const c=context();if(!c||buffers.has(id))return;if(!pending.has(id))pending.set(id,fetch(`/assets/yunque-sanguo/audio/sfx/${id}.mp3`,{cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error('audio');return r.arrayBuffer();}).then(b=>c.decodeAudioData(b)).then(b=>{buffers.set(id,b);}).catch(()=>{}).finally(()=>pending.delete(id)));await pending.get(id);}
export function prepareCombatAudio(enabled=true){if(!enabled)return;for(const id of clips)void load(id);}
let lastEffect=0,variation=0;
function play(id:string,gain=.45,rate=1){if(!settings.enabled||!unlocked||settings.effects<=0||hidden||paused)return;const c=context(),b=buffers.get(id);if(!c)return;if(!b){const started=Date.now();void load(id).then(()=>{if(buffers.has(id)&&Date.now()-started<140)play(id,gain,rate);});return;}if(playing.size>=8)return;const source=c.createBufferSource(),volume=c.createGain();source.buffer=b;source.playbackRate.value=rate;volume.gain.value=gain;source.connect(volume);volume.connect(sfxBus!);playing.add(source);source.start();source.onended=()=>{playing.delete(source);source.disconnect();volume.disconnect();};}
export function combatSound(kind:'swing'|'impact'|'critical'|'heal',element:string,enabled=true,hero=0,ultimate=false){
 if(!enabled)return;const style=weaponStyle(hero),rate=[.96,1.03,.99,1.06][variation++%4];
 if(kind==='swing'){play(style==='spell'?'magic-cast':style==='bow'?'bow-release':style==='spear'?'spear-whoosh':'sword-swing',style==='spell'?.33:.46,ultimate?rate*.92:rate);return;}
 if(kind==='heal'){play('heal',.4,rate);return;}
 if(ultimate){play('ultimate',.63,.97);if(style==='heavy')play('heavy-hit',.35,.85);return;}
 if(style==='spell'){play('magic-impact',.48,element==='ice'?rate*1.07:rate*.96);return;}
 play(style==='bow'?'arrow-hit':style==='heavy'?'heavy-hit':'sword-clash',kind==='critical'?.61:.44,kind==='critical'?rate*.93:rate);
}
export function sound(kind:'click'|'attack'|'skill'|'combo'|'pull'|'rare'|'win'|'lose',enabled=true){
 // Navigation is intentionally quiet rather than repeating the same bell on every tap.
 if(!enabled||kind==='click'||Date.now()-lastEffect<180)return;lastEffect=Date.now();
 if(kind==='attack')combatSound('impact','wind',true);else if(kind==='combo')play('ultimate',.5);else if(kind==='lose')play('heavy-hit',.25,.8);else if(kind==='rare')play('heal',.3,.95);else if(kind==='pull'||kind==='skill')play('magic-cast',.22,1.04);
}
interface Voice{element:HTMLAudioElement;volumeNode?:GainNode;sourceNode?:MediaElementAudioSourceNode;scene:MusicScene;gain:number;from:number;to:number;start:number;duration:number}
let voices:Voice[]=[],frame=0;
function audible(){return settings.enabled&&settings.music>0&&!paused&&!hidden&&unlocked;}
function applyMusicGain(v:Voice){const level=clamp(v.gain*settings.music,0);if(v.volumeNode){v.volumeNode.gain.value=level;v.element.volume=1;}else v.element.volume=level;}
function updateVoice(v:Voice){applyMusicGain(v);if(audible()&&v.to>0){if(v.element.paused)void v.element.play().catch(()=>{});}else if(!audible())v.element.pause();}
function fadeTick(t:number){frame=0;let continuing=false;voices=voices.filter(v=>{const p=Math.min(1,Math.max(0,(t-v.start)/v.duration));v.gain=v.from+(v.to-v.from)*(p*p*(3-2*p));applyMusicGain(v);if(p<1)continuing=true;if(p===1&&v.to===0){v.element.pause();v.sourceNode?.disconnect();v.volumeNode?.disconnect();v.element.removeAttribute('src');v.element.load();return false;}return true;});if(continuing)frame=requestAnimationFrame(fadeTick);}
function fade(v:Voice,to:number,duration=1300){v.from=v.gain;v.to=to;v.start=performance.now();v.duration=duration;if(!frame)frame=requestAnimationFrame(fadeTick);}
function createMusicVoice(scene:MusicScene,duration=1300){
 for(const v of voices)fade(v,0,duration);
 const element=new Audio(`/assets/yunque-sanguo/audio/music/${scene}.mp3`);element.preload='auto';element.loop=false;element.volume=0;
 const voice:Voice={element,scene,gain:0,from:0,to:1,start:performance.now(),duration};try{const c=context();if(c){voice.sourceNode=c.createMediaElementSource(element);voice.volumeNode=c.createGain();voice.volumeNode.gain.value=0;voice.sourceNode.connect(voice.volumeNode);voice.volumeNode.connect(c.destination);}}catch{}voices.push(voice);
 const repeat=()=>{if(voice.to>0&&desired===scene&&(scene==='city'||scene==='battle')&&audible()){createMusicVoice(scene,1500);}};
 element.addEventListener('timeupdate',()=>{if(Number.isFinite(element.duration)&&element.duration>5&&element.duration-element.currentTime<1.6)repeat();});
 element.addEventListener('ended',()=>{if(voice.to<=0||desired!==scene)return;if(scene==='victory'||scene==='defeat')setMusicScene('city');else repeat();},{once:true});
 fade(voice,1,duration);updateVoice(voice);return voice;
}
function ensureMusic(){if(typeof window==='undefined'||!unlocked||!settings.enabled||settings.music<=0)return;if(!voices.some(v=>v.scene===desired&&v.to>0))createMusicVoice(desired,desired==='victory'||desired==='defeat'?450:1300);for(const v of voices)updateVoice(v);}

export function setMusicScene(scene:MusicScene){desired=scene;ensureMusic();}
export function setMusicPaused(value:boolean){paused=value;for(const v of voices)updateVoice(v);if(value)stopCombatAudio();}
export function configureAudio(next:AudioSettings){settings={enabled:next.enabled,music:clamp(next.music,.42),effects:clamp(next.effects,.65)};if(ctx&&sfxBus)sfxBus.gain.setTargetAtTime(settings.enabled?settings.effects:0,ctx.currentTime,.04);if(!settings.enabled)stopCombatAudio();if(settings.enabled)ensureMusic();for(const v of voices)updateVoice(v);}
export function unlockAudio(){unlocked=true;const c=context();if(c?.state==='suspended')void c.resume();ensureMusic();}
export function attachAudioLifecycle(){
 const unlock=()=>unlockAudio(),visibility=()=>{hidden=document.hidden;for(const v of voices)updateVoice(v);if(hidden)stopCombatAudio();};
 window.addEventListener('pointerdown',unlock,{passive:true});window.addEventListener('keydown',unlock);document.addEventListener('visibilitychange',visibility);visibility();
 return()=>{window.removeEventListener('pointerdown',unlock);window.removeEventListener('keydown',unlock);document.removeEventListener('visibilitychange',visibility);if(frame)cancelAnimationFrame(frame);frame=0;for(const v of voices){v.element.pause();v.sourceNode?.disconnect();v.volumeNode?.disconnect();}voices=[];stopCombatAudio();};
}
