import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,copyFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {classify,extractEmbed,reclassifyEvents,validateEvent} from '../src/evidence.mjs';
import {resolveResetContext,shouldCheckCandidate,corroborateRelay} from '../src/x-relay.mjs';
import {announcementTime} from '../src/announcement-time.mjs';
import {syncPlatformState} from '../src/platform-state.mjs';
const fixture=JSON.parse(await readFile(new URL('./fixtures/oct15-reset.json',import.meta.url),'utf8'));
const [root,timing,done]=['2110595484180214059','2110595554036400151','2110618732666257557'];
const now='2026-10-15T10:30:00.000Z';
const date=id=>new Date(Number((BigInt(id)>>22n)+1288834974657n)).toISOString();
const official=id=>extractEmbed(fixture.embeds[id],fixture.details[id].url);
const requestFor=(data=fixture)=>async input=>{
 const u=new URL(input),id=u.hostname==='publish.twitter.com'?new URL(u.searchParams.get('url')).pathname.split('/').pop():u.pathname.split('/').pop();
 if(!data.details[id])throw new Error('Missing detail');
 return u.hostname==='publish.twitter.com'?data.embeds[id]:{tweet:data.details[id]};
};

test('Oct15 keywordless timing and completion reach verification, ordinary chatter does not',()=>{
 for(const relay of fixture.timeline)assert.equal(shouldCheckCandidate({url:relay.url,relay}),true);
 assert.equal(shouldCheckCandidate({url:fixture.details[done].url,relay:{text:'Nice. Will fix'}}),false);
 assert.equal(shouldCheckCandidate({url:'https://x.com/ClaudeDevs/status/'+done,relay:{text:'Done and dusted'}}),false);
 const source=official(done);
 assert.equal(corroborateRelay(source,fixture.details[done]).text,'Done and dusted');
 assert.throws(()=>corroborateRelay({...source,truncated:true},fixture.details[done]));
 assert.throws(()=>corroborateRelay(source,{...fixture.details[done],text:'Done and dusted tomorrow'}));
});

test('Oct15 completion follows quote -> timing -> reply -> Day10, with no invented account scope or instant',async()=>{
 const context=await resolveResetContext(official(done),requestFor(),now);
 assert.equal(context.id,timing);assert.equal(context.relation,'quote');
 assert.equal(context.resetContext.id,root);assert.equal(context.resetContext.relation,'reply');
 assert.equal(classify(official(done).text,{...official(done),publishedAt:date(done),resetContext:context}).state,'reported');
 const preview={...official(timing),publishedAt:date(timing),resetContext:context.resetContext};
 assert.equal(classify(preview.text,preview).state,'announced');
 assert.equal(announcementTime(preview.text,preview.publishedAt,preview),null);
 assert.equal(classify(official(root).text,official(root)).state,'unconfirmed');
 assert.equal(classify(official(done).text,official(done)).state,'unconfirmed');
 assert.equal(classify(preview.text,official(timing)).state,'unconfirmed');
 const c={...official(done),publishedAt:date(done),resetContext:context};
 for(const text of ['Maybe Done and dusted','Done and dusted?','"Done and dusted"','Done and dusted. Not today.'])assert.notEqual(classify(text,c).state,'reported');
 assert.notEqual(classify(c.text,{...c,truncated:true}).state,'reported');
 for(const change of [{author:'ClaudeDevs'},{publishedAt:'2026-10-16T00:00:00Z'},{publishedAt:'2026-10-01T00:00:00Z'},{truncated:true},{contentHash:'broken'},{resetContext:undefined}])assert.notEqual(classify(c.text,{...c,resetContext:{...context,...change}}).state,'reported');
 const records=[done,timing].map(id=>({id,author:'thsottiaux',platform:'codex',sourceUrl:fixture.details[id].url,fullText:official(id).text,excerpt:official(id).text,publishedAt:date(id),verifiedAt:now,truncated:false,provenance:'x-oembed',rulesVersion:'old',contentHash:'a'.repeat(64),resetContext:id===done?context:context.resetContext}));
 const events=reclassifyEvents(records);events.forEach(validateEvent);
 const p=syncPlatformState({codex:{},claude:{}},events,Date.parse(now));
 assert.equal(p.codex.lastReset.id,done);assert.equal(p.codex.reset.state,'completed');
 assert.equal(p.codex.lastReset.eligiblePlans,undefined);assert.equal(p.codex.reset.resetAt,null);
 assert.equal(p.claude.lastReset,null);assert.equal(date(done),'2026-10-15T06:28:13.924Z');
});

test('missing, stale, mismatched, unrelated and cross-author chains cannot confirm completion',async()=>{
 for(const alter of [
  f=>{delete f.details[done].quote;},
  f=>{delete f.details[timing].replying_to_status;},
  f=>{f.details[root].author.screen_name='ClaudeDevs';},
  f=>{f.details[done].created_timestamp=0;},
  f=>{f.details[root].text='Day 10/ Launch';f.embeds[root].html='<p>Day 10/ Launch</p>';},
  f=>{f.details[root].text='Maybe a reset';f.embeds[root].html='<p>Maybe a reset</p>';},
  f=>{f.embeds[timing].html='<p>Landing within…</p>';f.details[done].quote.text='Landing within…';},
 ]){
  const data=structuredClone(fixture);alter(data);
  await assert.rejects(()=>resolveResetContext(official(done),requestFor(data),now));
 }
});

test('real collector discovers the Oct15 chain from timeline and degrades on failed context rechecks',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'oct15-collector-'));
 try{
  for(const part of ['src','scripts','data'])await mkdir(join(dir,part));
  for(const file of ['scripts/collect.mjs','scripts/collect-posts.mjs','scripts/topic-heat-refresh.mjs','src/evidence.mjs','src/tracking-audit.mjs','src/platform-state.mjs','src/announcement-time.mjs','src/x-relay.mjs','src/collection-request.mjs'])await copyFile(new URL('../'+file,import.meta.url),join(dir,file));
  await writeFile(join(dir,'fixture.json'),JSON.stringify(fixture));
  await writeFile(join(dir,'data/events.json'),'[]');await writeFile(join(dir,'data/health.json'),'{}');await writeFile(join(dir,'data/platforms.json'),JSON.stringify({codex:{},claude:{}}));
  await writeFile(join(dir,'mock.mjs'),`
   import {readFileSync} from 'node:fs';
   const f=JSON.parse(readFileSync(new URL('./fixture.json',import.meta.url)));
   const RealDate=Date;globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:['${now}']));}static now(){return RealDate.parse('${now}');}};
   globalThis.fetch=async input=>{
    const u=new URL(input);
    if(u.pathname.includes('/profile/')){const a=u.pathname.split('/')[3];return Response.json({code:200,results:a==='thsottiaux'?f.timeline:[{id:'123',url:'https://x.com/'+a+'/status/123',author:{screen_name:a},text:'Hello world'}]});}
    if(u.hostname==='publish.twitter.com'){const id=new URL(u.searchParams.get('url')).pathname.split('/').pop();return Response.json(f.embeds[id]);}
    const id=u.pathname.split('/').pop();
    if(process.env.FAIL_CONTEXT==='1')return new Response('',{status:403});
    if(f.details[id])return Response.json({tweet:f.details[id]});
    return new Response('',{status:403});
   };
  `);
  for(const fail of ['0','1']){
   const r=spawnSync(process.execPath,['--import',pathToFileURL(join(dir,'mock.mjs')).href,join(dir,'scripts/collect.mjs')],{encoding:'utf8',timeout:10000,env:{...process.env,ENABLE_PAID_X_API:'false',FAIL_CONTEXT:fail}});
   assert.equal(r.status,0,r.stderr);
   const events=JSON.parse(await readFile(join(dir,'data/events.json'),'utf8'));
   const p=JSON.parse(await readFile(join(dir,'data/platforms.json'),'utf8'));
   const h=JSON.parse(await readFile(join(dir,'data/health.json'),'utf8'));
   assert.equal(events.find(e=>e.id===done).state,'reported');assert.equal(p.codex.reset.state,'completed');
   assert.equal(p.codex.lastReset.id,done);assert.equal(events.find(e=>e.id===timing).resetAt,undefined);
   assert.equal(h.platforms.codex.status,fail==='0'?'ok':'degraded');
   if(fail==='1')assert.ok(h.failedPosts.some(e=>e.url.endsWith(done)&&e.error.startsWith('Reset context:')));
  }
  const healthBefore=await readFile(join(dir,'data/health.json'),'utf8');
  await writeFile(join(dir,'data/events.json'),'[]');
  for(const id of [timing,done]){
   const r=spawnSync(process.execPath,['--import',pathToFileURL(join(dir,'mock.mjs')).href,join(dir,'scripts/collect-posts.mjs'),fixture.details[id].url],{encoding:'utf8',timeout:10000,env:{...process.env,FAIL_CONTEXT:'0'}});
   assert.equal(r.status,0,r.stderr);
   const events=JSON.parse(await readFile(join(dir,'data/events.json'),'utf8'));
   assert.equal(events.find(e=>e.id===id).state,id===done?'reported':'announced');
   assert.equal(await readFile(join(dir,'data/health.json'),'utf8'),healthBefore);
  }
 }finally{if(dirname(resolve(dir))===resolve(tmpdir()))await rm(dir,{recursive:true,force:true});}
});
