import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,copyFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {classify,extractEmbed,isResetTiming,reclassifyEvents,validateEvent} from '../src/evidence.mjs';
import {corroborateRelay,resolveResetContext,shouldCheckCandidate} from '../src/x-relay.mjs';
import {announcementTime} from '../src/announcement-time.mjs';
import {syncPlatformState} from '../src/platform-state.mjs';
import {resetStatus} from '../src/reset-status.mjs';
import {assertTrackingSync} from '../src/tracking-audit.mjs';

const fixture=JSON.parse(await readFile(new URL('./fixtures/oct22-day17-reset.json',import.meta.url),'utf8'));
const root='2113162277688070445',timing='2113162413008884099',done='2111566005684289735',dots='2113029854417600834';
const now='2026-10-22T10:30:00.000Z';
const date=id=>new Date(Number((BigInt(id)>>22n)+1288834974657n)).toISOString();
const official=id=>extractEmbed(fixture.embeds[id],fixture.details[id].url);
const requestFor=(data=fixture)=>async input=>{
 const u=new URL(input),id=u.hostname==='publish.twitter.com'?new URL(u.searchParams.get('url')).pathname.split('/').pop():u.pathname.split('/').pop();
 if(!data.details[id])throw new Error('Missing fixture post');
 return u.hostname==='publish.twitter.com'?data.embeds[id]:{tweet:data.details[id]};
};
const deadline={resetAt:null,sourceTimezone:'PST',deadlineText:'tomorrow before 10am PST',timeBasis:'source-timezone-ambiguous',timeKind:'deadline',approximate:true};

test('Day17 originals retain paragraphs, identity, direct reply and distinct publication seconds',()=>{
 for(const id of [root,timing])assert.equal(corroborateRelay(official(id),fixture.details[id]).text,fixture.details[id].text);
 assert.equal(official(root).text.split('\n\n').length,2);
 assert.match(date(root),/^2026-10-22T06:55:22\./);assert.match(date(timing),/^2026-10-22T06:55:54\./);
 assert.equal(fixture.details[timing].replying_to,'thsottiaux');assert.equal(fixture.details[timing].replying_to_status,root);
 const pacific=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(date(timing)));
 assert.match(pacific,/2026-10-21/);assert.match(pacific,/23:55/);
});

test('rhetorical no in the complete Day17 announcement does not disable genuine denial guards',()=>{
 const text=official(root).text,source=official(root);
 assert.deepEqual(classify(text,source),{kind:'global',state:'announced',reason:'explicit-announcement'});
 assert.equal(classify(text.replace(/[’]/g,"'"),source).state,'announced');
 assert.equal(classify(text,{...source,truncated:true}).state,'unconfirmed');
 assert.notEqual(classify(text,{author:'OpenAI'}).state,'announced');
 for(const altered of ['"'+text+'"','Maybe '+text,text+' Not today.',text.replace('it’s reset day today','it’s not reset day today'),text.replace('but no,','but maybe,'),text.split('\n\n')[0]])assert.notEqual(classify(altered,source).state,'announced',altered);
 for(const denial of ["No reset today.","We won't reset Codex usage today.",'Day 17/ no reset today.','This reset is not today.'])assert.notEqual(classify(denial,source).state,'announced',denial);
 assert.equal(announcementTime(text,date(root),source),null);
 assert.equal(classify('I demand a reset',source).kind,'other');
 assert.equal(classify("Fully included in the Pro plan, doesn't draw on your weekly usage.",source).kind,'usage');
});

test('keywordless before-time reply is discovered and requires verified same-author announcement context',async()=>{
 const own=official(timing);
 assert.equal(shouldCheckCandidate({url:own.url,relay:fixture.details[timing]}),true);
 assert.equal(isResetTiming(own.text),true);assert.equal(classify(own.text,own).state,'unconfirmed');
 assert.equal(shouldCheckCandidate({url:'https://x.com/ClaudeDevs/status/'+timing,relay:{text:own.text}}),false);
 const context=await resolveResetContext(own,requestFor(),now);
 const source={...own,publishedAt:date(timing),resetContext:context};
 assert.equal(context.id,root);assert.equal(context.relation,'reply');assert.equal(context.fullText,official(root).text);
 assert.deepEqual(classify(own.text,source),{kind:'global',state:'announced',reason:'linked-announcement'});
 assert.deepEqual(announcementTime(own.text,date(timing),own),deadline);
 assert.equal(announcementTime(own.text,date(timing),{...own,truncated:true}),null);
 assert.equal(announcementTime(own.text,date(timing),{author:'ClaudeDevs'}),null);
 for(const altered of ['Maybe '+own.text,'"'+own.text+'"',own.text+' Not today.','Lands tomorrow before 10am.','Lands tomorrow before 25am PST.'])assert.notEqual(classify(altered,source).state,'announced',altered);
 for(const change of [{author:'ClaudeDevs'},{publishedAt:'2026-10-20T00:00:00Z'},{truncated:true},{contentHash:'broken'},{fullText:'I demand a reset'}])assert.notEqual(classify(own.text,{...source,resetContext:{...context,...change}}).state,'announced');
 for(const alter of [f=>{delete f.details[timing].replying_to_status;},f=>{f.details[timing].replying_to='ClaudeDevs';},f=>{f.details[root].author.screen_name='ClaudeDevs';},f=>{f.details[timing].created_timestamp=0;}]){
  const data=structuredClone(fixture);alter(data);await assert.rejects(()=>resolveResetContext(own,requestFor(data),now));
 }
 // Both interpretations are upper bounds on Oct 22 in Pacific local time,
 // not a countdown instant; server UTC date must not move "tomorrow" to Oct 23.
 assert.equal(new Date('2026-10-22T10:00:00-08:00').toISOString(),'2026-10-22T18:00:00.000Z');
 assert.equal(new Date('2026-10-22T10:00:00-07:00').toISOString(),'2026-10-22T17:00:00.000Z');
});

test('real collectors migrate Day17, discover timing, retain Dots and completion, and report context failures truthfully',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'day17-reset-'));
 try{
  for(const part of ['src','scripts','data'])await mkdir(join(dir,part));
  for(const file of ['scripts/collect.mjs','scripts/collect-posts.mjs','scripts/topic-heat-refresh.mjs','src/evidence.mjs','src/tracking-audit.mjs','src/platform-state.mjs','src/announcement-time.mjs','src/x-relay.mjs','src/collection-request.mjs'])await copyFile(new URL('../'+file,import.meta.url),join(dir,file));
  const existing=JSON.parse(await readFile(new URL('../data/events.json',import.meta.url),'utf8')).filter(e=>[root,done,dots,'2112432076767289678'].includes(e.id));
  const old=existing.find(e=>e.id===root);Object.assign(old,{kind:'signal',state:'unconfirmed',reason:'ambiguous'});
  const migrated=reclassifyEvents(existing),updated=migrated.find(e=>e.id===root);
  assert.equal(updated.state,'announced');for(const key of ['fullText','contentHash','publishedAt','verifiedAt'])assert.equal(updated[key],old[key]);
  await writeFile(join(dir,'fixture.json'),JSON.stringify(fixture));await writeFile(join(dir,'data/events.json'),JSON.stringify(existing));
  await writeFile(join(dir,'data/health.json'),'{}');await writeFile(join(dir,'data/platforms.json'),JSON.stringify({codex:{},claude:{}}));
  await writeFile(join(dir,'mock.mjs'),`
   import {readFileSync} from 'node:fs';const f=JSON.parse(readFileSync(new URL('./fixture.json',import.meta.url)));
   const RealDate=Date;globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:['${now}']));}static now(){return RealDate.parse('${now}');}};
   globalThis.fetch=async input=>{const u=new URL(input);
    if(u.pathname.includes('/profile/')){const author=u.pathname.split('/')[3];return Response.json({code:200,results:author==='thsottiaux'?[f.details['${timing}'],f.details['${root}'],f.details['${timing}']]:[{id:'123',url:'https://x.com/'+author+'/status/123',author:{screen_name:author},text:'Hello world'}]});}
    if(u.hostname==='publish.twitter.com'){const id=new URL(u.searchParams.get('url')).pathname.split('/').pop();return Response.json(f.embeds[id]);}
    if(process.env.FAIL_CONTEXT==='1')return new Response('',{status:403});
    const id=u.pathname.split('/').pop();return f.details[id]?Response.json({tweet:f.details[id]}):new Response('',{status:403});
   };
  `);
  for(const fail of ['0','0','1']){
   const r=spawnSync(process.execPath,['--import',pathToFileURL(join(dir,'mock.mjs')).href,join(dir,'scripts/collect.mjs')],{encoding:'utf8',timeout:10000,env:{...process.env,ENABLE_PAID_X_API:'false',COLLECT_POST_URLS:'',FAIL_CONTEXT:fail}});
   assert.equal(r.status,0,r.stderr);
   const events=JSON.parse(await readFile(join(dir,'data/events.json'),'utf8')),p=JSON.parse(await readFile(join(dir,'data/platforms.json'),'utf8')),health=JSON.parse(await readFile(join(dir,'data/health.json'),'utf8'));
   for(const id of [root,timing]){assert.equal(events.filter(e=>e.id===id).length,1);const ev=events.find(e=>e.id===id);assert.equal(ev.kind,'global');assert.equal(ev.state,'announced');assert.equal(ev.eligiblePlans,undefined);assert.equal(ev.fullText,official(id).text);assert.equal(ev.publishedAt,date(id));}
   const update=events.find(e=>e.id===timing);for(const key of Object.keys(deadline))assert.equal(update[key],deadline[key]);
   assert.equal(events.find(e=>e.id===dots).kind,'usage');assert.equal(p.codex.latestReset.id,timing);assert.equal(p.codex.lastReset.id,done);assert.equal(p.codex.reset.resetAt,null);assert.equal(p.codex.reset.deadlineText,deadline.deadlineText);
   for(const at of [now,'2026-10-24T12:00:00Z']){syncPlatformState(p,events,Date.parse(at));assert.equal(p.codex.reset.state,'announced');assert.notEqual(resetStatus(p.codex.reset,Date.parse(at)).state,'completed');}
   events.forEach(validateEvent);assert.deepEqual(reclassifyEvents(events),events);assertTrackingSync(p,events);
   assert.equal(health.platforms.codex.status,fail==='0'?'ok':'degraded');if(fail==='1')assert.ok(health.failedPosts.some(e=>e.url.endsWith(timing)&&e.error.startsWith('Reset context:')));
  }
  const health=await readFile(join(dir,'data/health.json'),'utf8');
  const r=spawnSync(process.execPath,['--import',pathToFileURL(join(dir,'mock.mjs')).href,join(dir,'scripts/collect-posts.mjs'),fixture.details[root].url,fixture.details[timing].url],{encoding:'utf8',timeout:10000,env:{...process.env,FAIL_CONTEXT:'0'}});
  assert.equal(r.status,0,r.stderr);assert.equal(await readFile(join(dir,'data/health.json'),'utf8'),health);
 }finally{if(dirname(resolve(dir))===resolve(tmpdir()))await rm(dir,{recursive:true,force:true});}
});
