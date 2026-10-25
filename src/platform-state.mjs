import {postPlatform,accountReportForReset} from './evidence.mjs';

// A quoted completion belongs to its verified announcement chain, not a newer cycle.
// Input is newest-first. Untied explicit global completions retain existing behavior.
export function latestResetRecord(records) {
 const announcements=records.filter(e=>e.kind==='global'&&e.state==='announced');
 const latest=announcements[0];
 return records.find(e=>{
  if(e.kind!=='global'||!['announced','reported'].includes(e.state))return false;
  if(e.state!=='reported'||!e.resetContext||!latest)return true;
  const chain=[];let context=e.resetContext;
  for(let depth=0;context&&depth<3;depth++,context=context.resetContext)chain.push(context);
  const current=[];let announcement=latest;
  for(let depth=0;announcement&&depth<3;depth++,announcement=announcement.resetContext)current.push(announcement);
  return chain.some(c=>current.some(a=>a.id===c.id))||Date.parse(latest.publishedAt)<=Date.parse(chain.at(-1).publishedAt);
 })||null;
}

// Derive summaries from classified evidence at both collection and build time.
export function syncPlatformState(platforms, events, now = Date.now()) {
 for (const [key, platform] of Object.entries(platforms)) {
 const records=events.filter(event=>postPlatform(event.author)===key).sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
 platform.latest=records[0]||null;
 platform.latestGift=records.find(event=>event.kind==='banked'&&['announced','reported'].includes(event.state))||null;
 const latestReset=latestResetRecord(records);
 platform.latestReset=latestReset||null;
 platform.lastReset=records.find(event=>event.kind==='global'&&event.state==='reported')||null;
 if(latestReset?.state==='announced'&&!latestReset.resetAt){
  platform.reset={state:'announced',resetAt:null,sourceUrl:latestReset.sourceUrl,verifiedAt:latestReset.verifiedAt,publishedAt:latestReset.publishedAt,...(latestReset.sourceTimezone?{sourceTimezone:latestReset.sourceTimezone}:{}),...(latestReset.deadlineText?{deadlineText:latestReset.deadlineText}:{}),...(/a reset is (?:also )?landing by midnight today\./i.test(latestReset.fullText||'')?{deadlineText:'by midnight today'}:{})};
 } else if(latestReset?.state==='announced'&&latestReset.resetAt&&Date.parse(latestReset.resetAt)>now-86400000){
  platform.reset={state:'announced',resetAt:latestReset.resetAt,sourceUrl:latestReset.sourceUrl,verifiedAt:latestReset.verifiedAt,approximate:latestReset.approximate,sourceTimezone:latestReset.sourceTimezone,timeBasis:latestReset.timeBasis,timeKind:latestReset.timeKind};
 } else if(latestReset?.state==='reported'&&Date.parse(latestReset.publishedAt)>now-86400000){
  platform.reset={state:'completed',resetAt:null,sourceUrl:latestReset.sourceUrl,verifiedAt:latestReset.verifiedAt,publishedAt:latestReset.publishedAt};
 } else platform.reset={state:'unknown',resetAt:null};
 const accountReport=accountReportForReset({...platform.reset,announcementContentHash:latestReset?.contentHash},platform.accountReports);
 if(accountReport)Object.assign(platform.reset,{accountReport,announcementContentHash:latestReset.contentHash});
 }
 return platforms;
}
