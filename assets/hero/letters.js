// RAY is built from data. Every visible point travels from the dyad into a glyph volume.
export function createLetters({THREE:T,scene,font,TextGeometry,glowSprite,clamp,smooth,mix,seeded}) {
 const group=new T.Group();group.name='RAY assembled from data';scene.add(group);
 const baseY=.38;group.position.set(0,baseY,1.8);group.rotation.set(-.06,-.095,0);group.updateMatrixWorld(true);
 const inverse=group.matrixWorld.clone().invert();
 const size=3.5,depth=.88,spacing=.54,chars=[],allTargets=[];
 const specs=[...'RAY'].map(ch=>{const geo=new TextGeometry(ch,{font,size,depth,curveSegments:18,bevelEnabled:false});geo.computeBoundingBox();let b=geo.boundingBox;return{ch,geo,w:b.max.x-b.min.x,minX:b.min.x,shapes:font.generateShapes(ch,size)}});
 const total=specs.reduce((v,s)=>v+s.w,0)+2*spacing;let cursor=-total/2;
 // Text faces contain a few very long triangles. Subdivide those faces so a
 // bend reads as fluid glass rather than a folded sheet, including A and Y.
 function refineGlass(geometry){
  const names=['position','normal','uv'],source=names.map(n=>geometry.attributes[n]),output=names.map(()=>[]);
  const vertex=i=>source.map(a=>Array.from(a.array.slice(i*a.itemSize,(i+1)*a.itemSize)));
  const midpoint=(a,b)=>a.map((v,j)=>v.map((n,k)=>(n+b[j][k])*.5));
  const distance=(a,b)=>a[0].reduce((v,n,k)=>v+(n-b[0][k])**2,0);
  function split(a,b,c,depth=0){
   const edges=[distance(a,b),distance(b,c),distance(c,a)],longest=Math.max(...edges);
   if(longest>.16&&depth<9){
    const edge=edges.indexOf(longest);
    if(edge===0){const m=midpoint(a,b);split(a,m,c,depth+1);split(m,b,c,depth+1);}
    else if(edge===1){const m=midpoint(b,c);split(a,b,m,depth+1);split(a,m,c,depth+1);}
    else{const m=midpoint(c,a);split(a,b,m,depth+1);split(m,b,c,depth+1);}
   }else for(const v of [a,b,c])v.forEach((values,i)=>output[i].push(...values));
  }
  for(let i=0;i<source[0].count;i+=3)split(vertex(i),vertex(i+1),vertex(i+2));
  names.forEach((n,i)=>geometry.setAttribute(n,new T.Float32BufferAttribute(output[i],source[i].itemSize)));geometry.clearGroups();
 }
 function inPoly(x,y,p){let yes=false;for(let i=0,j=p.length-1;i<p.length;j=i++){if((p[i].y>y)!=(p[j].y>y)&&x<(p[j].x-p[i].x)*(y-p[i].y)/(p[j].y-p[i].y)+p[i].x)yes=!yes;}return yes;}
 const ac=document.createElement('canvas');ac.width=1024;ac.height=128;const ax=ac.getContext('2d');ax.font='500 88px monospace';ax.textAlign='center';ax.textBaseline='middle';ax.fillStyle='white';[...'01λ∑φ∂⊕+'].forEach((c,i)=>ax.fillText(c,i*128+64,64));const atlas=new T.CanvasTexture(ac);atlas.minFilter=T.LinearFilter;
 // The rest geometry never changes. Glass, fibres and symbols share this
 // displacement field, which returns to exactly zero after every gesture.
 const deformation=`
 uniform vec3 uDrag,uGrab;uniform float uScatter;
 vec3 bend(vec3 p){
  vec3 d=p-uGrab;float influence=.35+.65*exp(-dot(d.xy,d.xy)*.16);
  vec3 q=p+uDrag*influence;
  q.x+=uScatter*.14*sin(p.y*1.9+p.x);
  q.z+=uScatter*.38*sin(p.y*1.8+p.x*.8);
  return q;
 }`;
 const shaderMotion=deformation+`
 attribute vec3 aOrigin;attribute float aSeed,aSize,aColour;uniform float uTime,uReveal,uTouch,uResolution,uIndex,uFluidTime;uniform vec3 uFlow,uGravity;
 varying float vAlpha,vSeed,vSettled,vHue;
 vec3 moveData(){
  float launch=3.12+aSeed*.92;
  float f=clamp((uTime-launch)/(.75+aSeed*.21),0.,1.);
  float q=f*f*(3.-2.*f);
  vec3 source=aOrigin;
  vec3 mid=(source+position)*.5+vec3(sin(aSeed*15.)*.35,.42,1.1);
  vec3 p=(1.-q)*(1.-q)*source+2.*(1.-q)*q*mid+q*q*position;
  float wave=sin(q*3.14159265)*(1.-q);
  p.x+=sin(aSeed*38.+q*8.)*wave*.20;
  p.z+=cos(aSeed*31.+q*5.)*wave*.20;
  float age=max(0.,uTime-5.);
  p.z+=sin(uTime*.75+aSeed*12.+position.y*2.)*(.013+.024*uTouch)*q;
  p.xy+=vec2(sin(position.y*2.4+uTime),cos(position.x*2.-uTime))*.013*uTouch*q;
  float pulse=.84+.16*sin(position.y*1.2-uTime*.65+aSeed*3.);
  vAlpha=smoothstep(launch-.055,launch+.06,uTime)*pulse*(1.+uTouch*.18);
  p=mix(p,bend(p),q);
  // Continuous currents and inertial lag; no rigid radial explosion or resets.
  float phase=uFluidTime*(.75+aSeed*.5)+aSeed*33.;
  vec3 current=vec3(sin(phase+position.y*.8),cos(phase*.83+position.x*.7),sin(phase*.65+position.y*.5));
  p+=q*(uScatter*(current*vec3(.72,.52,.66)+uGravity*(.35+.35*aSeed))+uFlow*(.3+.7*aSeed));
  vSeed=aSeed;vSettled=q;vHue=aColour;return p;
 }`;
 specs.forEach((s,index)=>{
  const pivot=new T.Group();pivot.position.x=cursor+s.w/2;group.add(pivot);
  const cx=s.minX+s.w/2,cy=size*.5;
  s.geo.translate(-cx,-cy,-depth/2);
  const shell=new T.Mesh(s.geo,new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}));shell.name='RAY-'+s.ch;shell.userData.letterIndex=index;pivot.add(shell);
  const rings=s.shapes.map(sh=>({outer:sh.getPoints(30),holes:sh.holes.map(h=>h.getPoints(30))}));
  const pts=[],sizes=[],seeds=[],origins=[],colours=[];let n=0;const count=1600;
  while(pts.length/3<count&&n<count*30){let r=n++ +index*901001;let x=s.minX+seeded(r*3+81)*s.w,y=seeded(r*3+82)*size;
   if(!rings.some(sh=>inPoly(x,y,sh.outer)&&!sh.holes.some(h=>inPoly(x,y,h))))continue;
   const seed=seeded(r+403),z=(seeded(r+83)-.5)*depth;
   pts.push(x-cx,y-cy,z);seeds.push(seed);sizes.push(.48+seeded(r+89)*.35);colours.push(seeded(r*7+611));
   let u=index===0?.57+seeded(r+35)*.34:index===2?.07+seeded(r+35)*.34:(seeded(r+35)>.5?.48:.98)+seeded(r+32)*.045;
   let a=u*Math.PI*2;let source=new T.Vector3(4.4*Math.sin(a),3.35+1.15*Math.sin(2*a),-.7+.70*Math.cos(a));source.applyMatrix4(inverse);source.x-=pivot.position.x;
   source.x+=(seeded(r+19)-.5)*.3;source.y+=(seeded(r+18)-.5)*.3;source.z+=(seeded(r+17)-.5)*.32;origins.push(source.x,source.y,source.z);
  }
  const uniforms={uTime:{value:0},uReveal:{value:0},uTouch:{value:0},uResolution:{value:1080},uIndex:{value:index},uDrag:{value:new T.Vector3()},uGrab:{value:new T.Vector3()},uScatter:{value:0},uFlow:{value:new T.Vector3()},uGravity:{value:new T.Vector3(0,-1,0)},uFluidTime:{value:0}};
  // A softly bevelled, transparent capsule contains the data volume. Surface
  // fragments arrive alongside the databits instead of exposing an empty letter.
  const glassGeometry=new TextGeometry(s.ch,{font,size,depth,curveSegments:32,bevelEnabled:true,bevelSize:.11,bevelThickness:.14,bevelSegments:8});
  glassGeometry.translate(-cx,-cy,-depth/2);
  refineGlass(glassGeometry);
  const glassMaterial=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:T.FrontSide,blending:T.NormalBlending,
   vertexShader:deformation+`varying vec3 vNormal,vView,vLocal;
    void main(){
     vec3 axis=abs(normal.z)<.9?vec3(0.,0.,1.):vec3(0.,1.,0.);
     vec3 tangent=normalize(cross(axis,normal)),bitangent=cross(normal,tangent);
     vec3 p=bend(position);
     vec3 n=normalize(cross(bend(position+tangent*.006)-p,bend(position+bitangent*.006)-p));
     vec4 mv=modelViewMatrix*vec4(p,1.);vView=-mv.xyz;vNormal=normalize(normalMatrix*n);vLocal=position;gl_Position=projectionMatrix*mv;
    }`,
   fragmentShader:`uniform float uTime,uTouch,uIndex,uScatter;varying vec3 vNormal,vView,vLocal;
    float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
    void main(){
     float progress=clamp((uTime-3.80)/1.20,0.,1.);
     float threshold=.105+.75*hash(floor(vLocal*14.))+.045*(vLocal.y+1.75)/3.5;
     float assembled=smoothstep(threshold-.09,threshold+.09,progress);
     if(assembled<.003)discard;
     vec3 v=normalize(vView);
     vec3 n=normalize(vNormal);
     // Smooth, low-amplitude curvature lets broad reflections roll across the
     // clear face; the rounded bevel supplies the actual three-dimensional rim.
     float front=pow(abs(n.z),12.);
     n=normalize(n+front*vec3(.07*sin(vLocal.x*1.4),.045*sin(vLocal.y*1.1),0.));
     float facing=clamp(abs(dot(n,v)),0.,1.);
     float rim=pow(1.-facing,2.1);
     vec3 reflected=reflect(-v,n);
     vec3 light=normalize(vec3(-.55,.9,1.));
     vec3 fill=normalize(vec3(.8,-.22,.9));
     float spec=pow(max(dot(n,normalize(light+v)),0.),64.);
     float spec2=pow(max(dot(n,normalize(fill+v)),0.),100.);
     // Continuous softbox reflections, rather than point glints or glitter.
     float strip=exp(-pow((vLocal.x*.46+vLocal.y*.24+reflected.x*.7-.12),2.)*10.);
     float fineStrip=exp(-pow(vLocal.x*.31-vLocal.y*.38+reflected.y*.5-.50,2.)*65.);
     float edgeLight=pow(max(0.,dot(n,normalize(vec3(-.5,.7,.4)))),5.);
     vec3 smoke=vec3(.055,.082,.13);
     vec3 silver=vec3(.73,.85,.94);
     vec3 colour=smoke*(.7+.4*facing)+silver*(strip*.42+fineStrip*.24+spec*1.65+spec2*.90+edgeLight*.34);
     colour+=vec3(.28,.44,.58)*rim*.55;
     float alpha=(.115+strip*.085+fineStrip*.10+rim*.43+edgeLight*.08+(spec+spec2*.6)*.20)*assembled;
     alpha*=(1.+uTouch*.045)*(1.-.22*min(uScatter,1.));
     gl_FragColor=vec4(colour,clamp(alpha,0.,.78));
     #include <tonemapping_fragment>
     #include <colorspace_fragment>
    }`
  });
  shell.geometry=glassGeometry;shell.material.dispose();shell.material=glassMaterial;shell.renderOrder=3;
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pts,3));geo.setAttribute('aOrigin',new T.Float32BufferAttribute(origins,3));geo.setAttribute('aSeed',new T.Float32BufferAttribute(seeds,1));geo.setAttribute('aSize',new T.Float32BufferAttribute(sizes,1));geo.setAttribute('aColour',new T.Float32BufferAttribute(colours,1));
  const mat=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:T.AdditiveBlending,
   vertexShader:shaderMotion+`void main(){vec3 p=moveData();vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aSize*(uResolution/1080.)*39./(-mv.z),.45,2.2*(uResolution/1080.));}`,
   fragmentShader:`varying float vAlpha,vSeed,vSettled,vHue;void main(){vec2 q=(gl_PointCoord-.5)*2.;float r=length(q);if(r>1.)discard;float core=exp(-r*r*5.);vec3 col=vHue<.5?mix(vec3(.12,.63,.83),vec3(.40,.22,.77),vHue*2.):mix(vec3(.40,.22,.77),vec3(.82,.24,.48),(vHue-.5)*2.);gl_FragColor=vec4(col,core*vAlpha*(.22+.12*vSettled));
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});
  const cloud=new T.Points(geo,mat);cloud.frustumCulled=false;pivot.add(cloud);
  // Curved light fibres weave through the glyph interior and arrive with data.
  const fp=[],fo=[],fs=[],fz=[],fc=[];
  const inside=(x,y)=>rings.some(sh=>inPoly(x,y,sh.outer)&&!sh.holes.some(h=>inPoly(x,y,h)));
  const strandX=(x,y,phase)=>x+.045*Math.sin(y*2.5+phase)+.070*Math.sin(y*.9+phase);
  let strand=0;
  for(let xx=s.minX+.028;xx<s.minX+s.w;xx+=.14){
   const phase=strand*.83,seed=seeded(strand*11+index*33+401),zz=Math.sin(phase)*depth*.37;
   let previous=null;
   for(let yy=.015;yy<size;yy+=.025){
    const xx1=strandX(xx,yy,phase);
    if(!inside(xx1,yy)){previous=null;continue;}
    const p=[xx1-cx,yy-cy,zz+.024*Math.sin(yy*3.+phase)];
    const a=(index===0?.72:index===2?.22:.49)*Math.PI*2.+yy*.12+phase*.013;
    const source=new T.Vector3(4.4*Math.sin(a),3.35+1.15*Math.sin(2*a),-.7+.7*Math.cos(a));source.applyMatrix4(inverse);source.x-=pivot.position.x;
    const o=[source.x,source.y,source.z];
    if(previous){fp.push(...previous.p,...p);fo.push(...previous.o,...o);fs.push(seed,seed);fz.push(1,1);const hue=seeded(strand*23+index*71+131);fc.push(hue,hue);}
    previous={p,o};
   }
   strand++;
  }
  const fg=new T.BufferGeometry();for(const[name,data,stride]of[['position',fp,3],['aOrigin',fo,3],['aSeed',fs,1],['aSize',fz,1],['aColour',fc,1]])fg.setAttribute(name,new T.Float32BufferAttribute(data,stride));
  const fm=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:T.AdditiveBlending,
   vertexShader:shaderMotion+`varying vec3 vLocal;void main(){vLocal=position;vec3 p=moveData();gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
   fragmentShader:`uniform float uTime;varying float vAlpha,vSeed,vSettled,vHue;varying vec3 vLocal;
    void main(){vec3 col=vHue<.5?mix(vec3(.015,.65,1.),vec3(.30,.08,1.),vHue*2.):mix(vec3(.30,.08,1.),vec3(1.,.08,.48),(vHue-.5)*2.);
     float current=.5+.5*sin(vLocal.y*1.2-uTime*.8+vSeed*3.);
     float glint=pow(max(0.,sin(vLocal.y*.88+vSeed*5.+uTime*.6)),24.);
     col=mix(col,vec3(.50,.63,.75),.25);
     gl_FragColor=vec4(col,vAlpha*smoothstep(.3,.85,vSettled)*(.09+.10*current));
     #include <tonemapping_fragment>
     #include <colorspace_fragment>
    }`});
  const fibres=new T.LineSegments(fg,fm);fibres.frustumCulled=false;pivot.add(fibres);

  // Readable binary symbols are distributed through the same volume and follow the same flight.
  const gp=[],go=[],gs=[],gseed=[],gi=[],gc=[];
  const selected=[];
  // Sparse, irregularly spaced symbols at different depths. Every letter has
  // its own interspersed cyan, blue, violet and rose data, with breathing room.
  let attempts=0;
  while(selected.length<72&&attempts<2200){
   const candidate=attempts++;
   const j=Math.floor(seeded(candidate*11+987+index*43)*(pts.length/3));
   const x=pts[j*3],y=pts[j*3+1];
   if(selected.some(p=>Math.hypot(p.x-x,p.y-y)<.205))continue;
   selected.push({x,y});
   gp.push(x,y,pts[j*3+2]*.85+.06);go.push(...origins.slice(j*3,j*3+3));
   gs.push(22.0+seeded(candidate+671)*5.0);gseed.push(seeds[j]);gi.push(candidate%8);
   gc.push(seeded(candidate*47+index*111+2307));
  }
  const gg=new T.BufferGeometry();for(const[name,data,stride]of[['position',gp,3],['aOrigin',go,3],['aSize',gs,1],['aSeed',gseed,1],['aGlyph',gi,1],['aColour',gc,1]])gg.setAttribute(name,new T.Float32BufferAttribute(data,stride));
  const gm=new T.ShaderMaterial({uniforms:{...uniforms,atlas:{value:atlas}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,
   vertexShader:shaderMotion+`attribute float aGlyph;varying float vGlyph;void main(){vec3 p=moveData();vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=aSize*(uResolution/1080.)*19./(-mv.z);vGlyph=aGlyph;}`,
   fragmentShader:`uniform sampler2D atlas;varying float vGlyph,vAlpha,vSeed,vSettled,vHue;void main(){float a=texture2D(atlas,vec2((vGlyph+gl_PointCoord.x)/8.,1.-gl_PointCoord.y)).a;vec3 col=vHue<.5?mix(vec3(.015,.64,1.),vec3(.38,.018,1.),vHue*2.):mix(vec3(.38,.018,1.),vec3(1.,.028,.42),(vHue-.5)*2.);gl_FragColor=vec4(col,a*vAlpha*(.86+.10*vSeed));
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});
  const glyphs=new T.Points(gg,gm);glyphs.frustumCulled=false;pivot.add(glyphs);
  shell.frustumCulled=false;
  chars.push({pivot,shell,uniforms,index,home:pivot.position.clone(),offset:new T.Vector3(),velocity:new T.Vector3(),target:new T.Vector3(),grabTarget:new T.Vector3(),orientation:new T.Quaternion(),orientationTarget:new T.Quaternion(),spin:new T.Vector3(),bend:new T.Vector3(),flow:new T.Vector3(),releaseAge:10,eventTime:0,scatter:0,scatterVelocity:0,scatterTarget:0});cursor+=s.w+spacing;
  group.updateMatrixWorld(true);let p=new T.Vector3();for(let j=0;j<pts.length;j+=3){p.set(pts[j],pts[j+1],pts[j+2]).applyMatrix4(pivot.matrixWorld);allTargets.push(p.x,p.y,p.z);}
 });
 let hover=-1,active=-1,reduced=false,simTime=0;
 const grabOffset=new T.Vector3(),previousTarget=new T.Vector3(),change=new T.Vector3(),previousGesture=new T.Vector3();
 const rotationStep=new T.Quaternion(),rotationError=new T.Quaternion(),inverseRotation=new T.Quaternion(),axis=new T.Vector3(),localVelocity=new T.Vector3(),bendTarget=new T.Vector3(),flowTarget=new T.Vector3(),turn=new T.Euler();
 const identity=new T.Quaternion(),down=new T.Vector3(0,-1,0);
 function begin(index,point){
  if(!chars[index])return false;
  active=index;const c=chars[index];grabOffset.copy(c.offset);previousTarget.copy(c.offset);previousGesture.set(0,0,0);
  c.target.copy(c.offset);c.orientationTarget.copy(c.orientation);c.eventTime=simTime;c.releaseAge=0;
  c.grabTarget.copy(point).clampLength(0,2.2);
  if(c.offset.length()<.02)c.uniforms.uGrab.value.copy(c.grabTarget);return true;
 }
 function drag(delta){
  if(active<0)return;const c=chars[active],eventDt=Math.max(1/240,Math.min(.08,simTime-c.eventTime||1/60));c.eventTime=simTime;
  c.target.copy(grabOffset).addScaledVector(delta,reduced?.48:1);
  // A single shared play area lets any letter travel all the way across RAY.
  // There is no spring to its home while the visitor is holding it.
  if(reduced)c.target.clampLength(0,1.5);
  else{
   c.target.x=Math.max(-5.5-c.home.x,Math.min(5.5-c.home.x,c.target.x));
   c.target.y=Math.max(-2.25,Math.min(2.8,c.target.y));
   c.target.z=Math.max(-.8,Math.min(.8,grabOffset.z+Math.sin(delta.x*.55-delta.y*.45)*.65));
  }
  change.copy(c.target).sub(previousTarget);previousTarget.copy(c.target);
  const cross=previousGesture.x*delta.y-previousGesture.y*delta.x,dot=previousGesture.x*delta.x+previousGesture.y*delta.y;
  const roll=previousGesture.lengthSq()>.10&&delta.lengthSq()>.10?Math.max(-.5,Math.min(.5,Math.atan2(cross,dot))):0;
  previousGesture.copy(delta);
  // Travel tumbles around X/Y; circular gestures accumulate a full roll.
  const scale=reduced?.08:1;
  turn.set(-change.y*.86*scale,change.x*.91*scale,(roll*.95+(change.y*c.grabTarget.x-change.x*c.grabTarget.y)*.055)*scale);
  rotationStep.setFromEuler(turn);c.orientationTarget.premultiply(rotationStep).normalize();
  axis.set(turn.x,turn.y,turn.z).multiplyScalar(1/eventDt).clampLength(0,reduced?1:10);
  c.spin.lerp(axis,1-Math.exp(-18*eventDt));
  for(const other of chars)if(other!==c){
   other.velocity.addScaledVector(change,reduced?.08:.65/(1+Math.abs(other.index-active)));
   other.releaseAge=Math.min(other.releaseAge,.2);
  }
 }
 function release(){
  if(active>=0)chars[active].releaseAge=0;active=-1;
  for(const c of chars){c.target.set(0,0,0);c.scatterTarget=0;}
 }
 function reset(){
  release();hover=-1;
  for(const c of chars){
   c.offset.set(0,0,0);c.velocity.set(0,0,0);c.orientation.identity();c.orientationTarget.identity();c.spin.set(0,0,0);c.bend.set(0,0,0);c.flow.set(0,0,0);c.scatter=0;c.scatterVelocity=0;c.releaseAge=10;
  }
 }
 function nudge(x,y){
  release();for(const c of chars){c.releaseAge=0;c.velocity.x+=x*(reduced?2:8)*(c.index===1?1:.62);c.velocity.y+=y*(reduced?2:8);c.spin.set(-y*(reduced?.2:2.5),x*(reduced?.2:3),x*(reduced?.1:1.2));c.scatterVelocity+=reduced?.2:2;}
 }
 function update(t,elapsed=t,dt=0){
  group.visible=t>3.04;const interaction=smooth(5.,5.5,t),duration=Math.min(.05,Math.max(0,dt));simTime+=duration;
  const steps=Math.max(1,Math.ceil(duration*180)),h=duration/steps;
  for(const c of chars){
   const held=c.index===active;
   for(let s=0;s<steps;s++){
    if(!held)c.releaseAge+=h;
    const returning=reduced?1:smooth(.16,.85,c.releaseAge),k=held?290:reduced?100:20*returning,d=held?30:reduced?20:mix(1.6,6.4,returning);
    for(const component of ['x','y','z']){c.velocity[component]+=((c.target[component]-c.offset[component])*k-c.velocity[component]*d)*h;c.offset[component]+=c.velocity[component]*h;}
    // Keep thrown letters nearby, while allowing R and Y to exchange sides.
    for(const [component,lo,hi]of [['x',-5.7-c.home.x,5.7-c.home.x],['y',-2.5,3],['z',-1,1]]){
     if(c.offset[component]<lo||c.offset[component]>hi){c.offset[component]=Math.max(lo,Math.min(hi,c.offset[component]));c.velocity[component]*=-.22;}
    }
    if(held){
     c.orientation.slerp(c.orientationTarget,1-Math.exp(-19*h));
     if(simTime-c.eventTime>.05)c.spin.multiplyScalar(Math.exp(-9*h));
    }else{
     rotationError.copy(c.orientation).invert();if(rotationError.w<0)rotationError.set(-rotationError.x,-rotationError.y,-rotationError.z,-rotationError.w);
     const angle=2*Math.acos(Math.max(-1,Math.min(1,rotationError.w))),sinHalf=Math.sqrt(Math.max(0,1-rotationError.w*rotationError.w));
     axis.set(rotationError.x,rotationError.y,rotationError.z).multiplyScalar(sinHalf>.00001?angle/sinHalf:2);
     c.spin.addScaledVector(axis,(reduced?90:17*returning)*h).multiplyScalar(Math.exp(-(reduced?19:mix(1.4,6.2,returning))*h));
     const speed=c.spin.length();if(speed>.00001){rotationStep.setFromAxisAngle(axis.copy(c.spin).multiplyScalar(1/speed),speed*h);c.orientation.premultiply(rotationStep).normalize();}
    }
    inverseRotation.copy(c.orientation).invert();localVelocity.copy(c.velocity).applyQuaternion(inverseRotation);
    // Surface stretch follows motion, not distance from the original letter.
    bendTarget.copy(localVelocity).multiplyScalar(.045).clampLength(0,reduced?.12:.75);
    flowTarget.copy(localVelocity).multiplyScalar(-.10).clampLength(0,reduced?.12:1.05);
    c.bend.lerp(bendTarget,1-Math.exp(-10*h));c.flow.lerp(flowTarget,1-Math.exp(-4.8*h));
    c.scatterTarget=reduced?(held?.12:0):held?Math.min(1.22,.23+c.velocity.length()*.065):Math.min(.72,c.velocity.length()*.08)*(1-smooth(.4,1.8,c.releaseAge));
    c.scatterVelocity+=((c.scatterTarget-c.scatter)*(reduced?80:38)-c.scatterVelocity*(reduced?18:11))*h;c.scatter+=c.scatterVelocity*h;
   }
   if(!held){
    if(c.offset.lengthSq()+c.velocity.lengthSq()<.000004){c.offset.set(0,0,0);c.velocity.set(0,0,0);}
    if(c.orientation.angleTo(identity)<.0008&&c.spin.lengthSq()<.000006){c.orientation.identity();c.spin.set(0,0,0);}
    if(c.bend.lengthSq()<.000001&&c.velocity.lengthSq()<.000004)c.bend.set(0,0,0);
    if(c.flow.lengthSq()<.000001&&c.velocity.lengthSq()<.000004)c.flow.set(0,0,0);
    if(Math.abs(c.scatter)+Math.abs(c.scatterVelocity)<.001){c.scatter=0;c.scatterVelocity=0;}
   }
   c.pivot.position.copy(c.home).addScaledVector(c.offset,interaction);c.pivot.position.y+=Math.sin(6*.9+c.index)*.014*interaction;
   c.pivot.quaternion.copy(c.orientation);
   c.uniforms.uGrab.value.lerp(c.grabTarget,1-Math.exp(-16*duration));c.uniforms.uDrag.value.copy(c.bend).multiplyScalar(interaction);
   c.uniforms.uFlow.value.copy(c.flow).multiplyScalar(interaction);c.uniforms.uGravity.value.copy(down).applyQuaternion(inverseRotation.copy(c.orientation).invert());
   c.uniforms.uScatter.value=Math.max(0,c.scatter)*interaction;c.uniforms.uFluidTime.value=simTime;
   c.uniforms.uTime.value=elapsed;c.uniforms.uReveal.value=smooth(3.1,5.,t);c.uniforms.uTouch.value=(hover===c.index?.5:0)+(held?.8:0);
  }
 }
 function isMoving(){return active>=0||chars.some(c=>c.offset.lengthSq()+c.velocity.lengthSq()+c.spin.lengthSq()+c.bend.lengthSq()+c.flow.lengthSq()>.0000001||c.orientation.angleTo(identity)>.0001||Math.abs(c.scatter)+Math.abs(c.scatterVelocity)>.0001);}
 function resize(h){chars.forEach(c=>c.uniforms.uResolution.value=h);}
 return{group,update,begin,drag,release,reset,nudge,isMoving,hover(index){hover=index;},setReducedMotion(value){reduced=value;},resize,meshes:chars.map(c=>c.shell),letterTargets:new Float32Array(allTargets)};
}
