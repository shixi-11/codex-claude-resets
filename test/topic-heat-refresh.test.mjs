import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';
import {refreshTopicHeat} from '../scripts/topic-heat-refresh.mjs';
test('heat refresh commits complete source counts and preserves snapshot on failure',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'heat-refresh-')),root=pathToFileURL(dir+'/');
 try{await mkdir(new URL('data/',root));const file=new URL('data/topic-heat.json',root);const old={observedAt:'2026-09-01T00:00:00Z',posts:[{id:'123',url:'https://x.com/thsottiaux/status/123',views:5},{id:'456',url:'https://x.com/ClaudeDevs/status/456',views:6}]};await writeFile(file,JSON.stringify(old));
 const request=async url=>{const [,author,,id]=new URL(url).pathname.split('/');return {tweet:{id,author:{screen_name:author},views:10}};};
 const next=await refreshTopicHeat(root,request);assert.equal(next.posts.reduce((n,p)=>n+p.views,0),20);assert.notEqual(next.observedAt,old.observedAt);
 const saved=await readFile(file,'utf8');await assert.rejects(refreshTopicHeat(root,async url=>{if(url.includes('456'))throw Error('unavailable');return request(url);}));assert.equal(await readFile(file,'utf8'),saved);
 await assert.rejects(refreshTopicHeat(root,async()=>({tweet:{id:'wrong',author:{screen_name:'thsottiaux'},views:50}})));assert.equal(await readFile(file,'utf8'),saved);
 }finally{await rm(dir,{recursive:true,force:true});}
});
