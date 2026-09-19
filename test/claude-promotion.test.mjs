import test from 'node:test';
import assert from 'node:assert/strict';
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
