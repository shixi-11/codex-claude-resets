import { parsePostUrl } from './evidence.mjs';
const normalize=text=>text.replace(/https?:\/\/\S+/g,'').replace(/[’‘]/g,"'").replace(/(?:…|\.\.\.)\s*$/,'').replace(/\s+/g,' ').trim();
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
 const text=relay.raw_text?.text||relay.text;
 if(typeof text!=='string'||text.length>20000||/(?:…|\.\.\.)\s*$/.test(text))throw new Error('Relay text incomplete');
 const prefix=normalize(official.text),full=normalize(text);
 if(prefix.length<24||!full.startsWith(prefix))throw new Error('Relay does not match official excerpt');
 return {...official,text,truncated:false,relayUrl:`https://api.fxtwitter.com/${post.author}/status/${post.id}`};
}
