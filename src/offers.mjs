import { escapeHtml as e } from './shared.mjs';
import { platformCopy } from './platform-copy.mjs';
import {visitorCopy} from './visitor-copy.mjs';
import {postText} from './post-text.mjs';
const icons={codex:'<rect x="5" y="7" width="22" height="18" rx="4"/><path d="M19 11a6 6 0 1 0 2 8M23 10v6h-6"/>',claude:'<rect x="5" y="14" width="5" height="12" rx="1"/><rect x="14" y="10" width="5" height="16" rx="1"/><path d="m23 5 4 4-4 4m-2-4h6"/>'};
const creditMeaning={en:'An opportunity to reset usage later.',zh:'可留待以后使用的额度重置机会。','zh-Hant':'可留待以後使用的額度重置機會。',ja:'後で利用枠をリセットできる権利です。',ko:'나중에 사용량을 초기화할 수 있는 기회입니다.',es:'Una oportunidad de restablecer el uso más adelante.',fr:'Une possibilité de réinitialiser votre utilisation plus tard.',de:'Eine Möglichkeit, dein Nutzungslimit später zurückzusetzen.',ar:'فرصة لإعادة ضبط حد الاستخدام لاحقًا.'};
const legacyPlan={en:'legacy seat-based Enterprise',zh:'旧版按席位计费的Enterprise','zh-Hant':'舊版按席位計費的Enterprise',ja:'従来の席数課金Enterprise',ko:'기존 좌석 기반 Enterprise',es:'Enterprise con plazas heredadas',fr:'anciennes offres Enterprise par siège',de:'ältere sitzbasierte Enterprise-Tarife',ar:'Enterprise القديم القائم على المقاعد'};
export function offers(platforms,lang){
 const t=platformCopy[lang],v=visitorCopy[lang];
 const field=(label,body)=>`<div><dt>${e(label)}</dt><dd>${body}</dd></div>`;
 return `<section class="offers-section"><div class="offer-grid">${Object.entries(platforms).map(([id,p])=>{
  const gift=p.gifts[0],credit=p.latestGift,source=gift?.sourceUrl||credit?.sourceUrl;
  return `<article class="offer-card" data-offer-platform="${id}"><header class="offer-heading"><div class="offer-brand"><span class="offer-icon" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5">${icons[id]}</svg></span><h3>${e(p.name)}</h3></div><span class="offer-type">${e(gift?v.extra:v.credit)}</span></header><div data-offer class="offer-body">${gift?`<p class="offer-title">${e(t.boost)}</p><p class="offer-meaning">${e(v.weeklyOnly)}</p><dl class="offer-facts">${field(v.plans,e('Pro · Max · Team · '+legacyPlan[lang]))}${field(v.how,e(t.automatic))}</dl><p class="offer-status" data-offer-status hidden></p>`:credit?`<p class="offer-title">${e(v.creditTitle)}</p><p class="offer-meaning">${e(creditMeaning[lang])}</p>${credit.eligiblePlans?.length?`<dl class="offer-facts">${field(v.plans,e(credit.eligiblePlans.join(' · ')))}${field(v.how,e(v.redeem))}</dl>`:postText(credit,lang,'offer-excerpt')}`:`<p>${e(t.noOffer)}</p>`}</div>${source?`<footer class="offer-bottom"><div class="offer-date"><span>${e(gift?v.ends:v.posted)}</span><time datetime="${e(gift?.endsAt||credit.publishedAt)}">${e(gift?.endsAt||credit.publishedAt)}</time></div><a class="offer-source" href="${e(source)}" target="_blank" rel="noopener noreferrer">${e(t.source)} <span aria-hidden="true">↗</span></a></footer>`:''}</article>`;
 }).join('')}</div></section>`;
}
