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
 return `<${tag} class="${className}" lang="${e(value.lang)}" dir="${value.lang==='ar'?'rtl':'ltr'}">${e(value.text)}</${tag}>${lang==='en'?'':`<small class="translation-note">${e(label[value.translated?0:1])}</small>`}`;
}
