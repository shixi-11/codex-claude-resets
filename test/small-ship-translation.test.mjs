import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,copyFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {translatedText,postText} from '../src/post-text.mjs';
const id='2113492502355562875';
const events=JSON.parse(await readFile(new URL('../data/events.json',import.meta.url),'utf8'));
const cache=JSON.parse(await readFile(new URL('../data/translations.json',import.meta.url),'utf8'));
const event=events.find(e=>e.id===id),entry=cache.posts[id];

test('Chinese small ship means a software update, retaining the source upper bound, PST and paragraph',()=>{
 assert.equal(entry.contentHash,event.contentHash);assert.equal(entry.fullText,event.fullText);assert.equal(entry.excerpt,event.excerpt);
 for(const lang of ['zh','zh-Hant']){
  const text=entry.fullTexts[lang];assert.match(text,/小更新/);assert.match(text,/PST/);assert.match(text,/10/);assert.match(text,/之前/);assert.doesNotMatch(text,/船|飞|飛|着陆|著陸|已完成|所有/);assert.equal(text.includes('\n'),false);
  assert.equal(translatedText({...event,localized:entry},lang).text,text);assert.ok(postText({...event,localized:entry},lang).includes(text));
  assert.ok(!postText({...event,contentHash:'a'.repeat(64),localized:entry},lang).includes('小更新'));
 }
 assert.equal(event.state,'announced');assert.equal(event.resetAt,null);
});

test('the actual translation pipeline preserves reviewed Chinese while other languages remain pending',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'small-ship-translation-'));
 try{
  for(const part of ['src','scripts','data'])await mkdir(join(dir,part));
  for(const file of ['scripts/translate.mjs','src/post-text.mjs','src/shared.mjs','src/evidence.mjs','src/announcement-time.mjs'])await copyFile(new URL('../'+file,import.meta.url),join(dir,file));
  await writeFile(join(dir,'data/events.json'),JSON.stringify([event]));await writeFile(join(dir,'data/translations.json'),JSON.stringify({version:1,posts:{[id]:entry}}));
  await writeFile(join(dir,'mock.mjs'),`import {appendFileSync} from 'node:fs';globalThis.fetch=async input=>{appendFileSync(new URL('./requests.txt',import.meta.url),String(input)+'\\n');return new Response('',{status:404});};`);
  const result=spawnSync(process.execPath,['--import',pathToFileURL(join(dir,'mock.mjs')).href,join(dir,'scripts/translate.mjs')],{encoding:'utf8',timeout:10000});assert.equal(result.status,0,result.stderr);
  const saved=JSON.parse(await readFile(join(dir,'data/translations.json'),'utf8')).posts[id],requests=await readFile(join(dir,'requests.txt'),'utf8');
  assert.doesNotMatch(requests,/lang=zh-(?:cn|tw)/);assert.match(requests,/lang=/);
  for(const lang of ['zh','zh-Hant']){assert.equal(saved.texts[lang],entry.texts[lang]);assert.equal(saved.fullTexts[lang],entry.fullTexts[lang]);}
  assert.equal(saved.contentHash,event.contentHash);assert.equal(saved.fullText,event.fullText);
 }finally{if(dirname(resolve(dir))===resolve(tmpdir()))await rm(dir,{recursive:true,force:true});}
});
