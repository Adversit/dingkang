'use client';
import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {createHeroRig,animateHeroRig} from './heroModels';
import Character from './Character';
import {HEROES} from './data';
export default function HeroModelView({id}:{id:number}){
 const host=useRef<HTMLDivElement>(null),rotation=useRef(0),[failed,setFailed]=useState(false);
 useEffect(()=>{const root=host.current;if(!root)return;let renderer:THREE.WebGLRenderer;try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});}catch{setFailed(true);return;}
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;root.appendChild(renderer.domElement);const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.1,30);camera.position.set(3.5,2.6,5.5);const rig=createHeroRig(id);scene.add(rig.root,new THREE.HemisphereLight(0xcce5ee,0x294139,2.7));const key=new THREE.DirectionalLight(0xffe0a2,3.4);key.position.set(-3,5,4);scene.add(key);const rim=new THREE.DirectionalLight(0x78daef,2.6);rim.position.set(4,3,-2);scene.add(rim);
 const controls=new OrbitControls(camera,renderer.domElement);const bounds=new THREE.Box3().setFromObject(rig.root),extent=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());controls.target.copy(center);controls.enablePan=false;controls.enableZoom=false;controls.minPolarAngle=.65;controls.maxPolarAngle=1.65;controls.enableDamping=true;controls.update();let raf=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const resize=()=>{const w=root.clientWidth||240,h=root.clientHeight||330;renderer.setSize(w,h,false);camera.aspect=w/h;const distance=Math.max(extent.y,extent.x/camera.aspect)/(2*Math.tan(17.5*Math.PI/180))*1.12+extent.z*.45;camera.position.copy(center).addScaledVector(new THREE.Vector3(.5,.18,.85).normalize(),distance);camera.lookAt(center);camera.updateProjectionMatrix();};const ro=new ResizeObserver(resize);ro.observe(root);resize();const frame=(t:number)=>{raf=requestAnimationFrame(frame);if(document.hidden)return;rig.root.rotation.y=rotation.current;animateHeroRig(rig,{time:reduced?0:t,reduced});controls.update();renderer.render(scene,camera);};raf=requestAnimationFrame(frame);
 return()=>{cancelAnimationFrame(raf);ro.disconnect();controls.dispose();rig.dispose();renderer.dispose();renderer.domElement.remove();};},[id]);
 return <div className="hero-model-view">{failed?<Character id={id} priority/>:<div ref={host} className="hero-model-canvas" role="img" aria-label={`${HEROES[id].name}的可旋转实体3D模型`}/>}<div className="model-turn-controls"><button aria-label="向左旋转角色" onClick={()=>rotation.current-=.6}>左转</button><small>{failed?'兼容立绘':'拖动旋转 · 实体3D'}</small><button aria-label="向右旋转角色" onClick={()=>rotation.current+=.6}>右转</button></div></div>;
}
