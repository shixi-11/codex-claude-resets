import {createDrummer} from './drummer-client.mjs';
const button=document.querySelector('[data-heat-follow]');
if(button){
 const drum=createDrummer(document.querySelector('[data-drummer]'));
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 let animation;
 const cue=document.createElement('span');cue.className='heat-cheer-cue';cue.textContent='+1';cue.hidden=true;cue.setAttribute('aria-hidden','true');button.append(cue);
 button.disabled=false;
 button.addEventListener('click',()=>{
  void drum.play();animation?.cancel();cue.hidden=false;
  animation=cue.animate(motion.matches?[{opacity:1},{opacity:0}]:[{opacity:0,transform:'translateY(4px)'},{opacity:1,transform:'translateY(-8px)',offset:.25},{opacity:0,transform:'translateY(-27px)'}],{duration:650,easing:'ease-out'});
  animation.onfinish=()=>{cue.hidden=true;};
 });
 window.addEventListener('pagehide',()=>{animation?.cancel();cue.hidden=true;});
 const details=document.querySelector('.heat-sources');
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&details.open){details.open=false;details.querySelector('summary').focus();}});
 document.addEventListener('click',event=>{if(details.open&&!details.contains(event.target))details.open=false;});
}
