import {refreshTopicHeat} from './topic-heat-refresh.mjs';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { announcementTime } from '../src/announcement-time.mjs';
import { timelineCandidates, corroborateRelay, mergeCandidates } from '../src/x-relay.mjs';
import {createCollectionRequest,failureDetails} from './collector-request.mjs';
import { ALLOWED_AUTHORS, reclassifyEvents, RULES_VERSION, parsePostUrl, extractEmbed, classify, evidenceExcerpt, mergeEvents, postPlatform } from '../src/evidence.mjs';

import {syncPlatformState} from '../src/platform-state.mjs';

const root = new URL('../', import.meta.url);
const now = new Date().toISOString();
const existing = JSON.parse(await readFile(new URL('data/events.json', root), 'utf8'));
const previousHealth = JSON.parse(await readFile(new URL('data/health.json', root), 'utf8'));
const health = { ...previousHealth, lastAttemptAt: now, sources: [], failedPosts: [], status: 'degraded', mode: 'community-discovery' };
const fresh = [];
const rejected = new Set();
const duration=Number(process.env.COLLECTION_BUDGET_MS||480000);
if(!Number.isFinite(duration)||duration<1||duration>480000)throw new Error('COLLECTION_BUDGET_MS must be between 1 and 480000');
const deadline=Date.now()+duration;
health.requests={attempted:0,succeeded:0,failed:0,retries:0,recovered:0,failureKinds:{}};
health.coverage={budgetMs:duration,authors:Object.fromEntries(ALLOWED_AUTHORS.map(author=>[author,{discovered:0,skippedIrrelevant:0,skippedFuture:0,checked:0,failed:0,incomplete:0,pending:0}]))};
const platformChecks = Object.fromEntries(['codex','claude'].map(id=>[id,{lastAttemptAt:now, status:'degraded', checked:0, failed:0, discovered:0, authors:[], lastSuccessAt:previousHealth.platforms?.[id]?.lastSuccessAt || null}]));
const request=createCollectionRequest({deadline,onAttempt:result=>{health.requests.attempted++;health.requests[result.ok?'succeeded':'failed']++;if(result.willRetry)health.requests.retries++;if(result.ok&&result.attempts>1)health.requests.recovered++;if(!result.ok){const key=result.kind+(result.status!==null?':'+result.status:'');health.requests.failureKinds[key]=(health.requests.failureKinds[key]||0)+1;}}});

let candidates = [];
let scanCompleted = false;
try {
  if (process.env.X_BEARER_TOKEN && process.env.ENABLE_PAID_X_API === 'true') {
    health.mode = 'x-api';
    const headers = { Authorization: `Bearer ${process.env.X_BEARER_TOKEN}` };
    for (const author of ALLOWED_AUTHORS) {
      try {
        const user = await request(`https://api.x.com/2/users/by/username/${author}`, headers);
        const timeline = await request(`https://api.x.com/2/users/${user.data.id}/tweets?max_results=40&tweet.fields=created_at,note_tweet`, headers);
        candidates.push(...(timeline.data || []).map(post => ({id:post.id,url:`https://x.com/${author}/status/${post.id}`,fullText:post.note_tweet?.text || post.text,discoverySources:['x-api:'+author]})));
        health.sources.push({name:`@${author} timeline via X API`,author,platform:postPlatform(author),ok:true});
      } catch(error) { health.sources.push({name:`@${author} timeline via X API`,author,platform:postPlatform(author),ok:false,...failureDetails(error)}); }
    }
    health.discoveryAt = now;
  } else {
    // Poll each author's actual timeline through a public relay. Official X
    // embeds independently check identities and visible text below.
    for(const author of ALLOWED_AUTHORS){
      const url=`https://api.fxtwitter.com/2/profile/${author}/statuses?count=40&with_replies=1`;
      try{
        const posts=timelineCandidates(await request(url),author);
        if(!posts.length)throw new Error('No matching author posts returned');
        candidates.push(...posts.map(post=>({...post,discoverySources:[url]})));health.sources.push({name:`@${author} timeline via FxEmbed`,url,author,platform:postPlatform(author),ok:true,candidates:posts.length});
      }catch(error){health.sources.push({name:`@${author} timeline via FxEmbed`,url,author,platform:postPlatform(author),ok:false,...failureDetails(error)});}
    }
    health.mode=candidates.length?'profile-relay':'community-discovery';
    // Independent public pages are discovery indexes only. Never accept their classifications or text as evidence.
    for (const source of [
      { name: 'Codex Reset Monitor · discovery only', url: 'https://codexreset.org/' },
      { name: 'Codex Resets · discovery only', url: 'https://codex-resets.com/' },
      { name: 'Reset Radar · Claude link discovery only', url: 'https://www.resetradar.com/data/events.json' },
    ]) {
      if(health.sources.filter(source=>source.name.endsWith('timeline via FxEmbed')&&source.ok).length===ALLOWED_AUTHORS.length)break;
      try {
        const html = await request(source.url, {}, 'text');
        const urls = [...new Set(html.match(/https:\/\/(?:x|twitter)\.com\/[A-Za-z0-9_]+\/status\/\d+/g) || [])].filter(url => parsePostUrl(url));
        if (!urls.length) throw new Error('No allowed source links');
        candidates.push(...urls.map(url => ({ url,discoverySources:[source.url] })));
        health.sources.push({ ...source, ok: true, candidates: urls.length });
      } catch (error) { health.sources.push({ ...source, ok: false, ...failureDetails(error) }); }
    }
    if (!candidates.length) {
      const feed = await request('https://www.codexrunway.com/api/status.json');
      const checked = Date.parse(feed.lastSuccessfulCheckAt);
      if (!Array.isArray(feed.events) || !Number.isFinite(checked) || Date.now() - checked > 3 * 3600000 || checked > Date.now() + 300000) throw new Error('Fallback discovery is stale');
      const serialized = JSON.stringify(feed);
      candidates = [...new Set(serialized.match(/https:\/\/(?:x|twitter)\.com\/[A-Za-z0-9_]+\/status\/\d+/g) || [])].filter(url => parsePostUrl(url)).map(url => ({ url,discoverySources:['https://www.codexrunway.com/api/status.json'] }));
      health.sources.push({ name: 'CodexRunway · discovery only', url: 'https://www.codexrunway.com/api/status.json', ok: candidates.length > 0 });
    }
    for(const event of existing.filter(event=>event.truncated&&Date.parse(event.publishedAt)>Date.now()-14*86400000))if(!candidates.some(post=>parsePostUrl(post.url)?.id===event.id))candidates.push({url:event.sourceUrl,discoverySources:['stored-incomplete-evidence']});
    health.discoveryAt = now;
  }
  health.coverage.rawCandidates=candidates.length;
  candidates=mergeCandidates(candidates); // URL-only indexes cannot erase timeline evidence.
  health.coverage.uniqueCandidates=candidates.length;
  let verified = 0;
  let failed = 0;
  const checkCandidate = async candidate => {
    const post = parsePostUrl(candidate.url);
    if (!post) return;
    const check = platformChecks[postPlatform(post.author)];
    const author=ALLOWED_AUTHORS.find(author=>author.toLowerCase()===post.author.toLowerCase()),coverage=health.coverage.authors[author];
    check.discovered++;
    coverage.discovered++;
    const candidateText=candidate.relay?.raw_text?.text||candidate.relay?.text;
    if(candidateText&&!/(?:…|\.\.\.)\s*$/.test(candidateText)&&!/reset|usage|allowance|quota|limit|credit/i.test(candidateText)){coverage.skippedIrrelevant++;return;}
    // Snowflake creation time comes from the verified post ID, never from the discovery feed.
    const publishedAt = new Date(Number((BigInt(post.id) >> 22n) + 1288834974657n)).toISOString();
    if (Date.parse(publishedAt) > Date.now() + 300000){coverage.skippedFuture++;failed++;check.failed++;coverage.failed++;health.failedPosts.push({url:post.url,kind:'future-timestamp',attempts:0,retryable:false,error:'Post timestamp is in the future',discoverySources:candidate.discoverySources});return;}
    try {
      let source = candidate.fullText
        ? { ...post, text: candidate.fullText, truncated: /(?:…|\.\.\.)\s*$/.test(candidate.fullText) }
        : extractEmbed(await request(`https://publish.twitter.com/oembed?url=${encodeURIComponent(post.url)}&omit_script=true`), post.url);
      let provenance=candidate.fullText?'x-api':'x-oembed';
      if(source.truncated){
        try{
          const relay=candidate.relay||(await request(`https://api.fxtwitter.com/${post.author}/status/${post.id}`)).tweet;
          source=corroborateRelay(source,relay);provenance='x-oembed+fxembed';
        }catch(error){check.failed++;coverage.incomplete++;health.failedPosts.push({url:post.url,stage:'relay-corroboration',...failureDetails(error),discoverySources:candidate.discoverySources});/* Keep incomplete official evidence unconfirmed. */}
      }
      verified++; check.checked++;coverage.checked++;
      const classification = classify(source.text, source);
      if (classification.kind === 'other') { if(!source.truncated)rejected.add(post.id); return; }
      const schedule = classification.kind==='global' && classification.state==='announced' ? announcementTime(source.text,publishedAt,source) : null;
      const eligiblePlans=classification.kind==='banked'&&!source.truncated&&/for all Plus, Pro and Business users/i.test(source.text)&&!/not for all Plus/i.test(source.text)?['Plus','Pro','Business']:null;
      fresh.push({ id: post.id, kind: classification.kind, state: classification.state, reason: classification.reason, author: post.author, platform:postPlatform(post.author), sourceUrl: post.url, publishedAt, verifiedAt: now, excerpt: evidenceExcerpt(source.text), ...(!source.truncated?{fullText:source.text}:{}), truncated: source.truncated, provenance, ...(source.relayUrl?{relayUrl:source.relayUrl}:{}), ...(eligiblePlans?{eligiblePlans}:{}), rulesVersion: RULES_VERSION, contentHash: createHash('sha256').update(source.text).digest('hex'), ...(schedule||{}) });
    } catch (error) { failed++; check.failed++;coverage.failed++;if(error.details?.kind==='budget')coverage.pending++;health.failedPosts.push({url:post.url,stage:'official-evidence',...failureDetails(error),discoverySources:candidate.discoverySources}); }
  }
  for(let offset=0;offset<candidates.length;offset+=4)await Promise.all(candidates.slice(offset,offset+4).map(checkCandidate));
  scanCompleted = true;
  const incomplete=Object.values(health.coverage.authors).reduce((n,c)=>n+c.incomplete,0);
  health.sources.push({ name: health.mode === 'x-api' ? 'X official API' : 'X official embed', url: 'https://publish.twitter.com/', ok: failed === 0 && incomplete===0 && verified > 0, checked: verified, failed, incomplete });

} catch (error) {
  health.sources.push({ name: 'Announcement discovery', ok: false, ...failureDetails(error) });
}

for(const [id,check] of Object.entries(platformChecks)) {
  const sources = health.sources.filter(source=>source.platform===id && source.author);
  check.authors = sources.map(({author,ok})=>({author,ok}));
  const covered = ALLOWED_AUTHORS.filter(author=>postPlatform(author)===id).every(author=>sources.some(source=>source.author===author&&source.ok));
  check.status = scanCompleted && covered && check.failed===0 ? 'ok' : 'degraded';
  if(check.status==='ok')check.lastSuccessAt=now;
}
health.platforms=platformChecks;
health.coverage.finishedAt=new Date().toISOString();
health.coverage.scanCompleted=scanCompleted;
health.coverage.budgetExhausted=Date.now()>=deadline;
health.status=Object.values(platformChecks).every(check=>check.status==='ok')?'ok':'degraded';
if(health.status==='ok')health.lastSuccessAt=now;
const merged = reclassifyEvents(mergeEvents(existing.filter(event=>!rejected.has(event.id)), fresh));
const platformFile = new URL('data/platforms.json',root);
const platforms = JSON.parse(await readFile(platformFile,'utf8'));
syncPlatformState(platforms, merged);
for(const [key,platform] of Object.entries(platforms)){
 platform.discoveryMode=health.mode;
 platform.trackingState=platformChecks[key].status==='ok'?'timeline-checked':'partial-coverage';
}
await writeFile(platformFile,JSON.stringify(platforms,null,2)+'\n');
await writeFile(new URL('data/events.json', root), JSON.stringify(merged, null, 2) + '\n');
await writeFile(new URL('data/health.json', root), JSON.stringify(health, null, 2) + '\n');
console.log(JSON.stringify({ status: health.status, records: merged.length, checked: fresh.length, lastSuccessAt: health.lastSuccessAt }));
// Keep the last-known-good website publishable. Health is rendered to visitors; no false green status.

try{const heat=await refreshTopicHeat(root,request);console.log(JSON.stringify({topicHeat:"updated",observedAt:heat.observedAt}));}catch(error){console.warn("Topic views retained from last successful check: "+error.message);}
