import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,copyFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {classify,extractEmbed,reclassifyEvents,validateEvent} from '../src/evidence.mjs';
import {shouldCheckCandidate} from '../src/x-relay.mjs';
import {announcementTime} from '../src/announcement-time.mjs';
import {resetStatus} from '../src/reset-status.mjs';
import {syncPlatformState} from '../src/platform-state.mjs';
import {priorityDetails,earlierPosts} from '../src/priority-details.mjs';
import {offers} from '../src/offers.mjs';
import {assertTrackingSync} from '../src/tracking-audit.mjs';

const embed=JSON.parse(await readFile(new URL('./fixtures/oct20-reset.json',import.meta.url),'utf8'));
const source=extractEmbed(embed,embed.url),id='2112432076767289678',done='2111566005684289735';
const now='2026-10-20T10:15:00.000Z';
const publishedAt=new Date(Number((BigInt(id)>>22n)+1288834974657n)).toISOString();
const stored=JSON.parse(await readFile(new URL('../data/events.json',import.meta.url),'utf8'));

test('Day15 complete official wording announces a reset without reporting completion or a time',()=>{
 assert.equal(source.text,"Day 15/ Nevermind, we're still cooking... and reset. Enjoy.");
 assert.equal(source.truncated,false);
 assert.deepEqual(classify(source.text,source),{kind:'global',state:'announced',reason:'explicit-announcement'});
 assert.equal(shouldCheckCandidate({url:source.url,relay:{text:source.text}}),true);
 assert.equal(announcementTime(source.text,publishedAt,source),null);
 assert.equal(publishedAt,'2026-10-20T06:33:48.848Z');
 const local=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(publishedAt)).map(p=>[p.type,p.value]));
 assert.equal(local.day,'20');assert.equal(local.hour,'14');assert.equal(local.minute,'33');
 for(const author of ['ClaudeDevs','OpenAI','OpenAIDevs','someone'])assert.notEqual(classify(source.text,{...source,author}).state,'announced',author);
 assert.equal(classify(source.text,{...source,truncated:true}).state,'unconfirmed');
 for(const text of ['Day 15/ Reset','Day 13/ Le limit reset','Maybe '+source.text,'"'+source.text+'"',source.text+' Not today.',source.text+' Except Business.',source.text+'?',source.text.replace('and reset.','and reset?'),source.text.replace('and reset.','and no reset.'),source.text.replace('and reset.','and reset tomorrow.')])assert.notEqual(classify(text,source).state,'announced',text);
});

test('stored Day15 signal reclassifies idempotently while preserving the Oct17 completion and source anchors',()=>{
 const prior={...stored.find(e=>e.id===id),verifiedAt:now,kind:'signal',state:'unconfirmed',reason:'ambiguous',rulesVersion:'old'};
 const events=reclassifyEvents([prior,...stored.filter(e=>e.id===done)]),event=events.find(e=>e.id===id);
 assert.equal(event.kind,'global');assert.equal(event.state,'announced');
 for(const field of ['contentHash','verifiedAt','publishedAt','fullText','provenance'])assert.equal(event[field],prior[field]);
 assert.deepEqual(reclassifyEvents(events),events);events.forEach(validateEvent);
 const p=syncPlatformState({codex:{gifts:[]},claude:{gifts:[]}},events,Date.parse(now));assertTrackingSync(p,events);
 assert.equal(p.codex.latestReset.id,id);assert.equal(p.codex.lastReset.id,done);
 assert.equal(p.codex.reset.state,'announced');assert.equal(p.codex.reset.resetAt,null);
 assert.equal(p.codex.reset.publishedAt,publishedAt);assert.equal(event.resetAt,undefined);assert.equal(event.eligiblePlans,undefined);
 assert.equal(resetStatus(p.codex.reset,Date.parse(now)).state,'announcedUntimed');
 syncPlatformState(p,events,Date.parse('2026-10-25T12:00:00Z'));
 assert.equal(p.codex.lastReset.id,done);assert.notEqual(p.codex.reset.state,'completed');
 const detail=priorityDetails(p.codex,'codex',events,'en');assert.ok(detail.includes(source.url));assert.ok(detail.includes('Announced'));
 assert.ok(detail.includes('data-reset-elapsed="2026-10-17T21:12:21.411Z"'));
 assert.ok(offers({codex:p.codex},'en').includes(source.url));assert.equal(earlierPosts(events,Date.parse(now))[0].id,id);
});

test('actual collector and explicit-primary recheck retain Day15 announcement without advancing completion or faking coverage',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'oct20-collector-'));
 try{
  for(const part of ['src','scripts','data'])await mkdir(join(dir,part));
  for(const file of ['scripts/collect.mjs','scripts/collect-posts.mjs','scripts/topic-heat-refresh.mjs','src/evidence.mjs','src/tracking-audit.mjs','src/platform-state.mjs','src/announcement-time.mjs','src/x-relay.mjs','src/collection-request.mjs'])await copyFile(new URL('../'+file,import.meta.url),join(dir,file));
  await writeFile(join(dir,'embed.json'),JSON.stringify(embed));
  await writeFile(join(dir,'data/events.json'),JSON.stringify(stored.filter(e=>e.id===done)));
  await writeFile(join(dir,'data/health.json'),'{}');await writeFile(join(dir,'data/platforms.json'),JSON.stringify({codex:{gifts:[]},claude:{gifts:[]}}));
  await writeFile(join(dir,'mock.mjs'),`
   import {readFileSync} from 'node:fs';const embed=JSON.parse(readFileSync(new URL('./embed.json',import.meta.url)));
   const RealDate=Date;globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:['${now}']));}static now(){return RealDate.parse('${now}');}};
   globalThis.fetch=async input=>{const u=new URL(input);
    if(u.pathname.includes('/profile/')){const author=u.pathname.split('/')[3];const post=author==='thsottiaux'?{id:'${id}',url:embed.url,author:{screen_name:author},text:${JSON.stringify(source.text)}}:{id:'123',url:'https://x.com/'+author+'/status/123',author:{screen_name:author},text:'Hello world'};return Response.json({code:200,results:[post,post]});}
    if(u.hostname==='publish.twitter.com')return Response.json(embed);
    throw Error('Unexpected request '+input);
   };
  `);
  for(const script of ['collect.mjs','collect.mjs','collect-posts.mjs']){
   const before=await readFile(join(dir,'data/health.json'),'utf8');
   const result=spawnSync(process.execPath,['--import',pathToFileURL(join(dir,'mock.mjs')).href,join(dir,'scripts',script),...(script==='collect-posts.mjs'?[source.url]:[])],{encoding:'utf8',timeout:10000,env:{...process.env,ENABLE_PAID_X_API:'false',COLLECT_POST_URLS:''}});
   assert.equal(result.status,0,result.stderr);
   const events=JSON.parse(await readFile(join(dir,'data/events.json'),'utf8')),p=JSON.parse(await readFile(join(dir,'data/platforms.json'),'utf8'));
   assert.equal(events.filter(e=>e.id===id).length,1);const event=events.find(e=>e.id===id);
   assert.equal(event.state,'announced');assert.equal(event.kind,'global');assert.equal(event.resetAt,undefined);assert.equal(event.eligiblePlans,undefined);
   events.forEach(validateEvent);assertTrackingSync(p,events);assert.equal(p.codex.latestReset.id,id);assert.equal(p.codex.lastReset.id,done);assert.equal(p.codex.reset.resetAt,null);assert.equal(p.codex.reset.state,'announced');
   if(script==='collect-posts.mjs')assert.equal(await readFile(join(dir,'data/health.json'),'utf8'),before);
  }
 }finally{if(dirname(resolve(dir))===resolve(tmpdir()))await rm(dir,{recursive:true,force:true});}
});
