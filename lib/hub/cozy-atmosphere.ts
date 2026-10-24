import type * as Three from 'three';
import {COZY_ART_ASPECT,cozyWaterAreas,cozyWaterExclusions,type ArtPolygon} from './cozy-world';
type Runtime=typeof import('three');
const vertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;

export function createWaterMask(T:Runtime):Three.CanvasTexture {
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=576;const ctx=canvas.getContext('2d');
  if(ctx){ctx.scale(1024/1672,576/941);ctx.fillStyle='#000';ctx.fillRect(0,0,1672,941);const paint=(polygon:ArtPolygon,color:string)=>{ctx.beginPath();polygon.forEach(([x,y],i)=>i?ctx.lineTo(x*1672,y*941):ctx.moveTo(x*1672,y*941));ctx.closePath();ctx.fillStyle=color;ctx.fill();};ctx.filter='blur(3px)';cozyWaterAreas.forEach(p=>paint(p,'#fff'));ctx.filter='blur(5px)';cozyWaterExclusions.forEach(p=>paint(p,'#000'));}
  const texture=new T.CanvasTexture(canvas);texture.generateMipmaps=false;texture.minFilter=T.LinearFilter;return texture;
}
export function createArtMaterial(T:Runtime,texture:Three.Texture,mask:Three.Texture,lights:readonly(readonly[number,number,number])[],room=false):Three.ShaderMaterial {
  const lightArray=Array.from({length:16},(_,i)=>new T.Vector3(...(lights[i]||[-2,-2,.001])));
  return new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uArt:{value:texture},uWater:{value:mask},uTime:{value:0},uOpacity:{value:1},uMotion:{value:1},uRoom:{value:room?1:0},uLights:{value:lightArray}},vertexShader:vertex,fragmentShader:`
    varying vec2 vUv;uniform sampler2D uArt,uWater;uniform float uTime,uOpacity,uMotion,uRoom;uniform vec3 uLights[16];
    void main(){
      vec2 uv=vUv;float water=texture2D(uWater,uv).r*(1.-uRoom);
      if(uRoom<.5){vec2 flow=vec2(sin(uv.y*155.+uTime*.6)+sin(uv.x*119.-uTime*.28),cos(uv.x*130.+uv.y*50.-uTime*.5));
      uv+=flow*.00042*water*uMotion;
      vec3 initial=texture2D(uArt,uv).rgb;
      vec2 p0=vec2(vUv.x,1.-vUv.y);float leaves=0.;
      leaves+=exp(-dot((p0-vec2(.418,.39))*vec2(22.,16.),(p0-vec2(.418,.39))*vec2(22.,16.)));
      leaves+=exp(-dot((p0-vec2(.708,.11))*vec2(17.,14.),(p0-vec2(.708,.11))*vec2(17.,14.)));
      leaves+=exp(-dot((p0-vec2(.775,.435))*vec2(22.,19.),(p0-vec2(.775,.435))*vec2(22.,19.)));
      leaves+=exp(-dot((p0-vec2(.965,.34))*vec2(25.,18.),(p0-vec2(.965,.34))*vec2(25.,18.)));
      float green=smoothstep(.82,1.03,initial.g/max(initial.r,.01))*(1.-smoothstep(.68,.9,initial.b/max(initial.g,.01)));
      uv.x+=sin(uTime*.7+vUv.y*25.)*.00045*min(1.,leaves)*green*(1.-uRoom)*uMotion;
      }
      vec3 color=texture2D(uArt,uv).rgb;
      float ripple=pow(max(0.,sin(uv.y*1050.+sin(uv.x*180.+uTime*.4)*2.7-uTime*1.8)),18.);
      float sparkle=pow(max(0.,sin(uv.x*870.+uTime*.7)*cos(uv.y*1230.-uTime*.8)),16.);
      color+=vec3(.28,.36,.32)*(ripple*.027+sparkle*.08)*water*uMotion;
      vec2 p=vec2(vUv.x,1.-vUv.y);
      for(int i=0;i<16;i++){vec2 d=p-uLights[i].xy;d.x*=1.777;float d2=dot(d,d),r2=uLights[i].z*uLights[i].z;if(d2<r2*9.){float g=exp(-d2/r2);float flicker=.82+.1*sin(uTime*2.1+float(i)*2.)+.06*sin(uTime*3.7+float(i));color+=vec3(1.,.56,.16)*g*.055*flicker;}}
      gl_FragColor=vec4(color,uOpacity);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`});
}
export type Atmosphere={update:(time:number,opacity:number,motion:boolean)=>void};
export function createAtmosphere(T:Runtime,parent:Three.Group,room=false):Atmosphere {
  const layer=new T.Group();layer.position.z=.08;parent.add(layer);
  const cloudMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uTime:{value:0},uOpacity:{value:0}},vertexShader:vertex,fragmentShader:`
    varying vec2 vUv;uniform float uTime,uOpacity;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
    float fbm(vec2 p){float n=0.;float a=.5;for(int i=0;i<4;i++){n+=a*noise(p);p=p*2.03+13.7;a*=.5;}return n;}
    void main(){vec2 p=vec2(vUv.x,1.-vUv.y);if(p.x>.48)discard;float n=fbm(p*vec2(6.,14.)+vec2(uTime*.006,uTime*.001));float seaFog=(1.-smoothstep(.24,.46,p.x))*exp(-pow((p.y-.31)*5.,2.));float foreground=(1.-smoothstep(.08,.4,p.x))*smoothstep(.73,.94,p.y);float a=pow(max(0.,n-.25),2.)*(seaFog*.6+foreground*.8)*uOpacity;gl_FragColor=vec4(1.,.965,.88,a);}`});
  const clouds=new T.Mesh(new T.PlaneGeometry(COZY_ART_ASPECT,1),cloudMaterial);clouds.renderOrder=5;clouds.visible=!room;layer.add(clouds);
  const count=room?40:100,positions=new Float32Array(count*3),seeds=new Float32Array(count*3);
  for(let i=0;i<count;i++){const hash=(n:number)=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};const u=room?.08+hash(i+2)*.84:.44+hash(i+2)*.51;const v=room?.2+hash(i+77)*.65:.22+hash(i+77)*.55;positions[i*3]=(u-.5)*COZY_ART_ASPECT;positions[i*3+1]=.5-v;positions[i*3+2]=.025+hash(i+101)*.02;seeds.set([hash(i+31),hash(i+46),hash(i+99)],i*3);}
  const particleGeometry=new T.BufferGeometry();particleGeometry.setAttribute('position',new T.BufferAttribute(positions,3));particleGeometry.setAttribute('aSeed',new T.BufferAttribute(seeds,3));
  const dustMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{uTime:{value:0},uOpacity:{value:1},uScale:{value:room?1.5:1.8}},vertexShader:`attribute vec3 aSeed;uniform float uTime,uScale;varying float vAlpha;void main(){vec3 p=position;p.x+=sin(uTime*.22+aSeed.x*9.)*.009;p.y+=sin(uTime*.16+aSeed.y*9.)*.007;vAlpha=.15+.5*pow(max(0.,sin(uTime*.4+aSeed.z*15.)),3.);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);gl_PointSize=(.8+aSeed.x*1.5)*uScale;}`,fragmentShader:`uniform float uOpacity;varying float vAlpha;void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d)*vAlpha*uOpacity;gl_FragColor=vec4(1.,.79,.37,a);}`});
  const dust=new T.Points(particleGeometry,dustMaterial);dust.renderOrder=7;layer.add(dust);
  // Fine cascading ribbons stay within the painted waterfall, with a small drifting spray.
  let fallMaterial:Three.ShaderMaterial|null=null;
  if(!room){fallMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uTime:{value:0},uOpacity:{value:1}},vertexShader:vertex,fragmentShader:`varying vec2 vUv;uniform float uTime,uOpacity;void main(){float side=sin(vUv.y*15.)*.07;float band=exp(-pow((vUv.x-.5-side)*4.5,2.));float strands=.4+.6*pow(sin(vUv.x*65.+vUv.y*6.),2.);float falling=.55+.45*sin(vUv.y*65.+uTime*7.);float fade=smoothstep(0.,.17,vUv.y)*(1.-smoothstep(.8,1.,vUv.y));gl_FragColor=vec4(.8,.94,1.,band*strands*falling*fade*.27*uOpacity);}`});const waterfall=new T.Mesh(new T.PlaneGeometry(.026*COZY_ART_ASPECT,.098),fallMaterial);waterfall.position.set((.73-.5)*COZY_ART_ASPECT,.5-.776,.015);waterfall.rotation.z=-.23;waterfall.renderOrder=6;layer.add(waterfall);}
  const birdGeometry=new T.BufferGeometry(),birdPositions=new Float32Array(36);birdGeometry.setAttribute('position',new T.BufferAttribute(birdPositions,3));const birdMaterial=new T.LineBasicMaterial({color:'#72796e',transparent:true,opacity:.35});const birds=new T.LineSegments(birdGeometry,birdMaterial);birds.visible=!room;layer.add(birds);
  return {update:(time,opacity,motion)=>{cloudMaterial.uniforms.uTime.value=time;cloudMaterial.uniforms.uOpacity.value=opacity;dustMaterial.uniforms.uTime.value=time;dustMaterial.uniforms.uOpacity.value=opacity*(motion?1:.35);if(fallMaterial){fallMaterial.uniforms.uTime.value=time;fallMaterial.uniforms.uOpacity.value=opacity*(motion?1:0);}birdMaterial.opacity=opacity*.4;for(let i=0;i<3;i++){const x=(.15+(time*.006+i*.065)%.3-.5)*COZY_ART_ASPECT,y=.5-(.17+i*.025+Math.sin(time*.1+i)*.012),wing=.0025+Math.sin(time*2.5+i)*.0018;const start=i*12;birdPositions[start]=x-.005;birdPositions[start+1]=y+wing;birdPositions[start+2]=.04;birdPositions[start+3]=x;birdPositions[start+4]=y;birdPositions[start+5]=.04;birdPositions[start+6]=x;birdPositions[start+7]=y;birdPositions[start+8]=.04;birdPositions[start+9]=x+.005;birdPositions[start+10]=y+wing;birdPositions[start+11]=.04;}birdGeometry.attributes.position.needsUpdate=true;}};
}
