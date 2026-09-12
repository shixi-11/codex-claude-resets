import {elapsedSince} from './elapsed.mjs';
import { resetStatus, countdown, localResetTime } from './reset-status.mjs';
import { watchCopy } from './watch-copy.mjs';
import { platformCopy } from './platform-copy.mjs';
import { pageData, refreshLiveData } from './live-data.mjs';
import {priorityDetails} from './priority-details.mjs';
const {lang,platforms}=pageData,p=platformCopy[lang],w=watchCopy[lang];
function tickAll(){
 document.querySelectorAll('[data-reset-elapsed]').forEach(el=>{if(el.dataset.resetElapsed)el.textContent=elapsedSince(el.dataset.resetElapsed,lang);});
 const now=document.querySelector('[data-local-now]');if(now)now.textContent=new Intl.DateTimeFormat(lang,{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZoneName:'short'}).format(new Date());
 document.querySelectorAll('[data-platform]').forEach(card=>{
  const q=s=>card.querySelector(s),data=platforms[card.dataset.platform],state=resetStatus(data.reset),at=Date.parse(state.at),running=state.state==='announced';
  q('[data-clock-countdown]').hidden=!running;if(running)countdown(state.remainingMs).split(':').forEach((v,i)=>q(`[data-digit="${i}"]`).textContent=v);
  q('[data-clock-verdict]').textContent=running?'':state.state==='completed'||state.state==='unknown'?w.waiting:p[state.state];q('[data-clock-verdict]').hidden=running;
  q('[data-public-time]').textContent=Number.isFinite(at)?(data.reset.timeBasis==='author-usual-PST'?p.inferredDeadline.replace('{time}',localResetTime(at,lang)):`${data.reset.approximate?'≈ ':''}${localResetTime(at,lang)}`):state.state==='announcedUntimed'?(data.reset.deadlineText==='by midnight today'?p.midnightDeadline:p.unknown):'';
  card.dataset.clockState=state.state;
 });
}
const renderedDetails=new WeakMap();
function updateDetails(){document.querySelectorAll('[data-platform]').forEach(card=>{const box=card.querySelector('[data-priority-details]'),opened=new Set([...box.querySelectorAll('.post-full[open]')].map(el=>el.dataset.postId));const html=priorityDetails(platforms[card.dataset.platform],card.dataset.platform,pageData.events,lang);if(renderedDetails.get(box)===html)return;renderedDetails.set(box,html);box.innerHTML=html;box.querySelectorAll('.post-full').forEach(el=>{el.open=opened.has(el.dataset.postId);});});}
setInterval(tickAll,1000);tickAll();updateDetails();window.addEventListener('reset-data-updated',()=>{tickAll();updateDetails();});document.querySelector('[data-refresh]')?.addEventListener('click',refreshLiveData);
