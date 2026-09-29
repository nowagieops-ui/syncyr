(() => {
  'use strict';
  // Progressive enhancement: every biography and chapter link works without JS.
  const chapters = [...document.querySelectorAll('.bio-chapter')];
  const links = [...document.querySelectorAll('.bio-toc ol a')];
  if (chapters.length && 'IntersectionObserver' in window) {
    const visible = new Set();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target));
      const current = chapters.find(chapter => visible.has(chapter));
      links.forEach(link => {
        if (current && link.getAttribute('href') === '#' + current.id) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }, {rootMargin: '-5% 0px -45% 0px', threshold: 0});
    chapters.forEach(chapter => observer.observe(chapter));
  }

  const hero = document.querySelector('.intro-luminous');
  const art = document.querySelector('.constellation-art');
  const flowCanvas = document.getElementById('constellation-flow');
  const trailCanvas = document.getElementById('light-trail');
  const toggle = document.querySelector('.motion-toggle');
  const portraits = [...document.querySelectorAll('.portrait-touch')];
  if (!hero || !flowCanvas || !trailCanvas) return;
  const flow = flowCanvas.getContext('2d');
  const ink = trailCanvas.getContext('2d');
  if (!flow || !ink) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(pointer: fine)');
  const palette = ['195,224,255','233,241,255','166,186,248','183,160,232','216,209,192'];
  const particles = [];
  const wake = [];
  const portraitTimers = new Map();
  let viewportW = 0, viewportH = 0, fieldW = 0, fieldH = 0;
  let heroVisible = true, userPaused = false, frameId = 0, previous = 0, clock = 0;
  let lastPointer = null, lastEmission = 0, lastHeroBurst = 0, settledFrames = 0;
  const enabled = () => !reduce.matches && !userPaused && !document.hidden;
  const random = (a,b) => a + Math.random()*(b-a);
  const rgba = (c,a) => `rgba(${c},${Math.max(0,Math.min(1,a))})`;

  function sizeCanvas(canvas,context,width,height){
    const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(6000000 / Math.max(1, width*height)));
    canvas.width = Math.round(width*dpr); canvas.height = Math.round(height*dpr);
    context.setTransform(dpr,0,0,dpr,0,0);
  }
  function resize(){
    viewportW=window.innerWidth;viewportH=window.innerHeight;
    const rect=art.getBoundingClientRect();fieldW=rect.width;fieldH=rect.height;
    sizeCanvas(trailCanvas,ink,viewportW,viewportH);sizeCanvas(flowCanvas,flow,fieldW,fieldH);
    particles.length=0;wake.length=0;lastPointer=null;
    start();
  }
  function seed(x,y,{burst=false,angle=null}={}){
    if(particles.length>=150)particles.shift();
    const a=angle===null?random(0,Math.PI*2):angle;
    const speed=burst?random(34,110):random(4,19);
    particles.push({x,y,px:x,py:y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed-(burst?16:6),age:0,life:burst?random(.7,1.5):random(.25,.7),size:burst?random(.75,1.9):random(.45,1.05),colour:palette[Math.floor(random(0,palette.length))],spark:burst&&Math.random()>.72});
  }
  function flourish(x,y){
    if(!enabled())return;
    for(let i=0;i<38;i++)seed(x,y,{burst:true,angle:i/38*Math.PI*2+random(-.08,.08)});
    start();
  }
  function sparkle(context,x,y,size,colour,alpha,ray=false){
    context.fillStyle=rgba(colour,alpha);
    context.beginPath();context.arc(x,y,size,0,Math.PI*2);context.fill();
    if(ray){
      context.strokeStyle=rgba(colour,alpha*.65);context.lineWidth=.55;
      context.beginPath();context.moveTo(x-size*3,y);context.lineTo(x+size*3,y);context.moveTo(x,y-size*3);context.lineTo(x,y+size*3);context.stroke();
    }
  }
  function drawTrail(dt){
    ink.clearRect(0,0,viewportW,viewportH);
    ink.globalCompositeOperation='lighter';
    for(let i=wake.length-1;i>=0;i--){wake[i].age+=dt;if(wake[i].age>.33)wake.splice(i,1);}
    if(wake.length>1){
      for(let pass=0;pass<2;pass++){
        ink.lineWidth=pass?1:5;ink.lineCap='round';
        for(let i=1;i<wake.length;i++){
          const a=wake[i-1],b=wake[i],alpha=(1-b.age/.33)*(pass?.48:.06);
          ink.strokeStyle=rgba('164,207,255',alpha);ink.beginPath();ink.moveTo(a.x,a.y);ink.lineTo(b.x,b.y);ink.stroke();
        }
      }
      const tip=wake[wake.length-1];sparkle(ink,tip.x,tip.y,1.25,'235,245,255',Math.max(0,1-tip.age/.33),false);
    }
    for(let i=particles.length-1;i>=0;i--){
      const p=particles[i];p.age+=dt;if(p.age>=p.life){particles.splice(i,1);continue;}
      p.px=p.x;p.py=p.y;p.vx*=Math.pow(.42,dt);p.vy+=9*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
      const fade=Math.pow(1-p.age/p.life,1.35);
      ink.strokeStyle=rgba(p.colour,fade*.35);ink.lineWidth=p.size*.7;ink.beginPath();ink.moveTo(p.px,p.py);ink.lineTo(p.x,p.y);ink.stroke();
      sparkle(ink,p.x,p.y,p.size,p.colour,fade*.85,p.spark);
    }
    ink.globalCompositeOperation='source-over';
  }
  // Parametric light path: a gentle rising sweep, never an infinity/ring.
  function point(t,phase){
    return {x:fieldW*(.38+t*.5),y:fieldH*(.82-t*.7+Math.sin(t*Math.PI*2+phase)*.022)};
  }
  function drawField(){
    flow.clearRect(0,0,fieldW,fieldH);flow.globalCompositeOperation='lighter';
    for(let strand=0;strand<2;strand++){
      const phase=clock*.17+strand*.7;
      for(let pass=0;pass<2;pass++){
        flow.beginPath();
        for(let i=0;i<=80;i++){
          const p=point(i/80,phase);p.y+=strand*8;
          if(!i)flow.moveTo(p.x,p.y);else flow.lineTo(p.x,p.y);
        }
        flow.strokeStyle=pass?'rgba(165,205,251,.12)':'rgba(126,166,241,.025)';flow.lineWidth=pass?.7:6;flow.stroke();
      }
      for(let j=0;j<8;j++){
        const t=(j/8+clock*.037+strand*.04)%1,p=point(t,phase);
        const edge=Math.sin(t*Math.PI);p.y+=strand*8;
        sparkle(flow,p.x,p.y,1.1,'202,227,255',edge*.52,j%3===0);
      }
    }
    flow.globalCompositeOperation='source-over';
  }
  function tick(now){
    frameId=0;if(!enabled()){clear();return;}
    const dt=Math.min((now-(previous||now))/1000,.04);previous=now;clock+=dt;
    if(heroVisible)drawField();
    drawTrail(dt);
    if(heroVisible||particles.length||wake.length){settledFrames=0;frameId=requestAnimationFrame(tick);}
    else if(settledFrames++<1)frameId=requestAnimationFrame(tick);
    else previous=0;
  }
  function start(){if(enabled()&&!frameId){previous=0;frameId=requestAnimationFrame(tick);}}
  function clear(){
    if(frameId)cancelAnimationFrame(frameId);frameId=0;previous=0;
    particles.length=0;wake.length=0;lastPointer=null;
    ink.clearRect(0,0,viewportW,viewportH);flow.clearRect(0,0,fieldW,fieldH);
  }
  function syncMotion(){
    document.body.classList.toggle('motion-paused',!enabled());
    if(toggle){toggle.hidden=reduce.matches;toggle.textContent=userPaused?'Play motion':'Pause motion';toggle.setAttribute('aria-label',userPaused?'Play decorative lighting effects':'Pause decorative lighting effects');}
    if(enabled())start();else{
      clear();art.style.setProperty('--art-x','0px');art.style.setProperty('--art-y','0px');
      portraits.forEach(p=>p.classList.remove('is-illuminated'));
    }
  }
  if(toggle)toggle.addEventListener('click',()=>{userPaused=!userPaused;syncMotion();});
  reduce.addEventListener('change',syncMotion);document.addEventListener('visibilitychange',syncMotion);
  window.addEventListener('resize',resize,{passive:true});
  document.addEventListener('scroll',()=>{lastPointer=null;wake.length=0;particles.length=0;ink.clearRect(0,0,viewportW,viewportH);},{passive:true});
  if('IntersectionObserver' in window){
    new IntersectionObserver(entries=>{
      heroVisible=entries[0].isIntersecting;
      if(heroVisible)start();else flow.clearRect(0,0,fieldW,fieldH);
    }).observe(hero);
  }
  document.addEventListener('pointermove',event=>{
    if(!enabled()||!finePointer.matches||event.pointerType==='touch')return;
    const target=event.target instanceof Element?event.target.closest('.portrait-touch,.intro-luminous'):null;
    if(!target){lastPointer=null;return;}
    const now=performance.now(),x=event.clientX,y=event.clientY;
    if(lastPointer&&Math.hypot(x-lastPointer.x,y-lastPointer.y)>180)wake.length=0;
    if(now-lastEmission>18){
      wake.push({x,y,age:0});if(wake.length>20)wake.shift();
      seed(x+random(-2,2),y+random(-2,2));lastEmission=now;
    }
    lastPointer={x,y};start();
    if(target===hero){
      const r=hero.getBoundingClientRect();
      art.style.setProperty('--art-x',`${((x-r.left)/r.width-.5)*12}px`);
      art.style.setProperty('--art-y',`${((y-r.top)/r.height-.5)*8}px`);
    }
  },{passive:true});
  hero.addEventListener('pointerleave',()=>{art.style.setProperty('--art-x','0px');art.style.setProperty('--art-y','0px');lastPointer=null;});
  hero.addEventListener('click',event=>{
    if(event.target.closest('a,button')||performance.now()-lastHeroBurst<120)return;
    lastHeroBurst=performance.now();flourish(event.clientX,event.clientY);
  });
  portraits.forEach(button=>{
    button.addEventListener('pointermove',event=>{
      if(!enabled()||event.pointerType==='touch')return;
      const r=button.getBoundingClientRect();button.style.setProperty('--glow-x',`${(event.clientX-r.left)/r.width*100}%`);button.style.setProperty('--glow-y',`${(event.clientY-r.top)/r.height*100}%`);
    },{passive:true});
    button.addEventListener('click',event=>{
      if(!enabled())return;
      const r=button.getBoundingClientRect();
      const keyboard=event.detail===0;
      flourish(keyboard?r.left+r.width*.5:event.clientX,keyboard?r.top+r.height*.7:event.clientY);
      const prior=portraitTimers.get(button);if(prior)clearTimeout(prior);
      button.classList.remove('is-illuminated');
      requestAnimationFrame(()=>{if(enabled())button.classList.add('is-illuminated');});
      portraitTimers.set(button,setTimeout(()=>{button.classList.remove('is-illuminated');portraitTimers.delete(button);},1200));
    });
  });
  resize();syncMotion();
})();
