import test from 'node:test';
import assert from 'node:assert/strict';
import {collectionRequest} from '../src/collection-request.mjs';
test('transient HTTP failure retries once and then returns the successful evidence',async()=>{
 let calls=0;const sleeps=[];const result=await collectionRequest('https://example.com',{fetcher:async()=>++calls===1?new Response('',{status:503}):Response.json({ok:true}),sleep:async ms=>sleeps.push(ms)});
 assert.deepEqual(result,{ok:true});assert.equal(calls,2);assert.deepEqual(sleeps,[250]);
});
test('permanent failures and long Retry-After do not become extra requests',async()=>{
 for(const [status,headers]of [[404,{}],[429,{'retry-after':'60'}]]){let calls=0;await assert.rejects(collectionRequest('https://example.com',{fetcher:async()=>{calls++;return new Response('',{status,headers});},sleep:async()=>assert.fail('unexpected wait')}),new RegExp(`HTTP ${status}`));assert.equal(calls,1);}
});
test('short Retry-After and network errors respect the shared budget and bounded attempts',async()=>{
 let calls=0;const waits=[];await collectionRequest('https://example.com',{fetcher:async()=>++calls===1?new Response('',{status:429,headers:{'retry-after':'1'}}):Response.json({}),sleep:async ms=>waits.push(ms)});assert.deepEqual(waits,[1000]);
 calls=0;await assert.rejects(collectionRequest('https://example.com',{fetcher:async()=>{calls++;throw new TypeError('fetch failed');},sleep:async()=>{}}),/fetch failed/);assert.equal(calls,2);
 calls=0;let time=0;await assert.rejects(collectionRequest('https://example.com',{budgetMs:200,now:()=>time,fetcher:async()=>{calls++;time=180;throw new TypeError('fetch failed');},sleep:async()=>assert.fail('budget exceeded')}),/fetch failed/);assert.equal(calls,1);
});
