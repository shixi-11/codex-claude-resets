import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {classify,reclassifyEvents,RULES_VERSION,validateEvent} from '../src/evidence.mjs';
import {announcementTime} from '../src/announcement-time.mjs';
import {syncPlatformState} from '../src/platform-state.mjs';
import {priorityDetails} from '../src/priority-details.mjs';
const stored=JSON.parse(await readFile(new URL('../data/events.json',import.meta.url),'utf8'));
const complete=stored.find(e=>e.id==='2109132167112782291');
const preview=stored.find(e=>e.id==='2109045392684032299');
const now=Date.parse('2026-10-11T19:58:00Z');
const source={author:'thsottiaux'};

test('compound propagation confirmation is reported, while EOD stays untimed and announced',()=>{
 assert.equal(complete.publishedAt,'2026-10-11T04:01:09.077Z');
 assert.deepEqual(classify(complete.fullText,complete),{kind:'global',state:'reported',reason:'explicit-completion'});
 assert.equal(classify(preview.fullText,preview).state,'announced');
 assert.equal(announcementTime(preview.fullText,preview.publishedAt,preview),null);
 assert.equal(classify('Global reset by end of day.',source).state,'announced');
 assert.equal(classify('Put the reset in the bag. All fully propagated.',source).state,'reported');
});

test('propagation rules do not promote uncertain, quoted, future, incomplete or unrelated claims',()=>{
 for(const text of ['Maybe put the reset in the bag. All propagated.','Put the reset in the bag. Not all propagated.','Put the reset in the bag. All will propagate tomorrow.','Put the reset in the bag. All propagated?','Someone said put the reset in the bag. All propagated.','"Put the reset in the bag. All propagated."','If global reset by EOD.','Global reset by EOD?','Global reset by EOD. Not today.','Day 6/ Reset','The day we reach perfection it will be resets from there onwards']) {
  assert.equal(classify(text,source).state,'unconfirmed',text);
 }
 assert.equal(classify(complete.fullText,{...source,truncated:true}).state,'unconfirmed');
 assert.notEqual(classify(complete.fullText,{author:'ClaudeDevs'}).state,'reported');
 assert.notEqual(classify(preview.fullText,{author:'ClaudeDevs'}).state,'announced');
 const credit=stored.find(e=>/Loading a banked reset/.test(e.fullText||''));
 assert.ok(credit);
 assert.deepEqual(classify(credit.fullText,source),{kind:'banked',state:'announced',reason:'explicit-bank-announcement'});
});

test('stored evidence and summaries migrate together without refreshing verification or account eligibility',()=>{
 const events=reclassifyEvents(stored);events.forEach(validateEvent);
 for(const e of events){const original=stored.find(o=>o.id===e.id);for(const key of ['verifiedAt','publishedAt','contentHash','fullText','provenance','eligiblePlans'])assert.deepEqual(e[key],original[key]);}
 const p={codex:{reset:{state:'unknown'},lastReset:{id:'obsolete'}},claude:{}};
 syncPlatformState(p,events.filter(e=>Date.parse(e.publishedAt)<=Date.parse(preview.publishedAt)),now);
 assert.equal(p.codex.latestReset.id,preview.id);assert.equal(p.codex.reset.state,'announced');assert.equal(p.codex.reset.resetAt,null);
 syncPlatformState(p,events,now);
 assert.equal(p.codex.latestReset.id,complete.id);assert.equal(p.codex.lastReset.id,complete.id);assert.equal(p.codex.latest.id,complete.id);
 assert.equal(p.codex.reset.state,'completed');assert.equal(p.codex.reset.resetAt,null);assert.equal(p.codex.reset.verifiedAt,complete.verifiedAt);
 assert.equal(events.find(e=>e.id===complete.id).rulesVersion,RULES_VERSION);
 const html=priorityDetails(p.codex,'codex',events,'en');assert.ok(html.includes(complete.sourceUrl));assert.ok(html.includes('Confirmed complete'));assert.ok(html.includes(complete.publishedAt));
 const exception=events.find(e=>e.id==='2106233145163141249');assert.equal(exception.state,'unconfirmed');assert.match(exception.fullText,/Pro 500/);
 assert.equal(p.codex.lastReset.eligiblePlans,undefined);
 syncPlatformState(p,events,now+2*86400000);assert.equal(p.codex.lastReset.id,complete.id);assert.equal(p.codex.reset.state,'unknown');
});
