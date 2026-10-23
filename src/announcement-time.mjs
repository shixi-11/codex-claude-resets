// Parse only explicit clock times with a named offset from complete originals.
// Ambiguous wall-clock times and relative durations intentionally remain unset.
export const isBeforeTenPacificDeadline = text => /^(?:Lands|Landing) tomorrow before 10am PST(?: together with a small ship)?[.!]?$/i.test(text.trim());
export function announcementTime(text, publishedAt, {truncated=false,author=""}={}) {
 if(truncated) return null;
 // "Before" gives an upper bound. The author's literal PST during daylight
 // time does not resolve whether PST or colloquial Pacific time was intended.
 if(author.toLowerCase()==='thsottiaux'&&isBeforeTenPacificDeadline(text))return {resetAt:null,sourceTimezone:'PST',deadlineText:'tomorrow before 10am PST',timeBasis:'source-timezone-ambiguous',timeKind:'deadline',approximate:true};
 if(author.toLowerCase()==='thsottiaux'&&/^Landing sometime today by EOD PST[.!]?$/i.test(text.trim()))return {resetAt:null,sourceTimezone:'PST',deadlineText:'sometime today by EOD PST',timeBasis:'literal-source-offset',timeKind:'deadline',approximate:true};
 if(author.toLowerCase()==='thsottiaux'&&/^Global reset (?:is )?landing by EOD PST time[.!]?(?:\s+Enjoy[.!]?)?$/i.test(text.trim()))return {resetAt:null,sourceTimezone:'PST',deadlineText:'by EOD PST time',timeBasis:'literal-source-offset',timeKind:'deadline',approximate:true};
 const leadingDay=text.match(/\b(?:lands?|landing)\s+(today|tomorrow)\s+(around\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*(PST|PDT|UTC|GMT)\b/i);
 const match=leadingDay ? [leadingDay[0],leadingDay[2],leadingDay[3],leadingDay[4],leadingDay[5],leadingDay[6],leadingDay[1]] : text.match(/\b(?:lands?|landing|reset.{0,30}(?:at|around))\s+(around\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*(PST|PDT|UTC|GMT)\s*(today|tomorrow)?\b/i);
 if(!match) {
  // User-approved fallback to Tibo's literal PST convention, not a claim
  // about his live location. Prior originals: 2097043464538264003, 2094144275957350900.
  if(author.toLowerCase()!=='thsottiaux'||!/a reset is (?:also )?landing by midnight today\./i.test(text))return null;
  const published=Date.parse(publishedAt);if(!Number.isFinite(published))return null;
  const local=new Date(published-8*3600000);
  const deadline=Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate()+1)+8*3600000;
  return {resetAt:new Date(deadline).toISOString(),sourceTimezone:'PST',approximate:true,timeBasis:'author-usual-PST',timeKind:'deadline'};
 }
 let hour=Number(match[2]);const minute=Number(match[3]||0);
 if(hour<1||hour>12||minute>59) return null;
 hour=hour%12+(match[4].toLowerCase()==='pm'?12:0);
 const zone=match[5].toUpperCase();const offset={PST:-8,PDT:-7,UTC:0,GMT:0}[zone];
 const published=Date.parse(publishedAt);if(!Number.isFinite(published))return null;
 const date=new Date(published+offset*3600000);
 const days=match[6]?.toLowerCase()==='tomorrow'?1:0;
 const instant=Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()+days,hour,minute)-offset*3600000;
 // No bare clock inferred to mean tomorrow because it has passed.
 return {resetAt:new Date(instant).toISOString(),sourceTimezone:zone,approximate:!!match[1],timeBasis:'literal-source-offset'};
}
