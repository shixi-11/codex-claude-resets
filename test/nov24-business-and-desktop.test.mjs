import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,cp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {classify,extractEmbed,reclassifyEvents,validateEvent,businessBankedReset,manualResetGrant,RULES_VERSION} from '../src/evidence.mjs';
import {corroborateRelay} from '../src/x-relay.mjs';
import {creditAvailability,creditPresentation} from '../src/credit-availability.mjs';
import {syncPlatformState} from '../src/platform-state.mjs';
import {assertTrackingSync} from '../src/tracking-audit.mjs';
import {priorityDetails} from '../src/priority-details.mjs';
import {offers} from '../src/offers.mjs';
import {names,eventStateLabel} from '../src/locales.mjs';
import {escapeHtml} from '../src/shared.mjs';
const fixture=JSON.parse(await readFile(new URL('./fixtures/nov24-business-and-desktop.json',import.meta.url),'utf8'));
const [bankSource,desktopSource]=fixture.posts,bank=reclassifyEvents([bankSource.original])[0],desktop=reclassifyEvents([desktopSource.original])[0];
const history=JSON.parse(await readFile(new URL('./fixtures/nov11-manual-reset-history.json',import.meta.url),'utf8'));
const manual=JSON.parse(await readFile(new URL('./fixtures/nov11-manual-reset.json',import.meta.url),'utf8'));
const activation=JSON.parse(await readFile(new URL('./fixtures/nov12-banked-activation.json',import.meta.url),'utf8'));
const recovered=JSON.parse(await readFile(new URL('./fixtures/nov2-banked-event.json',import.meta.url),'utf8'));
// These assertions describe the November 24 announcement sequence, not the
// latest production feed. Future official posts must not change this history.
const originals=[...fixture.posts.map(p=>p.original),...reclassifyEvents([manual.original,activation.original,recovered,...history.events])].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)),events=reclassifyEvents(originals);
const at='2026-11-24T23:30:00Z',now=Date.parse(at);
const before=syncPlatformState({codex:{name:'Codex',gifts:[]},claude:{name:'Claude',gifts:[]}},originals.map(e=>({...e,rulesVersion:RULES_VERSION})),now);
const after=syncPlatformState(structuredClone(before),events,now);

test('both complete official sources corroborate identity, text, hash and publication time',()=>{
 for(const f of fixture.posts){const source=extractEmbed(f.embed,f.original.sourceUrl),full=corroborateRelay(source,f.relay);
  assert.equal(source.truncated,false);assert.equal(source.text,f.original.fullText);assert.ok(full.text.startsWith(source.text));
  assert.equal(createHash('sha256').update(source.text).digest('hex'),f.original.contentHash);
  assert.equal(new Date(Number((BigInt(f.original.id)>>22n)+1288834974657n)).toISOString(),f.original.publishedAt);
 }
 assert.deepEqual(classify(bank.fullText,bank),{kind:'banked',state:'announced',reason:'reviewed-business-bank'});
 assert.deepEqual(classify(desktop.fullText,desktop),{kind:'usage',state:'information',reason:'usage-accounting'});
 for(const e of [bank,desktop]){validateEvent(e);assert.equal(e.resetAt,undefined);for(const k of ['fullText','contentHash','publishedAt','verifiedAt','sourceUrl'])assert.equal(e[k],fixture.posts.find(p=>p.original.id===e.id).original[k]);}
});

test('Business wording announces a banked credit; reviewed scope and Fast terms cannot transfer to changed sources',()=>{
 for(const text of ['To ChatGPT Business teams: we have a banked reset for you.','We have a banked reset for ChatGPT Business teams.']){
  const result=classify(text,{author:'thsottiaux'});assert.equal(result.kind,'banked');assert.equal(result.state,'announced');assert.notEqual(result.reason,'reviewed-business-bank');
 }
 for(const text of ['To ChatGPT Business teams: we have no banked reset for you.','To ChatGPT Business teams: maybe we have a banked reset for you.','They said we have a banked reset for ChatGPT Business teams.'])assert.equal(classify(text,{author:'thsottiaux'}).state,'unconfirmed',text);
 for(const change of [{id:'123'},{author:'ClaudeDevs'},{truncated:true},{fullText:bank.fullText.replace('Business','Plus')},{fullText:bank.fullText.replace('Dec 31','Jan 5')}]){
  const e={...bank,...change};assert.notEqual(classify(e.fullText,e).reason,'reviewed-business-bank');assert.equal(creditPresentation(e,'en',now),null);
 }
 for(const change of [{contentHash:'0'.repeat(64)},{publishedAt:'2026-11-25T00:00:00Z'},{sourceUrl:'https://x.com/OpenAI/status/'+bank.id}]){assert.equal(creditPresentation({...bank,...change}),null);assert.throws(()=>validateEvent({...bank,...change}));}
 assert.equal(classify('We have a banked reset for ChatGPT Business teams. It has now landed.',{author:'thsottiaux'}).state,'reported');
 assert.equal(bank.eligiblePlans,undefined);assert.equal(bank.resetAt,undefined);
});

test('usage accounting wording stays informational and cannot swallow genuine or uncertain reset claims',()=>{
 for(const text of ['API calls count toward your usage limits.','Requests count towards your existing usage limits.','Building an app counts against the existing usage limit.'])assert.deepEqual(classify(text,{author:'ClaudeDevs'}),{kind:'usage',state:'information',reason:'usage-accounting'});
 assert.equal(classify('Package the app and set up an API key.',{author:'ClaudeDevs'}).kind,'other');
 for(const [text,kind,state] of [
  ['We have reset usage for all paid Claude users. API calls count toward your usage limits.','global','reported'],
  ['We will reset usage for all Claude users tomorrow. API calls count toward your usage limits.','global','announced'],
  ['We will give a banked reset. API calls count toward your usage limits.','banked','announced'],
  ['Maybe a Claude reset tomorrow. API calls count toward your usage limits.','signal','unconfirmed'],
  ['They said API calls count toward your usage limits.','signal','unconfirmed'],
 ]){const result=classify(text,{author:'ClaudeDevs'});assert.equal(result.kind,kind,text);assert.equal(result.state,state,text);}
 assert.equal(classify(desktop.fullText,{...desktop,truncated:true}).state,'unconfirmed');
});

test('nine-language Business notes separate the Fast period from the credit and preserve real reset history',()=>{
 for(const time of [now,Date.parse('2026-12-31T23:59:59Z'),Date.parse('2027-01-02T00:00:00Z')])for(const lang of Object.keys(names)){
  const p=creditPresentation(bank,lang,time);assert.equal(p.state,'announced');assert.equal(p.endsAt,undefined);assert.equal(p.resetAt,undefined);assert.equal(p.beforeDate,undefined);assert.ok(p.label.includes('ChatGPT Business'));assert.ok(p.note.includes('Fast'));assert.ok(p.note.includes('31'));
  for(const html of [offers({codex:after.codex},lang,time),priorityDetails(after.codex,'codex',events,lang,time)]){assert.ok(html.includes(bank.sourceUrl));assert.ok(html.includes(escapeHtml(p.label)));assert.ok(html.includes(escapeHtml(p.note)));assert.ok(!html.includes('data-credit-state="expired"'));}
  assert.equal(eventStateLabel(bank,lang,time),p.label);
 }
 assert.match(creditPresentation(bank,'en',now).note,/Delivery to individual accounts is unconfirmed/);assert.match(creditPresentation(bank,'en',now).note,/Separate Fast offer/);assert.match(creditPresentation(bank,'en',now).note,/No reset-credit deadline/);
 assert.equal(after.codex.latestGift.id,bank.id);assert.equal(after.claude.latest.id,desktop.id);assert.equal(after.claude.latestGift.id,manualResetGrant.id);
 for(const key of ['codex','claude'])for(const field of ['reset','latestReset','lastReset'])assert.deepEqual(after[key][field],before[key][field]);
 for(const e of events.filter(e=>![bank.id,desktop.id].includes(e.id))){const old=originals.find(o=>o.id===e.id);const {rulesVersion,...a}=e,{rulesVersion:oldVersion,...b}=old;assert.deepEqual(a,b,e.id);}
 assert.deepEqual(reclassifyEvents(events),events);assertTrackingSync(after,events);
});

test('real collector and targeted entry points migrate both saved records without masking empty coverage or failed verification',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'business-desktop-collector-'));
 try{
  for(const part of ['src','scripts'])await cp(new URL('../'+part+'/',import.meta.url),join(dir,part),{recursive:true});await mkdir(join(dir,'data'));
  await writeFile(join(dir,'fixture.json'),JSON.stringify(fixture));await writeFile(join(dir,'data/events.json'),JSON.stringify(originals));await writeFile(join(dir,'data/platforms.json'),JSON.stringify(before));
  const previous='2026-11-24T23:06:38.928Z';let lastSuccess=previous,bankVerified=bankSource.original.verifiedAt,desktopVerified=desktopSource.original.verifiedAt;
  await writeFile(join(dir,'data/health.json'),JSON.stringify({lastSuccessAt:previous,platforms:{codex:{lastSuccessAt:previous},claude:{lastSuccessAt:previous}}}));
  await writeFile(join(dir,'mock.mjs'),`
   import {readFileSync} from 'node:fs';const f=JSON.parse(readFileSync(new URL('./fixture.json',import.meta.url)));
   const RealDate=Date;globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[process.env.TEST_NOW]));}static now(){return RealDate.parse(process.env.TEST_NOW);}};
   globalThis.fetch=async input=>{const u=new URL(input);
    if(u.pathname.includes('/profile/')){const h=u.pathname.split('/')[3],author=h==='id:1953337039510003712'?'thsottiaux':h;const p=f.posts.find(p=>p.original.author===author);
     return Response.json({code:200,results:p?(process.env.TEST_MODE==='empty'?[]:[p.relay]):[{id:'123',url:'https://x.com/'+author+'/status/123',author:{screen_name:author},text:'Hello world'}]});}
    if(u.hostname==='publish.twitter.com'){const p=f.posts.find(p=>p.original.sourceUrl===u.searchParams.get('url'));if(process.env.TEST_MODE==='primary-fail'&&p.original.author==='thsottiaux')return new Response('',{status:403});return Response.json(p.embed);}
    return new Response('No discovery links');
   };
  `);
  for(const [i,mode] of ['empty','ok','ok','empty','primary-fail'].entries()){
   const time=new Date(now+i*60000).toISOString(),r=spawnSync(process.execPath,['--import',pathToFileURL(join(dir,'mock.mjs')).href,join(dir,'scripts/collect.mjs')],{encoding:'utf8',timeout:15000,env:{...process.env,TEST_MODE:mode,TEST_NOW:time,ENABLE_PAID_X_API:'false',COLLECT_POST_URLS:''}});assert.equal(r.status,0,r.stderr);
   const h=JSON.parse(await readFile(join(dir,'data/health.json'),'utf8')),es=JSON.parse(await readFile(join(dir,'data/events.json'),'utf8')),p=JSON.parse(await readFile(join(dir,'data/platforms.json'),'utf8'));
   if(mode==='ok'){lastSuccess=time;bankVerified=time;}if(mode!=='empty')desktopVerified=time;assert.equal(es.find(e=>e.id===bank.id).verifiedAt,bankVerified);assert.equal(es.find(e=>e.id===desktop.id).verifiedAt,desktopVerified);assert.equal(h.lastSuccessAt,lastSuccess);assert.equal(h.platforms.codex.lastSuccessAt,lastSuccess);assert.equal(h.status,mode==='ok'?'ok':'degraded');
   assert.equal(h.platforms.claude.status,mode==='empty'?'degraded':'ok');assert.equal(es.length,originals.length);assert.equal(es.find(e=>e.id===bank.id).reason,bank.reason);assert.equal(es.find(e=>e.id===desktop.id).reason,desktop.reason);
   for(const f of fixture.posts)for(const k of ['fullText','sourceUrl','publishedAt','contentHash'])assert.equal(es.find(e=>e.id===f.original.id)[k],f.original[k]);
   assert.equal(p.codex.latestGift.id,bank.id);assert.equal(p.claude.latestGift.id,manualResetGrant.id);for(const key of ['codex','claude'])assert.deepEqual(p[key].reset,before[key].reset);assertTrackingSync(p,es);
  }
  const health=await readFile(join(dir,'data/health.json'),'utf8');
  const r=spawnSync(process.execPath,['--import',pathToFileURL(join(dir,'mock.mjs')).href,join(dir,'scripts/collect-posts.mjs'),bank.sourceUrl,desktop.sourceUrl],{encoding:'utf8',timeout:10000,env:{...process.env,TEST_MODE:'ok',TEST_NOW:at,ENABLE_PAID_X_API:'false',COLLECT_POST_URLS:''}});assert.equal(r.status,0,r.stderr);assert.equal(await readFile(join(dir,'data/health.json'),'utf8'),health);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('actual nine-language builds feature the Business credit, retain the Claude grant and degraded health, and invent no reset deadline',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'business-desktop-build-'));
 try{
  for(const part of ['src','scripts','public','data'])await cp(new URL('../'+part+'/',import.meta.url),join(dir,part),{recursive:true});
  const input=JSON.stringify(originals);await writeFile(join(dir,'data/events.json'),input);await writeFile(join(dir,'data/platforms.json'),JSON.stringify(before));
  const health={status:'degraded',lastAttemptAt:at,lastSuccessAt:'2026-11-24T20:00:00Z',platforms:{codex:{status:'degraded',lastSuccessAt:'2026-11-24T20:00:00Z'},claude:{status:'ok',lastSuccessAt:at}}};
  const savedHealth=JSON.stringify(health);await writeFile(join(dir,'data/health.json'),savedHealth);
  for(const time of [at,'2026-12-31T23:59:59Z','2027-01-02T00:00:00Z']){
   await writeFile(join(dir,'clock.mjs'),`const RealDate=Date;globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[${JSON.stringify(time)}]));}static now(){return RealDate.parse(${JSON.stringify(time)});}};`);
   const r=spawnSync(process.execPath,['--import',pathToFileURL(join(dir,'clock.mjs')).href,join(dir,'scripts/build.mjs')],{encoding:'utf8',timeout:30000});assert.equal(r.status,0,r.stderr);
   assert.equal(await readFile(join(dir,'data/events.json'),'utf8'),input);assert.equal(await readFile(join(dir,'data/health.json'),'utf8'),savedHealth);
   const h=JSON.parse(await readFile(join(dir,'dist/health.json'),'utf8'));assert.equal(h.status,'degraded');assert.equal(h.lastSuccessAt,health.lastSuccessAt);
   const p=JSON.parse(await readFile(join(dir,'dist/platforms.json'),'utf8'));assert.equal(p.codex.latestGift.id,bank.id);assert.equal(p.claude.latestGift.id,manualResetGrant.id);assert.equal(p.claude.latest.id,desktop.id);
   for(const key of ['codex','claude'])assert.deepEqual(p[key].reset,before[key].reset);
   for(const lang of Object.keys(names)){
    const home=await readFile(join(dir,'dist',lang,'index.html'),'utf8'),detail=await readFile(join(dir,'dist',lang,'events',bank.id,'index.html'),'utf8');
    const codex=home.match(/<article class="platform-card" data-platform="codex"[\s\S]*?<\/article>/)[0],claude=home.match(/<article class="platform-card" data-platform="claude"[\s\S]*?<\/article>/)[0];
    const presentation=creditPresentation(bank,lang,Date.parse(time));for(const html of [codex,detail]){assert.ok(html.includes(bank.sourceUrl));assert.ok(html.includes(escapeHtml(presentation.label)));assert.ok(html.includes(escapeHtml(presentation.note)));assert.ok(!html.includes('data-credit-state="expired"'));assert.ok(!html.includes('datetime="2026-12-31'));}
    assert.ok(claude.includes(manualResetGrant.sourceUrl));assert.ok(!claude.includes(desktop.sourceUrl));
    const published=JSON.parse(home.match(/<script id="page-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);assert.equal(published.events.find(e=>e.id===desktop.id).kind,'usage');assert.equal(published.events.find(e=>e.id===desktop.id).state,'information');
   }
  }
 }finally{await rm(dir,{recursive:true,force:true});}
});
