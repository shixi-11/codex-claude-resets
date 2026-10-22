import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,copyFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {classify,isRelevant,extractEmbed,reclassifyEvents,validateEvent} from '../src/evidence.mjs';
import {corroborateRelay,shouldCheckCandidate} from '../src/x-relay.mjs';
import {syncPlatformState} from '../src/platform-state.mjs';
import {assertTrackingSync} from '../src/tracking-audit.mjs';
import {announcementTime} from '../src/announcement-time.mjs';

const fixture=JSON.parse(await readFile(new URL('./fixtures/oct22-pro-usage.json',import.meta.url),'utf8'));
const source=extractEmbed(fixture.reply.embed,fixture.reply.embed.url),id=source.id;
const date=id=>new Date(Number((BigInt(id)>>22n)+1288834974657n)).toISOString();
const now='2026-10-22T02:00:00.000Z',day15='2112432076767289678',done='2111566005684289735';
const stored=JSON.parse(await readFile(new URL('../data/events.json',import.meta.url),'utf8'));
const controls=stored.filter(e=>[day15,done,'2102463847714247142'].includes(e.id));
const previous={...stored.find(e=>e.id===id),kind:'signal',state:'unconfirmed',reason:'ambiguous'};

test('complete Pro usage statement and its Dots parent retain verified identity, reply relation and separate times',()=>{
 const parent=extractEmbed(fixture.parent.embed,fixture.parent.embed.url);
 assert.equal(source.text,"Fully included in the Pro plan, doesn't draw on your weekly usage.");
 assert.equal(parent.text,'Dot, Dotter, Dottest');assert.equal(classify(parent.text,parent).kind,'other');
 assert.equal(corroborateRelay(source,fixture.reply.relay).text,source.text);
 assert.equal(corroborateRelay(parent,fixture.parent.relay).text,parent.text);
 assert.equal(fixture.reply.relay.replying_to,source.author);assert.equal(fixture.reply.relay.replying_to_status,parent.id);
 assert.equal(date(id),'2026-10-21T22:09:10.146Z');assert.equal(date(parent.id),'2026-10-21T22:08:22.624Z');
 assert.equal(shouldCheckCandidate({url:source.url,relay:fixture.reply.relay}),true);assert.equal(isRelevant(source.text,source),true);
 assert.equal(announcementTime(source.text,date(id),source),null);
});

test('plan inclusion without weekly consumption is information, retaining original scope and reset history',()=>{
 const expected={kind:'usage',state:'information',reason:'usage-inclusion'};
 for(const text of [source.text,source.text.replace("doesn't",'does not'),source.text.replace("doesn't",'doesn’t')])assert.deepEqual(classify(text,source),expected);
 for(const text of ['Fully included in the Pro plan.','The Pro plan draws on your weekly usage.',"Doesn't draw on your weekly usage."])assert.notEqual(classify(text,source).reason,'usage-inclusion',text);
 assert.equal(classify(source.text,{...source,truncated:true}).state,'unconfirmed');
 assert.equal(classify('"'+source.text+'"',source).state,'unconfirmed');
 const records=[previous,...controls],events=reclassifyEvents(records),event=events.find(e=>e.id===id);
 assert.deepEqual(classify(event.fullText,event),expected);events.forEach(validateEvent);
 for(const key of ['id','author','fullText','contentHash','publishedAt','verifiedAt','sourceUrl'])assert.equal(event[key],previous[key]);
 assert.equal(event.resetAt,undefined);assert.equal(event.eligiblePlans,undefined);assert.deepEqual(reclassifyEvents(events),events);
 const before=syncPlatformState({codex:{},claude:{}},records),after=syncPlatformState({codex:{},claude:{}},events);
 assert.equal(after.codex.latest.id,id);assert.equal(after.codex.latest.kind,'usage');assert.equal(after.codex.latest.state,'information');
 for(const key of ['latestReset','lastReset','latestGift'])assert.equal(after.codex[key]?.id,before.codex[key]?.id);
 assert.deepEqual(after.codex.reset,before.codex.reset);assert.equal(after.codex.latestReset.id,day15);assert.equal(after.codex.lastReset.id,done);assert.equal(after.codex.reset.resetAt,null);
 assertTrackingSync(after,events);
});

test('real timeline and targeted collectors keep one usage record through repeated collection and rule migration',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'pro-weekly-usage-'));
 try{
  for(const part of ['src','scripts','data'])await mkdir(join(dir,part));
  for(const file of ['scripts/collect.mjs','scripts/collect-posts.mjs','scripts/topic-heat-refresh.mjs','src/evidence.mjs','src/tracking-audit.mjs','src/platform-state.mjs','src/announcement-time.mjs','src/x-relay.mjs','src/collection-request.mjs'])await copyFile(new URL('../'+file,import.meta.url),join(dir,file));
  await writeFile(join(dir,'fixture.json'),JSON.stringify(fixture));await writeFile(join(dir,'data/events.json'),JSON.stringify([previous,...controls]));
  await writeFile(join(dir,'data/platforms.json'),JSON.stringify({codex:{},claude:{}}));await writeFile(join(dir,'data/health.json'),JSON.stringify({lastSuccessAt:'2026-10-22T01:00:00Z'}));
  await writeFile(join(dir,'mock.mjs'),`
   import {readFileSync} from 'node:fs';const f=JSON.parse(readFileSync(new URL('./fixture.json',import.meta.url)));
   const RealDate=Date;globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:['${now}']));}static now(){return RealDate.parse('${now}');}};
   globalThis.fetch=async input=>{const u=new URL(input);
    if(u.pathname.includes('/profile/')){const author=u.pathname.split('/')[3];return Response.json({code:200,results:author==='thsottiaux'?[f.reply.relay,f.parent.relay,f.reply.relay]:[{id:'123',url:'https://x.com/'+author+'/status/123',author:{screen_name:author},text:'Hello world'}]});}
    if(u.hostname==='publish.twitter.com')return Response.json(f.reply.embed);
    throw Error('Unexpected request '+input);
   };
  `);
  for(const script of ['collect-posts.mjs','collect.mjs','collect.mjs','collect-posts.mjs']){
   const health=await readFile(join(dir,'data/health.json'),'utf8');
   const r=spawnSync(process.execPath,['--import',pathToFileURL(join(dir,'mock.mjs')).href,join(dir,'scripts',script),...(script==='collect-posts.mjs'?[source.url]:[])],{encoding:'utf8',timeout:10000,env:{...process.env,ENABLE_PAID_X_API:'false',COLLECT_POST_URLS:''}});
   assert.equal(r.status,0,r.stderr);
   const events=JSON.parse(await readFile(join(dir,'data/events.json'),'utf8')),p=JSON.parse(await readFile(join(dir,'data/platforms.json'),'utf8'));
   assert.equal(events.filter(e=>e.id===id).length,1);const e=events.find(e=>e.id===id);
   assert.equal(e.kind,'usage');assert.equal(e.state,'information');assert.equal(e.fullText,source.text);assert.equal(e.contentHash,previous.contentHash);assert.equal(e.publishedAt,date(id));
   assert.equal(e.resetAt,undefined);assert.equal(e.eligiblePlans,undefined);assert.ok(!events.some(e=>e.id===fixture.parent.relay.id));
   events.forEach(validateEvent);assertTrackingSync(p,events);assert.equal(p.codex.latestReset.id,day15);assert.equal(p.codex.lastReset.id,done);assert.equal(p.codex.reset.state,'announced');assert.equal(p.codex.reset.resetAt,null);
   if(script==='collect-posts.mjs')assert.equal(await readFile(join(dir,'data/health.json'),'utf8'),health);
  }
 }finally{if(dirname(resolve(dir))===resolve(tmpdir()))await rm(dir,{recursive:true,force:true});}
});
