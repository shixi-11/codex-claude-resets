import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {classify,reclassifyEvents,validateEvent} from '../src/evidence.mjs';
import {syncPlatformState} from '../src/platform-state.mjs';
import {assertTrackingSync} from '../src/tracking-audit.mjs';
import {announcementTime} from '../src/announcement-time.mjs';
const id='2114588174249071102', author='thsottiaux';
const text='Day 21/ Wonder what happens the remaining seven days. But today is a reset.';
const source={id,author,publishedAt:'2026-10-26T05:21:22.546Z'};
test('complete official Day21 is an announcement, not execution or all-account completion',()=>{
 assert.deepEqual(classify(text,source),{kind:'global',state:'announced',reason:'explicit-announcement'});
 assert.equal(announcementTime(text,source.publishedAt,source),null);
 for(const altered of ['Maybe '+text,'"'+text+'"',text+' Not today.',text.replace('is a reset','is not a reset'),text.replace('is a reset','might be a reset'),text.replace('is a reset','is a reset?'),'Someone said '+text])assert.notEqual(classify(altered,source).state,'announced',altered);
 for(const altered of [{...source,author:'OpenAI'},{...source,author:'random'},{...source,truncated:true}])assert.notEqual(classify(text,altered).state,'announced');
});

test('Day22 Terra and 2X usage do not complete the Day21 reset or supply a reset time',()=>{
 const usage={id:'2114800277677092936',author,publishedAt:'2026-10-26T19:24:11.000Z'};
 const fullText='Day 22/ Terra is back! \n\nOur first model that is significantly better at writing,  personality and nuanced understanding of requests.\n\nPacks a punch across the board, very good at computer use, and gives 2X more usage than 6.1 Sol across API and subscriptions.';
 const classification=classify(fullText,usage);
 assert.notEqual(classification.kind,'global');assert.notEqual(classification.state,'reported');
 assert.equal(announcementTime(fullText,usage.publishedAt,usage),null);
 const events=[{...source,fullText:text,...classify(text,source),platform:'codex',sourceUrl:`https://x.com/${author}/status/${id}`},...(classification.kind==='other'?[]:[{...usage,fullText,...classification,platform:'codex',sourceUrl:`https://x.com/${author}/status/${usage.id}`}])];
 const p=syncPlatformState({codex:{},claude:{}},events,Date.parse('2026-10-27T22:00:00Z'));
 assert.equal(p.codex.latestReset.id,id);
 assert.equal(p.codex.reset.state,'announced');assert.equal(p.codex.reset.resetAt,null);assert.equal(p.codex.lastReset,null);
});
test('Grok feedback joke is excluded only for the reviewed author, ID and complete text',()=>{
 const joke={id:'2114599388454481930',author};
 assert.equal(classify('Not enough resets',joke).kind,'other');
 for(const s of [{...joke,id:'123'},{...joke,author:'OpenAI'},{...joke,truncated:true}])assert.notEqual(classify('Not enough resets',s).reason,'reviewed-unrelated-reply');
 assert.notEqual(classify('Not enough resets. A global reset will land.',joke).kind,'other');
});
test('migration is idempotent and promotes Day21 without carrying Day20 completion into the new cycle',async()=>{
 const events=JSON.parse(await readFile(new URL('../data/events.json',import.meta.url),'utf8'));
 const old=structuredClone(events);Object.assign(old.find(e=>e.id===id),{kind:'signal',state:'unconfirmed',reason:'ambiguous',rulesVersion:'1.4.18'});
 const next=reclassifyEvents(old),e=next.find(e=>e.id===id);validateEvent(e);
 for(const key of ['fullText','contentHash','publishedAt','verifiedAt'])assert.equal(e[key],old.find(e=>e.id===id)[key]);
 assert.equal(e.eligiblePlans,undefined);assert.equal(e.resetAt,undefined);
 assert.deepEqual(reclassifyEvents(next),next);
 const p=syncPlatformState({codex:{},claude:{}},next,Date.parse('2026-10-26T06:30:00Z'));
 assert.equal(p.codex.latestReset.id,id);assert.equal(p.codex.reset.state,'announced');assert.equal(p.codex.reset.resetAt,null);
 assert.equal(p.codex.lastReset.id,'2114237083652882932');assertTrackingSync(p,next);
});
