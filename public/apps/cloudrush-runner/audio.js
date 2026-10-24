// Original synthesized music: five independent themes, no remote media or autoplay.
export const THEMES={
 lobby:{tempo:88,roots:[48,53,57,55],wave:'sine',mel:[72,0,76,79,0,76,74,0,72,0,67,0,69,72,0,0,76,0,79,84,0,81,79,0,76,74,72,0,69,0,67,0]},
 meadow:{tempo:126,roots:[48,55,57,53],wave:'triangle',mel:[72,76,79,0,81,79,76,74,72,0,76,79,84,0,83,79,81,84,88,84,81,0,79,76,74,77,81,77,74,72,71,0]},
 sunset:{tempo:116,roots:[45,50,53,52],wave:'triangle',mel:[69,72,76,0,77,76,72,69,67,69,72,0,76,0,72,0,74,77,81,77,76,74,72,0,71,74,76,0,80,76,71,0]},
 night:{tempo:108,roots:[50,46,53,48],wave:'sine',mel:[86,0,81,0,77,0,74,77,82,0,77,0,74,0,70,0,81,0,84,0,77,81,0,0,79,0,76,0,72,0,67,0]},
 fever:{tempo:154,roots:[60,57,53,55],wave:'triangle',mel:[84,88,91,96,91,88,84,88,93,96,100,96,93,88,84,0,89,93,96,93,89,84,81,84,91,95,98,95,91,86,83,79]}
};
export class Soundtrack {
 constructor(settings){Object.assign(this,{settings,mode:'lobby',world:0,step:0,ctx:null,timer:null,next:0,paused:false});}
 async unlock(){if(!this.ctx){const A=globalThis.AudioContext||globalThis.webkitAudioContext;if(!A)return;this.ctx=new A();this.musicBus=this.ctx.createGain();this.fxBus=this.ctx.createGain();this.ambientBus=this.ctx.createGain();this.musicBus.connect(this.ctx.destination);this.fxBus.connect(this.ctx.destination);this.ambientBus.connect(this.ctx.destination);this.noise=this.ctx.createBuffer(1,this.ctx.sampleRate*2,this.ctx.sampleRate);const d=this.noise.getChannelData(0);let last=0;for(let i=0;i<d.length;i++){last=(last+Math.random()*.06-.03)/1.015;d[i]=last;}this.wind=this.ctx.createBufferSource();this.wind.buffer=this.noise;this.wind.loop=true;this.windFilter=this.ctx.createBiquadFilter();this.windFilter.type='bandpass';this.windFilter.frequency.value=460;this.wind.connect(this.windFilter);this.windFilter.connect(this.ambientBus);this.wind.start(0);this.apply();this.next=this.ctx.currentTime+.1;this.timer=setInterval(()=>this.schedule(),35);}if(this.ctx.state==='suspended')await this.ctx.resume().catch(()=>{});}
 apply(){if(!this.ctx)return;const t=this.ctx.currentTime,quiet=this.settings.muted||this.paused;this.musicBus.gain.setTargetAtTime(quiet?0:this.settings.music*.42,t,.12);this.fxBus.gain.setTargetAtTime(this.settings.muted?0:this.settings.sfx*.48,t,.04);this.ambientBus.gain.setTargetAtTime(quiet?0:this.settings.sfx*(this.mode==='lobby'?.025:.07),t,.35);}
 setMode(mode){if(this.mode===mode)return;this.mode=mode;this.step=0;if(this.ctx)this.next=this.ctx.currentTime+.12;this.apply();}
 setWorld(world){if(this.world===world)return;this.world=world;this.step=0;if(this.ctx){this.next=this.ctx.currentTime+.2;this.windFilter.frequency.setTargetAtTime([460,700,290][world],this.ctx.currentTime,1);}}
 setPaused(paused){this.paused=paused;if(!paused&&this.ctx)this.next=this.ctx.currentTime+.12;this.apply();}
 tone(freq,time,duration,type='sine',vol=.2,bus=this.musicBus){if(!this.ctx)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,time);g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(vol,time+.012);g.gain.exponentialRampToValueAtTime(.001,time+duration);o.connect(g);g.connect(bus);o.start(time);o.stop(time+duration+.03);o.onended=()=>{o.disconnect?.();g.disconnect?.();};}
 note(midi,t,d,v=.15,type='sine'){this.tone(440*2**((midi-69)/12),t,d,type,v);}
 hiss(t,v=.04,d=.07,bus=this.musicBus,freq=6500){const s=this.ctx.createBufferSource(),g=this.ctx.createGain(),f=this.ctx.createBiquadFilter();s.buffer=this.noise;f.type='highpass';f.frequency.value=freq;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);s.connect(f);f.connect(g);g.connect(bus);s.start(t);s.stop(t+d);s.onended=()=>{s.disconnect?.();f.disconnect?.();g.disconnect?.();};}
 schedule(){if(!this.ctx||this.ctx.state!=='running'||this.paused||this.settings.muted)return;const theme=THEMES[this.mode==='run'?['meadow','sunset','night'][this.world]:this.mode]||THEMES.lobby,beat=60/theme.tempo/2;if(this.next<this.ctx.currentTime-.5)this.next=this.ctx.currentTime+.05;while(this.next<this.ctx.currentTime+.15){const i=this.step%128,bar=Math.floor(i/16)%4,root=theme.roots[bar],mel=theme.mel[i%32],variation=i>=64?(i%32<16?-12:0):0;if(mel){this.note(mel+variation,this.next,beat*(this.world===2?2.3:1.2),this.mode==='lobby'?.11:.14,theme.wave);this.note(mel+12+variation,this.next+.018,beat*.7,.023,'sine');}if(i%4===0){this.note(root,this.next,beat*3.5,.2,'triangle');for(const n of [12,19,24])this.note(root+n,this.next,beat*5,.028,'sine');}if(this.mode!=='lobby'){if(i%4===0)this.tone(62,this.next,.17,'sine',.17);if(i%4===2)this.hiss(this.next,.15,.12);this.hiss(this.next,i%2?.09:.06,.045);if(i>=64&&i%2)this.note(root+24,this.next,beat*.65,.07,'triangle');}this.step++;this.next+=beat;}}
 fx(kind){if(!this.ctx||this.settings.muted)return;const t=this.ctx.currentTime,fx=(m,dt,d,v=.2,type='sine')=>this.tone(440*2**((m-69)/12),t+dt,d,type,v,this.fxBus),arp=(notes,step=.06,d=.3)=>notes.forEach((n,i)=>fx(n,i*step,d,.14));
  if(kind==='coin'){fx(92,0,.07,.1);fx(99,.035,.09,.06);}
  else if(kind==='jump'){fx(67,0,.1,.14,'triangle');fx(74,.04,.1,.12,'triangle');}
  else if(kind==='double'||kind==='wing'){arp([76,83,88],.035,.13);}
  else if(kind==='slide'){this.hiss(t,.7,.16,this.fxBus,2200);fx(48,0,.1,.08,'triangle');}
  else if(kind==='land'){fx(40,0,.055,.16,'sine');this.hiss(t,.2,.04,this.fxBus,1200);}
  else if(kind==='hit'){fx(43,0,.18,.16,'sawtooth');fx(36,.08,.2,.12,'triangle');this.hiss(t,.6,.23,this.fxBus,1100);}
  else if(kind==='break'||kind==='stomp'){fx(kind==='stomp'?55:43,0,.13,.19,'triangle');this.hiss(t,.7,.12,this.fxBus,1900);fx(76,.05,.1,.08);}
  else if(kind==='skill-sun'){arp([60,67,72,79,84],.045,.3);this.hiss(t,.5,.28,this.fxBus,2400);}
  else if(kind==='skill-mist'){arp([88,83,79,76,71],.09,.45);}
  else if(kind==='skill-star'||kind==='skill'){arp([76,83,88,95],.08,.5);}
  else if(kind==='fever'){arp([72,76,79,84,88,91,96],.07,.55);}
  else if(kind==='click'){fx(81,0,.07,.07);}
  else if(kind==='result'||kind==='complete'){arp([72,79,76,84],.16,.5);}
  else if(kind==='shield'){arp([76,83,88],.07,.3);}
  else if(kind==='warning'){fx(85,0,.13,.13,'triangle');fx(85,.2,.13,.11,'triangle');}
  else if(kind==='perfect'){arp([84,91],.05,.15);}
  else if(kind==='gem'){arp([88,95,100],.07,.38);}
  else if(kind==='pickup'||kind==='ready'){arp([72,79,84],.08,.2);}
  else if(kind==='spring'){arp([48,60,72,84],.04,.15);}
  else if(kind==='mount'){arp([67,74,79],.07,.3);}
  else if(kind==='zone'){arp([72,79,86,91],.18,.8);}
 }
 destroy(){clearInterval(this.timer);this.wind?.stop(this.ctx.currentTime);this.ctx?.close();}
}
