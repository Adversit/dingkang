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
function counter(c,f,label,kind,index){
  const{x,y,w,h}=f;base(c,f,kind==='coffee'?'#b59073':'#aac0a6',kind==='snacks'?'#a27159':'#657e70');
  // A raised shop fascia stays within the existing solid footprint.
  sign(c,label,x+1,y+1,w-2,kind==='coffee'?'#775a4d':kind==='snacks'?'#a46d5e':'#456f73');
  if(kind==='books')bookRow(c,x+2,y+7,w-4,index,Math.max(2,h-11));
  else if(kind==='coffee'){
    rect(c,'#444e4b',x+3,y+7,6,4);rect(c,'#9bada4',x+3.5,y+7.5,5,1.5);rect(c,'#e7d7b3',x+4,y+10,1.6,1.5);rect(c,'#e7d7b3',x+7,y+10,1.6,1.5);
    for(let k=0;k<3;k++){rect(c,'#f3dfb7',x+12+k*3,y+8.5,1.7,2.5);rect(c,'#71523d',x+12+k*3,y+8.5,1.7,.6);}
  }else{
    for(let k=0;k<7;k++){rect(c,BOOKS[(k+index)%BOOKS.length],x+2+k*3,y+7+(k%2),2,4);rect(c,'#f4dfa8',x+2.3+k*3,y+8+(k%2),1.3,1.3);}
  }
}
function bench(c,f,index){
  const{x,y,w,h}=f;base(c,f,'#b69a70','#7e7057');
  rect(c,'#748b79',x+1,y+2,w-2,2.5);rect(c,'#b9ba91',x+1.5,y+2.4,w-3,.5);
  rect(c,'#dac89d',x+2,y+6,w-4,4);for(let k=0;k<4;k++)rect(c,'#ae9570',x+3+k*5,y+6,.5,4);
  plant(c,x+(index%2?20:5),y+8,.7);rect(c,'#e9d6ad',x+10,y+7,4,2);rect(c,'#57796c',x+10,y+7,4,.5);
}

export function drawInteriorArt(ctx,interior,{width,height,scale=4}){
  const library=/图书馆/.test(interior.building?.name||'');
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
    if(library){
      if(row===0)bookshelf(ctx,f,i);
      else if(row===1)readingTable(ctx,f,i);
      else if(col===0||col===3)bookshelf(ctx,f,i+4);
      else{readingTable(ctx,f,i);text(ctx,col===1?'借阅服务':'电子阅览',f.x+f.w/2,f.y+f.h-1.7,3.5,'#465f56');}
    }else if(row===0)counter(ctx,f,['校园书店','新书上架','文创小铺','日新小卖部'][col],col<2?'books':'snacks',i);
    else if(row===1)counter(ctx,f,['日新咖啡','暖心热饮','零食补给','校园生活'][col],col<2?'coffee':'snacks',i);
    else bench(ctx,f,i);
  }
  // These are flat floor inlays, not furniture or additional collision areas.
  text(ctx,library?'让阅读成为习惯':'书香 · 咖啡 · 校园日常',w/2,104,4,'#667c69');
  text(ctx,library?'中心图书馆':'日新生活馆',w/2,113,4.5,'#637e71');
  rect(ctx,library?'#708f7933':'#b7836030',72,h-20,46,11);rect(ctx,'#d7c5a3',74,h-18,42,.5);
  rect(ctx,'#a9b69a',w/2-9,h-5,18,5);rect(ctx,'#d6dbc0',w/2-8,h-4,16,.7);
  ctx.restore();
}
