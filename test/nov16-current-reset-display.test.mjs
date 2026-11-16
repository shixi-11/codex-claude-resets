import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,cp,copyFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {bankedActivation,classify,reclassifyEvents,validateEvent,extractEmbed,manualResetGrant} from '../src/evidence.mjs';
import {corroborateRelay} from '../src/x-relay.mjs';
import {creditAvailability,creditPresentation,eventStateClass} from '../src/credit-availability.mjs';
import {syncPlatformState} from '../src/platform-state.mjs';
import {priorityDetails,earlierPosts} from '../src/priority-details.mjs';
import {offers} from '../src/offers.mjs';
import {names,eventStateLabel} from '../src/locales.mjs';
import {resetStatus} from '../src/reset-status.mjs';
import {escapeHtml} from '../src/shared.mjs';
const load=async file=>JSON.parse(await readFile(new URL(file,import.meta.url),'utf8'));
const manual=await load('./fixtures/nov11-manual-reset.json'),activation=await load('./fixtures/nov12-banked-activation.json');
const stored=await load('../data/events.json'),current=reclassifyEvents(stored),grant=current.find(e=>e.id===manual.original.id),rollout=current.find(e=>e.id===activation.original.id);
const archiveBoundary=Date.parse(grant.publishedAt)+7*86400000;

test('November 16 primary checks corroborate the full activation and manual terms without global completion',()=>{
 for(const f of [manual,activation]){
  assert.equal(f.checkedOn,'2026-11-16');const embed=extractEmbed(f.embed,f.sourceUrl),full=corroborateRelay(embed,f.relay);
  assert.equal(full.text,f.original.fullText);assert.equal(createHash('sha256').update(full.text).digest('hex'),f.original.contentHash);
  assert.equal(f.syndication.user.screen_name,f.original.author);assert.equal(f.syndication.id_str,f.original.id);
  assert.equal(f.syndication.created_at.slice(0,19),f.original.publishedAt.slice(0,19));
 }
 assert.equal(extractEmbed(manual.embed,manual.sourceUrl).truncated,true);
 assert.equal(extractEmbed(activation.embed,activation.sourceUrl).truncated,false);
 assert.equal(activation.syndication.text,bankedActivation.fullText);
 assert.ok(manual.syndication.text.includes('Use it anytime before December 10 at 2:00PM PT.'));
 for(const f of [grant,rollout]){validateEvent(f);assert.equal(f.kind,'banked');assert.equal(f.resetAt,undefined);}
 assert.equal(grant.state,'reported');assert.equal(rollout.state,'announced');
});

test('manual qualification stays on both current cards after its exact seven-day archive boundary',()=>{
 assert.equal(new Date(archiveBoundary).toISOString(),'2026-11-17T21:59:58.185Z');
 assert.ok(earlierPosts(current,archiveBoundary).some(e=>e.id===grant.id));
 assert.ok(!earlierPosts(current,archiveBoundary+1).some(e=>e.id===grant.id));
 for(const at of [archiveBoundary+1,Date.parse('2026-11-18T22:00:00Z'),Date.parse('2026-12-10T21:59:59.999Z'),Date.parse(manualResetGrant.endsAt)]){
  const before=syncPlatformState({claude:{name:'Claude',gifts:[]},codex:{name:'Codex',gifts:[]}},current.map(e=>e.id===grant.id?manual.original:e),at);
  const after=syncPlatformState(structuredClone(before),current,at);
  assert.equal(after.claude.latestGift.id,grant.id);
  for(const key of ['lastReset','latestReset','reset'])assert.deepEqual(after.claude[key],before.claude[key]);
  for(const key of ['claude','codex'])assert.deepEqual(resetStatus(after[key].reset,at),resetStatus(before[key].reset,at));
  for(const lang of Object.keys(names)){
   const p=creditPresentation(grant,lang,at);assert.equal(p.state,at<Date.parse(manualResetGrant.endsAt)?'before':'expired');
   for(const html of [offers({claude:after.claude},lang,at),priorityDetails(after.claude,'claude',current,lang,at)]){
    assert.ok(html.includes(grant.sourceUrl));assert.ok(!html.includes('href="https://x.com/ClaudeDevs/status/2104641323198472430"'));
    assert.ok(html.includes(escapeHtml(p.label)));assert.ok(html.includes(escapeHtml(p.note)));
   }
  }
 }
 const p=creditPresentation(grant,'en',archiveBoundary+1);
 assert.match(p.note,/Pro, Max, Ultra and Team/);assert.match(p.note,/all models and limits/);assert.match(p.note,/Settings > Usage/);assert.match(p.note,/Whether you used the credit is unknown/);
 assert.equal(creditAvailability(grant,Date.parse('2026-12-10T21:59:59.999Z')).state,'before');
 assert.equal(creditAvailability(grant,Date.parse('2026-12-10T22:00:00Z')).state,'expired');
 for(const [tz,date,hour] of [['America/Los_Angeles','10','14'],['UTC','10','22'],['Asia/Shanghai','11','06']]){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:tz,day:'2-digit',hour:'2-digit',hour12:false}).formatToParts(new Date(manualResetGrant.endsAt)).map(p=>[p.type,p.value]));assert.equal(parts.day,date);assert.equal(parts.hour,hour);
 }
});

test('nine-language activation states never imply completed delivery and reject changed evidence',()=>{
 for(const lang of Object.keys(names)){
  const p=creditPresentation(rollout,lang);assert.equal(p.state,'pending');assert.ok(p.label);assert.ok(p.note);assert.equal(eventStateLabel(rollout,lang),p.label);assert.equal(eventStateClass(rollout),'announced');
  for(const html of [priorityDetails({lastReset:null},'codex',[rollout],lang),offers({codex:{name:'Codex',gifts:[],latestGift:rollout}},lang)]){
   assert.ok(html.includes(escapeHtml(p.label)));assert.ok(html.includes(escapeHtml(p.note)));
  }
 }
 assert.match(eventStateLabel(rollout,'en'),/Activated.*pending/);
 for(const change of [{id:'123'},{author:'OpenAI'},{truncated:true},{fullText:bankedActivation.fullText+' Changed'}])assert.notEqual(classify(change.fullText||bankedActivation.fullText,{...rollout,...change}).reason,'reviewed-bank-rollout');
 for(const change of [{truncated:true},{fullText:bankedActivation.fullText+' Changed'},{contentHash:'0'.repeat(64)},{sourceUrl:'https://x.com/OpenAI/status/'+rollout.id},{publishedAt:'2026-11-13T00:00:00Z'}])assert.equal(creditPresentation({...rollout,...change}),null);
 assert.throws(()=>validateEvent({...rollout,fullText:bankedActivation.fullText+' Changed'}));
});

test('real nine-language builds retain current manual credit after archive removal and across exact expiry',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'manual-current-build-'));
 try{
  for(const part of ['scripts','data','public/assets'])await mkdir(join(dir,part),{recursive:true});
  await cp(new URL('../src/',import.meta.url),join(dir,'src'),{recursive:true});await copyFile(new URL('../scripts/build.mjs',import.meta.url),join(dir,'scripts/build.mjs'));
  for(const file of ['health.json','platforms.json','topic-heat.json','translations.json'])await copyFile(new URL('../data/'+file,import.meta.url),join(dir,'data',file));
  for(const file of ['social.jpg','drummer-poster.webp','drummer-atlas.webp'])await copyFile(new URL('../public/assets/'+file,import.meta.url),join(dir,'public/assets',file));
  const originalPlatforms=await load('../data/platforms.json');
  const history=stored.filter(e=>['2104641323198472430',originalPlatforms.codex.lastReset?.id,originalPlatforms.claude.lastReset?.id].includes(e.id));
  const input=JSON.stringify([manual.original,activation.original,...history]);await writeFile(join(dir,'data/events.json'),input);
  for(const at of ['2026-11-18T22:00:00Z','2026-12-10T21:59:59.999Z','2026-12-10T22:00:00Z']){
   const now=Date.parse(at);await writeFile(join(dir,'clock.mjs'),`const RealDate=Date;globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[${JSON.stringify(at)}]));}static now(){return RealDate.parse(${JSON.stringify(at)});}};`);
   const run=spawnSync(process.execPath,['--import',pathToFileURL(join(dir,'clock.mjs')).href,join(dir,'scripts/build.mjs')],{encoding:'utf8',timeout:30000,env:{...process.env,TZ:Intl.DateTimeFormat().resolvedOptions().timeZone}});assert.equal(run.status,0,run.stderr);
   assert.equal(await readFile(join(dir,'data/events.json'),'utf8'),input);
   const p=JSON.parse(await readFile(join(dir,'dist/platforms.json'),'utf8'));
   assert.equal(p.claude.latestGift.id,grant.id);assert.equal(p.claude.reset.state,'unknown');assert.equal(p.claude.reset.resetAt,null);assert.notEqual(p.claude.lastReset?.id,grant.id);
   for(const id of ['claude','codex'])assert.equal(p[id].lastReset?.id,originalPlatforms[id].lastReset?.id);
   for(const lang of Object.keys(names)){
    const home=await readFile(join(dir,'dist',lang,'index.html'),'utf8'),detail=await readFile(join(dir,'dist',lang,'events',grant.id,'index.html'),'utf8');
    const present=creditPresentation(grant,lang,now);
    for(const html of [home,detail]){assert.ok(html.includes(escapeHtml(present.label)));assert.ok(html.includes(escapeHtml(present.note)));assert.ok(html.includes(grant.sourceUrl));}
    const main=home.split('<script id="page-data"')[0];assert.ok(!main.includes(`class="event-row" data-id="${grant.id}"`));
    assert.ok(!main.includes(`/events/${grant.id}/`),'credit must no longer be in the seven-day feed');
    assert.equal((main.match(new RegExp('href="'+grant.sourceUrl+'"','g'))||[]).length,2,'top card and offer must retain the grant');
    assert.ok(detail.includes(`data-credit-state="${present.state}"`));
    assert.ok(main.includes(escapeHtml(creditPresentation(rollout,lang,now).label)));
   }
   const feed=await readFile(join(dir,'dist/feed.xml'),'utf8');assert.ok(feed.includes(escapeHtml(creditPresentation(grant,'en',now).label)));assert.ok(feed.includes('Activated · delivery pending'));
  }
 }finally{await rm(dir,{recursive:true,force:true});}
});
