import type * as Three from 'three';
import type {HubModule,ModuleCategory} from './catalog';

type ThreeRuntime=typeof import('three');
export const cozyObjectLabels:Record<string,string>={radar:'窗边的星象仪',research:'桌上的研究手稿',book:'墙上的架构图',idea:'灵感画架',evolve:'演进齿轮',code:'开发工作台',lamp:'沙发旁的晚灯',home:'门边的钥匙架',wind:'云端风景画',sparkles:'精灵玻璃花园',game:'复古街机',swords:'战争沙盘',mail:'书架上的邮船',moon:'山水卷轴',flag:'三国将旗'};
export const cozyRoomDescriptions:Record<ModuleCategory,string>={research:'在书页与星光之间，让好奇慢慢展开。',product:'桌上有工具，墙上有想法，作品从这里开始。',life:'亮一盏灯，收好钥匙，让日常有个归处。',games:'把喜欢的世界，珍藏成一间冒险收藏室。'};
export type CozyRoom={group:Three.Group;pickables:Three.Object3D[];items:Map<string,Three.Group>;highlights:Map<string,Three.Object3D>;focus:Map<string,Three.Vector3>};

/** A real dollhouse interior. Every supplied catalog module gets one raycast target. */
export function createCozyRoom(T:ThreeRuntime,category:ModuleCategory,modules:readonly HubModule[]):CozyRoom {
  const group=new T.Group();
  const pickables:Three.Object3D[]=[],items=new Map<string,Three.Group>(),highlights=new Map<string,Three.Object3D>(),focus=new Map<string,Three.Vector3>();
  const mat=(color:string,roughness=.82)=>new T.MeshStandardMaterial({color,roughness});
  const oak=mat('#b38759'),oakLight=mat('#d4b07a'),walnut=mat('#74523d'),cream=mat('#efe2c7'),sage=mat('#8a9b73'),forest=mat('#526a54'),gold=mat('#c59b53',.5),clay=mat('#c78f75'),ink=mat('#455b60'),paper=mat('#fbefd3'),foliage=mat('#789865');
  const glow=new T.MeshStandardMaterial({color:'#ffe6ad',emissive:'#ffc978',emissiveIntensity:.6,roughness:.65});
  const roomColors={research:['#dadfc6','#849676'],product:['#e6d3b4','#b88a64'],life:['#e7d5c5','#b3927c'],games:['#d7dfd1','#799991']}[category];
  const wall=mat(roomColors[0]),panel=mat(roomColors[1]);
  const mesh=(geometry:Three.BufferGeometry,material:Three.Material,parent:Three.Object3D,x=0,y=0,z=0)=>{const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
  const box=(w:number,h:number,d:number,m:Three.Material,p:Three.Object3D,x=0,y=0,z=0)=>mesh(new T.BoxGeometry(w,h,d),m,p,x,y,z);
  const sphere=(r:number,m:Three.Material,p:Three.Object3D,x=0,y=0,z=0)=>mesh(new T.SphereGeometry(r,14,10),m,p,x,y,z);
  const cyl=(a:number,b:number,h:number,m:Three.Material,p:Three.Object3D,x=0,y=0,z=0,n=24)=>mesh(new T.CylinderGeometry(a,b,h,n),m,p,x,y,z);
  const beam=(a:Three.Vector3,b:Three.Vector3,r:number,m:Three.Material,p:Three.Object3D)=>{const delta=b.clone().sub(a);const o=cyl(r,r,delta.length(),m,p);o.position.copy(a.clone().add(b).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return o;};
  const pot=(p:Three.Object3D,x:number,z:number,s=1)=>{const g=new T.Group();g.position.set(x,0,z);g.scale.setScalar(s);p.add(g);cyl(.24,.18,.35,clay,g,0,.19,0);cyl(.25,.25,.07,oakLight,g,0,.37,0);for(let i=0;i<5;i++){const a=i*2.4;beam(new T.Vector3(0,.3,0),new T.Vector3(Math.sin(a)*.28,.9+i*.07,Math.cos(a)*.22),.012,forest,g);const leaf=sphere(.21,foliage,g,Math.sin(a)*.28,.88+i*.07,Math.cos(a)*.22);leaf.scale.set(.65,1,.35);leaf.rotation.z=Math.sin(a)*.6;}};
  const desk=(x:number,z:number,w=2.25,d=1.15)=>{const g=new T.Group();g.position.set(x,0,z);group.add(g);box(w,.12,d,oakLight,g,0,.9,0);for(const sx of [-1,1])for(const sz of [-1,1])box(.1,.86,.1,walnut,g,sx*(w/2-.16),.44,sz*(d/2-.12));box(w-.2,.19,.06,oak,g,0,.75,-d/2+.09);return g;};
  const chair=(x:number,z:number,rotation=0)=>{const g=new T.Group();g.position.set(x,0,z);g.rotation.y=rotation;group.add(g);box(.67,.12,.62,oakLight,g,0,.52,0);box(.68,.5,.08,sage,g,0,.91,-.28);for(const sx of [-1,1])for(const sz of [-1,1])box(.065,.5,.065,walnut,g,sx*.25,.25,sz*.22);};
  const book=(p:Three.Object3D,x:number,y:number,z:number,w=.18,h=.5,color=forest)=>{box(w,h,.35,color,p,x,y,z);box(w-.035,h-.06,.36,paper,p,x,y,z+.018);box(w+.01,.035,.38,color,p,x,y+h/2,z);box(w+.01,.035,.38,color,p,x,y-h/2,z);};
  const shelf=(x:number,z:number,w=2.1)=>{const g=new T.Group();g.position.set(x,0,z);group.add(g);box(w,2.65,.13,oak,g,0,1.34,-.18);for(const sx of [-1,1])box(.1,2.75,.48,walnut,g,sx*w/2,1.38,0);for(let j=0;j<4;j++){const y=.18+j*.78;box(w,.07,.5,oakLight,g,0,y,0);for(let i=0;i<Math.floor(w/.27)-1;i++){const h=.36+(i%3)*.07;const b=new T.Group();g.add(b);book(b,-w/2+.23+i*.24,y+h/2+.04,.03,.17,h,[forest,clay,ink,oakLight][(i+j)%4]);b.rotation.z=i===2?.08:0;}}};
  const rug=(x:number,z:number,w:number,d:number)=>{box(w,.02,d,cream,group,x,.04,z);box(w-.16,.025,d-.16,panel,group,x,.05,z);box(w-.31,.028,d-.31,cream,group,x,.055,z);for(let i=0;i<Math.floor(w/.18);i++){box(.045,.018,.13,cream,group,x-w/2+.1+i*.18,.04,z+d/2+.05);box(.045,.018,.13,cream,group,x-w/2+.1+i*.18,.04,z-d/2-.05);}};
  // Volume, joinery, boards, wainscot and an open roof edge make the room readable as a model.
  box(9.3,.36,7.3,walnut,group,0,-.2,0);box(9.38,.1,7.38,oakLight,group,0,-.39,0);
  for(let row=0;row<15;row++)for(let col=0;col<4;col++){const w=2.25,x=-3.375+col*w;box(w-.018,.05,.46,(row+col)%4===0?oak:oakLight,group,x,.005,-3.27+row*.466);}
  box(9.2,3.45,.18,wall,group,0,1.7,-3.55);box(.18,3.45,7.1,wall,group,-4.55,1.7,0);
  box(9.25,.8,.09,panel,group,0,.4,-3.42);box(.09,.8,7.12,panel,group,-4.42,.4,0);
  for(let i=0;i<13;i++)box(.045,.76,.045,oakLight,group,-4.3+i*.7,.41,-3.35);
  for(let i=0;i<10;i++)box(.045,.76,.045,oakLight,group,-4.35,.41,-3.25+i*.7);
  box(9.25,.07,.14,oakLight,group,0,.83,-3.36);box(.14,.07,7.1,oakLight,group,-4.36,.83,0);
  box(9.35,.18,.28,walnut,group,0,3.45,-3.5);box(.28,.18,7.2,walnut,group,-4.5,3.45,0);box(9.2,.13,.18,oakLight,group,0,.1,-3.39);box(.18,.13,7.1,oakLight,group,-4.39,.1,0);
  for(const [x,z] of [[-4.43,-3.4],[-4.43,3.43],[4.45,-3.4]])box(.17,3.5,.17,oak,group,x,1.73,z);
  // Window inset with divided panes, sill, curtain folds and outdoor greenery.
  const windowGroup=new T.Group();windowGroup.position.set(-4.39,1.95,.35);windowGroup.rotation.y=Math.PI/2;group.add(windowGroup);
  box(2.3,1.85,.12,walnut,windowGroup);const sky=mat('#d1e4d1');box(2.12,1.68,.14,sky,windowGroup,0,0,.04);box(.06,1.7,.06,cream,windowGroup,0,0,.15);box(2.15,.06,.06,cream,windowGroup,0,0,.15);box(2.5,.12,.4,oakLight,windowGroup,0,-.98,.08);cyl(.04,.04,2.65,walnut,windowGroup,0,1.07,.18).rotation.z=Math.PI/2;
  for(const side of [-1,1])for(let i=0;i<4;i++){const curtain=cyl(.075,.09,1.96,cream,windowGroup,side*(1.02+i*.1),-.02,.22,12);curtain.scale.z=.65;}
  for(let i=0;i<3;i++){const leaf=sphere(.28,foliage,windowGroup,-.8+i*.65,-.52,.13);leaf.scale.set(.9,.7,.15);}
  const sunPatch=new T.MeshBasicMaterial({color:'#ffeab3',transparent:true,opacity:.14,depthWrite:false});const patch=box(2.2,.004,2.3,sunPatch,group,-2.6,.045,.9);patch.rotation.y=-.35;patch.castShadow=false;
  // A roof truss and suspended lamp provide height without hiding the room.
  beam(new T.Vector3(-4.4,3.53,-3.45),new T.Vector3(0,4.15,-3.45),.07,oak,group);beam(new T.Vector3(0,4.15,-3.45),new T.Vector3(4.4,3.53,-3.45),.07,oak,group);
  cyl(.014,.014,.65,walnut,group,.4,3.55,-.3,8);cyl(.16,.42,.28,cream,group,.4,3.11,-.3);cyl(.31,.31,.025,glow,group,.4,2.97,-.3);const lampLight=new T.PointLight('#ffdb9a',3.2,8,2);lampLight.position.set(.4,2.85,-.3);group.add(lampLight);
  pot(group,3.85,-2.7,1.05);pot(group,-3.8,2.7,.85);

  // Each illustrated surface is an original in-browser canvas texture, framed in 3D.
  const artwork=(module:HubModule)=>{const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;const ctx=canvas.getContext('2d');if(!ctx)return new T.CanvasTexture(canvas);
    const palettes:Record<string,string[]>={wind:['#b8d3cf','#f6e8bc','#6a9090'],moon:['#292f4b','#c8d5da','#e4d8ad'],book:['#eee4cc','#718573','#42635d'],flag:['#eee0bd','#a56e54','#5d7253']};const colors=palettes[module.icon]||['#e6dcc2',module.color,'#fff6dc'];ctx.fillStyle=colors[0];ctx.fillRect(0,0,640,480);
    if(module.icon==='book'||module.icon==='idea'){ctx.strokeStyle=colors[1];ctx.lineWidth=8;for(let i=0;i<4;i++){const x=95+i%2*285,y=90+Math.floor(i/2)*180;ctx.fillStyle=i===0?colors[1]:colors[2];ctx.fillRect(x,y,160,95);ctx.strokeRect(x,y,160,95);}ctx.beginPath();ctx.moveTo(255,138);ctx.lineTo(380,138);ctx.moveTo(175,185);ctx.lineTo(175,270);ctx.moveTo(460,185);ctx.lineTo(460,270);ctx.stroke();}
    else {ctx.fillStyle=colors[2];ctx.beginPath();ctx.arc(475,100,48,0,Math.PI*2);ctx.fill();for(let layer=0;layer<4;layer++){ctx.fillStyle=layer%2?colors[1]:colors[2];ctx.globalAlpha=.35+layer*.16;ctx.beginPath();ctx.moveTo(0,480);for(let x=0;x<=640;x+=40){const y=240+layer*45-Math.sin(x*.013+layer)*65-Math.cos(x*.021+layer)*28;ctx.lineTo(x,y);}ctx.lineTo(640,480);ctx.fill();}ctx.globalAlpha=1;}
    ctx.fillStyle=module.icon==='moon'?'#f3ecd4':'#4e5c4b';ctx.font='600 27px sans-serif';ctx.textAlign='left';ctx.fillText(module.name,35,445,570);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;return texture;};
  const picture=(p:Three.Object3D,module:HubModule,w=1.65,h=1.3)=>{box(w+.14,h+.14,.11,walnut,p);box(w+.045,h+.045,.13,gold,p,0,0,.018);box(w,h,.14,paper,p,0,0,.035);const tex=artwork(module);const material=new T.MeshStandardMaterial({map:tex,roughness:.94});mesh(new T.PlaneGeometry(w-.14,h-.14),material,p,0,0,.112);};
  const item=(module:HubModule,x:number,y:number,z:number)=>{const g=new T.Group();g.position.set(x,y,z);group.add(g);items.set(module.id,g);focus.set(module.id,new T.Vector3(x,y+.4,z));return g;};
  const finish=(module:HubModule,g:Three.Group,_r=.72)=>{void _r;g.traverse(o=>{if(o instanceof T.Mesh){o.userData.moduleId=module.id;pickables.push(o);}});g.updateWorldMatrix(true,true);const bounds=new T.Box3().setFromObject(g);const size=bounds.getSize(new T.Vector3()).addScalar(.09);const center=bounds.getCenter(new T.Vector3());g.worldToLocal(center);const outlineBox=new T.BoxGeometry(size.x,size.y,size.z);const edges=new T.EdgesGeometry(outlineBox);outlineBox.dispose();const outline=new T.LineSegments(edges,new T.LineBasicMaterial({color:'#c59946',transparent:true,opacity:.9}));outline.position.copy(center);outline.visible=false;g.add(outline);highlights.set(module.id,outline);};
  const displayStand=(g:Three.Group,w=.8,h=.7,d=.65)=>{box(w,h,d,cream,g,0,h/2,0);box(w+.12,.07,d+.12,oakLight,g,0,h+.03,0);box(w+.06,.07,d+.06,walnut,g,0,.04,0);};
  const toyBoat=(g:Three.Group,y:number)=>{const hull=mesh(new T.SphereGeometry(1,16,10),oak,g,0,y,0);hull.scale.set(.67,.18,.25);box(1,.04,.35,oakLight,g,0,y+.12,0);cyl(.024,.024,.95,walnut,g,0,y+.6,0,8);const sail=new T.Shape();sail.moveTo(.04,.02);sail.lineTo(.04,.88);sail.lineTo(.56,.13);sail.closePath();const sailmat=new T.MeshStandardMaterial({color:'#f1e6c8',side:T.DoubleSide});mesh(new T.ShapeGeometry(sail),sailmat,g,0,y+.16,0);};

  const supportedIcons:Record<ModuleCategory,readonly string[]>={research:['radar','research','book'],product:['idea','evolve','code'],life:['lamp','home'],games:['wind','sparkles','game','swords','mail','moon','flag']};
  const seenIcons=new Set<string>();let extras=0;
  const isExtra=(module:HubModule)=>{if(supportedIcons[category].includes(module.icon)&&!seenIcons.has(module.icon)){seenIcons.add(module.icon);return false;}const index=extras++;const g=item(module,-3.1+(index%4)*2.05,0,2.6-Math.floor(index/4)*1.4);displayStand(g,.9,.85,.55);const frame=new T.Group();frame.position.set(0,1.48,0);g.add(frame);picture(frame,module,1.2,.95);finish(module,g,.7);return true;};
  if(category==='research'){
    rug(.2,1,5.3,3.2);shelf(2.95,-3.05,2.1);desk(-2,.15,2.55,1.25);desk(.6,1.35,2.55,1.25);chair(-2,1.13);chair(.6,2.35);
    modules.forEach((module,index)=>{if(isExtra(module))return;let g:Three.Group;
      if(module.icon==='radar'){g=item(module,-2,.98,.15);cyl(.42,.5,.12,walnut,g,0,.06,0);cyl(.045,.06,.3,gold,g,0,.25,0);const orb=sphere(.4,ink,g,0,.7,0);orb.rotation.z=.3;const torus=mesh(new T.TorusGeometry(.5,.025,8,40),gold,g,0,.7,0);torus.rotation.set(.4,.2,.4);const second=mesh(new T.TorusGeometry(.43,.014,8,40),oakLight,g,0,.7,0);second.rotation.x=Math.PI/2;for(let i=0;i<5;i++)sphere(.025,gold,g,Math.sin(i*2.4)*.34,.7+Math.cos(i*2.4)*.25,.23);finish(module,g,.65);}
      else if(module.icon==='research'){g=item(module,.6,.98,1.35);for(const side of [-1,1]){const half=box(.62,.055,.83,paper,g,side*.3,.06,0);half.rotation.z=-side*.08;const cover=box(.66,.035,.88,forest,g,side*.3,.025,0);cover.rotation.z=-side*.08;for(let j=0;j<5;j++)box(.42,.005,.012,oak,g,side*.31,.096,-.26+j*.12);}box(.02,.02,.76,clay,g,.23,.11,0);cyl(.09,.07,.18,ink,g,.8,.1,.25,16);finish(module,g,.8);}
      else {g=item(module,-.5,2.05,-3.32);picture(g,module,2.1,1.45);finish(module,g,1.1);}
      void index;
    });
    pot(group,3.55,1.8,.72);
  } else if(category==='product'){
    rug(.4,1.2,4.5,3);desk(2,.45,2.7,1.3);chair(2,1.6);box(2.6,.13,.5,oakLight,group,1.6,1.8,-3.15);for(let i=0;i<6;i++)book(group,.65+i*.27,2.08,-3.14,.17,.42,[forest,clay,ink][i%3]);
    modules.forEach(module=>{if(isExtra(module))return;let g:Three.Group;
      if(module.icon==='idea'){g=item(module,-2.35,0,.15);beam(new T.Vector3(-.48,.05,.22),new T.Vector3(0,2.52,0),.045,walnut,g);beam(new T.Vector3(.48,.05,.22),new T.Vector3(0,2.52,0),.045,walnut,g);beam(new T.Vector3(0,.05,-.5),new T.Vector3(0,2.2,0),.045,walnut,g);const frame=new T.Group();frame.position.set(0,1.65,.1);g.add(frame);picture(frame,module,1.4,1.2);box(1.55,.08,.22,oakLight,g,0,.99,.17);finish(module,g,.8);}
      else if(module.icon==='evolve'){g=item(module,-.4,0,-1.15);displayStand(g,.85,.85,.8);for(let i=0;i<3;i++){const gear=new T.Group();gear.position.set((i-1)*.32,1.15+i*.27,0);g.add(gear);const ring=mesh(new T.TorusGeometry(.28,.07,8,24),i===1?gold:forest,gear);for(let j=0;j<10;j++){const a=j/10*Math.PI*2;const tooth=box(.1,.13,.12,i===1?gold:forest,gear,Math.sin(a)*.33,Math.cos(a)*.33,0);tooth.rotation.z=-a;}cyl(.05,.05,.2,walnut,gear).rotation.x=Math.PI/2;ring.rotation.z=i*.3;}finish(module,g,.75);}
      else {g=item(module,2,.99,.45);box(1.6,.95,.12,ink,g,0,.65,-.2);box(1.45,.79,.025,forest,g,0,.66,-.125);for(let i=0;i<5;i++){box(.65+i%2*.4,.025,.008,i%2?oakLight:cream,g,-.2+i%2*.1,.9-i*.13,-.108);}box(.13,.4,.13,walnut,g,0,.23,-.2);box(.55,.055,.38,ink,g,0,.03,-.2);box(.95,.04,.32,cream,g,0,.025,.4);for(let i=0;i<8;i++)box(.07,.015,.22,oakLight,g,-.35+i*.1,.055,.4);finish(module,g,1);}
    });
    pot(group,-3.9,-2.7,.9);for(let i=0;i<3;i++)cyl(.13,.11,.3,[clay,forest,ink][i],group,-3.2+i*.3,.2,-2.6);
  } else if(category==='life'){
    rug(.2,1,5.2,3.5);const sofa=new T.Group();sofa.position.set(-.75,0,-1.75);group.add(sofa);box(3.7,.45,1.25,panel,sofa,0,.52,0);box(3.8,.78,.28,panel,sofa,0,1.02,-.55);for(const x of [-1.85,1.85])box(.25,.65,1.3,panel,sofa,x,.75,0);for(const x of [-1.1,0,1.1])box(1.03,.2,1.05,cream,sofa,x,.83,.07);for(const x of [-1.3,1.3]){const pillow=box(.59,.59,.2,x<0?forest:clay,sofa,x,1.16,-.3);pillow.rotation.z=x*.12;}for(const x of [-1.55,1.55])for(const z of [-.45,.45])cyl(.04,.05,.3,walnut,sofa,x,.16,z,8);
    const coffee=desk(.25,1,1.9,.95);coffee.scale.y=.55;box(.5,.05,.36,forest,coffee,-.2,1,0);cyl(.09,.075,.14,paper,coffee,.45,1.03,.03,16);chair(2.75,.1,.5);shelf(3.25,-3.07,1.4);
    modules.forEach(module=>{if(isExtra(module))return;let g:Three.Group;if(module.icon==='lamp'){g=item(module,-3.2,0,-1.05);cyl(.35,.4,.08,walnut,g,0,.04,0);cyl(.035,.055,1.75,gold,g,0,.92,0);cyl(.28,.53,.5,paper,g,0,1.87,0);cyl(.46,.46,.02,glow,g,0,1.61,0);const light=new T.PointLight('#ffd291',2.5,4,2);light.position.set(0,1.55,0);g.add(light);finish(module,g,.65);}else{g=item(module,.8,2.1,-3.3);box(1.5,.8,.14,oakLight,g);box(1.35,.65,.16,cream,g,0,0,.02);for(let i=0;i<3;i++){sphere(.045,gold,g,-.45+i*.45,.15,.16);const torus=mesh(new T.TorusGeometry(.09,.022,8,20),gold,g,-.45+i*.45,.01,.2);box(.045,.24,.04,gold,g,-.45+i*.45,-.16,.2);box(.11,.035,.04,gold,g,-.41+i*.45,-.25,.2);void torus;}box(.18,.18,.035,forest,g,.5,-.28,.2);finish(module,g,.9);}});
  } else {
    rug(0,.7,5.6,4.1);box(2.2,.11,.6,oakLight,group,-2.55,1.65,-3.14);desk(-2.5,1.25,1.75,1.15);desk(.15,.9,2.15,1.65);chair(.1,2.32);shelf(-3.8,-2.75,1.15);
    modules.forEach(module=>{if(isExtra(module))return;let g:Three.Group;
      if(module.icon==='wind'){g=item(module,-1.2,2.55,-3.32);picture(g,module,1.55,1.05);finish(module,g,.9);}
      else if(module.icon==='sparkles'){g=item(module,-2.5,.98,1.25);box(1.14,.12,.85,walnut,g,0,.06,0);box(1.02,.04,.75,forest,g,0,.14,0);const terrarium=new T.MeshStandardMaterial({color:'#cde4cf',transparent:true,opacity:.14,roughness:.15,depthWrite:false});box(1.08,.9,.8,terrarium,g,0,.6,0);for(const x of [-.54,.54])for(const z of [-.4,.4])box(.025,.94,.025,gold,g,x,.59,z);for(const z of [-.4,.4])box(1.1,.025,.025,gold,g,0,1.06,z);const creature=sphere(.22,sage,g,0,.42,0);creature.scale.y=1.2;sphere(.05,ink,g,-.09,.52,.17);sphere(.05,ink,g,.09,.52,.17);for(const x of [-.14,.14]){const ear=mesh(new T.ConeGeometry(.08,.24,8),sage,g,x,.74,0);ear.rotation.z=-x*2;}for(const x of [-.35,.35]){sphere(.12,foliage,g,x,.24,-.1);sphere(.065,clay,g,x,.35,-.1);}finish(module,g,.85);}
      else if(module.icon==='game'){g=item(module,2.85,0,1.35);box(.9,1.4,.8,clay,g,0,.72,0);box(1,.2,.9,walnut,g,0,1.48,0);box(.9,1,.25,ink,g,0,1.91,-.28);box(.72,.61,.035,forest,g,0,1.91,-.135);for(let i=0;i<5;i++)box(.07,.07,.02,i%2?gold:cream,g,-.24+i*.12,1.81+(i%2)*.2,-.11);box(1.04,.22,.35,gold,g,0,2.48,-.24);box(.9,.12,.48,walnut,g,0,1.37,.28);cyl(.025,.025,.2,ink,g,-.18,1.53,.34,8);sphere(.075,clay,g,-.18,1.66,.34);for(let i=0;i<2;i++)cyl(.055,.055,.035,i?gold:sage,g,.1+i*.17,1.45,.36,12);finish(module,g,.82);}
      else if(module.icon==='swords'){g=item(module,.15,.98,.9);box(1.85,.09,1.38,walnut,g,0,.04,0);box(1.68,.04,1.22,sage,g,0,.11,0);for(let i=0;i<5;i++){const hill=sphere(.22,forest,g,-.6+i*.27,.16,Math.sin(i*2)*.35);hill.scale.y=.35;}for(const side of [-1,1])for(let i=0;i<3;i++){cyl(.06,.1,.1,side<0?cream:clay,g,-.5+i*.5,.2,side*.39,8);mesh(new T.ConeGeometry(.09,.22,8),side<0?cream:clay,g,-.5+i*.5,.35,side*.39);}finish(module,g,1.15);}
      else if(module.icon==='mail'){g=item(module,-2.6,1.72,-3.02);toyBoat(g,.2);finish(module,g,.8);}
      else if(module.icon==='moon'){g=item(module,1.1,2.2,-3.3);picture(g,module,1.35,1.8);for(const y of [-.98,.98]){const roller=cyl(.06,.06,1.65,walnut,g,0,y,.02);roller.rotation.z=Math.PI/2;}finish(module,g,1);}
      else if(module.icon==='flag'){g=item(module,3.1,0,-1.55);box(.95,.1,.8,walnut,g,0,.07,0);for(const x of [-.34,.34]){cyl(.025,.025,2.25,gold,g,x,1.2,0,8);mesh(new T.ConeGeometry(.075,.18,8),gold,g,x,2.41,0);}box(.73,1.35,.05,clay,g,0,1.6,0);box(.13,.8,.07,gold,g,0,1.63,.04);box(.45,.11,.07,gold,g,0,1.8,.04);box(.45,.11,.07,gold,g,0,1.48,.04);finish(module,g,.7);}
      else {g=item(module,0,2.2,-3.3);picture(g,module);finish(module,g);}
    });
  }
  return {group,pickables,items,highlights,focus};
}
