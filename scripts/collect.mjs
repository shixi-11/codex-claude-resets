import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { RULES_VERSION, parsePostUrl, extractEmbed, classify, evidenceExcerpt, mergeEvents } from '../src/evidence.mjs';

const root = new URL('../', import.meta.url);
const now = new Date().toISOString();
const existing = JSON.parse(await readFile(new URL('data/events.json', root), 'utf8'));
const previousHealth = JSON.parse(await readFile(new URL('data/health.json', root), 'utf8'));
const health = { ...previousHealth, lastAttemptAt: now, sources: [], status: 'degraded', mode: 'community-discovery' };
const fresh = [];
const request = async (url, headers = {}) => {
  const response = await fetch(url, { headers: { 'User-Agent': 'CodexResetTracker/1.0 (public announcement monitoring)', ...headers }, signal: AbortSignal.timeout(18000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

let candidates = [];
try {
  if (process.env.X_BEARER_TOKEN && process.env.ENABLE_PAID_X_API === 'true') {
    health.mode = 'x-api';
    const headers = { Authorization: `Bearer ${process.env.X_BEARER_TOKEN}` };
    const user = await request('https://api.x.com/2/users/by/username/thsottiaux', headers);
    const timeline = await request(`https://api.x.com/2/users/${user.data.id}/tweets?max_results=30&tweet.fields=created_at,note_tweet`, headers);
    candidates = (timeline.data || []).map(post => ({ id: post.id, url: `https://x.com/thsottiaux/status/${post.id}`, at: post.created_at, fullText: post.note_tweet?.text || post.text }));
    health.discoveryAt = now;
    health.sources.push({ name: 'X timeline', url: 'https://x.com/thsottiaux', ok: true });
  } else {
    const feed = await request('https://codex-reset.com/api/feed');
    if (!Array.isArray(feed.tweets) || !Number.isFinite(Date.parse(feed.fetched_at))) throw new Error('Invalid discovery feed');
    const feedAge = Date.now() - Date.parse(feed.fetched_at);
    if (feed.stale || feedAge > 3 * 3600000 || feedAge < -300000) throw new Error('Discovery feed is stale');
    candidates = feed.tweets.filter(post => /reset|usage|quota|limit/i.test(post.text || '')).slice(0, 24).map(post => ({ url: post.url }));
    health.discoveryAt = feed.fetched_at;
    health.sources.push({ name: 'Codex Reset · discovery only', url: 'https://codex-reset.com/api/feed', ok: true });
  }
  let verified = 0;
  let failed = 0;
  for (const candidate of candidates) {
    const post = parsePostUrl(candidate.url);
    if (!post) continue;
    // Snowflake creation time comes from the verified post ID, never from the discovery feed.
    const publishedAt = new Date(Number((BigInt(post.id) >> 22n) + 1288834974657n)).toISOString();
    if (Date.parse(publishedAt) > Date.now() + 300000) continue;
    try {
      const source = candidate.fullText
        ? { ...post, text: candidate.fullText, truncated: /(?:…|\.\.\.)\s*$/.test(candidate.fullText) }
        : extractEmbed(await request(`https://publish.twitter.com/oembed?url=${encodeURIComponent(post.url)}&omit_script=true`), post.url);
      verified++;
      const classification = classify(source.text, source);
      if (classification.kind === 'other') continue;
      fresh.push({ id: post.id, kind: classification.kind, state: classification.state, reason: classification.reason, author: post.author, sourceUrl: post.url, publishedAt, verifiedAt: now, excerpt: evidenceExcerpt(source.text), truncated: source.truncated, provenance: candidate.fullText ? 'x-api' : 'x-oembed', rulesVersion: RULES_VERSION, contentHash: createHash('sha256').update(source.text).digest('hex') });
    } catch { failed++; }
  }
  health.sources.push({ name: health.mode === 'x-api' ? 'X official API' : 'X official embed', url: 'https://publish.twitter.com/', ok: failed === 0 && verified > 0, checked: verified, failed });
  if (verified > 0) health.lastSuccessAt = now;
  health.status = verified > 0 && failed === 0 ? 'ok' : 'degraded';
} catch (error) {
  health.sources.push({ name: 'Announcement discovery', ok: false, error: error.message.replace(/https?:\/\/\S+/g, '[url]').slice(0, 160) });
}

const merged = mergeEvents(existing, fresh);
await writeFile(new URL('data/events.json', root), JSON.stringify(merged, null, 2) + '\n');
await writeFile(new URL('data/health.json', root), JSON.stringify(health, null, 2) + '\n');
console.log(JSON.stringify({ status: health.status, records: merged.length, checked: fresh.length, lastSuccessAt: health.lastSuccessAt }));
// Keep the last-known-good website publishable. Health is rendered to visitors; no false green status.
