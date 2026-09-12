import {announcementTime} from './announcement-time.mjs';
export const RULES_VERSION = '1.3.2';
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

// Relevance is separate from evidence strength. "Usage" alone may mean adoption.
export function isRelevant(text, {author = ''} = {}) {
  const value = text.replace(/[’‘]/g, "'");
  const reset = /\breset(?:s|ting|ing|ed)?\b/i.test(value);
  if (reset && /\b(?:password|router|device|factory|conversation|context|settings)\s+reset|\breset\s+(?:your |the )?(?:password|router|device|context|settings)\b/i.test(value) && !/quota|usage|allowance|weekly|5.hour|banked/i.test(value)) return false;
  if (reset && (author.toLowerCase()==='thsottiaux' || /codex|claude|usage|limits?|quotas?|allowance|banked|credits?|all users|everyone/i.test(value))) return true;
  return /\b(?:usage|rate|weekly|daily|5.hour|5h|subscription)\s+(?:limits?|quotas?|allowance|allocation)\b|\b(?:weekly|subscription)\s+usage\b|\busage\b.{0,60}\b(?:subscription|allocation|allowance)\b|\b(?:quota|allowance)\b|\b(?:codex|claude(?: code)?)(?:'s)?\s+(?:(?:weekly|usage|rate)\s+)?limits?\b|\b(?:usage consumption|usage optimizations)\b/i.test(value);
}

// Re-evaluate complete stored evidence when rules change, even if it drops out of timelines.
// Incomplete records cannot be deleted on the strength of an excerpt alone.
export function reclassifyEvents(events) {
  return events.flatMap(event => {
    if (!event.fullText || event.truncated) return [event];
    const result = classify(event.fullText, event);
    if (result.kind === 'other') return [];
    const {resetAt, approximate, sourceTimezone, timeBasis, timeKind, ...record} = event;
    return [{...record, ...result, rulesVersion: RULES_VERSION,
      ...(result.kind==='global' && result.state==='announced' ? (announcementTime(event.fullText,event.publishedAt,event)||(resetAt?{resetAt,approximate,sourceTimezone,timeBasis,timeKind}:{})) : {})}];
  });
}

// Conservative by design: incomplete, quoted, negative or conditional claims need review.
export function classify(text, { truncated = false, author = '' } = {}) {
  const value = text.replace(/[’‘]/g, "'").replace(/\bwe've\b/gi,'we have').replace(/\s+/g, ' ').trim();
  const unknown = { kind: 'signal', state: 'unconfirmed', reason: 'ambiguous' };
  if (!isRelevant(value, {author})) return { kind: 'other', state: 'information', reason: 'unrelated' };
  if (truncated) return { ...unknown, reason: 'truncated' };
  if (/\b(?:not|no|never|won't|isn't|hasn't|didn't|don't|cannot|can't|if|might|maybe|could|would)\b[^.!?;)]{0,65}\breset|\breset\b.{0,55}\b(?:not today|not yet|joke|hypothetical)\b/i.test(value)) return unknown;
  if (/\b(?:he|she|they|someone) (?:said|says)|\b(?:quote|quoted|correction|retraction|retracted|hypothetical|example)\b|[“”"`]/i.test(value)) return unknown;
  // Tibo's complete first-person announcement uses this exact short formulation.
  // Do not infer a global reset from jokes, replies about earlier resets, or other authors.
  if (author.toLowerCase()==='thsottiaux' && /^All reset for everyone\.(?: Enjoy the week with Astra\.)?$/i.test(value)) return {kind:'global',state:'reported',reason:'explicit-completion'};
  if (author.toLowerCase()==='thsottiaux' && /\b(?:Astra|Codex) users\b/i.test(value) && /(?:^|[.!?]\s+)(?:And of course,?\s+)?a reset is (?:also )?landing by midnight today\.$/i.test(value)) return {kind:'global',state:'announced',reason:'explicit-announcement'};
  if (/\bbanked\s+(?:usage\s+)?reset|\breset\s+credits?\b/i.test(value)) {
    if (/\b(?:affected|not fully applying)\b/i.test(value) && /getting another|replacement|replac|compensat/i.test(value)) return {kind:'banked',state:'announced',reason:'replacement-credit'};
    if (/\b(?:has|have) (?:now )?(?:landed|arrived)|\b(?:is|are) now available|\bwe (?:have )?(?:granted|added|deposited)/i.test(value)) return { kind: 'banked', state: 'reported', reason: 'explicit-bank-grant' };
    if (/\bwe (?:will|are going to)|\bwill (?:give|land|arrive)|\blands?\b/i.test(value)) return { kind: 'banked', state: 'announced', reason: 'explicit-bank-announcement' };
    return { kind: 'usage', state: 'information', reason: 'bank-information' };
  }
  if (/\b(?:codex|claude|chatgpt work|everyone|all users|all subscribers|all paid|paid (?:users|plans|subscriptions)|global)\b/i.test(value)) {
    if (/\bwe have (?:also |now |just )?reset (?:everyone's )?(?:5-hour and weekly|weekly|5-hour) (?:rate |usage )?limits\b/i.test(value)) return { kind:'global',state:'reported',reason:'explicit-completion' };
    if (/\bwe (?:have )?(?:now |just |already )?reset\s+(?:the )?(?:usage|limits?|quotas?)|\breset (?:has (?:been )?|is now )(?:applied|propagated|complete|completed)|\b(?:usage|limits?) (?:has|have) (?:been )?reset/i.test(value)) return { kind: 'global', state: 'reported', reason: 'explicit-completion' };
    if (/\bwe (?:will|are going to) (?:do |perform |apply )?(?:a |the )?(?:global )?reset|\b(?:reset|resets?) will (?:land|arrive|happen)|\bwe are reset(?:t)?ing usage/i.test(value)) return { kind: 'global', state: 'announced', reason: 'explicit-announcement' };
  }
  if (/\b(?:usage|limits?|allowance|quota)\b/i.test(value) && /\b(?:improv|reduc|chang|increas|less|lower|more|return|lift|fix|pricing)/i.test(value)) return { kind: 'usage', state: 'information', reason: 'usage-change' };
  return unknown;
}

export function evidenceExcerpt(text) {
  const sentences = text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/);
  const sentence = sentences.find(part => /(?:global reset|banked reset|reset usage|reset (?:has|will)|usage.{0,45}(?:improv|less|reduc))/i.test(part)) || sentences.find(part => /reset|usage|quota|limit/i.test(part)) || '';
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
