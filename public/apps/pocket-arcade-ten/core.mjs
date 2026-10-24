export const W=960,H=620;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)],dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),norm=(x,y)=>{let n=Math.hypot(x,y)||1;return{x:x/n,y:y/n}},lerp=(a,b,t)=>a+(b-a)*t;
export const palette=['#f3cf64','#77d595','#6ecfe4','#ef8166','#bc9cf0','#e5bd83'];
export function circle(c,x,y,r,fill,stroke=null){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke()}}
export function rect(c,x,y,w,h,r,fill,stroke=null){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.lineWidth=2;c.strokeStyle=stroke;c.stroke()}}
export function txt(c,s,x,y,size=20,color='#e8f4e4',align='center',weight=700){c.fillStyle=color;c.font=`${weight} ${size}px 'Noto Sans SC',sans-serif`;c.textAlign=align;c.textBaseline='middle';c.fillText(s,x,y)}
export function line(c,pts,color,width=4,dash=[]){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.strokeStyle=color;c.setLineDash(dash);c.stroke();c.setLineDash([])}
export function health(c,x,y,hp,max,w=48,color='#87e7a0'){rect(c,x-w/2,y,w,6,3,'#0c142a80');if(hp>0)rect(c,x-w/2,y,w*clamp(hp/max,0,1),6,3,color)}
let atlas=null;export function setAtlas(a){atlas=a}export function sprite(c,id,x,y,size=70,angle=0,flip=false,alpha=1){c.save();c.translate(x,y);if(angle)c.rotate(angle);if(flip)c.scale(-1,1);c.globalAlpha=alpha;if(atlas?.complete&&atlas.naturalWidth){c.drawImage(atlas,(id%6)*256,Math.floor(id/6)*256,256,256,-size/2,-size*.61,size,size)}else{circle(c,0,0,size*.3,palette[id%6]);txt(c,String(id+1),0,0,size*.3,'#172537')}c.restore()}
export function shadow(c,x,y,r=25){c.save();c.scale(1,.38);circle(c,x,y/.38,r,'#00000025');c.restore()}
export class BaseGame{
 constructor(ui){this.ui=ui;this.time=0;this.score=0;this.done=false;this.frozen=false;this.particles=[];this.popups=[];this.shake=0;this.keys={};this.pointer={x:480,y:310,down:false};this.level=1;this.wave=1;this.flash=0;this.seed=Array.from({length:60},(_,i)=>({x:(i*137+43)%960,y:(i*71+97)%620,r:2+(i%4)}))}
 emit(x,y,color='#ffe58a',n=12,force=100){for(let i=0;i<n;i++){let a=rnd(0,6.28),s=rnd(force*.3,force);this.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rnd(.25,.7),max:.7,color,r:rnd(2,5)})}}
 popup(s,x,y,color='#ffe499'){this.popups.push({s,x,y,life:1,color})}
 sfx(id='hit',v=1){this.ui.sound?.(id,v)}
 damage(e,d){e.hp-=d;e.flash=.12;this.emit(e.x,e.y,'#ffe494',3,45)}
 tick(dt){this.time+=dt;this.shake=Math.max(0,this.shake-dt*25);this.flash=Math.max(0,this.flash-dt);for(const p of this.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;p.vx*=.97;p.vy*=.97}this.particles=this.particles.filter(p=>p.life>0).slice(-450);for(const p of this.popups){p.y-=25*dt;p.life-=dt}this.popups=this.popups.filter(p=>p.life>0)}
 effects(c){for(const p of this.particles){c.globalAlpha=Math.min(1,p.life*2);circle(c,p.x,p.y,p.r,p.color)}c.globalAlpha=1;for(const p of this.popups){c.globalAlpha=p.life;txt(c,p.s,p.x,p.y,18,p.color)}c.globalAlpha=1;if(this.flash>0){c.fillStyle=`rgba(255,97,87,${this.flash*.6})`;c.fillRect(0,0,W,H)}}
 back(c,top='#234638',bottom='#3c7652',grid=0){let g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,top);g.addColorStop(1,bottom);c.fillStyle=g;c.fillRect(0,0,W,H);for(const p of this.seed){circle(c,p.x,p.y,p.r,'#ffffff08')}if(grid){c.strokeStyle='#ffffff07';c.lineWidth=1;for(let x=0;x<W;x+=grid){c.beginPath();c.moveTo(x,0);c.lineTo(x,H);c.stroke()}for(let y=0;y<H;y+=grid){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke()}}}
 hud(data){this.ui.hud?.(data)} controls(data){this.ui.controls?.(data)} toast(s){this.ui.toast?.(s)}
 finish(win,text=''){if(this.done)return;this.done=true;this.frozen=true;this.sfx(win?'win':'lose');this.ui.finish?.({win,score:Math.round(this.score),text})}
 choices(title,text,items,cb){this.frozen=true;this.ui.choose?.(title,text,items,i=>{if(this.done)return;this.frozen=false;cb(i)})}
 movePlayer(p,dt,speed=190){let dx=0,dy=0;if(this.keys.ArrowLeft||this.keys.a)dx--;if(this.keys.ArrowRight||this.keys.d)dx++;if(this.keys.ArrowUp||this.keys.w)dy--;if(this.keys.ArrowDown||this.keys.s)dy++;if(this.pointer.down&&this.dragStart){dx=(this.pointer.x-this.dragStart.x)/45;dy=(this.pointer.y-this.dragStart.y)/45;if(Math.hypot(dx,dy)<.1){dx=0;dy=0}}let m=Math.hypot(dx,dy);if(m>1){dx/=m;dy/=m}p.x=clamp(p.x+dx*speed*dt,35,W-35);p.y=clamp(p.y+dy*speed*dt,35,H-35);return m>0}
 onPointer(type,x,y){this.pointer.x=x;this.pointer.y=y;this.pointer.down=type!=='up';if(type==='down')this.dragStart={x,y};if(type==='up')this.dragStart=null}
 joystick(c){if(this.pointer.down&&this.dragStart){let s=this.dragStart,dx=this.pointer.x-s.x,dy=this.pointer.y-s.y,n=Math.hypot(dx,dy);circle(c,s.x,s.y,44,'#ffffff16','#ffffff33');circle(c,s.x+dx*Math.min(1,38/(n||1)),s.y+dy*Math.min(1,38/(n||1)),18,'#ffffff66')}}
 update(dt){this.tick(dt)} draw(c){this.back(c);this.effects(c)} action(){}
}
