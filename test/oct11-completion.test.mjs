import test from 'node:test';
import assert from 'node:assert/strict';
import {classify,reclassifyEvents} from '../src/evidence.mjs';
import {syncPlatformState} from '../src/platform-state.mjs';
import fs from 'node:fs';
test('Oct11 propagation confirmation updates summaries and rejects uncertain variants',()=>{
 const text='Put the reset in the bag. All propagated.';
 assert.equal(classify(text,{author:'thsottiaux'}).state,'reported');
 for(const t of ['Maybe '+text,'Put the reset in the bag. Not all propagated.','Put the reset in the bag. All propagated?'])assert.notEqual(classify(t,{author:'thsottiaux'}).state,'reported');
 assert.equal(classify(text,{author:'thsottiaux',truncated:true}).state,'unconfirmed');
 const events=reclassifyEvents(JSON.parse(fs.readFileSync(new URL('../data/events.json',import.meta.url))).filter(e=>Date.parse(e.publishedAt)<=Date.parse('2026-10-11T12:00:00Z')));
 const p=syncPlatformState({codex:{},claude:{}},events,Date.parse('2026-10-11T12:00:00Z'));
 assert.equal(p.codex.lastReset.id,'2109132167112782291');
 assert.equal(p.codex.reset.state,'completed');
});
