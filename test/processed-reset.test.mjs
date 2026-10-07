import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {classify,reclassifyEvents} from '../src/evidence.mjs';
import {syncPlatformState} from '../src/platform-state.mjs';
const stored=JSON.parse(await readFile(new URL('../data/events.json',import.meta.url),'utf8'));
const completion=stored.find(e=>e.id==='2107676072871600470');
test('complete processed announcements generalize without promoting uncertain claims',()=>{
 for(const text of [completion.fullText,'The reset has been processed. Enjoy!','Reset has been completed.'])assert.equal(classify(text,{author:'thsottiaux'}).state,'reported');
 for(const text of ['Maybe the reset has been processed.','The reset has not been processed.','Someone said the reset has been processed.','"The reset has been processed."','If the reset has been processed.'])assert.notEqual(classify(text,{author:'thsottiaux'}).state,'reported');
 assert.equal(classify(completion.fullText,{author:'thsottiaux',truncated:true}).state,'unconfirmed');
 assert.notEqual(classify('The reset has been processed.',{author:'ClaudeDevs'}).state,'reported');
});
test('rule reclassification and stale summaries converge without refreshing source health',()=>{
 const events=reclassifyEvents(stored);
 const platforms={codex:{reset:{state:'unknown'},lastReset:{id:'obsolete'},gifts:[]},claude:{gifts:[]}};
 syncPlatformState(platforms,events,Date.parse('2026-10-07T12:00:00Z'));
 const p=platforms.codex;
 assert.equal(p.lastReset.id,completion.id);assert.equal(p.latestReset.id,completion.id);
 assert.equal(p.reset.state,'completed');assert.equal(p.reset.verifiedAt,completion.verifiedAt);
 const exception=events.find(e=>e.id==='2106233145163141249');
 assert.equal(exception.state,'unconfirmed');assert.match(exception.fullText,/Pro 500/);
 assert.equal(p.lastReset.eligiblePlans,undefined);
 syncPlatformState(platforms,events,Date.parse('2026-10-09T12:00:00Z'));
 assert.equal(p.lastReset.id,completion.id);assert.equal(p.reset.state,'unknown');
});
