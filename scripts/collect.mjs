import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { announcementTime } from '../src/announcement-time.mjs';
import { timelineCandidates, corroborateRelay } from '../src/x-relay.mjs';
import { RULES_VERSION, parsePostUrl, extractEmbed, classify, evidenceExcerpt, mergeEvents, postPlatform } from '../src/evidence.mjs';

const root = new URL('../', import.meta.url);
const now = new Date().toISOString();
const existing = JSON.parse(await readFile(new URL('data/events.json', root), 'utf8'));
const previousHealth = JSON.parse(await readFile(new URL('data/health.json', root), 'utf8'));
const health = { ...previousHealth, lastAttemptAt: now, sources: [], failedPosts: [], status: 'degraded', mode: 'community-discovery' };
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
    // Poll each author's actual timeline through a public relay. Official X
    // embeds independently check identities and visible text below.
    for(const author of ['thsottiaux','ClaudeDevs']){
      const url=`https://api.fxtwitter.com/2/profile/${author}/statuses?count=40&with_replies=1`;
      try{
        const posts=timelineCandidates(await request(url),author);
        if(!posts.length)throw new Error('No matching author posts returned');
        candidates.push(...posts);health.sources.push({name:`@${author} timeline via FxEmbed`,url,ok:true,candidates:posts.length});
      }catch(error){health.sources.push({name:`@${author} timeline via FxEmbed`,url,ok:false,error:error.message});}
    }
    health.mode=candidates.length?'profile-relay':'community-discovery';
    // Independent public pages are discovery indexes only. Never accept their classifications or text as evidence.
    for (const source of [
      { name: 'Codex Reset Monitor · discovery only', url: 'https://codexreset.org/' },
      { name: 'Codex Resets · discovery only', url: 'https://codex-resets.com/' },
      { name: 'Reset Radar · Claude link discovery only', url: 'https://www.resetradar.com/data/events.json' },
    ]) {
      if(health.sources.filter(source=>source.name.endsWith('timeline via FxEmbed')&&source.ok).length===2)break;
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
    for(const event of existing.filter(event=>(event.truncated||event.rulesVersion!==RULES_VERSION)&&Date.parse(event.publishedAt)>Date.now()-14*86400000))if(!candidates.some(post=>parsePostUrl(post.url)?.id===event.id))candidates.push({url:event.sourceUrl});
    const sorted = [...new Map(candidates.map(post => [parsePostUrl(post.url).id, post])).values()].sort((a,b) => {const x=BigInt(parsePostUrl(a.url).id),y=BigInt(parsePostUrl(b.url).id);return x===y?0:x>y?-1:1;});
    candidates = ['codex','claude'].flatMap(platform=>sorted.filter(post=>postPlatform(parsePostUrl(post.url).author)===platform).slice(0,30));
    health.discoveryAt = now;
  }
  let verified = 0;
  let failed = 0;
  for (const candidate of candidates) {
    const post = parsePostUrl(candidate.url);
    if (!post) continue;
    if(candidate.relay?.text&&!/reset|usage|allowance|quota|limit|credit/i.test(candidate.relay.text))continue;
    // Snowflake creation time comes from the verified post ID, never from the discovery feed.
    const publishedAt = new Date(Number((BigInt(post.id) >> 22n) + 1288834974657n)).toISOString();
    if (Date.parse(publishedAt) > Date.now() + 300000) continue;
    try {
      let source = candidate.fullText
        ? { ...post, text: candidate.fullText, truncated: /(?:…|\.\.\.)\s*$/.test(candidate.fullText) }
        : extractEmbed(await request(`https://publish.twitter.com/oembed?url=${encodeURIComponent(post.url)}&omit_script=true`), post.url);
      let provenance=candidate.fullText?'x-api':'x-oembed';
      if(source.truncated&&/reset|usage|quota|limit/i.test(source.text)){
        try{
          const relay=candidate.relay||(await request(`https://api.fxtwitter.com/${post.author}/status/${post.id}`)).tweet;
          source=corroborateRelay(source,relay);provenance='x-oembed+fxembed';
        }catch{/* Keep incomplete official evidence unconfirmed. */}
      }
      verified++;
      const classification = classify(source.text, source);
      if (classification.kind === 'other') continue;
      const schedule = classification.kind==='global' && classification.state==='announced' ? announcementTime(source.text,publishedAt,source) : null;
      const eligiblePlans=classification.kind==='banked'&&!source.truncated&&/for all Plus, Pro and Business users/i.test(source.text)&&!/not for all Plus/i.test(source.text)?['Plus','Pro','Business']:null;
      fresh.push({ id: post.id, kind: classification.kind, state: classification.state, reason: classification.reason, author: post.author, platform:postPlatform(post.author), sourceUrl: post.url, publishedAt, verifiedAt: now, excerpt: evidenceExcerpt(source.text), truncated: source.truncated, provenance, ...(source.relayUrl?{relayUrl:source.relayUrl}:{}), ...(eligiblePlans?{eligiblePlans}:{}), rulesVersion: RULES_VERSION, contentHash: createHash('sha256').update(source.text).digest('hex'), ...(schedule||{}) });
    } catch (error) { failed++;(health.failedPosts||=[]).push({url:post.url,error:error.message.slice(0,120)}); }
  }
  health.sources.push({ name: health.mode === 'x-api' ? 'X official API' : 'X official embed', url: 'https://publish.twitter.com/', ok: failed === 0 && verified > 0, checked: verified, failed });
  if (verified > 0) health.lastSuccessAt = now;
  health.status = verified > 0 && failed === 0 ? 'ok' : 'degraded';
} catch (error) {
  health.sources.push({ name: 'Announcement discovery', ok: false, error: error.message.replace(/https?:\/\/\S+/g, '[url]').slice(0, 160) });
}

const merged = mergeEvents(existing, fresh);
const platformFile = new URL('data/platforms.json',root);
const platforms = JSON.parse(await readFile(platformFile,'utf8'));
for(const [key,platform] of Object.entries(platforms)){
 const records=merged.filter(event=>postPlatform(event.author)===key);
 platform.latest=records[0]||null;
 platform.latestGift=records.find(event=>event.kind==='banked'&&['announced','reported'].includes(event.state))||null;
 const latestReset=records.find(event=>event.kind==='global'&&['announced','reported'].includes(event.state));
 platform.lastReset=records.find(event=>event.kind==='global'&&event.state==='reported')||null;
 if(latestReset?.state==='announced'&&latestReset.resetAt&&Date.parse(latestReset.resetAt)>Date.now()-86400000){
  platform.reset={state:'announced',resetAt:latestReset.resetAt,sourceUrl:latestReset.sourceUrl,verifiedAt:latestReset.verifiedAt,approximate:latestReset.approximate,sourceTimezone:latestReset.sourceTimezone};
 } else if(latestReset?.state==='reported'&&Date.parse(latestReset.publishedAt)>Date.now()-86400000){
  platform.reset={state:'completed',resetAt:null,sourceUrl:latestReset.sourceUrl,verifiedAt:latestReset.verifiedAt,publishedAt:latestReset.publishedAt};
 } else platform.reset={state:'unknown',resetAt:null};
 platform.discoveryMode=health.mode;
 platform.trackingState=health.sources.some(source=>source.name===`@${key==='codex'?'thsottiaux':'ClaudeDevs'} timeline via FxEmbed`&&source.ok)?'timeline-checked':'fallback-discovery';
}
await writeFile(platformFile,JSON.stringify(platforms,null,2)+'\n');
await writeFile(new URL('data/events.json', root), JSON.stringify(merged, null, 2) + '\n');
await writeFile(new URL('data/health.json', root), JSON.stringify(health, null, 2) + '\n');
console.log(JSON.stringify({ status: health.status, records: merged.length, checked: fresh.length, lastSuccessAt: health.lastSuccessAt }));
// Keep the last-known-good website publishable. Health is rendered to visitors; no false green status.
