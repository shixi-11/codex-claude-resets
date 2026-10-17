import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,copyFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {classify,extractEmbed,isRelevant,reclassifyEvents,validateEvent} from '../src/evidence.mjs';
import {shouldCheckCandidate,timelineCandidates} from '../src/x-relay.mjs';
import {syncPlatformState} from '../src/platform-state.mjs';
import {earlierPosts} from '../src/priority-details.mjs';
import {offers} from '../src/offers.mjs';

const fixture=JSON.parse(await readFile(new URL('./fixtures/oct16-effective-usage.json',import.meta.url),'utf8'));
const source=extractEmbed(fixture.embed,fixture.sourceUrl);
const id='2111244596131111253',resetId='2110618732666257557';
const publishedAt=new Date(Number((BigInt(id)>>22n)+1288834974657n)).toISOString();
const now='2026-10-17T03:30:00.000Z';
const existing=JSON.parse(await readFile(new URL('../data/events.json',import.meta.url),'utf8'));
const reset=existing.find(event=>event.id===resetId);
const event={id,author:source.author,platform:'codex',sourceUrl:source.url,publishedAt,verifiedAt:now,
 fullText:source.text,excerpt:'We’ve made improvements to Codex & Work that increase the effective usage you get.',
 truncated:false,provenance:'x-oembed',rulesVersion:'old',contentHash:createHash('sha256').update(source.text).digest('hex')};

test('Day12 complete primary evidence is an effective-usage update, never a reset',()=>{
 assert.equal(source.id,id);assert.equal(source.author,'thsottiaux');assert.equal(source.truncated,false);
 assert.equal(publishedAt,'2026-10-16T23:55:11.402Z');
 assert.equal(source.text,fixture.relay.text);
 assert.equal(timelineCandidates({code:200,results:[fixture.relay]},'thsottiaux')[0].url,fixture.sourceUrl);
 assert.equal(shouldCheckCandidate({url:fixture.sourceUrl,relay:fixture.relay}),true);
 assert.equal(isRelevant(source.text,source),true);
 assert.deepEqual(classify(source.text,source),{kind:'usage',state:'information',reason:'usage-change'});
 const record={...event,...classify(source.text,source)};
 assert.equal(validateEvent(record),true);assert.equal(record.resetAt,undefined);
 assert.equal(classify(source.text,{...source,truncated:true}).state,'unconfirmed');
});

test('effective-usage wording stays scoped to subscriber benefit and the tracked product',()=>{
 for(const text of [
  'Codex usage grew to 25 million users.',
  "Next week we'll be retiring GPT-5.3-Codex-Spark. Usage has been declining and we have significantly better models now.",
  'Claude pushes the limits of reasoning.',
  'Reset your password to access Codex.',
  'We improved effective usage of Codex tools in our benchmark.',
  'We increased the effective usage you get from our router.',
  'Codex adoption increased and effective usage reached 25 million people.',
  'We made improvements to Codex context caching and request routing.',
 ])assert.equal(classify(text,{author:'thsottiaux'}).kind,'other',text);
 assert.equal(classify('We improved the effective usage you get from Codex.',{author:'thsottiaux'}).kind,'usage');
});

test('Day12 reclassification and seven-day ordering preserve reset summaries and offer scope',()=>{
 const records=reclassifyEvents([reset,event]);
 assert.deepEqual(reclassifyEvents(records),records);
 const update=records.find(item=>item.id===id);
 assert.equal(update.kind,'usage');assert.equal(update.state,'information');assert.equal(update.resetAt,undefined);
 const platforms=()=>({codex:{name:'Codex',gifts:[]},claude:{name:'Claude',gifts:[]}});
 const before=syncPlatformState(platforms(),[reset],Date.parse(now));
 const after=syncPlatformState(platforms(),records,Date.parse(now));
 for(const key of ['latestReset','lastReset'])assert.equal(after.codex[key].id,before.codex[key].id);
 assert.deepEqual(after.codex.reset,before.codex.reset);
 assert.equal(after.codex.latest.id,id);assert.equal(after.codex.latestGift,null);
 assert.equal(offers(after,'en'),offers(before,'en'));
 assert.deepEqual(earlierPosts([reset,update],Date.parse(now)).map(item=>item.id),[id,resetId]);
 assert.ok(earlierPosts(records,Date.parse(publishedAt)+7*86400000).some(item=>item.id===id));
 assert.ok(!earlierPosts(records,Date.parse(publishedAt)+7*86400000+1).some(item=>item.id===id));
});

test('real collector retains one Day12 usage record across duplicate discovery and later runs',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'day12-usage-'));
 try{
  for(const part of ['src','scripts','data'])await mkdir(join(dir,part));
  for(const file of ['scripts/collect.mjs','scripts/topic-heat-refresh.mjs','src/evidence.mjs','src/tracking-audit.mjs','src/platform-state.mjs','src/announcement-time.mjs','src/x-relay.mjs','src/collection-request.mjs'])await copyFile(new URL('../'+file,import.meta.url),join(dir,file));
  await writeFile(join(dir,'fixture.json'),JSON.stringify(fixture));
  await writeFile(join(dir,'data/events.json'),JSON.stringify([reset]));
  await writeFile(join(dir,'data/health.json'),'{}');
  const platforms=syncPlatformState({codex:{gifts:[]},claude:{gifts:[]}},[reset],Date.parse(now));
  await writeFile(join(dir,'data/platforms.json'),JSON.stringify(platforms));
  await writeFile(join(dir,'mock.mjs'),`
   import {readFileSync} from 'node:fs';
   const f=JSON.parse(readFileSync(new URL('./fixture.json',import.meta.url)));
   const RealDate=Date;globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:['${now}']));}static now(){return RealDate.parse('${now}');}};
   globalThis.fetch=async input=>{
    const u=new URL(input);
    if(u.pathname.includes('/profile/')){
     const author=u.pathname.split('/')[3];
     const ordinary={id:'123',url:'https://x.com/'+author+'/status/123',author:{screen_name:author},text:author==='thsottiaux'?'Codex usage grew to 25 million users.':'Hello world'};
     return Response.json({code:200,results:author==='thsottiaux'&&process.env.TEST_STAGE!=='2'?[f.relay,ordinary,f.relay]:[ordinary]});
    }
    if(u.hostname==='publish.twitter.com'){
     const url=u.searchParams.get('url');
     return Response.json(url===f.sourceUrl?f.embed:{url,author_url:'https://x.com/thsottiaux',html:'<p>Codex usage grew to 25 million users.</p>'});
    }
    return new Response('',{status:403});
   };
  `);
  for(const stage of ['0','1','2']){
   const result=spawnSync(process.execPath,['--import',pathToFileURL(join(dir,'mock.mjs')).href,join(dir,'scripts/collect.mjs')],{encoding:'utf8',timeout:10000,env:{...process.env,ENABLE_PAID_X_API:'false',COLLECT_POST_URLS:'',TEST_STAGE:stage}});
   assert.equal(result.status,0,result.stderr);
   const events=JSON.parse(await readFile(join(dir,'data/events.json'),'utf8'));
   const p=JSON.parse(await readFile(join(dir,'data/platforms.json'),'utf8'));
   const h=JSON.parse(await readFile(join(dir,'data/health.json'),'utf8'));
   assert.equal(events.filter(item=>item.id===id).length,1);
   const update=events.find(item=>item.id===id);
   assert.equal(update.kind,'usage');assert.equal(update.state,'information');assert.equal(update.reason,'usage-change');
   assert.equal(update.resetAt,undefined);assert.equal(update.publishedAt,publishedAt);assert.equal(update.fullText,source.text);
   assert.equal(update.contentHash,event.contentHash);assert.equal(update.provenance,'x-oembed');assert.equal(validateEvent(update),true);
   assert.ok(!events.some(item=>item.id==='123'));
   assert.deepEqual(earlierPosts(events,Date.parse(now)).map(item=>item.id),[id,resetId]);
   assert.equal(p.codex.latest.id,id);assert.equal(p.codex.lastReset.id,resetId);assert.equal(p.codex.latestReset.id,resetId);
   assert.deepEqual(p.codex.reset,platforms.codex.reset);assert.equal(p.codex.latestGift,null);
   assert.equal(h.platforms.codex.status,'ok');assert.equal(h.failedPosts.length,0);
  }
 }finally{if(dirname(resolve(dir))===resolve(tmpdir()))await rm(dir,{recursive:true,force:true});}
});
