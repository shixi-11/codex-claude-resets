// Preserve paragraph boundaries so historical promotion terms cannot complete
// a claim about the current permanent increase.
export function claudeHelpText(html) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/\s+/g,' ').replace(/<\/(?:p|div|h[1-6]|li|section|article)>|<br\b[^>]*>/gi,'\n')
    .replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&#(?:x0*27|0*39);|&apos;/gi,"'").replace(/&rsquo;|&#8217;/g,'’')
    .split('\n').map(line=>line.replace(/\s+/g,' ').trim()).filter(Boolean).join('\n');
}

export function currentClaudePromotion(text, sourceUrl, verifiedAt) {
  // Verify the reviewed permanent statement within its own paragraph. Unknown
  // current conditions require review; the old +50% FAQ cannot satisfy them.
  const paragraphs=text.split(/\n+/).map(line=>line.trim()).filter(line=>/starting September 14, 2026/i.test(line));
  const current=paragraphs.length===1 && paragraphs[0].match(/\bwe['’]re making part of it permanent: starting September 14, 2026, weekly limits in Claude Code are 25% higher than they were before the promotion for (Pro, Max,(?: Ultra,)? Team, and seat-based Enterprise) plans\.(?: We have a lot more in the works around usage, visibility, and control, so stay tuned\.)?\s*$/i);
  if (!current) throw new Error('Official Claude weekly-limit terms changed; review required');
  return {
    type: 'usage-promotion',
    state: 'announced',
    sourceUrl,
    announcementId: '2093742321473065266',
    verifiedAt,
    benefit: 'Claude Code standard weekly limits +25% permanently',
    eligible: current[1],
    eligiblePlans: /\bUltra\b/i.test(current[1]) ? ['Pro','Max','Ultra','Team','seat-based Enterprise'] : ['Pro','Max','Team','seat-based Enterprise'],
    effectiveOn: '2026-09-14',
    scope: 'Claude Code weekly limits',
    permanent: true,
    isResetCard: false,
  };
}
