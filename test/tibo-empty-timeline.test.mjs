import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,cp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {readAuthorTimeline,TIBO_ID,OPENAI_ID} from '../src/x-relay.mjs';
import {reclassifyEvents} from '../src/evidence.mjs';
import {syncPlatformState} from '../src/platform-state.mjs';
const own={id:'123',url:'https://x.com/thsottiaux/status/123',author:{id:TIBO_ID,screen_name:'thsottiaux',protected:false},text:'Hello world'};
const other={id:'456',url:'https://x.com/OpenAI/status/456',author:{id:OPENAI_ID,screen_name:'OpenAI'},text:'Hello world'};
const payload=(rows,headers)=>Response.json({code:200,results:rows},{headers});

test('valid Tibo handle responses with no verified same-author candidates fall back to the pinned ID',async()=>{
 for(const rows of [[],[other],[{...own,id:'456'}],[{...own,author:{...own.author,screen_name:'OpenAI'}}],[{...own,author:{...own.author,protected:true}}]]){
  const calls=[],waits=[];let clock=0;
  const r=await readAuthorTimeline('thsottiaux',{now:()=>clock,sleep:async ms=>{waits.push(ms);clock+=ms;},fetcher:async url=>{calls.push(url);clock+=10;return calls.length===1?payload(rows):payload([{thread:[other,own]}]);}});
  assert.equal(calls.length,2);assert.ok(calls[0].includes('/thsottiaux/'));assert.ok(calls[1].includes('/id:'+TIBO_ID+'/'));
  assert.deepEqual(r.posts.map(p=>p.url),[own.url]);assert.deepEqual(waits,[500]);assert.ok(clock<18000);
  assert.deepEqual(r.attempts.map(a=>({status:a.status,ok:a.ok})),[{status:200,ok:false},{status:200,ok:true}]);
  assert.equal(r.attempts[0].error,'No matching author posts returned');assert.equal(r.url,calls[1]);
 }
});

test('empty-handle recovery cannot accept ID identity failures or claim coverage from quotes',async()=>{
 for(const rows of [[],[{...other,quote:own}],[{...own,author:{...own.author,id:'9'}}],[{...own,author:{...own.author,screen_name:'OpenAI'}}],[{...own,author:{...own.author,protected:true}}],[own,{...other,author:{...other.author,id:TIBO_ID}}]]){
  const calls=[];await assert.rejects(readAuthorTimeline('thsottiaux',{fetcher:async url=>{calls.push(url);return payload(calls.length===1?[]:rows);},sleep:async()=>{}}),error=>{assert.equal(error.timelineAttempts.length,2);assert.ok(error.timelineAttempts.every(a=>!a.ok));return true;});
  assert.equal(calls.length,2);assert.ok(calls[1].includes('/id:'+TIBO_ID+'/'));
 }
});

test('empty Tibo handle fallback obeys unchanged deadline, three-attempt limit and Retry-After',async()=>{
 for(const header of ['60','invalid']){
  let n=0;await assert.rejects(readAuthorTimeline('thsottiaux',{fetcher:async()=>{n++;return payload([],{'retry-after':header});},sleep:async()=>assert.fail('must respect Retry-After')}));assert.equal(n,1);
 }
 let n=0,clock=0;
 await assert.rejects(readAuthorTimeline('thsottiaux',{budgetMs:500,now:()=>clock,fetcher:async()=>{n++;return payload([]);},sleep:async ms=>{clock+=ms;}}));assert.equal(n,1);assert.equal(clock,0);
 n=0;clock=0;await assert.rejects(readAuthorTimeline('thsottiaux',{budgetMs:600,now:()=>clock,fetcher:async()=>{n++;clock+=10;return n===1?payload([]):new Response('',{status:404});},sleep:async ms=>{clock+=ms;}}));assert.equal(n,2);assert.ok(clock<600);
 n=0;const calls=[];await assert.rejects(readAuthorTimeline('thsottiaux',{fetcher:async url=>{calls.push(url);return ++n===1?payload([]):new Response('',{status:404});},sleep:async()=>{}}));assert.equal(n,3);assert.ok(calls.slice(1).every(u=>u.includes('/id:'+TIBO_ID+'/')));
 n=0;clock=0;await assert.rejects(readAuthorTimeline('thsottiaux',{budgetMs:600,now:()=>clock,fetcher:async()=>{clock=n++===0?0:601;return payload(n===1?[]:[own]);},sleep:async ms=>{clock+=ms;}}),/budget/);assert.equal(n,2);
 n=0;const waits=[];await readAuthorTimeline('thsottiaux',{fetcher:async()=>++n===1?payload([],{'retry-after':'1'}):payload([own]),sleep:async ms=>waits.push(ms)});assert.deepEqual(waits,[1000]);
});

test('malformed/auth errors and other authors do not acquire a new fallback policy',async()=>{
 for(const response of [()=>new Response('{broken',{status:200}),()=>Response.json({code:200}),()=>Response.json({code:200,results:{}}),()=>new Response('',{status:403}),()=>new Response('',{status:401})]){
  let n=0;await assert.rejects(readAuthorTimeline('thsottiaux',{fetcher:async()=>{n++;return response();},sleep:async()=>assert.fail('unexpected retry')}));assert.equal(n,1);
 }
 for(const author of ['OpenAI','OpenAIDevs','AnthropicAI','claudeai']){
  let n=0;await assert.rejects(readAuthorTimeline(author,{fetcher:async()=>{n++;return payload([]);},sleep:async()=>assert.fail('unexpected retry')}));assert.equal(n,1);
 }
});

test('actual collector recovers empty Tibo handles, preserves evidence, and retains both old success times on later failures',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'tibo-empty-collector-'));
 try{
  for(const part of ['src','scripts'])await cp(new URL('../'+part+'/',import.meta.url),join(dir,part),{recursive:true});
  await mkdir(join(dir,'data'));
  const events=reclassifyEvents(JSON.parse(await readFile(new URL('../data/events.json',import.meta.url),'utf8')));
  const previous='2026-11-23T10:55:56.352Z';let lastSuccess=previous,lastClaudeSuccess=previous;
  await writeFile(join(dir,'data/events.json'),JSON.stringify(events));
  await writeFile(join(dir,'data/platforms.json'),JSON.stringify({codex:{},claude:{}}));
  await writeFile(join(dir,'data/health.json'),JSON.stringify({lastSuccessAt:previous,platforms:{codex:{lastSuccessAt:previous},claude:{lastSuccessAt:previous}}}));
  await writeFile(join(dir,'mock.mjs'),`
   const counts={handle:0,id:0,embeds:0};process.on('exit',()=>console.log('COUNTS:'+JSON.stringify(counts)));
   const RealDate=Date;let elapsed=0;globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[RealDate.parse(process.env.TEST_NOW)+elapsed]));}static now(){return RealDate.parse(process.env.TEST_NOW)+elapsed;}};
   globalThis.fetch=async input=>{const u=new URL(input);
    if(u.pathname.includes('/profile/')){
     const handle=u.pathname.split('/')[3],isId=handle==='id:${TIBO_ID}',author=isId?'thsottiaux':handle;
     if(author==='thsottiaux'){
      counts[isId?'id':'handle']++;
      if(!isId){if(process.env.TEST_MODE==='budget')elapsed=18001;if(process.env.TEST_MODE==='global')elapsed=120001;return Response.json({code:200,results:process.env.TEST_MODE==='foreign'?[${JSON.stringify(other)}]:[]});}
      if(process.env.TEST_MODE==='http404')return new Response('',{status:404});
      const own=${JSON.stringify(own)};
      if(process.env.TEST_MODE==='mismatch')own.author.id='9';
      return Response.json({code:200,results:process.env.TEST_MODE==='empty'?[]:process.env.TEST_MODE==='quote'?[{...${JSON.stringify(other)},quote:own}]:[own]});
     }
     return Response.json({code:200,results:[{id:'999',url:'https://x.com/'+author+'/status/999',author:{screen_name:author},text:'Hello world'}]});
    }
    if(u.hostname==='publish.twitter.com'){counts.embeds++;throw Error('No new reset post should require verification');}
    return new Response('No discovery links');
   };
  `);
  const modes=['empty','success','mismatch','foreign','success','http404','quote','budget','global'];
  for(const [i,mode] of modes.entries()){
   const at=new Date(Date.parse('2026-11-23T13:00:00Z')+i*60000).toISOString();
   const result=spawnSync(process.execPath,['--import',pathToFileURL(join(dir,'mock.mjs')).href,join(dir,'scripts/collect.mjs')],{encoding:'utf8',timeout:10000,env:{...process.env,TEST_MODE:mode,TEST_NOW:at,ENABLE_PAID_X_API:'false',COLLECT_POST_URLS:''}});
   assert.equal(result.status,0,result.stderr);
   const counts=JSON.parse(result.stdout.match(/COUNTS:(.*)/)[1]);assert.equal(counts.handle,1);assert.equal(counts.id,['budget','global'].includes(mode)?0:mode==='http404'?2:1);assert.equal(counts.embeds,0);
   const health=JSON.parse(await readFile(join(dir,'data/health.json'),'utf8'));const tibo=health.sources.find(s=>s.author==='thsottiaux');
   const recovered=mode==='success'||mode==='foreign';if(recovered)lastSuccess=at;
   assert.equal(health.status,recovered?'ok':'degraded');assert.equal(health.platforms.codex.status,health.status);assert.equal(tibo.ok,recovered);
   assert.equal(health.lastSuccessAt,lastSuccess);assert.equal(health.platforms.codex.lastSuccessAt,lastSuccess);
   if(mode!=='global')lastClaudeSuccess=at;assert.equal(health.platforms.claude.status,mode==='global'?'degraded':'ok');assert.equal(health.platforms.claude.lastSuccessAt,lastClaudeSuccess);
   assert.equal(tibo.attempts.length,['budget','global'].includes(mode)?1:mode==='http404'?3:2);assert.equal(tibo.attempts[0].status,200);assert.equal(tibo.attempts[0].ok,false);
   assert.equal(tibo.attempts.at(-1).ok,recovered);if(counts.id)assert.ok(tibo.attempts[1].url.includes('/id:'+TIBO_ID+'/'));
   assert.deepEqual(JSON.parse(await readFile(join(dir,'data/events.json'),'utf8')),events);
   const p=JSON.parse(await readFile(join(dir,'data/platforms.json'),'utf8')),expected=syncPlatformState({codex:{},claude:{}},events,Date.parse(at));
   for(const key of ['codex','claude'])Object.assign(expected[key],{discoveryMode:health.mode,trackingState:health.platforms[key].status==='ok'?'timeline-checked':'partial-coverage'});assert.deepEqual(p,expected);
  }
 }finally{await rm(dir,{recursive:true,force:true});}
});
