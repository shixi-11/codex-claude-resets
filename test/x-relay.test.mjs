import test from 'node:test';import assert from 'node:assert/strict';import{timelineCandidates,corroborateRelay,mergeDiscoveryCandidates,shouldCheckCandidate}from'../src/x-relay.mjs';
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

test('fallback archives cannot overwrite timeline evidence or consume another author budget',()=>{
 const candidate={url,relay:{...relay,text:'Hello world'}};
 const archive=author=>Array.from({length:454},(_,i)=>({url:`https://x.com/${author}/status/${(author==='claudeai'?2000:1000)+i}`,discoveryOnly:true}));
 const candidates=[candidate,...archive('thsottiaux'),...archive('claudeai'),...archive('OpenAI'),{url,discoveryOnly:true}];
 const selected=mergeDiscoveryCandidates(candidates,['OpenAI']);
 assert.equal(selected.length,81);
 assert.deepEqual(selected.find(c=>c.url===url),candidate);
 assert.equal(shouldCheckCandidate(selected.find(c=>c.url===url)),false);
 for(const author of ['thsottiaux','claudeai']) {
  const ids=selected.filter(c=>c.discoveryOnly&&c.url.includes('/'+author+'/')).map(c=>Number(c.url.split('/').pop()));
  assert.deepEqual(ids,Array.from({length:40},(_,i)=>(author==='claudeai'?2453:1453)-i));
 }
 assert.deepEqual(mergeDiscoveryCandidates([...candidates].reverse(),['openai']),selected);
});

test('explicit candidates remain available even when their author timeline succeeded',()=>{
 const explicit={url,fullText:relay.text};
 const selected=mergeDiscoveryCandidates([{url,discoveryOnly:true},explicit,{url,relay}],['thsottiaux']);
 assert.equal(selected.length,1);assert.equal(selected[0].fullText,relay.text);assert.deepEqual(selected[0].relay,relay);
 assert.equal(corroborateRelay(official,selected[0].relay).truncated,false);
});
