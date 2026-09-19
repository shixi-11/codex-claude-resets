const requiredTerms = [
  /starting September 14, 2026[^.]{0,180}weekly limits in Claude Code are 25% higher/i,
  /Pro, Max, Team, and seat-based Enterprise plans/i,
  /5-hour usage limits were not affected/i,
  /automatically applied/i,
];

export function currentClaudePromotion(text, sourceUrl, verifiedAt) {
  if (!requiredTerms.every(pattern => pattern.test(text))) {
    throw new Error('Official Claude weekly-limit terms changed; review required');
  }
  return {
    type: 'usage-promotion',
    state: 'announced',
    sourceUrl,
    verifiedAt,
    benefit: 'Claude Code standard weekly limits +25% permanently',
    eligible: 'Pro, Max, Team, and seat-based Enterprise; excludes Free and consumption-based Enterprise seats',
    claim: 'Applied automatically to eligible accounts',
    effectiveOn: '2026-09-14',
    scope: 'Claude Code weekly limits only; not five-hour limits or other Claude products',
    permanent: true,
    isResetCard: false,
  };
}
