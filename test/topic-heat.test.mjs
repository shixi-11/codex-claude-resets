import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {heatTotal,topicHeat,heatCopy} from '../src/topic-heat.mjs';
const data=JSON.parse(readFileSync(new URL('../data/topic-heat.json',import.meta.url)));
test('topic views reject duplicate sources and invalid counts',()=>{
 assert.equal(heatTotal(data),22180449);
 for(const change of [d=>d.posts[1]=d.posts[0],d=>d.posts[0].views=-1,d=>d.posts[0].url='javascript:alert(1)']){const bad=structuredClone(data);change(bad);assert.throws(()=>heatTotal(bad));}
});
test('all locales link the same six sources with an repeatable cheer button',()=>{
 for(const lang of Object.keys(heatCopy)){const html=topicHeat(data,lang);assert.equal((html.match(/<li>/g)||[]).length,6);assert.ok(!html.includes('aria-pressed'));assert.ok(html.includes(data.posts[0].url));}
});
