import {elapsedSince,elapsedLabel} from './elapsed.mjs';
import {postText} from './post-text.mjs';
import {visitorCopy} from './visitor-copy.mjs';
import {postPlatform,accountReportForReset} from './evidence.mjs';
import {watchCopy} from './watch-copy.mjs';
import {escapeHtml as e} from './shared.mjs';
import {localResetTime} from './reset-status.mjs';
const rows={
en:['Latest relevant post','Previous resets','Past 7 days','Completion announcement time; the exact reset time was not published.','No verified related post yet','Latest reset','Confirmed complete','Not a confirmed reset time'],
zh:['最新相关推文','前几次重置','最近7天','显示完成公告的发布时间；原文未给出精确重置时刻。','暂无已核实的相关推文','上次重置','已确认完成','未确认重置时间'],
'zh-Hant':['最新相關推文','前幾次重置','最近7天','顯示完成公告的發佈時間；原文未提供精確重置時刻。','暫無已核實的相關推文','上次重置','已確認完成','未確認重置時間'],
ja:['最新の関連投稿','過去のリセット','過去7日間','完了発表の投稿時刻です。正確なリセット時刻は公表されていません。','確認済みの関連投稿はありません','直近のリセット','完了確認済み','リセット時刻は未確認'],
ko:['최신 관련 게시물','이전 초기화','최근 7일','완료 발표가 게시된 시간입니다. 정확한 초기화 시각은 공개되지 않았습니다.','확인된 관련 게시물이 없습니다','최근 초기화','완료 확인됨','초기화 시간 미확인'],
es:['Última publicación relacionada','Restablecimientos anteriores','Últimos 7 días','Hora del anuncio de finalización; no se publicó la hora exacta del restablecimiento.','Aún no hay publicaciones verificadas','Último restablecimiento','Finalización confirmada','Hora de restablecimiento sin confirmar'],
fr:['Dernière publication pertinente','Réinitialisations précédentes','7 derniers jours','Heure de l’annonce de fin ; l’heure exacte de la réinitialisation n’a pas été publiée.','Aucune publication vérifiée pour le moment','Dernière réinitialisation','Fin confirmée','Horaire de réinitialisation non confirmé'],
de:['Neuester relevanter Beitrag','Frühere Resets','Letzte 7 Tage','Zeit der Abschlussmeldung; die genaue Reset-Uhrzeit wurde nicht veröffentlicht.','Noch kein bestätigter relevanter Beitrag','Letzter Reset','Abschluss bestätigt','Reset-Zeitpunkt nicht bestätigt'],
ar:['أحدث منشور ذي صلة','عمليات إعادة الضبط السابقة','آخر 7 أيام','وقت نشر إعلان الاكتمال؛ لم يُنشر وقت إعادة الضبط الدقيق.','لا توجد منشورات موثّقة بعد','آخر إعادة ضبط','تأكد الاكتمال','موعد إعادة الضبط غير مؤكّد']
};
const keys=['latest','previous','archive','timeNote','empty','last','complete','unconfirmed'];
export const priorityCopy=Object.fromEntries(Object.entries(rows).map(([lang,row])=>[lang,Object.fromEntries(keys.map((key,i)=>[key,row[i]]))]));
const belongs=(ev,id)=>postPlatform(ev.author)===id;
const sourceAction={en:'View original',zh:'查看原文','zh-Hant':'查看原文',ja:'原文を見る',ko:'원문 보기',es:'Ver original',fr:'Voir l’original',de:'Original ansehen',ar:'عرض المنشور الأصلي'};
const reportRows={
 en:['User reports a reset','Individual user report; no explicit official completion post verified. Reset time and plan coverage are unknown.','View user report','Report posted'],
 zh:['用户报告已重置','一位用户的报告；尚未核到官方明确完成公告。实际重置时刻与套餐覆盖范围未知。','查看用户报告','报告发布时间'],
 'zh-Hant':['使用者回報已重置','一位使用者的回報；尚未核實官方明確完成公告。實際重置時刻與方案涵蓋範圍未知。','查看使用者回報','回報發布時間'],
 ja:['ユーザーがリセットを報告','個人の報告です。公式の明確な完了発表は未確認です。実行時刻と対象プランは不明です。','ユーザーの報告を見る','報告の投稿時刻'],
 ko:['사용자 초기화 보고','개별 사용자 보고입니다. 공식 완료 발표는 확인되지 않았으며 실제 초기화 시각과 대상 요금제는 알 수 없습니다.','사용자 보고 보기','보고 게시 시각'],
 es:['Un usuario informa del restablecimiento','Informe individual; no se ha verificado un anuncio oficial de finalización. Se desconocen la hora y los planes cubiertos.','Ver informe del usuario','Informe publicado'],
 fr:['Un utilisateur signale la réinitialisation','Signalement individuel ; aucune annonce officielle explicite de fin vérifiée. Heure exacte et offres couvertes inconnues.','Voir le signalement','Signalement publié'],
 de:['Nutzer meldet Zurücksetzung','Einzelner Nutzerbericht; keine ausdrückliche offizielle Abschlussmeldung bestätigt. Zeitpunkt und Tarifabdeckung sind unbekannt.','Nutzerbericht ansehen','Bericht veröffentlicht'],
 ar:['مستخدم يبلغ عن إعادة الضبط','بلاغ فردي؛ لم يتم التحقق من إعلان رسمي صريح باكتمال العملية. وقت التنفيذ والخطط المشمولة غير معروفين.','عرض بلاغ المستخدم','وقت نشر البلاغ']
};
export const userReportCopy=Object.fromEntries(Object.entries(reportRows).map(([lang,row])=>[lang,Object.fromEntries(['title','note','source','posted'].map((key,i)=>[key,row[i]]))]));
const officialElapsed={en:'Since last official completion report',zh:'距上次官方明确完成公告','zh-Hant':'距上次官方明確完成公告',ja:'前回の公式完了報告から',ko:'마지막 공식 완료 보고 이후',es:'Desde el último aviso oficial de finalización',fr:'Depuis le dernier avis officiel de fin',de:'Seit der letzten offiziellen Abschlussmeldung',ar:'منذ آخر إعلان رسمي باكتمال العملية'};
for(const [lang,text]of Object.entries(officialElapsed))userReportCopy[lang].officialElapsed=text;
export function accountReportDetails(platform,lang){
 const report=accountReportForReset(platform.reset,platform.accountReports);if(!report)return '';
 const t=userReportCopy[lang];
 return `<div data-account-report><p class="tweet-meaning"><strong>${e(t.title)}</strong></p><p class="tweet-excerpt">${e(t.note)}</p><a class="tweet-source" href="${e(report.sourceUrl)}" target="_blank" rel="noopener noreferrer"><span>${e(t.source)} · @${e(report.author)}</span><span aria-hidden="true">↗</span></a><div class="priority-label"><span>${e(t.posted)}</span><time datetime="${e(report.publishedAt)}">${e(localResetTime(report.publishedAt,lang))}</time></div></div>`;
}
export function priorityDetails(platform,id,events,lang){
 const t=priorityCopy[lang],list=(events||[]).filter(ev=>belongs(ev,id)).sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
 const latest=list.find(ev=>['global','banked'].includes(ev.kind)&&['announced','reported'].includes(ev.state))||list[0]||platform.latest,last=platform.lastReset;
 const when=at=>localResetTime(at,lang);
 return `<div class="latest-post"><div class="priority-label"><span>${e(t.latest)}</span>${latest?`<time datetime="${e(latest.publishedAt)}">${e(when(latest.publishedAt))}</time>`:''}</div>${latest?`<a class="tweet-source" href="${e(latest.sourceUrl)}" target="_blank" rel="noopener noreferrer"><span>@${e(latest.author)}</span><span class="source-action"><span class="source-action-label">${e(sourceAction[lang])}</span><span class="source-arrow" aria-hidden="true">↗</span></span></a>${postText(latest,lang,'tweet-excerpt')}<p class="tweet-meaning"><span class="post-kind" data-kind="${e(latest.kind)}">${e(latest.reason==='replacement-credit'?replacementLabels[lang]:postKindLabel(latest.kind,lang))}</span> ${e(latest.kind==='global'&&latest.state==='reported'?t.complete:latest.state==='unconfirmed'?t.unconfirmed:postStateLabel(latest.state,lang))}</p>`:`<p>${e(t.empty)}</p>`}</div>
 ${accountReportDetails(platform,lang)}<div class="last-reset"><span>${e(accountReportForReset(platform.reset,platform.accountReports)?userReportCopy[lang].officialElapsed:elapsedLabel[lang])}</span><span data-last-reset data-reset-elapsed="${e(last?.publishedAt||'')}" title="${last?e(when(last.publishedAt)):''}">${last?e(elapsedSince(last.publishedAt,lang)):e(watchCopy[lang].noHistory)}</span></div>
`;
}
const kindRows={en:['Quota reset','Reset credit','Usage change','Unconfirmed signal'],zh:['额度重置','重置卡','额度变化','未确认线索'],'zh-Hant':['額度重置','重置卡','額度變化','未確認線索'],ja:['利用枠リセット','リセット権','利用枠の変更','未確認情報'],ko:['사용량 초기화','초기화 이용권','사용량 변경','미확인 정보'],es:['Restablecimiento','Crédito de restablecimiento','Cambio de uso','Indicio sin confirmar'],fr:['Réinitialisation','Crédit de réinitialisation','Changement d’utilisation','Information non confirmée'],de:['Limit-Reset','Reset-Guthaben','Nutzungsänderung','Unbestätigter Hinweis'],ar:['إعادة ضبط الحد','رصيد إعادة ضبط','تغيير الاستخدام','إشارة غير مؤكّدة']};
export function postKindLabel(kind,lang){return kindRows[lang][{global:0,banked:1,usage:2,signal:3}[kind]??3];}
const definitions={en:'A quota reset restores usage. A reset credit is a saved opportunity to reset later, redeemed by an eligible account. Extra-usage promotions increase limits and are not reset credits.',zh:'额度重置是恢复使用额度；重置卡是符合条件的账号可留到以后使用的重置机会，需要领取或使用时以活动说明为准。提高额度上限的活动不等于赠送重置卡。','zh-Hant':'額度重置是恢復使用額度；重置卡是符合條件的帳號可留到以後使用的重置機會，領取或使用方式以活動說明為準。提高額度上限的活動不等於贈送重置卡。',ja:'利用枠のリセットは利用可能量の回復です。リセット権は対象アカウントが後で使える機会で、利用方法は告知に従います。上限の増加特典はリセット権とは異なります。',ko:'초기화는 사용량 한도를 복원합니다. 초기화 이용권은 대상 계정이 나중에 사용할 수 있는 기회이며 사용 방법은 공지를 따릅니다. 한도 증가는 초기화 이용권 지급과 다릅니다.',es:'Un restablecimiento recupera uso disponible. Un crédito permite restablecerlo más adelante según las condiciones de la cuenta. Las promociones que amplían límites no son créditos de restablecimiento.',fr:'Une réinitialisation rétablit la capacité d’utilisation. Un crédit permet de la réinitialiser plus tard selon les conditions de l’offre. Une augmentation des limites n’est pas un crédit de réinitialisation.',de:'Ein Reset stellt Nutzungskapazität wieder her. Reset-Guthaben ermöglicht berechtigten Konten eine spätere Zurücksetzung gemäß den Angebotsbedingungen. Höhere Limits sind kein Reset-Guthaben.',ar:'تعيد عملية الضبط إتاحة الاستخدام. أما رصيد إعادة الضبط فهو فرصة تُستخدم لاحقًا للحسابات المؤهلة وفق شروط العرض. زيادة الحدود ليست رصيدًا لإعادة الضبط.'};
export const resetDefinitions=definitions;
// The seven-day feed includes the latest posts, even when featured above.
export function earlierPosts(events,now=Date.now()){return [...events].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).filter(ev=>{const at=Date.parse(ev.publishedAt);return Number.isFinite(at)&&at<=now&&at>=now-7*86400000;});}

const otherStates={en:['Announced','Information'],zh:['已公布','信息'],'zh-Hant':['已公布','資訊'],ja:['発表済み','情報'],ko:['발표됨','정보'],es:['Anunciado','Información'],fr:['Annoncé','Information'],de:['Angekündigt','Information'],ar:['أُعلن','معلومات']};
function postStateLabel(state,lang){return state==='announced'?otherStates[lang][0]:state==='reported'?({en:'Granted',zh:'已发放','zh-Hant':'已發放',ja:'付与済み',ko:'지급됨',es:'Concedido',fr:'Accordé',de:'Gewährt',ar:'مُنح'})[lang]:'';}

export const replacementLabels={en:'Replacement reset credit',zh:'重置卡补发','zh-Hant':'重置卡補發',ja:'リセット権の再付与',ko:'초기화 이용권 재지급',es:'Crédito de restablecimiento de reemplazo',fr:'Crédit de réinitialisation de remplacement',de:'Ersatz-Reset-Guthaben',ar:'رصيد إعادة ضبط تعويضي'};
