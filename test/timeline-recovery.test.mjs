import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,copyFile,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';

test('actual collector retries invalid timelines, records attempts, and preserves degraded health on exhaustion or refusal',async()=>{
 const root=await mkdtemp(join(tmpdir(),'timeline-recovery-'));
 try{
  for(const dir of ['src','data','scripts'])await mkdir(join(root,dir));
  for(const file of ['scripts/collect.mjs','scripts/topic-heat-refresh.mjs','src/evidence.mjs','src/tracking-audit.mjs','src/platform-state.mjs','src/announcement-time.mjs','src/x-relay.mjs','src/collection-request.mjs'])await copyFile(new URL('../'+file,import.meta.url),join(root,file));
  const stored=JSON.parse(await readFile(new URL('../data/events.json',import.meta.url),'utf8')).find(e=>e.id==='2115330127886463244');
  await writeFile(join(root,'data/events.json'),JSON.stringify([stored]));await writeFile(join(root,'data/platforms.json'),JSON.stringify({codex:{},claude:{}}));await writeFile(join(root,'data/health.json'),'{}');
  await writeFile(join(root,'mock.mjs'),`const counts={};globalThis.fetch=async input=>{
   const u=new URL(input);if(u.pathname.includes('/profile/')){
    const author=u.pathname.split('/')[3],n=counts[author]=(counts[author]||0)+1;
    if(author==='OpenAIDevs'){
     if(process.env.TEST_MODE==='failed'||n===1)return Response.json({code:404,results:[]});
     if(n===2)return Response.json({code:200,results:[{id:'123',url:'https://x.com/OpenAI/status/123',author:{screen_name:'OpenAI'},text:'Hello'}]});
    }
    if(author==='AnthropicAI'){
     if(process.env.TEST_MODE==='failed')return Response.json({code:403,results:[]});
     if(n===1)return new Response('{');if(n===2)return Response.json({code:200,results:[]});
    }
    return Response.json({code:200,results:[{id:'123',url:'https://x.com/'+author+'/status/123',author:{screen_name:author},text:'Hello world'}]});
   }
   return new Response('',{status:404});
  };`);
  let success;
  for(const mode of ['recovered','failed']){
   const r=spawnSync(process.execPath,['--import',pathToFileURL(join(root,'mock.mjs')).href,join(root,'scripts/collect.mjs')],{encoding:'utf8',timeout:15000,env:{...process.env,ENABLE_PAID_X_API:'false',COLLECT_POST_URLS:'',TEST_MODE:mode}});assert.equal(r.status,0,r.stderr);
   const h=JSON.parse(await readFile(join(root,'data/health.json'),'utf8')),source=author=>h.sources.find(s=>s.author===author);
   assert.equal(h.status,mode==='recovered'?'ok':'degraded');
   assert.deepEqual(source('OpenAIDevs').attempts.map(a=>a.ok),mode==='recovered'?[false,false,true]:[false,false,false]);
   assert.equal(source('AnthropicAI').attempts.length,mode==='recovered'?3:1);
   if(mode==='recovered'){success=h.lastSuccessAt;assert.ok(success);assert.equal(h.platforms.codex.status,'ok');assert.equal(h.platforms.claude.status,'ok');}
   else{assert.equal(source('AnthropicAI').attempts[0].status,200);assert.match(source('AnthropicAI').error,/403/);assert.equal(h.lastSuccessAt,success);for(const platform of ['codex','claude']){assert.equal(h.platforms[platform].lastSuccessAt,success);assert.equal(h.platforms[platform].status,'degraded');}}
   assert.deepEqual(JSON.parse(await readFile(join(root,'data/events.json'),'utf8')),[stored]);
   const p=JSON.parse(await readFile(join(root,'data/platforms.json'),'utf8'));assert.equal(p.codex.lastReset.id,stored.id);assert.equal(p.codex.reset.resetAt,null);assert.equal(p.codex.lastReset.eligiblePlans,undefined);
  }
 }finally{if(dirname(resolve(root))===resolve(tmpdir()))await rm(root,{recursive:true,force:true});}
});
