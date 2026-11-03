import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workflow = await readFile(new URL('../.github/workflows/site.yml', import.meta.url), 'utf8');

test('announcement workflow has three staggered hourly opportunities and retains its daily digest and manual trigger', () => {
  const schedules = [...workflow.matchAll(/^\s+- cron: '([^']+)'$/gm)].map(([, cron]) => cron);
  assert.deepEqual(schedules, ['17,37,57 * * * *', '23 2 * * *']);
  assert.match(workflow, /^\s+workflow_dispatch:\s*$/m);
});

test('official promotion terms are reverified for source-fix pushes as well as scheduled runs',()=>{
 assert.match(workflow, /name: Check official Claude promotion terms\n\s+run: node scripts\/collect-platforms\.mjs/);
});
