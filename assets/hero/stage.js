import * as T from './vendor/three.module.js';
import {FontLoader} from './vendor/FontLoader.js';
import {TextGeometry} from './vendor/TextGeometry.js';
import {createBasin,BASIN_FADE_END} from './basin.js';
import {createDyad} from './dyad.js';
import {createLetters} from './letters.js';
const query=new URLSearchParams(location.search),manual=query.has('manual');
const heroWidth=()=>document.getElementById('scene')?.clientWidth||innerWidth;const crispWidth=()=>Math.round(Math.min(heroWidth()*Math.max(1.5,Math.min(devicePixelRatio,2)),3840));
let W=+(query.get('w')||crispWidth()),H=+(query.get('h')||W*9/16);
const renderer=new T.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});renderer.setPixelRatio(1);renderer.setSize(W,H);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
const mount=document.getElementById('scene')||document.body;mount.appendChild(renderer.domElement);renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','An attractor basin gives rise to a luminous data infinity loop and RAY letters assembled from individual databits. After the basin fades, drag in any direction to carry and tumble the glass letters across RAY, swirling their data. Release to let RAY reform. Arrow keys stir the letters; Home restores them.');
const scene=new T.Scene();scene.background=new T.Color(0x02040a);const camera=new T.PerspectiveCamera(36,W/H,.1,130);camera.position.set(0,5.7,19.5);camera.lookAt(0,-.1,0);
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=(a,b,t)=>{const v=clamp((t-a)/(b-a));return v*v*(3-2*v)},mix=(a,b,t)=>a+(b-a)*t,seeded=i=>{let v=Math.sin(i*127.1+311.7)*43758.5453;return v-Math.floor(v)};
const glowCanvas=document.createElement('canvas');glowCanvas.width=128;glowCanvas.height=128;const ctx=glowCanvas.getContext('2d'),grad=ctx.createRadialGradient(64,64,0,64,64,64);grad.addColorStop(0,'rgba(255,255,255,1)');grad.addColorStop(.08,'rgba(255,255,255,.66)');grad.addColorStop(.27,'rgba(255,255,255,.16)');grad.addColorStop(.62,'rgba(255,255,255,.025)');grad.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);const glowMap=new T.CanvasTexture(glowCanvas);
function glowSprite(color,size,opacity=1){const s=new T.Sprite(new T.SpriteMaterial({map:glowMap,color,transparent:true,opacity,blending:T.AdditiveBlending,depthWrite:false}));s.scale.set(size,size,1);return s;}
scene.add(new T.AmbientLight(0x7393ac,.34));for(const [col,power,p]of[[0xc0ddeb,70,[-5,6,5]],[0x6f8ad0,28,[6,2,-3]],[0xffffff,65,[-1,6,-4]]]){const light=new T.PointLight(col,power,70,1.6);light.position.set(...p);scene.add(light)}
// Very quiet distant atmosphere. The three-dimensional foreground carries the story.
for(const [x,y,z,size,color,opacity]of[[-4,2,-15,24,0x233f63,.28],[7,-2,-18,24,0x292645,.18],[0,-6,-12,18,0x0f2639,.2]]){const g=glowSprite(color,size,opacity);g.position.set(x,y,z);scene.add(g)}
const stars=[];for(let i=0;i<1300;i++)stars.push((seeded(i+1)-.5)*85,(seeded(i+44)-.5)*52,-12-seeded(i+8)*62);const starsGeo=new T.BufferGeometry();starsGeo.setAttribute('position',new T.Float32BufferAttribute(stars,3));scene.add(new T.Points(starsGeo,new T.PointsMaterial({color:0x96adbf,size:.049,map:glowMap,transparent:true,opacity:.45,depthWrite:false,blending:T.AdditiveBlending})));
const font=new FontLoader().parse(window.RAY_FONT||await(await fetch(new URL('./vendor/font.json',import.meta.url))).json());
const shared={THREE:T,scene,glowSprite,clamp,smooth,mix,seeded};const letters=createLetters({...shared,font,TextGeometry});letters.resize(H);
const basin=createBasin(shared),dyad=createDyad({...shared,letterTargets:letters.letterTargets});basin.resize?.(H);dyad.resize?.(H);
const raycaster=new T.Raycaster(),pointer=new T.Vector2(),dragPlane=new T.Plane(),dragOrigin=new T.Vector3(),dragPoint=new T.Vector3(),dragDelta=new T.Vector3(),groupInverseRotation=new T.Quaternion();
const canvas=renderer.domElement,reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches,settledAt=BASIN_FADE_END;
letters.setReducedMotion(reducedMotion);
let interactionClock=0,lastTick=performance.now(),inView=true,pointerId=null,start=performance.now(),paused=false,pausedAt=0,lastTime=0,dirty=true;
const hint=document.getElementById('hint'),replay=document.getElementById('replay'),pause=document.getElementById('pause');
window.renderFrame=(t,elapsed=t,dt=0)=>{
 const tt=Math.max(0,Math.min(6,t));lastTime=t;
 const dolly=smooth(.35,3.05,tt);camera.position.set(0,mix(6.,5.5,dolly),mix(14.,19.,dolly));camera.lookAt(0,mix(-2.5,.2,dolly),0);
 basin.update(t);dyad.update(tt);letters.update(tt,tt>=settledAt?6+interactionClock:elapsed,dt);renderer.render(scene,camera);
 const ready=t>=settledAt;canvas.classList.toggle('interactive',ready);if(hint)hint.classList.toggle('visible',ready);dirty=false;return true;
};
window.getFrame=t=>{window.renderFrame(t);return canvas.toDataURL('image/jpeg',.97).split(',')[1]};
window.getPNG=t=>{window.renderFrame(t);return canvas.toDataURL('image/png').split(',')[1]};
mount.classList.add('loaded');window.scene=scene;window.renderer=renderer;window.rayCamera=camera;window.rayBasin=basin;window.rayDyad=dyad;window.rayLetters=letters;window.ready=true;
function pointRay(e){
 const box=canvas.getBoundingClientRect();pointer.set((e.clientX-box.left)/box.width*2-1,1-(e.clientY-box.top)/box.height*2);
 scene.updateMatrixWorld(true);raycaster.setFromCamera(pointer,camera);
}
function locate(e){
 pointRay(e);
 const hit=raycaster.intersectObjects(letters.meshes)[0];if(hit)return{index:hit.object.userData.letterIndex,point:hit.point};
 // A forgiving volume also catches the glass openings and loosened data.
 let closest=null;const normal=camera.getWorldDirection(new T.Vector3());
 for(const mesh of letters.meshes){
  const centre=mesh.getWorldPosition(new T.Vector3()),plane=new T.Plane().setFromNormalAndCoplanarPoint(normal,centre),point=raycaster.ray.intersectPlane(plane,new T.Vector3());
  if(!point)continue;const local=mesh.worldToLocal(point.clone()).addScaledVector(mesh.material.uniforms.uDrag.value,-.8),spread=mesh.material.uniforms.uScatter.value*.5;
  if(Math.abs(local.x)<1.6+spread&&Math.abs(local.y)<2.05+spread&&Math.abs(local.z)<.95+spread){const distance=local.lengthSq();if(!closest||distance<closest.distance)closest={index:mesh.userData.letterIndex,point,distance};}
 }
 return closest;
}
function move(e){
 if(lastTime<settledAt)return;if(pointerId!==null&&pointerId!==e.pointerId)return;
 if(pointerId!==null){
  pointRay(e);
  if(raycaster.ray.intersectPlane(dragPlane,dragPoint))letters.drag(dragDelta.copy(dragPoint).sub(dragOrigin).applyQuaternion(groupInverseRotation));
  canvas.style.cursor='grabbing';
 }else{const hit=locate(e);letters.hover(hit?.index??-1);canvas.style.cursor=hit?'grab':'default';}
 dirty=true;
}
function endGesture(){
 const id=pointerId;pointerId=null;letters.release();letters.hover(-1);canvas.style.cursor='grab';dirty=true;
 if(id!==null&&canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
}
canvas.addEventListener('pointermove',move);
canvas.addEventListener('pointerdown',e=>{
 if(lastTime<settledAt||pointerId!==null||e.button!==0||!e.isPrimary)return;
 const hit=locate(e);if(!hit)return;
 const mesh=letters.meshes[hit.index];
 letters.begin(hit.index,mesh.worldToLocal(hit.point.clone()));
 dragOrigin.copy(hit.point);dragPlane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new T.Vector3()),dragOrigin);
 letters.group.getWorldQuaternion(groupInverseRotation).invert();pointerId=e.pointerId;
 canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});e.preventDefault();canvas.style.cursor='grabbing';dirty=true;
});
canvas.addEventListener('pointerup',e=>{if(e.pointerId===pointerId)endGesture();});
canvas.addEventListener('pointercancel',e=>{if(e.pointerId===pointerId)endGesture();});
canvas.addEventListener('lostpointercapture',e=>{if(e.pointerId===pointerId)endGesture();});
canvas.addEventListener('pointerleave',()=>{if(pointerId===null){letters.hover(-1);dirty=true;}});
addEventListener('blur',endGesture);
document.addEventListener('visibilitychange',()=>{if(document.hidden)endGesture();});
canvas.addEventListener('keydown',e=>{
 if(lastTime<settledAt)return;const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,1],ArrowDown:[0,-1]};
 if(directions[e.key]){e.preventDefault();endGesture();letters.nudge(...directions[e.key]);dirty=true;}
 if(e.key==='Home'){e.preventDefault();endGesture();letters.reset();dirty=true;}
});
function restart(){endGesture();letters.reset();interactionClock=0;start=performance.now();pausedAt=0;paused=false;dirty=true;if(pause)pause.textContent='Pause';}
replay?.addEventListener('click',restart);
pause?.addEventListener('click',()=>{if(paused){start=performance.now()-pausedAt;paused=false;pause.textContent='Pause'}else{pausedAt=performance.now()-start;paused=true;pause.textContent='Resume'}dirty=true;});
addEventListener('resize',()=>{
 if(manual)return;endGesture();W=crispWidth();H=W*9/16;renderer.setSize(W,H);camera.aspect=W/H;camera.updateProjectionMatrix();letters.resize(H);basin.resize?.(H);dyad.resize?.(H);dirty=true;
});
window.renderFrame(0);
if(!manual){
 if(reducedMotion){paused=true;pausedAt=settledAt*1000;window.renderFrame(settledAt);if(pause)pause.textContent='Resume';}
 new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;dirty=true;},{rootMargin:'120px'}).observe(mount);
 function frame(now){
  const dt=Math.min(.05,Math.max(0,(now-lastTick)/1000));lastTick=now;
  if(inView&&!document.hidden){
   const moving=letters.isMoving(),elapsed=paused?pausedAt/1000:(now-start)/1000;
   if(lastTime>=settledAt&&moving)interactionClock+=dt;
   if(elapsed<settledAt||lastTime<settledAt||moving||dirty)window.renderFrame(elapsed,elapsed,dt);
  }
  requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
}
