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
