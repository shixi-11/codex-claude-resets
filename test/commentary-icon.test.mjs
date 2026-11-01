import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {eventIcon} from '../src/shared.mjs';
test('commentary has a non-reset icon shared by static and live renderers',()=>{
 assert.equal(eventIcon('commentary'),'“');assert.notEqual(eventIcon('commentary'),eventIcon('global'));assert.equal(eventIcon('unknown'),'·');
 for(const file of ['../scripts/build.mjs','../src/app.mjs']){const source=readFileSync(new URL(file,import.meta.url),'utf8');assert.match(source,/import \{[^}]*eventIcon[^}]*\} from ['"](?:\.\.\/src\/|\.\/)shared\.mjs['"]/);assert.match(source,/eventIcon\(ev\.kind\)/);assert.doesNotMatch(source,/global:'↻'/);}
});
