import {readFile,writeFile,rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {translationLanguages} from '../src/post-text.mjs';
import {parsePostUrl} from '../src/evidence.mjs';

const root=new URL('../',import.meta.url),file=new URL('data/translations.json',root);
const targetCodes={zh:'zh-cn','zh-Hant':'zh-tw',ja:'ja',ko:'ko',es:'es',fr:'fr',de:'de',ar:'ar'};
const vocabulary={zh:/重置|用量|额度|限额|限制|使用量/,'zh-Hant':/重置|用量|額度|限額|限制|使用量/,ja:/リセット|利用|使用|制限|上限/,ko:/초기화|재설정|리셋|사용|한도|제한/,es:/restablec|reinici|uso|límite|cuota/i,fr:/réinitial|utilisation|limite|quota/i,de:/zurücksetz|reset|nutzung|limit|kontingent/i,ar:/إعادة|استخدام|حدود|حصة|حصص/};
const normalize=text=>String(text).replace(/https?:\/\/\S+/g,'').replace(/(?:^|\s)@[\w]+/g,' ').replace(/[’‘]/g,"'").replace(/…|\.{3}/g,'').replace(/\s+/g,' ').trim();

// Preserve the source's authored breaks; responsive wrapping remains CSS's job.
export function matchSourceBreaks(source,text){
 const breaks=String(source).trim().match(/\r?\n+/g)||[];
 const parts=String(text).trim().split(/\r?\n+/).map(part=>part.trim());
 if(!breaks.length)return parts.reduce((joined,part)=>joined+(joined&& !/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}。，！？]$/u.test(joined)&&! /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(part)?' ':'')+part,'');
 if(parts.length!==breaks.length+1)throw Error('Translation paragraph structure differs from source');
 return parts.map((part,i)=>part+(breaks[i]?.replace(/\r/g,'')||'')).join('');
}

export function translationFromResponse(event,lang,payload,full=false){
 const post=payload?.status,translation=post?.translation,url=parsePostUrl(post?.url);
 if(payload?.code!==200||String(post?.id)!==event.id||!url||url.id!==event.id||url.author.toLowerCase()!==event.author.toLowerCase()||post.author?.screen_name?.toLowerCase()!==event.author.toLowerCase()||post.author?.protected)throw Error('Translation source identity mismatch');
 if(typeof post.text!=='string'||!normalize(post.text).includes(normalize(event.excerpt)))throw Error('Translation source text changed');
 if(typeof translation?.text!=='string'||translation.text.length>20000||translation.target_lang?.toLowerCase()!==targetCodes[lang]||!translation.text.trim())throw Error('Translation unavailable');
 if(full){
  if(!event.fullText||normalize(post.raw_text?.text||post.text)!==normalize(event.fullText))throw Error('Full translation source text changed');
  const text=matchSourceBreaks(event.fullText,translation.text);
  for(const name of ['ChatGPT Work','Claude Code','ChatGPT','Codex','Astra','Fable'])if(event.fullText.includes(name)&&!text.includes(name))throw Error('Product name lost in translation');
  if(/banked reset/i.test(event.fullText)&&/银行|銀行|은행|bancari|bancaire|bankier|banking|مصرف|銀行預金/i.test(text))throw Error('Reset credit terminology needs review');
  return text;
 }
 // Select only the relevant translated sentence, never prepend quoted lyrics,
 // unrelated opening paragraphs, links or a guessed reset time.
 const sentences=translation.text.replace(/https?:\/\/\S+/g,'').replace(/(?:^|\s)@[\w]+/g,' ').split(/(?<=[.!?。！？])\s*|\n+/u).map(s=>s.trim()).filter(Boolean);
 const selected=sentences.find(s=>vocabulary[lang].test(s));
 if(!selected||normalize(selected)===normalize(event.excerpt))throw Error('No relevant translated excerpt');
 for(const name of ['ChatGPT Work','Claude Code','ChatGPT','Codex','Astra','Fable'])if(event.excerpt.includes(name)&&!selected.includes(name))throw Error('Product name lost in translation');
 if(/banked reset/i.test(event.excerpt)&&/银行|銀行|은행|bancari|bancaire|bankier|banking|مصرف|銀行預金/i.test(selected))throw Error('Reset credit terminology needs review');
 const max=['zh','zh-Hant','ja','ko'].includes(lang)?190:380;
 const chars=Array.from(selected);
 let text=selected;
 if(chars.length>max){text=chars.slice(0,max).join('');if(!['zh','zh-Hant','ja','ko'].includes(lang))text=text.replace(/\s+\S*$/u,'');text+='…';}
 return text;
}

async function main(){
 const events=JSON.parse(await readFile(new URL('data/events.json',root),'utf8'));
 let cache={version:1,posts:{}};try{cache=JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 const before=JSON.stringify(cache);
 const pending=[];
 for(const event of events){
  let entry=cache.posts[event.id];
  if(!entry||entry.excerpt!==event.excerpt||entry.contentHash!==event.contentHash)entry=cache.posts[event.id]={excerpt:event.excerpt,contentHash:event.contentHash,texts:{}};
  if(entry.fullText!==event.fullText){entry.fullText=event.fullText;entry.fullTexts={};}
  entry.fullTexts||={};
  if(event.fullText&&normalize(event.fullText)===normalize(event.excerpt))for(const lang of translationLanguages)if(entry.texts[lang])entry.fullTexts[lang]||=entry.texts[lang];
  for(const lang of translationLanguages)if(!entry.texts[lang]||(event.fullText&&!entry.fullTexts[lang]))pending.push({event,lang,entry});
 }
 if(!pending.length){if(JSON.stringify(cache)!==before)await writeFile(file,JSON.stringify(cache,null,2)+'\n');console.log('Translations ready; no requests.');return;}
 const budget=Math.min(Number(process.env.TRANSLATION_REQUEST_LIMIT)||400,400),queue=pending.slice(0,budget);let done=0,failed=0,cursor=0;
 async function worker(){while(cursor<queue.length){const {event,lang,entry}=queue[cursor++];try{
  const response=await fetch(`https://api.fxtwitter.com/2/status/${event.id}?lang=${targetCodes[lang]}`,{headers:{'User-Agent':'CodexClaudeResets/1.0 (cached public post translations)'},signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error(`HTTP ${response.status}`);
  const payload=await response.json();
  if(event.fullText)entry.fullTexts[lang]=translationFromResponse(event,lang,payload,true);
  if(!entry.texts[lang])entry.texts[lang]=translationFromResponse(event,lang,payload);
  entry.provider='FxEmbed';entry.translatedAt=new Date().toISOString();done++;
 }catch(error){failed++;console.warn(`Translation pending ${event.id}/${lang}: ${error.message}`);}
 await new Promise(resolve=>setTimeout(resolve,180));
 }}
 await Promise.all([worker(),worker()]);
 cache.lastAttemptAt=new Date().toISOString();cache.pending=pending.length-done;
 const temporary=fileURLToPath(file)+'.tmp';await writeFile(temporary,JSON.stringify(cache,null,2)+'\n');await rename(temporary,fileURLToPath(file));
 console.log(JSON.stringify({translated:done,failed,pending:cache.pending,cachedPosts:Object.keys(cache.posts).length}));
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])await main();
