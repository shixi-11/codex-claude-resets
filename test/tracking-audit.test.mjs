import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {classify,reclassifyEvents,mergeEvents,RULES_VERSION} from '../src/evidence.mjs';
import {syncPlatformState} from '../src/platform-state.mjs';
import {assertTrackingSync,trackingAudit} from '../src/tracking-audit.mjs';
const now=Date.parse('2026-10-13T12:00:00Z');
const make=(id,text,at='2026-10-13T11:00:00Z')=>({id,author:'thsottiaux',platform:'codex',sourceUrl:`https://x.com/thsottiaux/status/${id}`,publishedAt:at,verifiedAt:at,fullText:text,excerpt:text,truncated:false,provenance:'x-oembed',rulesVersion:RULES_VERSION,contentHash:createHash('sha256').update(text).digest('hex'),...classify(text,{author:'thsottiaux'})});
const health={status:'ok',lastSuccessAt:new Date(now).toISOString(),platforms:Object.fromEntries(['codex','claude'].map(id=>[id,{status:'ok',lastSuccessAt:new Date(now).toISOString()}]))};
const state=events=>syncPlatformState({codex:{},claude:{}},events,now);
test('second verification recognizes official terse announcements without inventing EOD time',()=>{
 const e=make('2109045392684032299','Global reset by EOD. May the tokens do good things for you.');
 assert.equal(e.state,'announced');assert.equal(e.resetAt,undefined);
 for(const text of ['Maybe global reset by EOD.','No global reset by EOD.','Global reset by EOD?','He said Global reset by EOD.'])assert.notEqual(classify(text,{author:'thsottiaux'}).state,'announced');
 assert.notEqual(classify(e.fullText,{author:'OpenAI'}).state,'announced');
 assert.equal(classify(e.fullText,{author:'thsottiaux',truncated:true}).state,'unconfirmed');
 assert.equal(classify('Loading a banked reset for all users.',{author:'thsottiaux'}).kind,'banked');
});
test('completion survives two collection merges and stored evidence reclassification',()=>{
 let events=[make('2109132167112782291','Put the reset in the bag. All propagated.')];
 for(let cycle=0;cycle<2;cycle++) {
  const incomplete={...events[0],fullText:undefined,excerpt:'Put the reset...',truncated:true,kind:'signal',state:'unconfirmed',verifiedAt:'2026-10-13T12:00:00Z'};
  events=reclassifyEvents(mergeEvents(events,[incomplete]));
  const p=state(events);assertTrackingSync(p,events);
  assert.equal(p.codex.lastReset.id,'2109132167112782291');assert.equal(p.codex.reset.state,'completed');
 }
});
test('summary audit catches stale message, mismatched time, source and countdown',()=>{
 const events=[make('2109132167112782291','Put the reset in the bag. All propagated.')];
 for(const field of ['id','sourceUrl','publishedAt','contentHash','state']){
  const p=structuredClone(state(events));p.codex.lastReset[field]='wrong';assert.throws(()=>assertTrackingSync(p,events),/Tracking mismatch/);
 }
 const p=state(events);p.codex.reset.state='announced';assert.throws(()=>assertTrackingSync(p,events),/Outdated countdown/);
});
test('unresolved official evidence raises once, changed evidence raises again, resolution clears it',()=>{
 const events=[make('2109132167112782291','A reset for some accounts soon?')];const platforms=state(events);
 const first=trackingAudit({events,platforms,health,now});assert.equal(first.queue.length,1);assert.equal(first.newIssues.length,1);
 const second=trackingAudit({events,platforms,health,now,previous:first});assert.equal(second.newIssues.length,0);assert.equal(second.issues.length,1);
 const changed=[make(events[0].id,'A different reset for some accounts soon?')];assert.equal(trackingAudit({events:changed,platforms:state(changed),health,now,previous:second}).newIssues.length,1);
 const done=[make(events[0].id,'Put the reset in the bag. All propagated.')];assert.equal(trackingAudit({events:done,platforms:state(done),health,now,previous:second}).issues.length,0);
});
test('partial collection and a missed schedule cannot silently pass',()=>{
 const report=trackingAudit({events:[],platforms:state([]),health:{...health,status:'degraded',platforms:{...health.platforms,codex:{...health.platforms.codex,status:'degraded'}}},previous:{checkedAt:'2026-10-12T00:00:00Z'},now});
 assert.ok(report.issues.some(i=>i.key==='collection-gap'));assert.ok(report.issues.some(i=>i.key==='coverage:codex'));
 const announced={...make('2109132167112782291','We will reset usage for all users.'),resetAt:'2026-10-13T00:00:00Z'};
 const pending=trackingAudit({events:[announced],platforms:state([announced]),health,now});assert.ok(pending.issues.some(i=>i.key.startsWith('completion:')));
});


