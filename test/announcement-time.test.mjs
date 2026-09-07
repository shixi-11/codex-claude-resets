import test from 'node:test';import assert from 'node:assert/strict';import{announcementTime}from'../src/announcement-time.mjs';
test('explicit Pacific offsets stay distinct and approximate times stay approximate',()=>{
 const published='2026-09-07T19:24:57Z';
 assert.equal(announcementTime('Lands around 6pm PST today.',published).resetAt,'2026-09-08T02:00:00.000Z');
 assert.equal(announcementTime('Lands around 6pm PDT today.',published).resetAt,'2026-09-08T01:00:00.000Z');
 assert.equal(announcementTime('Lands around 6pm PST today.',published).approximate,true);
 assert.equal(announcementTime('Lands 6pm PST tomorrow.',published).resetAt,'2026-09-09T02:00:00.000Z');
});
test('no fabricated schedule from missing timezone, invalid hours or truncated context',()=>{
 for(const text of ['Lands 6pm today.','Lands 18pm PST today.','Lands in 2 hours.'])assert.equal(announcementTime(text,'2026-09-07T19:24:57Z'),null);
 assert.equal(announcementTime('Lands 6pm PST today.','2026-09-07T19:24:57Z',{truncated:true}),null);
});
