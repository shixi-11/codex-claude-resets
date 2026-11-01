import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classify,extractEmbed,validateEvent,reclassifyEvents} from '../src/evidence.mjs';
import {shouldCheckCandidate,resolveResetContext} from '../src/x-relay.mjs';
import {syncPlatformState} from '../src/platform-state.mjs';
const f=JSON.parse(readFileSync(new URL('./fixtures/nov1-banked.json',import.meta.url)));
const id='2116692529970311254',parent='2116405414921384099',now='2026-11-01T17:00:00Z';
const date=id=>new Date(Number((BigInt(id)>>22n)+1288834974657n)).toISOString();
const own=extractEmbed(f.embeds[id],f.details[id].url);
const request=(data=f)=>async input=>{const u=new URL(input),key=u.hostname==='publish.twitter.com'?new URL(u.searchParams.get('url')).pathname.split('/').pop():u.pathname.split('/').pop();return u.hostname==='publish.twitter.com'?data.embeds[key]:{tweet:data.details[key]};};
test('Banked 1/2 is discovered without reset keywords, with changed pinned text still checked',()=>{
 assert.equal(shouldCheckCandidate({url:own.url,relay:f.details[id]}),true);
 assert.equal(shouldCheckCandidate({url:own.url,relay:{text:'Withdrawn'}}),true);
 assert.equal(shouldCheckCandidate({url:'https://x.com/OpenAI/status/123',relay:{text:'Banked 1/2'}}),false);
});
test('standalone banked progress requires exact reviewed identity and independently verified announcement',async()=>{
 const resetContext=await resolveResetContext(own,request(),now),source={...own,publishedAt:date(id),resetContext};
 assert.equal(resetContext.id,parent);assert.equal(resetContext.relation,'reviewed-sequence');assert.equal(resetContext.relationProvenance,'editorial-primary');
 assert.equal(classify(resetContext.fullText,resetContext).kind,'banked');
 assert.deepEqual(classify(own.text,source),{kind:'banked',state:'reported',reason:'reviewed-bank-grant'});
 for(const change of [{resetContext:undefined},{truncated:true},{author:'OpenAI'},{id:'123'},{resetContext:{...resetContext,relation:'reply'}},{resetContext:{...resetContext,fullText:'An unrelated launch'}},{resetContext:{...resetContext,fullText:'We will reset usage limits for all users tomorrow.'}},{resetContext:{...resetContext,publishedAt:'2026-10-20T00:00:00Z'}}])assert.notEqual(classify(own.text,{...source,...change}).state,'reported');
 for(const text of ['Banked 2/2','Maybe Banked 1/2','Banked 1/2. Except some plans.'])assert.notEqual(classify(text,source).state,'reported');
 const bad=structuredClone(f);bad.details[id].replying_to='someone';await assert.rejects(()=>resolveResetContext(own,request(bad),now));
});
test('banked progress never becomes global completion, reset instant or assumed eligibility',()=>{
 const event=JSON.parse(readFileSync(new URL('./fixtures/nov1-banked-event.json',import.meta.url))),events=[event,...JSON.parse(readFileSync(new URL('../data/events.json',import.meta.url))).filter(e=>e.id!==id)];
 assert.ok(event);validateEvent(event);assert.equal(event.kind,'banked');assert.equal(event.resetAt,undefined);assert.equal(event.eligiblePlans,undefined);
 const p=syncPlatformState({codex:{},claude:{}},events,Date.parse(now));assert.equal(p.codex.latestGift.id,id);assert.notEqual(p.codex.lastReset?.id,id);assert.notEqual(p.codex.reset.state,'completed');
 assert.deepEqual(reclassifyEvents(reclassifyEvents(events)),reclassifyEvents(events));
});

test('banked progress labels do not promise a completed global or personal grant',async()=>{const {eventStateLabel,names}=await import('../src/locales.mjs');for(const lang of Object.keys(names))assert.match(eventStateLabel({reason:'reviewed-bank-grant',state:'reported'},lang),/1\/2/);assert.equal(eventStateLabel({state:'reported'},'en'),'Reported complete');});
