import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewedTranslation,postText} from '../src/post-text.mjs';
const event={id:'2116405414921384099',author:'thsottiaux',contentHash:'e2414b20f80c27ddb3f6ab34633d145fe83117f623f30b88cc9993e65fd6eee4',fullText:'Day 26/ You can now easily switch between multiple accounts on mobile, and coming soon to desktop too. Next two days will be resets… banked… do with this what you may 👀.',excerpt:'Next two days will be resets… banked… do with this what you may 👀.'};
test('Day26 FR/KO preserve saved-for-later meaning and unrelated languages',()=>{
 const cached={...event,texts:{zh:'保留现有中文',fr:'mis en banc',ko:'은행에 예치'},fullTexts:{zh:'保留现有全文',fr:'redémarrés',ko:'은행에 예치'}};
 const entry=reviewedTranslation(event,cached);
 assert.equal(entry.texts.zh,cached.texts.zh);assert.equal(entry.fullTexts.zh,cached.fullTexts.zh);
 assert.match(entry.fullTexts.fr,/à conserver pour plus tard/);assert.match(entry.fullTexts.ko,/나중에 사용할 수 있도록 저장해 두는/);
 for(const lang of ['fr','ko'])assert.doesNotMatch(postText({...event,localized:entry},lang),/mis en banc|redémarrés|은행에 예치/);
 assert.deepEqual(cached.texts,{zh:'保留现有中文',fr:'mis en banc',ko:'은행에 예치'});
});
test('Day26 correction does not inherit amended sources or stale language caches',()=>{
 for(const change of [{id:'123'},{author:'OpenAI'},{contentHash:'0'.repeat(64)},{fullText:event.fullText+' Correction.'},{excerpt:'Changed'}])assert.equal(reviewedTranslation({...event,...change}),null);
 assert.equal(reviewedTranslation(event,{...event,contentHash:'0'.repeat(64),texts:{zh:'stale'},fullTexts:{zh:'stale'}}).texts.zh,undefined);
});
