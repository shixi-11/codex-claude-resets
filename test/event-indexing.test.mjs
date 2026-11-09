import test from 'node:test';
import assert from 'node:assert/strict';
import {indexableEventLanguage} from '../src/post-text.mjs';

const source={excerpt:'Banked 1/2',contentHash:'h'};

test('untranslated localized event pages are not indexable; English always is', () => {
  assert.equal(indexableEventLanguage(source,'en'), true);
  assert.equal(indexableEventLanguage(source,'zh'), false);
});

test('a translation bound to the current source makes that language indexable', () => {
  const event={...source,localized:{excerpt:'Banked 1/2',contentHash:'h',texts:{zh:'已储存 1/2'}}};
  assert.equal(indexableEventLanguage(event,'zh'), true);
  assert.equal(indexableEventLanguage(event,'ja'), false);
});

test('a translation of an older source version does not count', () => {
  const event={...source,localized:{excerpt:'Banked 0/2',contentHash:'old',texts:{zh:'已储存 0/2'}}};
  assert.equal(indexableEventLanguage(event,'zh'), false);
});
