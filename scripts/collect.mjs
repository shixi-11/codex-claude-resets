import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { RULES_VERSION, parsePostUrl, extractEmbed, classify, evidenceExcerpt, mergeEvents } from '../src/evidence.mjs';

const root = new URL('../', import.meta.url);
const now = new Date().toISOString();
const existing = JSON.parse(await readFile(new URL('data/events.json', root), 'utf8'));
const previousHealth = JSON.parse(await readFile(new URL('data/health.json', root), 'utf8'));
const health = { ...previousHealth, lastAttemptAt: now, sources: [], status: 'degraded', mode: 'community-discovery' };
const fresh = [];
const request = async (url, headers = {}, format = 'json') => {
  const response = await fetch(url, { headers: { 'User-Agent': 'CodexResetTracker/1.0 (public announcement monitoring)', ...headers }, signal: AbortSignal.timeout(18000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return format === 'text' ? response.text() : response.json();
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
    // Independent public pages are discovery indexes only. Never accept their classifications or text as evidence.
    for (const source of [
      { name: 'Codex Reset Monitor · discovery only', url: 'https://codexreset.org/' },
      { name: 'Codex Resets · discovery only', url: 'https://codex-resets.com/' },
    ]) {
      try {
        const html = await request(source.url, {}, 'text');
        const urls = [...new Set(html.match(/https:\/\/(?:x|twitter)\.com\/[A-Za-z0-9_]+\/status\/\d+/g) || [])].filter(url => parsePostUrl(url));
        if (!urls.length) throw new Error('No allowed source links');
        candidates.push(...urls.map(url => ({ url })));
        health.sources.push({ ...source, ok: true, candidates: urls.length });
      } catch (error) { health.sources.push({ ...source, ok: false, error: error.message.slice(0, 100) }); }
    }
    if (!candidates.length) {
      const feed = await request('https://www.codexrunway.com/api/status.json');
      const checked = Date.parse(feed.lastSuccessfulCheckAt);
      if (!Array.isArray(feed.events) || !Number.isFinite(checked) || Date.now() - checked > 3 * 3600000 || checked > Date.now() + 300000) throw new Error('Fallback discovery is stale');
      const serialized = JSON.stringify(feed);
      candidates = [...new Set(serialized.match(/https:\/\/(?:x|twitter)\.com\/[A-Za-z0-9_]+\/status\/\d+/g) || [])].filter(url => parsePostUrl(url)).map(url => ({ url }));
      health.sources.push({ name: 'CodexRunway · discovery only', url: 'https://www.codexrunway.com/api/status.json', ok: candidates.length > 0 });
    }
    candidates = [...new Map(candidates.map(post => [parsePostUrl(post.url).id, post])).values()].sort((a,b) => {const x=BigInt(parsePostUrl(a.url).id),y=BigInt(parsePostUrl(b.url).id);return x===y?0:x>y?-1:1;}).slice(0,30);
    health.discoveryAt = now;
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
