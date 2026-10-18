import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,copyFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {classify,extractEmbed,reclassifyEvents,validateEvent,evidenceExcerpt} from '../src/evidence.mjs';
import {resolveResetContext,shouldCheckCandidate} from '../src/x-relay.mjs';
import {announcementTime} from '../src/announcement-time.mjs';
import {assertTrackingSync} from '../src/tracking-audit.mjs';
const fixture=JSON.parse(await readFile(new URL('./fixtures/oct17-done.json',import.meta.url),'utf8'));
const root='2111492673890824348',timing='2111492738025959922',done='2111566005684289735';
const now='2026-10-18T03:15:00.000Z',date=id=>new Date(Number((BigInt(id)>>22n)+1288834974657n)).toISOString();
const official=id=>extractEmbed(fixture.embeds[id],fixture.details[id].url);
const requestFor=(data=fixture)=>async input=>{const u=new URL(input),id=u.hostname==='publish.twitter.com'?new URL(u.searchParams.get('url')).pathname.split('/').pop():u.pathname.split('/').pop();if(!data.details[id])throw Error('Missing fixture');return u.hostname==='publish.twitter.com'?data.embeds[id]:{tweet:data.details[id]};};

test('reviewed standalone Done reaches verification without treating arbitrary Done as reset news',()=>{
 const source=official(done);assert.equal(source.text,'Done');assert.equal(source.truncated,false);
 assert.equal(fixture.details[done].replying_to,null);assert.equal(fixture.details[done].replying_to_status,null);assert.equal(fixture.details[done].quote,null);
 assert.equal(date(done),'2026-10-17T21:12:21.411Z');
 for(const [timeZone,day,hour] of [['Asia/Shanghai','18','05'],['America/Los_Angeles','17','14']]){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone,day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(date(done))).map(part=>[part.type,part.value]));
  assert.equal(parts.day,day);assert.equal(parts.hour,hour);assert.equal(parts.minute,'12');assert.equal(parts.second,'21');
 }
 assert.equal(shouldCheckCandidate({url:source.url,relay:fixture.details[done]}),true);
 assert.equal(shouldCheckCandidate({url:source.url,relay:{text:'Done except Business'}}),true);
 assert.equal(shouldCheckCandidate({url:'https://x.com/thsottiaux/status/2111566005684289736',relay:{text:'Done'}}),false);
 assert.equal(shouldCheckCandidate({url:'https://x.com/ClaudeDevs/status/'+done,relay:{text:'Done'}}),false);
 assert.notEqual(classify(source.text,source).state,'reported');
 assert.equal(evidenceExcerpt(source.text,source),'Done');
 assert.equal(evidenceExcerpt('Done except Business',source),'Done except Business');
});

test('reviewed sequence is explicit editorial association, independently reverified and never a fabricated reply',async()=>{
 const source={...official(done),publishedAt:date(done)},context=await resolveResetContext(source,requestFor(),now);
 assert.equal(context.id,timing);assert.equal(context.relation,'reviewed-sequence');assert.equal(context.relationProvenance,'editorial-primary');
 assert.equal(context.resetContext.id,root);assert.equal(context.resetContext.relation,'reply');
 assert.deepEqual(classify(source.text,{...source,resetContext:context}),{kind:'global',state:'reported',reason:'reviewed-completion'});
 assert.equal(announcementTime(source.text,source.publishedAt,source),null);
 const record={id:done,author:source.author,sourceUrl:source.url,publishedAt:source.publishedAt,verifiedAt:now,fullText:source.text,excerpt:'Done',truncated:false,provenance:'x-oembed',rulesVersion:'old',contentHash:createHash('sha256').update(source.text).digest('hex'),resetContext:context,...classify(source.text,{...source,resetContext:context})};
 assert.equal(validateEvent(record),true);assert.equal(record.resetAt,undefined);assert.equal(record.eligiblePlans,undefined);
 assert.deepEqual(reclassifyEvents(reclassifyEvents([record])),reclassifyEvents([record]));
 for(const change of [{id:'2111566005684289736'},{author:'ClaudeDevs'},{truncated:true}])assert.notEqual(classify(source.text,{...source,resetContext:context,...change}).state,'reported');
 for(const text of ['Done.','Done?','"Done"','Not done','Done with the editor'])assert.notEqual(classify(text,{...source,resetContext:context}).state,'reported',text);
 for(const change of [{id:root},{relation:'reply'},{relationProvenance:'fxembed'},{publishedAt:'2026-10-01T00:00:00Z'},{publishedAt:'2026-10-18T00:00:00Z'},{truncated:true},{contentHash:'broken'}]){
  assert.notEqual(classify(source.text,{...source,resetContext:{...context,...change}}).state,'reported');
  assert.throws(()=>validateEvent({...record,resetContext:{...context,...change}}));
 }
});

test('missing, altered, cross-author and newly attached relations cannot manufacture reviewed completion',async()=>{
 for(const alter of [
  f=>{delete f.details[timing];},
  f=>{f.details[timing].author.screen_name='ClaudeDevs';},
  f=>{f.details[done].created_timestamp=0;},
  f=>{f.details[done].replying_to='thsottiaux';f.details[done].replying_to_status=root;},
  f=>{f.details[done].quote={url:fixture.details[root].url};},
  f=>{f.details[root].raw_text.text='Day 13/ Launch';},
 ]){const data=structuredClone(fixture);alter(data);await assert.rejects(()=>resolveResetContext(official(done),requestFor(data),now));}
});

test('actual collector replaces the Day13 preview with the reviewed completion and retains it on failed rechecks',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'oct17-done-'));
 try{
  for(const part of ['src','scripts','data'])await mkdir(join(dir,part));
  for(const file of ['scripts/collect.mjs','scripts/collect-posts.mjs','scripts/topic-heat-refresh.mjs','src/evidence.mjs','src/tracking-audit.mjs','src/platform-state.mjs','src/announcement-time.mjs','src/x-relay.mjs','src/collection-request.mjs'])await copyFile(new URL('../'+file,import.meta.url),join(dir,file));
  const existing=JSON.parse(await readFile(new URL('../data/events.json',import.meta.url),'utf8')).filter(e=>[root,timing,'2110618732666257557'].includes(e.id));
  await writeFile(join(dir,'fixture.json'),JSON.stringify(fixture));await writeFile(join(dir,'data/events.json'),JSON.stringify(existing));await writeFile(join(dir,'data/health.json'),'{}');await writeFile(join(dir,'data/platforms.json'),JSON.stringify({codex:{gifts:[]},claude:{gifts:[]}}));
  await writeFile(join(dir,'mock.mjs'),`
   import {readFileSync} from 'node:fs';const f=JSON.parse(readFileSync(new URL('./fixture.json',import.meta.url)));
   if(process.env.CHANGED_SOURCE==='1'){f.details['${done}'].text='Done except Business';f.details['${done}'].raw_text.text='Done except Business';f.embeds['${done}'].html='<p>Done except Business</p>';f.timeline=f.timeline.map(x=>x.id==='${done}'?f.details['${done}']:x);}
   const RealDate=Date;globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:['${now}']));}static now(){return RealDate.parse('${now}');}};
   globalThis.fetch=async input=>{const u=new URL(input);
    if(u.pathname.includes('/profile/')){const a=u.pathname.split('/')[3],noise={id:'2111566005684289736',url:'https://x.com/'+a+'/status/2111566005684289736',author:{screen_name:a},text:'Done'};return Response.json({code:200,results:a==='thsottiaux'?[...f.timeline,f.details['${done}'],noise]:[noise]});}
    if(u.hostname==='publish.twitter.com'){const id=new URL(u.searchParams.get('url')).pathname.split('/').pop();return Response.json(f.embeds[id]);}
    const id=u.pathname.split('/').pop();if(process.env.FAIL_CONTEXT==='1'&&id==='${done}')return new Response('',{status:403});return f.details[id]?Response.json({tweet:f.details[id]}):new Response('',{status:403});};
  `);
  for(const fail of ['0','0','1']){
   const result=spawnSync(process.execPath,['--import',pathToFileURL(join(dir,'mock.mjs')).href,join(dir,'scripts/collect.mjs')],{encoding:'utf8',timeout:10000,env:{...process.env,ENABLE_PAID_X_API:'false',COLLECT_POST_URLS:'',FAIL_CONTEXT:fail}});assert.equal(result.status,0,result.stderr);
   const events=JSON.parse(await readFile(join(dir,'data/events.json'),'utf8')),p=JSON.parse(await readFile(join(dir,'data/platforms.json'),'utf8')),h=JSON.parse(await readFile(join(dir,'data/health.json'),'utf8'));
   assert.equal(events.filter(e=>e.id===done).length,1);assert.ok(!events.some(e=>e.id==='2111566005684289736'));
   const completion=events.find(e=>e.id===done);assert.equal(completion.state,'reported');assert.equal(completion.reason,'reviewed-completion');assert.equal(completion.fullText,'Done');assert.equal(completion.publishedAt,date(done));assert.equal(completion.resetAt,undefined);assert.equal(completion.eligiblePlans,undefined);
   assert.equal(completion.resetContext.relation,'reviewed-sequence');assert.equal(events.find(e=>e.id===timing).state,'announced');events.forEach(validateEvent);assertTrackingSync(p,events);
   assert.equal(p.codex.lastReset.id,done);assert.equal(p.codex.latestReset.id,done);assert.equal(p.codex.reset.state,'completed');assert.equal(p.codex.reset.resetAt,null);assert.equal(p.codex.reset.publishedAt,date(done));assert.equal(p.codex.reset.deadlineText,undefined);
   assert.equal(h.platforms.codex.status,fail==='0'?'ok':'degraded');
  }
  const before=await readFile(join(dir,'data/health.json'),'utf8');const result=spawnSync(process.execPath,['--import',pathToFileURL(join(dir,'mock.mjs')).href,join(dir,'scripts/collect-posts.mjs'),fixture.details[done].url],{encoding:'utf8',timeout:10000,env:{...process.env,FAIL_CONTEXT:'0'}});assert.equal(result.status,0,result.stderr);assert.equal(await readFile(join(dir,'data/health.json'),'utf8'),before);
  const changed=spawnSync(process.execPath,['--import',pathToFileURL(join(dir,'mock.mjs')).href,join(dir,'scripts/collect.mjs')],{encoding:'utf8',timeout:10000,env:{...process.env,ENABLE_PAID_X_API:'false',COLLECT_POST_URLS:'',FAIL_CONTEXT:'0',CHANGED_SOURCE:'1'}});assert.equal(changed.status,0,changed.stderr);
  const amended=JSON.parse(await readFile(join(dir,'data/events.json'),'utf8')).find(e=>e.id===done),p=JSON.parse(await readFile(join(dir,'data/platforms.json'),'utf8'));
  assert.equal(amended.fullText,'Done except Business');assert.equal(amended.state,'unconfirmed');assert.equal(amended.reason,'reviewed-source-changed');assert.equal(p.codex.reset.state,'announced');assert.equal(p.codex.latestReset.id,timing);
 }finally{if(dirname(resolve(dir))===resolve(tmpdir()))await rm(dir,{recursive:true,force:true});}
});
