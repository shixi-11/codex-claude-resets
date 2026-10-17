import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {elapsedSince,elapsedLabel} from '../src/elapsed.mjs';
import {priorityDetails} from '../src/priority-details.mjs';
import {syncPlatformState} from '../src/platform-state.mjs';
import {watchCopy} from '../src/watch-copy.mjs';

const all=JSON.parse(readFileSync(new URL('../data/events.json',import.meta.url),'utf8'));
const complete=all.find(event=>event.id==='2110618732666257557');
const announced=all.find(event=>event.id==='2111492738025959922');
const now=Date.parse('2026-10-17T17:36:00Z');

test('Day13 latest announcement and elapsed completion report keep separate timestamps',t=>{
 t.mock.method(Date,'now',()=>now);
 const p=syncPlatformState({codex:{name:'Codex',gifts:[]}},[complete,announced],now).codex;
 const html=priorityDetails(p,'codex',[complete,announced],'en');
 assert.ok(html.includes('Since last reset completion report'));
 assert.ok(!html.includes('Since last reset announcement'));
 assert.ok(html.includes(`href="${announced.sourceUrl}"`));
 assert.ok(html.includes(`datetime="${announced.publishedAt}"`));
 assert.ok(html.includes(`data-reset-elapsed="${complete.publishedAt}"`));
 assert.ok(!html.includes(`data-reset-elapsed="${announced.publishedAt}"`));
 assert.ok(html.includes('>'+elapsedSince(complete.publishedAt,'en',now)+'</span>'));
 assert.equal(p.reset.state,'announced');assert.equal(p.lastReset.id,complete.id);
});

test('all nine elapsed labels identify completion; an announcement alone cannot start this timer',()=>{
 const completionWords={en:/completion report/,zh:/完成公告/,'zh-Hant':/完成公告/,ja:/完了報告/,ko:/완료 보고/,es:/completado/,fr:/terminée/,de:/Abschlussmeldung/,ar:/اكتمال/};
 assert.equal(Object.keys(elapsedLabel).length,9);
 for(const [lang,pattern] of Object.entries(completionWords)){
  assert.match(elapsedLabel[lang],pattern,lang);
  const p=syncPlatformState({codex:{name:'Codex',gifts:[]}},[announced],now).codex;
  const html=priorityDetails(p,'codex',[announced],lang);
  assert.ok(html.includes(elapsedLabel[lang]),lang);
  assert.ok(html.includes('data-reset-elapsed=""'),lang);
  assert.ok(!html.includes(`data-reset-elapsed="${announced.publishedAt}"`),lang);
  assert.ok(html.includes(watchCopy[lang].noHistory),lang);
 }
});
