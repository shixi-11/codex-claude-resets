import {createHash} from 'node:crypto';
import { parsePostUrl, classify, needsResetContext, isResetTiming, validResetContext, extractEmbed, reviewedResetAnnouncement, isReviewedResetSource, isCacheAllowanceUpdate, decodeHtml } from './evidence.mjs';
const normalize=text=>text.replace(/https?:\/\/\S+/g,'').replace(/[’‘]/g,"'").replace(/(?:…|\.\.\.)\s*$/,'').replace(/\s+/g,' ').trim();
export function shouldCheckCandidate(candidate) {
 const text=candidate.relay?.raw_text?.text||candidate.relay?.text;
 const post=parsePostUrl(candidate.url);
 // Always recheck this reviewed identity, even if its text gains an exception.
 return isReviewedResetSource(post) || !text || /(?:…|\.\.\.)\s*$/.test(text) || /reset|usage|allowance|quota|limit|credit/i.test(text) || isCacheAllowanceUpdate(text.replace(/&amp;/g,'&')) || (post?.author.toLowerCase()==='thsottiaux' && needsResetContext(normalize(text),post));
}
export function timelineCandidates(payload,author){
 if(payload.code!==200||!Array.isArray(payload.results))throw new Error('Invalid relay timeline');
 const found=new Map();
 const visit=item=>{
  if(!item||typeof item!=='object')return;
  const post=parsePostUrl(item.url);
  if(post&&post.author.toLowerCase()===author.toLowerCase()&&item.author?.screen_name?.toLowerCase()===author.toLowerCase()&&String(item.id)===post.id&&!item.author.protected){found.set(post.id,{url:post.url,relay:item});}
  if(item.quote)visit(item.quote);
  if(item.status)visit(item.status);
  if(Array.isArray(item.thread))item.thread.forEach(visit);
 };
 payload.results.forEach(visit);
 return [...found.values()];
}
export function corroborateRelay(official,relay){
 const post=parsePostUrl(relay?.url);
 if(!post||post.id!==official.id||post.author.toLowerCase()!==official.author.toLowerCase()||relay.author?.screen_name?.toLowerCase()!==official.author.toLowerCase()||String(relay.id)!==official.id||relay.author?.protected)throw new Error('Relay identity mismatch');
 const expected=Number((BigInt(post.id)>>22n)+1288834974657n);
 if(!Number.isFinite(relay.created_timestamp)||Math.abs(relay.created_timestamp*1000-expected)>1000)throw new Error('Relay timestamp mismatch');
 let text=relay.raw_text?.text||relay.text;
 if(typeof text!=='string'||text.length>20000||/(?:…|\.\.\.)\s*$/.test(text))throw new Error('Relay text incomplete');
 const prefix=normalize(official.text);let full=normalize(text);
 // Some raw_text responses HTML-encode ampersands. Decode once only when the
 // raw form fails the primary excerpt; identity, time and text checks still apply.
 if(!full.startsWith(prefix)){text=decodeHtml(text);full=normalize(text);}
 // Short complete posts can be corroborated only by exact text equality.
 if((prefix.length<24 && (official.truncated||full!==prefix))||!full.startsWith(prefix))throw new Error('Relay does not match official excerpt');
 return {...official,text,truncated:false,relayUrl:`https://api.fxtwitter.com/${post.author}/status/${post.id}`};
}

export function corroborateResetQuote(official,relay,quoteOfficial,verifiedAt) {
 const own=corroborateRelay(official,relay),quoted=relay?.quote,post=parsePostUrl(quoted?.url);
 if(!post||post.author.toLowerCase()!==own.author.toLowerCase()||post.id===own.id)throw new Error('Reset quote identity mismatch');
 const source=corroborateRelay(quoteOfficial,quoted);
 const classification=classify(source.text,source);
 const ownAt=Number((BigInt(own.id)>>22n)+1288834974657n),at=Number((BigInt(post.id)>>22n)+1288834974657n);
 if(classification.kind!=='global'||classification.state!=='announced'||ownAt<at||ownAt-at>48*3600000)throw new Error('Reset quote is not a recent announcement');
 return {id:source.id,author:source.author,sourceUrl:source.url,fullText:source.text,publishedAt:new Date(at).toISOString(),verifiedAt,truncated:false,provenance:quoteOfficial.truncated?'x-oembed+fxembed':'x-oembed',relation:'quote',relationProvenance:'fxembed'};
}

// Follow at most a completion -> timing reply -> reset-day signal chain.
// Fetch detail endpoints: timeline quotes can omit the quoted post's reply ID.
export async function resolveResetContext(official,request,verifiedAt,depth=0) {
 if(depth>1 || official.author.toLowerCase()!=='thsottiaux')throw new Error('Unsupported reset context chain');
 const relay=(await request(`https://api.fxtwitter.com/${official.author}/status/${official.id}`)).tweet;
 const own=corroborateRelay(official,relay);
 const reviewed=reviewedResetAnnouncement(own);
 if(reviewed && (relay.quote || relay.replying_to || relay.replying_to_status))throw new Error('Reviewed completion is no longer standalone');
 let parent=parsePostUrl(relay?.quote?.url),relation='quote';
 if(!parent){
  const reply=relay?.replying_to;
  parent=typeof reply==='object'&&reply?parsePostUrl(reply.url):parsePostUrl(`https://x.com/${reply}/status/${relay?.replying_to_status}`);
  relation='reply';
 }
 if(!parent && reviewed){parent=parsePostUrl(`https://x.com/${own.author}/status/${reviewed}`);relation='reviewed-sequence';}
 if(!parent || parent.author.toLowerCase()!==own.author.toLowerCase() || parent.id===own.id)throw new Error('No matching reset relation');
 const parentOfficial=extractEmbed(await request(`https://publish.twitter.com/oembed?url=${encodeURIComponent(parent.url)}&omit_script=true`),parent.url);
 const parentRelay=relation==='quote'?relay.quote:(await request(`https://api.fxtwitter.com/${parent.author}/status/${parent.id}`)).tweet;
 const source=corroborateRelay(parentOfficial,parentRelay);
 const at=new Date(Number((BigInt(parent.id)>>22n)+1288834974657n)).toISOString();
 const context={id:source.id,author:source.author,sourceUrl:source.url,fullText:source.text,publishedAt:at,verifiedAt,truncated:false,provenance:parentOfficial.truncated?'x-oembed+fxembed':'x-oembed',relation,relationProvenance:reviewed?'editorial-primary':'fxembed',contentHash:createHash('sha256').update(source.text).digest('hex')};
 if(isResetTiming(source.text))context.resetContext=await resolveResetContext(source,request,verifiedAt,depth+1);
 const ownAt=new Date(Number((BigInt(own.id)>>22n)+1288834974657n)).toISOString();
 if(!validResetContext(context,own.author,ownAt,{allowDaySignal:isResetTiming(own.text)}))throw new Error('Reset relation is not a recent announcement');
 return context;
}
