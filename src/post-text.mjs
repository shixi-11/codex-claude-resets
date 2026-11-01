import {escapeHtml as e} from './shared.mjs';

export const translationLanguages=['zh','zh-Hant','ja','ko','es','fr','de','ar'];
const labels={en:['Translation','Original text; translation pending'],zh:['译文','原文 · 译文待更新'],'zh-Hant':['譯文','原文 · 譯文待更新'],ja:['翻訳','原文・翻訳待ち'],ko:['번역','원문 · 번역 대기 중'],es:['Traducción','Original · traducción pendiente'],fr:['Traduction','Original · traduction en attente'],de:['Übersetzung','Original · Übersetzung ausstehend'],ar:['ترجمة','النص الأصلي · الترجمة قيد الانتظار']};

// A translation belongs to an exact source version, never just a post ID.
export function translatedText(event,lang){
 const entry=event?.localized;
 const text=entry?.texts?.[lang];
 const valid=entry?.excerpt===event?.excerpt&&entry?.contentHash===event?.contentHash&&typeof text==='string'&&text.trim()&&text.length<=1200;
 return lang!=='en'&&valid?{text,lang,translated:true}:{text:event?.excerpt||'',lang:'en',translated:false};
}
export function postText(event,lang,className='excerpt',tag='p'){
 const value=translatedText(event,lang),label=labels[lang]||labels.en;
 const preview=`<${tag} class="${className}" lang="${e(value.lang)}" dir="${value.lang==='ar'?'rtl':'ltr'}">${e(value.text)}</${tag}>${lang==='en'?'':`<small class="translation-note">${e(label[value.translated?0:1])}</small>`}`;
 if(!event.fullText||event.truncated)return preview;
 const entry=event.localized,translated=lang!=='en'&&entry?.contentHash===event.contentHash&&entry?.fullText===event.fullText&&typeof entry?.fullTexts?.[lang]==='string'&&entry.fullTexts[lang].trim();
 const full=translated?entry.fullTexts[lang]:event.fullText,fullLang=translated?lang:'en',actions=expandLabels[lang]||expandLabels.en;
 const continuousPreview=`<${tag} class="${className} post-preview" lang="${e(fullLang)}" dir="${fullLang==='ar'?'rtl':'ltr'}">${e(full)}</${tag}>${lang==='en'?'':`<small class="translation-note">${e(label[translated?0:1])}</small>`}`;
 return `<div class="post-body">${continuousPreview}<details class="post-full" data-post-id="${e(event.id)}"><summary><span class="expand-label">${e(actions[0])}</span><span class="collapse-label">${e(actions[1])}</span></summary><${tag} class="full-post-text ${className}" lang="${e(fullLang)}" dir="${fullLang==='ar'?'rtl':'ltr'}">${e(full)}</${tag}>${lang==='en'?'':`<small class="translation-note">${e(label[translated?0:1])}</small>`}</details></div>`;
}
const expandLabels={en:['Read full post','Show less'],zh:['展开全文','收起全文'],'zh-Hant':['展開全文','收起全文'],ja:['全文を表示','折りたたむ'],ko:['전체 글 보기','접기'],es:['Leer publicación completa','Mostrar menos'],fr:['Lire la publication complète','Réduire'],de:['Vollständigen Beitrag lesen','Weniger anzeigen'],ar:['عرض المنشور كاملاً','عرض أقل']};

// Reviewed short progress wording, bound to the exact official source version.
// “Banked” means saved reset credit here, not a financial bank or a global reset.
export function reviewedTranslation(event,cached){
 const day26='Day 26/ You can now easily switch between multiple accounts on mobile, and coming soon to desktop too. Next two days will be resets… banked… do with this what you may 👀.';
 if(event?.id==='2116405414921384099'&&event.author==='thsottiaux'&&event.contentHash==='e2414b20f80c27ddb3f6ab34633d145fe83117f623f30b88cc9993e65fd6eee4'&&event.fullText===day26&&event.excerpt==='Next two days will be resets… banked… do with this what you may 👀.'){
  const base=cached?.contentHash===event.contentHash&&cached?.fullText===event.fullText&&cached?.excerpt===event.excerpt?cached:{};
  const texts={fr:'Les deux prochains jours, il y aura des réinitialisations à conserver pour plus tard… à vous d’en faire ce que vous voulez 👀.',ko:'앞으로 이틀 동안은 나중에 사용할 수 있도록 저장해 두는 리셋입니다… 이걸 어떻게 활용할지는 여러분에게 맡길게요 👀.'};
  const fullTexts={fr:'Jour 26/ Vous pouvez désormais passer facilement d’un compte à l’autre sur mobile ; cette fonction arrivera bientôt aussi sur ordinateur. '+texts.fr,ko:'26일째 / 이제 모바일에서 여러 계정 간에 쉽게 전환할 수 있으며, 데스크톱에서도 곧 지원될 예정입니다. '+texts.ko};
  return {...base,excerpt:event.excerpt,fullText:event.fullText,contentHash:event.contentHash,texts:{...base.texts,...texts},fullTexts:{...base.fullTexts,...fullTexts},reviewedLanguages:['fr','ko']};
 }

 if(event?.id==='2116942192497533418'&&event.author==='thsottiaux'&&event.contentHash==='3406c8366e6f3c4fee5116f672dc271f41189762ec5b12d3a72d907633441600'&&event.fullText==='I demand a banked reset'&&event.excerpt===event.fullText){
  const texts={zh:'我要求来一次可储存的重置','zh-Hant':'我要求來一次可儲存的重置',ja:'ストックできるリセットを要求します',ko:'저장해 둘 수 있는 초기화를 요구합니다',es:'Exijo un restablecimiento que pueda guardar',fr:'Je réclame une réinitialisation à mettre en réserve',de:'Ich fordere einen Reset zum Aufsparen',ar:'أطالب بإعادة ضبط يمكن ادخارها'};
  return {excerpt:event.excerpt,fullText:event.fullText,contentHash:event.contentHash,texts,fullTexts:{...texts},provider:'editorial-review'};
 }
 if(event?.id!=='2116692529970311254'||event.author!=='thsottiaux'||event.contentHash!=='5915a6e0f9c1c184eb0caed04eecc59fbe1f2da78ff5a27d7c826b55be5b9c06'||event.fullText!=='Banked 1/2'||event.excerpt!=='Banked 1/2')return null;
 const texts={zh:'已储存 1/2','zh-Hant':'已儲存 1/2',ja:'ストック済み 1/2',ko:'적립 완료 1/2',es:'Guardado 1/2',fr:'Mis en réserve 1/2',de:'Gespeichert 1/2',ar:'تم الادخار 1/2'};
 return {excerpt:event.excerpt,fullText:event.fullText,contentHash:event.contentHash,texts,fullTexts:{...texts},provider:'editorial-review'};
}
