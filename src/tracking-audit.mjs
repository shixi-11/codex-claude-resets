import {latestResetRecord} from './platform-state.mjs';
import {ALLOWED_AUTHORS, postPlatform,accountReportForReset,validateAccountReport} from './evidence.mjs';

// Backend-only checks. Compare complete source records, not just their IDs.
export function assertTrackingSync(platforms, events) {
 const fields=['id','sourceUrl','publishedAt','verifiedAt','contentHash','kind','state','resetAt'];
 for(const [id,p] of Object.entries(platforms)) {
  for(const report of p.accountReports||[])validateAccountReport(report);
  const report=accountReportForReset(p.reset,p.accountReports);
  if(JSON.stringify(p.reset?.accountReport||null)!==JSON.stringify(report))throw new Error(`Account report mismatch: ${id}`);
  const list=events.filter(e=>postPlatform(e.author)===id).sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
  const confirmed=e=>['announced','reported'].includes(e.state);
  const expected={latest:list[0],latestGift:list.find(e=>e.kind==='banked'&&confirmed(e)),latestReset:latestResetRecord(list),lastReset:list.find(e=>e.kind==='global'&&e.state==='reported')};
  for(const [key,want] of Object.entries(expected))for(const field of fields)if((p[key]?.[field]??null)!==(want?.[field]??null))throw new Error(`Tracking mismatch: ${id}.${key}.${field}`);
  if(p.reset?.state!=='unknown') {
   if(!expected.latestReset)throw new Error(`Reset without evidence: ${id}`);
   for(const field of ['sourceUrl','verifiedAt'])if(p.reset[field]!==expected.latestReset[field])throw new Error(`Reset source mismatch: ${id}.${field}`);
   if(p.reset.state==='completed'&&expected.latestReset.state!=='reported')throw new Error(`Unconfirmed completion: ${id}`);
   if(p.reset.state==='announced'&&expected.latestReset.state!=='announced')throw new Error(`Outdated countdown: ${id}`);
   if(p.reset.state==='announced'&&(p.reset.resetAt??null)!==(expected.latestReset.resetAt??null))throw new Error(`Countdown mismatch: ${id}`);
  }
 }
 return true;
}

export function trackingAudit({platforms,events,health,previous={},now=Date.now()}) {
 const issues=[];
 try{assertTrackingSync(platforms,events);}catch(error){issues.push({key:'summary-mismatch',message:error.message});}
 const gap=now-Date.parse(previous.checkedAt||health.lastSuccessAt||0);
 if(!Number.isFinite(gap)||gap>3*3600000)issues.push({key:'collection-gap',message:'No tracking audit for over three hours',gapMs:Number.isFinite(gap)?gap:null,previousCheckedAt:previous.checkedAt||health.lastSuccessAt||null});
 for(const id of ['codex','claude']) {
  const h=health.platforms?.[id];
  if(h?.status!=='ok')issues.push({key:`coverage:${id}`,message:`${id}: collection is incomplete`});
  if(!h?.lastSuccessAt||now-Date.parse(h.lastSuccessAt)>3*3600000)issues.push({key:`stale:${id}`,message:`${id}: no successful collection in three hours`});
 }
 // Only public, independently verified originals enter the review queue.
 const queue=events.filter(e=>ALLOWED_AUTHORS.some(a=>a.toLowerCase()===e.author.toLowerCase())&&e.state==='unconfirmed'&&/\breset/i.test(e.fullText||e.excerpt)&&now-Date.parse(e.publishedAt)<7*86400000).map(e=>({id:e.id,contentHash:e.contentHash,sourceUrl:e.sourceUrl,publishedAt:e.publishedAt,truncated:!!e.truncated,text:e.fullText||e.excerpt}));
 for(const item of queue)issues.push({key:`review:${item.id}:${item.contentHash}`,message:`Official reset wording needs review: ${item.sourceUrl}`});
 for(const e of events.filter(e=>e.kind==='global'&&e.state==='announced'&&e.resetAt&&now-Date.parse(e.resetAt)>3*3600000&&now-Date.parse(e.resetAt)<7*86400000)) {
  if(!events.some(done=>done.kind==='global'&&done.state==='reported'&&postPlatform(done.author)===postPlatform(e.author)&&Date.parse(done.publishedAt)>=Date.parse(e.publishedAt)))issues.push({key:`completion:${e.id}`,message:`Scheduled reset has no later completion: ${e.sourceUrl}`});
 }
 const old=new Set(previous.openKeys||[]);
 const newIssues=issues.filter(issue=>!old.has(issue.key));
 return {checkedAt:new Date(now).toISOString(),status:issues.length?'attention':'ok',openKeys:issues.map(i=>i.key).sort(),issues,newIssues,queue};
}
