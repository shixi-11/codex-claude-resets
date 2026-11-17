import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,cp,copyFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {isProviderErrorText,postText,translatedText,translationLanguages} from '../src/post-text.mjs';
import {translationFromResponse,sanitizeTranslationCache} from '../scripts/translate.mjs';
const events=JSON.parse(await readFile(new URL('../data/events.json',import.meta.url),'utf8'));
const event=events.find(e=>e.id==='2120999993079451919');
const error="You're using an older version of DeepL. To continue using the app, please update to the latest version. Vous utilisez une ancienne version de DeepL. 您正在使用旧版本的 DeepL。";
const jaError='您正在使用旧版本的 DeepL。';
const good={fr:'Nous avons déployé de bonnes mises à jour pour dots aujourd’hui ; la réinitialisation à conserver a été activée et devrait bientôt arriver sur les comptes de tout le monde !',es:'Hoy publicamos buenas actualizaciones para dots; el restablecimiento acumulable se ha activado y debería llegar pronto a las cuentas de todos.'};
const codes={zh:'zh-cn','zh-Hant':'zh-tw',ja:'ja',ko:'ko',es:'es',fr:'fr',de:'de',ar:'ar'};
const entry=()=>({excerpt:event.excerpt,fullText:event.fullText,contentHash:event.contentHash,texts:Object.fromEntries(translationLanguages.map(l=>[l,good[l]||'Stored valid translation.'])),fullTexts:Object.fromEntries(translationLanguages.map(l=>[l,good[l]||'Stored valid full translation.'])),provider:'editorial-review',translatedAt:'2026-11-16T00:00:00Z'});
const payload=(lang,text)=>({code:200,status:{id:event.id,url:event.sourceUrl,author:{screen_name:event.author,protected:false},text:event.fullText,raw_text:{text:event.fullText},translation:{target_lang:codes[lang],text}}});

test('provider boilerplate is rejected for both response types and legitimate provider mentions remain valid',()=>{
 for(const text of [error,jaError,'You’re using an older version of DeepL.','Sie verwenden eine ältere Version von DeepL.','Vous utilisez une ancienne version de DeepL.','Estás usando una versión antigua de DeepL.','DeepLの古いバージョンをご利用中です。','Translation unavailable','DeepL error: rate limit exceeded'])assert.equal(isProviderErrorText(text),true,text);
 for(const text of ['DeepL improves translation quality.','Réinitialisation des limites ; traduction avec DeepL.','DeepL a annoncé une nouvelle version.','Your usage limits have been reset.',''])assert.equal(isProviderErrorText(text),false,text);
 for(const lang of ['fr','es'])for(const full of [false,true])assert.throws(()=>translationFromResponse(event,lang,payload(lang,error),full),/provider returned an error/);
 assert.throws(()=>translationFromResponse(event,'ja',payload('ja',jaError)),/provider returned an error/);
 for(const lang of ['fr','es']){assert.equal(translationFromResponse(event,lang,payload(lang,good[lang]),true),good[lang]);assert.equal(translationFromResponse(event,lang,payload(lang,good[lang])),good[lang]);}
});

test('cache sanitizer removes only known failing fields, including independent history, and is idempotent',()=>{
 const a=entry(),b=entry();a.texts.ja=jaError;a.fullTexts.fr=error;b.fullTexts.es=error;
 const cache={version:1,pending:99,lastAttemptAt:'2026-11-15T00:00:00Z',posts:{[event.id]:a,'independent-history':b}};
 const expected=structuredClone(cache);delete expected.posts[event.id].texts.ja;delete expected.posts[event.id].fullTexts.fr;delete expected.posts['independent-history'].fullTexts.es;
 assert.equal(sanitizeTranslationCache(cache).length,3);assert.deepEqual(cache,expected);assert.deepEqual(sanitizeTranslationCache(cache),[]);
});

test('renderers reject old poisoned excerpts and full text while keeping original-source fallback explicit',()=>{
 const e=entry();e.texts.ja=jaError;e.fullTexts.fr=error;e.fullTexts.es=error;
 const summary={...event,fullText:undefined,localized:e};assert.equal(translatedText(summary,'ja').translated,false);
 const html=postText(summary,'ja');assert.ok(html.includes('lang="en"'));assert.ok(html.includes('原文・翻訳待ち'));assert.ok(!html.includes('DeepL'));
 for(const [lang,label] of [['fr','Original · traduction en attente'],['es','Original · traducción pendiente']]){
  const html=postText({...event,localized:e},lang);assert.ok(html.includes(event.fullText.replaceAll('&','&amp;')));assert.ok(html.includes(label));assert.ok(!html.includes('DeepL'));assert.ok(html.includes('lang="en"'));
 }
 const valid=postText({...event,localized:entry()},'fr');assert.ok(valid.includes('réinitialisation'));assert.ok(!valid.includes('Original · traduction en attente'));
});

async function runTranslator(cache,records=[event],responses={},limit=8){
 const dir=await mkdtemp(join(tmpdir(),'provider-cache-'));
 try{
  for(const p of ['src','scripts'])await cp(new URL('../'+p+'/',import.meta.url),join(dir,p),{recursive:true});await mkdir(join(dir,'data'));
  const originals=JSON.stringify(records);await writeFile(join(dir,'data/events.json'),originals);await writeFile(join(dir,'data/translations.json'),JSON.stringify(cache));await writeFile(join(dir,'responses.json'),JSON.stringify(responses));
  await writeFile(join(dir,'mock.mjs'),`import {readFileSync,appendFileSync} from 'node:fs';const responses=JSON.parse(readFileSync(new URL('./responses.json',import.meta.url)));globalThis.fetch=async input=>{const u=new URL(input),lang=u.searchParams.get('lang');appendFileSync(new URL('./requests.jsonl',import.meta.url),JSON.stringify({id:u.pathname.split('/').at(-1),lang})+'\\n');if(!(lang in responses))throw Error('Unexpected translation request '+lang);const r=responses[lang];if(r===null)return new Response('',{status:503});return Response.json(r);};`);
  const r=spawnSync(process.execPath,['--import',pathToFileURL(join(dir,'mock.mjs')).href,join(dir,'scripts/translate.mjs')],{encoding:'utf8',timeout:10000,env:{...process.env,TRANSLATION_REQUEST_LIMIT:String(limit)}});assert.equal(r.status,0,r.stderr);
  const result=JSON.parse(await readFile(join(dir,'data/translations.json'),'utf8'));let requests=[];try{requests=(await readFile(join(dir,'requests.jsonl'),'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);}catch(e){if(e.code!=='ENOENT')throw e;}
  assert.equal(await readFile(join(dir,'data/events.json'),'utf8'),originals);
  return {cache:result,requests,stdout:r.stdout};
 }finally{await rm(dir,{recursive:true,force:true});}
}

test('real translator cleans before short-post copying and skip decisions without losing valid cached languages',async()=>{
 for(const alreadyCopied of [false,true]){
 const current=entry(),history=entry();current.texts.ja=jaError;if(alreadyCopied)current.fullTexts.ja=error;else delete current.fullTexts.ja;current.fullTexts.fr=error;history.texts.es=error;history.fullTexts.de=error;
 const cache={version:1,posts:{[event.id]:current,'independent-history':history}};
 const r=await runTranslator(cache,[event],{ja:null},1);
 assert.equal(r.requests.length,1);assert.equal(r.requests[0].lang,'ja');
 assert.equal(r.cache.posts[event.id].texts.ja,undefined);assert.equal(r.cache.posts[event.id].fullTexts.ja,undefined);assert.equal(r.cache.posts[event.id].fullTexts.fr,good.fr);
 assert.equal(r.cache.posts['independent-history'].texts.es,undefined);assert.equal(r.cache.posts['independent-history'].fullTexts.de,undefined);
 for(const field of ['texts','fullTexts'])for(const lang of translationLanguages)if(!['ja','fr'].includes(lang))assert.equal(r.cache.posts[event.id][field][lang],current[field][lang]);
 assert.equal(r.cache.posts[event.id].translatedAt,current.translatedAt);assert.equal(r.cache.posts[event.id].contentHash,event.contentHash);assert.equal(r.cache.posts[event.id].fullText,event.fullText);
 }
});

test('independent historical corruption is persisted even with no current events or network requests',async()=>{
 const historical=entry();historical.fullTexts.es=error;historical.texts.ja=jaError;const cache={version:1,pending:7,lastAttemptAt:'2026-11-01T00:00:00Z',posts:{history:historical}};
 const expected=structuredClone(cache);delete expected.posts.history.fullTexts.es;delete expected.posts.history.texts.ja;
 const r=await runTranslator(cache,[],{});assert.deepEqual(r.requests,[]);assert.deepEqual(r.cache,expected);
});

test('failed summary validation cannot half-commit a full translation or replace an already valid full cache',async()=>{
 for(const prior of [undefined,good.fr]){
  const e=entry();delete e.texts.fr;if(prior)e.fullTexts.fr=prior;else delete e.fullTexts.fr;
  const r=await runTranslator({version:1,posts:{[event.id]:e}},[event],{fr:payload('fr','La nouvelle fonction est disponible.')},1);
  assert.equal(r.cache.posts[event.id].fullTexts.fr,prior);assert.equal(r.cache.posts[event.id].texts.fr,undefined);assert.equal(r.cache.posts[event.id].translatedAt,e.translatedAt);
 }
 const e=entry();delete e.texts.es;const r=await runTranslator({version:1,posts:{[event.id]:e}},[event],{es:payload('es',error)},1);assert.equal(r.cache.posts[event.id].fullTexts.es,good.es);assert.equal(r.cache.posts[event.id].texts.es,undefined);
});

test('repeated provider errors never return to either cache, and valid French/Spanish fill once then skip safely',async()=>{
 let e=entry();for(const l of ['fr','es']){delete e.texts[l];delete e.fullTexts[l];}
 let cache={version:1,posts:{[event.id]:e}};
 for(let i=0;i<2;i++){
  const r=await runTranslator(cache,[event],{fr:payload('fr',error),es:payload('es',error)},2);cache=r.cache;assert.equal(r.requests.length,2);for(const l of ['fr','es']){assert.equal(cache.posts[event.id].texts[l],undefined);assert.equal(cache.posts[event.id].fullTexts[l],undefined);}
 }
 const goodRun=await runTranslator(cache,[event],{fr:payload('fr',good.fr),es:payload('es',good.es)},2);
 for(const l of ['fr','es']){assert.equal(goodRun.cache.posts[event.id].texts[l],good[l]);assert.equal(goodRun.cache.posts[event.id].fullTexts[l],good[l]);}
 const skipped=await runTranslator(goodRun.cache,[event],{});assert.deepEqual(skipped.requests,[]);assert.deepEqual(skipped.cache,goodRun.cache);
});

test('actual nine-language build blocks legacy provider errors and preserves current source evidence',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'provider-build-'));
 try{
  for(const p of ['scripts','data','public/assets'])await mkdir(join(dir,p),{recursive:true});await cp(new URL('../src/',import.meta.url),join(dir,'src'),{recursive:true});await copyFile(new URL('../scripts/build.mjs',import.meta.url),join(dir,'scripts/build.mjs'));
  for(const f of ['health.json','platforms.json','topic-heat.json'])await copyFile(new URL('../data/'+f,import.meta.url),join(dir,'data',f));
  for(const f of ['social.jpg','drummer-poster.webp','drummer-atlas.webp'])await copyFile(new URL('../public/assets/'+f,import.meta.url),join(dir,'public/assets',f));
  const historical=events.find(e=>e.id==='2113162413008884099'),a=entry(),b={...entry(),excerpt:historical.excerpt,fullText:historical.fullText,contentHash:historical.contentHash};a.fullTexts.fr=error;a.fullTexts.es=error;b.texts.ja=jaError;b.fullTexts.ja=error;
  const source=JSON.stringify([event,historical]),cache={version:1,posts:{[event.id]:a,[historical.id]:b}};await writeFile(join(dir,'data/events.json'),source);await writeFile(join(dir,'data/translations.json'),JSON.stringify(cache));
  const r=spawnSync(process.execPath,[join(dir,'scripts/build.mjs')],{encoding:'utf8',timeout:30000});assert.equal(r.status,0,r.stderr);assert.equal(await readFile(join(dir,'data/events.json'),'utf8'),source);
  for(const lang of translationLanguages.concat('en')){
   const home=await readFile(join(dir,'dist',lang,'index.html'),'utf8'),detail=await readFile(join(dir,'dist',lang,'events',event.id,'index.html'),'utf8');
   for(const html of [home,detail]){const visible=html.split('<script id="page-data"')[0];assert.ok(!visible.includes('older version of DeepL'));assert.ok(!visible.includes(jaError));assert.ok(visible.includes(event.sourceUrl));}
   if(['fr','es'].includes(lang))assert.ok(detail.includes('post-preview" lang="en"'));
  }
  const history=await readFile(join(dir,'dist/ja/events',historical.id,'index.html'),'utf8');assert.ok(!history.split('<script id="page-data"')[0].includes(jaError));assert.ok(history.includes('原文・翻訳待ち'));
  const built=JSON.parse(await readFile(join(dir,'dist/events.json'),'utf8'));for(const original of [event,historical]){const out=built.find(e=>e.id===original.id);for(const key of ['fullText','contentHash','kind','state','sourceUrl','publishedAt','verifiedAt'])assert.equal(out[key],original[key]);}
 }finally{await rm(dir,{recursive:true,force:true});}
});
