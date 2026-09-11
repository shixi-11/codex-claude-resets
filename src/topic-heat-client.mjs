import {heatCopy} from './topic-heat.mjs';
const button=document.querySelector('[data-heat-follow]');
if(button){
 const t=heatCopy[document.documentElement.lang]||heatCopy.en,key='reset-topic-follow',feedback=document.querySelector('#heat-feedback');
 let selected=false;
 const render=()=>{button.setAttribute('aria-pressed',String(selected));button.querySelector('[data-heat-icon]').textContent=selected?'♥':'♡';button.querySelector('[data-heat-label]').textContent=t[selected?4:3];};
 try{selected=localStorage.getItem(key)==='1';}catch{}
 render();button.disabled=false;
 button.addEventListener('click',()=>{try{const next=!selected;localStorage.setItem(key,next?'1':'0');selected=next;render();feedback.textContent=t[5];}catch{feedback.textContent=t[6];}feedback.hidden=false;});
 window.addEventListener('storage',event=>{if(event.key===key||event.key===null){selected=event.newValue==='1';render();}});
 const details=document.querySelector('.heat-sources');
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&details.open){details.open=false;details.querySelector('summary').focus();}});
 document.addEventListener('click',event=>{if(details.open&&!details.contains(event.target))details.open=false;});
}
