/** DOM-only presentation for the kinetic theme. No account, routing or save state. */
type PointerSurface=Pick<DOMRect,'left'|'top'|'width'|'height'>;
const bounded=(value:number,min:number,max:number)=>Number.isFinite(value)?Math.max(min,Math.min(max,value)):min;

export function kineticPointer(clientX:number,clientY:number,rect:PointerSurface) {
  const x=rect.width>0&&Number.isFinite(clientX)?bounded((clientX-rect.left)/rect.width,0,1):.5;
  const y=rect.height>0&&Number.isFinite(clientY)?bounded((clientY-rect.top)/rect.height,0,1):.5;
  return {rotateX:(.5-y)*5,rotateY:(x-.5)*7,lightX:x*100,lightY:y*100,shiftX:(x-.5)*9,shiftY:(y-.5)*7};
}

export function kineticScroll(scrollTop:number,scrollHeight:number,viewportHeight:number) {
  const extent=Math.max(0,scrollHeight-viewportHeight);
  const pixels=bounded(scrollTop,0,extent);
  return {pixels,progress:extent>0?pixels/extent:0};
}

const cardProperties=['--card-rotate-x','--card-rotate-y','--card-light-x','--card-light-y','--art-shift-x','--art-shift-y'];
const navProperties=['--active-x','--active-y','--active-width','--active-height'];
const sectionSelector='.hub-collection,.hub-data-content,[data-kinetic-section]';
const cardSelector='.hub-application,.hub-file-row,[data-kinetic-interactive]';
const navSelector='.hub-primary-nav,.hub-category-filter,.hub-style-switcher';

export function installKineticMotion(root:HTMLElement,motion:boolean):()=>void {
  const doc=root.ownerDocument,view=doc.defaultView;
  if(!view)return ()=>{};
  const win=view;
  const reduced=win.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer=win.matchMedia('(hover: hover) and (pointer: fine)');
  const sections=Array.from(root.querySelectorAll<HTMLElement>(sectionSelector));
  const cards=Array.from(root.querySelectorAll<HTMLElement>(cardSelector));
  const navs=Array.from(root.querySelectorAll<HTMLElement>(navSelector));
  const tracked=[...new Set([...sections,...cards])];
  let alive=true,frame=0,observer:IntersectionObserver|null=null;
  let activeCard:HTMLElement|null=null,pointer:{x:number;y:number}|null=null;
  const allowed=()=>alive&&motion&&!reduced.matches&&!doc.hidden;

  function clearCard() {
    if(activeCard){for(const property of cardProperties)activeCard.style.removeProperty(property);delete activeCard.dataset.cardActive;}
    activeCard=null;pointer=null;
  }
  function measureNavigation() {
    for(const nav of navs){
      const active=nav.querySelector<HTMLElement>('button.active,button[aria-pressed="true"],a[aria-current="page"]');
      if(!active){delete nav.dataset.indicatorReady;continue;}
      const outer=nav.getBoundingClientRect(),inner=active.getBoundingClientRect();
      if(!inner.width||!inner.height){delete nav.dataset.indicatorReady;continue;}
      nav.style.setProperty('--active-x',`${inner.left-outer.left+nav.scrollLeft}px`);
      nav.style.setProperty('--active-y',`${inner.top-outer.top+nav.scrollTop}px`);
      nav.style.setProperty('--active-width',`${inner.width}px`);
      nav.style.setProperty('--active-height',`${inner.height}px`);
      nav.dataset.indicatorReady='true';
    }
  }
  function measureScroll() {
    const metrics=kineticScroll(win.scrollY,doc.documentElement.scrollHeight,win.innerHeight);
    root.style.setProperty('--kinetic-scroll',String(metrics.progress));
    root.style.setProperty('--kinetic-scroll-px',`${metrics.pixels}px`);
  }
  function paint() {
    frame=0;
    if(!allowed())return;
    measureScroll();measureNavigation();
    if(activeCard&&pointer){
      const value=kineticPointer(pointer.x,pointer.y,activeCard.getBoundingClientRect());
      activeCard.style.setProperty('--card-rotate-x',`${value.rotateX}deg`);
      activeCard.style.setProperty('--card-rotate-y',`${value.rotateY}deg`);
      activeCard.style.setProperty('--card-light-x',`${value.lightX}%`);
      activeCard.style.setProperty('--card-light-y',`${value.lightY}%`);
      activeCard.style.setProperty('--art-shift-x',`${value.shiftX}px`);
      activeCard.style.setProperty('--art-shift-y',`${value.shiftY}px`);
      activeCard.dataset.cardActive='true';
    }
  }
  function requestPaint() {
    if(allowed()&&!frame)frame=win.requestAnimationFrame(paint);
  }
  function setInView(element:HTMLElement,visible:boolean) {
    element.dataset.inView=String(visible);
    if(visible)element.dataset.revealed='true';
  }
  function resetObserver() {
    observer?.disconnect();observer=null;
    if(!allowed()){
      for(const element of tracked)setInView(element,true);
      return;
    }
    for(const element of tracked){
      const rect=element.getBoundingClientRect();
      setInView(element,rect.bottom>0&&rect.top<win!.innerHeight);
    }
    if('IntersectionObserver' in win){
      observer=new win.IntersectionObserver(entries=>{
        if(!allowed())return;
        for(const entry of entries)setInView(entry.target as HTMLElement,entry.isIntersecting);
      },{threshold:0,rootMargin:'0px 0px -24px 0px'});
      for(const element of tracked)observer.observe(element);
    }else for(const element of tracked)setInView(element,true);
  }
  function reconcile() {
    if(frame)win!.cancelAnimationFrame(frame);frame=0;
    clearCard();
    root.dataset.kineticMotion=!motion||reduced.matches?'static':doc.hidden?'paused':'active';
    measureNavigation();
    if(allowed())measureScroll();
    else if(!motion||reduced.matches){root.style.setProperty('--kinetic-scroll','0');root.style.setProperty('--kinetic-scroll-px','0px');}
    resetObserver();
  }
  function cardFrom(target:EventTarget|null):HTMLElement|null {
    if(!(target instanceof win!.Element))return null;
    const card=target.closest<HTMLElement>(cardSelector);
    return card&&root.contains(card)?card:null;
  }
  function move(event:PointerEvent) {
    if(!allowed()||!finePointer.matches||event.pointerType==='touch'){clearCard();return;}
    const card=cardFrom(event.target);
    if(card!==activeCard){clearCard();activeCard=card;}
    if(!card)return;
    pointer={x:event.clientX,y:event.clientY};requestPaint();
  }
  function leave(event:PointerEvent) {
    if(activeCard&&cardFrom(event.relatedTarget)!==activeCard)clearCard();
  }
  function focus(){clearCard();}
  function resize(){measureNavigation();requestPaint();}
  function pointerCapability(){if(!finePointer.matches)clearCard();}
  for(const element of tracked){
    element.dataset.kineticReveal=sections.includes(element)?'section':'card';
    element.style.setProperty('--reveal-index',String(sections.includes(element)?0:Math.min(cards.indexOf(element)%3,2)));
    // The default remains readable if motion/observation is unsupported.
    element.dataset.inView='true';
  }
  root.addEventListener('pointermove',move,{passive:true});
  root.addEventListener('pointerout',leave,{passive:true});
  root.addEventListener('pointerleave',clearCard,{passive:true});
  root.addEventListener('focusin',focus);
  win.addEventListener('scroll',requestPaint,{passive:true});
  win.addEventListener('resize',resize,{passive:true});
  doc.addEventListener('visibilitychange',reconcile);
  reduced.addEventListener('change',reconcile);
  finePointer.addEventListener('change',pointerCapability);
  for(const nav of navs)nav.addEventListener('scroll',measureNavigation,{passive:true});
  const resizeObserver='ResizeObserver' in win?new win.ResizeObserver(resize):null;
  if(resizeObserver){resizeObserver.observe(root);for(const nav of navs)resizeObserver.observe(nav);}
  reconcile();
  return ()=>{
    alive=false;if(frame)win.cancelAnimationFrame(frame);frame=0;
    observer?.disconnect();resizeObserver?.disconnect();clearCard();
    root.removeEventListener('pointermove',move);root.removeEventListener('pointerout',leave);
    root.removeEventListener('pointerleave',clearCard);root.removeEventListener('focusin',focus);
    win.removeEventListener('scroll',requestPaint);win.removeEventListener('resize',resize);
    doc.removeEventListener('visibilitychange',reconcile);reduced.removeEventListener('change',reconcile);
    finePointer.removeEventListener('change',pointerCapability);
    for(const nav of navs){nav.removeEventListener('scroll',measureNavigation);delete nav.dataset.indicatorReady;for(const property of navProperties)nav.style.removeProperty(property);}
    for(const element of tracked){delete element.dataset.inView;delete element.dataset.kineticReveal;delete element.dataset.revealed;element.style.removeProperty('--reveal-index');}
    delete root.dataset.kineticMotion;root.style.removeProperty('--kinetic-scroll');root.style.removeProperty('--kinetic-scroll-px');
  };
}
