import test from 'node:test';
import assert from 'node:assert/strict';
import {cp,mkdtemp,readFile,writeFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {publicPlatforms} from '../src/platform-public.mjs';

test('actual build strips stale current-offer assertions from JSON and every embedded page without refreshing evidence',async()=>{
 const root=await mkdtemp(join(tmpdir(),'claude-public-build-'));
 try{
  for(const name of ['src','scripts','data','public'])await cp(new URL('../'+name,import.meta.url),join(root,name),{recursive:true});
  const source=JSON.parse(await readFile(join(root,'data/platforms.json'),'utf8'));
  const gift=source.claude.gifts.find(g=>g.permanent&&g.announcementId==='2093742321473065266');
  Object.assign(gift,{claim:'Applied automatically to eligible accounts',fiveHourLimit:'unchanged',fiveHourPolicy:'unaffected',scope:'Claude Code weekly limits only; not five-hour limits or other Claude products'});
  const historic={...gift,permanent:false,announcementId:'historical-promotion'};
  source.claude.gifts.push(historic);
  const before=structuredClone(source),health=await readFile(join(root,'data/health.json'),'utf8');
  await writeFile(join(root,'data/platforms.json'),JSON.stringify(source));
  const check=data=>{
   const current=data.claude.gifts.find(g=>g.permanent&&g.announcementId===gift.announcementId);
   for(const key of ['claim','fiveHourLimit','fiveHourPolicy'])assert.equal(Object.hasOwn(current,key),false);
   assert.equal(current.scope,'Claude Code weekly limits');assert.equal(current.verifiedAt,gift.verifiedAt);
   assert.equal(current.sourceUrl,gift.sourceUrl);assert.deepEqual(data.claude.gifts.at(-1),historic);
  };
  check(publicPlatforms(source));assert.deepEqual(source,before);
  const result=spawnSync(process.execPath,[join(root,'scripts/build.mjs')],{encoding:'utf8',timeout:60000});
  assert.equal(result.status,0,result.stderr);
  check(JSON.parse(await readFile(join(root,'dist/platforms.json'),'utf8')));
  let pages=0;
  const visit=async dir=>{for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())await visit(path);else if(entry.name.endsWith('.html')){const html=await readFile(path,'utf8'),match=html.match(/<script[^>]*id="page-data"[^>]*>([\s\S]*?)<\/script>/);if(match){check(JSON.parse(match[1]).platforms);pages++;}}}};
  await visit(join(root,'dist'));assert.ok(pages>=1458);
  assert.deepEqual(JSON.parse(await readFile(join(root,'data/platforms.json'),'utf8')),before);
  assert.deepEqual(JSON.parse(await readFile(join(root,'dist/health.json'),'utf8')),JSON.parse(health));
  assert.deepEqual(publicPlatforms(publicPlatforms(source)),publicPlatforms(source));
 }finally{await rm(root,{recursive:true,force:true});}
});
