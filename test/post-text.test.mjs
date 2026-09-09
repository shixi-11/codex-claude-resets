import test from 'node:test';
import assert from 'node:assert/strict';
import {postText,translatedText} from '../src/post-text.mjs';
import {translationFromResponse} from '../scripts/translate.mjs';
const event={id:'2097183639356489952',author:'thsottiaux',excerpt:'We reset usage.',contentHash:'abc'};
const payload=(text='我们已重置额度。')=>({code:200,status:{id:event.id,url:`https://x.com/thsottiaux/status/${event.id}`,author:{screen_name:'thsottiaux',protected:false},text:event.excerpt,translation:{text,target_lang:'zh-cn'}}});
test('full translation retains the second sentence and rejects changed full sources',()=>{
 const full={...event,fullText:event.excerpt+' Everyone affected receives another credit.'};
 const response=payload('我们已重置额度。所有受影响的用户都会再获得一次重置机会。');response.status.text=full.fullText;
 assert.equal(translationFromResponse(full,'zh',response,true),response.status.translation.text);
 assert.throws(()=>translationFromResponse({...full,fullText:full.fullText+' Changed.'},'zh',response,true));
});
test('both platforms get accessible collapsed full text with version-bound translations',()=>{
 for(const author of ['thsottiaux','ClaudeDevs']){
 const full={...event,author,fullText:'We reset usage. Another sentence.',localized:{excerpt:event.excerpt,contentHash:'abc',texts:{zh:'我们已重置额度。'},fullText:'We reset usage. Another sentence.',fullTexts:{zh:'我们已重置额度。另一句话。'}}};
 const html=postText(full,'zh');assert.match(html,/<details class="post-full"/);assert.match(html,/展开全文/);assert.match(html,/另一句话/);assert.doesNotMatch(html,/<details[^>]* open/);
 full.localized.fullText='Old text';assert.match(postText(full,'zh'),/Another sentence/);assert.doesNotMatch(postText(full,'zh'),/另一句话/);
 }
});
test('translated text is bound to both exact excerpt and source version',()=>{
 const localized={excerpt:event.excerpt,contentHash:'abc',texts:{zh:'我们已重置额度。'}};
 assert.equal(translatedText({...event,localized},'zh').lang,'zh');
 assert.equal(translatedText({...event,localized,excerpt:'We may reset usage.'},'zh').translated,false);
 assert.equal(translatedText({...event,localized,contentHash:'changed'},'zh').translated,false);
 assert.equal(translatedText({...event,localized},'en').text,event.excerpt);
});
test('missing translation is explicitly identified and rendered as English',()=>{
 const html=postText(event,'zh');assert.match(html,/lang="en"/);assert.match(html,/译文待更新/);
});
test('Arabic translation uses RTL while untrusted markup stays escaped',()=>{
 const html=postText({...event,localized:{excerpt:event.excerpt,contentHash:'abc',texts:{ar:'تمت إعادة الضبط <script>alert(1)</script>'}}},'ar');
 assert.match(html,/dir="rtl"/);assert.ok(!html.includes('<script>'));assert.match(html,/&lt;script&gt;/);
});
test('translation API response must match the verified source and target language',()=>{
 assert.equal(translationFromResponse(event,'zh',payload()),'我们已重置额度。');
 const wrong=payload();wrong.status.author.screen_name='someoneelse';assert.throws(()=>translationFromResponse(event,'zh',wrong));
 const changed=payload();changed.status.text='No reset is planned.';assert.throws(()=>translationFromResponse(event,'zh',changed));
 const locale=payload();locale.status.translation.target_lang='ja';assert.throws(()=>translationFromResponse(event,'zh',locale));
});
test('wrong banking terminology and lost product names do not get published',()=>{
 const bank={...event,excerpt:'A banked reset for Astra.'},p=payload('为 Astra 提供银行重置。');p.status.text=bank.excerpt;
 assert.throws(()=>translationFromResponse(bank,'zh',p));
 p.status.translation.text='重置卡已准备好。';assert.throws(()=>translationFromResponse(bank,'zh',p));
});
