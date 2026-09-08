import test from 'node:test';
import assert from 'node:assert/strict';
import { resetStatus, countdown, localResetTime, offerStatus } from '../src/reset-status.mjs';
const now = Date.parse('2026-09-08T00:00:00Z');
const announcement = { state:'announced', resetAt:'2026-09-08T02:00:00Z', sourceUrl:'https://x.com/thsottiaux/status/1', verifiedAt:'2026-09-07T23:00:00Z' };
test('unknown or incomplete evidence never creates a countdown', () => {
  for (const record of [null, {}, {...announcement, sourceUrl:null}, {...announcement, resetAt:'2026-09-08T02:00:00'}]) assert.equal(resetStatus(record,now).remainingMs,null);
});

test('stale or invalid verification cannot sustain a public countdown', () => {
 for(const verifiedAt of ['invalid','2026-09-07T00:00:00Z','2026-09-09T00:00:00Z'])assert.equal(resetStatus({...announcement,verifiedAt},now).state,'unknown');
});
test('countdown follows the absolute instant and elapsed time awaits confirmation', () => {
  assert.equal(countdown(resetStatus(announcement,now).remainingMs),'02:00:00');
  assert.equal(resetStatus(announcement,now+7200000).state,'awaitingConfirmation');
  assert.equal(resetStatus({...announcement,state:'completed'},now).state,'completed');
});
test('same reset displays correctly across day boundaries and DST', () => {
  assert.match(localResetTime(announcement.resetAt,'en-US','Asia/Shanghai'),/10:00/);
  assert.match(localResetTime(announcement.resetAt,'en-US','America/Los_Angeles'),/Sep 7/);
  assert.match(localResetTime(announcement.resetAt,'en-US','America/Los_Angeles'),/PDT/);
});
test('offers become stale or expire without requiring another successful collector run', () => {
 const offer={state:'announced',sourceUrl:'https://support.claude.com/',verifiedAt:'2026-09-08T00:00:00Z',endsAt:'2026-09-09T00:00:00Z'};
 assert.equal(offerStatus(offer,now),'active');
 assert.equal(offerStatus(offer,now+4*3600000),'stale');
 assert.equal(offerStatus(offer,now+86400000),'expired');
 assert.equal(offerStatus({...offer,verifiedAt:null},now),'unverified');
});
