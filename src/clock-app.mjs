import { resetStatus, countdown, localResetTime } from './reset-status.mjs';
import { watchCopy } from './watch-copy.mjs';
import { platformCopy } from './platform-copy.mjs';
import { pageData, refreshLiveData } from './live-data.mjs';
import {priorityDetails} from './priority-details.mjs';
const {lang,platforms}=pageData,p=platformCopy[lang],w=watchCopy[lang];
function tickAll(){
 const now=document.querySelector('[data-local-now]');if(now)now.textContent=new Intl.DateTimeFormat(lang,{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZoneName:'short'}).format(new Date());
 document.querySelectorAll('[data-platform]').forEach(card=>{
  const q=s=>card.querySelector(s),data=platforms[card.dataset.platform],state=resetStatus(data.reset),at=Date.parse(state.at),running=state.state==='announced';
  q('[data-clock-countdown]').hidden=!running;if(running)countdown(state.remainingMs).split(':').forEach((v,i)=>q(`[data-digit="${i}"]`).textContent=v);
  q('[data-clock-verdict]').textContent=running?'':state.state==='completed'||state.state==='unknown'?w.waiting:p[state.state];q('[data-clock-verdict]').hidden=running;
  q('[data-public-time]').textContent=Number.isFinite(at)?`${data.reset.approximate?'≈ ':''}${localResetTime(at,lang)}`:'';
  const link=q('[data-schedule-source]');link.hidden=!Number.isFinite(at);link.href=data.reset.sourceUrl||data.profileUrl;link.target='_blank';link.rel='noopener noreferrer';
  card.dataset.clockState=state.state;
 });
}
const renderedDetails=new WeakMap();
function updateDetails(){document.querySelectorAll('[data-platform]').forEach(card=>{const box=card.querySelector('[data-priority-details]'),open=box.querySelector('details')?.open;const html=priorityDetails(platforms[card.dataset.platform],card.dataset.platform,pageData.events,lang);if(renderedDetails.get(box)===html)return;renderedDetails.set(box,html);box.innerHTML=html;if(typeof open==='boolean'&&box.querySelector('details'))box.querySelector('details').open=open;});}
setInterval(tickAll,1000);tickAll();updateDetails();window.addEventListener('reset-data-updated',()=>{tickAll();updateDetails();});document.querySelector('[data-refresh]')?.addEventListener('click',refreshLiveData);
