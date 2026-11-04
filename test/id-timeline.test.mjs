import test from 'node:test';
import assert from 'node:assert/strict';
import {readAuthorTimeline,TIBO_ID} from '../src/x-relay.mjs';
const own={id:'2117035794678546764',url:'https://x.com/thsottiaux/status/2117035794678546764',author:{id:TIBO_ID,screen_name:'thsottiaux',protected:false},text:'Day 28/ Banked 2/2'};
const other={id:'2117686400149520708',url:'https://x.com/OpenAI/status/2117686400149520708',author:{id:'4398626122',screen_name:'OpenAI'},text:'other'};
const payload=rows=>Response.json({code:200,results:rows});
test('handle success stays one request; 404 switches to ID with replies and excludes context and quoted posts',async()=>{
 let calls=[];let result=await readAuthorTimeline('thsottiaux',{fetcher:async url=>{calls.push(url);return payload([own]);}});
 assert.equal(calls.length,1);assert.equal(result.posts[0].relay.id,own.id);
 for(let repeat=0;repeat<2;repeat++){
  calls=[];result=await readAuthorTimeline('thsottiaux',{fetcher:async url=>{calls.push(url);return calls.length===1?new Response('',{status:404}):payload([other,{...own,quote:other}]);},sleep:async()=>{}});
  assert.equal(calls.length,2);assert.ok(calls[1].includes('id:'+TIBO_ID));assert.ok(calls.every(u=>u.endsWith('count=40&with_replies=1')));
  assert.deepEqual(result.posts.map(p=>p.relay.id),[own.id]);assert.equal(result.attempts[0].status,404);assert.equal(result.attempts[1].ok,true);
 }
});
test('ID fallback cannot accept a quote-only wrong account, mismatched ID/handle, empty or erroneous payload',async()=>{
 for(const rows of [[{...other,quote:own}],[{...own,author:{...own.author,id:'9'}}],[{...own,author:{...own.author,screen_name:'OpenAI'}}],[{...own,id:'1'}],[{...own,author:{...own.author,protected:true}}],[]]){
  let n=0;await assert.rejects(readAuthorTimeline('thsottiaux',{fetcher:async()=>++n===1?new Response('',{status:404}):payload(rows),sleep:async()=>{}}));assert.equal(n,2);
 }
 for(const response of [()=>Response.json({code:500,results:[own]}),()=>new Response('{broken',{status:200}),()=>new Response('',{status:403})]){
  let n=0;await assert.rejects(readAuthorTimeline('thsottiaux',{fetcher:async()=>++n===1?new Response('',{status:404}):response(),sleep:async()=>{}}));assert.ok(n<=3);
 }
});
test('dual path failures, Retry-After and global/author budgets are bounded',async()=>{
 let n=0;await assert.rejects(readAuthorTimeline('thsottiaux',{fetcher:async()=>{n++;return new Response('',{status:404});},sleep:async()=>{}}),/404/);assert.equal(n,3);
 n=0;await assert.rejects(readAuthorTimeline('thsottiaux',{budgetMs:0,fetcher:async()=>{n++;}}),/budget/);assert.equal(n,0);
 let time=0;n=0;await assert.rejects(readAuthorTimeline('thsottiaux',{budgetMs:600,now:()=>time,fetcher:async()=>{n++;return new Response('',{status:404});},sleep:async ms=>{time+=ms;}}));assert.equal(n,2);assert.ok(time<=600);
 for(const status of [401,403,429]){n=0;await assert.rejects(readAuthorTimeline('thsottiaux',{fetcher:async()=>{n++;return new Response('',{status,headers:{'retry-after':'60'}});},sleep:async()=>assert.fail('unexpected sleep')}));assert.equal(n,1);}
 n=0;time=0;await assert.rejects(readAuthorTimeline('thsottiaux',{budgetMs:10,now:()=>time,fetcher:async()=>{n++;time=11;return payload([own]);}}),/budget/);assert.equal(n,1);
 n=0;const waits=[];await readAuthorTimeline('thsottiaux',{fetcher:async()=>++n===1?new Response('',{status:429,headers:{'retry-after':'1'}}):payload([own]),sleep:async ms=>waits.push(ms)});assert.deepEqual(waits,[1000]);assert.equal(n,2);
});
test('a hanging handle request leaves time for a real ID fallback within the shared deadline',async()=>{
 const start=Date.now();let n=0;
 const result=await readAuthorTimeline('thsottiaux',{budgetMs:1800,fetcher:async(url,{signal})=>{n++;if(n===1)return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));if(n===2)return new Response('',{status:404});assert.ok(url.includes('id:'+TIBO_ID));return payload([own]);},sleep:async()=>{}});
 assert.equal(n,3);assert.equal(result.posts.length,1);assert.ok(Date.now()-start<2000);
});
