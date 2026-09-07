import test from 'node:test';import assert from 'node:assert/strict';import{timelineCandidates,corroborateRelay}from'../src/x-relay.mjs';
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
