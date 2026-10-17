import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,copyFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {classify,extractEmbed,reclassifyEvents,validateEvent} from '../src/evidence.mjs';
import {resolveResetContext,shouldCheckCandidate} from '../src/x-relay.mjs';
import {announcementTime} from '../src/announcement-time.mjs';
import {syncPlatformState} from '../src/platform-state.mjs';
import {resetStatus} from '../src/reset-status.mjs';
import {earlierPosts,priorityDetails} from '../src/priority-details.mjs';
import {offers} from '../src/offers.mjs';
import {assertTrackingSync} from '../src/tracking-audit.mjs';

const fixture=JSON.parse(await readFile(new URL('./fixtures/oct17-reset.json',import.meta.url),'utf8'));
const root='2111492673890824348',timing='2111492738025959922',oldReset='2110618732666257557';
const now='2026-10-17T17:30:00.000Z';
const date=id=>new Date(Number((BigInt(id)>>22n)+1288834974657n)).toISOString();
const official=id=>extractEmbed(fixture.embeds[id],fixture.details[id].url);
const requestFor=(data=fixture)=>async input=>{
 const url=new URL(input),id=url.hostname==='publish.twitter.com'?new URL(url.searchParams.get('url')).pathname.split('/').pop():url.pathname.split('/').pop();
 if(!data.details[id])throw new Error('Missing fixture post');
 return url.hostname==='publish.twitter.com'?data.embeds[id]:{tweet:data.details[id]};
};

test('Day13 signal and its keywordless EOD reply both reach primary verification',()=>{
 for(const relay of fixture.timeline)assert.equal(shouldCheckCandidate({url:relay.url,relay}),true);
 assert.equal(classify(official(root).text,official(root)).kind,'signal');
 assert.equal(classify(official(root).text,official(root)).state,'unconfirmed');
 assert.notEqual(classify(official(timing).text,official(timing)).state,'announced');
 assert.match(date(root),/^2026-10-17T16:20:57\./);assert.match(date(timing),/^2026-10-17T16:21:13\./);
 assert.equal(shouldCheckCandidate({url:'https://x.com/ClaudeDevs/status/'+timing,relay:{text:official(timing).text}}),false);
});

test('Day13 same-author reply announces a reset with a literal PST deadline and no clock instant',async()=>{
 const context=await resolveResetContext(official(timing),requestFor(),now);
 assert.equal(context.id,root);assert.equal(context.relation,'reply');
 assert.equal(context.fullText,fixture.details[root].raw_text.text);
 assert.match(context.fullText,/https:\/\/t\.co\//);
 const source={...official(timing),publishedAt:date(timing),resetContext:context};
 assert.deepEqual(classify(source.text,source),{kind:'global',state:'announced',reason:'linked-announcement'});
 const schedule=announcementTime(source.text,source.publishedAt,source);
 assert.deepEqual(schedule,{resetAt:null,sourceTimezone:'PST',deadlineText:'sometime today by EOD PST',timeBasis:'literal-source-offset',timeKind:'deadline',approximate:true});
 assert.equal(announcementTime(source.text,source.publishedAt,{...source,truncated:true}),null);
 assert.equal(announcementTime(source.text,source.publishedAt,{author:'ClaudeDevs'}),null);
 for(const text of ['Landing sometime today by EOD PDT','Maybe '+source.text,'"'+source.text+'"',source.text+' Not today.',source.text+'?'])assert.notEqual(classify(text,source).state,'announced',text);
 assert.equal(classify(source.text,{...source,truncated:true}).state,'unconfirmed');
 for(const change of [{author:'ClaudeDevs'},{publishedAt:'2026-10-18T00:00:00Z'},{publishedAt:'2026-10-01T00:00:00Z'},{truncated:true},{contentHash:'broken'}])assert.notEqual(classify(source.text,{...source,resetContext:{...context,...change}}).state,'announced');
});

test('Day13 context cannot be invented from unrelated, mismatched or missing replies',async()=>{
 for(const alter of [
  f=>{delete f.details[timing].replying_to_status;},
  f=>{f.details[timing].replying_to='ClaudeDevs';},
  f=>{f.details[root].author.screen_name='ClaudeDevs';},
  f=>{f.details[timing].created_timestamp=0;},
  f=>{f.details[root].text='Day 13/ Launch';f.embeds[root].html='<p>Day 13/ Launch</p>';},
  f=>{f.details[root].text='Day 13/ Le password reset';f.embeds[root].html='<p>Day 13/ Le password reset</p>';},
  f=>{f.details[root].raw_text.text='Day 13/ Le limit reset https://example.com/unverified';},
  f=>{f.details[root].raw_text.text+=' not today';},
 ]){
  const data=structuredClone(fixture);alter(data);
  await assert.rejects(()=>resolveResetContext(official(timing),requestFor(data),now));
 }
});

test('real collector prioritizes Day13 over the old completion and retains evidence through rechecks',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'oct17-collector-'));
 try{
  for(const part of ['src','scripts','data'])await mkdir(join(dir,part));
  for(const file of ['scripts/collect.mjs','scripts/collect-posts.mjs','scripts/topic-heat-refresh.mjs','src/evidence.mjs','src/tracking-audit.mjs','src/platform-state.mjs','src/announcement-time.mjs','src/x-relay.mjs','src/collection-request.mjs'])await copyFile(new URL('../'+file,import.meta.url),join(dir,file));
  const existing=JSON.parse(await readFile(new URL('../data/events.json',import.meta.url),'utf8')).filter(event=>[oldReset,'2111244596131111253'].includes(event.id));
  await writeFile(join(dir,'fixture.json'),JSON.stringify(fixture));
  await writeFile(join(dir,'data/events.json'),JSON.stringify(existing));
  await writeFile(join(dir,'data/health.json'),'{}');await writeFile(join(dir,'data/platforms.json'),JSON.stringify({codex:{gifts:[]},claude:{gifts:[]}}));
  await writeFile(join(dir,'mock.mjs'),`
   import {readFileSync} from 'node:fs';
   const f=JSON.parse(readFileSync(new URL('./fixture.json',import.meta.url)));
   const RealDate=Date;globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:['${now}']));}static now(){return RealDate.parse('${now}');}};
   globalThis.fetch=async input=>{
    const u=new URL(input);
    if(u.pathname.includes('/profile/')){const author=u.pathname.split('/')[3];return Response.json({code:200,results:author==='thsottiaux'?[...f.timeline,f.details['${timing}']]:[{id:'123',url:'https://x.com/'+author+'/status/123',author:{screen_name:author},text:'Hello world'}]});}
    if(u.hostname==='publish.twitter.com'){const id=new URL(u.searchParams.get('url')).pathname.split('/').pop();return Response.json(f.embeds[id]);}
    if(process.env.FAIL_CONTEXT==='1')return new Response('',{status:403});
    const id=u.pathname.split('/').pop();return f.details[id]?Response.json({tweet:f.details[id]}):new Response('',{status:403});
   };
  `);
  for(const fail of ['0','0','1']){
   const result=spawnSync(process.execPath,['--import',pathToFileURL(join(dir,'mock.mjs')).href,join(dir,'scripts/collect.mjs')],{encoding:'utf8',timeout:10000,env:{...process.env,ENABLE_PAID_X_API:'false',COLLECT_POST_URLS:'',FAIL_CONTEXT:fail}});
   assert.equal(result.status,0,result.stderr);
   const events=JSON.parse(await readFile(join(dir,'data/events.json'),'utf8'));
   const p=JSON.parse(await readFile(join(dir,'data/platforms.json'),'utf8'));
   const health=JSON.parse(await readFile(join(dir,'data/health.json'),'utf8'));
   assert.equal(events.filter(event=>event.id===timing).length,1);assert.equal(events.filter(event=>event.id===root).length,1);
   const update=events.find(event=>event.id===timing),signal=events.find(event=>event.id===root);
   assert.equal(update.kind,'global');assert.equal(update.state,'announced');assert.equal(update.resetAt,null);assert.equal(update.sourceTimezone,'PST');
   assert.equal(update.eligiblePlans,undefined);assert.equal(signal.kind,'signal');assert.equal(signal.state,'unconfirmed');
   events.forEach(validateEvent);assert.deepEqual(reclassifyEvents(events),events);
   assertTrackingSync(p,events);assert.equal(p.codex.latestReset.id,timing);assert.equal(p.codex.lastReset.id,oldReset);
   assert.equal(p.codex.reset.state,'announced');assert.equal(p.codex.reset.resetAt,null);
   assert.equal(resetStatus(p.codex.reset,Date.parse(now)).state,'announcedUntimed');
   assert.notEqual(resetStatus(p.codex.reset,Date.parse('2026-10-19T09:00:00Z')).state,'completed');
   syncPlatformState(p,events,Date.parse('2026-10-19T09:00:00Z'));assert.equal(p.codex.reset.state,'announced');
   assert.deepEqual(earlierPosts(events,Date.parse(now)).slice(0,2).map(event=>event.id),[timing,root]);
   assert.ok(offers({codex:p.codex},'en').includes(fixture.details[timing].url));
   assert.ok(priorityDetails(p.codex,'codex',events,'en').includes(fixture.details[timing].url));
   assert.equal(health.platforms.codex.status,fail==='0'?'ok':'degraded');
   if(fail==='1')assert.ok(health.failedPosts.some(item=>item.url.endsWith(timing)&&item.error.startsWith('Reset context:')));
  }
  const savedHealth=await readFile(join(dir,'data/health.json'),'utf8');
  const result=spawnSync(process.execPath,['--import',pathToFileURL(join(dir,'mock.mjs')).href,join(dir,'scripts/collect-posts.mjs'),fixture.details[root].url,fixture.details[timing].url],{encoding:'utf8',timeout:10000,env:{...process.env,FAIL_CONTEXT:'0'}});
  assert.equal(result.status,0,result.stderr);assert.equal(await readFile(join(dir,'data/health.json'),'utf8'),savedHealth);
 }finally{if(dirname(resolve(dir))===resolve(tmpdir()))await rm(dir,{recursive:true,force:true});}
});
