import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,copyFile,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
test('fallback retains timeline text, retries transient checks, exposes failures and preserves Pro 500 verification',async()=>{
 const root=await mkdtemp(join(tmpdir(),'reset-reliability-'));
 try{
  for(const dir of ['src','scripts','data'])await mkdir(join(root,dir));
  for(const file of ['scripts/collect.mjs','scripts/collector-request.mjs','scripts/topic-heat-refresh.mjs','src/evidence.mjs','src/platform-state.mjs','src/announcement-time.mjs','src/x-relay.mjs'])await copyFile(new URL('../'+file,import.meta.url),join(root,file));
  const events=JSON.parse(await readFile(new URL('../data/events.json',import.meta.url)));
  const report=events.find(ev=>ev.id==='2106233145163141249'),bank=events.find(ev=>ev.id==='2102463847714247142');
  await writeFile(join(root,'fixtures.json'),JSON.stringify({report,bank}));
  await writeFile(join(root,'data/events.json'),JSON.stringify([report]));
  await writeFile(join(root,'data/health.json'),JSON.stringify({lastSuccessAt:'2026-09-01',platforms:{codex:{lastSuccessAt:'2026-09-01'}}}));
  await writeFile(join(root,'data/platforms.json'),JSON.stringify({codex:{},claude:{}}));
  await writeFile(join(root,'mock.mjs'),`
   import {readFileSync} from 'node:fs';
   const {report,bank}=JSON.parse(readFileSync(new URL('./fixtures.json',import.meta.url)));let bankChecks=0;
   globalThis.fetch=async input=>{
    const u=new URL(input);
    if(u.pathname.includes('/profile/')){
     const author=u.pathname.split('/')[3];if(author==='OpenAI')return new Response('',{status:404});
     const p=author==='thsottiaux'?{id:bank.id,url:bank.sourceUrl,author:{screen_name:author},created_timestamp:Math.floor(Date.parse(bank.publishedAt)/1000),text:process.env.TEST_BAD_RELAY?'Different reset announcement':bank.fullText}:{id:'123',url:'https://x.com/'+author+'/status/123',author:{screen_name:author},text:'Hello world'};
     return Response.json({code:200,results:[p]});
    }
    if(u.hostname==='publish.twitter.com'){
     if(u.searchParams.get('url')===report.sourceUrl)return new Response('',{status:404});
     if(bankChecks++===0)return new Response('',{status:504});
     return Response.json({url:bank.sourceUrl,author_url:'https://x.com/thsottiaux',html:'<p>GPT-6 Sol and Luna are out. Not only are they…</p>'});
    }
    if(['codexreset.org','codex-resets.com','www.resetradar.com'].includes(u.hostname))return new Response(bank.sourceUrl+' '+report.sourceUrl);
    throw Error('Unexpected relay fetch: timeline text was lost');
   };
  `);
  const result=spawnSync(process.execPath,['--import',pathToFileURL(join(root,'mock.mjs')).href,join(root,'scripts/collect.mjs')],{encoding:'utf8',timeout:15000,env:{...process.env,ENABLE_PAID_X_API:'false',COLLECTION_BUDGET_MS:'10000'}});
  assert.equal(result.status,0,result.stderr);
  const next=JSON.parse(await readFile(join(root,'data/events.json'))),health=JSON.parse(await readFile(join(root,'data/health.json')));
  assert.equal(next.find(ev=>ev.id===bank.id).fullText,bank.fullText);
  assert.equal(next.find(ev=>ev.id===report.id).verifiedAt,report.verifiedAt);
  assert.equal(next.find(ev=>ev.id===report.id).state,'unconfirmed');
  assert.equal(health.status,'degraded');assert.equal(health.lastSuccessAt,'2026-09-01');
  assert.equal(health.requests.retries,1);
  assert.equal(health.requests.recovered,1);assert.equal(health.requests.failureKinds['http:504'],1);
  const failure=health.failedPosts.find(p=>p.url===report.sourceUrl);assert.equal(failure.kind,'http');assert.equal(failure.status,404);assert.equal(failure.attempts,1);assert.equal(failure.discoverySources.length,3);
  const coverage=health.coverage.authors.thsottiaux;assert.equal(coverage.discovered,2);assert.equal(coverage.checked,1);assert.equal(coverage.failed,1);
  assert.ok(health.coverage.rawCandidates>health.coverage.uniqueCandidates);
  const incomplete=spawnSync(process.execPath,['--import',pathToFileURL(join(root,'mock.mjs')).href,join(root,'scripts/collect.mjs')],{encoding:'utf8',timeout:15000,env:{...process.env,ENABLE_PAID_X_API:'false',COLLECTION_BUDGET_MS:'10000',TEST_BAD_RELAY:'true'}});
  assert.equal(incomplete.status,0,incomplete.stderr);
  const partial=JSON.parse(await readFile(join(root,'data/health.json'))),preserved=JSON.parse(await readFile(join(root,'data/events.json')));
  assert.equal(partial.coverage.authors.thsottiaux.incomplete,1);assert.equal(partial.platforms.codex.status,'degraded');
  assert.ok(partial.failedPosts.some(p=>p.stage==='relay-corroboration'&&p.kind==='evidence'));
  assert.equal(preserved.find(ev=>ev.id===bank.id).fullText,bank.fullText);assert.equal(preserved.find(ev=>ev.id===bank.id).verifiedAt,next.find(ev=>ev.id===bank.id).verifiedAt);
  const bounded=spawnSync(process.execPath,['--import',pathToFileURL(join(root,'mock.mjs')).href,join(root,'scripts/collect.mjs')],{encoding:'utf8',timeout:15000,env:{...process.env,ENABLE_PAID_X_API:'false',COLLECTION_BUDGET_MS:'1'}});
  assert.equal(bounded.status,0,bounded.stderr);
  const stopped=JSON.parse(await readFile(join(root,'data/health.json'))),retained=JSON.parse(await readFile(join(root,'data/events.json')));
  assert.equal(stopped.status,'degraded');assert.equal(stopped.lastSuccessAt,'2026-09-01');assert.equal(stopped.coverage.budgetExhausted,true);
  assert.equal(retained.find(ev=>ev.id===report.id).verifiedAt,report.verifiedAt);
  assert.ok(stopped.sources.some(s=>s.kind==='budget'||s.budgetExhausted));
 }finally{await rm(root,{recursive:true,force:true});}
});
