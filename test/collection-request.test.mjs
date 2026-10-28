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

test('monitored timeline 404 retries are bounded and require an actual successful response',async()=>{
 const policy={retryStatuses:[404,429,500,502,503,504],maxAttempts:3,retryDelayMs:500};
 let calls=0;const waits=[];
 const result=await collectionRequest('https://example.com/timeline',{...policy,fetcher:async()=>++calls<3?new Response('',{status:404}):Response.json({code:200,results:[{id:'1'}]}),sleep:async ms=>waits.push(ms)});
 assert.equal(calls,3);assert.deepEqual(waits,[500,1000]);assert.equal(result.code,200);
 calls=0;
 await assert.rejects(collectionRequest('https://example.com/timeline',{...policy,fetcher:async()=>{calls++;return new Response('',{status:404});},sleep:async()=>{}}),/HTTP 404/);
 assert.equal(calls,3);
 calls=0;let time=0;
 await assert.rejects(collectionRequest('https://example.com/timeline',{...policy,budgetMs:600,now:()=>time,fetcher:async()=>{calls++;return new Response('',{status:404});},sleep:async ms=>{time+=ms;}}),/HTTP 404/);
 assert.equal(calls,2);
});

test('a real hung first attempt times out early enough for a successful retry',async()=>{
 let calls=0;const attempts=[];
 // AbortSignal.timeout uses an unref timer; keep the fake hung transport alive.
 const keepAlive=setTimeout(()=>{},2000);
 try{
  const result=await collectionRequest('https://example.com',{budgetMs:1000,retryDelayMs:0,onAttempt:a=>attempts.push(a),fetcher:async(url,{signal})=>{
   if(++calls===1)return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));
   return Response.json({ok:true});
  }});
  assert.deepEqual(result,{ok:true});assert.equal(calls,2);
  assert.equal(attempts.length,2);assert.ok(attempts[0].timeoutMs<=500);assert.equal(attempts[0].ok,false);assert.equal(attempts[1].ok,true);
 }finally{clearTimeout(keepAlive);}
});

test('only opt-in validated responses retry malformed or application-level failures',async()=>{
 const validate=payload=>{if(payload.code!==200)throw new Error('Invalid timeline');return payload.results;};
 let calls=0;const attempts=[];
 const result=await collectionRequest('https://example.com',{validate,retryInvalidResponse:true,maxAttempts:3,sleep:async()=>{},onAttempt:a=>attempts.push(a),fetcher:async()=>++calls===1?new Response('{'):calls===2?Response.json({code:404}):Response.json({code:200,results:['verified identity']})});
 assert.deepEqual(result,['verified identity']);assert.equal(calls,3);
 assert.deepEqual(attempts.map(a=>a.ok),[false,false,true]);assert.deepEqual(attempts.map(a=>a.status),[200,200,200]);assert.match(attempts[1].error,/Invalid timeline/);
 calls=0;
 await assert.rejects(collectionRequest('https://example.com',{validate,fetcher:async()=>{calls++;return Response.json({code:404});}}),/Invalid timeline/);assert.equal(calls,1);
 for(const [status,headers]of [[403,{}],[429,{'retry-after':'60'}]]){
  calls=0;await assert.rejects(collectionRequest('https://example.com',{validate,retryInvalidResponse:true,retryStatuses:[404,429,503],maxAttempts:3,fetcher:async()=>{calls++;return new Response('',{status,headers});},sleep:async()=>assert.fail('must respect refusal or Retry-After')}),new RegExp(`HTTP ${status}`));assert.equal(calls,1);
 }
});
