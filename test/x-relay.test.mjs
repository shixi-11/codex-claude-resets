import test from 'node:test';import assert from 'node:assert/strict';import{timelineCandidates,corroborateRelay,mergeCandidates}from'../src/x-relay.mjs';
const id='2097043464538264003',url=`https://x.com/thsottiaux/status/${id}`;
const relay={id,url,author:{screen_name:'thsottiaux',protected:false},created_timestamp:1788809097,text:'We will do a global reset for all paid users. Lands around 6pm PST today.'};
const official={id,url,author:'thsottiaux',text:'We will do a global reset for all paid users…',truncated:true};
test('only matching authors enter timeline candidates, including quoted originals',()=>{
 const posts=timelineCandidates({code:200,results:[{url:'https://x.com/someone/status/1',author:{screen_name:'someone'},quote:relay}]},'thsottiaux');
 assert.equal(posts.length,1);assert.equal(posts[0].url,url);
 assert.equal(timelineCandidates({code:200,results:[{...relay,author:{screen_name:'someone'}}]},'thsottiaux').length,0);
});
test('relay extension must match official identity, timestamp and excerpt',()=>{
 assert.equal(corroborateRelay(official,relay).truncated,false);
 for(const invalid of [{...relay,text:'Different original text.'},{...relay,created_timestamp:0},{...relay,author:{screen_name:'impostor'}},{...relay,text:relay.text+'…'}])assert.throws(()=>corroborateRelay(official,invalid));
});
test('URL-only fallback duplicates preserve relay text, API text and all discovery sources in either order',()=>{
 const complete={url,relay,fullText:relay.text,discoverySources:['timeline']},link={url,discoverySources:['community']};
 for(const input of [[complete,link],[link,complete],[complete,{url,relay:{...relay,text:'Short…'},fullText:'Short…'},link]]){
  const [merged]=mergeCandidates(input);assert.equal(merged.relay.text,relay.text);assert.equal(merged.fullText,relay.text);assert.deepEqual(new Set(merged.discoverySources),new Set(['timeline','community']));assert.equal(input.length>1,true);
 }
 assert.equal(mergeCandidates([complete,{url:'https://x.com/impostor/status/1'}]).length,1);
 assert.equal(mergeCandidates([complete,{url:`https://x.com/OpenAI/status/${id}`}]).length,2); // Conflicting authors cannot steal primary text.
 assert.equal(timelineCandidates({code:200,results:[relay,{...relay,text:'Short…'}]},'thsottiaux')[0].relay.text,relay.text);
});
