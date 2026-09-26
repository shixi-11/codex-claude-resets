import test from 'node:test';
import assert from 'node:assert/strict';
import {classify,reclassifyEvents} from '../src/evidence.mjs';
test('contracted future reset and plural completion are recognized',()=>{
 assert.equal(classify('We’ll reset usage limits for all paid users across codex and ChatGPT work',{author:'thsottiaux'}).state,'announced');
 const text='Resets all propagated. That will be all. Have a fantastic weekend.';
 assert.equal(classify(text,{author:'thsottiaux'}).state,'reported');
 assert.equal(classify(text,{author:'thsottiaux',truncated:true}).state,'unconfirmed');
 assert.equal(classify('Resets have not fully propagated.',{author:'thsottiaux'}).state,'unconfirmed');
 assert.equal(classify('Someone said "Resets all propagated."',{author:'thsottiaux'}).state,'unconfirmed');
 assert.equal(reclassifyEvents([{fullText:text,author:'thsottiaux',kind:'signal',state:'unconfirmed'}])[0].state,'reported');
});
