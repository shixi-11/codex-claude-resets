const rows = {
 en:['When is the next reset?','Next public reset','No confirmed time','Your local time','Latest reset & usage announcements','No verified offer yet','Check my usage','Awaiting confirmation','Reset announced complete','Announcement cancelled','Source','+50% weekly Claude Code usage','Applied automatically to eligible plans','Offer ends'],
 zh:['还要多久重置？','下一次公开重置','时间尚未确认','你的本地时间','最新重置与额度方案','暂无已核实的赠送消息','查看我的额度','等待重置完成确认','已宣布重置完成','公告已取消','消息来源','Claude Code每周额度增加50%','符合条件的方案自动获得','活动截止'],
 'zh-Hant':['還要多久重置？','下一次公開重置','時間尚未確認','你的當地時間','最新重置與額度方案','暫無已核實的贈送消息','查看我的額度','等待重置完成確認','已宣布重置完成','公告已取消','消息來源','Claude Code每週額度增加50%','符合條件的方案自動獲得','活動截止'],
 ja:['次のリセットはいつ？','次回の一斉リセット','時刻は未確認','現地時刻','最新のリセット・利用枠の案内','確認済みの特典はありません','利用状況を確認','完了の発表待ち','リセット完了の発表あり','発表は取り消されました','情報源','Claude Codeの週間利用枠が50%増加','対象プランに自動適用','終了日時'],
 ko:['다음 초기화까지 얼마나 남았나요?','다음 일괄 초기화','확인된 시간 없음','현지 시간','최신 초기화 및 사용량 공지','확인된 혜택 없음','내 사용량 확인','완료 확인 대기 중','초기화 완료 발표','발표 취소','출처','Claude Code 주간 사용량 50% 추가','대상 요금제에 자동 적용','혜택 종료'],
 es:['¿Cuándo se restablecen los límites?','Próximo restablecimiento general','Sin horario confirmado','Tu hora local','Últimos anuncios de restablecimiento y uso','Sin ofertas verificadas','Consultar mi uso','Pendiente de confirmación','Restablecimiento confirmado por el anuncio','Anuncio cancelado','Fuente','50% más de uso semanal de Claude Code','Aplicación automática a planes elegibles','Fin de la oferta'],
 fr:['Quand les limites seront-elles réinitialisées ?','Prochaine réinitialisation générale','Horaire non confirmé','Votre heure locale','Dernières annonces de réinitialisation et d’utilisation','Aucune offre vérifiée','Voir mon utilisation','En attente de confirmation','Réinitialisation annoncée comme terminée','Annonce annulée','Source','50 % d’utilisation hebdomadaire en plus pour Claude Code','Application automatique aux offres éligibles','Fin de l’offre'],
 de:['Wann werden die Limits zurückgesetzt?','Nächste allgemeine Zurücksetzung','Kein bestätigter Zeitpunkt','Deine Ortszeit','Neueste Reset- und Nutzungsankündigungen','Kein bestätigtes Angebot','Meine Nutzung prüfen','Bestätigung ausstehend','Zurücksetzung als abgeschlossen gemeldet','Ankündigung zurückgezogen','Quelle','50 % mehr wöchentliche Claude-Code-Nutzung','Automatisch für berechtigte Tarife','Angebot endet'],
 ar:['متى تُعاد حدود الاستخدام؟','إعادة الضبط العامة التالية','لا يوجد موعد مؤكّد','توقيتك المحلي','أحدث إعلانات إعادة الضبط والاستخدام','لا توجد عروض موثّقة بعد','عرض استخدامي','بانتظار تأكيد الاكتمال','أُعلن اكتمال إعادة الضبط','أُلغي الإعلان','المصدر','زيادة الاستخدام الأسبوعي لـClaude Code بنسبة 50٪','تُطبّق تلقائيًا على الخطط المؤهلة','انتهاء العرض']
};
const keys=['heading','next','unknown','local','gifts','noOffer','usage','awaitingConfirmation','completed','cancelled','source','boost','automatic','ends'];
export const platformCopy=Object.fromEntries(Object.entries(rows).map(([lang,row])=>[lang,Object.fromEntries(keys.map((key,i)=>[key,row[i]]))]));
const additions={
 en:['Offer ended','Offer needs rechecking','Pro, Max, Team and legacy seat-based Enterprise. Claude Code weekly limits only.','Codex & Claude reset tracker'],
 zh:['活动已结束','活动信息待复核','适用于Pro、Max、Team及旧版按席位计费的Enterprise，仅增加Claude Code每周额度。','Codex与Claude重置追踪'],
 'zh-Hant':['活動已結束','活動資訊待複核','適用於Pro、Max、Team及舊版按席位計費的Enterprise，僅增加Claude Code每週額度。','Codex與Claude重置追蹤'],
 ja:['特典は終了しました','特典情報の再確認が必要です','Pro、Max、Team、従来の席数課金Enterpriseが対象。Claude Codeの週間利用枠のみ。','Codex・Claudeリセット情報'],
 ko:['혜택 종료','혜택 재확인 필요','Pro, Max, Team 및 기존 좌석 기반 Enterprise 대상. Claude Code 주간 한도에만 적용됩니다.','Codex 및 Claude 초기화 추적'],
 es:['Oferta finalizada','Oferta pendiente de revisión','Para Pro, Max, Team y Enterprise con plazas heredadas. Solo límites semanales de Claude Code.','Restablecimientos de Codex y Claude'],
 fr:['Offre terminée','Offre à revérifier','Pour Pro, Max, Team et les anciennes offres Enterprise par siège. Limites hebdomadaires de Claude Code uniquement.','Réinitialisations de Codex et Claude'],
 de:['Angebot beendet','Angebot muss erneut geprüft werden','Für Pro, Max, Team und ältere sitzbasierte Enterprise-Tarife. Nur wöchentliche Claude-Code-Limits.','Codex- und Claude-Resets'],
 ar:['انتهى العرض','يلزم التحقق من العرض مجددًا','لخطط Pro وMax وTeam وخطط Enterprise القديمة القائمة على المقاعد. لحدود Claude Code الأسبوعية فقط.','متابعة إعادة ضبط Codex وClaude']
};
for(const [lang,row] of Object.entries(additions)) Object.assign(platformCopy[lang],Object.fromEntries(['expired','staleOffer','eligibility','title'].map((k,i)=>[k,row[i]])));
const clockNotes={
 en:'Public countdowns use a confirmed announcement time and display it in your local timezone. When no time is verified, no countdown is shown. Reaching zero does not confirm a completed reset. Your personal usage window is separate.',
 zh:'公开倒计时使用已核实的公告时间，并自动换算为你的本地时区。时间未核实时不显示倒计时；倒数归零不代表已确认重置完成。你个人账号的额度周期另行计算。',
 'zh-Hant':'公開倒計時使用已核實的公告時間，並自動換算為你的當地時區。時間未核實時不顯示倒計時；倒數歸零不代表已確認重置完成。個人帳號的額度週期另行計算。',
 ja:'公開カウントダウンは確認済みの発表時刻に基づき、現地時間で表示されます。時刻を確認できない場合は表示しません。ゼロになっても完了確認ではありません。個人の利用枠の周期は別です。',
 ko:'공개 카운트다운은 확인된 발표 시각을 현지 시간으로 표시합니다. 시각이 확인되지 않으면 표시하지 않습니다. 0이 되어도 초기화 완료를 의미하지 않습니다. 개인 사용량 주기는 별도입니다.',
 es:'La cuenta atrás pública usa la hora verificada del anuncio y la muestra en tu zona horaria. Sin una hora confirmada, no hay cuenta atrás. Llegar a cero no confirma que se haya restablecido el límite. Tu ciclo personal es independiente.',
 fr:'Le compte à rebours public utilise l’heure vérifiée de l’annonce, affichée dans votre fuseau horaire. Sans horaire confirmé, il reste absent. Zéro ne confirme pas la fin de la réinitialisation. Votre cycle personnel est distinct.',
 de:'Öffentliche Countdowns verwenden den bestätigten Zeitpunkt der Ankündigung und zeigen deine Ortszeit. Ohne bestätigte Zeit gibt es keinen Countdown. Null bestätigt keine abgeschlossene Zurücksetzung. Dein persönlicher Nutzungszyklus ist davon getrennt.',
 ar:'يعتمد العد التنازلي العام على موعد إعلان موثّق ويعرضه بتوقيتك المحلي. لا يظهر عد تنازلي دون موعد مؤكّد. بلوغ الصفر لا يؤكد اكتمال إعادة الضبط. دورة استخدام حسابك الشخصية مستقلة.'
};
for(const [lang,note] of Object.entries(clockNotes)) platformCopy[lang].clockNote=note;
const sourceNotes={
 en:'We poll Tibo and ClaudeDevs through FxEmbed’s public timeline relay. X’s official embeds check the author, post ID and visible text. Long-post extensions come from FxEmbed and are marked in the record. Claude promotion terms come from its official help center. Checks can be delayed or fail.',
 zh:'通过FxEmbed公开转发接口轮询Tibo和ClaudeDevs的时间线，再用X官方嵌入核对作者、帖子编号和可见正文。长帖全文由FxEmbed转发，记录中标明来源；Claude活动条款直接读取官方帮助中心。检查可能延迟或失败。',
 'zh-Hant':'透過FxEmbed公開轉發介面輪詢Tibo和ClaudeDevs的時間線，再用X官方嵌入核對作者、貼文編號和可見正文。長文全文由FxEmbed轉發，記錄中標明來源；Claude活動條款直接讀取官方說明中心。檢查可能延遲或失敗。',
 ja:'FxEmbedの公開中継APIでTiboとClaudeDevsの投稿を確認し、X公式埋め込みで著者・投稿ID・表示本文を照合します。長文の全文はFxEmbed経由で、記録に明記します。Claudeの特典条件は公式ヘルプから取得します。確認には遅延や失敗がありえます。',
 ko:'FxEmbed 공개 중계 API로 Tibo와 ClaudeDevs 게시물을 확인하고 X 공식 임베드로 작성자, 게시물 ID, 표시된 본문을 대조합니다. 긴 글의 전문은 FxEmbed에서 가져오며 기록에 명시합니다. Claude 혜택 조건은 공식 도움말에서 확인합니다. 확인이 지연되거나 실패할 수 있습니다.',
 es:'Consultamos las publicaciones de Tibo y ClaudeDevs mediante FxEmbed. Los embeds oficiales de X permiten contrastar autor, ID y texto visible. El texto ampliado procede de FxEmbed y queda identificado. Las condiciones de Claude se consultan en su ayuda oficial. Puede haber retrasos o fallos.',
 fr:'Nous consultons les fils de Tibo et ClaudeDevs via FxEmbed. Les intégrations officielles de X permettent de vérifier l’auteur, l’identifiant et le texte visible. Les textes longs proviennent de FxEmbed, avec mention dans le relevé. Les conditions de Claude viennent de son aide officielle. Des retards ou échecs sont possibles.',
 de:'Wir prüfen die Timelines von Tibo und ClaudeDevs über FxEmbed. Offizielle X-Einbettungen bestätigen Autor, Beitrags-ID und sichtbaren Text. Langtexte stammen von FxEmbed und werden entsprechend gekennzeichnet. Claude-Angebotsbedingungen kommen aus der offiziellen Hilfe. Prüfungen können verzögert werden oder fehlschlagen.',
 ar:'نتابع منشورات Tibo وClaudeDevs عبر واجهة FxEmbed العامة، ونطابق الكاتب ومعرّف المنشور والنص الظاهر مع تضمين X الرسمي. تأتي النصوص الطويلة من FxEmbed مع توثيق ذلك. شروط عروض Claude من مركز المساعدة الرسمي. قد تتأخر عمليات التحقق أو تفشل.'
};
for(const [lang,note] of Object.entries(sourceNotes))platformCopy[lang].sourceNote=note;
Object.entries({en:'Latest grant announcement · check your account',zh:'最近一次赠送公告 · 请核对个人账号','zh-Hant':'最近一次贈送公告 · 請核對個人帳號',ja:'直近の付与告知・アカウントで確認',ko:'최근 지급 공지 · 내 계정에서 확인',es:'Último anuncio de créditos · consulta tu cuenta',fr:'Dernière annonce de crédits · vérifiez votre compte',de:'Letzte Guthaben-Ankündigung · Konto prüfen',ar:'آخر إعلان منح أرصدة · تحقّق من حسابك'}).forEach(([lang,text])=>platformCopy[lang].latestGift=text);
Object.entries({en:'Banked reset announced for Plus, Pro and Business users.',zh:'已预告向Plus、Pro和Business用户赠送重置卡。','zh-Hant':'已預告向Plus、Pro和Business用戶贈送重置卡。',ja:'Plus・Pro・Businessユーザーへのリセット権付与を告知。',ko:'Plus, Pro, Business 사용자에게 초기화 이용권 지급을 예고했습니다.',es:'Crédito de restablecimiento anunciado para Plus, Pro y Business.',fr:'Crédit de réinitialisation annoncé pour Plus, Pro et Business.',de:'Reset-Guthaben für Plus, Pro und Business angekündigt.',ar:'أُعلن منح رصيد إعادة ضبط لمستخدمي Plus وPro وBusiness.'}).forEach(([lang,text])=>platformCopy[lang].bankedPlans=text);
Object.entries({en:'Eligibility depends on the announcement and your plan. Use the Codex or Claude usage link above to check your own account. A public announcement cannot verify your personal balance.',zh:'适用范围取决于公告和账号方案。请使用上方Codex或Claude的额度链接核对个人账号；公开公告无法核实你的实际余额。','zh-Hant':'適用範圍取決於公告和帳號方案。請使用上方Codex或Claude的額度連結核對個人帳號；公開公告無法核實你的實際餘額。',ja:'対象は告知内容とプランによって異なります。上のCodexまたはClaudeの利用状況リンクでアカウントを確認してください。公開告知から個人の残量は確認できません。',ko:'대상 여부는 공지와 요금제에 따라 다릅니다. 위의 Codex 또는 Claude 사용량 링크에서 계정을 확인하세요. 공개 공지로 개인 잔여량을 확인할 수는 없습니다.',es:'La elegibilidad depende del anuncio y de tu plan. Consulta tu cuenta con los enlaces de uso de Codex o Claude. Un anuncio público no permite verificar tu saldo personal.',fr:'L’éligibilité dépend de l’annonce et de votre offre. Vérifiez votre compte via les liens d’utilisation de Codex ou Claude ci-dessus. Une annonce publique ne confirme pas votre solde personnel.',de:'Die Berechtigung hängt von der Ankündigung und deinem Tarif ab. Prüfe dein Konto über die Nutzungslinks für Codex oder Claude. Eine öffentliche Ankündigung bestätigt nicht dein persönliches Guthaben.',ar:'تعتمد الأهلية على الإعلان وخطتك. تحقّق من حسابك عبر روابط استخدام Codex أوClaude أعلاه. لا يؤكد الإعلان العام رصيد حسابك الشخصي.'}).forEach(([lang,text])=>platformCopy[lang].accountNote=text);
Object.entries({
 en:['Reset announced','Announcement: by midnight today (timezone not specified)'],
 zh:['已宣布重置','公告称“今天午夜前”，未注明时区'],
 'zh-Hant':['已宣布重置','公告稱「今天午夜前」，未註明時區'],
 ja:['リセット発表済み','告知では「本日深夜まで」。タイムゾーンは未記載'],
 ko:['초기화 발표됨','공지: 오늘 자정까지 (시간대 미지정)'],
 es:['Restablecimiento anunciado','Anuncio: antes de medianoche de hoy (sin zona horaria)'],
 fr:['Réinitialisation annoncée','Annonce : avant minuit aujourd’hui (fuseau non précisé)'],
 de:['Reset angekündigt','Ankündigung: bis heute Mitternacht (Zeitzone nicht angegeben)'],
 ar:['أُعلن عن إعادة الضبط','الإعلان: بحلول منتصف ليل اليوم (المنطقة الزمنية غير محددة)']
}).forEach(([lang,[announcedUntimed,midnightDeadline]])=>Object.assign(platformCopy[lang],{announcedUntimed,midnightDeadline}));
