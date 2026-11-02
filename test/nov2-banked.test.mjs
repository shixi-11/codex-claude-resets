import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classify,extractEmbed,validateEvent,reclassifyEvents} from '../src/evidence.mjs';
import {shouldCheckCandidate,resolveResetContext} from '../src/x-relay.mjs';
import {syncPlatformState} from '../src/platform-state.mjs';
const f=JSON.parse(readFileSync(new URL('./fixtures/nov2-banked.json',import.meta.url)));
const id='2117035794678546764',parent='2116405414921384099',now='2026-11-02T03:00:00Z';
const date=id=>new Date(Number((BigInt(id)>>22n)+1288834974657n)).toISOString();
const own=extractEmbed(f.embeds[id],f.details[id].url);
const request=(data=f)=>async input=>{const u=new URL(input),key=u.hostname==='publish.twitter.com'?new URL(u.searchParams.get('url')).pathname.split('/').pop():u.pathname.split('/').pop();return u.hostname==='publish.twitter.com'?data.embeds[key]:{tweet:data.details[key]};};
test('Day 28/ Banked 2/2 is discovered without reset keywords, with changed pinned text still checked',()=>{
 assert.equal(shouldCheckCandidate({url:own.url,relay:f.details[id]}),true);
 assert.equal(shouldCheckCandidate({url:own.url,relay:{text:'Withdrawn'}}),true);
 assert.equal(shouldCheckCandidate({url:'https://x.com/OpenAI/status/123',relay:{text:'Day 28/ Banked 2/2'}}),false);
});
test('standalone banked progress requires exact reviewed identity and independently verified announcement',async()=>{
 const resetContext=await resolveResetContext(own,request(),now),source={...own,publishedAt:date(id),resetContext};
 assert.equal(resetContext.id,parent);assert.equal(resetContext.relation,'reviewed-sequence');assert.equal(resetContext.relationProvenance,'editorial-primary');
 assert.equal(classify(resetContext.fullText,resetContext).kind,'banked');
 assert.deepEqual(classify(own.text,source),{kind:'banked',state:'reported',reason:'reviewed-bank-grant'});
 for(const change of [{resetContext:undefined},{truncated:true},{author:'OpenAI'},{id:'123'},{resetContext:{...resetContext,relation:'reply'}},{resetContext:{...resetContext,fullText:'An unrelated launch'}},{resetContext:{...resetContext,fullText:'We will reset usage limits for all users tomorrow.'}},{resetContext:{...resetContext,publishedAt:'2026-10-20T00:00:00Z'}}])assert.notEqual(classify(own.text,{...source,...change}).state,'reported');
 for(const text of ['Banked 1/2','Maybe Day 28/ Banked 2/2','Day 28/ Banked 2/2. Except some plans.'])assert.notEqual(classify(text,source).state,'reported');
 const bad=structuredClone(f);bad.details[id].replying_to='someone';await assert.rejects(()=>resolveResetContext(own,request(bad),now));
});
test('banked progress never becomes global completion, reset instant or assumed eligibility',()=>{
 const event=JSON.parse(readFileSync(new URL('./fixtures/nov2-banked-event.json',import.meta.url))),events=[event,...JSON.parse(readFileSync(new URL('../data/events.json',import.meta.url))).filter(e=>e.id!==id)];
 assert.ok(event);validateEvent(event);assert.equal(event.kind,'banked');assert.equal(event.resetAt,undefined);assert.equal(event.eligiblePlans,undefined);
 const p=syncPlatformState({codex:{},claude:{}},events,Date.parse(now));assert.equal(p.codex.latestGift.id,id);assert.notEqual(p.codex.lastReset?.id,id);assert.notEqual(p.codex.reset.state,'completed');
 assert.deepEqual(reclassifyEvents(reclassifyEvents(events)),reclassifyEvents(events));
});

test('banked progress labels do not promise a completed global or personal grant',async()=>{const {eventStateLabel,names}=await import('../src/locales.mjs');for(const lang of Object.keys(names))assert.match(eventStateLabel({...JSON.parse(readFileSync(new URL('./fixtures/nov2-banked-event.json',import.meta.url))),reason:'reviewed-bank-grant',state:'reported'},lang),/2\/2/);assert.equal(eventStateLabel({state:'reported'},'en'),'Reported complete');});

test('reviewed banked translation stays bound to exact source and avoids financial-bank wording',async()=>{
 const {reviewedTranslation,translationLanguages}=await import('../src/post-text.mjs');
 const event=JSON.parse(readFileSync(new URL('./fixtures/nov2-banked-event.json',import.meta.url))),entry=reviewedTranslation(event);
 for(const lang of translationLanguages){assert.match(entry.fullTexts[lang],/2\/2/);assert.equal(entry.texts[lang],entry.fullTexts[lang]);}
 assert.equal(entry.fullTexts.ar,'اليوم 28/ تم الادخار 2/2');assert.equal(entry.fullTexts.fr,'Jour 28/ Mis en réserve 2/2');
 for(const change of [{id:'123'},{author:'OpenAI'},{contentHash:'0'.repeat(64)},{fullText:'Banked 2/2'},{excerpt:'Changed'}])assert.equal(reviewedTranslation({...event,...change}),null);
});


test('Day 28 publication is November 1 UTC / November 2 Beijing, not a global reset instant',()=>{assert.equal(date(id),'2026-11-01T23:27:20.731Z');const event=JSON.parse(readFileSync(new URL('./fixtures/nov2-banked-event.json',import.meta.url)));assert.equal(event.resetAt,undefined);assert.equal(event.fullText,'Day 28/ Banked 2/2');});
