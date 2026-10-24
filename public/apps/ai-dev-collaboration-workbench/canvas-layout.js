'use strict';
(function(root){
  const HEADER=180, GAP=64, PAD=40, CHILD_W=280, CHILD_H=150;
  const overlap=(a,b,gap=24)=>a.x<b.x+b.w+gap&&a.x+a.w+gap>b.x&&a.y<b.y+b.h+gap&&a.y+a.h+gap>b.y;
  function layout(p){
    const out=new Map(), expanded=p.moduleView?.expanded||{}, active=p.moduleView?.mode==='inside'?p.moduleView.activeContainer:null;
    const roots=p.nodes.filter(n=>!n.parentId).sort((a,b)=>a.y-b.y||a.x-b.x||a.id.localeCompare(b.id));
    for(const n of roots){
      const kids=p.nodes.filter(c=>c.parentId===n.id), open=!!expanded[n.id]||active===n.id;
      const r={x:n.x,y:n.y,w:n.moduleLevel==='container'?420:(n.w||250),h:n.moduleLevel==='container'?180:(n.h||150)};
      const local=[];
      kids.forEach((c,i)=>{
        const pos=c.canvasPosition||{x:PAD,y:HEADER+i*(CHILD_H+GAP)};
        const k={x:Math.max(PAD,pos.x),y:Math.max(HEADER,pos.y),w:CHILD_W,h:CHILD_H};
        while(local.some(v=>overlap(k,v,24)))k.y=Math.max(...local.filter(v=>overlap(k,v,24)).map(v=>v.y+v.h+GAP));
        local.push(k);if(open){r.w=Math.max(r.w,k.x+k.w+PAD);r.h=Math.max(r.h,k.y+k.h+PAD);}
      });
      if(!active){while([...out.entries()].some(([id,v])=>!p.nodes.find(n=>n.id===id)?.parentId&&overlap(r,v,40))){r.y=Math.max(...[...out.entries()].filter(([id,v])=>!p.nodes.find(n=>n.id===id)?.parentId&&overlap(r,v,40)).map(([,v])=>v.y+v.h+40));}}
      out.set(n.id,r);
      kids.forEach((c,i)=>out.set(c.id,{...local[i],x:r.x+local[i].x,y:r.y+local[i].y}));
    }
    return out;
  }
  function route(a,b,vertical=false){
    let sx,sy,tx,ty,d;
    if(vertical){const down=b.y>=a.y;sx=a.x+a.w/2;sy=down?a.y+a.h:a.y;tx=b.x+b.w/2;ty=down?b.y:b.y+b.h;const m=(sy+ty)/2;d=`M${sx},${sy} C${sx},${m} ${tx},${m} ${tx},${ty}`;}
    else {const right=b.x>=a.x;sx=right?a.x+a.w:a.x;sy=a.y+a.h/2;tx=right?b.x:b.x+b.w;ty=b.y+b.h/2;const bend=Math.max(45,Math.abs(tx-sx)/2)*(right?1:-1);d=`M${sx},${sy} C${sx+bend},${sy} ${tx-bend},${ty} ${tx},${ty}`;}
    return {d,x:(sx+tx)/2,y:(sy+ty)/2};
  }
  function fit(rects,width,height){const left=Math.min(...rects.map(r=>r.x)),top=Math.min(...rects.map(r=>r.y)),right=Math.max(...rects.map(r=>r.x+r.w)),bottom=Math.max(...rects.map(r=>r.y+r.h));const z=Math.max(.1,Math.min(1,(width-80)/(right-left),(height-110)/(bottom-top)));return {z,x:(width-(right-left)*z)/2-left*z,y:(height-(bottom-top)*z)/2-top*z-15};}
  root.CanvasLayout={layout,route,fit,overlap,HEADER};
})(typeof window==='undefined'?globalThis:window);
