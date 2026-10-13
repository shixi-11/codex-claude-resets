import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { staticArtifactMessage, staticVercelConfig, verifyStaticOutput } from '../scripts/publish-static.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const sourceConfig = JSON.parse(await readFile(join(root, 'vercel.json'), 'utf8'));

test('static Vercel config preserves routing and disables source-branch deployments', () => {
  assert.deepEqual(sourceConfig.git.deploymentEnabled, { '*': false, 'deploy-static': true });
  const config = staticVercelConfig(sourceConfig);
  assert.equal(config.framework, null);
  assert.equal(config.buildCommand, '');
  assert.equal(config.installCommand, '');
  assert.equal(config.outputDirectory, '.');
  assert.equal(config.trailingSlash, true);
  assert.deepEqual(config.redirects, sourceConfig.redirects);
  assert.deepEqual(config.headers, sourceConfig.headers);
  assert.deepEqual(config.git.deploymentEnabled, { '*': false, 'deploy-static': true });
  assert.equal(config.redirects.filter(rule => rule.source === '/').length, 9);
});

test('static artifact commit records the full source commit', () => {
  const sourceSha = 'bca5976259a08c2990221d2675d254d44c0cbd80';
  assert.equal(staticArtifactMessage(sourceSha), `Publish static artifact from source ${sourceSha}`);
  assert.throws(() => staticArtifactMessage('short-sha'), /full Git SHA/);
});

test('built artifact contains every locale, detail page, data feed, and client asset', { skip: !existsSync(join(root, 'dist', 'index.html')) }, async () => {
  const result = await verifyStaticOutput(join(root, 'dist'));
  assert.equal(result.locales, 9);
  assert.ok(result.events > 0);
});
