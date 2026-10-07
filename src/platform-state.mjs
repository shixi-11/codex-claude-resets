import {postPlatform} from './evidence.mjs';

// Derive summaries from classified evidence at both collection and build time.
export function syncPlatformState(platforms, events, now = Date.now()) {
 for (const [key, platform] of Object.entries(platforms)) {
 const records=events.filter(event=>postPlatform(event.author)===key).sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
 platform.latest=records[0]||null;
 platform.latestGift=records.find(event=>event.kind==='banked'&&['announced','reported'].includes(event.state))||null;
 const latestReset=records.find(event=>event.kind==='global'&&['announced','reported'].includes(event.state));
 platform.latestReset=latestReset||null;
 platform.lastReset=records.find(event=>event.kind==='global'&&event.state==='reported')||null;
 if(latestReset?.state==='announced'&&!latestReset.resetAt){
  platform.reset={state:'announced',resetAt:null,sourceUrl:latestReset.sourceUrl,verifiedAt:latestReset.verifiedAt,publishedAt:latestReset.publishedAt,...(/a reset is (?:also )?landing by midnight today\./i.test(latestReset.fullText||'')?{deadlineText:'by midnight today'}:{})};
 } else if(latestReset?.state==='announced'&&latestReset.resetAt&&Date.parse(latestReset.resetAt)>now-86400000){
  platform.reset={state:'announced',resetAt:latestReset.resetAt,sourceUrl:latestReset.sourceUrl,verifiedAt:latestReset.verifiedAt,approximate:latestReset.approximate,sourceTimezone:latestReset.sourceTimezone,timeBasis:latestReset.timeBasis,timeKind:latestReset.timeKind};
 } else if(latestReset?.state==='reported'&&Date.parse(latestReset.publishedAt)>now-86400000){
  platform.reset={state:'completed',resetAt:null,sourceUrl:latestReset.sourceUrl,verifiedAt:latestReset.verifiedAt,publishedAt:latestReset.publishedAt};
 } else platform.reset={state:'unknown',resetAt:null};
 }
 return platforms;
}
