// Parse only explicit clock times with a named offset from complete originals.
// Ambiguous wall-clock times and relative durations intentionally remain unset.
export function announcementTime(text, publishedAt, {truncated=false}={}) {
 if(truncated) return null;
 const match=text.match(/\b(?:lands?|landing|reset.{0,30}(?:at|around))\s+(around\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*(PST|PDT|UTC|GMT)\s*(today|tomorrow)?\b/i);
 if(!match) return null;
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
