import { freshness } from './shared.mjs';
const {lang,t,health,url} = JSON.parse(document.querySelector('#page-data').textContent);
document.querySelector('.language select').addEventListener('change',e=>location.assign(e.target.value));
document.querySelectorAll('time[datetime]').forEach(el=>{const at=Date.parse(el.dateTime);if(Number.isFinite(at))el.textContent=new Intl.DateTimeFormat(lang,{dateStyle:'medium',timeStyle:'short'}).format(at);});
const showHealth=()=>{const state=freshness(health);document.querySelector('[data-health]').textContent=t[state];document.querySelector('.health-dot').className=`health-dot ${state}`;};showHealth();setInterval(showHealth,60000);
const rows=[...document.querySelectorAll('.event-row')];let active='all',activePlatform='all',limit=3;
const filter=()=>{const matches=rows.filter(el=>(active==='all'||el.dataset.kind===active)&&(activePlatform==='all'||el.dataset.platformFeed===activePlatform));rows.forEach(el=>el.hidden=!matches.slice(0,limit).includes(el));const more=document.querySelector('.more');if(more)more.hidden=matches.length<=limit;const empty=document.querySelector('.empty');if(empty)empty.hidden=matches.length>0;};
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{active=button.dataset.filter;limit=3;document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));filter();}));document.querySelector('.more')?.addEventListener('click',()=>{limit+=5;filter();});filter();
document.querySelector('[data-share]')?.addEventListener('click',async()=>{try{if(navigator.share)await navigator.share({title:document.title,url});else{await navigator.clipboard.writeText(url);const toast=document.querySelector('.toast');toast.textContent=t.copied;toast.hidden=false;setTimeout(()=>toast.hidden=true,2500);}}catch{}});

// Public announcement clocks never use the personal timer's local-storage value.
import { offerStatus } from './reset-status.mjs';
import { platformCopy } from './platform-copy.mjs';
const platformData = JSON.parse(document.querySelector('#page-data').textContent).platforms;
const publicTick = () => document.querySelectorAll('[data-offer-platform]').forEach(card => {
  const copy = platformCopy[lang];
  const offer = platformData[card.dataset.offerPlatform].gifts[0];
  const offerLabel = card.querySelector('[data-offer-status]');
  if(offerLabel){let status=offerStatus(offer);if(status==="active"&&platformData[card.dataset.offerPlatform].promotionHealth?.state!=="fresh")status="stale";offerLabel.textContent=status==='active'?'':status==='expired'?copy.expired:copy.staleOffer;card.querySelector('[data-offer]').dataset.state=status;}

});
publicTick();setInterval(publicTick,1000);

document.querySelectorAll('[data-platform-filter]').forEach(button=>button.addEventListener('click',()=>{activePlatform=button.dataset.platformFilter;limit=3;document.querySelectorAll('[data-platform-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));filter();}));
