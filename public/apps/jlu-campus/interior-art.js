/** Original pixel interiors. Every freestanding object occupies an existing
 * furniture rectangle; floor graphics and wall art introduce no obstacles. */
const BOOKS=['#58877f','#bd7868','#d8ba73','#8288a5','#77905f','#b0997c'];

function rect(c,color,x,y,w,h){c.fillStyle=color;c.fillRect(x,y,w,h);}
function text(c,label,x,y,size=3.5,color='#f8edce',align='center'){
  c.fillStyle=color;c.font=`600 ${size}px "Microsoft YaHei",system-ui,sans-serif`;
  c.textAlign=align;c.textBaseline='middle';c.fillText(label,x,y);
}
function sign(c,label,x,y,w,color='#456d67'){
  rect(c,'#695c47',x-.5,y-.5,w+1,6);rect(c,color,x,y,w,5);
  rect(c,'#eedaa7',x+.5,y+.5,w-1,.35);text(c,label,x+w/2,y+2.7);
}
function bookRow(c,x,y,w,seed=0,h=4){
  for(let i=0;i<w-1;i+=2){const shade=BOOKS[(i+seed)%BOOKS.length];rect(c,shade,x+i,y+(i%3)*.3,1.5,h-(i%3)*.3);rect(c,'#f2e1bb',x+i+.15,y+h-1,1.15,.35);}
}
function plant(c,x,y,size=1){
  c.save();c.translate(x,y);c.scale(size,size);
  rect(c,'#6a5a46',-1.8,1.3,3.6,2.5);rect(c,'#bb9470',-2,1,4,1);rect(c,'#8b7651',-.35,-2,.7,3.3);
  for(const [a,b,w,h,color] of [[-3,-3,3,2,'#4f7853'],[0,-4,3,2,'#6d955e'],[-2,-6,3,3,'#91ac6c'],[-4,-1,3,2,'#75935b'],[1,-1,3,2,'#527c56']])rect(c,color,a,b,w,h);
  c.restore();
}
function base(c,f,top='#c29d70',front='#87694c'){
  const{x,y,w,h}=f;rect(c,'#3f49332b',x+.8,y+1,w,h);rect(c,'#69583f',x,y,w,h);
  rect(c,front,x+.5,y+h-3,w-1,2.5);rect(c,top,x+.5,y+.5,w-1,h-3.5);
  rect(c,'#eed7a0',x+1,y+1,w-2,.6);rect(c,'#634e39',x+1,y+h-1.2,w-2,.5);
}
function bookshelf(c,f,index){
  base(c,f,'#be9969','#806348');
  const{x,y,w,h}=f;rect(c,'#655341',x+1.3,y+1.6,w-2.6,h-4.2);
  bookRow(c,x+2,y+1.8,w-4,index,h-4.6);rect(c,'#dcc094',x+1,y+h-3,w-2,.7);
  for(let n=0;n<3;n++)rect(c,'#e5d8ba',x+3+n*8,y+h-2,3,.7);
}
function readingTable(c,f,index){
  base(c,f,'#c9ad7c','#857356');const{x,y,w,h}=f;
  for(let k=0;k<2;k++){
    const xx=x+3+k*13;rect(c,'#f5ebce',xx,y+2,6,3.5);rect(c,'#d9cdb1',xx+2.8,y+2,.35,3.5);
    rect(c,'#a6ab91',xx+.6,y+2.8,1.7,.35);rect(c,'#a6ab91',xx+3.5,y+2.8,1.8,.35);
    rect(c,'#668678',xx+7,y+2.5,1.2,1.7);rect(c,'#e1d4a7',xx+7.15,y+2.5,.9,.5);
  }
  rect(c,index%2?'#747f70':'#9b795b',x+2,y+h-2,7,1.2);rect(c,'#747f70',x+w-9,y+h-2,7,1.2);
}
function drawLibraryArt(ctx,interior,{width,height,scale=4}){
  const library=true;
  const ox=width/2-interior.cameraX*scale,oy=height/2-interior.cameraY*scale;
  ctx.save();rect(ctx,'#263f44',0,0,width,height);ctx.translate(ox,oy);ctx.scale(scale,scale);ctx.imageSmoothingEnabled=false;
  const w=interior.width,h=interior.height;
  rect(ctx,library?'#d9d0b3':'#e1d2b1',0,0,w,h);
  // Small staggered seams, scuffs and inlaid route bands make the floor readable.
  for(let y=5;y<h-5;y+=8)for(let x=5;x<w-5;x+=8){
    const n=(x*13+y*7)%11;rect(ctx,library?(n<3?'#d0c6aa':'#ded5bb'):(n<3?'#d5c6a5':'#e7d9ba'),x,y,7.6,7.6);
    rect(ctx,'#b8ad8f40',x+1,y+7.5,6.5,.3);if(n===3)rect(ctx,'#f7edd035',x+2,y+2,3,.4);
  }
  rect(ctx,library?'#6c8b7930':'#b6806330',86,5,18,h-10);
  rect(ctx,'#bba479',88,5,.4,h-10);rect(ctx,'#bba479',102,5,.4,h-10);
  rect(ctx,'#667f76',0,0,w,5);rect(ctx,'#536d68',0,0,5,h);rect(ctx,'#536d68',w-5,0,5,h);rect(ctx,'#56776e',0,h-5,w,5);
  rect(ctx,'#b8c4aa',5,4,w-10,.7);rect(ctx,'#d1c3a0',5,5,w-10,1);
  for(let x=15;x<w-20;x+=40){
    rect(ctx,'#d7e1cb',x,0,25,3.6);rect(ctx,'#86a7a0',x+.7,.6,23.6,2.3);
    rect(ctx,'#dbe7cb',x+8,.6,.5,2.3);rect(ctx,'#dbe7cb',x+16,.6,.5,2.3);
    rect(ctx,'#f7e8aa18',x+1,6,23,12);
  }
  // Wall-mounted posters and small hanging plants remain inside the wall band.
  for(const y of [35,75,112]){rect(ctx,'#c8b38a',.6,y,3.5,9);rect(ctx,'#e6d8b0',1,y+.5,2.7,8);rect(ctx,'#6e9381',1.4,y+1.3,1.8,3);rect(ctx,'#aa9871',1.4,y+5.5,1.8,.4);}
  for(const y of [18,60,102]){rect(ctx,'#b3946e',w-3.8,y+4,2.7,2);rect(ctx,'#739464',w-4.2,y,3.4,5);rect(ctx,'#a2b57d',w-3.5,y+.8,1.6,2);}
  for(let i=0;i<interior.furniture.length;i++){
    const f=interior.furniture[i],row=Math.floor(i/4),col=i%4;
    if(row===0)bookshelf(ctx,f,i);
      else if(row===1)readingTable(ctx,f,i);
      else if(col===0||col===3)bookshelf(ctx,f,i+4);
      else{readingTable(ctx,f,i);text(ctx,col===1?'借阅服务':'电子阅览',f.x+f.w/2,f.y+f.h-1.7,3.5,'#465f56');}

  }
  // These are flat floor inlays, not furniture or additional collision areas.
  text(ctx,library?'让阅读成为习惯':'书香 · 咖啡 · 校园日常',w/2,104,4,'#667c69');
  text(ctx,library?'中心图书馆':'日新生活馆',w/2,113,4.5,'#637e71');
  rect(ctx,library?'#708f7933':'#b7836030',72,h-20,46,11);rect(ctx,'#d7c5a3',74,h-18,42,.5);
  rect(ctx,'#a9b69a',w/2-9,h-5,18,5);rect(ctx,'#d6dbc0',w/2-8,h-4,16,.7);
  ctx.restore();
}

// Rixin uses the shared tile layout. All raised objects stay inside their
// authoritative footprints; the patterns below are original Canvas artwork.
const P=1/16;
const FLOOR={ceramic:'#d9d8cc',terrazzo:'#d2c9b8',parquet:'#b48d64',carpet:'#657e77',mat:'#7d8a7b'};
function tone(color,delta){
  const value=parseInt((/^#[a-f0-9]{6}$/i.test(color)?color:'#78958b').slice(1),16);
  return '#'+[16,8,0].map(shift=>Math.max(0,Math.min(255,((value>>shift)&255)+delta)).toString(16).padStart(2,'0')).join('');
}
function tileText(c,label,x,y,{size=.8,color='#3c514c',align='center',maxWidth}={}){
  c.fillStyle=color;c.font=`600 ${size}px "Noto Sans SC","Microsoft YaHei",system-ui,sans-serif`;c.textAlign=align;c.textBaseline='middle';
  if(maxWidth)c.fillText(label,x,y,maxWidth);else c.fillText(label,x,y);
}
function border(c,f,color='#4e5f5a',thickness=P){
  rect(c,color,f.x,f.y,f.w,thickness);rect(c,color,f.x,f.y+f.h-thickness,f.w,thickness);
  rect(c,color,f.x,f.y,thickness,f.h);rect(c,color,f.x+f.w-thickness,f.y,thickness,f.h);
}
function surface(c,f,color='#b7966d',edge='#725d47'){
  rect(c,edge,f.x,f.y,f.w,f.h);rect(c,color,f.x+P,f.y+P,Math.max(P,f.w-P*2),Math.max(P,f.h-P*3));
  rect(c,tone(color,27),f.x+P*2,f.y+P,f.w-P*4,P);
  rect(c,tone(edge,-7),f.x+P,f.y+f.h-P*2,f.w-P*2,P);
}
function floorPatch(c,f,view){
  const kind=String(f.material||'ceramic').toLowerCase(),color=FLOOR[kind]||FLOOR.ceramic;
  rect(c,color,f.x,f.y,f.w,f.h);
  const xa=Math.max(Math.floor(f.x),Math.floor(view.x)),ya=Math.max(Math.floor(f.y),Math.floor(view.y));
  const xb=Math.min(f.x+f.w,view.x+view.w),yb=Math.min(f.y+f.h,view.y+view.h);
  c.save();c.beginPath();c.rect(f.x,f.y,f.w,f.h);c.clip();
  for(let y=ya;y<yb;y++)for(let x=xa;x<xb;x++){
    const seed=(x*7+y*11)%13;
    if(kind==='parquet'){
      rect(c,seed%2?'#bd976d':'#ac845f',x+P,y+P,1-P,1-P);
      for(let n=1;n<4;n++)rect(c,'#98744f55',x+(y%2?n/4:0),y+(y%2?0:n/4),y%2?P:1,y%2?1:P);
      rect(c,'#d4ae7c55',x+P*2,y+P*2,.65,P);
    }else if(kind==='carpet'){
      rect(c,'#8ca09630',x+P,y+P,1-P*2,P);rect(c,'#405f5535',x+.5,y+.5,P*2,P*2);
    }else if(kind==='mat'){
      for(let k=0;k<4;k++)rect(c,'#b0b59b44',x+P,y+k/4,1-P*2,P);
    }else{
      rect(c,seed<4?tone(color,6):color,x+P,y+P,1-P,1-P);
      rect(c,'#7a84781e',x,y,1,P/2);rect(c,'#fbf7e935',x,y+1-P,1,P);
      rect(c,'#7a84781e',x,y,P/2,1);
      if(kind==='terrazzo')for(let k=0;k<4;k++)rect(c,['#f7ebd47a','#8f95874c','#b0947c5c','#d6c4a577'][k],x+((seed+k*3)%12+1)*P,y+((seed*2+k*5)%12+1)*P,P,P);
      else if(seed===3)rect(c,'#fffbed38',x+P*3,y+P*2,.5,P);
    }
  }
  c.restore();
}
function wallArt(c,f){
  const glass=f.material==='glass',horizontal=f.w>f.h;
  if(glass){
    rect(c,'#6e8f8b',f.x,f.y,f.w,f.h);rect(c,'#b7d2c788',f.x+P*2,f.y+P*2,f.w-P*4,f.h-P*4);
    border(c,f,'#617e79',P);
    const length=horizontal?f.w:f.h;
    for(let n=1;n<length;n+=2){
      if(horizontal){rect(c,'#52706a',f.x+n,f.y,P*2,f.h);rect(c,'#e8eee599',f.x+n+.4,f.y+P*2,.5,P);}
      else{rect(c,'#52706a',f.x,f.y+n,f.w,P*2);rect(c,'#e8eee599',f.x+P*2,f.y+n+.4,P,.5);}
    }
    rect(c,'#eff4e788',f.x+P,f.y+P,horizontal?f.w-P*2:P,horizontal?P:f.h-P*2);
  }else{
    rect(c,'#7b7f74',f.x,f.y,f.w,f.h);rect(c,'#bec0b1',f.x+P,f.y+P,f.w-P*2,f.h-P*2);
    rect(c,'#e5e2ce',f.x+P,f.y+P,f.w-P*2,Math.min(.3,f.h-P*2));
    rect(c,'#666d6244',f.x+P,f.y+f.h-P*2,f.w-P*2,P);
  }
}
function shelfArt(c,f,index=0){
  surface(c,f,f.color||'#ad8962','#675c4c');
  const tall=f.h>f.w,rows=Math.max(1,Math.floor((tall?f.h:f.w)/.75));
  for(let k=0;k<rows;k++){
    const n=(k+.5)/rows;
    if(tall){rect(c,'#665747',f.x+.16,f.y+n*f.h,f.w-.32,P);for(let j=0;j<3;j++)rect(c,BOOKS[(k+j+index)%BOOKS.length],f.x+.18+j*Math.max(.12,(f.w-.4)/3),f.y+n*f.h-.3,Math.max(P,(f.w-.5)/3),.28);}
    else{rect(c,'#665747',f.x+n*f.w,f.y+.16,P,f.h-.32);for(let j=0;j<3;j++)rect(c,BOOKS[(k+j+index)%BOOKS.length],f.x+n*f.w-.3,f.y+.18+j*Math.max(.12,(f.h-.4)/3),.28,Math.max(P,(f.h-.5)/3));}
  }
}
function counterArt(c,f,index=0){
  const color=f.color||'#b29c78';surface(c,f,color,'#716e59');
  const glass=/display|glass|cake|pastry|dessert|jewelry|phone-case/.test(f.kind);
  if(glass){
    rect(c,'#688982',f.x+.16,f.y+.16,f.w-.32,Math.max(.15,f.h-.42));
    rect(c,'#b7d1bcaa',f.x+.23,f.y+.23,f.w-.46,Math.max(.1,f.h-.56));
    for(let k=0;k<Math.max(1,Math.floor(f.w));k++){const xx=f.x+.35+k*.85;rect(c,/phone/.test(f.kind)?'#344f4c':BOOKS[(k+index)%BOOKS.length],xx,f.y+f.h*.42,.32,.38);rect(c,/phone/.test(f.kind)?'#9dc3ad':'#f2dfb4',xx+P,f.y+f.h*.42+P,.2,.14);}
    rect(c,'#f6f7e58a',f.x+.3,f.y+.3,Math.max(.2,f.w*.4),P);
  }else if(/tea-bar/.test(f.kind)){
    rect(c,'#697d70',f.x+.17,f.y+.17,.65,f.h-.35);rect(c,'#d0d3b4',f.x+.23,f.y+.21,.5,.18);
    for(let k=0;k<4;k++){rect(c,['#e7d7b1','#d5b294','#ead4b2','#bdd0b0'][k],f.x+1.1+k*.38,f.y+.28,.2,.38);rect(c,'#8c7760',f.x+1.1+k*.38,f.y+.25,.2,P);}
  }else if(/repair/.test(f.kind)){
    rect(c,'#668a80',f.x+.15,f.y+.15,f.w-.3,f.h-.55);
    rect(c,'#314c47',f.x+.3,f.y+.28,.7,.45);rect(c,'#b7d3bf',f.x+.38,f.y+.34,.54,.24);
    rect(c,'#e1d5b1',f.x+1.25,f.y+.3,.62,.44);rect(c,'#bb8c6d',f.x+1.4,f.y+.35,.12,.33);rect(c,'#d4c99c',f.x+2.2,f.y+.25,.25,.7);
    tileText(c,'维修',f.x+f.w/2,f.y+f.h-.25,{size:.55,color:'#f4e8ca',maxWidth:f.w-.3});
  }else{
    const k=Math.max(0,f.w-.9);rect(c,'#3a5b56',f.x+Math.min(.25,k),f.y+.2,Math.min(.65,f.w-.3),Math.min(.45,f.h-.4));
    rect(c,'#b2d2b9',f.x+Math.min(.3,k),f.y+.24,Math.min(.5,f.w-.4),Math.min(.2,f.h-.5));
    if(f.w>2){rect(c,'#f0e3c0',f.x+f.w-.8,f.y+.25,.45,.3);rect(c,'#ccad80',f.x+f.w-.7,f.y+.3,.25,P);}
  }
}
function tableArt(c,f,index=0){
  surface(c,f,f.color||'#c7aa7b','#8c7559');
  if(f.w>1.25&&f.h>1){rect(c,'#f2e7c9',f.x+.25,f.y+.25,Math.min(.7,f.w-.5),.45);rect(c,'#bfbea5',f.x+.58,f.y+.25,P,.45);}
  if(f.w>2){rect(c,'#476d61',f.x+f.w-.7,f.y+.3,.3,.3);rect(c,'#e7dac2',f.x+f.w-.65,f.y+.28,.2,.14);}
}
function chairArt(c,f){
  surface(c,f,'#8a9c82','#5b7468');
  const horizontal=f.w>=f.h,back=f.direction==='left'||f.direction==='up';
  rect(c,'#b0b697',f.x+(horizontal?P*2:(back?P*2:f.w-.25)),f.y+(horizontal?(back?P*2:f.h-.25):P*2),horizontal?f.w-P*4:.15,horizontal?.15:f.h-P*4);
}
function benchArt(c,f){
  surface(c,f,'#b59870','#686b57');
  const vertical=f.h>f.w;
  for(let k=.2;k<(vertical?f.w:f.h)-.1;k+=.22)rect(c,'#d4ba89',f.x+(vertical?k:.15),f.y+(vertical?.15:k),vertical?P:f.w-.3,vertical?f.h-.3:P);
  if(vertical)rect(c,'#5e7869',f.direction==='right'?f.x+P:f.x+f.w-.25,f.y+.1,.18,f.h-.2);
  else rect(c,'#5e7869',f.x+.1,f.y+P,f.w-.2,.18);
}
function plantArt(c,f){
  const cx=f.x+f.w/2,cy=f.y+f.h/2,s=Math.min(f.w,f.h);
  rect(c,'#82765e',cx-s*.25,f.y+f.h-s*.3,s*.5,s*.24);rect(c,'#c1a77e',cx-s*.3,f.y+f.h-s*.4,s*.6,s*.17);
  rect(c,'#6f7953',cx-P,cy,s*.12,s*.35);
  for(const [dx,dy,w,h,color] of [[-.38,-.12,.4,.25,'#6e8b5d'],[.02,-.35,.32,.3,'#779968'],[-.26,-.4,.34,.28,'#9dad75'],[-.34,.05,.3,.2,'#8d9c66'],[.04,-.02,.35,.22,'#547c56']])rect(c,color,cx+dx*s,cy+dy*s,w*s,h*s);
}
function escalatorArt(c,f){
  const x=f.x,y=f.y,w=f.w,h=f.h;
  rect(c,'#3a514f',x,y,w,h);rect(c,'#71918a',x+P,y+P,w-P*2,h-P*2);
  rect(c,'#b7c5ad',x+.38,y+.4,w-.76,h-.8);
  // Narrow treads, two glass balustrades and solid end landings form a long flight.
  for(let yy=y+.65;yy<y+h-.55;yy+=.32){rect(c,'#6b7e72',x+.38,yy,w-.76,.11);rect(c,'#e4dabc',x+.38,yy+.11,w-.76,P);}
  rect(c,'#d6e8cf99',x+.12,y+.3,.16,h-.6);rect(c,'#d6e8cf99',x+w-.28,y+.3,.16,h-.6);
  rect(c,'#2f4747',x+P,y+.18,P*2,h-.36);rect(c,'#2f4747',x+w-P*3,y+.18,P*2,h-.36);
  rect(c,'#cabd8c',x+.33,y+.2,w-.66,.2);rect(c,'#cabd8c',x+.33,y+h-.4,w-.66,.2);
  const arrowY=f.direction==='down'?y+.5:y+h-.75;
  rect(c,'#365f55',x+.45,arrowY-.22,w-.9,.6);
  const down=f.direction==='down',cy=arrowY+.08,cx=x+w/2;rect(c,'#f5e7b8',cx-P,cy-.2,P*2,.4);
  for(let k=0;k<3;k++)rect(c,'#f5e7b8',cx-P*(k+1),cy+(down?.18:-.24)+(down?-1:1)*k*P,P*2*(k+1),P);
}
function stairsArt(c,f){
  surface(c,f,'#a6ada1','#626e64');const horizontal=f.w>f.h*1.7;
  const steps=Math.max(3,Math.floor((horizontal?f.w:f.h)*2));
  for(let k=0;k<steps;k++){
    if(horizontal){const xx=f.x+.18+k*(f.w-.36)/steps;rect(c,'#66766a',xx,f.y+.25,P,f.h-.5);rect(c,'#dbdbc4',xx+P,f.y+.25,P,f.h-.5);}
    else{const yy=f.y+.18+k*(f.h-.36)/steps;rect(c,'#66766a',f.x+.25,yy,f.w-.5,P);rect(c,'#dbdbc4',f.x+.25,yy+P,f.w-.5,P);}
  }
  tileText(c,'↑',f.x+f.w/2,f.y+f.h/2,{size:1,color:'#f6efcf'});
}
function elevatorArt(c,f){
  surface(c,f,'#949e93','#536b63');rect(c,'#c8d0bd',f.x+.22,f.y+.3,f.w-.44,f.h-.55);
  rect(c,'#708278',f.x+f.w/2-P,f.y+.3,P*2,f.h-.55);rect(c,'#e0e1ca',f.x+.25,f.y+.35,P,f.h-.7);
  tileText(c,'↕',f.x+f.w/2,f.y+.17,{size:.55,color:'#f5e7b4'});
}
function applianceArt(c,f){
  const kind=f.kind;surface(c,f,/coffee|drink|tea/.test(kind)?'#918a71':'#b6c3ad','#526c62');
  const sx=f.x+.18,sy=f.y+.18,sw=f.w-.36,sh=Math.max(.15,f.h-.4);
  rect(c,'#405f59',sx,sy,sw,sh);rect(c,'#a6c7ad',sx+.08,sy+.08,Math.max(P,sw-.16),Math.max(P,sh*.5));
  for(let k=0;k<Math.min(3,Math.floor(f.w*2));k++)rect(c,BOOKS[k],sx+.12+k*.35,f.y+f.h-.35,.18,.15);
  rect(c,'#e5d6b3',f.x+f.w-.2,f.y+f.h*.6,P,.2);
}
function smallObjectArt(c,f){
  if(/trash|bin/.test(f.kind)){surface(c,f,'#688575','#405e55');rect(c,'#2f4945',f.x+.15,f.y+.15,f.w-.3,.15);}
  else if(/board|poster|menu|sign|notice/.test(f.kind)){surface(c,f,'#e6d7b4','#6f755e');for(let k=.2;k<f.h-.15;k+=.3)rect(c,k<.3?'#6a8e7a':'#a3a58a',f.x+.18,f.y+k,Math.max(P,f.w-.36),P);}
  else if(/clock/.test(f.kind)){surface(c,f,'#eee3c2','#728477');rect(c,'#5e7267',f.x+f.w/2,f.y+.2,P,f.h*.35);rect(c,'#5e7267',f.x+f.w/2,f.y+f.h/2,f.w*.25,P);}
  else surface(c,f,f.color||'#aaa88c','#64796a');
}
function clothingArt(c,f){
  const horizontal=f.w>=f.h;
  rect(c,'#636d63',f.x+.1,f.y+.1,f.w-.2,f.h-.2);
  rect(c,'#bcc5af',f.x+.18,f.y+.18,f.w-.36,f.h-.36);
  const n=Math.max(2,Math.floor((horizontal?f.w:f.h)*2));
  for(let k=0;k<n;k++){
    const p=(k+.5)/n,color=['#718b82','#b88f7a','#c9bd9d','#8093a0','#716a62'][k%5];
    if(horizontal){const x=f.x+.2+p*(f.w-.4);rect(c,color,x-.15,f.y+.3,.3,f.h-.45);rect(c,'#e5d8be',x-P,f.y+.22,P*2,.15);}
    else{const y=f.y+.2+p*(f.h-.4);rect(c,color,f.x+.3,y-.15,f.w-.45,.3);rect(c,'#e5d8be',f.x+.22,y-P,.15,P*2);}
  }
  rect(c,'#d5d3b7',f.x+.12,f.y+.12,horizontal?f.w-.24:P,horizontal?P:f.h-.24);
}
function manicureArt(c,f){
  rect(c,'#5d766c',f.x+.08,f.y+.2,.35,f.h-.35);rect(c,'#5d766c',f.x+f.w-.43,f.y+.2,.35,f.h-.35);
  surface(c,{x:f.x+.4,y:f.y+.08,w:f.w-.8,h:f.h-.16},'#cfb39e','#8b7666');
  rect(c,'#f3e8cb',f.x+.55,f.y+.26,Math.max(.3,f.w-1.1),.22);
  for(let k=0;k<3;k++)rect(c,['#bf7774','#a7af8c','#9f889b'][k],f.x+.6+k*.25,f.y+.14,.12,.15);
}
function cameraArt(c,f){
  const cx=f.x+f.w/2;
  rect(c,'#6a6d61',cx-P,f.y+f.h*.4,P*2,f.h*.5);
  rect(c,'#61675c',f.x+.12,f.y+f.h-.18,f.w-.24,P*2);
  rect(c,'#3d5652',f.x+.15,f.y+.15,f.w-.3,f.h*.4);
  rect(c,'#9eac9b',f.x+.25,f.y+.21,f.w-.5,P*2);
  rect(c,'#223e3b',cx-.12,f.y+.18,.24,.24);rect(c,'#b1c6b1',cx-P,f.y+.23,P*2,P*2);
}
function backgroundArt(c,f){
  surface(c,f,'#c4c6bb','#718176');
  rect(c,'#e3e1ce',f.x+.18,f.y+.18,f.w-.36,Math.max(.15,f.h-.36));
  for(let x=.5;x<f.w-.3;x+=.75)rect(c,'#bfc5b655',f.x+x,f.y+.18,P,f.h-.36);
}
function printerArt(c,f){
  surface(c,f,'#bac3b0','#526b61');
  rect(c,'#667f73',f.x+.15,f.y+.15,f.w-.3,f.h*.35);rect(c,'#e5e5cf',f.x+.22,f.y+.18,f.w-.44,f.h*.21);
  rect(c,'#395a50',f.x+.2,f.y+f.h*.61,f.w-.4,.12);rect(c,'#eee7ce',f.x+.28,f.y+f.h*.68,f.w-.56,.17);
}
function decorationArt(c,f){
  if(/wc|toilet|restroom/.test(f.kind)){
    rect(c,'#668e87',f.x,f.y,f.w,f.h);border(c,f,'#d6e1c8',P);tileText(c,'WC',f.x+f.w/2,f.y+f.h/2,{size:.7,color:'#f8f3d8',maxWidth:f.w-P*2});
  }else if(/exit/.test(f.kind)){
    rect(c,'#4f806e',f.x,f.y,f.w,f.h);tileText(c,'出口',f.x+f.w/2,f.y+f.h/2,{size:.65,color:'#f5ecd0',maxWidth:f.w-P*2});
  }else if(/fire|extinguisher/.test(f.kind)){
    rect(c,'#ae6959',f.x+.25,f.y+.18,f.w-.5,f.h-.25);rect(c,'#e2d2a4',f.x+.29,f.y+.45,f.w-.58,.2);rect(c,'#44574b',f.x+.25,f.y+.1,f.w-.5,P*2);
  }else if(/photo-wall/.test(f.kind)){
    surface(c,f,'#c0ad8e','#748373');for(let k=0;k<Math.floor(f.w);k++){rect(c,'#f1e7c9',f.x+.15+k,f.y+.12,.65,f.h-.24);rect(c,['#86a89c','#a99485','#97a77d'][k%3],f.x+.22+k,f.y+.2,.5,Math.max(.2,f.h-.4));rect(c,'#d3bf9b',f.x+.37+k,f.y+.3,.2,.2);}
  }else if(/mirror/.test(f.kind)){
    rect(c,'#756f5d',f.x,f.y,f.w,f.h);rect(c,'#b8cfc2',f.x+P*2,f.y+P*2,f.w-P*4,f.h-P*4);rect(c,'#e8ead589',f.x+.2,f.y+.2,Math.max(P,f.w*.4),P);
  }else smallObjectArt(c,f);
}
function objectArt(c,f,index){
  const kind=String(f.kind||'').toLowerCase().replaceAll('_','-'),item={...f,kind};
  c.save();c.beginPath();c.rect(f.x,f.y,f.w,f.h);c.clip();
  if(/escalator/.test(kind))escalatorArt(c,item);
  else if(/elevator|lift/.test(kind))elevatorArt(c,item);
  else if(/stairs|staircase|stair/.test(kind))stairsArt(c,item);
  else if(/manicure|nail/.test(kind))manicureArt(c,item);
  else if(/camera/.test(kind))cameraArt(c,item);
  else if(/backdrop|background/.test(kind))backgroundArt(c,item);
  else if(/printer|copier/.test(kind))printerArt(c,item);
  else if(/clothes|clothing|coat|garment|hanger|suit/.test(kind))clothingArt(c,item);
  else if(/shelf|shelves|bookshelf|rack/.test(kind))shelfArt(c,item,index);
  else if(/bench|sofa/.test(kind))benchArt(c,item);
  else if(/plant|flower|pot/.test(kind))plantArt(c,item);
  else if(/chair|stool/.test(kind))chairArt(c,item);
  else if(/table|desk/.test(kind))tableArt(c,item,index);
  else if(/fridge|freezer|coffee-machine|vending|appliance/.test(kind))applianceArt(c,item);
  else if(/repair|checkout|counter|bar|display|case/.test(kind))counterArt(c,item,index);
  else if(/column|pillar/.test(kind)){surface(c,item,'#c5c4b1','#727e6f');rect(c,'#e5e1cb',f.x+.15,f.y+.15,f.w-.3,P*2);}
  else decorationArt(c,item);
  c.restore();
}
function drawRixinArt(c,interior,{width,height,scale=24}){
  const layout=interior.layout;if(!layout)return;
  const view={x:interior.cameraX-width/(2*scale),y:interior.cameraY-height/(2*scale),w:width/scale,h:height/scale};
  const visible=f=>f.x+f.w>view.x&&f.x<view.x+view.w&&f.y+f.h>view.y&&f.y<view.y+view.h;
  c.save();rect(c,'#334e4c',0,0,width,height);c.translate(width/2-interior.cameraX*scale,height/2-interior.cameraY*scale);c.scale(scale,scale);c.imageSmoothingEnabled=false;
  // The blank corners of the 66 × 91 bounding box remain outside the footprint.
  c.save();c.beginPath();for(let n=0;n<layout.footprint.length;n++){const p=layout.footprint[n];if(n)c.lineTo(p[0],p[1]);else c.moveTo(p[0],p[1]);}c.closePath();c.clip();
  floorPatch(c,{x:0,y:0,w:layout.width,h:layout.height,material:'ceramic'},view);
  for(const floor of layout.floors||[])if(visible(floor))floorPatch(c,floor,view);
  // These discreet use labels explain each shop without introducing a brand.
  for(const room of layout.rooms||[])if(visible(room)&&room.label){
    const labelWidth=Math.min(room.w-1,Math.max(2,room.label.length*.8)),x=room.x+room.w/2;
    const y=[room.y+room.h-.8,room.y+.8,room.y+room.h/2].find(y=>!layout.objects.some(f=>f.x+f.w>x-labelWidth/2&&f.x<x+labelWidth/2&&f.y+f.h>y-.5&&f.y<y+.5));
    if(y!==undefined)tileText(c,room.label,x,y,{size:.8,color:'#4d675d',maxWidth:labelWidth});
  }
  c.restore();
  for(const wall of layout.walls||[])if(visible(wall))wallArt(c,wall);
  // Door thresholds are paint/inlay only, and come from the same door openings.
  for(const door of layout.doors||[])if(visible(door)){
    const horizontal=door.w>=door.h;rect(c,'#b2af9255',door.x,door.y,door.w,door.h);
    if(horizontal)rect(c,'#e3ddc1',door.x,door.y+door.h-P,door.w,P);else rect(c,'#e3ddc1',door.x+door.w-P,door.y,P,door.h);
  }
  for(let i=0;i<layout.objects.length;i++){const item=layout.objects[i];if(visible(item))objectArt(c,item,i);}
  c.restore();
}

// The interior art is static. Cache one 16 px/tile bitmap for the layout so
// walking redraws a single image rather than thousands of floor fragments.
const interiorTextures=new WeakMap();
function drawCachedRixinArt(ctx,interior,options){
  const layout=interior.layout;
  if(!interiorTextures.has(layout)){
    let canvas=null;
    if(typeof OffscreenCanvas==='function')canvas=new OffscreenCanvas(layout.width*16,layout.height*16);
    else if(typeof document!=='undefined'){canvas=document.createElement('canvas');canvas.width=layout.width*16;canvas.height=layout.height*16;}
    if(canvas){const texture=canvas.getContext('2d');if(texture)drawRixinArt(texture,{...interior,cameraX:layout.width/2,cameraY:layout.height/2},{width:canvas.width,height:canvas.height,scale:16});else canvas=null;}
    interiorTextures.set(layout,canvas);
  }
  const canvas=interiorTextures.get(layout);
  if(!canvas){drawRixinArt(ctx,interior,options);return;}
  const {width,height,scale=24}=options;
  ctx.save();rect(ctx,'#334e4c',0,0,width,height);ctx.imageSmoothingEnabled=false;
  ctx.drawImage(canvas,width/2-interior.cameraX*scale,height/2-interior.cameraY*scale,layout.width*scale,layout.height*scale);ctx.restore();
}

export function drawInteriorArt(ctx,interior,options){
  if(interior.layout?.id==='way/1473779965')drawCachedRixinArt(ctx,interior,options);
  else drawLibraryArt(ctx,interior,options);
}
