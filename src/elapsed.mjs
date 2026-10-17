export const elapsedLabel={en:'Since last reset completion report',zh:'距上次重置完成公告','zh-Hant':'距上次重置完成公告',ja:'前回のリセット完了報告から',ko:'마지막 초기화 완료 보고 이후',es:'Desde el último aviso de restablecimiento completado',fr:'Depuis le dernier avis de réinitialisation terminée',de:'Seit der letzten Reset-Abschlussmeldung',ar:'منذ آخر إعلان عن اكتمال إعادة الضبط'};
export function elapsedSince(at,lang,now=Date.now()){
 const stamp=Date.parse(at);if(!Number.isFinite(stamp)||stamp>now)return '—';
 const minutes=Math.floor((now-stamp)/60000),days=Math.floor(minutes/1440),hours=Math.floor(minutes/60)%24;
 const unit=(value,name)=>new Intl.NumberFormat(lang,{style:'unit',unit:name,unitDisplay:'short'}).format(value);
 if(days)return unit(days,'day')+(hours?' '+unit(hours,'hour'):'');
 if(minutes>=60)return unit(Math.floor(minutes/60),'hour')+(minutes%60?' '+unit(minutes%60,'minute'):'');
 return unit(minutes,'minute');
}
