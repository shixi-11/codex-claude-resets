import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,copyFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {decodeHtml,extractEmbed,classify,parsePostUrl,validateEvent,validateAccountReport,accountReportForReset} from '../src/evidence.mjs';
import {syncPlatformState} from '../src/platform-state.mjs';
import {resetStatus} from '../src/reset-status.mjs';
import {assertTrackingSync,trackingAudit} from '../src/tracking-audit.mjs';
import {priorityDetails,userReportCopy} from '../src/priority-details.mjs';
import {clockPanel} from '../src/clock-panel.mjs';
const fixture=JSON.parse(await readFile(new URL('./fixtures/oct24-account-report.json',import.meta.url),'utf8'));
const events=JSON.parse(await readFile(new URL('../data/events.json',import.meta.url),'utf8')).filter(e=>Date.parse(e.publishedAt)<=Date.parse('2026-10-24T07:15:00Z'));
const before=JSON.parse(await readFile(new URL('../data/platforms.json',import.meta.url),'utf8'));
const heat=JSON.parse(await readFile(new URL('../data/topic-heat.json',import.meta.url),'utf8'));
const report=fixture.report,parent='2113492502355562875',now=Date.parse('2026-10-24T07:15:00Z');
const state=(records=events,reports=[report])=>syncPlatformState({codex:{name:'Codex',gifts:[],accountReports:structuredClone(reports)},claude:{name:'Claude',gifts:[]}},records,now);

test('reviewed personal report matches primary text, direct Day18 parent, image and publication time without becoming official evidence',()=>{
 const html=fixture.reportEmbed.html.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)[1];
 const text=decodeHtml(html.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi,'').replace(/<[^>]*>/g,'')).trim();
 assert.equal(text,report.fullText);assert.equal(createHash('sha256').update(text).digest('hex'),report.contentHash);
 assert.equal(fixture.reportEmbed.url,report.sourceUrl);assert.equal(fixture.reportRelay.author.screen_name,report.author);
 assert.equal(fixture.reportRelay.replying_to,'thsottiaux');assert.equal(fixture.reportRelay.replying_to_status,parent);
 assert.equal(new Date(fixture.reportRelay.created_timestamp*1000).toISOString(),'2026-10-23T17:43:50.000Z');
 assert.equal(report.publishedAt,new Date(Number((BigInt(report.id)>>22n)+1288834974657n)).toISOString());
 assert.equal(fixture.reportRelay.media.photos[0].url,report.image.sourceUrl);assert.equal(report.image.weeklyRemainingLabel,'100%');assert.equal(report.image.nextResetLabel,'Fri 30 Oct 19:41 EET');
 assert.equal(extractEmbed(fixture.parentEmbed,report.replyTo).text,events.find(e=>e.id===parent).fullText);
 assert.equal(validateAccountReport(report),true);assert.equal(parsePostUrl(report.sourceUrl),null);assert.throws(()=>validateEvent(report));
 const day19=extractEmbed(fixture.day19Embed,fixture.day19Embed.url);assert.equal(classify(day19.text,day19).kind,'other');
 assert.ok(fixture.day19Relay.created_timestamp>fixture.reportRelay.created_timestamp);
 assert.equal(events.some(e=>e.id===report.id),false);assert.equal(report.resetAt,null);assert.equal(report.eligiblePlans,undefined);
});

test('single user report remains distinct from official completion and cannot follow a different or amended reset',()=>{
 const p=state();assertTrackingSync(p,events);
 assert.equal(p.codex.reset.state,'announced');assert.equal(p.codex.reset.accountReport.id,report.id);assert.equal(p.codex.reset.resetAt,null);
 assert.equal(resetStatus(p.codex.reset,now).state,'userReported');assert.equal(resetStatus(p.codex.reset,now).remainingMs,null);assert.equal(resetStatus(p.codex.reset,now).at,null);
 assert.equal(p.codex.lastReset.id,'2111566005684289735');assert.equal(p.codex.lastReset.id,before.codex.lastReset.id);
 assert.equal(p.codex.lastReset.publishedAt,'2026-10-17T21:12:21.411Z');assert.equal(p.codex.latestReset.id,parent);
 const next={...events.find(e=>e.id===parent),id:'2113770573994299544',sourceUrl:'https://x.com/thsottiaux/status/2113770573994299544',publishedAt:'2026-10-23T23:12:31Z'};
 const newCycle=state([...events,next]);assert.equal(newCycle.codex.reset.accountReport,undefined);assert.notEqual(resetStatus(newCycle.codex.reset,now).state,'userReported');
 const amended=state(events.map(e=>e.id===parent?{...e,contentHash:'a'.repeat(64)}:e));assert.equal(amended.codex.reset.accountReport,undefined);
 const completed=state([...events,{...next,state:'reported'}]);assert.equal(completed.codex.reset.accountReport,undefined);assert.equal(completed.codex.reset.state,'completed');
 const none=state(events,[]);assert.equal(none.codex.reset.accountReport,undefined);
 for(const change of [{official:true},{scope:'global'},{resetAt:report.publishedAt},{eligiblePlans:['Pro']},{author:'thsottiaux'},{fullText:'Everyone is reset'},{replyTo:next.sourceUrl},{contentHash:'a'.repeat(64)},{image:{...report.image,sha256:'a'.repeat(64)}}]){
  const invalid={...report,...change};assert.throws(()=>validateAccountReport(invalid));assert.equal(accountReportForReset(p.codex.reset,[invalid]),null);
 }
 const tampered=structuredClone(p);tampered.codex.reset.accountReport.official=true;assert.throws(()=>assertTrackingSync(tampered,events));
});

test('all nine locales show the attributed report and report time while official completion elapsed time stays separate',()=>{
 const p=state();
 for(const lang of Object.keys(userReportCopy)){
  const html=priorityDetails(p.codex,'codex',events,lang);
  assert.ok(html.includes('data-account-report'));assert.ok(html.includes(report.sourceUrl));assert.ok(html.includes(userReportCopy[lang].note));
  assert.ok(html.includes(userReportCopy[lang].officialElapsed));
  assert.ok(html.includes(`datetime="${report.publishedAt}"`));assert.ok(html.includes('data-reset-elapsed="2026-10-17T21:12:21.411Z"'));
  assert.ok(!html.includes(`data-reset-elapsed="${report.publishedAt}"`));
  const card=clockPanel({codex:p.codex},lang,'../','test',events,heat);assert.ok(card.includes('data-clock-state="userReported"'));assert.ok(card.includes(userReportCopy[lang].title));
 }
});

test('actual repeated collector runs preserve the reviewed report without refreshing it or promoting it into official events',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'account-report-'));
 try{
  for(const part of ['src','scripts','data'])await mkdir(join(dir,part));
  for(const file of ['scripts/collect.mjs','scripts/topic-heat-refresh.mjs','src/evidence.mjs','src/tracking-audit.mjs','src/platform-state.mjs','src/announcement-time.mjs','src/x-relay.mjs','src/collection-request.mjs'])await copyFile(new URL('../'+file,import.meta.url),join(dir,file));
  const f=JSON.parse(await readFile(new URL('./fixtures/oct23-day18-reset.json',import.meta.url),'utf8'));
  await writeFile(join(dir,'fixture.json'),JSON.stringify(f));await writeFile(join(dir,'data/events.json'),JSON.stringify(events));await writeFile(join(dir,'data/platforms.json'),JSON.stringify(state()));await writeFile(join(dir,'data/health.json'),'{}');
  await writeFile(join(dir,'mock.mjs'),`
   import {readFileSync} from 'node:fs';const f=JSON.parse(readFileSync(new URL('./fixture.json',import.meta.url)));
   const RealDate=Date;globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:['2026-10-24T07:15:00Z']));}static now(){return RealDate.parse('2026-10-24T07:15:00Z');}};
   globalThis.fetch=async input=>{const u=new URL(input);
    if(u.pathname.includes('/profile/')){const a=u.pathname.split('/')[3];return Response.json({code:200,results:a==='thsottiaux'?Object.values(f.details):[{id:'123',url:'https://x.com/'+a+'/status/123',author:{screen_name:a},text:'Hello world'}]});}
    const id=u.hostname==='publish.twitter.com'?new URL(u.searchParams.get('url')).pathname.split('/').pop():u.pathname.split('/').pop();
    return u.hostname==='publish.twitter.com'?Response.json(f.embeds[id]):Response.json({tweet:f.details[id]});
   };
  `);
  for(let run=0;run<2;run++){
   const result=spawnSync(process.execPath,['--import',pathToFileURL(join(dir,'mock.mjs')).href,join(dir,'scripts/collect.mjs')],{encoding:'utf8',timeout:10000,env:{...process.env,ENABLE_PAID_X_API:'false',COLLECT_POST_URLS:''}});assert.equal(result.status,0,result.stderr);
   const saved=JSON.parse(await readFile(join(dir,'data/events.json'),'utf8')),p=JSON.parse(await readFile(join(dir,'data/platforms.json'),'utf8'));
   assert.equal(saved.some(e=>e.id===report.id),false);assert.equal(p.codex.reset.state,'announced');assert.equal(p.codex.reset.accountReport.verifiedAt,report.verifiedAt);assert.equal(p.codex.lastReset.id,'2111566005684289735');assertTrackingSync(p,saved);
  }
 }finally{if(dirname(resolve(dir))===resolve(tmpdir()))await rm(dir,{recursive:true,force:true});}
});

test('the observed five-hour scheduling gap still alerts even when the current source check succeeds',()=>{
 const at=Date.parse('2026-10-24T05:51:08.541Z'),previous={checkedAt:'2026-10-24T00:40:35.173Z',openKeys:[]};
 const health={lastSuccessAt:new Date(at).toISOString(),platforms:Object.fromEntries(['codex','claude'].map(id=>[id,{status:'ok',lastSuccessAt:new Date(at).toISOString()}]))};
 const audit=trackingAudit({platforms:state(),events,health,previous,now:at}),gap=audit.newIssues.find(i=>i.key==='collection-gap');
 assert.equal(gap.gapMs,18633368);assert.equal(gap.previousCheckedAt,previous.checkedAt);assert.equal(audit.status,'attention');
 const later=trackingAudit({platforms:state(),events,health,previous:audit,now:at+60000});assert.equal(later.issues.some(i=>i.key==='collection-gap'),false);
});
