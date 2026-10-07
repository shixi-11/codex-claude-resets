import test from 'node:test';
import assert from 'node:assert/strict';
import {coverageReport} from '../scripts/coverage-report.mjs';
test('engineering coverage report exposes degraded coverage and safely escapes upstream errors',()=>{
 const html=coverageReport({status:'degraded',coverage:{authors:{thsottiaux:{discovered:4,checked:1,failed:3,pending:2}},budgetExhausted:true},requests:{attempted:3,retries:1},sources:[{author:'thsottiaux',ok:false,error:'HTTP 404'}],failedPosts:[{url:'https://x.com/thsottiaux/status/1',kind:'http',status:503,attempts:3,error:'<script>bad</script>'}]});
 assert.ok(html.includes('degraded'));assert.ok(html.includes('HTTP 404'));assert.ok(html.includes('503'));assert.ok(html.includes('&lt;script&gt;bad&lt;/script&gt;'));assert.ok(!html.includes('<script>'));
});
