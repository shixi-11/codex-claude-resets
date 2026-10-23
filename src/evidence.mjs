import {announcementTime,isBeforeTenPacificDeadline} from './announcement-time.mjs';
export const RULES_VERSION = '1.4.16';
export const ALLOWED_AUTHORS = ['thsottiaux', 'OpenAIDevs', 'OpenAI', 'ClaudeDevs', 'AnthropicAI', 'claudeai'];
export const postPlatform = author => ['claudedevs','anthropicai','claudeai'].includes(author.toLowerCase()) ? 'claude' : 'codex';

export function parsePostUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !['x.com', 'twitter.com', 'www.x.com', 'www.twitter.com'].includes(url.hostname)) return null;
    const match = url.pathname.match(/^\/([A-Za-z0-9_]+)\/status\/(\d+)\/?$/);
    if (!match || !ALLOWED_AUTHORS.some(author => author.toLowerCase() === match[1].toLowerCase())) return null;
    return { id: match[2], author: match[1], url: `https://x.com/${match[1]}/status/${match[2]}` };
  } catch { return null; }
}

export function decodeHtml(text) {
  return text.replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code) => {
    const n = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code);
    return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '';
  }).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
}

export function extractEmbed(embed, requestedUrl) {
  const post = parsePostUrl(requestedUrl);
  if (!post || typeof embed?.html !== 'string') throw new Error('Invalid embed');
  const author = new URL(embed.author_url);
  if (!['x.com', 'twitter.com'].includes(author.hostname) || author.pathname.replace(/\//g, '').toLowerCase() !== post.author.toLowerCase()) throw new Error('Author mismatch');
  const embeddedPost = parsePostUrl(embed.url);
  if (!embeddedPost || embeddedPost.id !== post.id || embeddedPost.author.toLowerCase() !== post.author.toLowerCase()) throw new Error('Post mismatch');
  const body = embed.html.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1];
  if (!body) throw new Error('Missing post text');
  const text = decodeHtml(body.replace(/<br\s*\/?\s*>/gi, '\n').replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, '').replace(/<[^>]*>/g, '')).trim();
  if (!text) throw new Error('Empty post');
  return { ...post, text, truncated: /(?:…|\.\.\.)\s*$/.test(text) };
}

// This subscriber cache guarantee changes the cost of resuming a conversation.
// Generic API cache duration, performance and adoption posts remain unrelated.
export const isCacheAllowanceUpdate = text => /\blogged in users across Codex & Work\b/i.test(text) && /\bwe keep cache forever\b/i.test(text) && /\byou don['’]t have any penalty for coming back to an old conversation\b/i.test(text) && /\bguaranteed to hit the cache\b/i.test(text);

// Relevance is separate from evidence strength. "Usage" alone may mean adoption.
export function isRelevant(text, {author = ''} = {}) {
  const value = text.replace(/[’‘]/g, "'");
  const reset = /\breset(?:s|ting|ing|ed)?\b/i.test(value);
  if (reset && /\b(?:password|router|device|factory|conversation|context|settings)\s+reset|\breset\s+(?:your |the )?(?:password|router|device|context|settings)\b/i.test(value) && !/quota|usage|allowance|weekly|5.hour|banked/i.test(value)) return false;
  // A request is not an official announcement. Author identity alone cannot
  // place an unscoped reply (for example a T3 Connect reset) in the quota feed.
  if (reset && /\b(?:I|we)\s+(?:(?:really|also|just)\s+)*(?:demand|want|need|request|could use|would like)\b[^.!?]{0,80}\bresets?\b/i.test(value) && !/\b(?:codex|claude|usage|quotas?|allowance|banked|credits?|weekly|5.hour|5h)\b/i.test(value)) return false;
  if (reset && (author.toLowerCase()==='thsottiaux' || /codex|claude|usage|limits?|quotas?|allowance|banked|credits?|all users|everyone|\b(?:Pro|Max|Plus|Team|Business)\b/i.test(value))) return true;
  // Effective usage a subscriber gets is allowance efficiency, not product adoption.
  if (/\b(?:codex|chatgpt work)\b/i.test(value) && /\b(?:increase[sd]?|improv(?:e[sd]?|ing))\s+(?:the\s+)?effective usage you get\b/i.test(value)) return true;
  if (isCacheAllowanceUpdate(value)) return true;
  return /\b(?:usage|rate|weekly|daily|5.hour|5h|subscription)\s+(?:limits?|quotas?|allowance|allocation)\b|\b(?:weekly|subscription)\s+usage\b|\busage\b.{0,60}\b(?:subscription|allocation|allowance)\b|\b(?:quota|allowance)\b|\b(?:codex|claude(?: code)?)(?:'s)?\s+(?:(?:weekly|usage|rate)\s+)?limits?\b|\b(?:usage consumption|usage optimizations)\b/i.test(value);
}

// Re-evaluate complete stored evidence when rules change, even if it drops out of timelines.
// Incomplete records cannot be deleted on the strength of an excerpt alone.
export function reclassifyEvents(events) {
  return events.flatMap(event => {
    if (!event.fullText || event.truncated) return [event];
    const result = classify(event.fullText, event);
    if (result.kind === 'other') return [];
    const {resetAt, approximate, sourceTimezone, timeBasis, timeKind, deadlineText, ...record} = event;
    return [{...record, ...result, rulesVersion: RULES_VERSION,
      ...(result.kind==='global' && result.state==='announced' ? (announcementTime(event.fullText,event.publishedAt,event)||(resetAt?{resetAt,approximate,sourceTimezone,timeBasis,timeKind}:{})) : {})}];
  });
}

// Conservative by design: incomplete, quoted, negative or conditional claims need review.
export const isResetTiming = text => isBeforeTenPacificDeadline(text) || /^Landing (?:within the next [1-9]\d? hours|sometime today by EOD PST)[.!]?$/i.test(text.trim());
// A reviewed independent post is not a reply. Pin its identity and exact text;
// unrelated standalone "Done" posts must not inherit a nearby reset announcement.
export const isReviewedResetSource = source => source?.id==='2111566005684289735' && source.author?.toLowerCase()==='thsottiaux';
export const reviewedResetAnnouncement = ({text='',...source}={}) => isReviewedResetSource(source) && text.trim()==='Done' ? '2111492738025959922' : null;
export const needsResetContext = (text,source={}) => isResetTiming(text) || /^(?:What would you like with your side of reset\?\s+It's done[.!]?|Done and dusted[.!]?)$/i.test(text.replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim()) || !!reviewedResetAnnouncement({...source,text});
// Relay raw text retains a trailing media shortlink removed by the official embed.
const resetDaySignal = text => /^(?:The reports of my reset button being lost are greatly exaggerated\s+)?Day \d+\/\s*(?:Reset|Le limit reset)[.!]?$/i.test(text.replace(/\s+https:\/\/t\.co\/[A-Za-z0-9]+\s*$/,'').trim());
export function validResetContext(context,author,publishedAt,{allowDaySignal=false,depth=0}={}) {
  if(depth>1)return false;
  const post=parsePostUrl(context?.sourceUrl),gap=Date.parse(publishedAt)-Date.parse(context?.publishedAt);
  if(!(post && post.id===context.id && post.author.toLowerCase()===author.toLowerCase() && context.author?.toLowerCase()===author.toLowerCase() && !context.truncated && ['x-oembed','x-oembed+fxembed','x-api'].includes(context.provenance) && /^[0-9a-f]{64}$/.test(context.contentHash||'') && Number.isFinite(Date.parse(context.verifiedAt)) && gap>=0 && gap<=48*3600000))return false;
  if(allowDaySignal && author.toLowerCase()==='thsottiaux' && resetDaySignal(context.fullText||'') && !context.resetContext)return true;
  if(isResetTiming(context.fullText||''))return author.toLowerCase()==='thsottiaux' && validResetContext(context.resetContext,author,context.publishedAt,{allowDaySignal:true,depth:depth+1});
  const result=classify(context.fullText||'',{author:context.author});
  return result.kind==='global' && result.state==='announced';
}
export function classify(text, { id, truncated = false, author = '', publishedAt, resetContext } = {}) {
  const value = text.replace(/[’‘]/g, "'").replace(/\bwe've\b/gi,'we have').replace(/\bwe'll\b/gi,'we will').replace(/\bwe're\b/gi,'we are').replace(/\s+/g, ' ').trim();
  const unknown = { kind: 'signal', state: 'unconfirmed', reason: 'ambiguous' };
  const reviewed=reviewedResetAnnouncement({id,author,text:value});
  const linked=author.toLowerCase()==='thsottiaux' && needsResetContext(value,{id,author});
  if(isReviewedResetSource({id,author}) && !reviewed)return {...unknown,reason:truncated?'truncated':'reviewed-source-changed'};
  if (!isRelevant(value, {author}) && !linked) return { kind: 'other', state: 'information', reason: 'unrelated' };
  if (truncated) return { ...unknown, reason: 'truncated' };
  // Keywordless claims need a recent, independently verified same-author
  // announcement; a reviewed independent post also needs its editorial marker.
  if (linked) {
    const timing=isResetTiming(value);
    if(reviewed && (resetContext?.id!==reviewed || resetContext.relation!=='reviewed-sequence' || resetContext.relationProvenance!=='editorial-primary'))return unknown;
    return validResetContext(resetContext,author,publishedAt,{allowDaySignal:timing})?{kind:'global',state:timing?'announced':'reported',reason:timing?'linked-announcement':reviewed?'reviewed-completion':'linked-completion'}:unknown;
  }
  if (/\b(?:he|she|they|someone) (?:said|says)|\b(?:quote|quoted|correction|retraction|retracted|hypothetical|example)\b|[“”"`]/i.test(value.replace(/"you know when you try it"/gi,''))) return unknown;
  // This complete official formulation negates forgetting, not the reset.
  // Keep the exception narrow so genuine denials and amended claims stay guarded.
  if (author.toLowerCase()==='thsottiaux' && /^Day 17\/ Bet you thought we forgot, but no, it's reset day today\. Also good time to remind you to get Daybreak Blue access, it only takes 15 mins and you don't want to have to do it in the middle of an incident\.$/.test(value)) return {kind:'global',state:'announced',reason:'explicit-announcement'};
  if (/\b(?:not|no|never|won't|isn't|hasn't|didn't|don't|cannot|can't|if|might|maybe|could|would)\b[^.!?;)]{0,65}\breset|\breset\b.{0,55}\b(?:not today|not yet|joke|hypothetical)\b/i.test(value)) return unknown;
  // Secondary verification for terse official announcements, after all safety guards.
  // Day 15 announces a reset, without claiming completed propagation or a time.
  if (author.toLowerCase()==='thsottiaux' && /^Day 15\/ Nevermind, we are still cooking\.\.\. and reset\. Enjoy\.$/.test(value)) return {kind:'global',state:'announced',reason:'explicit-announcement'};
  // This complete Day 18 wording announces a reset alongside product news.
  // It supplies neither completed execution nor a reset instant or plan scope.
  if (author.toLowerCase()==='thsottiaux' && /^Day 18\/ Decisions API is GA, OpenResponses joined the Linux Foundation, we shipped some performance improvements and Uber is going all-in on codex & work\. But yes(?:…|\.\.\.) that's a reset!$/.test(value)) return {kind:'global',state:'announced',reason:'explicit-announcement'};
  // EOD states a deadline but does not establish a timezone or an exact clock time.
  if (author.toLowerCase()==='thsottiaux' && /^Global reset (?:is )?landing by EOD PST time[.!]?(?:\s+Enjoy[.!]?)?$/i.test(value)) return {kind:'global',state:'announced',reason:'explicit-announcement'};
  if (author.toLowerCase()==='thsottiaux' && /^Global reset by (?:EOD|end of (?:the )?day)[.!](?:\s+May the tokens do good things for you[.!])?$/i.test(value)) return {kind:'global',state:'announced',reason:'explicit-announcement'};
  if (author.toLowerCase()==='thsottiaux' && /^Loading (?:a|one) banked reset\b/i.test(value) && !/[?]/.test(value)) return {kind:'banked',state:'announced',reason:'explicit-bank-announcement'};
  if (/\b(?:users|subscribers|accounts) (?:now )?(?:get|receive|have received) (?:a|one) reset (?:to use|you can use) (?:anytime|later|at any time)\b/i.test(value)) return {kind:'banked',state:'reported',reason:'explicit-bank-grant'};
  if (/\bwe (?:have )?(?:already |also |just )?granted\b[^.!?]{0,100}\b(?:users|subscribers|accounts) a reset\b/i.test(value) && /\b(?:apply|use) it (?:whenever|anytime|later)|\breset (?:to use|you can use) (?:anytime|later)\b/i.test(value)) return {kind:'banked',state:'reported',reason:'explicit-bank-grant'};
  if (author.toLowerCase()==='thsottiaux' && /^Put the reset in the bag[.!]\s+All (?:(?:fully|successfully) )?propagated[.!]?$/i.test(value)) return {kind:'global',state:'reported',reason:'explicit-completion'};
  // Tibo's complete first-person announcement uses this exact short formulation.
  // Do not infer a global reset from jokes, replies about earlier resets, or other authors.
  if (author.toLowerCase()==='thsottiaux' && /(?:^|[.!?]\s+)(?:Therefore\s*(?:\.\.\.|…|,)\s*)?(?:the )?reset has been (?:processed|applied|completed|propagated)(?:[.!]|$)/i.test(value)) return {kind:'global',state:'reported',reason:'explicit-completion'};
  if (author.toLowerCase()==='thsottiaux' && /^(?:Resets? (?:(?:has|have) )?(?:(?:all|fully|successfully) )*(?:propagated|completed)|All reset for everyone)(?:[.!]|$)/i.test(value)) return {kind:'global',state:'reported',reason:'explicit-completion'};
  if (author.toLowerCase()==='thsottiaux' && /\b(?:Astra|Codex) users\b/i.test(value) && /(?:^|[.!?]\s+)(?:And of course,?\s+)?a reset is (?:also )?landing by midnight today\.$/i.test(value)) return {kind:'global',state:'announced',reason:'explicit-announcement'};
  if (/\bbanked\s+(?:usage\s+)?reset|\breset\s+credits?\b/i.test(value)) {
    if (/\b(?:affected|not fully applying)\b/i.test(value) && /getting another|replacement|replac|compensat/i.test(value)) return {kind:'banked',state:'announced',reason:'replacement-credit'};
    if (/\b(?:has|have) (?:now )?(?:landed|arrived)|\b(?:is|are) now available|\bwe (?:have )?(?:granted|added|deposited)/i.test(value)) return { kind: 'banked', state: 'reported', reason: 'explicit-bank-grant' };
    if (/\bwe (?:will|are going to|are (?:loading|granting|adding|giving|sending))|\bwill (?:give|land|arrive)|\blands?\b/i.test(value)) return { kind: 'banked', state: 'announced', reason: 'explicit-bank-announcement' };
    return { kind: 'usage', state: 'information', reason: 'bank-information' };
  }
  if (/\b(?:codex|claude|chatgpt work|everyone|all users|all subscribers|all paid|paid (?:users|plans|subscriptions)|global)\b/i.test(value)) {
    if (/\bglobal reset (?:is )?(?:landing|lands)\b/i.test(value) && /\ball paid (?:ChatGPT )?(?:users|accounts|subscribers)\b/i.test(value)) return {kind:'global',state:'announced',reason:'explicit-announcement'};
    if (/\bwe have (?:also |now |just )?reset (?:everyone's )?(?:5-hour and weekly|weekly|5-hour) (?:rate |usage )?limits\b/i.test(value)) return { kind:'global',state:'reported',reason:'explicit-completion' };
    if (/\bwe (?:have )?(?:now |just |already )?reset\s+(?:the )?(?:usage|limits?|quotas?)|\breset (?:has (?:been )?|is now )(?:applied|propagated|complete|completed)|\b(?:usage|limits?) (?:has|have) (?:been )?reset/i.test(value)) return { kind: 'global', state: 'reported', reason: 'explicit-completion' };
    if (/\bwe (?:will|are going to) (?:do |perform |apply )?(?:a |the )?(?:global )?reset|\b(?:reset|resets?) will (?:land|arrive|happen)|\bwe are reset(?:t)?ing usage/i.test(value)) return { kind: 'global', state: 'announced', reason: 'explicit-announcement' };
  }
  // Included plan features that do not consume weekly usage explain allowance
  // treatment; they do not announce a reset, credit grant or new reset time.
  if (/\bincluded in (?:the |your )?(?:Pro|Plus|Max|Team|Business) plan\b/i.test(value) && /\bdoes(?:n't| not) draw on (?:your |the )?weekly usage\b/i.test(value)) return {kind:'usage',state:'information',reason:'usage-inclusion'};
  if (isCacheAllowanceUpdate(value) || /\b(?:usage|limits?|allowance|quota)\b/i.test(value) && /\b(?:improv|reduc|chang|increas|less|lower|more|return|lift|fix|correct|pricing)/i.test(value)) return { kind: 'usage', state: 'information', reason: 'usage-change' };
  return unknown;
}

export function evidenceExcerpt(text,source={}) {
  const sentences = text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/);
  const sentence = sentences.find(part => /(?:global reset|banked reset|reset usage|reset (?:has|will)|usage.{0,45}(?:improv|less|reduc))/i.test(part)) || sentences.find(part => /reset|usage|quota|limit/i.test(part)) || (needsResetContext(text,source)||isReviewedResetSource(source)||isCacheAllowanceUpdate(text)?text:'');
  const words = sentence.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 24).join(' ') + (words.length > 24 ? '…' : '');
}

export function validateEvent(event) {
  const post = parsePostUrl(event.sourceUrl);
  if (!post || post.id !== event.id) throw new Error('Invalid source');
  if (typeof event.author !== 'string' || event.author.toLowerCase() !== post.author.toLowerCase()) throw new Error('Event author mismatch');
  if (event.platform && event.platform !== postPlatform(event.author)) throw new Error('Event platform mismatch');
  if (!['global', 'banked', 'usage', 'signal'].includes(event.kind)) throw new Error('Invalid kind');
  if (!['reported', 'announced', 'information', 'unconfirmed'].includes(event.state)) throw new Error('Invalid state');
  if (!Number.isFinite(Date.parse(event.publishedAt)) || !Number.isFinite(Date.parse(event.verifiedAt))) throw new Error('Invalid date');
  if (event.truncated && event.state !== 'unconfirmed') throw new Error('Incomplete evidence cannot confirm a claim');
  if (!['x-oembed', 'x-oembed+fxembed', 'x-api', 'manual-primary'].includes(event.provenance)) throw new Error('Unsupported evidence provenance');
  if (typeof event.excerpt !== 'string' || !event.excerpt.trim() || event.excerpt.split(/\s+/).length > 25) throw new Error('Invalid excerpt');
  if (event.fullText!==undefined&&(typeof event.fullText!=='string'||!event.fullText.trim()||event.fullText.length>20000||event.truncated)) throw new Error('Invalid full text');
  if (!event.rulesVersion || !/^[0-9a-f]{64}$/.test(event.contentHash)) throw new Error('Missing version anchor');
  if (event.resetContext && !validResetContext(event.resetContext,event.author,event.publishedAt,{allowDaySignal:isResetTiming(event.fullText||'')})) throw new Error('Invalid reset context');
  if (event.reason==='linked-announcement' && !validResetContext(event.resetContext,event.author,event.publishedAt,{allowDaySignal:true})) throw new Error('Announcement needs verified reset context');
  if (event.reason==='linked-completion' && !validResetContext(event.resetContext,event.author,event.publishedAt)) throw new Error('Completion needs verified reset context');
  if (event.reason==='reviewed-completion' && (event.kind!=='global' || event.state!=='reported' || classify(event.fullText||'',event).reason!=='reviewed-completion')) throw new Error('Reviewed completion needs its pinned source and verified editorial context');
  return true;
}

export function mergeEvents(existing, incoming) {
  const records = new Map(existing.map(event => [event.id, event]));
  for (const event of incoming) {
    validateEvent(event);
    const previous = records.get(event.id);
    if(previous&&Date.parse(previous.verifiedAt)>Date.parse(event.verifiedAt))continue;
    // An unavailable or shorter embed must not overwrite already reviewed complete evidence.
    if (previous && !previous.truncated && event.truncated) continue;
    records.set(event.id, event);
  }
  return [...records.values()].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}
