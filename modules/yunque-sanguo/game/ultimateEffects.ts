import * as THREE from 'three';
import {BattleEvent} from './battle';
import {worldPosition,actionTiming,motionTime,clamp} from './choreography';
import {ELEMENT_COLORS} from './effects';

/** Pooled volumetric spell stages: charge, eruption, orbit, and dissipation. */
export function createUltimateEffects(scene:THREE.Scene){
 const root=new THREE.Group();scene.add(root);const geometries:THREE.BufferGeometry[]=[],materials:THREE.Material[]=[];
 const mat=(c=0xffdb9e)=>{const m=new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});materials.push(m);return m;};
 const add=(g:THREE.BufferGeometry)=>{geometries.push(g);const mesh=new THREE.Mesh(g,mat());root.add(mesh);return mesh;};
 const core=add(new THREE.IcosahedronGeometry(1,1)),shell=add(new THREE.IcosahedronGeometry(1,1));shell.material.wireframe=true;
 const rings=Array.from({length:4},()=>add(new THREE.TorusGeometry(1,.055,6,48)));
 const crystals=Array.from({length:18},()=>add(new THREE.ConeGeometry(.22,1.3,5)));
 const orbs=Array.from({length:24},()=>add(new THREE.IcosahedronGeometry(.12,0)));
 const targetBursts=Array.from({length:6},()=>{const group=new THREE.Group();root.add(group);const ring=add(new THREE.TorusGeometry(.8,.06,5,32)),spire=add(new THREE.ConeGeometry(.38,2.5,6));group.add(ring,spire);ring.rotation.x=Math.PI/2;return {group,ring,spire};});
 const glow=new THREE.PointLight(0xffd58a,0,12,2);root.add(glow);
 function update(e:BattleEvent,elapsed:number,cinematic:boolean,reduced:boolean){
  const active=['skill','combo','boss'].includes(e.kind);root.visible=active&&!reduced;if(!root.visible)return;
  const actor=e.units.find(u=>u.uid===e.actor);if(!actor){root.visible=false;return;}
  const timing=actionTiming(e,cinematic,reduced),t=motionTime(elapsed,timing.contact,timing.stop),post=(t-timing.contact)/1000,charge=clamp((t-timing.intro)/(timing.contact-timing.intro)),big=e.kind==='combo'||e.kind==='boss';
  const color=new THREE.Color(ELEMENT_COLORS[e.element]||'#fff0b3');materials.forEach(m=>{const a=m as THREE.MeshBasicMaterial;a.color.copy(color);a.opacity=0;});
  const a=worldPosition(actor),targets=e.units.filter(u=>e.targets.includes(u.uid)),center=targets.length?targets.reduce((p,u)=>{const v=worldPosition(u);return {x:p.x+v.x/targets.length,z:p.z+v.z/targets.length};},{x:0,z:0}):a;
  const pre=post<0,fade=pre?charge:Math.max(0,1-post/(big?1.1:.75)),cx=pre?a.x:center.x,cz=pre?a.z:center.z;
  core.position.set(cx,1.5,cz);core.scale.setScalar(pre?.08+charge*.34:(big?.65:.4)+post*1.5);core.material.opacity=pre?charge*.45:fade*.32;
  shell.position.copy(core.position);shell.scale.copy(core.scale).multiplyScalar(1.7);shell.rotation.set(t*.002,t*.003,t*.001);shell.material.opacity=fade*.65;
  glow.position.set(cx,1.5,cz);glow.color.copy(color);glow.intensity=fade*(big?7:4);
  rings.forEach((r,i)=>{const spread=pre?.5+charge*.35:.8+Math.max(0,post)*(2+i*.4);r.position.set(cx,pre?.2+i*.33:.12+i*.25,cz);r.rotation.set(Math.PI/2+(e.element==='shadow'?i*.55:0),0,t*.002*(i%2?1:-1));r.scale.setScalar(spread*(big?1.35:1));r.material.opacity=fade*(.7-i*.12);});
  crystals.forEach((m,i)=>{const angle=i/18*Math.PI*2+t*.001,range=pre?.8:1.1+post*1.9;const fiery=e.element==='fire',ice=e.element==='ice',thunder=e.element==='thunder';m.position.set(cx+Math.cos(angle)*range,pre?.25+charge*.2:(ice?.25:1.2+Math.sin(i*2+post*4)*.65),cz+Math.sin(angle)*range);m.rotation.set(fiery?Math.sin(angle)*.35:ice?0:angle,0,fiery?Math.cos(angle)*.35:ice?Math.sin(i)*.2:Math.PI/2);m.scale.set(pre?.3:ice?.8:.45,(pre?.2:thunder?2:ice?1.7:1)*(big?1.25:1),pre?.3:.65);m.material.opacity=pre?charge*.24:fade*.65;});
  orbs.forEach((m,i)=>{const angle=i*2.39996+t*.004,range=pre?1-charge*.35:1+post*(1.4+i%4*.25);m.position.set(cx+Math.cos(angle)*range,pre?.7+Math.sin(angle)*.4:1+Math.sin(i*1.7+post*2)*range,cz+Math.sin(angle)*range);m.scale.setScalar(pre?.35:.6+fade);m.material.opacity=fade;});
  targetBursts.forEach((b,i)=>{const u=targets[i];b.group.visible=!!u&&!pre;if(!u||pre)return;const v=worldPosition(u);b.group.position.set(v.x,.03,v.z);b.ring.scale.setScalar(.5+post*2);b.ring.material.opacity=fade*.9;b.spire.position.y=1.1;b.spire.scale.set(.35+post*.6,(e.element==='thunder'?1.8:e.element==='fire'?1.1:.7)*fade,.35+post*.6);b.spire.material.opacity=fade*.3;});
 }
 return {update,dispose:()=>{scene.remove(root);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
