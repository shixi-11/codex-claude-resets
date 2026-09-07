import { readFile, writeFile } from 'node:fs/promises';
const file = new URL('../data/platforms.json',import.meta.url);
const data = JSON.parse(await readFile(file,'utf8'));
const at = new Date().toISOString();
const promotion = data.claude.gifts.find(g=>g.type==='usage-promotion');
try {
  const response = await fetch(promotion.sourceUrl,{signal:AbortSignal.timeout(20000)});
  if(!response.ok) throw new Error(`Official help center HTTP ${response.status}`);
  const html = await response.text();
  const text = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ');
  // Only refresh the known offer when its actual terms still match. A changed
  // amount, scope or end date requires parsing/review, not a false green check.
  const required=[/weekly usage limits?[^.]{0,120}50%/i,/September 13, 2026 at 11:59 PM PT/i,/Pro, Max, and Team/i,/automatically applied/i,/5-hour usage limits are not affected/i];
  if(!required.every(pattern=>pattern.test(text))) throw new Error('Official promotion terms changed; review required');
  promotion.verifiedAt=at;
  promotion.state=Date.parse(promotion.endsAt)>Date.now()?'announced':'expired';
  data.claude.promotionHealth={state:'fresh',checkedAt:at,sourceUrl:promotion.sourceUrl};
} catch(error) {
  data.claude.promotionHealth={state:'degraded',checkedAt:at,error:error.message};
}
await writeFile(file,JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify(data.claude.promotionHealth));
