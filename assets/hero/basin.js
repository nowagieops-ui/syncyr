// Restored from the first-ever "The Attractor" concept.
// Original Gaussian profile, 44 contours, 192 circle samples and fine particles.
// Only a restrained blue meridian grid and gentle illumination are added.
export const BASIN_FADE_START=4.9,BASIN_FADE_END=5.5;
export function createBasin({ THREE: T, scene, glowSprite, smooth, mix, seeded }) {
  const group=new T.Group();group.name='Original attractor basin · gently illuminated blue grid';scene.add(group);
  const TAU=Math.PI*2;
  const wellY=r=>-1.78-2.92*Math.exp(-.56*r*r);
  const viewport={value:new T.Vector2(1920,1080)};
  // Camera-facing strips preserve the original path exactly while keeping
  // the same apparent line thickness in 1080p and 4K exports.
  const makeLine=(pts,color,opacity)=>{
    const pos=[],prev=[],next=[],sides=[],ix=[],closed=pts[0].distanceToSquared(pts[pts.length-1])<.000001;
    for(let i=0;i<pts.length;i++){
      const p=pts[i],before=pts[i===0?(closed?pts.length-2:0):i-1],after=pts[i===pts.length-1?(closed?1:i):i+1];
      for(const side of [-1,1]){pos.push(p.x,p.y,p.z);prev.push(before.x,before.y,before.z);next.push(after.x,after.y,after.z);sides.push(side);}
      if(i<pts.length-1){const q=i*2;ix.push(q,q+1,q+2,q+1,q+3,q+2);}
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));
    geo.setAttribute('aPrev',new T.Float32BufferAttribute(prev,3));geo.setAttribute('aNext',new T.Float32BufferAttribute(next,3));
    geo.setAttribute('aSide',new T.Float32BufferAttribute(sides,1));geo.setIndex(ix);
    const mat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,
      uniforms:{uViewport:viewport,uColor:{value:new T.Color(color)},uOpacity:{value:opacity}},
      vertexShader:`attribute vec3 aPrev,aNext;attribute float aSide;uniform vec2 uViewport;varying float vSide;
        void main(){vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);
        vec4 p0=projectionMatrix*modelViewMatrix*vec4(aPrev,1.),p1=projectionMatrix*modelViewMatrix*vec4(aNext,1.);
        vec2 direction=(p1.xy/p1.w-p0.xy/p0.w)*uViewport;
        direction/=max(length(direction),.00001);vec2 normal=vec2(-direction.y,direction.x);
        float halfWidth=1.1*uViewport.y/1080.;
        p.xy+=normal*aSide*halfWidth*2./uViewport*p.w;vSide=aSide;gl_Position=p;}`,
      fragmentShader:`uniform vec3 uColor;uniform float uOpacity;varying float vSide;
        void main(){float coverage=1.-smoothstep(.54545,1.,abs(vSide));
        gl_FragColor=vec4(uColor,uOpacity*coverage);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }`
    });
    mat.opacity=opacity;const line=new T.Mesh(geo,mat);
    line.onBeforeRender=()=>{mat.uniforms.uOpacity.value=mat.opacity;};
    return line;
  };
  const contours=[];
  for(let k=0;k<44;k++){
    const radius=.20+7.15*Math.pow(k/43,1.28),pts=[];
    for(let j=0;j<=192;j++){
      const a=j/192*TAU,r=radius*(1+.006*Math.sin(a*3+radius*.5));
      pts.push(new T.Vector3(Math.cos(a)*r,wellY(r),Math.sin(a)*r));
    }
    const color=new T.Color().setHSL(mix(.575,.69,k/43),.78,mix(.65,.44,k/43));
    const line=makeLine(pts,color,.35);group.add(line);
    contours.push({line,radius,base:.13+.3*Math.pow(1-k/44,.5)});
  }
  // Complement the original circular contours with a quiet second direction.
  // No filled skin, slab, torus, or replacement geometry has been introduced.
  const meridians=[];
  for(let k=0;k<56;k++){
    const a=k/56*TAU,pts=[];
    for(let j=0;j<=150;j++){
      const rr=.025+7.325*Math.pow(j/150,1.24);
      const r=rr*(1+.006*Math.sin(a*3+rr*.5));
      pts.push(new T.Vector3(Math.cos(a)*r,wellY(r)+.004,Math.sin(a)*r));
    }
    const line=makeLine(pts,k%7===0?0x578ee8:0x2465c8,k%7===0?.30:.20);
    group.add(line);meridians.push({line,major:k%7===0});
  }
  // These are the first concept's original restrained fine points.
  // Their movement stays on the basin; the dyad owns the ascent and reveal.
  const count=3400,positions=new Float32Array(count*3),colors=new Float32Array(count*3);
  const radii=new Float32Array(count),angles=new Float32Array(count),heights=new Float32Array(count),choices=new Float32Array(count),color=new T.Color();
  for(let i=0;i<count;i++){
    radii[i]=.35+7*Math.sqrt(seeded(i*7+131));angles[i]=TAU*seeded(i*11+421);
    heights[i]=seeded(i*13+91);choices[i]=seeded(i*19+2017);
    color.setHSL(mix(.565,.71,heights[i]),mix(.1,.82,choices[i]),mix(.60,.94,seeded(i+619)));
    colors.set([color.r,color.g,color.b],i*3);
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));
  geometry.setAttribute('color',new T.BufferAttribute(colors,3));
  const particleMaterial=new T.PointsMaterial({size:.024,sizeAttenuation:true,vertexColors:true,transparent:true,opacity:.40,depthWrite:false,blending:T.AdditiveBlending});
  const particles=new T.Points(geometry,particleMaterial);particles.frustumCulled=false;group.add(particles);
  const core=glowSprite(0xa9d9ff,1.4,.16);core.position.set(0,-4.55,0);group.add(core);
  const corona=glowSprite(0x7463ff,3.8,.08);corona.position.set(0,-4.5,0);group.add(corona);
  function update(t){
    const settle=smooth(3.1,4.8,t),visibility=mix(1,.55,settle)*(1-smooth(BASIN_FADE_START,BASIN_FADE_END,t));
    group.visible=t<BASIN_FADE_END;
    const movingRadius=7.4-mod(t*1.65,7.4);
    for(const {line,radius,base} of contours){
      const pulse=Math.exp(-Math.pow((radius-movingRadius)/.65,2));
      line.material.opacity=(base*1.20+pulse*.25)*visibility;
    }
    for(const {line,major} of meridians)line.material.opacity=(major?.30:.20)*visibility;
    for(let i=0;i<count;i++){
      const r=radii[i],a=angles[i]+t*(.035+.05/(r+.5));
      positions[i*3]=Math.cos(a)*r;positions[i*3+1]=wellY(r)+.025+heights[i]*.085;positions[i*3+2]=Math.sin(a)*r;
    }
    geometry.attributes.position.needsUpdate=true;particleMaterial.opacity=.40*visibility;
    core.material.opacity=.16*visibility;corona.material.opacity=.065*visibility;
  }
  function mod(a,b){return((a%b)+b)%b;}
  update(0);return{group,update,resize(height){viewport.value.set(height*16/9,height);}};
}
