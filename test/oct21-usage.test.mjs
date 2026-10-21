import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,copyFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {classify,extractEmbed,isRelevant,reclassifyEvents,validateEvent} from '../src/evidence.mjs';
import {corroborateRelay,shouldCheckCandidate,timelineCandidates} from '../src/x-relay.mjs';
import {assertTrackingSync} from '../src/tracking-audit.mjs';
import {syncPlatformState} from '../src/platform-state.mjs';
import {earlierPosts} from '../src/priority-details.mjs';
import {announcementTime} from '../src/announcement-time.mjs';

const fixture=JSON.parse(await readFile(new URL('./fixtures/oct21-usage.json',import.meta.url),'utf8'));
const [correction,cache]=Object.keys(fixture),day15='2112432076767289678',done='2111566005684289735';
const now='2026-10-21T03:00:00.000Z';
const official=id=>extractEmbed(fixture[id].embed,fixture[id].embed.url);
const complete=id=>official(id).truncated?corroborateRelay(official(id),fixture[id].relay):official(id);
const date=id=>new Date(Number((BigInt(id)>>22n)+1288834974657n)).toISOString();
const existing=JSON.parse(await readFile(new URL('../data/events.json',import.meta.url),'utf8')).filter(e=>[day15,done].includes(e.id));

test('40k plan-limit correction and conditional credits are usage information with corroborated full evidence',()=>{
 const source=complete(correction);assert.equal(official(correction).truncated,true);
 assert.match(source.text,/approximately 40,000 accounts/);assert.match(source.text,/have corrected the issue/);
 assert.match(source.text,/If this affected you, we'll add credits to your account/);
 assert.deepEqual(classify(source.text,source),{kind:'usage',state:'information',reason:'usage-change'});
 assert.equal(isRelevant(source.text,source),true);
 assert.equal(classify(official(correction).text,official(correction)).state,'unconfirmed');
 assert.equal(date(correction),'2026-10-20T17:10:20.624Z');
 for(const change of [{id:cache},{author:{screen_name:'OpenAI'}},{created_timestamp:0},{text:'A different post',raw_text:{text:'A different post'}}])assert.throws(()=>corroborateRelay(official(correction),{...fixture[correction].relay,...change}));
});

test('Day16 cache allowance reaches discovery, retains its own time and source paragraphs, and excludes generic API caching',()=>{
 const source=complete(cache);assert.equal(source.truncated,false);
 assert.match(source.text,/^Day 16\/\n\nYou can now cache for 12h/);
 assert.deepEqual(classify(source.text,source),{kind:'usage',state:'information',reason:'usage-change'});
 assert.equal(date(cache),'2026-10-21T01:10:02.505Z');
 assert.equal(date(fixture[cache].relay.quote.id),'2026-10-20T17:56:38.532Z');
 assert.equal(announcementTime(source.text,date(cache),source),null);
 for(const id of [correction,cache]){
  const relay=fixture[id].relay;
  const candidates=timelineCandidates({code:200,results:[relay,relay]},'thsottiaux');
  assert.equal(candidates.length,1);assert.equal(shouldCheckCandidate(candidates[0]),true);
 }
 for(const text of ['The API now supports 12h caching.','We made improvements to Codex context caching and request routing.','Codex adoption increased as more users hit the cache.','We keep cache forever in our database.']){
  assert.equal(classify(text,{author:'thsottiaux'}).kind,'other',text);
  assert.equal(shouldCheckCandidate({url:source.url,relay:{text}}),false,text);
 }
 assert.equal(classify(source.text,{...source,truncated:true}).state,'unconfirmed');
 assert.notEqual(classify('"'+source.text+'"',source).state,'reported');
});

test('real collection and targeted long-post rechecks preserve reset history, health truth and both usage records',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'oct21-usage-'));
 try{
  for(const part of ['src','scripts','data'])await mkdir(join(dir,part));
  for(const file of ['scripts/collect.mjs','scripts/collect-posts.mjs','scripts/topic-heat-refresh.mjs','src/evidence.mjs','src/tracking-audit.mjs','src/platform-state.mjs','src/announcement-time.mjs','src/x-relay.mjs','src/collection-request.mjs'])await copyFile(new URL('../'+file,import.meta.url),join(dir,file));
  await writeFile(join(dir,'fixture.json'),JSON.stringify(fixture));
  await writeFile(join(dir,'data/events.json'),JSON.stringify(existing));
  await writeFile(join(dir,'data/platforms.json'),JSON.stringify({codex:{gifts:[]},claude:{gifts:[]}}));
  await writeFile(join(dir,'data/health.json'),JSON.stringify({lastSuccessAt:'2026-10-20T10:14:40.591Z'}));
  await writeFile(join(dir,'mock.mjs'),`
   import {readFileSync} from 'node:fs';const f=JSON.parse(readFileSync(new URL('./fixture.json',import.meta.url)));
   const RealDate=Date;globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:['${now}']));}static now(){return RealDate.parse('${now}');}};
   globalThis.fetch=async input=>{const u=new URL(input);
    if(u.pathname.includes('/profile/')){const author=u.pathname.split('/')[3];return Response.json({code:200,results:author==='thsottiaux'?[...Object.values(f).map(v=>v.relay),f['${cache}'].relay]:[{id:'123',url:'https://x.com/'+author+'/status/123',author:{screen_name:author},text:'Hello world'}]});}
    if(u.hostname==='publish.twitter.com'){const id=new URL(u.searchParams.get('url')).pathname.split('/').pop();return Response.json(f[id].embed);}
    const id=u.pathname.split('/').pop();if(f[id])return process.env.FAIL_RELAY==='1'?new Response('',{status:403}):Response.json({tweet:f[id].relay});
    throw Error('Unexpected request '+input);
   };
  `);
  const run=(script,fail='0')=>{
   const r=spawnSync(process.execPath,['--import',pathToFileURL(join(dir,'mock.mjs')).href,join(dir,'scripts',script),...(script==='collect-posts.mjs'?Object.values(fixture).map(v=>v.embed.url):[])],{encoding:'utf8',timeout:10000,env:{...process.env,ENABLE_PAID_X_API:'false',COLLECT_POST_URLS:'',FAIL_RELAY:fail}});
   assert.equal(r.status,0,r.stderr);
  };
  for(const script of ['collect-posts.mjs','collect.mjs','collect.mjs','collect-posts.mjs']){
   const before=await readFile(join(dir,'data/health.json'),'utf8');run(script);
   if(script==='collect-posts.mjs')assert.equal(await readFile(join(dir,'data/health.json'),'utf8'),before);
   const events=JSON.parse(await readFile(join(dir,'data/events.json'),'utf8')),p=JSON.parse(await readFile(join(dir,'data/platforms.json'),'utf8'));
   for(const id of [correction,cache]){const e=events.find(e=>e.id===id);assert.equal(events.filter(e=>e.id===id).length,1);assert.equal(e.fullText,complete(id).text);assert.equal(e.kind,'usage');assert.equal(e.state,'information');assert.equal(e.publishedAt,date(id));assert.equal(e.resetAt,undefined);assert.equal(e.eligiblePlans,undefined);}
   assert.equal(events.find(e=>e.id===correction).provenance,'x-oembed+fxembed');
   events.forEach(validateEvent);assert.deepEqual(reclassifyEvents(events),events);assertTrackingSync(p,events);
   assert.equal(p.codex.latest.id,cache);assert.equal(p.codex.latestReset.id,day15);assert.equal(p.codex.lastReset.id,done);
   assert.equal(p.codex.reset.state,'announced');assert.equal(p.codex.reset.resetAt,null);
   assert.equal(p.codex.reset.verifiedAt,existing.find(e=>e.id===day15).verifiedAt);
   assert.deepEqual(earlierPosts(events,Date.parse(now)).slice(0,2).map(e=>e.id),[cache,correction]);
  }
  const health=await readFile(join(dir,'data/health.json'),'utf8');run('collect-posts.mjs','1');
  assert.equal(await readFile(join(dir,'data/health.json'),'utf8'),health);
  let events=JSON.parse(await readFile(join(dir,'data/events.json'),'utf8'));
  assert.equal(events.find(e=>e.id===correction).state,'information'); // Failed relay cannot erase complete evidence.
  await writeFile(join(dir,'data/events.json'),'[]');run('collect-posts.mjs','1');
  events=JSON.parse(await readFile(join(dir,'data/events.json'),'utf8'));
  assert.equal(events.find(e=>e.id===correction).state,'unconfirmed');assert.equal(events.find(e=>e.id===correction).fullText,undefined);
 }finally{if(dirname(resolve(dir))===resolve(tmpdir()))await rm(dir,{recursive:true,force:true});}
});
