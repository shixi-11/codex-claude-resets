import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,cp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {classify,isRelevant,extractEmbed,reclassifyEvents} from '../src/evidence.mjs';
import {syncPlatformState} from '../src/platform-state.mjs';
import {assertTrackingSync} from '../src/tracking-audit.mjs';

const fixture=JSON.parse(await readFile(new URL('./fixtures/nov17-api-analytics.json',import.meta.url),'utf8'));
const bad=fixture.original,source=extractEmbed(fixture.embed,bad.sourceUrl),now='2026-11-18T01:00:00Z';
const stored=JSON.parse(await readFile(new URL('../data/events.json',import.meta.url),'utf8'));
const controls=stored.filter(e=>e.id!==bad.id);
const platforms=JSON.parse(await readFile(new URL('../data/platforms.json',import.meta.url),'utf8'));

test('complete official API analytics evidence describes observation, not an allowance change',()=>{
 assert.equal(source.author,'OpenAIDevs');assert.equal(source.id,bad.id);assert.equal(source.truncated,false);
 assert.equal(source.text,bad.fullText);assert.equal(createHash('sha256').update(source.text).digest('hex'),bad.contentHash);
 assert.equal(new Date(Number((BigInt(bad.id)>>22n)+1288834974657n)).toISOString(),bad.publishedAt);
 assert.equal(isRelevant(source.text,source),false);
 assert.deepEqual(classify(source.text,source),{kind:'other',state:'information',reason:'unrelated'});
});

test('dashboard observation exclusions leave genuine reset and quota announcements intact',()=>{
 for(const text of [source.text,'The API analytics dashboard lets you view your quota and track usage and spend.','Monitor current rate limits in the API dashboard.'])assert.equal(classify(text,{author:'OpenAIDevs'}).kind,'other',text);
 const cases=[
  ['We increased API rate limits. Check rate limits in the usage dashboard.','usage','information'],
  ['API analytics: check rate limits, which we have doubled.','signal','unconfirmed'],
  ['API dashboard: check rate limits, now 2x higher.','signal','unconfirmed'],
  ['API dashboard: check rate limits. Your weekly allowance is now unlimited.','signal','unconfirmed'],
  ['API dashboard: check rate limits. We will reset usage for all Codex users tomorrow.','global','announced'],
  ["API dashboard: check rate limits. We have reset 5-hour and weekly limits for all users.",'global','reported'],
  ['API analytics dashboard: check rate limits. All users now receive one reset to use anytime.','banked','reported'],
  ['API dashboard: check rate limits. A Codex reset might land tomorrow.','signal','unconfirmed'],
  ['We increased API rate limits.','usage','information'],
  ['Check rate limits.','signal','unconfirmed'],
 ];
 for(const [text,kind,state] of cases){const result=classify(text,{author:'OpenAIDevs'});assert.equal(result.kind,kind,text);assert.equal(result.state,state,text);}
});

test('stored complete telemetry is removed while incomplete evidence and all other classifications survive',()=>{
 const incomplete={...bad,id:'123',fullText:undefined,truncated:true};
 assert.deepEqual(reclassifyEvents([bad,incomplete]),[incomplete]);
 const next=reclassifyEvents([bad,...controls]);assert.equal(next.length,controls.length);assert.deepEqual(reclassifyEvents(next),next);
 for(const e of controls){const fixed=next.find(n=>n.id===e.id);const {rulesVersion,...before}=e,{rulesVersion:version,...after}=fixed;assert.deepEqual(after,before,e.id);}
 const before=syncPlatformState(structuredClone(platforms),[bad,...controls],Date.parse(now));
 const after=syncPlatformState(structuredClone(platforms),next,Date.parse(now));
 assert.notEqual(after.codex.latest.id,bad.id);
 for(const p of ['codex','claude'])for(const key of ['reset','latestGift','latestReset','lastReset'])assert.equal(after[p][key]?.id,before[p][key]?.id,`${p}.${key}`);
 assert.deepEqual(after.codex.reset,before.codex.reset);assert.deepEqual(after.claude.reset,before.claude.reset);assertTrackingSync(after,next);
});

test('timeline and explicit collectors clean saved telemetry and never re-add it',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'api-analytics-classification-'));
 try{
  for(const part of ['src','scripts'])await cp(new URL('../'+part+'/',import.meta.url),join(dir,part),{recursive:true});
  await mkdir(join(dir,'data'));await writeFile(join(dir,'fixture.json'),JSON.stringify(fixture));
  const health=await readFile(new URL('../data/health.json',import.meta.url),'utf8');
  const translations=await readFile(new URL('../data/translations.json',import.meta.url),'utf8');
  await writeFile(join(dir,'data/events.json'),JSON.stringify([bad,...controls]));await writeFile(join(dir,'data/platforms.json'),JSON.stringify(platforms));
  await writeFile(join(dir,'data/health.json'),health);await writeFile(join(dir,'data/translations.json'),translations);
  await writeFile(join(dir,'mock.mjs'),`
   import {readFileSync} from 'node:fs';const f=JSON.parse(readFileSync(new URL('./fixture.json',import.meta.url)));
   const RealDate=Date;globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:['${now}']));}static now(){return RealDate.parse('${now}');}};
   globalThis.fetch=async input=>{const u=new URL(input);
    if(u.pathname.includes('/profile/')){const author=u.pathname.split('/')[3];return Response.json({code:200,results:author==='OpenAIDevs'?[{id:f.original.id,url:f.original.sourceUrl,author:{screen_name:author},text:f.original.fullText}]:[{id:'123',url:'https://x.com/'+author+'/status/123',author:{screen_name:author},text:'Hello world'}]});}
    if(u.hostname==='publish.twitter.com')return Response.json(f.embed);
    throw Error('Unexpected request '+input);
   };
  `);
  for(const script of ['collect-posts.mjs','collect.mjs','collect.mjs','collect-posts.mjs']){
   const previousHealth=await readFile(join(dir,'data/health.json'),'utf8');
   const r=spawnSync(process.execPath,['--import',pathToFileURL(join(dir,'mock.mjs')).href,join(dir,'scripts',script),...(script==='collect-posts.mjs'?[source.url]:[])],{encoding:'utf8',timeout:15000,env:{...process.env,ENABLE_PAID_X_API:'false',COLLECT_POST_URLS:''}});
   assert.equal(r.status,0,r.stderr);
   const events=JSON.parse(await readFile(join(dir,'data/events.json'),'utf8')),p=JSON.parse(await readFile(join(dir,'data/platforms.json'),'utf8'));
   assert.ok(!events.some(e=>e.id===bad.id));assert.equal(events.length,controls.length);assertTrackingSync(p,events);
   assert.deepEqual(events,reclassifyEvents(controls));
   assert.deepEqual(p.codex.reset,platforms.codex.reset);assert.deepEqual(p.claude.reset,platforms.claude.reset);
   assert.equal(await readFile(join(dir,'data/translations.json'),'utf8'),translations);
   if(script==='collect-posts.mjs')assert.equal(await readFile(join(dir,'data/health.json'),'utf8'),previousHealth);
  }
 }finally{await rm(dir,{recursive:true,force:true});}
});
