import test from 'node:test';
import assert from 'node:assert/strict';
import {trackingPanel,trackingRules} from '../src/tracking-panel.mjs';
test('platform failures and aging are displayed independently, with no false no-news claim',()=>{
 const now=Date.parse('2026-09-11T08:00:00Z'),at=new Date(now).toISOString();
 const health={platforms:{codex:{lastAttemptAt:at,lastSuccessAt:at,status:'ok'},claude:{lastAttemptAt:at,lastSuccessAt:at,status:'degraded'}}};
 const text=trackingPanel(health,'en',now);
 assert.match(text,/data-check-platform="codex" data-state="fresh"/);
 assert.match(text,/data-check-platform="claude" data-state="degraded"/);
 assert.match(trackingPanel(health,'en',now+4*3600000),/Check overdue/);
 assert.match(trackingPanel({},'en',now),/Not checked yet/);
 for(const lang of ['en','zh','zh-Hant','ja','ko','es','fr','de','ar'])assert.ok(trackingRules(lang).length>100);
});
