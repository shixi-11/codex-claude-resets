import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,copyFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {classify,extractEmbed,reclassifyEvents,validateEvent} from '../src/evidence.mjs';
import {syncPlatformState} from '../src/platform-state.mjs';
import {trackingAudit} from '../src/tracking-audit.mjs';
const fixture=JSON.parse(await readFile(new URL('./fixtures/nov8-product-commentary.json',import.meta.url),'utf8'));
const source=extractEmbed(fixture.embed,fixture.embed.url),hash=text=>createHash('sha256').update(text).digest('hex');
const stored=JSON.parse(await readFile(new URL('../data/events.json',import.meta.url),'utf8'));
const legacy='We hesitated to embed  into the codex app to make sense of the resets, but decided against it.';
const testNow='2026-11-08T09:00:00.000Z';
const old={...stored.find(e=>e.id===source.id),fullText:legacy,excerpt:legacy.replace(/\s+/g,' '),contentHash:hash(legacy),kind:'signal',state:'unconfirmed',reason:'ambiguous',verifiedAt:'2026-11-08T08:16:18.844Z'};
const expected={kind:'commentary',state:'information',reason:'reviewed-product-commentary'};
const corrected={...old,...expected,fullText:source.text,excerpt:source.text,contentHash:hash(source.text)};

test('reviewed official reply preserves the checked x.com label and its source identity',()=>{
 assert.equal(source.text,fixture.visibleText);assert.equal(source.truncated,false);
 assert.equal(source.id,fixture.detail.id);assert.equal(source.url,fixture.detail.url);
 assert.equal(source.author,fixture.detail.author.screen_name);
 assert.equal(fixture.detail.replying_to,'ForwardEditor');
 assert.equal(fixture.parentUrl,'https://x.com/ForwardEditor/status/'+fixture.detail.replying_to_status);
 const facet=fixture.detail.raw_text.facets.find(f=>f.type==='url');
 assert.equal(facet.original,'https://t.co/TnRNoyTR5X');assert.equal(facet.replacement,'https://x.com');assert.equal(facet.display,'x.com');
 assert.ok(fixture.embed.html.includes('href="'+facet.original+'"'));
 assert.deepEqual(classify(source.text,source),expected);validateEvent(corrected);
});

test('commentary and link restoration are pinned to exact identity and complete original content',()=>{
 for(const change of [{id:'123'},{author:'OpenAI'},{truncated:true}])assert.notEqual(classify(source.text,{...source,...change}).reason,expected.reason);
 for(const text of [source.text+' We will reset usage for all users tomorrow.',source.text.replace('x.com','example.com'),source.text.replace('decided against it.','might reset tomorrow.'),source.text+' ',old.fullText])assert.notEqual(classify(text,source).reason,expected.reason);
 const changed=structuredClone(fixture.embed);changed.url=changed.url.replace(source.id,'123');
 assert.ok(!extractEmbed(changed,changed.url).text.includes('x.com'));
 for(const html of [fixture.embed.html.replace('TnRNoyTR5X','different'),fixture.embed.html.replace('decided against it.','might reset tomorrow.'),fixture.embed.html.replace('decided against it.','decided…')]){
  const result=extractEmbed({...fixture.embed,html},fixture.embed.url);assert.notEqual(classify(result.text,result).reason,expected.reason);
 }
 for(const change of [{fullText:source.text+' Changed.'},{author:'OpenAI',sourceUrl:source.url.replace('thsottiaux','OpenAI')},{state:'unconfirmed'},{kind:'signal'},{truncated:true}])assert.throws(()=>validateEvent({...corrected,...change}));
 assert.deepEqual(classify('A Codex reset might land tomorrow.',source),{kind:'signal',state:'unconfirmed',reason:'ambiguous'});
});

test('complete corrected evidence is retained as commentary and repeated reclassification is stable',()=>{
 const once=reclassifyEvents([corrected]);assert.equal(once.length,1);assert.deepEqual(once[0].fullText,source.text);assert.deepEqual(once[0].sourceUrl,source.url);
 assert.deepEqual(reclassifyEvents(once),once);assert.equal(once[0].state,'information');
 assert.equal(reclassifyEvents([old])[0].state,'unconfirmed'); // Never clear the old wording without a fresh exact source.
});

test('both collectors repair the stored wording, preserve reset summaries and retain other review alerts',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'product-commentary-'));
 try{
  for(const part of ['src','scripts','data'])await mkdir(join(dir,part));
  for(const file of ['scripts/collect.mjs','scripts/collect-posts.mjs','scripts/topic-heat-refresh.mjs','src/evidence.mjs','src/tracking-audit.mjs','src/platform-state.mjs','src/announcement-time.mjs','src/x-relay.mjs','src/collection-request.mjs'])await copyFile(new URL('../'+file,import.meta.url),join(dir,file));
  const controls=stored.filter(e=>['2117035794678546764','2115330127886463244','2104641323198472430'].includes(e.id));
  const text='A Codex reset might land tomorrow.',genuine={...old,id:'2119308687676432673',sourceUrl:'https://x.com/thsottiaux/status/2119308687676432673',fullText:text,excerpt:text,contentHash:hash(text)};
  const initial=[old,genuine,...controls],before=syncPlatformState({codex:{},claude:{}},initial);
  await writeFile(join(dir,'fixture.json'),JSON.stringify(fixture));await writeFile(join(dir,'data/events.json'),JSON.stringify(initial));
  await writeFile(join(dir,'data/platforms.json'),JSON.stringify(before));
  await writeFile(join(dir,'data/health.json'),JSON.stringify({lastSuccessAt:testNow}));
  await writeFile(join(dir,'mock.mjs'),`
   import {readFileSync} from 'node:fs';const f=JSON.parse(readFileSync(new URL('./fixture.json',import.meta.url)));
   const RealDate=Date;globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:['${testNow}']));}static now(){return RealDate.parse('${testNow}');}};
   globalThis.fetch=async input=>{const u=new URL(input);
    if(u.pathname.includes('/profile/')){const author=u.pathname.split('/')[3];return Response.json({code:200,results:author==='thsottiaux'?[f.detail]:[{id:'123',url:'https://x.com/'+author+'/status/123',author:{screen_name:author},text:'Hello world'}]});}
    if(u.hostname==='publish.twitter.com')return Response.json(f.embed);
    throw Error('Unexpected request '+input);
   };
  `);
  for(const script of ['collect-posts.mjs','collect.mjs','collect.mjs','collect-posts.mjs']){
   const healthBefore=await readFile(join(dir,'data/health.json'),'utf8');
   const r=spawnSync(process.execPath,['--import',pathToFileURL(join(dir,'mock.mjs')).href,join(dir,'scripts',script),...(script==='collect-posts.mjs'?[source.url]:[])],{encoding:'utf8',timeout:10000,env:{...process.env,ENABLE_PAID_X_API:'false',COLLECT_POST_URLS:''}});
   assert.equal(r.status,0,r.stderr);
   const events=JSON.parse(await readFile(join(dir,'data/events.json'),'utf8')),platforms=JSON.parse(await readFile(join(dir,'data/platforms.json'),'utf8'));
   const event=events.find(e=>e.id===source.id);assert.equal(events.filter(e=>e.id===source.id).length,1);assert.equal(event.fullText,source.text);assert.equal(event.excerpt,source.text);assert.equal(event.sourceUrl,source.url);assert.equal(event.contentHash,hash(source.text));
   assert.deepEqual({kind:event.kind,state:event.state,reason:event.reason},expected);
   for(const id of ['codex','claude'])for(const key of ['latestReset','latestGift','lastReset'])assert.equal(platforms[id][key]?.id,before[id][key]?.id);
   assert.deepEqual(platforms.codex.reset,before.codex.reset);
   const now=Date.parse(testNow),at=testNow,audit=trackingAudit({platforms,events,health:{lastSuccessAt:at,platforms:{codex:{status:'ok',lastSuccessAt:at},claude:{status:'ok',lastSuccessAt:at}}},previous:{checkedAt:at,openKeys:['review:'+old.id+':'+old.contentHash]},now});
   assert.ok(!audit.queue.some(e=>e.id===source.id));assert.ok(audit.queue.some(e=>e.id===genuine.id));assert.ok(audit.newIssues.some(e=>e.key.startsWith('review:'+genuine.id+':')));
   if(script==='collect-posts.mjs')assert.equal(await readFile(join(dir,'data/health.json'),'utf8'),healthBefore);
  }
 }finally{if(dirname(resolve(dir))===resolve(tmpdir()))await rm(dir,{recursive:true,force:true});}
});
