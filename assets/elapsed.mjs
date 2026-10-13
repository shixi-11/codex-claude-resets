export const elapsedLabel={en:'Since last reset announcement',zh:'距上次重置公告','zh-Hant':'距上次重置公告',ja:'前回のリセット告知から',ko:'마지막 초기화 공지 이후',es:'Desde el último anuncio de restablecimiento',fr:'Depuis la dernière annonce de réinitialisation',de:'Seit der letzten Reset-Ankündigung',ar:'منذ آخر إعلان لإعادة الضبط'};
export function elapsedSince(at,lang,now=Date.now()){
 const stamp=Date.parse(at);if(!Number.isFinite(stamp)||stamp>now)return '—';
 const minutes=Math.floor((now-stamp)/60000),days=Math.floor(minutes/1440),hours=Math.floor(minutes/60)%24;
 const unit=(value,name)=>new Intl.NumberFormat(lang,{style:'unit',unit:name,unitDisplay:'short'}).format(value);
 if(days)return unit(days,'day')+(hours?' '+unit(hours,'hour'):'');
 if(minutes>=60)return unit(Math.floor(minutes/60),'hour')+(minutes%60?' '+unit(minutes%60,'minute'):'');
 return unit(minutes,'minute');
}
