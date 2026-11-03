import test from 'node:test';
import assert from 'node:assert/strict';
import {currentClaudePromotion,claudeHelpText} from '../src/claude-promotion.mjs';
import {offers} from '../src/offers.mjs';
import {locales} from '../src/locales.mjs';
import {platformCopy} from '../src/platform-copy.mjs';
import {visitorCopy} from '../src/visitor-copy.mjs';
const official="This promotion was a limited-time boost on top of your plan. It ran from May 13 through September 13, 2026. We were planning to return weekly limits to their original levels, but we know many of you found the extra usage helpful. So while the full promotional boost couldn't last, we're making part of it permanent: starting September 14, 2026, weekly limits in Claude Code are 25% higher than they were before the promotion for Pro, Max, Team, and seat-based Enterprise plans.";
const historical="From May 13, 2026 through September 13, 2026, weekly usage was 50% higher. 5-hour usage limits were not affected by this promotion. The increased weekly limit was automatically applied to your account.";

const updated=official.replace('Pro, Max, Team','Pro, Max, Ultra, Team');
const url='https://support.claude.com/en/articles/15910845-claude-code-may-august-2026-weekly-limits-promotion';
const at='2026-11-03T18:00:00Z';

test('maps reviewed current Claude terms to the permanent 25% increase',()=>{
 const result=currentClaudePromotion(official,url,at);
 assert.equal(result.permanent,true);assert.equal(result.effectiveOn,'2026-09-14');assert.match(result.benefit,/25%/);
 assert.equal('endsAt' in result,false);
});
test('rejects the superseded 50% promotion terms',()=>{
 assert.throws(()=>currentClaudePromotion('Weekly limits were increased 50% through September 13.',url,at),/changed/);
});
test('current permanent sentence includes Ultra while historical promotion retains old plans',()=>{
 const result=currentClaudePromotion(updated+'\n'+historical,url,at);
 assert.deepEqual(result.eligiblePlans,['Pro','Max','Ultra','Team','seat-based Enterprise']);
 assert.match(result.eligible,/Max, Ultra, Team/);assert.equal(result.sourceUrl,url);assert.equal(result.verifiedAt,at);
 assert.equal(result.state,'announced');assert.equal(result.isResetCard,false);assert.equal(result.effectiveOn,'2026-09-14');
 assert.equal('endsAt' in result,false);assert.equal('resetAt' in result,false);
 assert.equal('claim' in result,false);assert.equal(result.scope,'Claude Code weekly limits');
 assert.equal(currentClaudePromotion(official+'\nHistorical reference: Ultra.',url,at).eligiblePlans.includes('Ultra'),false);
});
test('changed current benefit, date, scope or eligibility cannot borrow valid historical terms',()=>{
 for(const text of [
  updated.replace('25%','50%'),updated.replace('September 14','September 15'),
  updated.replace('weekly limits in Claude Code','5-hour limits in Claude'),
  updated.replace('Pro, Max, Ultra, Team, and seat-based Enterprise','Free, Pro, Max, Ultra, Team, and seat-based Enterprise'),
  updated.replace('Pro, Max, Ultra, Team, and seat-based Enterprise','eligible'),
  updated.replace("we're making part of it permanent",'this temporary benefit applies'),
  updated+' Five-hour limits also change.',updated+' Users must apply manually.',
 ])assert.throws(()=>currentClaudePromotion(text+'\n'+historical,url,at),/changed/);
});
test('all nine offer locales show verified plans without unsupported method or five-hour claims',()=>{
 for(const lang of Object.keys(locales))for(const [text,ultra]of [[official,false],[updated,true]]){
  const gift=currentClaudePromotion(text,url,at),html=offers({claude:{name:'Claude',gifts:[gift]}},lang);
  assert.equal(html.includes('Ultra'),ultra,lang);assert.match(html,/25/);assert.ok(html.includes(url));
  assert.ok(html.includes(visitorCopy[lang].currentWeeklyOnly));
  assert.ok(!html.includes(platformCopy[lang].automatic));assert.ok(!html.includes(visitorCopy[lang].weeklyOnly));
  delete gift.eligiblePlans;assert.equal(offers({claude:{name:'Claude',gifts:[gift]}},lang).includes('Ultra'),false);
 }
});
test('the real current paragraph needs no historical application or five-hour assertion',()=>{
 for(const history of ['',historical,historical.replace('not affected','affected').replace('automatically','manually')]){
  const result=currentClaudePromotion(updated+'\n'+history,url,at);
  assert.equal(result.permanent,true);assert.equal(result.scope,'Claude Code weekly limits');assert.equal('claim' in result,false);
 }
});
test('HTML paragraph boundaries prevent borrowing unchanged historical FAQ wording',()=>{
 const html=current=>'<article><p>'+current+'</p><h2>What was the promotion?</h2><p>'+historical+'</p></article>';
 const text=claudeHelpText(html(updated));assert.ok(text.includes('\n'));
 assert.ok(currentClaudePromotion(text,url,at).eligiblePlans.includes('Ultra'));
 for(const extra of [' The increase requires manual enrollment.',' Five-hour usage limits are also affected.']){
  const conflict=claudeHelpText(html(updated+extra));
  assert.match(conflict,/5-hour usage limits were not affected/);assert.match(conflict,/automatically applied/);
  assert.throws(()=>currentClaudePromotion(conflict,url,at),/changed/);
 }
 assert.throws(()=>currentClaudePromotion(updated+'\n'+updated,url,at),/changed/);
 assert.equal(claudeHelpText('<script>'+updated+'</script><style>'+updated+'</style><p>'+historical+'</p>'),historical);
 const liveMarkup=html(updated.replaceAll("'",'&#x27;')+' We have a lot more in the works around usage, visibility, and control, so stay tuned.');
 assert.ok(currentClaudePromotion(claudeHelpText(liveMarkup),url,at).eligiblePlans.includes('Ultra'));
});
test('old cached permanent records cannot render historical claims as current conditions',()=>{
 const gift={...currentClaudePromotion(updated,url,at),claim:'Applied automatically to eligible accounts',scope:'Claude Code weekly limits only; not five-hour limits or other Claude products'};
 for(const lang of Object.keys(locales)){
  const html=offers({claude:{name:'Claude',gifts:[gift]}},lang);
  assert.ok(!html.includes(platformCopy[lang].automatic));assert.ok(!html.includes(visitorCopy[lang].weeklyOnly));
 }
});

test('the entire real current paragraph is checked, including preceding eligibility conditions',()=>{
 for(const altered of ['Only US subscribers qualify. '+updated,updated.replace('This promotion was','For verified accounts only. This promotion was'),updated.replace('We were planning','Regional restrictions apply. We were planning'),updated.slice(updated.indexOf("we're making"))]){
  assert.throws(()=>currentClaudePromotion(altered+'\n'+historical,url,at),/changed/);
 }
 assert.ok(currentClaudePromotion(claudeHelpText('<p>'+updated+'</p>'),url,at).eligiblePlans.includes('Ultra'));
});
