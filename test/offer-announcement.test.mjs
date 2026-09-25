import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {priorityDetails} from '../src/priority-details.mjs';
const platforms=JSON.parse(readFileSync(new URL('../data/platforms.json',import.meta.url)));
const events=JSON.parse(readFileSync(new URL('../data/events.json',import.meta.url)));
test('newer related news is not pinned behind an old offer, preserving reset history',()=>{
 const p=platforms.claude,list=events.filter(e=>e.platform==='claude').sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)),announcement=list.find(e=>['global','banked'].includes(e.kind)&&['announced','reported'].includes(e.state))||list[0];
 assert.ok(announcement);
 const html=priorityDetails(p,'claude',events,'en');
 assert.ok(html.includes(`href="${announcement.sourceUrl}"`));
 assert.ok(html.includes(`datetime="${announcement.publishedAt}"`));
 assert.ok(html.includes(`data-reset-elapsed="${p.lastReset.publishedAt}"`));
 assert.ok(!html.includes(`datetime="${p.gifts[0].effectiveOn}"`));
});
test('missing or cross-platform offer announcements safely fall back to latest related post',()=>{
 for(const announcementId of ['missing',platforms.codex.latest.id]){
  const p={...platforms.claude,gifts:[{announcementId}]};
  const html=priorityDetails(p,'claude',events,'en');
  assert.ok(html.includes(`href="${(p.latestGift||p.lastReset||p.latest).sourceUrl}"`));
 }
});
test('removing the offer restores newest-post selection without retaining its old announcement',()=>{
 const p={...platforms.claude,gifts:[]};
 assert.ok(priorityDetails(p,'claude',events,'en').includes(`href="${(p.latestGift||p.lastReset||p.latest).sourceUrl}"`));
});
