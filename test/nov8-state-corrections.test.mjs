import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,cp,copyFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {classify,reclassifyEvents,validateEvent} from '../src/evidence.mjs';
import {creditAvailability,creditPresentation,refreshCreditViews,eventStateClass} from '../src/credit-availability.mjs';
import {eventStateLabel,names,locales} from '../src/locales.mjs';
import {priorityDetails} from '../src/priority-details.mjs';
import {offers} from '../src/offers.mjs';
const f=JSON.parse(await readFile(new URL('./fixtures/nov8-state-corrections.json',import.meta.url),'utf8'));
const time=Date.parse,now=time('2026-11-08T10:00:00Z'),result={kind:'usage',state:'information',reason:'reviewed-plan-usage'};

test('the complete pinned Pro plan comparison is usage, with reset claims still guarded',()=>{
 assert.deepEqual(classify(f.pro.fullText,f.pro),result);
 for(const change of [{id:'123'},{author:'OpenAI'},{truncated:true}])assert.notEqual(classify(f.pro.fullText,{...f.pro,...change}).reason,result.reason);
 for(const text of [f.pro.fullText+' ',f.pro.fullText.replace('50X','500X'),f.pro.fullText+'\nMaybe a reset tomorrow.'])assert.notEqual(classify(text,f.pro).reason,result.reason);
 assert.deepEqual(classify('A Codex reset might land tomorrow.',f.pro),{kind:'signal',state:'unconfirmed',reason:'ambiguous'});
 assert.equal(classify(f.pro.fullText+'\n\nWe will reset usage for all users tomorrow.',f.pro).kind,'global');
 const fixed=reclassifyEvents([f.pro])[0];assert.equal(fixed.kind,'usage');assert.equal(fixed.state,'information');assert.equal(fixed.fullText,f.pro.fullText);assert.equal(fixed.contentHash,f.pro.contentHash);assert.equal(fixed.sourceUrl,f.pro.sourceUrl);
 assert.deepEqual(reclassifyEvents([fixed]),[fixed]);validateEvent(fixed);
 assert.throws(()=>validateEvent({...fixed,fullText:fixed.fullText+' Changed.'}));
});

test('date-only expiry has a conservative uncertainty interval and never invents an official instant',()=>{
 for(const [at,state] of [
  ['2026-09-28T18:36:08.452Z','before'],['2026-10-20T23:59:59.999Z','before'],
  ['2026-10-21T00:00:00Z','boundary'],['2026-10-22T00:00:00Z','boundary'],['2026-10-22T23:59:59.999Z','boundary'],
  ['2026-10-23T00:00:00Z','expired'],['2026-11-08T10:00:00Z','expired'],
 ]){
  const terms=creditAvailability(f.credit,time(at));assert.equal(terms.state,state,at);assert.equal(terms.beforeDate,'2026-10-22');assert.equal(terms.timezone,null);assert.equal(terms.endsAt,undefined);assert.equal(terms.resetAt,undefined);
 }
 const before=structuredClone(f.credit);creditPresentation(f.credit,'en',now);assert.deepEqual(f.credit,before);
 assert.equal(classify(f.credit.fullText,f.credit).kind,'banked');assert.equal(classify(f.credit.fullText,f.credit).state,'reported');
 assert.equal(eventStateClass(f.credit,now),'expired');assert.match(eventStateLabel(f.credit,'en',now),/Expired.*historical grant/);
 assert.match(creditPresentation(f.credit,'en',now).note,/Whether you used the credit is unknown/);
});

test('legacy records derive expiry without saved derived metadata; changed or incomplete evidence does not inherit it',()=>{
 assert.equal(creditAvailability({...f.credit},now).state,'expired');
 for(const change of [{fullText:undefined},{fullText:f.credit.fullText.replace('Oct 22','Nov 22')},{contentHash:'0'.repeat(64)},{publishedAt:'2027-09-28T18:36:08.452Z'}]){
  assert.equal(creditAvailability({...f.credit,...change},now).state,'unknown');assert.match(creditPresentation({...f.credit,...change},'en',now).label,/unverified/);
 }
 for(const change of [{id:'123'},{author:'OpenAI'},{sourceUrl:'https://x.com/ClaudeDevs/status/123'},{state:'unconfirmed'},{truncated:true}])assert.equal(creditAvailability({...f.credit,...change},now),null);
 assert.equal(creditAvailability(f.credit,NaN).state,'unknown');
});

test('nine-language summaries and offer cards agree before, during and after the date boundary',()=>{
 for(const lang of Object.keys(names))for(const at of [time('2026-10-20T12:00:00Z'),time('2026-10-22T12:00:00Z'),now]){
  const p=creditPresentation(f.credit,lang,at),summary=priorityDetails({lastReset:null},'claude',[f.credit],lang,at),offer=offers({claude:{name:'Claude',gifts:[],latestGift:f.credit}},lang,at);
  assert.equal(eventStateLabel(f.credit,lang,at),p.label);assert.ok(summary.includes(p.label));assert.ok(offer.includes(p.label));assert.ok(summary.includes(p.note));assert.ok(offer.includes(p.note));
  assert.ok(!p.note.includes('{date}')&&!p.note.includes('undefined'));assert.ok(summary.includes(f.credit.sourceUrl)&&offer.includes(f.credit.sourceUrl));
  assert.equal(offer.includes('An opportunity to reset usage later.'),false);
  assert.equal(eventStateLabel(reclassifyEvents([f.pro])[0],lang,at),locales[lang].information);
 }
});

test('an old open page changes its badge, note and title as the calendar boundary passes',()=>{
 const status={dataset:{creditStatus:f.credit.id},textContent:'',className:'badge reported',classList:{contains:name=>name==='badge'}};
 const note={dataset:{creditNote:f.credit.id},textContent:'',classList:{contains:()=>false}};
 const title={dataset:{creditTitle:f.credit.id,creditTitlePrefix:'Reset credit'},textContent:''};
 const root={querySelector:()=>title,querySelectorAll:selector=>selector==='[data-credit-status]'?[status]:[note]};
 for(const [at,state] of [['2026-10-20T12:00:00Z','before'],['2026-10-22T12:00:00Z','boundary'],['2026-10-23T00:00:00Z','expired']]){
  refreshCreditViews(root,[f.credit],'en',time(at));const p=creditPresentation(f.credit,'en',time(at));assert.equal(status.dataset.creditState,state);assert.equal(note.dataset.creditState,state);assert.equal(status.textContent,p.label);assert.equal(note.textContent,p.note);assert.ok(title.textContent.includes(p.label));
 }
 assert.equal(status.className,'badge expired');
});

test('actual nine-language build corrects Pro detail/feed and all historical credit views without mutating evidence',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'state-corrections-'));
 try{
  for(const part of ['scripts','data','public/assets'])await mkdir(join(dir,part),{recursive:true});
  await cp(new URL('../src/',import.meta.url),join(dir,'src'),{recursive:true});await copyFile(new URL('../scripts/build.mjs',import.meta.url),join(dir,'scripts/build.mjs'));
  for(const file of ['health.json','platforms.json','topic-heat.json','translations.json'])await copyFile(new URL('../data/'+file,import.meta.url),join(dir,'data',file));
  for(const file of ['social.jpg','drummer-poster.webp','drummer-atlas.webp'])await copyFile(new URL('../public/assets/'+file,import.meta.url),join(dir,'public/assets',file));
  const evidence=JSON.stringify([f.pro,f.credit]);await writeFile(join(dir,'data/events.json'),evidence);
  await writeFile(join(dir,'clock.mjs'),`const RealDate=Date;globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:['2026-11-08T10:00:00Z']));}static now(){return RealDate.parse('2026-11-08T10:00:00Z');}};`);
  const run=spawnSync(process.execPath,['--import',pathToFileURL(join(dir,'clock.mjs')).href,join(dir,'scripts/build.mjs')],{encoding:'utf8',timeout:30000});assert.equal(run.status,0,run.stderr);
  assert.equal(await readFile(join(dir,'data/events.json'),'utf8'),evidence);
  const builtEvents=JSON.parse(await readFile(join(dir,'dist/events.json'),'utf8'));assert.equal(builtEvents.find(e=>e.id===f.pro.id).kind,'usage');assert.equal(builtEvents.find(e=>e.id===f.credit.id).state,'reported');
  for(const lang of Object.keys(names)){
   const home=await readFile(join(dir,'dist',lang,'index.html'),'utf8'),credit=await readFile(join(dir,'dist',lang,'events',f.credit.id,'index.html'),'utf8'),pro=await readFile(join(dir,'dist',lang,'events',f.pro.id,'index.html'),'utf8');
   const p=creditPresentation(f.credit,lang,now);assert.ok(home.includes(p.label));assert.ok(home.includes(p.note));assert.ok(credit.includes(p.label));assert.ok(credit.includes(p.note));assert.ok(credit.includes('data-credit-state="expired"'));assert.ok(credit.includes(f.credit.sourceUrl));
   assert.ok(pro.includes('<h1>'+locales[lang].usageKind+'</h1>'));assert.ok(home.includes('data-kind="usage" data-platform-feed="codex"'));
   assert.equal(home.includes('An opportunity to reset usage later.'),false);assert.equal(credit.includes('2026-10-22T'),false);
  }
  const rss=await readFile(join(dir,'dist/feed.xml'),'utf8');assert.ok(rss.includes('Usage update: Information'));assert.ok(rss.includes('Expired · historical grant'));
 }finally{await rm(dir,{recursive:true,force:true});}
});
