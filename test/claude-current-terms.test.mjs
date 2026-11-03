import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,copyFile,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
test('actual promotion collector retains last verified evidence when current conditions conflict with historical FAQ',async()=>{
 const root=await mkdtemp(join(tmpdir(),'claude-current-terms-'));
 try{
  for(const dir of ['src','scripts','data'])await mkdir(join(root,dir));
  for(const file of ['src/claude-promotion.mjs','scripts/collect-platforms.mjs'])await copyFile(new URL('../'+file,import.meta.url),join(root,file));
  const url='https://support.claude.com/en/articles/15910845-claude-code-may-august-2026-weekly-limits-promotion';
  const current="We're making part of it permanent: starting September 14, 2026, weekly limits in Claude Code are 25% higher than they were before the promotion for Pro, Max, Ultra, Team, and seat-based Enterprise plans.";
  const historical='5-hour usage limits were not affected by this promotion. The increased weekly limit was automatically applied to your account.';
  await writeFile(join(root,'data/platforms.json'),JSON.stringify({claude:{gifts:[{type:'usage-promotion',sourceUrl:url,claim:'Applied automatically to eligible accounts',verifiedAt:'2026-09-01T00:00:00Z'}]}}));
  await writeFile(join(root,'mock.mjs'),'globalThis.fetch=async()=>new Response(process.env.TEST_HTML,{headers:{"content-type":"text/html"}});');
  let saved;
  for(const [html,fresh]of [
   ['<p>'+current+'</p><h2>What was the promotion?</h2><p>'+historical+'</p>',true],
   ['<p>'+current+' Users must apply manually. Five-hour limits also change.</p><h2>What was the promotion?</h2><p>'+historical+'</p>',false],
   ['<p>'+current.replace('25%','50%')+'</p><p>'+historical+'</p>',false],
   ['<p>'+current+'</p>',true],
  ]){
   const result=spawnSync(process.execPath,['--import',pathToFileURL(join(root,'mock.mjs')).href,join(root,'scripts/collect-platforms.mjs')],{encoding:'utf8',timeout:15000,env:{...process.env,TEST_HTML:html}});
   assert.equal(result.status,0,result.stderr);
   const data=JSON.parse(await readFile(join(root,'data/platforms.json'),'utf8')).claude;
   assert.equal(data.promotionHealth.state,fresh?'fresh':'degraded');
   if(fresh){
    assert.equal('claim' in data.gifts[0],false);assert.equal(data.gifts[0].scope,'Claude Code weekly limits');
    assert.ok(data.gifts[0].eligiblePlans.includes('Ultra'));assert.equal(data.gifts[0].verifiedAt,data.promotionHealth.checkedAt);saved=data.gifts[0];
   }else{assert.deepEqual(data.gifts[0],saved);assert.match(data.promotionHealth.error,/changed/);}
  }
 }finally{if(dirname(resolve(root))===resolve(tmpdir()))await rm(root,{recursive:true,force:true});}
});
