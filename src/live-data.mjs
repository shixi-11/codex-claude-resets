import {validateEvent,parsePostUrl,postPlatform} from './evidence.mjs';
import { watchCopy } from './watch-copy.mjs';
export const pageData=JSON.parse(document.querySelector('#page-data').textContent);
const base=new URL('../',import.meta.url),w=watchCopy[pageData.lang];
let busy=false;
const safeSource=(value,id)=>{const post=parsePostUrl(value);if(post)return postPlatform(post.author)===id;try{const u=new URL(value);return id==='claude'&&u.protocol==='https:'&&u.hostname==='support.claude.com';}catch{return false;}};
function valid(data){return ['codex','claude'].every(id=>{const p=data?.[id],r=p?.reset;return p&&r&&(!p.latest||(validateEvent(p.latest)&&postPlatform(p.latest.author)===id))&&Array.isArray(p.gifts)&&p.gifts.every(g=>safeSource(g.sourceUrl,id))&&(!p.latestGift||safeSource(p.latestGift.sourceUrl,id))&&['unknown','completed','cancelled','announced'].includes(r.state)&&(r.state==='unknown'||(safeSource(r.sourceUrl,id)&&Number.isFinite(Date.parse(r.verifiedAt))))&&(!p.lastReset||(safeSource(p.lastReset.sourceUrl,id)&&Number.isFinite(Date.parse(p.lastReset.publishedAt))));});}
export async function refreshLiveData(){
 if(busy)return;busy=true;const button=document.querySelector('[data-refresh]');if(button)button.disabled=true;
 try{
  const [platforms,health,events]=await Promise.all(['platforms.json','health.json','events.json'].map(path=>fetch(new URL(path+'?t='+Date.now(),base),{cache:'no-store',signal:AbortSignal.timeout(12000)}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json();})));
  if(!valid(platforms)||!Number.isFinite(Date.parse(health.lastSuccessAt))||!Array.isArray(events)||!events.every(validateEvent))throw Error('Invalid data');
  pageData.events=events;Object.assign(pageData.platforms,platforms);Object.assign(pageData.health,health);window.dispatchEvent(new Event('reset-data-updated'));
  const label=document.querySelector('[data-live-status]');if(label){label.textContent=w.updated;label.hidden=true;}
 }catch{const label=document.querySelector('[data-live-status]');if(label){label.textContent=w.offline;label.hidden=false;}}finally{busy=false;if(button)button.disabled=false;}
}
refreshLiveData();setInterval(()=>{if(!document.hidden)refreshLiveData();},60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshLiveData();});
