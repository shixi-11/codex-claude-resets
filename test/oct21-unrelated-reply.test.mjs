import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,copyFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {classify,isRelevant,extractEmbed,decodeHtml,parsePostUrl,reclassifyEvents} from '../src/evidence.mjs';
import {syncPlatformState} from '../src/platform-state.mjs';
import {assertTrackingSync} from '../src/tracking-audit.mjs';

const fixture=JSON.parse(await readFile(new URL('./fixtures/oct21-unrelated-reply.json',import.meta.url),'utf8'));
const source=extractEmbed(fixture.reply.embed,fixture.reply.embed.url),id=source.id;
const date=id=>new Date(Number((BigInt(id)>>22n)+1288834974657n)).toISOString();
const now='2026-10-21T10:00:00.000Z',day15='2112432076767289678',done='2111566005684289735';
const original=JSON.parse(await readFile(new URL('../data/events.json',import.meta.url),'utf8'));
const controls=original.filter(e=>[day15,done,'2112592264686149749','2112712984644784534'].includes(e.id));
const bad={id,author:source.author,platform:'codex',sourceUrl:source.url,publishedAt:date(id),verifiedAt:now,excerpt:source.text,fullText:source.text,truncated:false,provenance:'x-oembed',contentHash:createHash('sha256').update(source.text).digest('hex'),rulesVersion:'old',kind:'signal',state:'unconfirmed',reason:'ambiguous'};

test('official reset demand replies directly to the verified T3 Connect context and has no quota subject',()=>{
 const {relay}=fixture.reply,parent=fixture.parent;
 assert.equal(source.text,'I demand a reset');assert.equal(source.truncated,false);
 assert.equal(relay.text.slice(relay.raw_text.display_text_range[0]),source.text);
 assert.equal(relay.replying_to,'theo');assert.equal(relay.replying_to_status,parent.relay.id);
 assert.equal(parent.embed.url,parent.relay.url);assert.equal(new URL(parent.embed.author_url).pathname,'/theo');
 assert.equal(parent.relay.author.screen_name,'theo');
 const excerpt=decodeHtml(parent.embed.html.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)[1].replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]*>/g,'')).replace(/…\s*$/,'');
 assert.ok(parent.relay.text.startsWith(excerpt));
 for(const term of ['T3 Connect','T3 Code','Cloudflare','thundering herd','Tailscale'])assert.ok(parent.relay.text.includes(term));
 assert.match(date(parent.relay.id),/^2026-10-20T01:44:21\./);assert.equal(date(id),'2026-10-21T06:49:29.003Z');
 assert.ok(Math.abs(Date.parse(date(parent.relay.id))-parent.relay.created_timestamp*1000)<1000);
 assert.equal(parsePostUrl(parent.embed.url),null); // Context does not expand the event-author allowlist.
 assert.equal(isRelevant(source.text,source),false);
 assert.deepEqual(classify(source.text,source),{kind:'other',state:'information',reason:'unrelated'});
});

test('request relevance requires a product or allowance subject while existing reset evidence is retained',()=>{
 for(const text of ['I demand a reset','@theo I demand a reset','We want a reset.','I really need a reset!','We could use a reset of T3 Connect','I request a reset for the Cloudflare rate limits','We would like another reset'])assert.equal(classify(text,{author:'thsottiaux'}).kind,'other',text);
 for(const text of ['I demand a Codex reset','We need a Claude quota reset','I want a reset of my weekly usage allowance'])assert.deepEqual(classify(text,{author:'thsottiaux'}),{kind:'signal',state:'unconfirmed',reason:'ambiguous'},text);
 for(const e of controls)assert.deepEqual(classify(e.fullText,e),{kind:e.kind,state:e.state,reason:e.reason},e.id);
 for(const text of ['Day 13/ Le limit reset','People have escaped the TL and are asking me for resets on the street now.'])assert.equal(classify(text,{author:'thsottiaux'}).state,'unconfirmed');
 const incomplete={...bad,fullText:undefined,truncated:true};
 assert.deepEqual(reclassifyEvents([bad,incomplete]),[incomplete]);
 const before=syncPlatformState({codex:{},claude:{}},[bad,...controls]);
 const events=reclassifyEvents([bad,...controls]),after=syncPlatformState({codex:{},claude:{}},events);
 assert.ok(!events.some(e=>e.id===id));assert.equal(after.codex.latest.id,'2112712984644784534');
 for(const field of ['latestReset','lastReset'])assert.equal(after.codex[field].id,before.codex[field].id);
 assert.deepEqual(after.codex.reset,before.codex.reset);assert.equal(after.codex.latestReset.id,day15);assert.equal(after.codex.lastReset.id,done);assert.equal(after.codex.reset.resetAt,null);
 assertTrackingSync(after,events);
});

test('actual timeline and targeted collectors remove complete stored false positives and cannot re-add the demand',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'unrelated-reset-reply-'));
 try{
  for(const part of ['src','scripts','data'])await mkdir(join(dir,part));
  for(const file of ['scripts/collect.mjs','scripts/collect-posts.mjs','scripts/topic-heat-refresh.mjs','src/evidence.mjs','src/tracking-audit.mjs','src/platform-state.mjs','src/announcement-time.mjs','src/x-relay.mjs','src/collection-request.mjs'])await copyFile(new URL('../'+file,import.meta.url),join(dir,file));
  await writeFile(join(dir,'fixture.json'),JSON.stringify(fixture));await writeFile(join(dir,'data/events.json'),JSON.stringify([bad,...controls]));
  await writeFile(join(dir,'data/platforms.json'),JSON.stringify({codex:{},claude:{}}));await writeFile(join(dir,'data/health.json'),JSON.stringify({lastSuccessAt:'2026-10-21T09:00:00Z'}));
  await writeFile(join(dir,'mock.mjs'),`
   import {readFileSync} from 'node:fs';const f=JSON.parse(readFileSync(new URL('./fixture.json',import.meta.url)));
   const RealDate=Date;globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:['${now}']));}static now(){return RealDate.parse('${now}');}};
   globalThis.fetch=async input=>{const u=new URL(input);
    if(u.pathname.includes('/profile/')){const author=u.pathname.split('/')[3];return Response.json({code:200,results:author==='thsottiaux'?[f.reply.relay,f.reply.relay]:[{id:'123',url:'https://x.com/'+author+'/status/123',author:{screen_name:author},text:'Hello world'}]});}
    if(u.hostname==='publish.twitter.com')return Response.json(f.reply.embed);
    throw Error('Unexpected request '+input);
   };
  `);
  for(const script of ['collect-posts.mjs','collect.mjs','collect.mjs','collect-posts.mjs']){
   const health=await readFile(join(dir,'data/health.json'),'utf8');
   const r=spawnSync(process.execPath,['--import',pathToFileURL(join(dir,'mock.mjs')).href,join(dir,'scripts',script),...(script==='collect-posts.mjs'?[source.url]:[])],{encoding:'utf8',timeout:10000,env:{...process.env,ENABLE_PAID_X_API:'false',COLLECT_POST_URLS:''}});
   assert.equal(r.status,0,r.stderr);
   const events=JSON.parse(await readFile(join(dir,'data/events.json'),'utf8')),p=JSON.parse(await readFile(join(dir,'data/platforms.json'),'utf8'));
   assert.ok(!events.some(e=>e.id===id));assert.equal(events.length,controls.length);assertTrackingSync(p,events);
   assert.equal(p.codex.latestReset.id,day15);assert.equal(p.codex.lastReset.id,done);assert.equal(p.codex.reset.state,'announced');assert.equal(p.codex.reset.resetAt,null);
   if(script==='collect-posts.mjs')assert.equal(await readFile(join(dir,'data/health.json'),'utf8'),health);
  }
 }finally{if(dirname(resolve(dir))===resolve(tmpdir()))await rm(dir,{recursive:true,force:true});}
});
