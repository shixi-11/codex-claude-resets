import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {priorityDetails} from '../src/priority-details.mjs';
const platforms=JSON.parse(readFileSync(new URL('../data/platforms.json',import.meta.url)));
const events=JSON.parse(readFileSync(new URL('../data/events.json',import.meta.url)));
test('current offer selects its announcement with its own date and source, preserving reset history',()=>{
 const p=platforms.claude,announcement=events.find(e=>e.id===p.gifts[0].announcementId);
 assert.ok(announcement);
 const html=priorityDetails(p,'claude',events,'en');
 assert.ok(html.includes(`href="${announcement.sourceUrl}"`));
 assert.ok(html.includes(`datetime="${announcement.publishedAt}"`));
 assert.ok(html.includes('25%'));
 assert.ok(html.includes(`data-reset-elapsed="${p.lastReset.publishedAt}"`));
 assert.ok(!html.includes(`datetime="${p.gifts[0].effectiveOn}"`));
});
test('missing or cross-platform offer announcements safely fall back to latest related post',()=>{
 for(const announcementId of ['missing',platforms.codex.latest.id]){
  const p={...platforms.claude,gifts:[{announcementId}]};
  const html=priorityDetails(p,'claude',events,'en');
  assert.ok(html.includes(`href="${p.latest.sourceUrl}"`));
 }
});
test('removing the offer restores newest-post selection without retaining its old announcement',()=>{
 const p={...platforms.claude,gifts:[]};
 assert.ok(priorityDetails(p,'claude',events,'en').includes(`href="${p.latest.sourceUrl}"`));
});
