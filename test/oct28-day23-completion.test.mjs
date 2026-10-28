import test from 'node:test';
import assert from 'node:assert/strict';
import{readFile}from'node:fs/promises';
import{classify,extractEmbed,validateEvent,validResetContext}from'../src/evidence.mjs';
import{shouldCheckCandidate,timelineCandidates,resolveResetContext}from'../src/x-relay.mjs';
import{syncPlatformState}from'../src/platform-state.mjs';
import{assertTrackingSync}from'../src/tracking-audit.mjs';
const f=JSON.parse(await readFile(new URL('./fixtures/oct28-day23-completion.json',import.meta.url),'utf8'));
const done='2115330127886463244',timing='2115273253711409208',root='2115273064481218829',now='2026-10-28T07:00:00Z';
const date=id=>new Date(Number((BigInt(id)>>22n)+1288834974657n)).toISOString();
const own=extractEmbed(f.embeds[done],f.details[done].url);
const request=(data=f)=>async input=>{const u=new URL(input),id=u.hostname==='publish.twitter.com'?new URL(u.searchParams.get('url')).pathname.split('/').pop():u.pathname.split('/').pop();return u.hostname==='publish.twitter.com'?data.embeds[id]:{tweet:data.details[id]};};
test('combined timeline discovers standalone propagation quote and timing reply without reset keywords',()=>{
 const candidates=timelineCandidates({code:200,results:[f.details[done],f.details[timing],f.details[root]]},'thsottiaux');
 assert.equal(candidates.filter(c=>c.url.endsWith(done)).length,1);
 assert.equal(shouldCheckCandidate(candidates.find(c=>c.url.endsWith(done))),true);
 assert.equal(shouldCheckCandidate(candidates.find(c=>c.url.endsWith(timing))),true);
 assert.equal(f.details[done].replying_to,null);assert.equal(f.details[done].quote.id,timing);
});
test('completion needs independently verified quote→timing reply→reset announcement chain, never an unrelated propagation',async()=>{
 const context=await resolveResetContext(own,request(),now),source={...own,publishedAt:date(done),resetContext:context};
 assert.equal(context.id,timing);assert.equal(context.relation,'quote');assert.equal(context.resetContext.id,root);assert.equal(context.resetContext.relation,'reply');
 assert.deepEqual(classify(own.text,source),{kind:'global',state:'reported',reason:'linked-completion'});
 assert.notEqual(classify(own.text,own).state,'reported');assert.notEqual(classify(own.text,{...source,truncated:true}).state,'reported');assert.notEqual(classify(own.text,{...source,author:'OpenAI'}).state,'reported');
 for(const text of ["And it's done. See you tomorrow for some good news.","And it’s done. See you tomorrow for some good news."])assert.equal(classify(text,source).state,'reported');
 for(const text of ["Maybe "+own.text,'"'+own.text+'"',own.text+' Not yet.',own.text+' Except Pro users.',"And it isn't done. See you tomorrow for some good news.","And it's done."])assert.notEqual(classify(text,source).state,'reported');
 for(const c of [{...context,author:'OpenAI'},{...context,fullText:'New product release'},{...context,publishedAt:'2026-10-20T00:00:00Z'},{...context,resetContext:{...context.resetContext,fullText:'We updated the cache'}},{...context,resetContext:{...context.resetContext,author:'ClaudeDevs'}}])assert.notEqual(classify(own.text,{...source,resetContext:c}).state,'reported');
 assert.equal(validResetContext(context,'thsottiaux',new Date(Date.parse(context.publishedAt)+48*3600000).toISOString()),true);assert.equal(validResetContext(context,'thsottiaux',new Date(Date.parse(context.publishedAt)+48*3600000+1).toISOString()),false);
 for(const alter of [x=>delete x.details[done].quote,x=>x.details[done].quote.author.screen_name='OpenAI',x=>x.details[timing].replying_to_status='123',x=>x.details[root].raw_text.text='Cache fully propagated']){const bad=structuredClone(f);alter(bad);await assert.rejects(()=>resolveResetContext(own,request(bad),now));}
});
test('official completion updates summary and last-confirmation timestamp without fabricating execution time or plan scope',async()=>{
 const events=JSON.parse(await readFile(new URL('../data/events.json',import.meta.url),'utf8')).filter(e=>Date.parse(e.publishedAt)<=Date.parse(now));
 const p=syncPlatformState({codex:{},claude:{}},events,Date.parse(now)),e=events.find(e=>e.id===done);validateEvent(e);
 assert.equal(p.codex.latestReset.id,done);assert.equal(p.codex.lastReset.id,done);assert.equal(p.codex.reset.state,'completed');assert.equal(p.codex.reset.resetAt,null);assert.equal(e.resetAt,undefined);assert.equal(e.eligiblePlans,undefined);assert.equal(p.codex.reset.publishedAt,date(done));assert.equal(p.codex.reset.accountReport,undefined);assertTrackingSync(p,events);
});
test('actual scheduled collector discovers standalone completion quote, persists completion repeatedly and reports failed context honestly',async()=>{
 const {mkdtemp,mkdir,copyFile,writeFile,rm}=await import('node:fs/promises'),{tmpdir}=await import('node:os'),{join}=await import('node:path'),{spawnSync}=await import('node:child_process'),{pathToFileURL}=await import('node:url');
 const dir=await mkdtemp(join(tmpdir(),'day23-complete-'));
 try{
 for(const part of ['src','scripts','data'])await mkdir(join(dir,part));
 for(const file of ['scripts/collect.mjs','scripts/topic-heat-refresh.mjs','src/evidence.mjs','src/tracking-audit.mjs','src/platform-state.mjs','src/announcement-time.mjs','src/x-relay.mjs','src/collection-request.mjs'])await copyFile(new URL('../'+file,import.meta.url),join(dir,file));
 const old=JSON.parse(await readFile(new URL('../data/events.json',import.meta.url),'utf8')).filter(e=>e.id!==done&&Date.parse(e.publishedAt)<=Date.parse(now));Object.assign(old.find(e=>e.id===root),{kind:'signal',state:'unconfirmed',reason:'ambiguous'});
 await writeFile(join(dir,'fixture.json'),JSON.stringify(f));await writeFile(join(dir,'data/events.json'),JSON.stringify(old));await writeFile(join(dir,'data/platforms.json'),await readFile(new URL('../data/platforms.json',import.meta.url)));await writeFile(join(dir,'data/health.json'),'{}');
 await writeFile(join(dir,'mock.mjs'),`import {readFileSync} from 'node:fs';const f=JSON.parse(readFileSync(new URL('./fixture.json',import.meta.url)));const RealDate=Date;globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:['${now}']));}static now(){return RealDate.parse('${now}');}};globalThis.fetch=async input=>{const u=new URL(input);if(u.pathname.includes('/profile/')){const a=u.pathname.split('/')[3];return Response.json({code:200,results:a==='thsottiaux'?Object.values(f.details):[{id:'123',url:'https://x.com/'+a+'/status/123',author:{screen_name:a},text:'Hello world'}]});}const id=u.hostname==='publish.twitter.com'?new URL(u.searchParams.get('url')).pathname.split('/').pop():u.pathname.split('/').pop();if(u.hostname==='publish.twitter.com')return Response.json(f.embeds[id]);if(process.env.FAIL_CONTEXT==='1')return new Response('',{status:403});return f.details[id]?Response.json({tweet:f.details[id]}):new Response('',{status:403});};`);
 for(const fail of ['0','0','1']){const r=spawnSync(process.execPath,['--import',pathToFileURL(join(dir,'mock.mjs')).href,join(dir,'scripts/collect.mjs')],{encoding:'utf8',timeout:10000,env:{...process.env,ENABLE_PAID_X_API:'false',COLLECT_POST_URLS:'',FAIL_CONTEXT:fail}});assert.equal(r.status,0,r.stderr);const events=JSON.parse(await readFile(join(dir,'data/events.json'),'utf8')),p=JSON.parse(await readFile(join(dir,'data/platforms.json'),'utf8')),h=JSON.parse(await readFile(join(dir,'data/health.json'),'utf8'));assert.equal(events.filter(e=>e.id===timing).length,1);assert.equal(events.find(e=>e.id===root).state,'announced');assert.equal(p.codex.latestReset.id,done);assert.equal(p.codex.reset.accountReport,undefined);assert.equal(p.codex.reset.state,'completed');assert.equal(p.codex.lastReset.id,done);assert.equal(events.filter(e=>e.id===done).length,1);assert.equal(p.codex.reset.resetAt,null);assert.equal(h.platforms.codex.status,fail==='1'?'degraded':'ok');assertTrackingSync(p,events);}
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('a completion quoting an older cycle cannot hide an intervening new announcement',async()=>{
 const events=JSON.parse(await readFile(new URL('../data/events.json',import.meta.url),'utf8')).filter(e=>Date.parse(e.publishedAt)<=Date.parse(now));
 const older=events.find(e=>e.id===root),newer={...older,id:'2115329000000000000',sourceUrl:'https://x.com/thsottiaux/status/2115329000000000000',publishedAt:'2026-10-28T06:25:00Z',fullText:'Day 24/ Rest and reset',excerpt:'Day 21/ Rest and reset'};
 const records=[...events,newer],p=syncPlatformState({codex:{},claude:{}},records,Date.parse(now));
 assert.equal(p.codex.latestReset.id,newer.id);assert.equal(p.codex.reset.state,'announced');assert.equal(p.codex.reset.sourceUrl,newer.sourceUrl);assert.equal(p.codex.lastReset.id,done);assert.equal(p.codex.reset.resetAt,null);assertTrackingSync(p,records);
});
