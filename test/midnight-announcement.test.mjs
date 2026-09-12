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
test('Tibo midnight uses approved PST convention and stays an estimated deadline',()=>{
 const s=announcementTime(event.fullText,event.publishedAt,{author:'thsottiaux'});
 assert.equal(s.resetAt,'2026-09-12T08:00:00.000Z');assert.equal(s.timeBasis,'author-usual-PST');assert.equal(s.timeKind,'deadline');
 assert.equal(announcementTime(event.fullText,event.publishedAt,{author:'OpenAI'}),null);
 assert.equal(announcementTime(event.fullText,event.publishedAt,{author:'thsottiaux',truncated:true}),null);
 assert.equal(resetStatus({...s,state:'announced',sourceUrl:event.sourceUrl,verifiedAt:'2026-09-12T07:13:00Z'},Date.parse('2026-09-12T08:01:00Z')).state,'awaitingConfirmation');
});
test('Tibo propagation confirmation is completion evidence',()=>{
 assert.equal(classify('Reset all propagated. Sweet dreams.',{author:'thsottiaux'}).state,'reported');
 for(const text of ['Reset has not propagated.','If reset all propagated. Sweet dreams.','"Reset all propagated. Sweet dreams."'])assert.notEqual(classify(text,{author:'thsottiaux'}).state,'reported');
 assert.notEqual(classify('Reset all propagated. Sweet dreams.',{author:'thsottiaux',truncated:true}).state,'reported');
});
