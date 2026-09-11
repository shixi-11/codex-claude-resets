import './topic-heat-client.mjs';
import {postText} from './post-text.mjs';
import {visitorCopy} from './visitor-copy.mjs';
import {postPlatform} from './evidence.mjs';
import {earlierPosts} from './priority-details.mjs';
import { offers } from './offers.mjs';
import { escapeHtml as e, eventPath } from './shared.mjs';
import { freshness } from './shared.mjs';
import { pageData } from './live-data.mjs';
const {lang,t,health,url}=pageData;
document.querySelector('.language select').addEventListener('change',e=>location.assign(e.target.value));
document.querySelectorAll('time[datetime]').forEach(el=>{const at=Date.parse(el.dateTime);if(Number.isFinite(at))el.textContent=new Intl.DateTimeFormat(lang,{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZoneName:'shortOffset'}).format(at);});
const showHealth=()=>{const state=freshness(health),label=document.querySelector('[data-health]');if(label){label.hidden=state==='fresh';label.textContent=state==='stale'?visitorCopy[lang].stale:visitorCopy[lang].failed;}};showHealth();setInterval(showHealth,60000);
let rows=[...document.querySelectorAll('.event-row')];let activePlatform='all',limit=3;
const filter=()=>{const now=Date.now();const matches=rows.filter(el=>{const at=Date.parse(el.querySelector('time[datetime]')?.dateTime);return at<=now&&at>=now-7*86400000;}).sort((a,b)=>Date.parse(b.querySelector('time').dateTime)-Date.parse(a.querySelector('time').dateTime)).filter(el=>(activePlatform==='all'||el.dataset.platformFeed===activePlatform));matches.forEach(el=>el.parentNode.append(el));rows.forEach(el=>el.hidden=!matches.slice(0,limit).includes(el));const more=document.querySelector('.more');if(more)more.hidden=matches.length<=limit;const empty=document.querySelector('.empty');if(empty)empty.hidden=matches.length>0;};
document.querySelector('.more')?.addEventListener('click',()=>{limit+=5;filter();});filter();setInterval(filter,60000);
document.querySelector('[data-share]')?.addEventListener('click',async()=>{try{if(navigator.share)await navigator.share({title:document.title,url});else{await navigator.clipboard.writeText(url);const toast=document.querySelector('.toast');toast.textContent=t.copied;toast.hidden=false;setTimeout(()=>toast.hidden=true,2500);}}catch{}});

// Public announcement clocks never use the personal timer's local-storage value.
import { offerStatus } from './reset-status.mjs';
import { platformCopy } from './platform-copy.mjs';
const platformData = pageData.platforms;
const publicTick = () => document.querySelectorAll('[data-offer-platform]').forEach(card => {
  const copy = platformCopy[lang];
  const offer = platformData[card.dataset.offerPlatform].gifts[0];
  const offerLabel = card.querySelector('[data-offer-status]');
  if(offerLabel){let status=offerStatus(offer);if(status==="active"&&platformData[card.dataset.offerPlatform].promotionHealth?.state!=="fresh")status="stale";offerLabel.hidden=status==='active';offerLabel.textContent=status==='active'?'':status==='expired'?copy.expired:copy.staleOffer;card.querySelector('[data-offer]').dataset.state=status;}

});
publicTick();setInterval(publicTick,1000);

document.querySelectorAll('[data-platform-filter]').forEach(button=>button.addEventListener('click',()=>{activePlatform=button.dataset.platformFilter;limit=3;document.querySelectorAll('[data-platform-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));filter();}));

window.addEventListener('reset-data-updated',()=>{showHealth();const time=document.querySelector('[data-health-time]');if(time&&health.lastSuccessAt){time.dateTime=health.lastSuccessAt;time.textContent=new Intl.DateTimeFormat(lang,{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZoneName:'shortOffset'}).format(new Date(health.lastSuccessAt));}publicTick();});

let lastOffers='',lastFeed='';
window.addEventListener('reset-data-updated',()=>{
 const section=document.querySelector('.offers-section');const nextOffers=offers(pageData.platforms,lang);if(section&&lastOffers!==nextOffers){lastOffers=nextOffers;section.outerHTML=nextOffers;document.querySelectorAll('.offers-section time[datetime]').forEach(el=>{if(Number.isFinite(Date.parse(el.dateTime)))el.textContent=new Intl.DateTimeFormat(lang,{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZoneName:'shortOffset'}).format(new Date(el.dateTime));});publicTick();}
 const feed=document.querySelector('.events');if(feed&&pageData.events){const root=new URL('../',import.meta.url);const nextFeed=earlierPosts(pageData.events).map(ev=>{
 const kind=t[ev.kind==='usage'?'usageKind':ev.kind],platform=postPlatform(ev.author);
 return '<article class="event-row" data-kind="'+e(ev.kind)+'" data-platform-feed="'+platform+'"><div class="event-icon" aria-hidden="true">'+({global:'↻',banked:'☆',usage:'↗',signal:'·'}[ev.kind]||'↻')+'</div><div class="event-main"><div class="event-title"><a href="'+new URL(eventPath(lang,ev.id),root)+'">'+e(kind)+'</a><span class="badge '+e(ev.state)+'">'+e(t[ev.state])+'</span></div>'+postText(ev,lang)+'<div class="event-meta"><span>'+(platform==='claude'?'Claude':'Codex')+' · @'+e(ev.author)+'</span><time datetime="'+e(ev.publishedAt)+'">'+e(new Intl.DateTimeFormat(lang,{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZoneName:'shortOffset'}).format(new Date(ev.publishedAt)))+'</time><a href="'+e(ev.sourceUrl)+'" target="_blank" rel="noopener noreferrer">'+e(t.source)+' ↗</a></div></div></article>';
 }).join('');if(lastFeed!==nextFeed){lastFeed=nextFeed;feed.innerHTML=nextFeed;rows=[...feed.querySelectorAll('.event-row')];filter();}}
});

function openArchive(){if(location.hash==='#updates'){const archive=document.querySelector('.tweet-archive');if(archive)archive.open=true;}}
window.addEventListener('hashchange',openArchive);document.querySelectorAll('a[href$="#updates"]').forEach(a=>a.addEventListener('click',()=>{const archive=document.querySelector('.tweet-archive');if(archive)archive.open=true;}));openArchive();
