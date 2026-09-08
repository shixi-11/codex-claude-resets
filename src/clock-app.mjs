import { resetStatus, countdown, localResetTime } from './reset-status.mjs';
import { clockCopy } from './clock-copy.mjs';
import { watchCopy } from './watch-copy.mjs';
import { platformCopy } from './platform-copy.mjs';
import { calendarFile } from './shared.mjs';
import { pageData, refreshLiveData } from './live-data.mjs';
const {lang,platforms}=pageData,c=clockCopy[lang],p=platformCopy[lang],w=watchCopy[lang];
let audio;
// Non-musical alert sound. Audio is unlocked only by the notification button.
function ring(){if(!audio||audio.state!=='running')return;for(let i=0;i<3;i++){const o=audio.createOscillator(),g=audio.createGain(),at=audio.currentTime+i*.35;o.frequency.value=880;g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(.1,at+.015);g.gain.exponentialRampToValueAtTime(.001,at+.22);o.connect(g).connect(audio.destination);o.start(at);o.stop(at+.24);}}
const signature=r=>JSON.stringify([r?.state,r?.resetAt,r?.sourceUrl]);
const models=[];
document.querySelectorAll('[data-platform]').forEach(card=>{
 const id=card.dataset.platform,q=s=>card.querySelector(s),model={id,watching:false,seen:signature(platforms[id].reset),last:platforms[id].lastReset?.id,fired:new Set()};models.push(model);
 const alert=text=>{q('.alarm-alert strong').textContent=text;q('.alarm-alert').hidden=false;ring();};
 function tick(){
  const data=platforms[id],state=resetStatus(data.reset),at=Date.parse(state.at),running=state.state==='announced';
  const sig=signature(data.reset),last=data.lastReset?.id;
  if(model.watching){
   if(last&&last!==model.last)alert(w.newReset);
   else if(sig!==model.seen)alert(w.changed);
   if(state.state==='awaitingConfirmation'&&!model.fired.has(sig)){model.fired.add(sig);alert(p.awaitingConfirmation);}
  }
  model.seen=sig;model.last=last;
  q('[data-clock-countdown]').hidden=!running;
  if(running)countdown(state.remainingMs).split(':').forEach((v,i)=>q(`[data-digit="${i}"]`).textContent=v);
  q('[data-clock-verdict]').textContent=running?'':state.state==='completed'||state.state==='unknown'?w.waiting:p[state.state];
  q('[data-clock-verdict]').hidden=running;
  q('[data-public-time]').textContent=Number.isFinite(at)?`${data.reset.approximate?'≈ ':''}${localResetTime(at,lang)}`:'';
  q('[data-clock-calendar]').hidden=!running;
  const source=q('[data-public-source]');source.hidden=!data.reset.sourceUrl;source.href=data.reset.sourceUrl||data.profileUrl;
  const lastLink=q('[data-last-reset]');lastLink.textContent=data.lastReset?localResetTime(data.lastReset.publishedAt,lang)+' ↗':w.noHistory;lastLink.href=data.lastReset?.sourceUrl||data.profileUrl;
  card.dataset.clockState=state.state;card.dataset.watching=String(model.watching);
 }
 q('[data-alarm]').addEventListener('click',async()=>{
  model.watching=!model.watching;model.seen=signature(platforms[id].reset);model.last=platforms[id].lastReset?.id;
  // Arming after a scheduled time has elapsed must not ring for a historical event.
  if(resetStatus(platforms[id].reset).state==='awaitingConfirmation')model.fired.add(model.seen);
  q('[data-alarm]').setAttribute('aria-pressed',String(model.watching));q('[data-alarm] span').textContent=model.watching?w.watching:w.watch;q('.alarm-note').hidden=!model.watching;q('.alarm-note').textContent=w.note;
  if(model.watching){try{const Audio=window.AudioContext||window.webkitAudioContext;audio??=Audio?new Audio():null;await audio?.resume();if(audio?.state!=='running')q('.alarm-note').textContent=w.note+' '+c.soundBlocked;}catch{q('.alarm-note').textContent=w.note+' '+c.soundBlocked;}}
  tick();
 });
 q('[data-dismiss-alarm]').addEventListener('click',()=>q('.alarm-alert').hidden=true);
 q('[data-clock-calendar]').addEventListener('click',()=>{const state=resetStatus(platforms[id].reset);if(state.state!=='announced')return;const href=URL.createObjectURL(new Blob([calendarFile(Date.parse(state.at),platforms[id].name+' · '+p.awaitingConfirmation,platforms[id].reset.sourceUrl)],{type:'text/calendar;charset=utf-8'})),a=document.createElement('a');a.href=href;a.download=`${id}-reset.ics`;a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);});
 model.tick=tick;tick();
});
function tickAll(){const el=document.querySelector('[data-local-now]');if(el)el.textContent=new Intl.DateTimeFormat(lang,{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZoneName:'short'}).format(new Date());models.forEach(m=>m.tick());}
setInterval(tickAll,1000);tickAll();window.addEventListener('reset-data-updated',tickAll);
document.querySelector('[data-refresh]')?.addEventListener('click',refreshLiveData);
