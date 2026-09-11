import {heatTotal} from './topic-heat.mjs';
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

let refreshingHeat=false;
async function refreshHeat(){
 if(refreshingHeat||document.hidden)return;refreshingHeat=true;
 try{
  const r=await fetch(new URL('../topic-heat.json?t='+Date.now(),import.meta.url),{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Heat unavailable');
  const data=await r.json(),total=heatTotal(data),lang=document.documentElement.lang;
  const links=[...document.querySelectorAll('.heat-popover li a')];
  if(links.length!==data.posts.length||links.some((a,i)=>a.href!==data.posts[i].url))throw Error('Source mismatch');
  document.querySelector('.heat-metric strong').textContent=new Intl.NumberFormat(lang,{notation:'compact',maximumFractionDigits:1}).format(total);
  const date=document.querySelector('.heat-popover time');date.dateTime=data.observedAt;date.textContent=new Intl.DateTimeFormat(lang,{dateStyle:'medium',timeStyle:'short'}).format(new Date(data.observedAt));
  links.forEach((a,i)=>{a.textContent='@'+new URL(data.posts[i].url).pathname.split('/')[1]+' · '+new Intl.NumberFormat(lang).format(data.posts[i].views)+' ↗';});
 }catch{}finally{refreshingHeat=false;}
}
window.addEventListener('reset-data-updated',refreshHeat);refreshHeat();
