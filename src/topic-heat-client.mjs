import {heatCopy} from './topic-heat.mjs';
const button=document.querySelector('[data-heat-follow]');
if(button){
 const t=heatCopy[document.documentElement.lang]||heatCopy.en,key='reset-topic-follow',feedback=document.querySelector('#heat-feedback');
 let selected=false;
 const mascot=document.querySelector('[data-drummer]'),motion=matchMedia('(prefers-reduced-motion: reduce)');
 let beats=[];
 const stopBeat=()=>{beats.forEach(animation=>animation.cancel());beats=[];};
 const drum=()=>{
  stopBeat();
  if(!mascot||typeof mascot.animate!=='function')return;
  const animate=(selector,frames)=>{const el=mascot.querySelector(selector);if(el)beats.push(el.animate(frames,{duration:620,easing:'linear',iterations:1}));};
  if(motion.matches){animate('.drummer-impact',[{opacity:0},{opacity:.5,offset:.15},{opacity:0}]);return;}
  animate('.drummer-arm',[
   {transform:'rotate(0deg)',offset:0},{transform:'rotate(-28deg)',offset:.23,easing:'cubic-bezier(.65,0,.95,.55)'},
   {transform:'rotate(90deg)',offset:.40},{transform:'rotate(48deg)',offset:.58,easing:'ease-out'},
   {transform:'rotate(0deg)',offset:1}
  ]);
  animate('.drummer-body',[{transform:'translateY(0)',offset:0},{transform:'translateY(-2px)',offset:.23},{transform:'translateY(2px)',offset:.40},{transform:'translateY(0)',offset:.72},{transform:'translateY(0)',offset:1}]);
  animate('.drummer-drum',[{transform:'scale(1,1)',offset:0},{transform:'scale(1,1)',offset:.37},{transform:'scale(1.05,.83)',offset:.43},{transform:'scale(.98,1.06)',offset:.60},{transform:'scale(1,1)',offset:1}]);
  animate('.drummer-impact',[{opacity:0,transform:'translateY(2px)',offset:0},{opacity:0,transform:'translateY(2px)',offset:.38},{opacity:1,transform:'translateY(0)',offset:.42},{opacity:0,transform:'translateY(-5px)',offset:.75},{opacity:0,offset:1}]);
 };
 if(mascot){mascot.disabled=false;mascot.addEventListener('click',drum);}
 window.addEventListener('pagehide',stopBeat);
 motion.addEventListener('change',stopBeat);
 const render=()=>{button.setAttribute('aria-pressed',String(selected));button.querySelector('[data-heat-icon]').textContent=selected?'♥':'♡';button.querySelector('[data-heat-label]').textContent=t[selected?4:3];};
 try{selected=localStorage.getItem(key)==='1';}catch{}
 render();button.disabled=false;
 button.addEventListener('click',()=>{try{const next=!selected;localStorage.setItem(key,next?'1':'0');selected=next;render();if(next)drum();feedback.textContent=t[5];}catch{feedback.textContent=t[6];}feedback.hidden=false;});
 window.addEventListener('storage',event=>{if(event.key===key||event.key===null){selected=event.newValue==='1';render();}});
 const details=document.querySelector('.heat-sources');
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&details.open){details.open=false;details.querySelector('summary').focus();}});
 document.addEventListener('click',event=>{if(details.open&&!details.contains(event.target))details.open=false;});
}
