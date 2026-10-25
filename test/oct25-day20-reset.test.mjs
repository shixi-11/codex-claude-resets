import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {classify,extractEmbed,isResetTiming,reclassifyEvents,validateEvent} from '../src/evidence.mjs';
import {resolveResetContext,shouldCheckCandidate} from '../src/x-relay.mjs';
import {announcementTime} from '../src/announcement-time.mjs';
import {syncPlatformState} from '../src/platform-state.mjs';
import {resetStatus} from '../src/reset-status.mjs';
import {assertTrackingSync} from '../src/tracking-audit.mjs';
const f=JSON.parse(await readFile(new URL('./fixtures/oct25-day20-reset.json',import.meta.url),'utf8'));
const root='2114200152701575656',timing='2114200291319124163',now='2026-10-25T06:30:00Z';
const date=id=>new Date(Number((BigInt(id)>>22n)+1288834974657n)).toISOString();
const official=id=>extractEmbed(f.embeds[id],f.details[id].url);
const request=(data=f)=>async input=>{const u=new URL(input),id=u.hostname==='publish.twitter.com'?new URL(u.searchParams.get('url')).pathname.split('/').pop():u.pathname.split('/').pop();return u.hostname==='publish.twitter.com'?data.embeds[id]:{tweet:data.details[id]};};
test('reset-day wording is an announcement, never execution, with quote/negation/author guards',()=>{
 for(const text of ['Day 20/ Rest and reset','Day 21/ Rest & reset.','Day 34/ Rest and Reset!'])assert.equal(classify(text,{author:'thsottiaux'}).state,'announced');
 for(const text of ['Maybe Day 20/ Rest and reset','"Day 20/ Rest and reset"','Day 20/ Rest and no reset','Day 20/ Rest and reset?','Day 20/ Rest and reset. Not today.','Not a real improvement, put the reset in the bag'])assert.notEqual(classify(text,{author:'thsottiaux'}).state,'announced');
 assert.equal(classify(official(root).text,{...official(root),truncated:true}).state,'unconfirmed');assert.notEqual(classify(official(root).text,{author:'OpenAI'}).state,'announced');
});
test('keywordless midnight reply is discovered and needs verified same-author parent; PST remains ambiguous',async()=>{
 const own=official(timing);assert.equal(shouldCheckCandidate({url:own.url,relay:f.details[timing]}),true);assert.equal(isResetTiming(own.text),true);
 assert.equal(classify(own.text,own).state,'unconfirmed');
 const context=await resolveResetContext(own,request(),now),source={...own,publishedAt:date(timing),resetContext:context};
 assert.equal(context.id,root);assert.equal(context.relation,'reply');assert.equal(context.fullText,official(root).text);
 assert.deepEqual(classify(own.text,source),{kind:'global',state:'announced',reason:'linked-announcement'});
 assert.deepEqual(announcementTime(own.text,date(timing),source),{resetAt:null,sourceTimezone:'PST',deadlineText:'by midnight PST',timeBasis:'source-timezone-ambiguous',timeKind:'deadline',approximate:true});
 for(const change of [{author:'ClaudeDevs'},{truncated:true},{publishedAt:'2026-10-20T00:00:00Z'},{fullText:'Some unrelated release'}])assert.notEqual(classify(own.text,{...source,resetContext:{...context,...change}}).state,'announced');
 for(const alter of [f=>delete f.details[timing].replying_to_status,f=>f.details[timing].replying_to='ClaudeDevs',f=>f.details[root].author.screen_name='OpenAI']){const bad=structuredClone(f);alter(bad);await assert.rejects(()=>resolveResetContext(own,request(bad),now));}
 assert.notEqual(classify('By midnight PST',{author:'ClaudeDevs',publishedAt:date(timing),resetContext:context}).state,'announced');
});
test('migrated new cycle replaces Day18 without carrying its individual report or inventing completion',async()=>{
 const events=reclassifyEvents(JSON.parse(await readFile(new URL('../data/events.json',import.meta.url),'utf8')).filter(e=>Date.parse(e.publishedAt)<=Date.parse(now))),p=JSON.parse(await readFile(new URL('../data/platforms.json',import.meta.url),'utf8'));
 for(const at of [now,'2026-10-26T10:00:00Z']){syncPlatformState(p,events,Date.parse(at));assert.equal(p.codex.latestReset.id,timing);assert.equal(p.codex.reset.accountReport,undefined);assert.equal(p.codex.reset.resetAt,null);assert.equal(p.codex.reset.state,'announced');assert.notEqual(resetStatus(p.codex.reset,Date.parse(at)).state,'completed');assert.equal(p.codex.lastReset.id,'2111566005684289735');assertTrackingSync(p,events);}
 events.forEach(validateEvent);assert.deepEqual(reclassifyEvents(events),events);
});
test('actual scheduled collector discovers timing reply, persists the new cycle repeatedly and reports failed context honestly',async()=>{
 const {mkdtemp,mkdir,copyFile,writeFile,rm}=await import('node:fs/promises'),{tmpdir}=await import('node:os'),{join}=await import('node:path'),{spawnSync}=await import('node:child_process'),{pathToFileURL}=await import('node:url');
 const dir=await mkdtemp(join(tmpdir(),'day20-'));
 try{
 for(const part of ['src','scripts','data'])await mkdir(join(dir,part));
 for(const file of ['scripts/collect.mjs','scripts/topic-heat-refresh.mjs','src/evidence.mjs','src/tracking-audit.mjs','src/platform-state.mjs','src/announcement-time.mjs','src/x-relay.mjs','src/collection-request.mjs'])await copyFile(new URL('../'+file,import.meta.url),join(dir,file));
 const old=JSON.parse(await readFile(new URL('../data/events.json',import.meta.url),'utf8')).filter(e=>e.id!==timing&&Date.parse(e.publishedAt)<=Date.parse(now));Object.assign(old.find(e=>e.id===root),{kind:'signal',state:'unconfirmed',reason:'ambiguous'});
 await writeFile(join(dir,'fixture.json'),JSON.stringify(f));await writeFile(join(dir,'data/events.json'),JSON.stringify(old));await writeFile(join(dir,'data/platforms.json'),await readFile(new URL('../data/platforms.json',import.meta.url)));await writeFile(join(dir,'data/health.json'),'{}');
 await writeFile(join(dir,'mock.mjs'),`import {readFileSync} from 'node:fs';const f=JSON.parse(readFileSync(new URL('./fixture.json',import.meta.url)));const RealDate=Date;globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:['${now}']));}static now(){return RealDate.parse('${now}');}};globalThis.fetch=async input=>{const u=new URL(input);if(u.pathname.includes('/profile/')){const a=u.pathname.split('/')[3];return Response.json({code:200,results:a==='thsottiaux'?Object.values(f.details):[{id:'123',url:'https://x.com/'+a+'/status/123',author:{screen_name:a},text:'Hello world'}]});}const id=u.hostname==='publish.twitter.com'?new URL(u.searchParams.get('url')).pathname.split('/').pop():u.pathname.split('/').pop();if(u.hostname==='publish.twitter.com')return Response.json(f.embeds[id]);if(process.env.FAIL_CONTEXT==='1')return new Response('',{status:403});return f.details[id]?Response.json({tweet:f.details[id]}):new Response('',{status:403});};`);
 for(const fail of ['0','0','1']){const r=spawnSync(process.execPath,['--import',pathToFileURL(join(dir,'mock.mjs')).href,join(dir,'scripts/collect.mjs')],{encoding:'utf8',timeout:10000,env:{...process.env,ENABLE_PAID_X_API:'false',COLLECT_POST_URLS:'',FAIL_CONTEXT:fail}});assert.equal(r.status,0,r.stderr);const events=JSON.parse(await readFile(join(dir,'data/events.json'),'utf8')),p=JSON.parse(await readFile(join(dir,'data/platforms.json'),'utf8')),h=JSON.parse(await readFile(join(dir,'data/health.json'),'utf8'));assert.equal(events.filter(e=>e.id===timing).length,1);assert.equal(events.find(e=>e.id===root).state,'announced');assert.equal(p.codex.latestReset.id,timing);assert.equal(p.codex.reset.accountReport,undefined);assert.equal(p.codex.reset.resetAt,null);assert.equal(h.platforms.codex.status,fail==='1'?'degraded':'ok');assertTrackingSync(p,events);}
 }finally{await rm(dir,{recursive:true,force:true});}
});
