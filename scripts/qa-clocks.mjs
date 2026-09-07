import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:'chrome'});
const base=process.env.QA_URL||'http://127.0.0.1:4187/';
try {
 for(const zone of ['Asia/Shanghai','America/Los_Angeles','Europe/Berlin']){
  const context=await browser.newContext({timezoneId:zone});
  const page=await context.newPage();
  await page.clock.install({time:new Date('2026-09-08T00:00:00Z')});
  await page.route(base,async route=>{
   const response=await route.fetch();let html=await response.text();
   html=html.replace(/(<script id="page-data" type="application\/json">)([\s\S]*?)(<\/script>)/,(_,start,json,end)=>{
    const data=JSON.parse(json);data.platforms.codex.reset={state:'announced',resetAt:'2026-09-08T02:00:00Z',sourceUrl:'https://x.com/thsottiaux/status/1',verifiedAt:'2026-09-08T00:00:00Z'};
    return start+JSON.stringify(data).replace(/</g,'\\u003c')+end;
   });
   await route.fulfill({response,body:html});
  });
  await page.goto(base);
  assert.equal(await page.locator('[data-platform="codex"] [data-public-countdown]').textContent(),'02:00:00');
  assert.equal(await page.locator('[data-platform="claude"] [data-public-countdown]').textContent(),'No confirmed time');
  const label=await page.locator('[data-platform="codex"] [data-public-time]').textContent();
  assert.match(label,zone==='Asia/Shanghai'?/10:00/:zone==='America/Los_Angeles'?/Sep 7/:/04:00/);
  await page.clock.fastForward(7200000);
  assert.equal(await page.locator('[data-platform="codex"] [data-public-countdown]').textContent(),'Awaiting confirmation');
  await context.close();
 }
 console.log('PASS: public countdown, unknown state, expiration and three visitor timezones in actual browser.');
} finally {await browser.close();}
