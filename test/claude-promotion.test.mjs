import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {offers} from '../src/offers.mjs';
import {names} from '../src/locales.mjs';
import { currentClaudePromotion } from '../src/claude-promotion.mjs';

const official=`Starting September 14, 2026, weekly limits in Claude Code are 25% higher than they were before the promotion for Pro, Max, Team, and seat-based Enterprise plans. 5-hour usage limits were not affected by this promotion. The increased weekly limit was automatically applied to your account.`;

test('maps the current official Claude terms to the permanent 25% increase',()=>{
 const result=currentClaudePromotion(official,'https://support.claude.com/example','2026-09-19T00:00:00Z');
 assert.equal(result.permanent,true);
 assert.equal(result.effectiveOn,'2026-09-14');
 assert.match(result.benefit,/25%/);
 assert.equal('endsAt' in result,false);
});

test('rejects the superseded 50% promotion terms',()=>{
 assert.throws(()=>currentClaudePromotion('Weekly limits were increased 50% through September 13.','https://support.claude.com/example','2026-09-19T00:00:00Z'),/changed/);
});

const live=JSON.parse(readFileSync(new URL('./fixtures/nov2-claude-promotion.json',import.meta.url),'utf8'));
test('reviewed Nov2 official terms add Ultra without changing benefit, scope or reset semantics',()=>{
 const current=currentClaudePromotion(live.text,live.sourceUrl,live.verifiedAt);
 assert.deepEqual(current.eligiblePlans,['Pro','Max','Ultra','Team','seat-based Enterprise']);
 assert.match(current.eligible,/Max, Ultra, Team/);
 assert.equal(current.benefit,'Claude Code standard weekly limits +25% permanently');
 assert.equal(current.effectiveOn,'2026-09-14');assert.equal(current.permanent,true);
 assert.equal(current.isResetCard,false);assert.equal('resetAt' in current,false);
 assert.equal('endsAt' in current,false);assert.match(current.scope,/not five-hour limits/);
});
test('historical terms do not inherit Ultra from another paragraph or from newer evidence',()=>{
 for(const text of [official,official+' Expired bonus applied to Pro, Max, Ultra, Team, and seat-based Enterprise plans.']){
  const current=currentClaudePromotion(text,live.sourceUrl,live.verifiedAt);
  assert.deepEqual(current.eligiblePlans,['Pro','Max','Team','seat-based Enterprise']);
  assert.doesNotMatch(current.eligible,/Ultra/);
 }
});
test('changed permanent percentage, eligibility, date or automatic application still require review',()=>{
 for(const text of [live.text.replace('25% higher','50% higher'),live.text.replace('Pro, Max, Ultra, Team, and seat-based Enterprise plans','Pro, Max, Ultra, Free, Team, and seat-based Enterprise plans'),live.text.replace('starting September 14, 2026','starting September 15, 2026'),live.text.replaceAll('automatically applied','manually requested')])assert.throws(()=>currentClaudePromotion(text,live.sourceUrl,live.verifiedAt),/changed/);
});
test('all locales render verified Ultra eligibility without changing legacy cards',()=>{
 const latest=currentClaudePromotion(live.text,live.sourceUrl,live.verifiedAt),old=currentClaudePromotion(official,live.sourceUrl,live.verifiedAt);
 for(const lang of Object.keys(names)){
  const render=gift=>offers({claude:{name:'Claude',gifts:[gift]}},lang);
  assert.match(render(latest),/Pro · Max · Ultra · Team · /);
  assert.doesNotMatch(render(old),/Ultra/);
  const {eligiblePlans,...legacy}=old;assert.doesNotMatch(render(legacy),/Ultra/);
  assert.match(render(legacy),/Pro · Max · Team · /);
 }
});
