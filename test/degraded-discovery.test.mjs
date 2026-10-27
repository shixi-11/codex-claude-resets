import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,copyFile,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';

test('failed timelines use bounded fallback without losing relay text or refreshing successful-check time',async()=>{
 const root=await mkdtemp(join(tmpdir(),'reset-degraded-'));
 try {
  for(const dir of ['src','data','scripts'])await mkdir(join(root,dir));
  for(const file of ['scripts/collect.mjs','scripts/topic-heat-refresh.mjs','src/evidence.mjs','src/tracking-audit.mjs','src/platform-state.mjs','src/announcement-time.mjs','src/x-relay.mjs','src/collection-request.mjs'])await copyFile(new URL('../'+file,import.meta.url),join(root,file));
  const stored=JSON.parse(await readFile(new URL('../data/events.json',import.meta.url),'utf8')).find(e=>e.id==='2114588174249071102');
  await writeFile(join(root,'data/events.json'),JSON.stringify([stored]));
  const previous='2026-10-27T14:29:12.417Z';
  await writeFile(join(root,'data/health.json'),JSON.stringify({lastSuccessAt:previous,platforms:{codex:{lastSuccessAt:previous},claude:{lastSuccessAt:previous}}}));
  await writeFile(join(root,'data/platforms.json'),JSON.stringify({codex:{},claude:{}}));
  await writeFile(join(root,'mock.mjs'),`
   const counters={embeds:0,healthyEmbeds:0,timelines:{}};
   process.on('exit',()=>console.log('COUNTERS:'+JSON.stringify(counters)));
   globalThis.fetch=async input=>{
    const u=new URL(input);
    if(u.pathname.includes('/profile/')) {
     const author=u.pathname.split('/')[3];counters.timelines[author]=(counters.timelines[author]||0)+1;
     if(['thsottiaux','claudeai'].includes(author))return new Response('',{status:404});
     const id=String(8000+['OpenAI','OpenAIDevs','ClaudeDevs','AnthropicAI'].indexOf(author));
     return Response.json({code:200,results:[{id,url:'https://x.com/'+author+'/status/'+id,author:{screen_name:author},text:'Hello world'}]});
    }
    if(u.hostname==='publish.twitter.com') {
     counters.embeds++;if(!/thsottiaux|claudeai/.test(u.searchParams.get('url')))counters.healthyEmbeds++;
     return new Response('',{status:404});
    }
    const links=['thsottiaux','claudeai','OpenAI','OpenAIDevs','ClaudeDevs','AnthropicAI'].flatMap((author,index)=>Array.from({length:454},(_,i)=>'https://x.com/'+author+'/status/'+(10000+index*1000+i)));
    links.push('https://x.com/OpenAI/status/8000');
    return new Response(links.join(' '));
   };
  `);
  const result=spawnSync(process.execPath,['--import',pathToFileURL(join(root,'mock.mjs')).href,join(root,'scripts/collect.mjs')],{encoding:'utf8',timeout:15000,env:{...process.env,ENABLE_PAID_X_API:'false',COLLECT_POST_URLS:''}});
  assert.equal(result.status,0,result.stderr);
  const counters=JSON.parse(result.stdout.match(/COUNTERS:(.*)/)[1]);
  assert.equal(counters.embeds,80);assert.equal(counters.healthyEmbeds,0);
  assert.equal(counters.timelines.thsottiaux,3);assert.equal(counters.timelines.claudeai,3);
  const health=JSON.parse(await readFile(join(root,'data/health.json'),'utf8'));
  assert.equal(health.status,'degraded');assert.equal(health.lastSuccessAt,previous);
  for(const id of ['codex','claude']) {
   assert.equal(health.platforms[id].status,'degraded');assert.equal(health.platforms[id].lastSuccessAt,previous);
   assert.equal(health.platforms[id].failed,40);
  }
  assert.equal(health.failedPosts.length,80);
  const events=JSON.parse(await readFile(join(root,'data/events.json'),'utf8'));
  assert.deepEqual(events,[stored]);
  const codex=JSON.parse(await readFile(join(root,'data/platforms.json'),'utf8')).codex;
  assert.equal(codex.reset.state,'announced');assert.equal(codex.reset.resetAt,null);assert.equal(codex.lastReset,null);
 } finally {if(dirname(resolve(root))===resolve(tmpdir()))await rm(root,{recursive:true,force:true});}
});
