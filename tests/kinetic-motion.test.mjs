import test from 'node:test';
import assert from 'node:assert/strict';
import {installKineticMotion,kineticPointer,kineticScroll} from '../lib/hub/kinetic-motion.ts';

class Events {
  listeners=new Map();
  addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn);}
  removeEventListener(type,fn){this.listeners.get(type)?.delete(fn);}
  emit(type,values={}){for(const fn of [...(this.listeners.get(type)||[])])fn({type,...values});}
  get count(){return [...this.listeners.values()].reduce((sum,items)=>sum+items.size,0);}
}
class Style extends Map {setProperty(key,value){this.set(key,value);}removeProperty(key){this.delete(key);}}
class Element extends Events {
  style=new Style();dataset={};scrollTop=0;scrollLeft=0;
  rect={left:100,top:200,width:300,height:180,bottom:380};
  getBoundingClientRect(){return this.rect;}
  closest(){return this.kind==='card'?this:null;}
}
function harness({motion=true,reduced=false,fine=true}={}){
  const win=new Events(),doc=new Events(),root=new Element(),card=new Element(),section=new Element(),nav=new Element(),active=new Element();
  card.kind='card';section.kind='section';nav.kind='nav';
  nav.rect={left:30,top:40,width:400,height:60,bottom:100};active.rect={left:120,top:47,width:88,height:44,bottom:91};
  nav.querySelector=()=>active;
  root.querySelectorAll=selector=>selector.includes('.hub-collection')?[section]:selector.includes('.hub-application')?[card]:[nav];
  root.contains=value=>value===card;root.ownerDocument=doc;
  const reducedMedia=new Events(),pointerMedia=new Events();reducedMedia.matches=reduced;pointerMedia.matches=fine;
  doc.defaultView=win;doc.hidden=false;doc.documentElement={scrollHeight:2400};
  Object.assign(win,{Element,scrollY:0,innerHeight:800,matchMedia:query=>query.includes('reduced')?reducedMedia:pointerMedia});
  const frames=new Map(),observers=[],resizers=[];let next=0;
  win.requestAnimationFrame=callback=>{frames.set(++next,callback);return next;};win.cancelAnimationFrame=id=>frames.delete(id);
  win.IntersectionObserver=class{constructor(callback){this.callback=callback;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}};
  win.ResizeObserver=class{constructor(callback){this.callback=callback;resizers.push(this);}observe(){}disconnect(){this.disconnected=true;}};
  const cleanup=installKineticMotion(root,motion);
  const flush=()=>{const scheduled=[...frames.values()];frames.clear();for(const callback of scheduled)callback(100);};
  return {root,card,section,nav,active,win,doc,reducedMedia,pointerMedia,frames,observers,resizers,flush,cleanup};
}

test('pointer motion stays bounded outside a card and degenerate geometry stays neutral',()=>{
  const edge=kineticPointer(-200,800,{left:100,top:100,width:300,height:200});
  assert.deepEqual(edge,{rotateX:-2.5,rotateY:-3.5,lightX:0,lightY:100,shiftX:-4.5,shiftY:3.5});
  assert.deepEqual(kineticPointer(NaN,Infinity,{left:0,top:0,width:0,height:0}),{rotateX:0,rotateY:0,lightX:50,lightY:50,shiftX:0,shiftY:0});
  assert.deepEqual(kineticScroll(-40,600,800),{pixels:0,progress:0});
  assert.deepEqual(kineticScroll(5000,2400,800),{pixels:1600,progress:1});
});

test('pointer and scroll bursts share one frame, then stop completely while idle',()=>{
  const h=harness();
  assert.equal(h.frames.size,0);
  for(let i=0;i<5;i++)h.root.emit('pointermove',{target:h.card,pointerType:'mouse',clientX:250+i,clientY:290});
  h.win.scrollY=800;h.win.emit('scroll');
  assert.equal(h.frames.size,1);h.flush();assert.equal(h.frames.size,0);
  assert.equal(h.root.style.get('--kinetic-scroll'),'0.5');
  assert.equal(h.card.dataset.cardActive,'true');
  assert.equal(h.card.style.get('--card-light-y'),'50%');
  h.cleanup();
});

test('hidden pages cancel pending work and cannot schedule pointer or scroll rendering',()=>{
  const h=harness();h.win.emit('scroll');assert.equal(h.frames.size,1);
  h.doc.hidden=true;h.doc.emit('visibilitychange');
  assert.equal(h.frames.size,0);assert.equal(h.root.dataset.kineticMotion,'paused');
  h.win.emit('scroll');h.root.emit('pointermove',{target:h.card,pointerType:'mouse',clientX:100,clientY:200});
  assert.equal(h.frames.size,0);
  h.doc.hidden=false;h.doc.emit('visibilitychange');assert.equal(h.root.dataset.kineticMotion,'active');
  h.cleanup();
});

test('reduced motion and the explicit motion toggle preserve readable content without moving cards',()=>{
  for(const settings of [{motion:false},{reduced:true}]){
    const h=harness(settings);
    assert.equal(h.root.dataset.kineticMotion,'static');assert.equal(h.card.dataset.inView,'true');
    h.win.emit('scroll');h.root.emit('pointermove',{target:h.card,pointerType:'mouse',clientX:100,clientY:200});
    assert.equal(h.frames.size,0);assert.equal(h.card.style.has('--card-rotate-x'),false);h.cleanup();
  }
  const h=harness();h.win.emit('scroll');h.reducedMedia.matches=true;h.reducedMedia.emit('change');
  assert.equal(h.frames.size,0);assert.equal(h.root.style.get('--kinetic-scroll'),'0');h.cleanup();
});

test('keyboard focus, touch input and leaving the card reset pointer-only presentation',()=>{
  for(const reset of [h=>h.root.emit('focusin'),h=>h.root.emit('pointerleave'),h=>h.root.emit('pointermove',{target:h.card,pointerType:'touch',clientX:100,clientY:200})]){
    const h=harness();h.root.emit('pointermove',{target:h.card,pointerType:'mouse',clientX:100,clientY:200});h.flush();
    assert.equal(h.card.dataset.cardActive,'true');reset(h);
    assert.equal(h.card.dataset.cardActive,undefined);assert.equal(h.card.style.has('--card-rotate-y'),false);h.cleanup();
  }
});

test('navigation indicator follows real layout including overflow scroll, and cleanup leaves no observers or handlers',()=>{
  const h=harness();assert.equal(h.nav.style.get('--active-x'),'90px');assert.equal(h.nav.style.get('--active-width'),'88px');
  h.nav.scrollLeft=45;h.nav.emit('scroll');assert.equal(h.nav.style.get('--active-x'),'135px');
  const observer=h.observers.at(-1);observer.callback([{target:h.section,isIntersecting:false}]);
  assert.equal(h.section.dataset.inView,'false');assert.equal(h.section.style.has('opacity'),false);
  observer.callback([{target:h.section,isIntersecting:true}]);assert.equal(h.section.dataset.revealed,'true');
  h.win.emit('scroll');h.cleanup();assert.equal(h.frames.size,0);
  for(const target of [h.root,h.win,h.doc,h.nav,h.reducedMedia,h.pointerMedia])assert.equal(target.count,0);
  assert.ok(h.observers.every(value=>value.disconnected));assert.ok(h.resizers.every(value=>value.disconnected));
  assert.deepEqual(h.card.dataset,{});assert.deepEqual(h.root.dataset,{});assert.equal(h.nav.style.size,0);
});
