const requiredTerms = [
  /5-hour usage limits were not affected/i,
  /automatically applied/i,
];

export function currentClaudePromotion(text, sourceUrl, verifiedAt) {
  // Read eligibility from the current +25% sentence, never the historical
  // +50% promotion elsewhere in the same article. Both reviewed lists remain
  // valid; any other change still requires review.
  const current = text.match(/\bstarting September 14, 2026, weekly limits in Claude Code are 25% higher than they were before the promotion for (Pro, Max,(?: Ultra,)? Team, and seat-based Enterprise) plans\./i);
  if (!current || !requiredTerms.every(pattern => pattern.test(text))) {
    throw new Error('Official Claude weekly-limit terms changed; review required');
  }
  return {
    type: 'usage-promotion',
    state: 'announced',
    sourceUrl,
    announcementId: '2093742321473065266',
    verifiedAt,
    benefit: 'Claude Code standard weekly limits +25% permanently',
    eligible: `${current[1]}; excludes Free and consumption-based Enterprise seats`,
    eligiblePlans: /\bUltra\b/i.test(current[1]) ? ['Pro','Max','Ultra','Team','seat-based Enterprise'] : ['Pro','Max','Team','seat-based Enterprise'],
    claim: 'Applied automatically to eligible accounts',
    effectiveOn: '2026-09-14',
    scope: 'Claude Code weekly limits only; not five-hour limits or other Claude products',
    permanent: true,
    isResetCard: false,
  };
}
