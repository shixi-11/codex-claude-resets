import test from 'node:test';
import assert from 'node:assert/strict';
import {classify} from '../src/evidence.mjs';

test('official retrospective grant remains a confirmed reusable reset',()=>{
  const text='Sonnet 5.5 is available now in the Claude Platform and Claude Code.\n\nWe granted all Pro, Max, and Team users a reset last Tuesday. If you haven’t used it yet, you can still apply it whenever you want, before Oct 22.';
  assert.equal(classify(text,{author:'ClaudeDevs'}).kind,'banked');
  assert.equal(classify(text,{author:'ClaudeDevs'}).state,'reported');
  assert.equal(classify(text,{author:'ClaudeDevs',truncated:true}).state,'unconfirmed');
  assert.notEqual(classify('We have not granted all Pro users a reset. You can use it later.',{author:'ClaudeDevs'}).state,'reported');
  assert.notEqual(classify('We will grant all Pro users a reset to use later.',{author:'ClaudeDevs'}).state,'reported');
});
