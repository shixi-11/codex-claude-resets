import { escapeHtml as e } from './shared.mjs';
import { platformCopy } from './platform-copy.mjs';
import { clockCopy } from './clock-copy.mjs';
import { watchCopy } from './watch-copy.mjs';
import { resetStatus, localResetTime } from './reset-status.mjs';
const bell='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 9a6 6 0 0 1 12 0v5l2 3H4l2-3V9Z"/><path d="M9 20h6M12 1v2"/></svg>';
export function clockPanel(platforms,lang,base,version){
 const t=platformCopy[lang],c=clockCopy[lang],w=watchCopy[lang];
 return `<section class="reset-overview"><div class="overview-title"><div><p class="overview-kicker">CODEX + CLAUDE</p><h1>${e(t.heading)}</h1><p class="overview-intro">${e(w.intro)}</p><p class="local-now"><span class="live-dot"></span>${e(c.localNow)} <time data-local-now></time></p></div><img class="reset-mascot" src="${base}assets/mascot.webp?v=${version}" width="170" height="150" alt=""/></div><div class="platform-grid">${Object.entries(platforms).map(([id,p])=>{
 const s=resetStatus(p.reset),last=p.lastReset;
 return `<article class="platform-card" data-platform="${id}" data-clock-state="${s.state}"><div class="platform-heading"><h2><span class="platform-symbol" aria-hidden="true">${id==='codex'?'⌘':'✳'}</span>${e(p.name)}</h2><a href="${e(p.usageUrl)}" target="_blank" rel="noopener noreferrer">${e(t.usage)} ↗</a></div>
 <div class="clock-face"><div class="clock-status"><span>${e(t.next)}</span><span class="status-led" aria-hidden="true"></span></div><div class="clock-content"><div class="clock-reading"><p class="clock-verdict" data-clock-verdict>${e(s.state==='completed'||s.state==='unknown'?w.waiting:t[s.state])}</p><div class="public-countdown" data-clock-countdown dir="ltr" ${s.state==='announced'?'':'hidden'}>${['--','--','--'].map((n,i)=>`<span class="time-unit"><strong data-digit="${i}">${n}</strong><small>${e([c.hours,c.minutes,c.seconds][i])}</small></span>${i<2?'<span class="clock-colon" aria-hidden="true">:</span>':''}`).join('')}</div><p class="public-reset-time" data-public-time></p></div><div class="station-art" aria-hidden="true"><img src="${base}assets/reset-station.webp" width="240" height="240" alt=""><span class="station-light"></span></div></div></div>
 <div class="last-reset"><span>${e(w.last)}</span><a data-last-reset href="${e(last?.sourceUrl||p.profileUrl)}" target="_blank" rel="noopener noreferrer">${last?e(localResetTime(last.publishedAt,lang,'UTC'))+' ↗':e(w.noHistory)}</a></div>
 <div class="clock-actions"><button data-alarm aria-pressed="false">${bell}<span>${e(w.watch)}</span></button></div><p class="alarm-note" hidden>${e(w.note)}</p>
 <div class="clock-secondary"><button data-clock-calendar hidden>${e(c.calendar)} ↗</button><a data-public-source href="${e(p.reset.sourceUrl||p.profileUrl)}" target="_blank" rel="noopener noreferrer" ${p.reset.sourceUrl?'':'hidden'}>${e(t.source)} ↗</a></div><p class="clock-note">${e(c.publicNote)}</p><div class="alarm-alert" role="status" hidden><strong></strong><button data-dismiss-alarm>${e(c.stop)}</button></div></article>`;
 }).join('')}</div><div class="live-controls"><p data-live-status role="status"></p><button data-refresh>${e(w.refresh)} ↻</button></div></section>`;
}
