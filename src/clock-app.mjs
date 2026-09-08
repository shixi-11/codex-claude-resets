import { resetStatus, countdown, localResetTime } from './reset-status.mjs';
import { clockCopy } from './clock-copy.mjs';
import { platformCopy } from './platform-copy.mjs';
import { timerKey, readPersonalClock, validDeadline, personalClockState, alarmCalendar } from './personal-clock.mjs';
const {lang,platforms}=JSON.parse(document.querySelector('#page-data').textContent);
const c=clockCopy[lang], p=platformCopy[lang];
let storage;try{storage=localStorage;}catch{}
const context=()=>{const Audio=window.AudioContext||window.webkitAudioContext;return Audio?new Audio():null;};
let audio;
// A short non-musical alert, activated by an explicit user gesture.
function ring(){if(!audio||audio.state!=='running')return false;for(let i=0;i<3;i++){const o=audio.createOscillator(),g=audio.createGain(),at=audio.currentTime+i*.35;o.type='sine';o.frequency.value=880;g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(.12,at+.015);g.gain.exponentialRampToValueAtTime(.001,at+.22);o.connect(g).connect(audio.destination);o.start(at);o.stop(at+.24);}return true;}
const models=[];
document.querySelectorAll('[data-platform]').forEach(card=>{
 const id=card.dataset.platform, model={id,card,mode:'public',deadline:readPersonalClock(storage,id),armed:null,fired:null};if(model.deadline&&resetStatus(platforms[id].reset).state!=='announced')model.mode='personal';models.push(model);
 const q=s=>card.querySelector(s), form=q('.personal-form'),input=form.querySelector('input');
 function target(){return model.mode==='personal'?model.deadline:Date.parse(resetStatus(platforms[id].reset).at)||0;}
 function disarm(){model.armed=null;q('[data-alarm]').setAttribute('aria-pressed','false');q('[data-alarm] span').textContent=c.alarm;q('.alarm-note').hidden=true;}
 model.disarm=disarm;
 function mode(value){q('.alarm-alert').hidden=true;model.mode=value;disarm();card.querySelectorAll('[data-clock-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.clockMode===value)));tick();}
 function tick(){
  const state=model.mode==='public'?resetStatus(platforms[id].reset):personalClockState(model.deadline), at=target(), running=model.mode==='public'?state.state==='announced':state.state==='running';
  const digits=running?countdown(state.remainingMs).split(':'):model.mode==='personal'&&state.state==='due'?['00','00','00']:['--','--','--'];
  digits.forEach((v,i)=>{const el=q(`[data-digit="${i}"]`);if(el.textContent!==v)el.textContent=v;});
  q('[data-mode-label]').textContent=model.mode==='public'?(state.state==='completed'?c.public:p.next):c.personal;
  q('[data-clock-verdict]').textContent=running?(model.mode==='public'&&platforms[id].reset.approximate?'≈':''):model.mode==='public'?(p[state.state]||p.unknown):(state.state==='due'?c.due:c.empty);
  q('[data-public-time]').textContent=model.mode==='public'&&state.state==='completed'&&platforms[id].reset.publishedAt?`${p.source} · ${localResetTime(platforms[id].reset.publishedAt,lang)}`:at?`${c.nextAt} · ${localResetTime(at,lang)}`:`${p.local} · ${Intl.DateTimeFormat().resolvedOptions().timeZone}`;
  q('[data-clock-note]').textContent=model.mode==='public'?c.publicNote:c.personalNote;
  q('[data-clear-personal]').hidden=model.mode!=='personal'||!model.deadline;
  if(q('[data-public-source]'))q('[data-public-source]').hidden=model.mode!=='public';
  q('[data-clock-calendar]').disabled=!running;q('[data-alarm]').disabled=!running;
  card.dataset.clockState=state.state;card.dataset.clockKind=model.mode;card.querySelectorAll('[data-clock-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.clockMode===model.mode)));q('[data-digit="0"]').style.fontSize=digits[0].length>2?'clamp(26px,4vw,44px)':'';
  if(model.armed&&model.armed.deadline<=Date.now()&&model.fired!==model.armed.deadline){model.fired=model.armed.deadline;q('.alarm-alert').hidden=false;q('.alarm-alert strong').textContent=model.armed.mode==='public'?p.awaitingConfirmation:c.due;if(!ring())q('.alarm-note').textContent=c.soundBlocked;disarm();}
 }
 card.querySelectorAll('[data-clock-mode]').forEach(b=>b.addEventListener('click',()=>mode(b.dataset.clockMode)));
 q('[data-edit-personal]').addEventListener('click',()=>{mode('personal');form.hidden=false;if(model.deadline>Date.now()){const d=new Date(model.deadline);input.value=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}input.focus({preventScroll:true});});
 q('[data-cancel-personal]').addEventListener('click',()=>{form.hidden=true;});
 form.addEventListener('submit',event=>{event.preventDefault();const at=new Date(input.value).getTime();if(!validDeadline(at)){q('.form-error').textContent=c.invalid;q('.form-error').hidden=false;return;}disarm();q('.alarm-alert').hidden=true;model.deadline=at;model.fired=null;try{storage?.setItem(timerKey(id),String(at));}catch{}q('.form-error').hidden=true;form.hidden=true;tick();});
 q('[data-clear-personal]').addEventListener('click',()=>{disarm();q('.alarm-alert').hidden=true;model.deadline=0;try{storage?.removeItem(timerKey(id));if(id==='codex')storage?.removeItem('codex-respawn-timer-v1');}catch{}tick();});
 q('[data-alarm]').addEventListener('click',async()=>{if(model.armed){disarm();return;}try{audio??=context();await audio?.resume();if(!audio||audio.state!=='running')throw Error('audio unavailable');model.armed={deadline:target(),mode:model.mode};model.fired=null;q('[data-alarm]').setAttribute('aria-pressed','true');q('[data-alarm] span').textContent=c.armed;q('.alarm-note').textContent=c.alarmNote;q('.alarm-note').hidden=false;}catch{q('.alarm-note').textContent=c.soundBlocked;q('.alarm-note').hidden=false;}});
 q('[data-dismiss-alarm]').addEventListener('click',()=>q('.alarm-alert').hidden=true);
 q('[data-clock-calendar]').addEventListener('click',()=>{const at=target();if(at<=Date.now())return;const href=URL.createObjectURL(new Blob([alarmCalendar(at,platforms[id].name,model.mode==='personal'?c.due:p.awaitingConfirmation)],{type:'text/calendar;charset=utf-8'})),a=document.createElement('a');a.href=href;a.download=`${id}-reset.ics`;a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);});
 model.tick=tick;tick();
});
function tickAll(){const el=document.querySelector('[data-local-now]');if(el)el.textContent=new Intl.DateTimeFormat(lang,{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZoneName:'short'}).format(new Date());models.forEach(m=>m.tick());}
tickAll();setInterval(tickAll,1000);document.addEventListener('visibilitychange',tickAll);
window.addEventListener('storage',event=>{models.forEach(m=>{if(event.key===timerKey(m.id)||event.key===null){m.deadline=readPersonalClock(storage,m.id);m.disarm();m.tick();}});});
