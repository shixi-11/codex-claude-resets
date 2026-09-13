import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { mainLocaleRules, localeRedirects, publicBase } from '../src/locale-routing.mjs';
import { localePath, eventPath } from '../src/shared.mjs';

const rules = mainLocaleRules();
function route(path, country) {
  for (const { route: rule } of rules) {
    if (!new RegExp(rule.src).test(path)) continue;
    if (rule.has?.some(condition => !new RegExp(`^${condition.value}$`).test(country || ''))) continue;
    return { ...rule, dest: path.replace(new RegExp(rule.src), rule.dest) };
  }
}

test('entry selects a supported country language, falling back to English', () => {
  for (const [country, lang] of [['CN','zh'],['TW','zh-Hant'],['HK','zh-Hant'],['MO','zh-Hant'],['SG','zh'],['JP','ja'],['KR','ko'],['MX','es'],['FR','fr'],['DE','de'],['SA','ar'],['US','en'],['BR','en'],['','en']]) {
    for (const path of [publicBase, publicBase + '/']) {
      const selected = route(path, country);
      assert.equal(selected.dest, `${publicBase}/${lang}/`);
      assert.equal(selected.status, 307);
      assert.equal(selected.headers['Cache-Control'], 'private, no-store');
    }
  }
});

test('explicit language, data and assets bypass country selection', () => {
  for (const path of ['en/', 'zh/', 'zh-Hant/', 'ar/', 'en/events/123/', 'health.json', 'assets/style.css', 'feed.xml']) {
    const selected = route(`${publicBase}/${path}`, 'JP');
    assert.equal(selected.status, undefined);
    assert.equal(selected.dest, `https://codex-claude-resets.vercel.app/${path}`);
  }
  assert.equal(route('/ai/another-site/', 'CN'), undefined);
});

test('old English announcement links and locale slashes remain compatible', () => {
  for (const suffix of ['events/123', 'events/123/']) {
    const selected = route(`${publicBase}/${suffix}`, 'CN');
    assert.equal(selected.status, 308);
    assert.equal(selected.dest, `${publicBase}/en/events/123/`);
  }
  assert.equal(route(`${publicBase}/en`, 'CN').dest, `${publicBase}/en/`);
  assert.equal(localePath('en'), 'en/');
  assert.equal(eventPath('en', '123'), 'en/events/123/');
});

test('checked-in deployment configurations match the country routing source', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.deepEqual(config.redirects, localeRedirects());
  assert.deepEqual(JSON.parse(await readFile(new URL('../infra/main-locale-routes.json', import.meta.url), 'utf8')), rules);
});
