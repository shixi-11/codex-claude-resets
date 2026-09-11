import {escapeHtml as e} from './shared.mjs';

export const heatCopy={
 en:['views of reset announcements','X post views · approx.','Sources & date','I’m following','Following','Saved in this browser. No notifications.','Could not save. Please allow site storage.','Total views of 6 reset announcements on X, collected via FxEmbed. Includes repeat views; not unique people or visits to this site.','As of'],
 zh:['次重置话题浏览','X帖文浏览量 · 约数','来源与日期','我也关注','已关注','关注状态保存在此浏览器，不发送通知。','暂时无法保存，请允许网站存储。','汇总6条X重置公告的浏览量，经FxEmbed读取。包含重复浏览，不代表独立人数或本站访问量。','统计于'],
 'zh-Hant':['次重置話題瀏覽','X貼文瀏覽量 · 約數','來源與日期','我也關注','已關注','關注狀態儲存在此瀏覽器，不傳送通知。','暫時無法儲存，請允許網站儲存。','彙總6則X重置公告的瀏覽量，經FxEmbed讀取。包含重複瀏覽，不代表獨立人數或本站訪問量。','統計於'],
 ja:['リセット告知の閲覧','X投稿の閲覧数 · 概数','出典と日付','フォローする','フォロー中','このブラウザに保存されます。通知は届きません。','保存できません。サイトのストレージを許可してください。','Xのリセット告知6件の閲覧数をFxEmbed経由で集計。重複閲覧を含み、ユニークユーザー数や当サイトの訪問数ではありません。','集計日'],
 ko:['리셋 공지 조회','X 게시물 조회수 · 약','출처 및 날짜','관심 있어요','관심 표시됨','이 브라우저에 저장됩니다. 알림은 보내지 않습니다.','저장할 수 없습니다. 사이트 저장소를 허용해 주세요.','FxEmbed로 확인한 X 리셋 공지 6개의 조회수 합계입니다. 반복 조회를 포함하며 순 사용자 수나 이 사이트 방문 수가 아닙니다.','집계일'],
 es:['visualizaciones de anuncios de reinicio','Visualizaciones en X · aprox.','Fuentes y fecha','Me interesa','Siguiendo','Guardado en este navegador. Sin notificaciones.','No se pudo guardar. Permite el almacenamiento del sitio.','Suma de las visualizaciones de 6 anuncios de reinicio en X, obtenidas mediante FxEmbed. Incluye visualizaciones repetidas; no son personas únicas ni visitas a este sitio.','A fecha de'],
 fr:['vues des annonces de réinitialisation','Vues sur X · env.','Sources et date','Ça m’intéresse','Suivi activé','Enregistré dans ce navigateur. Aucune notification.','Enregistrement impossible. Autorisez le stockage du site.','Total des vues de 6 annonces de réinitialisation sur X, relevées via FxEmbed. Inclut les vues répétées ; ce ne sont ni des personnes uniques ni des visites de ce site.','Au'],
 de:['Aufrufe von Reset-Ankündigungen','X-Beitragsaufrufe · ca.','Quellen und Datum','Interessiert mich','Vorgemerkt','In diesem Browser gespeichert. Keine Benachrichtigungen.','Speichern nicht möglich. Bitte Website-Speicher erlauben.','Summe der Aufrufe von 6 Reset-Ankündigungen auf X, über FxEmbed erfasst. Enthält wiederholte Aufrufe; keine eindeutigen Personen oder Besuche dieser Website.','Stand'],
 ar:['مشاهدة لإعلانات إعادة التعيين','مشاهدات منشورات X · تقريبًا','المصادر والتاريخ','أنا مهتم','تمت المتابعة','محفوظ في هذا المتصفح. لا تُرسل إشعارات.','تعذر الحفظ. يرجى السماح بتخزين بيانات الموقع.','مجموع مشاهدات 6 إعلانات إعادة تعيين على X، جُمعت عبر FxEmbed. يشمل المشاهدات المتكررة، وليس عدد الأشخاص الفريدين أو زيارات هذا الموقع.','بتاريخ']
};

export function heatTotal(data){
 if(!data||!Number.isFinite(Date.parse(data.observedAt))||data.posts?.length!==6)throw Error('Invalid topic heat snapshot');
 const ids=new Set();
 return data.posts.reduce((sum,p)=>{if(!Number.isSafeInteger(p.views)||p.views<0||ids.has(p.id)||!/^https:\/\/x\.com\/(thsottiaux|ClaudeDevs)\/status\/\d+$/.test(p.url)||!p.url.endsWith('/'+p.id))throw Error('Invalid topic heat source');ids.add(p.id);return sum+p.views;},0);
}

export function topicHeat(data,lang){
 const t=heatCopy[lang],total=heatTotal(data);
 const number=new Intl.NumberFormat(lang,{notation:'compact',maximumFractionDigits:1}).format(total);
 const date=new Intl.DateTimeFormat(lang,{dateStyle:'medium',timeZone:'UTC'}).format(new Date(data.observedAt));
 return `<aside class="topic-heat" aria-label="${e(t[0])}"><div class="heat-summary"><span class="heat-mark" aria-hidden="true">↗</span><div><div class="heat-metric"><strong>${e(number)}</strong><span>${e(t[0])}</span></div><p class="heat-caption">${e(t[1])}</p></div></div><div class="heat-actions"><details class="heat-sources"><summary aria-label="${e(t[2])}" title="${e(t[2])}">ⓘ</summary><div class="heat-popover"><strong>${e(t[2])}</strong><p>${e(t[7])}</p><p>${e(t[8])} <time datetime="${e(data.observedAt)}">${e(date)}</time></p><ul>${data.posts.map(p=>`<li><a href="${e(p.url)}" target="_blank" rel="noopener noreferrer">@${e(p.url.split('/')[3])} · ${e(new Intl.NumberFormat(lang).format(p.views))} ↗</a></li>`).join('')}</ul></div></details><button type="button" class="heat-follow" data-heat-follow aria-pressed="false" aria-describedby="heat-feedback" title="${e(t[5])}" disabled><span data-heat-icon aria-hidden="true">♡</span><span data-heat-label>${e(t[3])}</span></button></div><p id="heat-feedback" class="heat-feedback" role="status" hidden></p></aside>`;
}
