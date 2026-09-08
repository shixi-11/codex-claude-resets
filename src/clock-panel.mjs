import { escapeHtml as e } from './shared.mjs';
import { platformCopy } from './platform-copy.mjs';
import { clockCopy } from './clock-copy.mjs';
import { resetStatus } from './reset-status.mjs';
const bell='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 9a6 6 0 0 1 12 0v5l2 3H4l2-3V9Z"/><path d="M9 20h6M12 1v2"/></svg>';
export function clockPanel(platforms,lang,base,version){
 const t=platformCopy[lang], c=clockCopy[lang];
 return `<section class="reset-overview"><div class="overview-title"><div><h1>${e(t.heading)}</h1><p class="local-now"><span class="live-dot"></span>${e(c.localNow)} <time data-local-now></time></p></div><img class="reset-mascot" src="${base}assets/mascot.webp?v=${version}" width="170" height="150" alt=""/></div><div class="platform-grid">${Object.entries(platforms).map(([id,p])=>{
 const s=resetStatus(p.reset), digits=['--','--','--'];
 return `<article class="platform-card" data-platform="${id}"><div class="platform-heading"><h2><span class="platform-symbol" aria-hidden="true">${id==='codex'?'⌘':'✳'}</span>${e(p.name)}</h2><a href="${e(p.usageUrl)}" target="_blank" rel="noopener noreferrer">${e(t.usage)} ↗</a></div>
 <div class="clock-modes" role="group" aria-label="${e(p.name)}"><button data-clock-mode="public" aria-pressed="true">${e(c.public)}</button><button data-clock-mode="personal" aria-pressed="false">${e(c.personal)}</button></div>
 <div class="clock-face"><div class="clock-status"><span data-mode-label>${e(t.next)}</span><span class="mini-clock" aria-hidden="true">◷</span></div><div class="public-countdown" data-clock-countdown dir="ltr">${digits.map((n,i)=>`<span class="time-unit"><strong data-digit="${i}">${n}</strong><small>${e([c.hours,c.minutes,c.seconds][i])}</small></span>${i<2?'<span class="clock-colon" aria-hidden="true">:</span>':''}`).join('')}</div><p class="clock-verdict" data-clock-verdict>${s.state==='announced'?'':e(t[s.state]||t.unknown)}</p><p class="public-reset-time" data-public-time>${e(t.local)}</p></div>
 <div class="clock-actions"><button data-edit-personal>${e(c.set)} <span aria-hidden="true">＋</span></button><button data-alarm disabled>${bell}<span>${e(c.alarm)}</span></button></div>
 <form class="personal-form" hidden><label for="reset-${id}">${e(c.label)}</label><input id="reset-${id}" type="datetime-local" required><p class="form-error" role="alert" hidden></p><div><button class="button primary" type="submit">${e(c.save)}</button><button class="button" data-cancel-personal type="button">${e(c.cancel)}</button></div></form>
 <div class="clock-secondary"><button data-clock-calendar disabled>${e(c.calendar)} ↗</button><button data-clear-personal hidden>${e(c.clear)}</button>${p.reset.sourceUrl?`<a class="reset-source" data-public-source href="${e(p.reset.sourceUrl)}" target="_blank" rel="noopener noreferrer">${e(t.source)}${p.reset.sourceTimezone?' · '+e(p.reset.sourceTimezone):''} ↗</a>`:''}</div><p class="clock-note" data-clock-note>${e(c.publicNote)}</p><p class="alarm-note" hidden>${e(c.alarmNote)}</p><div class="alarm-alert" role="status" hidden><strong>${e(c.due)}</strong><button data-dismiss-alarm>${e(c.stop)}</button></div>
 </article>`;}).join('')}</div></section>`;
}
