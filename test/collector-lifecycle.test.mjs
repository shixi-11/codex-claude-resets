import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,copyFile,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
test('collector persists announcement, completion, and credit through later news and repeat runs',async()=>{
 const root=await mkdtemp(join(tmpdir(),'reset-lifecycle-'));
 try{
  for(const dir of ['src','scripts','data'])await mkdir(join(root,dir));
  for(const file of ['scripts/collect.mjs','scripts/collector-request.mjs','scripts/topic-heat-refresh.mjs','src/evidence.mjs','src/platform-state.mjs','src/announcement-time.mjs','src/x-relay.mjs'])await copyFile(new URL('../'+file,import.meta.url),join(root,file));
  await writeFile(join(root,'data/events.json'),'[]');await writeFile(join(root,'data/health.json'),'{}');await writeFile(join(root,'data/platforms.json'),JSON.stringify({codex:{gifts:[]},claude:{gifts:[]}}));
  const all=JSON.parse(await readFile(new URL('../data/events.json',import.meta.url),'utf8'));
  const ids=['2103637477760311522','2103911959544610829','2102463847714247142'];
  await writeFile(join(root,'fixtures.json'),JSON.stringify(all.filter(e=>ids.includes(e.id))));
  await writeFile(join(root,'mock.mjs'),`
   import {readFileSync} from 'node:fs';
   const items=JSON.parse(readFileSync(new URL('./fixtures.json',import.meta.url)));
   const stage=Number(process.env.TEST_STAGE);
   const ordinary={...items.find(e=>e.id==='2103911959544610829'),id:'2103911959548805133',sourceUrl:'https://x.com/thsottiaux/status/2103911959548805133',fullText:'Codex usage limits increase today.'};
   items.push(ordinary);
   const selected=stage===0?[items.find(e=>e.id==='2103637477760311522')]:stage===1?items.filter(e=>e!==ordinary):stage===2?[ordinary]:[];
   const relay=e=>({id:e.id,url:e.sourceUrl,author:{screen_name:e.author},text:e.fullText,created_timestamp:Math.floor(Date.parse(e.publishedAt)/1000)});
   globalThis.fetch=async input=>{
    const u=new URL(input);
    if(u.pathname.includes('/profile/')){
     const author=u.pathname.split('/')[3];
     return Response.json({code:200,results:author==='thsottiaux'&&selected.length?selected.map(relay):[{id:'123',url:'https://x.com/'+author+'/status/123',author:{screen_name:author},text:'Hello world'}]});
    }
    if(u.hostname==='publish.twitter.com'){
     const e=items.find(e=>e.sourceUrl===u.searchParams.get('url'));
     const text=e.id==='2102463847714247142'?'GPT-6 Sol and Luna are out…':e.fullText;
     return Response.json({url:e.sourceUrl,author_url:'https://x.com/'+e.author,html:'<p>'+text.replaceAll('&','&amp;').replaceAll('<','&lt;')+'</p>'});
    }
    return new Response('',{status:503});
   };
  `);
  for(const stage of [0,1,2,3,3]){
   const result=spawnSync(process.execPath,['--import',pathToFileURL(join(root,'mock.mjs')).href,join(root,'scripts/collect.mjs')],{encoding:'utf8',timeout:10000,env:{...process.env,TEST_STAGE:String(stage),ENABLE_PAID_X_API:'false'}});
   assert.equal(result.status,0,result.stderr);
   const p=JSON.parse(await readFile(join(root,'data/platforms.json'),'utf8')).codex;
   assert.equal(p.latestReset.id,stage===0?ids[0]:ids[1]);
   assert.equal(p.latestReset.state,stage===0?'announced':'reported');
   if(stage>0){assert.equal(p.lastReset.id,ids[1]);assert.equal(p.latestGift.id,ids[2]);assert.equal(p.latestGift.truncated,false);}
   if(stage>=2)assert.equal(p.latest.kind,'usage');
  }
 }finally{if(dirname(resolve(root))===resolve(tmpdir()))await rm(root,{recursive:true,force:true});}
});
