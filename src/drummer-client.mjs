import {drumFrames,drumColumns,drumSize,drumFps} from './drummer-data.mjs';

export function createDrummer(mascot){
 if(!mascot)return {play(){},stop(){}};
 const canvas=mascot.querySelector('canvas'),poster=mascot.querySelector('img');
 const context=canvas.getContext('2d'),motion=matchMedia('(prefers-reduced-motion: reduce)');
 const atlas=new Image(),url=new URL('./drummer-atlas.webp',import.meta.url);
 url.search=new URL(import.meta.url).search;
 atlas.src=url.href;
 const ready=atlas.decode().then(()=>atlas.naturalWidth===drumSize*drumColumns&&atlas.naturalHeight===drumSize*Math.ceil(drumFrames/drumColumns)).catch(()=>false);
 let request=0,generation=0,flash;
 function stop(){
  generation++;cancelAnimationFrame(request);request=0;flash?.cancel();
  canvas.hidden=true;poster.hidden=false;delete mascot.dataset.drumFrame;
 }
 function acknowledge(){flash=mascot.animate?.([{opacity:.65},{opacity:1}],{duration:150});}
 async function play(){
  stop();const ticket=generation;
  if(motion.matches||!context){acknowledge();return;}
  const loaded=await ready;
  if(ticket!==generation)return;
  if(!loaded){acknowledge();return;}
  const began=performance.now();
  poster.hidden=true;canvas.hidden=false;
  function tick(now){
   if(ticket!==generation)return;
   const frame=Math.floor((now-began)*drumFps/1000);
   if(frame>=drumFrames){stop();return;}
   context.clearRect(0,0,drumSize,drumSize);
   context.drawImage(atlas,(frame%drumColumns)*drumSize,Math.floor(frame/drumColumns)*drumSize,drumSize,drumSize,0,0,drumSize,drumSize);
   mascot.dataset.drumFrame=String(frame);
   request=requestAnimationFrame(tick);
  }
  tick(began);
 }
 mascot.disabled=false;
 mascot.addEventListener('click',play);
 window.addEventListener('pagehide',stop);
 motion.addEventListener('change',stop);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 return {play,stop};
}
