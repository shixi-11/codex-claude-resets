import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,copyFile,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';

test('two Claude timeline 404s remain degraded despite primary success; only complete recovery advances coverage',async()=>{
 const root=await mkdtemp(join(tmpdir(),'claude-recovery-'));
 try {
  for(const dir of ['src','scripts','data'])await mkdir(join(root,dir));
  for(const file of ['scripts/collect.mjs','scripts/topic-heat-refresh.mjs','src/evidence.mjs','src/tracking-audit.mjs','src/platform-state.mjs','src/announcement-time.mjs','src/x-relay.mjs','src/collection-request.mjs'])await copyFile(new URL('../'+file,import.meta.url),join(root,file));
  const stored=JSON.parse(await readFile(new URL('./fixtures/nov2-banked-event.json',import.meta.url),'utf8'));
  await writeFile(join(root,'data/events.json'),JSON.stringify([stored]));
  const previous='2026-11-03T09:43:54.881Z';
  await writeFile(join(root,'data/health.json'),JSON.stringify({lastSuccessAt:previous,platforms:{codex:{lastSuccessAt:previous},claude:{lastSuccessAt:previous}}}));
  await writeFile(join(root,'data/platforms.json'),JSON.stringify({codex:{},claude:{}}));
  await writeFile(join(root,'mock.mjs'),`
   const counts={};process.on('exit',()=>console.log('COUNTS:'+JSON.stringify(counts)));
   globalThis.fetch=async input=>{
    const u=new URL(input);
    if(u.pathname.includes('/profile/')){
     const author=u.pathname.split('/')[3];counts[author]=(counts[author]||0)+1;
     if(['ClaudeDevs','AnthropicAI'].includes(author)&&process.env.TEST_RECOVER!=='1')return new Response('',{status:404});
     const id=author==='claudeai'?'2116220869479428500':'123';
     return Response.json({code:200,results:[{id,url:'https://x.com/'+author+'/status/'+id,author:{screen_name:author},text:author==='claudeai'?'Claude weekly usage limits increased.':'Hello world'}]});
    }
    if(u.hostname==='publish.twitter.com')return Response.json({url:u.searchParams.get('url'),author_url:'https://x.com/claudeai',html:'<p>Claude weekly usage limits increased.</p>'});
    return new Response('',{status:503});
   };
  `);
  for(const recover of ['0','1']){
   const result=spawnSync(process.execPath,['--import',pathToFileURL(join(root,'mock.mjs')).href,join(root,'scripts/collect.mjs')],{encoding:'utf8',timeout:15000,env:{...process.env,TEST_RECOVER:recover,ENABLE_PAID_X_API:'false',COLLECT_POST_URLS:''}});
   assert.equal(result.status,0,result.stderr);
   const health=JSON.parse(await readFile(join(root,'data/health.json'),'utf8'));
   const counts=JSON.parse(result.stdout.match(/COUNTS:(.*)/)[1]);
   assert.equal(health.platforms.codex.status,'ok');assert.equal(health.platforms.claude.checked,1);assert.equal(health.platforms.claude.failed,0);
   assert.equal(health.platforms.claude.authors.length,3);
   for(const author of ['ClaudeDevs','AnthropicAI'])assert.equal(counts[author],recover==='0'?3:1);
   if(recover==='0'){
    assert.equal(health.status,'degraded');assert.equal(health.platforms.claude.status,'degraded');
    assert.equal(health.lastSuccessAt,previous);assert.equal(health.platforms.claude.lastSuccessAt,previous);
    assert.equal(health.platforms.claude.authors.filter(a=>!a.ok).length,2);
   }else{
    assert.equal(health.status,'ok');assert.equal(health.platforms.claude.status,'ok');
    assert.equal(health.lastSuccessAt,health.lastAttemptAt);assert.equal(health.platforms.claude.lastSuccessAt,health.lastAttemptAt);
    assert.ok(health.platforms.claude.authors.every(a=>a.ok));
   }
   const events=JSON.parse(await readFile(join(root,'data/events.json'),'utf8'));
   assert.deepEqual(events.find(e=>e.id===stored.id),stored);
   const usage=events.find(e=>e.author==='claudeai');assert.equal(usage.kind,'usage');assert.notEqual(usage.state,'reported');assert.equal(usage.resetAt,undefined);
  }
 }finally{if(dirname(resolve(root))===resolve(tmpdir()))await rm(root,{recursive:true,force:true});}
});
