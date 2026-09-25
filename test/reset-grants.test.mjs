import test from 'node:test';
import assert from 'node:assert/strict';
import {classify} from '../src/evidence.mjs';
import {offers} from '../src/offers.mjs';
test('a reset to use anytime is a saved reset, not a completed global reset',()=>{
 const text='In Claude Code: - 5-hour session limits increase 20% today - Pro, Max, and Team users get a reset to use anytime';
 assert.equal(classify(text,{author:'ClaudeDevs'}).kind,'banked');
 assert.equal(classify(text,{author:'ClaudeDevs',truncated:true}).state,'unconfirmed');
});
test('an announced banked reset is recognized despite unrelated quoted marketing copy',()=>{
 const text='Models improve "you know when you try it" quality. We are loading a banked reset into all accounts of our Plus, Pro and Business users.';
 assert.deepEqual(classify(text,{author:'thsottiaux'}),{kind:'banked',state:'announced',reason:'explicit-bank-announcement'});
});
test('new reset credit replaces an older standing promotion in the latest scheme card',()=>{
 const p={name:'Claude',gifts:[{permanent:true,effectiveOn:'2026-09-14',sourceUrl:'https://support.claude.com/'}],latestGift:{kind:'banked',state:'reported',publishedAt:'2026-09-22T16:44:06.200Z',sourceUrl:'https://x.com/ClaudeDevs/status/2102438800836489554',excerpt:'Pro, Max, and Team users get a reset to use anytime'}};
 const html=offers({claude:p},'en');assert.ok(html.includes(p.latestGift.sourceUrl));assert.ok(!html.includes('permanently increased by 25%'));
});
