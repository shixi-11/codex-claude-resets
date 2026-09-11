import {pathToFileURL} from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,copyFile,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

test('collector removes a stored false positive and does not mask a failed Claude source',async()=>{
 const root=await mkdtemp(join(tmpdir(),'reset-collector-test-'));
 try {
  for(const dir of ['src','data','scripts'])await mkdir(join(root,dir));
  for(const file of ['scripts/collect.mjs','scripts/topic-heat-refresh.mjs','src/evidence.mjs','src/announcement-time.mjs','src/x-relay.mjs'])await copyFile(new URL('../'+file,import.meta.url),join(root,file));
  const id='2098300998968357218';
  await writeFile(join(root,'data/events.json'),JSON.stringify([{id,author:'thsottiaux',sourceUrl:`https://x.com/thsottiaux/status/${id}`,kind:'signal',state:'unconfirmed',fullText:'Codex usage has been declining.',truncated:false,verifiedAt:'2026-09-01',publishedAt:'2026-09-01',rulesVersion:'old'}]));
  await writeFile(join(root,'data/health.json'),JSON.stringify({lastSuccessAt:'2026-09-01',platforms:{claude:{lastSuccessAt:'2026-09-01'}}}));
  await writeFile(join(root,'data/platforms.json'),JSON.stringify({codex:{},claude:{}}));
  await writeFile(join(root,'mock.mjs'),`globalThis.fetch=async input=>{
   const u=new URL(input),author=u.pathname.split('/')[3];
   if(u.pathname.includes('/profile/')){
    if(author==='AnthropicAI')return new Response('',{status:503});
    const authors=['thsottiaux','OpenAIDevs','OpenAI','ClaudeDevs','AnthropicAI','claudeai'];
    const id=String(100+authors.indexOf(author));
    return Response.json({code:200,results:[{id,url:'https://x.com/'+author+'/status/'+id,author:{screen_name:author},text:'Hello world'}]});
   }
   return new Response('');
  };`);
  const result=spawnSync(process.execPath,['--import',pathToFileURL(join(root,'mock.mjs')).href,join(root,'scripts/collect.mjs')],{encoding:'utf8',timeout:10000,env:{...process.env,ENABLE_PAID_X_API:'false'}});
  assert.equal(result.status,0,result.stderr);
  const health=JSON.parse(await readFile(join(root,'data/health.json'),'utf8'));
  assert.equal(health.platforms.codex.status,'ok'); // Zero matching candidates is valid.
  assert.equal(health.platforms.claude.status,'degraded');
  assert.equal(health.platforms.claude.lastSuccessAt,'2026-09-01');
  assert.equal(health.status,'degraded');
  assert.equal(health.lastSuccessAt,'2026-09-01');
  assert.deepEqual(JSON.parse(await readFile(join(root,'data/events.json'),'utf8')),[]);
  assert.equal(JSON.parse(await readFile(join(root,'data/platforms.json'),'utf8')).codex.latest,null);
 } finally {if(dirname(resolve(root))===resolve(tmpdir()))await rm(root,{recursive:true,force:true});}
});
