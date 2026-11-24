import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,cp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {classify,extractEmbed,reclassifyEvents,validateEvent,manualResetGrant} from '../src/evidence.mjs';
import {corroborateRelay} from '../src/x-relay.mjs';
import {syncPlatformState} from '../src/platform-state.mjs';
import {creditAvailability,creditPresentation,refreshCreditViews,eventStateClass} from '../src/credit-availability.mjs';
import {offers} from '../src/offers.mjs';
import {escapeHtml} from '../src/shared.mjs';
import {priorityDetails} from '../src/priority-details.mjs';
import {names,eventStateLabel} from '../src/locales.mjs';
const f=JSON.parse(await readFile(new URL('./fixtures/nov11-manual-reset.json',import.meta.url),'utf8'));
const now=Date.parse('2026-11-11T06:00:00Z'),expected={kind:'banked',state:'reported',reason:'reviewed-manual-grant'};
const fixed=reclassifyEvents([f.original])[0];

test('official X embed and syndication corroborate identity, timestamp and manual grant scope',()=>{
 const source=extractEmbed(f.embed,f.sourceUrl);assert.equal(source.truncated,true);
 const full=corroborateRelay(source,f.relay);assert.equal(full.text,f.original.fullText);assert.equal(full.truncated,false);
 assert.equal(createHash('sha256').update(full.text).digest('hex'),f.original.contentHash);
 assert.equal(f.syndication.id_str,f.original.id);assert.equal(f.syndication.user.screen_name,f.original.author);
 assert.equal(f.syndication.created_at.slice(0,19),f.original.publishedAt.slice(0,19));
 assert.ok(f.syndication.text.includes('Use it anytime before December 10 at 2:00PM PT.'));
 assert.equal(new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false,timeZoneName:'shortOffset'}).format(new Date(manualResetGrant.endsAt)),'12/10/2026, 14:00 GMT-8');
 assert.deepEqual(classify(full.text,full),expected);validateEvent(fixed);
});

test('only the complete reviewed grant is promoted; changed and incomplete sources do not inherit terms',()=>{
 for(const change of [{id:'123'},{author:'OpenAI'},{truncated:true}])assert.notEqual(classify(f.original.fullText,{...f.original,...change}).reason,expected.reason);
 for(const fullText of [f.original.fullText+' Changed.',f.original.fullText.replace('December 10','December 20'),f.original.fullText.replace("We've given","We have not given")]){
  assert.notEqual(classify(fullText,f.original).reason,expected.reason);assert.equal(creditAvailability({...fixed,fullText},now).state,'unknown');
  assert.throws(()=>validateEvent({...fixed,fullText}));
 }
 assert.equal(creditAvailability({...fixed,contentHash:'0'.repeat(64)},now).state,'unknown');
 assert.equal(creditAvailability({...fixed,publishedAt:'2027-11-10T21:59:58.185Z'},now).state,'unknown');
 assert.equal(creditAvailability({...fixed,truncated:true},now),null);
 assert.deepEqual(reclassifyEvents([fixed]),[fixed]);
 for(const key of ['fullText','contentHash','publishedAt','verifiedAt','sourceUrl'])assert.equal(fixed[key],f.original[key]);
});

test('redemption expiry is exact, refreshes open views, and never becomes a reset instant',()=>{
 for(const [at,state] of [['2026-11-11T06:00:00Z','before'],['2026-12-10T21:59:59.999Z','before'],['2026-12-10T22:00:00Z','expired'],['2026-12-11T00:00:00Z','expired']]){
  const terms=creditAvailability(fixed,Date.parse(at));assert.equal(terms.state,state);assert.equal(terms.endsAt,manualResetGrant.endsAt);assert.equal(terms.resetAt,undefined);
 }
 const status={dataset:{creditStatus:fixed.id},textContent:'',className:'badge reported',classList:{contains:()=>true}},note={dataset:{creditNote:fixed.id},textContent:'',classList:{contains:()=>false}};
 const root={querySelector:()=>null,querySelectorAll:selector=>selector==='[data-credit-status]'?[status]:[note]};
 refreshCreditViews(root,[fixed],'en',Date.parse('2026-12-10T21:59:59Z'));assert.equal(status.dataset.creditState,'before');
 refreshCreditViews(root,[fixed],'en',Date.parse(manualResetGrant.endsAt));assert.equal(status.dataset.creditState,'expired');assert.equal(status.className,'badge expired');assert.match(note.textContent,/period has passed/);
 assert.equal(fixed.state,'reported');assert.equal(fixed.resetAt,undefined);
});

test('new credit replaces expired offer in every language without changing global reset history',async()=>{
 const history=JSON.parse(await readFile(new URL('./fixtures/nov11-manual-reset-history.json',import.meta.url),'utf8'));
 assert.equal(Date.parse(history.asOf),now);assert.ok(history.events.every(e=>Date.parse(e.publishedAt)<now));
 const stored=[f.original,...history.events];
 const before=syncPlatformState({claude:{gifts:[],name:'Claude'},codex:{gifts:[],name:'Codex'}},reclassifyEvents(stored).map(e=>e.id===f.original.id?f.original:e),now);
 const after=syncPlatformState(structuredClone(before),reclassifyEvents(stored),now);
 assert.equal(before.claude.latestGift.id,'2104641323198472430');assert.equal(creditAvailability(before.claude.latestGift,now).state,'expired');
 assert.equal(after.claude.latestGift.id,fixed.id);assert.equal(after.claude.latest.id,fixed.id);
 assert.ok(after.claude.lastReset);assert.ok(after.codex.lastReset);assert.ok(after.codex.latestReset);
 for(const key of ['lastReset','latestReset','reset'])assert.deepEqual(after.claude[key],before.claude[key]);
 assert.deepEqual(after.codex,before.codex);
 for(const lang of Object.keys(names))for(const at of [now,Date.parse(manualResetGrant.endsAt)]){
  const p=creditPresentation(fixed,lang,at),offer=offers({claude:after.claude},lang,at),summary=priorityDetails(after.claude,'claude',[fixed],lang,at);
  assert.equal(eventStateLabel(fixed,lang,at),p.label);assert.ok(offer.includes(p.label));assert.ok(summary.includes(p.label));assert.ok(offer.includes(escapeHtml(p.note)));assert.ok(summary.includes(escapeHtml(p.note)));
  assert.ok(offer.includes(f.sourceUrl));assert.ok(!offer.includes('2104641323198472430'));assert.ok(!p.note.includes('{date}'));
 }
});

test('repeated targeted and timeline collectors preserve the manual grant and truthful coverage',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'manual-grant-'));
 try{
  for(const part of ['src','scripts'])await cp(new URL('../'+part+'/',import.meta.url),join(dir,part),{recursive:true});await mkdir(join(dir,'data'));
  await writeFile(join(dir,'fixture.json'),JSON.stringify(f));await writeFile(join(dir,'data/events.json'),JSON.stringify([f.original]));await writeFile(join(dir,'data/platforms.json'),JSON.stringify({codex:{},claude:{}}));await writeFile(join(dir,'data/health.json'),JSON.stringify({lastSuccessAt:'2026-11-10T00:00:00Z'}));
  await writeFile(join(dir,'mock.mjs'),`import {readFileSync} from 'node:fs';const f=JSON.parse(readFileSync(new URL('./fixture.json',import.meta.url)));globalThis.fetch=async input=>{const u=new URL(input);if(u.hostname==='publish.twitter.com')return Response.json(f.embed);if(u.pathname.includes('/profile/'))return Response.json({code:200,results:u.pathname.includes('ClaudeDevs')?[f.relay]:[]});if(u.pathname.endsWith('/'+f.original.id))return Response.json({code:200,tweet:f.relay});throw Error('Unexpected request '+input);};`);
  for(const script of ['collect-posts.mjs','collect.mjs','collect.mjs','collect-posts.mjs']){
   const health=await readFile(join(dir,'data/health.json'),'utf8');const r=spawnSync(process.execPath,['--import',pathToFileURL(join(dir,'mock.mjs')).href,join(dir,'scripts',script),...(script==='collect-posts.mjs'?[f.sourceUrl]:[])],{encoding:'utf8',timeout:10000,env:{...process.env,ENABLE_PAID_X_API:'false',COLLECT_POST_URLS:''}});assert.equal(r.status,0,r.stderr);
   const events=JSON.parse(await readFile(join(dir,'data/events.json'),'utf8')),p=JSON.parse(await readFile(join(dir,'data/platforms.json'),'utf8'));assert.equal(events.length,1);assert.equal(events[0].reason,expected.reason);assert.equal(p.claude.latestGift.id,fixed.id);assert.equal(p.claude.lastReset,null);assert.equal(p.claude.reset.resetAt,null);
   if(script==='collect-posts.mjs')assert.equal(await readFile(join(dir,'data/health.json'),'utf8'),health);
  }
 }finally{await rm(dir,{recursive:true,force:true});}
});
