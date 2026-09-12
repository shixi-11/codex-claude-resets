import {topicHeat} from './topic-heat.mjs';
import {priorityDetails} from './priority-details.mjs';
import { escapeHtml as e } from './shared.mjs';
import { platformCopy } from './platform-copy.mjs';
import { clockCopy } from './clock-copy.mjs';
import { watchCopy } from './watch-copy.mjs';
import { resetStatus, localResetTime } from './reset-status.mjs';
export function clockPanel(platforms,lang,base,version,events,heat){
 const t=platformCopy[lang],c=clockCopy[lang],w=watchCopy[lang];
 return `<section class="reset-overview"><div class="overview-title"><div><p class="overview-kicker">CODEX + CLAUDE</p><h1>${e(t.heading)}</h1><p class="overview-intro">${e(w.intro)}</p><p class="local-now"><span class="live-dot"></span>${e(c.localNow)} <time data-local-now></time></p></div><img class="reset-mascot" src="${base}assets/mascot.webp?v=${version}" width="170" height="150" alt=""/></div>${topicHeat(heat,lang,base,version)}<div class="platform-grid">${Object.entries(platforms).map(([id,p])=>{
 const s=resetStatus(p.reset),last=p.lastReset;
 return `<article class="platform-card" data-platform="${id}" data-clock-state="${s.state}"><div class="platform-heading"><h2><span class="platform-symbol" aria-hidden="true">${id==='codex'?'⌘':'✳'}</span>${e(p.name)}</h2></div>
 <div class="clock-face"><div class="clock-status"><span>${e(t.next)}</span><span class="status-led" aria-hidden="true"></span></div><div class="clock-content"><div class="clock-reading"><p class="clock-verdict" data-clock-verdict>${e(s.state==='completed'||s.state==='unknown'?w.waiting:t[s.state])}</p><div class="public-countdown" data-clock-countdown dir="ltr" ${s.state==='announced'?'':'hidden'}>${['--','--','--'].map((n,i)=>`<span class="time-unit"><strong data-digit="${i}">${n}</strong><small>${e([c.hours,c.minutes,c.seconds][i])}</small></span>${i<2?'<span class="clock-colon" aria-hidden="true">:</span>':''}`).join('')}</div><p class="public-reset-time" data-public-time></p></div><div class="station-art" aria-hidden="true"><img src="${base}assets/reset-station.webp" width="240" height="240" alt=""><span class="station-light"></span></div></div></div>
 <div data-priority-details>${priorityDetails(p,id,events,lang)}</div>
 </article>`;
 }).join('')}</div><div class="live-controls"><p data-live-status role="status" hidden></p></div></section>`;
}
