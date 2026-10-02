import test from 'node:test';
import assert from 'node:assert/strict';
import {classify,reclassifyEvents} from '../src/evidence.mjs';
import {announcementTime} from '../src/announcement-time.mjs';
const text="Global reset landing tomorrow 10am PST for all paid ChatGPT accounts. Apologies for the slow start with GPT-6.1 Sol, it's now back to running at expected speeds after the massive load spike in the first two days.";
test('October global announcement creates the literal PST deadline across UTC date boundary',()=>{
 const publishedAt='2026-10-02T02:14:51.356Z',author='thsottiaux';
 assert.equal(classify(text,{author}).state,'announced');
 assert.equal(announcementTime(text,publishedAt,{author}).resetAt,'2026-10-02T18:00:00.000Z');
 const [event]=reclassifyEvents([{fullText:text,publishedAt,author}]);
 assert.equal(event.kind,'global');assert.equal(event.resetAt,'2026-10-02T18:00:00.000Z');
 assert.equal(classify(text,{author,truncated:true}).state,'unconfirmed');
 assert.notEqual(classify('Maybe a '+text,{author}).state,'announced');
 assert.equal(announcementTime(text.replace('PST','PDT'),publishedAt,{author}).resetAt,'2026-10-02T17:00:00.000Z');
});
