import {escapeHtml as e} from './shared.mjs';
// This is a current presentation of a historical grant, never a change to its
// reported state, source text, content hash or a user's redemption status.
const source={id:'2104641323198472430',author:'claudedevs',url:'https://x.com/ClaudeDevs/status/2104641323198472430',hash:'899d99d26a6c3a5e02d399eb3448343816e5a28dbf1e4988c9e7281058982d3b',text:'Sonnet 5.5 is available now in the Claude Platform and Claude Code.\n\nWe granted all Pro, Max, and Team users a reset last Tuesday. If you haven’t used it yet, you can still apply it whenever you want, before Oct 22.'};
const beforeDate='2026-10-22',day=86400000,date=Date.parse(beforeDate+'T00:00:00Z');
export function creditAvailability(event,now=Date.now()) {
 if(event?.id!==source.id||event.author?.toLowerCase()!==source.author||event.sourceUrl!==source.url||event.kind!=='banked'||event.state!=='reported'||event.truncated)return null;
 // Old or changed evidence must not inherit a checked expiry from identity alone.
 if(event.fullText!==source.text||event.contentHash!==source.hash||event.publishedAt!=='2026-09-28T18:36:08.452Z'||!Number.isFinite(now))return {state:'unknown'};
 // The source supplies only a calendar date, without timezone. Use a generous
 // two-day UTC uncertainty envelope. These are internal conservative bounds,
 // not an asserted official cutoff or a timestamp to display/count down to.
 return {state:now<date-day?'before':now<date+day?'boundary':'expired',beforeDate,timezone:null};
}
const rows={
 en:['Granted · date-limited','Deadline boundary · availability uncertain','Expired · historical grant','Historical grant · availability unverified','Source deadline: before {date}; timezone unspecified.','If unused, follow the source deadline.','Current availability is uncertain at this date boundary.','The redemption period has passed.','Whether you used the credit is unknown.','Current terms are unverified; this historical record does not establish an unused credit.'],
 zh:['已发放 · 有使用期限','日期边界 · 可用性待确认','已过期 · 历史发放记录','历史发放记录 · 可用性未核实','原文要求在{date}之前使用，未注明时区。','如尚未使用，请遵循原文期限。','目前处于日期边界，能否使用尚不确定。','使用期限已过。','无法判断你是否已使用这次重置。','当前条款未核实；历史记录不代表账号仍有未使用的重置。'],
 'zh-Hant':['已發放 · 有使用期限','日期邊界 · 可用性待確認','已過期 · 歷史發放紀錄','歷史發放紀錄 · 可用性未核實','原文要求在{date}之前使用，未註明時區。','如尚未使用，請遵循原文期限。','目前處於日期邊界，能否使用尚不確定。','使用期限已過。','無法判斷你是否已使用這次重置。','目前條款未核實；歷史紀錄不代表帳號仍有未使用的重置。'],
 ja:['付与済み · 利用期限あり','期限日の境界 · 利用可否は未確認','期限切れ · 過去の付与記録','過去の付与記録 · 利用可否は未確認','原文の期限：{date}より前。タイムゾーンは未記載。','未使用の場合は原文の期限に従ってください。','日付の境界にあたり、現在の利用可否は不明です。','利用期限は過ぎています。','すでに使用したかどうかは分かりません。','現在の条件は未確認です。過去の記録は未使用の権利が残っていることを示しません。'],
 ko:['지급됨 · 사용 기한 있음','기한 날짜 경계 · 사용 가능 여부 미확인','만료됨 · 과거 지급 기록','과거 지급 기록 · 사용 가능 여부 미확인','원문 기한: {date} 이전. 시간대는 명시되지 않았습니다.','미사용 상태라면 원문의 기한을 따르세요.','날짜 경계에 있어 현재 사용 가능 여부는 불확실합니다.','사용 기한이 지났습니다.','이미 사용했는지는 알 수 없습니다.','현재 조건은 미확인입니다. 과거 기록이 미사용 초기화가 남아 있음을 뜻하지는 않습니다.'],
 es:['Concedido · con fecha límite','Límite de fecha · disponibilidad incierta','Caducado · concesión histórica','Concesión histórica · disponibilidad no verificada','Plazo de la fuente: antes del {date}; sin zona horaria indicada.','Si no se ha usado, sigue el plazo de la fuente.','La disponibilidad actual es incierta en este límite de fecha.','El plazo de uso ha terminado.','No se sabe si ya utilizaste el crédito.','Las condiciones actuales no están verificadas; este registro histórico no acredita un crédito sin usar.'],
 fr:['Accordé · durée limitée','Limite de date · disponibilité incertaine','Expiré · attribution historique','Attribution historique · disponibilité non vérifiée','Échéance indiquée : avant le {date} ; fuseau horaire non précisé.','Si le crédit est inutilisé, suivez le délai de la source.','La disponibilité actuelle est incertaine à cette limite de date.','La période d’utilisation est terminée.','Nous ne savons pas si vous avez déjà utilisé le crédit.','Les conditions actuelles ne sont pas vérifiées ; cet historique ne prouve pas qu’un crédit reste inutilisé.'],
 de:['Gewährt · zeitlich begrenzt','Datumsgrenze · Verfügbarkeit unklar','Abgelaufen · historische Gewährung','Historische Gewährung · Verfügbarkeit ungeprüft','Frist laut Quelle: vor dem {date}; Zeitzone nicht angegeben.','Falls ungenutzt, beachte die Frist der Quelle.','An dieser Datumsgrenze ist die aktuelle Verfügbarkeit unklar.','Der Nutzungszeitraum ist abgelaufen.','Ob du das Guthaben bereits genutzt hast, ist unbekannt.','Aktuelle Bedingungen sind ungeprüft; dieser historische Eintrag belegt kein ungenutztes Guthaben.'],
 ar:['مُنح · له مهلة استخدام','حد التاريخ · الإتاحة غير مؤكدة','منتهي الصلاحية · سجل منح سابق','سجل منح سابق · الإتاحة غير متحققة','مهلة المصدر: قبل {date}؛ لم تُذكر المنطقة الزمنية.','إذا لم يُستخدم، فاتبع مهلة المصدر.','الإتاحة الحالية غير مؤكدة عند حد هذا التاريخ.','انتهت فترة الاستخدام.','لا نعرف ما إذا كنت قد استخدمت الرصيد.','الشروط الحالية غير متحققة؛ لا يثبت هذا السجل السابق وجود رصيد غير مستخدم.'],
};
export function creditPresentation(event,lang='en',now=Date.now()) {
 const terms=creditAvailability(event,now);if(!terms)return null;
 const r=rows[lang]||rows.en,index={before:0,boundary:1,expired:2,unknown:3}[terms.state];
 const formatted=terms.beforeDate?new Intl.DateTimeFormat(lang,{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'}).format(new Date(terms.beforeDate+'T12:00:00Z')):null;
 return {...terms,label:r[index],note:terms.state==='unknown'?r[9]:[r[4].replace('{date}',formatted),r[{before:5,boundary:6,expired:7}[terms.state]],r[8]].join(' ')};
}
export function creditStatusAttributes(event,now=Date.now()) {const p=creditAvailability(event,now);return p?`data-credit-status="${e(event.id)}" data-credit-state="${p.state}"`:"";}
export function creditStatusMarkup(event,lang,now=Date.now()) {const p=creditPresentation(event,lang,now);return p?`<span data-credit-status="${e(event.id)}" data-credit-state="${p.state}">${e(p.label)}</span>`:'';}
export function creditNoticeMarkup(event,lang,now=Date.now(),className='') {const p=creditPresentation(event,lang,now);return p?`<p class="credit-availability ${e(className)}" data-credit-note="${e(event.id)}" data-credit-state="${p.state}">${e(p.note)}</p>`:'';}
export function eventStateClass(event,now=Date.now()) {const state=creditAvailability(event,now)?.state;return state==='expired'?'expired':['boundary','unknown'].includes(state)?'unconfirmed':event.state;}
// Called on a timer and after refreshed data. An old open tab must age across
// the calendar boundary without changing the historical source record.
export function refreshCreditViews(root,events,lang,now=Date.now()) {
 const records=new Map(events.map(event=>[event.id,event]));
 const title=root.querySelector('title[data-credit-title]');if(title){const p=creditPresentation(records.get(title.dataset.creditTitle),lang,now);if(p)title.textContent=title.dataset.creditTitlePrefix+' · '+p.label+' | Codex & Claude Resets';}
 for(const selector of ['[data-credit-status]','[data-credit-note]'])for(const el of root.querySelectorAll(selector)){
  const event=records.get(el.dataset.creditStatus||el.dataset.creditNote),p=creditPresentation(event,lang,now);if(!p)continue;
  el.dataset.creditState=p.state;el.textContent=el.dataset.creditStatus?p.label:p.note;
  if(el.classList.contains('badge'))el.className='badge '+eventStateClass(event,now);
 }
}
