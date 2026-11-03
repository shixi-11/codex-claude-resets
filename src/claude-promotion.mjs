const requiredTerms = [
  /starting September 14, 2026[^.]{0,180}weekly limits in Claude Code are 25% higher/i,
  /5-hour usage limits were not affected/i,
  /automatically applied/i,
];

export function currentClaudePromotion(text, sourceUrl, verifiedAt) {
  // Read eligibility from the same permanent-increase sentence, not from the
  // expired promotion elsewhere on the page. Older evidence must not gain Ultra.
  const terms=text.match(/starting September 14, 2026, weekly limits in Claude Code are 25% higher than they were before the promotion for (Pro, Max,(?: Ultra,)? Team, and seat-based Enterprise) plans\./i);
  if (!terms || !requiredTerms.every(pattern => pattern.test(text))) {
    throw new Error('Official Claude weekly-limit terms changed; review required');
  }
  const eligiblePlans=['Pro','Max',...(/\bUltra\b/i.test(terms[1])?['Ultra']:[]),'Team','seat-based Enterprise'];
  return {
    type: 'usage-promotion',
    state: 'announced',
    sourceUrl,
    announcementId: '2093742321473065266',
    verifiedAt,
    benefit: 'Claude Code standard weekly limits +25% permanently',
    eligible: terms[1]+'; excludes Free and consumption-based Enterprise seats',
    eligiblePlans,
    claim: 'Applied automatically to eligible accounts',
    effectiveOn: '2026-09-14',
    scope: 'Claude Code weekly limits only; not five-hour limits or other Claude products',
    permanent: true,
    isResetCard: false,
  };
}
