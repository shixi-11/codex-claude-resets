import test from 'node:test';
import assert from 'node:assert/strict';
import {offers} from '../src/offers.mjs';
import {earlierPosts} from '../src/priority-details.mjs';
test('recent feed uses publication order and seven-day cutoff',()=>{
const now=Date.parse('2026-09-09T00:00:00Z'), ev=(id,days)=>({id,author:'thsottiaux',publishedAt:new Date(now-days*86400000).toISOString()});
assert.deepEqual(earlierPosts([ev('old',8),ev('b',2),ev('top',0),ev('a',1),ev('edge',7)],now).map(e=>e.id),['a','b','edge']);
});
test('latest published reset replaces older credit and newer credit can replace reset',()=>{
const item=(kind,publishedAt)=>({id:kind,kind,state:kind==='global'?'reported':'announced',publishedAt,sourceUrl:'https://x.com/thsottiaux/status/1',excerpt:'All reset for everyone.'});
const codex={name:'Codex',gifts:[],lastReset:item('global','2026-09-08T00:00:00Z'),latestGift:item('banked','2026-09-05T00:00:00Z')};
assert.match(offers({codex},'zh'),/已宣布重置完成/);
assert.doesNotMatch(offers({codex},'zh'),/重置卡赠送公告/);
codex.latestGift.publishedAt='2026-09-09T00:00:00Z';
assert.match(offers({codex},'zh'),/重置卡赠送公告/);
});
