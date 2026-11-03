import test from 'node:test';
import assert from 'node:assert/strict';
import { currentClaudePromotion } from '../src/claude-promotion.mjs';
import {offers} from '../src/offers.mjs';
import {locales} from '../src/locales.mjs';

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

const updated=official.replace('Pro, Max, Team','Pro, Max, Ultra, Team');
const url='https://support.claude.com/en/articles/15910845-claude-code-may-august-2026-weekly-limits-promotion';
test('current permanent sentence includes Ultra even when the historical promotion retains its old plans',()=>{
 const result=currentClaudePromotion(updated+' This promotion was available for Pro, Max, and Team plans.',url,'2026-11-03T18:00:00Z');
 assert.deepEqual(result.eligiblePlans,['Pro','Max','Ultra','Team','seat-based Enterprise']);
 assert.match(result.eligible,/Max, Ultra, Team/);
 assert.equal(result.sourceUrl,url);assert.equal(result.verifiedAt,'2026-11-03T18:00:00Z');
 assert.equal(result.state,'announced');assert.equal(result.isResetCard,false);assert.equal(result.effectiveOn,'2026-09-14');
 assert.equal('endsAt' in result,false);assert.equal('resetAt' in result,false);
 const old=currentClaudePromotion(official+' Historical reference: Ultra.',url,'2026-09-19T00:00:00Z');
 assert.equal(old.eligiblePlans.includes('Ultra'),false);
});

test('changed current benefits, date, scope or eligibility cannot borrow valid historical terms',()=>{
 for(const text of [
  updated.replace('25%','50%'),updated.replace('September 14','September 15'),
  updated.replace('weekly limits in Claude Code','5-hour limits in Claude'),
  updated.replace('Pro, Max, Ultra, Team, and seat-based Enterprise','Free, Pro, Max, Ultra, Team, and seat-based Enterprise'),
  updated.replace('Pro, Max, Ultra, Team, and seat-based Enterprise','eligible'),
  updated.replace('5-hour usage limits were not affected','5-hour usage limits were affected'),
  updated.replace('automatically applied','manually applied'),
 ]) assert.throws(()=>currentClaudePromotion(text+' Historical plans: Pro, Max, Team, and seat-based Enterprise plans.',url,'2026-11-03T18:00:00Z'),/changed/);
});

test('all nine offer locales render the verified current plan list and retain old-record compatibility',()=>{
 for(const lang of Object.keys(locales))for(const [text,ultra]of [[official,false],[updated,true]]){
  const gift=currentClaudePromotion(text,url,'2026-11-03T18:00:00Z');
  const html=offers({claude:{name:'Claude',gifts:[gift]}},lang);
  assert.equal(html.includes('Ultra'),ultra,lang);assert.match(html,/25/);assert.ok(html.includes(url));
  delete gift.eligiblePlans;
  assert.equal(offers({claude:{name:'Claude',gifts:[gift]}},lang).includes('Ultra'),false);
 }
});
