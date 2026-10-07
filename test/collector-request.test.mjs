import test from 'node:test';
import assert from 'node:assert/strict';
import {createCollectionRequest,retryAfterMs} from '../scripts/collector-request.mjs';
function fixture(responses,options={}){
 let time=0,calls=0;const waits=[],attempts=[];
 const request=createCollectionRequest({fetchImpl:async()=>{const next=responses[Math.min(calls++,responses.length-1)];if(next instanceof Error)throw next;return next.clone();},now:()=>time,sleep:async ms=>{waits.push(ms);time+=ms;},random:()=>0,onAttempt:attempt=>attempts.push(attempt),...options});
 return {request,waits,attempts,calls:()=>calls};
}
test('transient HTTP and transport failures retry with bounded backoff',async()=>{
 for(const failed of [new Response('',{status:503}),new Response('',{status:504}),new TypeError('fetch failed'),new DOMException('timeout','TimeoutError')]){
  const f=fixture([failed,Response.json({ok:true})]);assert.deepEqual(await f.request('https://example.test'),{ok:true});assert.equal(f.calls(),2);assert.deepEqual(f.waits,[500]);
 }
 const f=fixture([new Response('',{status:503})]);await assert.rejects(f.request('https://example.test'),err=>err.details.attempts===3&&err.details.exhausted);assert.deepEqual(f.waits,[500,1000]);
});
test('Retry-After seconds and dates are respected; oversized delay fails without early retry',async()=>{
 assert.equal(retryAfterMs('Wed, 07 Oct 2026 10:30:00 GMT',Date.parse('2026-10-07T10:29:57Z')),3000);
 assert.equal(retryAfterMs('garbage'),null);
 const f=fixture([new Response('',{status:429,headers:{'retry-after':'2'}}),Response.json({ok:true})]);await f.request('https://example.test');assert.deepEqual(f.waits,[2000]);
 const long=fixture([new Response('',{status:429,headers:{'retry-after':'120'}})]);await assert.rejects(long.request('https://example.test'),err=>err.details.budgetExhausted&&err.details.retryAfterMs===120000);assert.equal(long.calls(),1);assert.deepEqual(long.waits,[]);
});
test('permanent HTTP and malformed JSON are not retried; deadline never starts a fetch',async()=>{
 for(const response of [new Response('',{status:404}),new Response('invalid',{status:200})]){
  const f=fixture([response]);await assert.rejects(f.request('https://example.test'));assert.equal(f.calls(),1);assert.deepEqual(f.waits,[]);
 }
 const f=fixture([Response.json({})],{deadline:0});await assert.rejects(f.request('https://example.test'),err=>err.details.kind==='budget'&&err.details.attempts===0);assert.equal(f.calls(),0);
});
test('response-body timeout is retried even after successful HTTP headers',async()=>{
 let calls=0;
 const request=createCollectionRequest({fetchImpl:async()=>++calls===1?{status:200,ok:true,json:async()=>{throw new DOMException('timeout','TimeoutError');}}:Response.json({ok:true}),sleep:async()=>{},random:()=>0});
 assert.deepEqual(await request('https://example.test'),{ok:true});assert.equal(calls,2);
});
