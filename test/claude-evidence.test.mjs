import test from 'node:test';import assert from 'node:assert/strict';
import {parsePostUrl,classify,postPlatform} from '../src/evidence.mjs';
test('official Claude sources are isolated from similar account names',()=>{
 assert.equal(postPlatform(parsePostUrl('https://x.com/ClaudeDevs/status/2094856679250919746').author),'claude');
 assert.equal(parsePostUrl('https://x.com/ClaudeDevsSupport/status/2094856679250919746'),null);
});
test('complete Claude all-user reset announcement is recognized, truncated and quoted versions are not',()=>{
 const text="With Fable 5.1 out today, we've also reset 5-hour and weekly limits for all users.";
 assert.equal(classify(text).state,'reported');
 assert.equal(classify(text,{truncated:true}).state,'unconfirmed');
 assert.equal(classify('Example: '+text).state,'unconfirmed');
});
