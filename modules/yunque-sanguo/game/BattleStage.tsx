'use client';
import {useEffect,useRef,RefObject} from 'react';
import * as THREE from 'three';
import {BattleEvent} from './battle';
import {HEROES,FACTION_COLOR} from './data';
import {actionTiming,poseFor,deformVertex,worldPosition,weaponStyle,clamp,smooth,motionTime} from './choreography';
import {ELEMENT_COLORS} from './effects';
import {createHeroRig,animateHeroRig,HeroRig} from './heroModels';
import {createUltimateEffects} from './ultimateEffects';
interface Props{event:BattleEvent;index:number;clock:RefObject<number>;paused:boolean;reduced:boolean;cinematic:boolean;overlay:RefObject<HTMLDivElement|null>;onReady:(ready:boolean)=>void;onError:()=>void}
type Actor={group:THREE.Group;rig:HeroRig;shadow:THREE.Mesh<THREE.CircleGeometry,THREE.MeshBasicMaterial>;ring:THREE.Mesh<THREE.RingGeometry,THREE.MeshBasicMaterial>;shield:THREE.Mesh<THREE.SphereGeometry,THREE.MeshBasicMaterial>};
export default function BattleStage(props:Props){
 const host=useRef<HTMLDivElement>(null),live=useRef(props);live.current=props;
 useEffect(()=>{
  const root=host.current;if(!root)return;
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{live.current.onError();return;}
  let disposed=false,raf=0,width=1,height=1,lastFrame=0,lastIndex=-1;
  renderer.shadowMap.enabled=innerWidth>=700;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setClearColor(0x061a22,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<700?1.35:1.8));root.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden','true');renderer.domElement.addEventListener('webglcontextlost',lost);
  function lost(e:Event){e.preventDefault();live.current.onReady(false);live.current.onError();cancelAnimationFrame(raf);}
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,.1,80);scene.fog=new THREE.FogExp2(0x0a2128,.026);
  scene.add(new THREE.HemisphereLight(0xc6e8df,0x14202c,2));const light=new THREE.DirectionalLight(0xffe9bb,3.2);light.position.set(-5,12,8);light.castShadow=innerWidth>=700;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:1,far:28});light.shadow.bias=-.001;scene.add(light);const rim=new THREE.DirectionalLight(0x64c9d6,1.8);rim.position.set(7,4,-5);scene.add(rim);
  const geometries:THREE.BufferGeometry[]=[],materials:THREE.Material[]=[],textures:THREE.Texture[]=[];
  const keepG=<T extends THREE.BufferGeometry>(g:T)=>{geometries.push(g);return g;},keepM=<T extends THREE.Material>(m:T)=>{materials.push(m);return m;};
  // A real lit, raised 3D battle platform; original city artwork remains the distant backdrop.
  const floor=new THREE.Mesh(keepG(new THREE.CylinderGeometry(7.45,7.7,.45,72)),[keepM(new THREE.MeshStandardMaterial({color:0x122b32,roughness:.72,metalness:.3})),keepM(new THREE.MeshStandardMaterial({color:0x203a3d,roughness:.8})),keepM(new THREE.MeshStandardMaterial({color:0x081d25}))]);floor.position.y=-.29;floor.receiveShadow=true;scene.add(floor);
  for(const r of [6.7,7.38]){const ring=new THREE.Mesh(keepG(new THREE.RingGeometry(r-.025,r+.025,80)),keepM(new THREE.MeshBasicMaterial({color:r>7?0xc7aa71:0x729b92,transparent:true,opacity:r>7?.64:.28,side:THREE.DoubleSide})));ring.rotation.x=-Math.PI/2;ring.position.y=-.049;scene.add(ring);}
  const grid=new THREE.GridHelper(14,14,0x8b9c87,0x405e5d);grid.position.y=-.055;(grid.material as THREE.Material).transparent=true;(grid.material as THREE.Material).opacity=.17;scene.add(grid);geometries.push(grid.geometry);materials.push(grid.material as THREE.Material);
  const lineG=keepG(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-.048,-6),new THREE.Vector3(0,-.048,6)]));scene.add(new THREE.Line(lineG,keepM(new THREE.LineDashedMaterial({color:0xadb891,transparent:true,opacity:.3,dashSize:.25,gapSize:.3}))).computeLineDistances());
  const actors=new Map<string,Actor>();
  for(const u of props.event.units){
   const rig=createHeroRig(u.hero),group=rig.root;scene.add(group);
   const shadow=new THREE.Mesh(keepG(new THREE.CircleGeometry(.56,24)),keepM(new THREE.MeshBasicMaterial({color:0x000a0d,transparent:true,opacity:.38,depthWrite:false})));shadow.rotation.x=-Math.PI/2;shadow.scale.set(1,.62,1);scene.add(shadow);
   const ring=new THREE.Mesh(keepG(new THREE.RingGeometry(.63,.68,32)),keepM(new THREE.MeshBasicMaterial({color:FACTION_COLOR[HEROES[u.hero].faction],transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false})));ring.rotation.x=-Math.PI/2;scene.add(ring);
   const shield=new THREE.Mesh(keepG(new THREE.SphereGeometry(1.05,12,8)),keepM(new THREE.MeshBasicMaterial({color:0x98efff,transparent:true,opacity:.1,wireframe:true,depthWrite:false})));shield.scale.set(.85,1.45,.75);shield.position.y=1.2;group.add(shield);
   actors.set(u.uid,{group,rig,shadow,ring,shield});
  }
  const ultimate=createUltimateEffects(scene);
  const trailPoints:THREE.Vector3[]=[],trailPositions=new Float32Array(12*2*3),trailGeometry=keepG(new THREE.BufferGeometry());trailGeometry.setAttribute('position',new THREE.BufferAttribute(trailPositions,3));const trailIndices:number[]=[];for(let i=0;i<11;i++){const n=i*2;trailIndices.push(n,n+1,n+2,n+1,n+3,n+2);}trailGeometry.setIndex(trailIndices);const trail=new THREE.Mesh(trailGeometry,keepM(new THREE.MeshBasicMaterial({color:0xbef3e9,transparent:true,opacity:0,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false})));trail.frustumCulled=false;scene.add(trail);
  const fx=new THREE.Group();scene.add(fx);
  const slash=new THREE.Mesh(keepG(new THREE.RingGeometry(.85,1.18,40,1,-.6,2.5)),keepM(new THREE.MeshBasicMaterial({color:0xe6fff0,transparent:true,opacity:0,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false})));fx.add(slash);
  const slash2=new THREE.Mesh(keepG(new THREE.RingGeometry(1.14,1.18,40,1,-.6,2.5)),keepM(new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false})));fx.add(slash2);
  const thrust=new THREE.Mesh(keepG(new THREE.ConeGeometry(.095,2.2,10)),keepM(new THREE.MeshBasicMaterial({color:0xd7fff8,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false})));fx.add(thrust);
  const wave=new THREE.Mesh(keepG(new THREE.RingGeometry(.75,.9,50)),keepM(new THREE.MeshBasicMaterial({color:0xf3cb85,transparent:true,opacity:0,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false})));wave.rotation.x=-Math.PI/2;fx.add(wave);
  const sparkCount=innerWidth<700?18:32,sparkG=keepG(new THREE.BufferGeometry()),sparkPositions=new Float32Array(sparkCount*3);sparkG.setAttribute('position',new THREE.BufferAttribute(sparkPositions,3));const sparks=new THREE.Points(sparkG,keepM(new THREE.PointsMaterial({color:0xffdea0,size:.045,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false})));fx.add(sparks);
  const projectile=new THREE.Mesh(keepG(new THREE.SphereGeometry(.12,8,8)),keepM(new THREE.MeshBasicMaterial({color:0xaaffee,transparent:true,opacity:0,blending:THREE.AdditiveBlending})));fx.add(projectile);
  const screen=new THREE.Vector3();
  const resize=()=>{lastIndex=-1;width=root.clientWidth||1;height=root.clientHeight||1;camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false);};const observer=new ResizeObserver(resize);observer.observe(root);resize();
  live.current.onReady(true);
  function frame(now:number){
   if(disposed)return;raf=requestAnimationFrame(frame);const p=live.current;if(document.hidden||p.paused&&lastIndex===p.index)return;
   // Cap on phones and reduced-motion while preserving the shared contact clock.
   const interval=p.reduced?100:width<700?1000/40:1000/60;if(now-lastFrame<interval)return;lastFrame=now;
   const e=p.event,elapsed=p.clock.current,timing=actionTiming(e,p.cinematic,p.reduced),action=motionTime(elapsed,timing.contact,timing.stop),post=action-timing.contact;
   const actor=e.units.find(u=>u.uid===e.actor),target=e.units.find(u=>e.targets.includes(u.uid)&&u.side!==actor?.side),big=['combo','boss'].includes(e.kind),damaging=e.hits.some(h=>h.kind==='damage'||h.kind==='critical');
   const inStop=!p.reduced&&elapsed>=timing.contact&&elapsed<timing.contact+timing.stop;
   const shake=!p.reduced&&damaging&&post>=0&&post<260?Math.exp(-post/80)*(big?.12:.065):0;
   const distance=Math.max(15.2,14.8/(2*Math.tan(21*Math.PI/180)*camera.aspect));
   const focus=actor&&target?worldPosition(target):{x:0,z:0},dolly=!p.reduced&&big?Math.sin(clamp(elapsed/timing.duration)*Math.PI)*(width<700?.06:.12):0;
   camera.position.set(Math.sin(post*.12)*shake,distance*.55+Math.cos(post*.1)*shake,distance*.84*(1-dolly));camera.lookAt(focus.x*dolly,.55,focus.z*dolly);camera.updateMatrixWorld();
   for(const u of e.units){const a=actors.get(u.uid)!;const pose=poseFor(u,e,elapsed,p.cinematic,p.reduced),standing=u.hp>0||pose.fall<1;
    const isActor=e.actor===u.uid&&['attack','skill','combo','boss'].includes(e.kind),localTime=action-timing.intro,wind=clamp(localTime/190),strike=smooth((localTime-190)/Math.max(1,timing.contact-timing.intro-190)),recovery=smooth(Math.max(0,post)/450),run=isActor?Math.sin(clamp((localTime-130)/300)*Math.PI*2)*(1-recovery):0;
    a.group.position.set(pose.x,pose.y,pose.z);const facing=u.side===0?Math.PI/3:-Math.PI/3;
    let yaw=facing;if(isActor&&target){const targetPos=worldPosition(target);yaw=THREE.MathUtils.lerp(facing,Math.atan2(targetPos.x-pose.x,targetPos.z-pose.z),wind*(1-recovery));}
    a.group.rotation.set(0,yaw,0);
    animateHeroRig(a.rig,{time:p.reduced||p.paused||inStop?0:now,windup:isActor?wind:0,strike:isActor?strike:0,recovery,run,hit:pose.recoil,fallen:pose.fall,cast:isActor&&weaponStyle(u.hero)==='spell',ultimate:big&&isActor,reduced:p.reduced});
    a.rig.material.emissive.setRGB(pose.flash*.38,pose.flash*.15,pose.flash*.03);if(e.hits.some(h=>h.uid===u.uid&&h.kind==='heal')&&elapsed>=timing.contact&&post<350)a.rig.material.emissive.setRGB(0,.25,.09);
    a.shadow.position.set(pose.x+.12,-.042,pose.z+.07);a.shadow.material.opacity=u.hp<=0?.16:.45;a.shadow.scale.set(1+pose.recoil*.25,.58,1);
    a.ring.position.set(pose.x,-.04,pose.z);a.ring.visible=pose.fall===0;a.ring.material.opacity=e.actor===u.uid?.95:u.rage>=100?.8:.48;const affected=e.hits.some(h=>h.uid===u.uid);a.ring.scale.setScalar(affected&&post>=0&&post<400&&!p.reduced?1+Math.sin(post/400*Math.PI)*.6:1);if(affected&&post>=0&&post<400)a.ring.material.opacity=.95;
    a.shield.visible=u.shield>0&&u.hp>0;
    const label=p.overlay.current?.querySelector<HTMLElement>(`[data-uid="${u.uid}"]`);if(label){screen.set(pose.x,.04,pose.z).project(camera);const x=(screen.x*.5+.5)*width,y=(-screen.y*.5+.5)*height;label.style.left=`${x}px`;label.style.top=`${y}px`;label.style.zIndex=String(Math.round(100-y/height*20));label.style.setProperty('--depth-scale',String(clamp(1+(pose.z/20),.82,1.15)));}
   }
   if(lastIndex!==p.index)trailPoints.length=0;
   trail.material.opacity=0;
   if(actor&&!p.reduced&&action>timing.intro+190&&post<230){const a=actors.get(actor.uid)!;a.group.updateMatrixWorld(true);const tip=new THREE.Vector3();a.rig.weaponTip.getWorldPosition(tip);if(!inStop)trailPoints.unshift(tip);if(trailPoints.length>12)trailPoints.pop();if(trailPoints.length>1){for(let i=0;i<12;i++){const q=trailPoints[Math.min(i,trailPoints.length-1)],w=(1-i/12)*(big?.32:.14);trailPositions.set([q.x,q.y+w,q.z,q.x,q.y-w,q.z],i*6);}trailGeometry.attributes.position.needsUpdate=true;trail.material.color.set(ELEMENT_COLORS[e.element]||'#edf3ba');trail.material.opacity=.7;}}
   ultimate.update(e,elapsed,p.cinematic,p.reduced);
   slash.material.opacity=slash2.material.opacity=thrust.material.opacity=wave.material.opacity=projectile.material.opacity=sparks.material.opacity=0;
   if(!p.reduced&&actor&&target&&['attack','skill','combo','boss'].includes(e.kind)){
    const pos=worldPosition(target),origin=poseFor(actor,e,elapsed,p.cinematic,p.reduced),style=weaponStyle(actor.hero),col=ELEMENT_COLORS[e.element]||'#ffe4b0';slash.material.color.set(col);thrust.material.color.set(col);wave.material.color.set(col);projectile.material.color.set(col);sparks.material.color.set(col);
    const contactApproach=clamp((action-timing.intro-170)/(timing.contact-timing.intro-170));
    if(style==='bow'||style==='spell'){projectile.position.set(origin.x+(pos.x-origin.x)*contactApproach,1.65+Math.sin(contactApproach*Math.PI)*.55,pos.z);projectile.material.opacity=action>=timing.intro+170&&post<0?1:0;}
    if(post>=-55&&post<310){const fade=1-clamp(post/310),sweep=smooth((post+55)/180),side=actor.side===0?1:-1;
     slash.position.set(pos.x,1.5,pos.z+.13);slash.quaternion.copy(camera.quaternion);slash.rotateZ((style==='heavy'?-1.3:-.6)+side*sweep*1.35);slash.scale.set(side*(big?1.7:1.15),style==='heavy'?1.55:.78,1);slash.material.opacity=fade*.3;
     slash2.position.copy(slash.position);slash2.quaternion.copy(slash.quaternion);slash2.scale.copy(slash.scale);slash2.material.opacity=fade*.45;
     if(style==='spear'){slash.material.opacity*=.25;thrust.position.set(pos.x-side*.5,1.4,pos.z+.1);thrust.rotation.z=-side*Math.PI/2-.2;thrust.material.opacity=fade;thrust.scale.set(1,1+sweep*.5,1);}
     const progress=Math.max(0,post)/1000;wave.position.set(pos.x,-.018,pos.z);wave.scale.setScalar(.4+progress*(big?9:4));wave.material.opacity=fade*(big||style==='heavy'?.7:.25);
     for(let i=0;i<sparkCount;i++){const angle=i*2.39996,spread=progress*(1+i%4);sparkPositions[i*3]=pos.x+Math.cos(angle)*spread;sparkPositions[i*3+1]=1.35+Math.sin(angle)*spread-progress*progress*4;sparkPositions[i*3+2]=pos.z+Math.sin(i*1.1)*spread*.5;}sparkG.attributes.position.needsUpdate=true;sparks.material.opacity=fade;
    }
   }
   renderer.render(scene,camera);lastIndex=p.index;
  }
  raf=requestAnimationFrame(frame);
  return()=>{disposed=true;cancelAnimationFrame(raf);observer.disconnect();renderer.domElement.removeEventListener('webglcontextlost',lost);actors.forEach(a=>a.rig.dispose());ultimate.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.domElement.remove();};
 },[]);
 return <div ref={host} className="battle-stage-webgl" aria-hidden="true"/>;
}
