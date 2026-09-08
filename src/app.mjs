import { offers } from './offers.mjs';
import { escapeHtml as e, eventPath } from './shared.mjs';
import { freshness } from './shared.mjs';
import { pageData } from './live-data.mjs';
const {lang,t,health,url}=pageData;
document.querySelector('.language select').addEventListener('change',e=>location.assign(e.target.value));
document.querySelectorAll('time[datetime]').forEach(el=>{const at=Date.parse(el.dateTime);if(Number.isFinite(at))el.textContent=new Intl.DateTimeFormat(lang,{dateStyle:'medium',timeStyle:'short'}).format(at);});
const showHealth=()=>{const state=freshness(health);document.querySelector('[data-health]').textContent=t[state];document.querySelector('.health-dot').className=`health-dot ${state}`;};showHealth();setInterval(showHealth,60000);
let rows=[...document.querySelectorAll('.event-row')];let active='all',activePlatform='all',limit=3;
const filter=()=>{const matches=rows.filter(el=>(active==='all'||el.dataset.kind===active)&&(activePlatform==='all'||el.dataset.platformFeed===activePlatform));rows.forEach(el=>el.hidden=!matches.slice(0,limit).includes(el));const more=document.querySelector('.more');if(more)more.hidden=matches.length<=limit;const empty=document.querySelector('.empty');if(empty)empty.hidden=matches.length>0;};
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{active=button.dataset.filter;limit=3;document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));filter();}));document.querySelector('.more')?.addEventListener('click',()=>{limit+=5;filter();});filter();
document.querySelector('[data-share]')?.addEventListener('click',async()=>{try{if(navigator.share)await navigator.share({title:document.title,url});else{await navigator.clipboard.writeText(url);const toast=document.querySelector('.toast');toast.textContent=t.copied;toast.hidden=false;setTimeout(()=>toast.hidden=true,2500);}}catch{}});

// Public announcement clocks never use the personal timer's local-storage value.
import { offerStatus } from './reset-status.mjs';
import { platformCopy } from './platform-copy.mjs';
const platformData = pageData.platforms;
const publicTick = () => document.querySelectorAll('[data-offer-platform]').forEach(card => {
  const copy = platformCopy[lang];
  const offer = platformData[card.dataset.offerPlatform].gifts[0];
  const offerLabel = card.querySelector('[data-offer-status]');
  if(offerLabel){let status=offerStatus(offer);if(status==="active"&&platformData[card.dataset.offerPlatform].promotionHealth?.state!=="fresh")status="stale";offerLabel.textContent=status==='active'?'':status==='expired'?copy.expired:copy.staleOffer;card.querySelector('[data-offer]').dataset.state=status;}

});
publicTick();setInterval(publicTick,1000);

document.querySelectorAll('[data-platform-filter]').forEach(button=>button.addEventListener('click',()=>{activePlatform=button.dataset.platformFilter;limit=3;document.querySelectorAll('[data-platform-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));filter();}));

window.addEventListener('reset-data-updated',()=>{showHealth();const time=document.querySelector('[data-health-time]');if(time&&health.lastSuccessAt){time.dateTime=health.lastSuccessAt;time.textContent=new Intl.DateTimeFormat(lang,{dateStyle:'medium',timeStyle:'short'}).format(new Date(health.lastSuccessAt));}publicTick();});

window.addEventListener('reset-data-updated',()=>{
 const section=document.querySelector('.offers-section');if(section){section.outerHTML=offers(pageData.platforms,lang);document.querySelectorAll('.offers-section time[datetime]').forEach(el=>{if(Number.isFinite(Date.parse(el.dateTime)))el.textContent=new Intl.DateTimeFormat(lang,{dateStyle:'medium',timeStyle:'short'}).format(new Date(el.dateTime));});publicTick();}
 const feed=document.querySelector('.events');if(feed&&pageData.events){const root=new URL('../',import.meta.url);feed.innerHTML=pageData.events.map(ev=>{
 const kind=t[ev.kind==='usage'?'usageKind':ev.kind],platform=['claudedevs','anthropicai','claudeai'].includes(ev.author.toLowerCase())?'claude':'codex';
 return '<article class="event-row" data-kind="'+e(ev.kind)+'" data-platform-feed="'+platform+'"><div class="event-icon" aria-hidden="true">'+({global:'↻',banked:'☆',usage:'↗',signal:'·'}[ev.kind]||'↻')+'</div><div class="event-main"><div class="event-title"><a href="'+new URL(eventPath(lang,ev.id),root)+'">'+e(kind)+'</a><span class="badge '+e(ev.state)+'">'+e(t[ev.state])+'</span></div><p class="excerpt" lang="en" dir="ltr">'+e(ev.excerpt)+'</p><div class="event-meta"><span>'+(platform==='claude'?'Claude':'Codex')+' · @'+e(ev.author)+'</span><time datetime="'+e(ev.publishedAt)+'">'+e(new Intl.DateTimeFormat(lang,{dateStyle:'medium',timeStyle:'short'}).format(new Date(ev.publishedAt)))+'</time><a href="'+e(ev.sourceUrl)+'" target="_blank" rel="noopener noreferrer">'+e(t.source)+' ↗</a></div></div></article>';
 }).join('');rows=[...feed.querySelectorAll('.event-row')];filter();}
});
