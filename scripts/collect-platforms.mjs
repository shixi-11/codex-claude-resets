import { readFile, writeFile } from 'node:fs/promises';
import { currentClaudePromotion } from '../src/claude-promotion.mjs';
const file = new URL('../data/platforms.json',import.meta.url);
const data = JSON.parse(await readFile(file,'utf8'));
const at = new Date().toISOString();
const promotion = data.claude.gifts.find(g=>g.type==='usage-promotion');
try {
  const response = await fetch(promotion.sourceUrl,{signal:AbortSignal.timeout(20000)});
  if(!response.ok) throw new Error(`Official help center HTTP ${response.status}`);
  const html = await response.text();
  const text = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ');
  const current=currentClaudePromotion(text,promotion.sourceUrl,at);
  Object.keys(promotion).forEach(key=>delete promotion[key]);
  Object.assign(promotion,current);
  data.claude.promotionHealth={state:'fresh',checkedAt:at,sourceUrl:promotion.sourceUrl};
} catch(error) {
  data.claude.promotionHealth={state:'degraded',checkedAt:at,error:error.message};
}
await writeFile(file,JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify(data.claude.promotionHealth));
