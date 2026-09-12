import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classify,reclassifyEvents} from '../src/evidence.mjs';
import {announcementTime} from '../src/announcement-time.mjs';
import {resetStatus} from '../src/reset-status.mjs';
const event=JSON.parse(readFileSync(new URL('../data/events.json',import.meta.url))).find(e=>e.id==='2098612714704891959');
test('Astra midnight announcement is confirmed without inventing completion or timezone',()=>{
 assert.equal(classify(event.fullText,event).state,'announced');
 assert.equal(reclassifyEvents([event])[0].kind,'global');
 assert.equal(announcementTime(event.fullText,event.publishedAt),null);
 for(const text of [event.fullText.replace('is also landing','is not landing'),event.fullText.replace('is also landing','might be landing')]) assert.equal(classify(text,event).state,'unconfirmed');
 assert.equal(classify(event.fullText,{...event,truncated:true}).state,'unconfirmed');
 assert.notEqual(classify(event.fullText,{author:'OpenAI'}).state,'announced');
});
test('verified untimed announcement remains visible without countdown',()=>{
 const record={state:'announced',resetAt:null,sourceUrl:event.sourceUrl,verifiedAt:event.verifiedAt};
 assert.deepEqual(resetStatus(record,Date.parse(event.verifiedAt)),{state:'announcedUntimed',remainingMs:null,at:null});
 assert.equal(resetStatus({...record,sourceUrl:null},Date.parse(event.verifiedAt)).state,'unknown');
});
