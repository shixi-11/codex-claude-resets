import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classify,reclassifyEvents,validateEvent} from '../src/evidence.mjs';
import {syncPlatformState} from '../src/platform-state.mjs';
import {announcementTime} from '../src/announcement-time.mjs';
import {locales} from '../src/locales.mjs';
import {postKindLabel} from '../src/priority-details.mjs';
const events=JSON.parse(readFileSync(new URL('../data/events.json',import.meta.url)));
const tibo=events.find(e=>e.id==='2116256600436641887');
const claude=events.find(e=>e.id==='2116220869479428500');
test('reviewed 28-day suggestion remains source-linked commentary, never a Codex reset',()=>{
 assert.deepEqual(classify(tibo.fullText,tibo),{kind:'commentary',state:'information',reason:'reviewed-policy-commentary'});
 for(const source of [{...tibo,id:'123'},{...tibo,author:'OpenAI'},{...tibo,truncated:true}])assert.notEqual(classify(tibo.fullText,source).kind,'commentary');
 for(const text of [tibo.fullText+' A reset is coming.', 'Maybe '+tibo.fullText])assert.notEqual(classify(text,tibo).kind,'commentary');
 assert.equal(announcementTime(tibo.fullText,tibo.publishedAt,tibo),null);
 for(const lang of Object.keys(locales)){assert.ok(locales[lang].commentary);assert.equal(postKindLabel('commentary',lang),locales[lang].commentary);}
});
test('complete official Ultra policy is usage information with unchanged source conditions',()=>{
 assert.deepEqual(classify(claude.fullText,claude),{kind:'usage',state:'information',reason:'usage-change'});
 for(const source of [{...claude,id:'123'},{...claude,author:'AnthropicAI'},{...claude,truncated:true}])assert.notEqual(classify(claude.fullText,source).reason,'usage-change');
 for(const text of [claude.fullText+' Correction.',claude.fullText.replace('verified Ultra','all Ultra'),claude.fullText.replace('Weekly limits remain unchanged.','Weekly limits doubled.')])assert.notEqual(classify(text,claude).reason,'usage-change');
 assert.equal(announcementTime(claude.fullText,claude.publishedAt,claude),null);
});
test('migration preserves evidence and existing reset cycle, and is idempotent',()=>{
 const before=reclassifyEvents(structuredClone(events)); for(const e of before.filter(e=>[tibo.id,claude.id].includes(e.id)))Object.assign(e,{kind:'signal',state:'unconfirmed',reason:'ambiguous'});
 const after=reclassifyEvents(before);assert.equal(after.length,before.length);assert.deepEqual(reclassifyEvents(after),after);
 for(const id of [tibo.id,claude.id]){const a=after.find(e=>e.id===id),b=before.find(e=>e.id===id);validateEvent(a);for(const key of ['fullText','excerpt','contentHash','publishedAt','verifiedAt','sourceUrl','provenance'])assert.equal(a[key],b[key]);assert.equal(a.resetAt,undefined);}
 const at=Date.parse('2026-10-30T21:00:00Z');const a=syncPlatformState({codex:{},claude:{}},after,at),b=syncPlatformState({codex:{},claude:{}},before,at);
 for(const platform of ['codex','claude'])for(const key of ['latestReset','lastReset','reset'])assert.deepEqual(a[platform][key],b[platform][key]);
 assert.equal(a.codex.lastReset.id,'2115330127886463244');assert.equal(a.codex.reset.resetAt,null);
});
