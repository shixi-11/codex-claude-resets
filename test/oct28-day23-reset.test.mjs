import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,copyFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {classify,extractEmbed,isResetTiming,reclassifyEvents,validateEvent} from '../src/evidence.mjs';
import {resolveResetContext,shouldCheckCandidate,corroborateRelay} from '../src/x-relay.mjs';
import {announcementTime} from '../src/announcement-time.mjs';
import {assertTrackingSync} from '../src/tracking-audit.mjs';
const f=JSON.parse(await readFile(new URL('./fixtures/oct28-day23-reset.json',import.meta.url),'utf8'));
const root='2115273064481218829',timing='2115273253711409208',now='2026-10-28T03:10:00Z';
const date=id=>new Date(Number((BigInt(id)>>22n)+1288834974657n)).toISOString();
const official=id=>extractEmbed(f.embeds[id],f.details[id].url);
const request=data=>async input=>{const u=new URL(input),id=u.hostname==='publish.twitter.com'?new URL(u.searchParams.get('url')).pathname.split('/').pop():u.pathname.split('/').pop();return u.hostname==='publish.twitter.com'?data.embeds[id]:{tweet:data.details[id]};};

test('complete Day23 announces a reset, while the plugin launch is retracted as a joke',()=>{
 const own=official(root);assert.equal(corroborateRelay(own,f.details[root]).text.replace('&amp;','&'),own.text);
 assert.equal(classify(own.text,own).state,'announced');assert.equal(classify(own.text,own).kind,'global');
 assert.equal(announcementTime(own.text,date(root),own),null);
 for(const text of ['Maybe '+own.text,'"'+own.text+'"',own.text+' Not today.',own.text.replace('today is a reset','today is not a reset'),own.text.replace('today is a reset','today might be a reset'),own.text.replace('today is a reset.','today is a reset?')])assert.notEqual(classify(text,own).state,'announced');
 for(const source of [{...own,truncated:true},{...own,author:'OpenAI'}])assert.notEqual(classify(own.text,source).state,'announced');
});

test('midnight deadline needs verified recent same-author context and never becomes an exact instant',async()=>{
 const own=official(timing);assert.equal(isResetTiming(own.text),true);assert.equal(shouldCheckCandidate({url:own.url,relay:f.details[timing]}),true);
 assert.equal(classify(own.text,own).state,'unconfirmed');
 const context=await resolveResetContext(own,request(f),now),source={...own,publishedAt:date(timing),resetContext:context};
 assert.equal(context.id,root);assert.equal(context.relation,'reply');
 assert.equal(classify(own.text,source).state,'announced');
 assert.deepEqual(announcementTime(own.text,date(timing),source),{resetAt:null,sourceTimezone:'PST',deadlineText:'by midnight PST',timeBasis:'source-timezone-ambiguous',timeKind:'deadline',approximate:true});
 for(const text of ['Lands at midnight PST.','Lands by midnight.','Maybe lands by midnight PST.','Lands by midnight PDT.','Lands by midnight PST. Not today.'])assert.equal(isResetTiming(text),false);
 for(const change of [{author:'ClaudeDevs'},{truncated:true},{publishedAt:'2026-10-20T00:00:00Z'},{fullText:'A plugin launch'}])assert.notEqual(classify(own.text,{...source,resetContext:{...context,...change}}).state,'announced');
 const bad=structuredClone(f);delete bad.details[timing].replying_to_status;await assert.rejects(()=>resolveResetContext(own,request(bad),now));
});

test('actual collector discovers Day23 and its deadline, preserves history, and degrades on failed context rechecks',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'day23-'));
 try{
  for(const part of ['src','scripts','data'])await mkdir(join(dir,part));
  for(const file of ['scripts/collect.mjs','scripts/collect-posts.mjs','scripts/topic-heat-refresh.mjs','src/evidence.mjs','src/tracking-audit.mjs','src/platform-state.mjs','src/announcement-time.mjs','src/x-relay.mjs','src/collection-request.mjs'])await copyFile(new URL('../'+file,import.meta.url),join(dir,file));
  const old=JSON.parse(await readFile(new URL('../data/events.json',import.meta.url),'utf8')).filter(e=>!Object.keys(f.details).includes(e.id)&&Date.parse(e.publishedAt)<Date.parse('2026-10-28T06:00:00Z'));
  await writeFile(join(dir,'fixture.json'),JSON.stringify(f));await writeFile(join(dir,'data/events.json'),JSON.stringify(old));await writeFile(join(dir,'data/platforms.json'),await readFile(new URL('../data/platforms.json',import.meta.url)));await writeFile(join(dir,'data/health.json'),'{}');
  await writeFile(join(dir,'mock.mjs'),`import {readFileSync} from 'node:fs';const f=JSON.parse(readFileSync(new URL('./fixture.json',import.meta.url)));const RealDate=Date;globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:['${now}']));}static now(){return RealDate.parse('${now}');}};globalThis.fetch=async input=>{const u=new URL(input);if(u.pathname.includes('/profile/')){const a=u.pathname.split('/')[3];return Response.json({code:200,results:a==='thsottiaux'?Object.values(f.details):[{id:'123',url:'https://x.com/'+a+'/status/123',author:{screen_name:a},text:'Hello world'}]});}const id=u.hostname==='publish.twitter.com'?new URL(u.searchParams.get('url')).pathname.split('/').pop():u.pathname.split('/').pop();if(u.hostname==='publish.twitter.com')return Response.json(f.embeds[id]);if(process.env.FAIL_CONTEXT==='1')return new Response('',{status:403});return f.details[id]?Response.json({tweet:f.details[id]}):new Response('',{status:403});};`);
  for(const fail of ['0','0','1']){
   const r=spawnSync(process.execPath,['--import',pathToFileURL(join(dir,'mock.mjs')).href,join(dir,'scripts/collect.mjs')],{encoding:'utf8',timeout:10000,env:{...process.env,ENABLE_PAID_X_API:'false',COLLECT_POST_URLS:'',FAIL_CONTEXT:fail}});assert.equal(r.status,0,r.stderr);
   const events=JSON.parse(await readFile(join(dir,'data/events.json'),'utf8')),p=JSON.parse(await readFile(join(dir,'data/platforms.json'),'utf8')),h=JSON.parse(await readFile(join(dir,'data/health.json'),'utf8'));
   for(const id of [root,timing]){assert.equal(events.filter(e=>e.id===id).length,1);assert.equal(events.find(e=>e.id===id).state,'announced');}
   assert.ok(events.some(e=>e.id==='2114588174249071102'));assert.equal(p.codex.latestReset.id,timing);assert.equal(p.codex.lastReset.id,'2114237083652882932');assert.equal(p.codex.reset.state,'announced');assert.equal(p.codex.reset.resetAt,null);assert.equal(p.codex.latestReset.eligiblePlans,undefined);
   assert.equal(h.platforms.codex.status,fail==='1'?'degraded':'ok');assert.equal(p.codex.latestReset.timeKind,'deadline');events.forEach(validateEvent);assert.deepEqual(reclassifyEvents(events),events);assertTrackingSync(p,events);
  }
 }finally{if(dirname(resolve(dir))===resolve(tmpdir()))await rm(dir,{recursive:true,force:true});}
});
