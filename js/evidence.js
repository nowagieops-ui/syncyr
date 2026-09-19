/* Progressive enhancement only. Papers, details, downloads and contact work without JS. */
(function(){
 'use strict';
 var root=document.getElementById('syncyr-evidence');
 if(!root||root.dataset.enhanced)return;
 root.dataset.enhanced='true';
 var media=window.matchMedia('(prefers-reduced-motion: reduce)');
 var artworks=Array.from(root.querySelectorAll('[data-illuminate]'));
 function updateMotion(){artworks.forEach(function(art){art.classList.toggle('ev-motion-disabled',media.matches);});}
 updateMotion();
 if(media.addEventListener)media.addEventListener('change',updateMotion);
 else if(media.addListener)media.addListener(updateMotion);
 function visibility(){root.classList.toggle('ev-document-hidden',document.hidden);}
 document.addEventListener('visibilitychange',visibility);visibility();
 artworks.forEach(function(art){
  function point(e){if(media.matches)return;var b=art.getBoundingClientRect();if(!b.width||!b.height)return;art.style.setProperty('--ev-x',Math.max(0,Math.min(100,(e.clientX-b.left)/b.width*100))+'%');art.style.setProperty('--ev-y',Math.max(0,Math.min(100,(e.clientY-b.top)/b.height*100))+'%');}
  art.addEventListener('pointermove',point,{passive:true});
  art.addEventListener('pointerdown',function(e){point(e);if(!media.matches)art.classList.add('ev-touch');},{passive:true});
  ['pointerleave','pointerup','pointercancel'].forEach(function(event){art.addEventListener(event,function(){art.classList.remove('ev-touch');},{passive:true});});
 });
 if('IntersectionObserver' in window){
  var observer=new IntersectionObserver(function(entries){entries.forEach(function(entry){entry.target.classList.toggle('ev-offscreen',!entry.isIntersecting);if(entry.isIntersecting)entry.target.classList.add('ev-arrived');});},{threshold:.18});
  artworks.forEach(function(art){observer.observe(art);});
 }else{artworks.forEach(function(art){art.classList.add('ev-arrived');});}
 root.querySelectorAll('a[href="#ev-testing"]').forEach(function(link){link.addEventListener('click',function(){var panel=root.querySelector('#ev-testing');if(panel)panel.open=true;});});
})();
