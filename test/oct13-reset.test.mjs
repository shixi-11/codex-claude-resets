import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {classify,reclassifyEvents,validateEvent} from '../src/evidence.mjs';
import {announcementTime} from '../src/announcement-time.mjs';
import {corroborateResetQuote} from '../src/x-relay.mjs';
import {syncPlatformState} from '../src/platform-state.mjs';
import {assertTrackingSync} from '../src/tracking-audit.mjs';
import {platformCopy} from '../src/platform-copy.mjs';
const preview={id:'2109812360596865224',author:'thsottiaux',url:'https://x.com/thsottiaux/status/2109812360596865224',text:'Global reset landing by EOD PST time. Enjoy',truncated:false};
const done={id:'2109873287853707513',author:'thsottiaux',url:'https://x.com/thsottiaux/status/2109873287853707513',text:"What would you like with your side of reset? It's done.",truncated:false};
const date=id=>new Date(Number((BigInt(id)>>22n)+1288834974657n)).toISOString();
const relay=source=>({id:source.id,url:source.url,author:{screen_name:source.author},text:source.text,created_timestamp:Math.floor(Date.parse(date(source.id))/1000)});
const now='2026-10-13T06:00:00Z',hash=text=>createHash('sha256').update(text).digest('hex');
const quoted={...relay(done),quote:relay(preview)};
const context=()=>{const c=corroborateResetQuote(done,quoted,preview,now);return {...c,contentHash:hash(c.fullText)};};
const record=(source,extra={})=>({id:source.id,author:source.author,sourceUrl:source.url,platform:'codex',fullText:source.text,excerpt:source.text,verifiedAt:now,publishedAt:date(source.id),truncated:false,provenance:'x-oembed',rulesVersion:'old',contentHash:hash(source.text),kind:'signal',state:'unconfirmed',...extra});

test('EOD PST is an author-scoped announcement with a literal zone and no exact instant',()=>{
 assert.equal(classify(preview.text,preview).state,'announced');
 const schedule=announcementTime(preview.text,date(preview.id),preview);
 assert.equal(schedule.resetAt,null);assert.equal(schedule.sourceTimezone,'PST');assert.equal(schedule.deadlineText,'by EOD PST time');
 for(const text of ['Global reset landing by EOD PST time?','Maybe '+preview.text,'"'+preview.text+'"',preview.text+' Not today.','Day 8/ Reset'])assert.equal(classify(text,preview).state,'unconfirmed');
 assert.equal(classify(preview.text,{...preview,truncated:true}).state,'unconfirmed');
 assert.notEqual(classify(preview.text,{author:'ClaudeDevs'}).state,'announced');
 for(const copy of Object.values(platformCopy))assert.match(copy.eodPstDeadline,/PST/);
});

test('completion needs exact wording plus an independently corroborated recent same-author quote',()=>{
 const c=context(),r=record(done,{resetContext:c});
 assert.equal(classify(done.text,r).state,'reported');
 assert.equal(classify(done.text,done).state,'unconfirmed');
 for(const fullText of ["It's done.",'Reset? It\'s done.',"Maybe "+done.text,'"'+done.text+'"',done.text+' Not today.'])assert.notEqual(classify(fullText,r).state,'reported');
 assert.equal(classify(done.text,{...r,truncated:true}).state,'unconfirmed');
 for(const change of [{author:'ClaudeDevs'},{id:'123'},{publishedAt:'2026-10-14T00:00:00Z'},{publishedAt:'2026-10-01T00:00:00Z'},{truncated:true},{provenance:'community'},{fullText:'Day 8/ Reset'},{contentHash:'broken'}])assert.equal(classify(done.text,{...r,resetContext:{...c,...change}}).state,'unconfirmed');
 assert.throws(()=>corroborateResetQuote(done,{...quoted,quote:{...quoted.quote,author:{screen_name:'OpenAI'}}},preview,now),/identity mismatch/);
 assert.throws(()=>corroborateResetQuote(done,{...quoted,quote:{...quoted.quote,created_timestamp:0}},preview,now),/timestamp mismatch/);
});

test('reconciliation advances the new cycle, retains the preview and verifies context anchors',()=>{
 const announcement=record(preview),completion=record(done,{resetContext:context()});
 const events=reclassifyEvents([completion,announcement]);events.forEach(validateEvent);
 const p=syncPlatformState({codex:{},claude:{}},[events[1]],Date.parse(now));
 assert.equal(p.codex.reset.state,'announced');assert.equal(p.codex.reset.resetAt,null);assert.equal(p.codex.reset.sourceTimezone,'PST');
 syncPlatformState(p,events,Date.parse(now));assertTrackingSync(p,events);
 assert.equal(p.codex.latestReset.id,done.id);assert.equal(p.codex.lastReset.id,done.id);assert.equal(p.codex.reset.state,'completed');assert.equal(p.codex.reset.resetAt,null);
 assert.equal(p.codex.lastReset.eligiblePlans,undefined);assert.deepEqual(events[0].resetContext,completion.resetContext);assert.equal(events[1].sourceTimezone,'PST');
 assert.equal(events[0].verifiedAt,now);assert.equal(events[0].contentHash,completion.contentHash);
 assert.throws(()=>validateEvent({...events[0],resetContext:undefined}),/needs verified/);
});
