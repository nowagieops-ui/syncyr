// A glass data dyad born from the basin, then wholly transferred into RAY.
export function createDyad({THREE:T,scene,glowSprite,clamp,smooth,mix,seeded,letterTargets}){
  const group=new T.Group();group.name='Glass infinity becoming RAY';scene.add(group);
  const TAU=Math.PI*2,R=i=>seeded(i+81743);
  const shared={uTime:{value:0},uGrow:{value:0},uLife:{value:0},uMorph:{value:0},uShell:{value:0},uHeight:{value:1080}};
  const curveGLSL=`
    vec3 centre(float a){return vec3(4.4*sin(a),3.35+1.15*sin(2.*a),-.7+.70*cos(a));}
    vec3 pointAt(float a,float r,float spin){
      vec3 tangent=normalize(vec3(4.4*cos(a),2.30*cos(2.*a),-.70*sin(a)));
      vec3 side=normalize(cross(tangent,vec3(0.,0.,1.)));
      vec3 across=normalize(cross(tangent,side));
      return centre(a)+r*(cos(spin)*side+sin(spin)*across);
    }
    float show(float a,float grow){float phase=fract(a/3.14159265359);return 1.-smoothstep(grow-.018,grow+.012,phase);}
  `;
  function targetsFor(n){
    const dest=new Float32Array(n*3),available=letterTargets?.length/3||0;
    for(let i=0;i<n;i++){
      const j=available?Math.floor(R(i*31+9)*available)*3:0;
      dest.set(available?[letterTargets[j],letterTargets[j+1],letterTargets[j+2]]:[0,1,0],i*3);
    }
    return dest;
  }
  const count=12800,base=new Float32Array(count*3),seed=new Float32Array(count*4);
  for(let i=0;i<count;i++){
    seed.set([R(i*7)*TAU,Math.sqrt(R(i*7+1))*(i%17===0?.42:.245),R(i*7+2)*TAU,.58+R(i*7+3)*1.1],i*4);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(base,3));g.setAttribute('aSeed',new T.BufferAttribute(seed,4));g.setAttribute('aDest',new T.BufferAttribute(targetsFor(count),3));
  const mat=new T.ShaderMaterial({uniforms:shared,transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    vertexShader:`attribute vec4 aSeed;attribute vec3 aDest;uniform float uTime,uGrow,uLife,uHeight,uMorph;varying vec3 vColor;varying float vAlpha,vSharp;
      ${curveGLSL}
      void main(){float halfIndex=floor(aSeed.x/3.14159265359);float direction=halfIndex<.5?1.:-1.;float a=halfIndex*3.14159265359+mod(aSeed.x-halfIndex*3.14159265359+uTime*.15*direction+31.4159265359,3.14159265359);
        vec3 origin=pointAt(a,aSeed.y,aSeed.z+uTime*.18);
        float blend=smoothstep(0.,1.,clamp(uMorph*1.14-fract(aSeed.z*2.71)*.14,0.,1.));
        vec3 p=mix(origin,aDest,blend);p+=vec3(sin(aSeed.z+blend*6.283)*.22, .65, cos(aSeed.z+blend*6.283)*.38)*sin(blend*3.14159265);
        vec4 mv=modelViewMatrix*vec4(p,1.);
        float nearSide=.78+.22*(.5+.5*cos(a));float pulse=.84+.16*sin(a*9.-uTime*2.4+aSeed.z);
        float grain=mix(.48,1.,fract(aSeed.z*3.3));
        vColor=mix(vec3(.025,.48,1.),vec3(.10,1.,1.),grain);
        vColor=mix(vColor,mix(vec3(.35,.08,1.),vec3(1.,.20,.72),grain),step(3.1415926,aSeed.x)*.88);
        vColor=mix(vColor,vec3(.92,.97,1.),pow(grain,15.)*.65);
        vAlpha=show(a,uGrow)*uLife*nearSide*pulse;vSharp=step(.27,aSeed.y);
        gl_PointSize=clamp((uHeight/1080.)*aSeed.w*55./-mv.z, .9,6.5);
        gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader:`varying vec3 vColor;varying float vAlpha,vSharp;void main(){vec2 q=gl_PointCoord-.5;float d=length(q)*2.;if(d>1.||vAlpha<.002)discard;
      float core=exp(-d*d*7.);float sparkle=pow(max(0.,1.-abs(q.x)*13.),3.)*pow(max(0.,1.-abs(q.y)*13.),3.);
      gl_FragColor=vec4(vColor,(core*.91+sparkle*.49)*vAlpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`
  });
  const points=new T.Points(g,mat);points.frustumCulled=false;group.add(points);

  // The binary fragments are part of the volume, not a flat label on a tube.
  const atlasCanvas=document.createElement('canvas');atlasCanvas.width=256;atlasCanvas.height=128;
  const ctx=atlasCanvas.getContext('2d');ctx.clearRect(0,0,256,128);ctx.font='500 82px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='white';ctx.fillText('0',64,65);ctx.fillText('1',192,65);
  const atlas=new T.CanvasTexture(atlasCanvas);atlas.minFilter=T.LinearFilter;atlas.magFilter=T.LinearFilter;
  const gc=740,gs=new Float32Array(gc*4),gp=new Float32Array(gc*3),tile=new Float32Array(gc);
  for(let i=0;i<gc;i++){gs.set([R(i*11+62)*TAU,.05+Math.sqrt(R(i*11+63))*.25,R(i*11+64)*TAU,.83+R(i*11+65)*.45],i*4);tile[i]=i%2;}
  const gg=new T.BufferGeometry();gg.setAttribute('position',new T.BufferAttribute(gp,3));gg.setAttribute('aSeed',new T.BufferAttribute(gs,4));gg.setAttribute('aTile',new T.BufferAttribute(tile,1));gg.setAttribute('aDest',new T.BufferAttribute(targetsFor(gc),3));
  const gm=new T.ShaderMaterial({uniforms:{...shared,atlas:{value:atlas}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    vertexShader:`attribute vec4 aSeed;attribute vec3 aDest;attribute float aTile;uniform float uTime,uGrow,uLife,uHeight,uMorph;varying float vTile,vAlpha,vTone;${curveGLSL}
      void main(){float halfIndex=floor(aSeed.x/3.14159265359);float dir=halfIndex<.5?1.:-1.;float a=halfIndex*3.14159265359+mod(aSeed.x-halfIndex*3.14159265359+uTime*.19*dir+31.4159265359,3.14159265359);
        float blend=smoothstep(0.,1.,clamp(uMorph*1.14-fract(aSeed.z*2.71)*.14,0.,1.));
        vec3 p=mix(pointAt(a,aSeed.y,aSeed.z+uTime*.14),aDest,blend);p+=vec3(sin(aSeed.z+blend*6.283)*.22,.65,cos(aSeed.z+blend*6.283)*.38)*sin(blend*3.14159265);
        vec4 mv=modelViewMatrix*vec4(p,1.);
        vTile=aTile;vTone=step(3.14159,aSeed.x);vAlpha=show(a,uGrow)*uLife*(.79+.21*(.5+.5*cos(a)))*(.86+.14*sin(uTime+aSeed.z));
        gl_PointSize=clamp((uHeight/1080.)*aSeed.w*325./-mv.z,5.,22.);gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader:`uniform sampler2D atlas;varying float vTile,vAlpha,vTone;void main(){vec2 uv=vec2((gl_PointCoord.x+vTile)*.5,1.-gl_PointCoord.y);float a=texture2D(atlas,uv).a;if(a<.025||vAlpha<.002)discard;
      vec3 c=mix(vec3(.15,.90,1.),vec3(.91,.25,1.),vTone);gl_FragColor=vec4(c,a*vAlpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`
  });
  const glyphs=new T.Points(gg,gm);glyphs.frustumCulled=false;group.add(glyphs);

  // Translucent crystal sheath: a real curved volume, with selective silver
  // reflections and coloured refraction cues. It is deliberately hollow.
  class InfinityCurve extends T.Curve{
    getPoint(t,target=new T.Vector3()){
      const a=t*TAU;return target.set(4.4*Math.sin(a),3.35+1.15*Math.sin(2*a),-.7+.7*Math.cos(a));
    }
  }
  const glassGeometry=new T.TubeGeometry(new InfinityCurve(),360,.27,24,true);
  const glassMaterial=new T.ShaderMaterial({uniforms:shared,transparent:true,depthWrite:false,side:T.FrontSide,blending:T.NormalBlending,
    vertexShader:`varying vec3 vNormal,vView;varying vec2 vUv;
      void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vView=-mv.xyz;vNormal=normalize(normalMatrix*normal);vUv=uv;gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform float uTime,uGrow,uShell;varying vec3 vNormal,vView;varying vec2 vUv;
      void main(){float phase=fract(vUv.x*2.);float reveal=1.-smoothstep(uGrow-.018,uGrow+.012,phase);if(reveal*uShell<.002)discard;
        vec3 n=normalize(vNormal),v=normalize(vView);float facing=clamp(abs(dot(n,v)),0.,1.);float fresnel=pow(1.-facing,2.2);
        vec3 key=normalize(vec3(-.4,.85,1.));vec3 fill=normalize(vec3(.8,-.2,.7));
        float spec=pow(max(dot(n,normalize(key+v)),0.),95.);
        float sideSpec=pow(max(dot(n,normalize(fill+v)),0.),140.);
        float film=.5+.5*sin(vUv.x*18.+uTime*.7+facing*6.);
        vec3 tint=mix(vec3(.025,.28,.50),vec3(.29,.045,.38),smoothstep(.43,.57,vUv.x));
        vec3 colour=tint*(.35+.45*fresnel)+mix(vec3(.36,.78,1.),vec3(.70,.30,1.),film)*fresnel*.58;
        colour+=vec3(.88,.96,1.)*(spec*2.4+sideSpec*1.2);
        float opacity=(.12+fresnel*.34+spec*.38+sideSpec*.26)*uShell*reveal;
        gl_FragColor=vec4(colour,opacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const glass=new T.Mesh(glassGeometry,glassMaterial);glass.frustumCulled=false;glass.renderOrder=2;group.add(glass);

  // Three narrow silver currents define the flow while the data gives it substance.
  const filaments=[];
  for(let j=0;j<3;j++){
    const vertices=new Float32Array(900*3),phases=new Float32Array(900);
    for(let i=0;i<900;i++){const a=i/899*TAU;vertices.set([4.4*Math.sin(a),3.35+1.15*Math.sin(2*a),-.7+.7*Math.cos(a)],i*3);phases[i]=a;}
    const fg=new T.BufferGeometry();fg.setAttribute('position',new T.BufferAttribute(vertices,3));fg.setAttribute('aPhase',new T.BufferAttribute(phases,1));
    const fm=new T.ShaderMaterial({uniforms:{...shared,uIndex:{value:j}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,
      vertexShader:`attribute float aPhase;uniform float uTime,uIndex;varying float vPhase,vDepth;${curveGLSL}
        void main(){vec3 p=pointAt(aPhase,.09+uIndex*.049,uIndex*2.094+aPhase*2.+uTime*.32);vPhase=aPhase;vDepth=.5+.5*cos(aPhase);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
      fragmentShader:`uniform float uTime,uGrow,uShell,uIndex;varying float vPhase,vDepth;${curveGLSL}
        void main(){float phase=fract(vPhase/6.2831853-uTime*.055+uIndex*.21);float pulse=pow(.5+.5*cos(phase*6.2831853),14.);
          float a=(.10+.34*pulse)*show(vPhase,uGrow)*uShell*(.66+.34*vDepth);if(a<.002)discard;
          gl_FragColor=vec4(mix(vec3(.23,.84,1.),vec3(.81,.38,1.),step(3.14159,vPhase)),a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    });
    const line=new T.Line(fg,fm);line.frustumCulled=false;filaments.push(line);group.add(line);
  }

  // The beam climbs from the visible bottom of the well to the dyad's crossing.
  const beamUniforms={uTime:{value:0},uHeight:shared.uHeight,uBirth:{value:0},uLife:{value:0}};
  const bc=2100,bg=new T.BufferGeometry(),bp=new Float32Array(bc*3),bs=new Float32Array(bc*4);
  for(let i=0;i<bc;i++)bs.set([R(i*17+912),R(i*17+913)*TAU,.025+.15*Math.sqrt(R(i*17+914)),.65+R(i*17+915)],i*4);
  bg.setAttribute('position',new T.BufferAttribute(bp,3));bg.setAttribute('aSeed',new T.BufferAttribute(bs,4));
  const bm=new T.ShaderMaterial({uniforms:beamUniforms,transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    vertexShader:`attribute vec4 aSeed;uniform float uTime,uBirth,uLife,uHeight;varying float vAlpha;void main(){
      float f=fract(aSeed.x+uTime*(.52+aSeed.w*.13));float a=aSeed.y+f*9.-uTime;
      vec3 p=mix(vec3(0.,-4.70,0.),vec3(0.,3.35,-.7),f*uBirth);
      float r=aSeed.z*(.90-.50*f);p.x+=cos(a)*r;p.z+=sin(a)*r;
      vec4 mv=modelViewMatrix*vec4(p,1.);vAlpha=uLife*(.45+.55*sin(f*3.1415926));
      gl_PointSize=clamp((uHeight/1080.)*aSeed.w*28./-mv.z,.6,3.6);gl_Position=projectionMatrix*mv;
    }`,fragmentShader:`varying float vAlpha;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.||vAlpha<.003)discard;gl_FragColor=vec4(.69,.87,1.,exp(-r*r*6.)*vAlpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`
  });
  const beamPoints=new T.Points(bg,bm);beamPoints.frustumCulled=false;group.add(beamPoints);
  const beamPath=new T.LineCurve3(new T.Vector3(0,-4.70,0),new T.Vector3(0,3.35,-.7));
  const beamTube=new T.Mesh(new T.TubeGeometry(beamPath,80,.028,8,false),new T.ShaderMaterial({uniforms:beamUniforms,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec2 vUv;uniform float uTime,uLife,uBirth;void main(){float a=(1.-smoothstep(uBirth-.03,uBirth+.005,vUv.x))*sin(vUv.x*3.1415926)*(.65+.35*sin(vUv.x*45.-uTime*25.))*uLife*.23;if(a<.001)discard;gl_FragColor=vec4(.64,.83,1.,a);}`
  }));group.add(beamTube);
  const origin=glowSprite(0x80bcff,1.3,0);origin.position.set(0,-4.65,.05);group.add(origin);
  const tip=glowSprite(0xc6e8ff,.8,0);group.add(tip);
  const head1=glowSprite(0xe2f4ff,.42,0),head2=glowSprite(0xb6a5ef,.42,0);group.add(head1,head2);
  function putHead(sprite,a){sprite.position.set(4.4*Math.sin(a),3.35+1.15*Math.sin(2*a),-.7+.70*Math.cos(a));}
  return {group,resize(h){shared.uHeight.value=h;},update(t){
    group.visible=t<5.1;
    const grow=smooth(1.78,3.04,t),birth=smooth(1.50,1.98,t),life=smooth(1.74,2.02,t)*(1-smooth(4.65,5.0,t));
    shared.uTime.value=t;shared.uGrow.value=grow;shared.uLife.value=life;
    shared.uMorph.value=smooth(3.25,4.80,t);shared.uShell.value=smooth(1.76,2.10,t)*(1-smooth(3.35,4.30,t));
    const beamLife=smooth(1.5,1.76,t)*(1-smooth(3.15,4.1,t));
    beamUniforms.uTime.value=t;beamUniforms.uBirth.value=birth;beamUniforms.uLife.value=beamLife;
    origin.material.opacity=beamLife*.33;tip.position.set(0,-4.70+8.05*birth,-.7*birth);tip.material.opacity=beamLife*.35*(1-smooth(1.97,2.55,t));
    const headLife=smooth(1.78,1.94,t)*(1-smooth(2.90,3.10,t));
    putHead(head1,grow*Math.PI);putHead(head2,Math.PI+grow*Math.PI);head1.material.opacity=headLife*.63;head2.material.opacity=headLife*.52;
  }};
}
