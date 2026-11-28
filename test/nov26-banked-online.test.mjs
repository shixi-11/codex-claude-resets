import test from 'node:test';
import assert from 'node:assert/strict';
import {bankedOnline,classify,reclassifyEvents,validateEvent} from '../src/evidence.mjs';
import {syncPlatformState} from '../src/platform-state.mjs';
import {creditPresentation} from '../src/credit-availability.mjs';
import {names} from '../src/locales.mjs';

test('exact official November 26 source is banked online, not a global or personal reset',()=>{
 const [event]=reclassifyEvents([{...bankedOnline,excerpt:bankedOnline.fullText,verifiedAt:bankedOnline.publishedAt,platform:'codex',provenance:'x-oembed',truncated:false}]);
 assert.equal(event.kind,'banked');
 assert.equal(event.state,'reported');
 assert.equal(event.reason,'reviewed-bank-online');
 assert.equal(validateEvent(event),true);
 const state=syncPlatformState({codex:{},claude:{}},[event],Date.parse(bankedOnline.publishedAt));
 assert.equal(state.codex.latestGift.id,event.id);
 assert.deepEqual(state.codex.reset,{state:'unknown',resetAt:null});
 assert.equal(state.codex.lastReset,null);
 for(const lang of Object.keys(names)){
  const display=creditPresentation(event,lang);
  assert.equal(display.state,'online');
  assert.ok(display.label&&display.note);
 }
 for(const changed of [{id:'123'},{author:'OpenAI'},{truncated:true},{publishedAt:'2026-11-25T07:26:16.082Z'}]){
  assert.notEqual(classify(event.fullText,{...event,...changed}).reason,'reviewed-bank-online');
  assert.throws(()=>validateEvent({...event,...changed}));
 }
 assert.notEqual(classify('Banked reset is online except for Pro.',event).reason,'reviewed-bank-online');
 for(const changed of [{contentHash:'0'.repeat(64)},{resetAt:bankedOnline.publishedAt},{eligiblePlans:['Pro']},{endsAt:bankedOnline.publishedAt}]){
  assert.throws(()=>validateEvent({...event,...changed}));
 }
});
