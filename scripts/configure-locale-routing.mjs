import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { localeRedirects, mainLocaleRules } from '../src/locale-routing.mjs';
const root = new URL('../', import.meta.url);
const file = new URL('vercel.json', root);
const config = JSON.parse(await readFile(file, 'utf8'));
config.redirects = localeRedirects();
config.headers = [{ source: '/', headers: [
  { key: 'Cache-Control', value: 'private, no-store' },
  { key: 'Vary', value: 'X-Vercel-IP-Country' },
] }];
await writeFile(file, JSON.stringify(config, null, 2) + '\n');
await mkdir(new URL('infra/', root), { recursive: true });
await writeFile(new URL('infra/main-locale-routes.json', root), JSON.stringify(mainLocaleRules(), null, 2) + '\n');
console.log('Updated origin redirects and main-domain routing rules.');
