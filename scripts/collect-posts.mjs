// Verify explicit primary links without pretending to refresh timeline coverage.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parsePostUrl,extractEmbed,classify,needsResetContext,evidenceExcerpt,RULES_VERSION,mergeEvents,reclassifyEvents,validateEvent} from '../src/evidence.mjs';
import {collectionRequest} from '../src/collection-request.mjs';
import {corroborateResetQuote} from '../src/x-relay.mjs';
import {announcementTime} from '../src/announcement-time.mjs';
import {syncPlatformState} from '../src/platform-state.mjs';
import {assertTrackingSync} from '../src/tracking-audit.mjs';
const root=new URL('../',import.meta.url),now=new Date().toISOString(),fresh=[];
const embed=async post=>extractEmbed(await collectionRequest(`https://publish.twitter.com/oembed?url=${encodeURIComponent(post.url)}&omit_script=true`),post.url);
const hash=text=>createHash('sha256').update(text).digest('hex');
if(!process.argv.slice(2).length)throw new Error('Pass one or more allowlisted X post URLs');
for(const url of process.argv.slice(2)) {
 const post=parsePostUrl(url);if(!post)throw new Error('Invalid primary URL');
 const source=await embed(post),publishedAt=new Date(Number((BigInt(post.id)>>22n)+1288834974657n)).toISOString();
 let resetContext;
 if(needsResetContext(source.text)&&!source.truncated){
  const relay=(await collectionRequest(`https://api.fxtwitter.com/${post.author}/status/${post.id}`)).tweet;
  const quoted=parsePostUrl(relay?.quote?.url);if(!quoted)throw new Error('No quoted primary announcement');
  resetContext=corroborateResetQuote(source,relay,await embed(quoted),now);resetContext.contentHash=hash(resetContext.fullText);
 }
 const result=classify(source.text,{...source,publishedAt,resetContext});if(result.kind==='other')continue;
 const event={id:post.id,author:post.author,sourceUrl:post.url,publishedAt,verifiedAt:now,excerpt:evidenceExcerpt(source.text),...(!source.truncated?{fullText:source.text}:{}),truncated:source.truncated,provenance:'x-oembed',rulesVersion:RULES_VERSION,contentHash:hash(source.text),...result,...(resetContext?{resetContext}:{}),...(result.kind==='global'&&result.state==='announced'?announcementTime(source.text,publishedAt,source):{})};
 validateEvent(event);fresh.push(event);
}
const events=reclassifyEvents(mergeEvents(JSON.parse(await readFile(new URL('data/events.json',root),'utf8')),fresh));
const platforms=syncPlatformState(JSON.parse(await readFile(new URL('data/platforms.json',root),'utf8')),events);assertTrackingSync(platforms,events);
await writeFile(new URL('data/events.json',root),JSON.stringify(events,null,2)+'\n');
await writeFile(new URL('data/platforms.json',root),JSON.stringify(platforms,null,2)+'\n');
console.log(JSON.stringify({mode:'explicit-primary',records:fresh.map(e=>({id:e.id,kind:e.kind,state:e.state,publishedAt:e.publishedAt})),healthUnchanged:true}));
